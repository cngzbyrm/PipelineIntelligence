using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PipelineApi.Data;
using PipelineApi.Models;
using PipelineApi.Services;

namespace PipelineApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController(
    JenkinsService jenkins,
    AiAnalysisService ai,
    AiMemoryService aiMemory,
    SettingsService settings,
    AuditService audit,
    WebhookService webhook,
    EmailService email,
    AppDbContext db) : ControllerBase
{
    // ── Settings ─────────────────────────────────────────────────────────────
    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        var j = await settings.GetGroupAsync("jenkins");
        return Ok(new { url = j.GetValueOrDefault("jenkins.url"), user = j.GetValueOrDefault("jenkins.user"), token = "***" });
    }

    [HttpPost("config")]
    public async Task<IActionResult> SaveConfig([FromBody] JenkinsConfig cfg)
    {
        await settings.SetManyAsync(new()
        {
            ["jenkins.url"] = cfg.Url,
            ["jenkins.user"] = cfg.User,
            ["jenkins.token"] = cfg.Token,
        }, "jenkins");
        jenkins.InvalidateConfig();
        await audit.LogAsync("CONFIG_UPDATE", "jenkins", $"URL={cfg.Url}");
        return Ok(new { message = "Jenkins ayarları kaydedildi" });
    }

    [HttpPost("config/ai")]
    public async Task<IActionResult> SaveAiConfig([FromBody] AiConfigDto dto)
    {
        await settings.SetManyAsync(new()
        {
            ["ai.apikey"] = dto.ApiKey,
            ["ai.model"] = dto.Model,
        }, "ai");
        ai.InvalidateConfig();
        await audit.LogAsync("CONFIG_UPDATE", "ai", $"Model={dto.Model}");
        return Ok(new { message = "AI ayarları kaydedildi" });
    }

    [HttpGet("config/all")]
    public async Task<IActionResult> GetAllSettings()
    {
        var all = await db.Settings.ToListAsync();
        // token'ları maskele
        var masked = all.Select(s => new { s.Key, Value = s.Key.Contains("token") || s.Key.Contains("password") || s.Key.Contains("apikey") ? (string.IsNullOrEmpty(s.Value) ? "" : "***") : s.Value, s.Group, s.UpdatedAt });
        return Ok(masked);
    }

    [HttpPost("config/all")]
    public async Task<IActionResult> SaveAllSettings([FromBody] SettingsUpdateRequest req)
    {
        await settings.SetManyAsync(req.Values, req.Group);
        jenkins.InvalidateConfig();
        ai.InvalidateConfig();
        await audit.LogAsync("CONFIG_UPDATE", req.Group, $"{req.Values.Count} ayar güncellendi");
        return Ok(new { message = "Ayarlar kaydedildi" });
    }

    // ── Builds ───────────────────────────────────────────────────────────────
    [HttpGet("builds")]
    public async Task<IActionResult> GetBuilds()
    {
        var builds = await jenkins.FetchAllBuildsAsync();

        // Her build için not varsa ekle
        foreach (var b in builds)
        {
            var note = await db.BuildNotes
                .Where(n => n.Job == b.Job && n.BuildId == b.Id)
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => n.Note)
                .FirstOrDefaultAsync();
            b.Note = note;
        }
        return Ok(builds);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var builds = await jenkins.FetchAllBuildsAsync();
        return Ok(JenkinsService.ComputeStats(builds));
    }

    // ── Build Actions ─────────────────────────────────────────────────────────
    [HttpPost("builds/trigger")]
    public async Task<IActionResult> TriggerBuild([FromBody] TriggerRequest req)
    {
        var ok = await jenkins.TriggerBuildAsync(req.Job, req.JobUrl, req.Parameters);
        await audit.LogAsync("TRIGGER", req.Job, $"Branch={req.Branch}", ok);
        if (ok) await webhook.SendAsync("trigger", $"▶ Build Tetiklendi: {req.Job}", $"Branch: {req.Branch}", "0F8B8D");
        return Ok(new { success = ok, message = ok ? $"{req.Job} tetiklendi" : "Tetikleme başarısız" });
    }

    [HttpPost("builds/stop")]
    public async Task<IActionResult> StopBuild([FromBody] StopRequest req)
    {
        var ok = await jenkins.StopBuildAsync(req.Job, req.BuildId);
        await audit.LogAsync("STOP", req.Job, $"Build={req.BuildId}", ok);
        return Ok(new { success = ok });
    }

    [HttpGet("builds/log")]
    public async Task<IActionResult> GetLog([FromQuery] string job, [FromQuery] string buildId, [FromQuery] int start = 0)
    {
        var (text, newStart) = await jenkins.FetchProgressiveLogAsync(job, buildId, start);
        return Ok(new { text, nextStart = newStart });
    }

    // ── Notes ─────────────────────────────────────────────────────────────────
    [HttpPost("builds/note")]
    public async Task<IActionResult> AddNote([FromBody] NoteRequest req)
    {
        db.BuildNotes.Add(new BuildNote
        {
            Job = req.Job,
            BuildId = req.BuildId,
            Note = req.Note,
            Author = req.Author,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        await audit.LogAsync("NOTE_ADD", req.Job, $"Build={req.BuildId} Note={req.Note.Take(50)}");
        return Ok(new { message = "Not eklendi" });
    }

    [HttpGet("builds/{job}/{buildId}/notes")]
    public async Task<IActionResult> GetNotes(string job, string buildId)
    {
        var notes = await db.BuildNotes
            .Where(n => n.Job == job && n.BuildId == buildId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
        return Ok(notes);
    }

    // ── AI Analysis ──────────────────────────────────────────────────────────
    [HttpPost("analyze")]
    public async Task<IActionResult> Analyze([FromBody] AnalyzeRequest req)
    {
        if (!req.ForceRefresh)
        {
            var cached = aiMemory.Get(req.Job, req.BuildId);
            if (cached != null) { cached.FromMemory = true; return Ok(cached); }
        }

        var log = await jenkins.FetchConsoleLogAsync(req.Job, req.BuildId);
        var errorLines = string.Join('\n', log.Split('\n')
            .Where(l => System.Text.RegularExpressions.Regex.IsMatch(l, "error|fail|exception", System.Text.RegularExpressions.RegexOptions.IgnoreCase))
            .Take(50));

        var past = aiMemory.GetRecent(3).Where(a => a.Job == req.Job)
            .Select(a => $"[{a.BuildId}]: {a.Hata}").Aggregate("", (acc, x) => acc + x + "\n");

        var result = await ai.AnalyzeAsync(req.Job, req.BuildId, errorLines, past);
        if (result != null)
        {
            aiMemory.Set(result);
            await audit.LogAsync("ANALYZE", req.Job, $"Build={req.BuildId}");
            await webhook.SendAsync("failure", $"🤖 AI Analiz: {req.Job}", result.Hata, "FF8C00");
        }
        return Ok(result);
    }

    [HttpGet("ai/memory")]
    public IActionResult GetMemory() => Ok(aiMemory.GetRecent(20));

    [HttpDelete("ai/memory")]
    public IActionResult ClearMemory() { aiMemory.Clear(); return Ok(); }

    // ── Audit Log ─────────────────────────────────────────────────────────────
    [HttpGet("audit")]
    public async Task<IActionResult> GetAuditLog([FromQuery] int count = 50)
    {
        var logs = await db.AuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(count)
            .ToListAsync();
        return Ok(logs);
    }

    // ── Webhooks ──────────────────────────────────────────────────────────────
    [HttpGet("webhooks")]
    public async Task<IActionResult> GetWebhooks() => Ok(await db.WebhookConfigs.ToListAsync());

    [HttpPost("webhooks")]
    public async Task<IActionResult> AddWebhook([FromBody] WebhookRequest req)
    {
        var w = new WebhookConfig { Name = req.Name, Url = req.Url, Type = req.Type, Events = req.Events, Active = true };
        db.WebhookConfigs.Add(w);
        await db.SaveChangesAsync();
        return Ok(w);
    }

    [HttpPut("webhooks/{id}")]
    public async Task<IActionResult> UpdateWebhook(int id, [FromBody] WebhookRequest req)
    {
        var w = await db.WebhookConfigs.FindAsync(id);
        if (w == null) return NotFound();
        w.Name = req.Name; w.Url = req.Url; w.Type = req.Type; w.Events = req.Events;
        await db.SaveChangesAsync();
        return Ok(w);
    }

    [HttpDelete("webhooks/{id}")]
    public async Task<IActionResult> DeleteWebhook(int id)
    {
        var w = await db.WebhookConfigs.FindAsync(id);
        if (w == null) return NotFound();
        db.WebhookConfigs.Remove(w);
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("webhooks/test/{id}")]
    public async Task<IActionResult> TestWebhook(int id)
    {
        var w = await db.WebhookConfigs.FindAsync(id);
        if (w == null) return NotFound();
        await webhook.SendAsync("test", "🧪 Webhook Test", $"'{w.Name}' webhook'u başarıyla çalışıyor.", "0F8B8D");
        return Ok(new { message = "Test bildirimi gönderildi" });
    }

    // ── Analytics ────────────────────────────────────────────────────────────
    [HttpGet("analytics/trend")]
    public IActionResult GetTrend()
    {
        var rng = new Random(42);
        return Ok(Enumerable.Range(0, 30).Select(i =>
        {
            var d = DateTime.Now.AddDays(-29 + i);
            return new TrendPoint { Label = d.ToString("MMM dd"), Pass = rng.Next(2, 7), Fail = rng.Next(0, 3) };
        }).ToList());
    }

    [HttpGet("analytics/heatmap")]
    public IActionResult GetHeatmap()
    {
        var rng = new Random(99);
        return Ok(Enumerable.Range(0, 24).Select(h => new HeatmapEntry { Hour = h, FailCount = rng.Next(0, 9) }).ToList());
    }

    [HttpGet("analytics/top-files")]
    public IActionResult GetTopFiles()
    {
        var files = new[] { "InvoiceService.cs", "CustomerRepository.cs", "ProductController.cs", "OrderService.cs", "PaymentGateway.cs", "AuthService.cs" };
        var rng = new Random(7);
        return Ok(files.Select(f => new TopFile { Name = f, Count = rng.Next(1, 13) }).OrderByDescending(f => f.Count).Take(6).ToList());
    }

    [HttpGet("analytics/sonar")]
    public IActionResult GetSonar() => Ok(new List<SonarEntry>
    {
        new() { Project="OneHub.UI",  Bugs="A", Quality="B", Security="A" },
        new() { Project="Core API",   Bugs="B", Quality="A", Security="C" },
        new() { Project="Nish.Store", Bugs="A", Quality="A", Security="B" },
    });

    [HttpGet("analytics/predictions")]
    public async Task<IActionResult> GetPredictions()
    {
        var builds = await jenkins.FetchAllBuildsAsync();
        return Ok(builds.Select(b => new Prediction
        {
            Job = b.Job,
            Risk = b.Result == "FAILURE" ? "HIGH" : b.Result == "UNSTABLE" ? "MED" : "LOW",
            Reason = b.Result == "FAILURE" ? "Son build başarısız." : b.Result == "UNSTABLE" ? "Bazı testler başarısız." : "Stabil."
        }).ToList());
    }

    [HttpGet("analytics/history/{*job}")]
    public async Task<IActionResult> GetTestHistory(string job, [FromQuery] int count = 30)
    {
        var decoded = Uri.UnescapeDataString(job);
        var builds = await jenkins.FetchAllBuildsAsync();
        var match = builds.FirstOrDefault(b =>
            string.Equals(b.Job, decoded, StringComparison.OrdinalIgnoreCase));

        if (match == null)
            return Ok(new List<TestHistoryPoint>());

        var baseUrl = await settings.GetAsync("jenkins.url", "http://194.99.74.2:8080");
        var jobUrl = (match.JobUrl ?? "").TrimEnd('/');

        // lastBuild veya build numarası varsa temizle
        jobUrl = System.Text.RegularExpressions.Regex.Replace(jobUrl, @"/(lastBuild|\d+)$", "");

        // Base URL'i çıkar → job/Foo/job/Bar
        var jobPath = jobUrl.Replace(baseUrl, "").TrimStart('/').TrimEnd('/');

        // Path boşsa job adından oluştur: "Shell.OneHub.UI / test" → "job/Shell.OneHub.UI/job/test"
        if (string.IsNullOrEmpty(jobPath))
        {
            var parts = decoded.Split(" / ", StringSplitOptions.TrimEntries);
            jobPath = "job/" + string.Join("/job/", parts.Select(Uri.EscapeDataString));
        }

        Console.WriteLine($"[History] Job: {decoded} → Path: {jobPath}");

        var history = await jenkins.FetchTestHistoryAsync(jobPath, count);
        return Ok(history);
    }

    // ── Timeline ─────────────────────────────────────────────────────────────
    [HttpGet("timeline")]
    public async Task<IActionResult> GetTimeline()
    {
        var builds = await jenkins.FetchAllBuildsAsync();
        // DB'den notları da ekle
        var events = builds.Select(b => new TimelineEvent
        {
            Title = b.Building ? $"{b.Job} çalışıyor..." : $"{b.Job} → {(b.Result == "SUCCESS" ? "✅ başarılı" : b.Result == "FAILURE" ? "❌ başarısız" : b.Result ?? "?")}",
            User = b.TriggerUser ?? "sistem",
            Env = "test",
            TimeAgo = TimeAgo(b.Timestamp),
            Color = b.Building ? "blue" : b.Result == "SUCCESS" ? "green" : b.Result == "FAILURE" ? "red" : "yellow",
            Timestamp = DateTimeOffset.FromUnixTimeMilliseconds(b.Timestamp).DateTime,
        }).OrderByDescending(e => e.Timestamp).ToList();
        return Ok(events);
    }

    // ── Compare ───────────────────────────────────────────────────────────────
    [HttpGet("compare")]
    public async Task<IActionResult> Compare([FromQuery] string jobA, [FromQuery] string idA, [FromQuery] string jobB, [FromQuery] string idB)
    {
        var builds = await jenkins.FetchAllBuildsAsync();
        return Ok(new BuildComparison
        {
            BuildA = builds.FirstOrDefault(b => b.Job == jobA && b.Id == idA),
            BuildB = builds.FirstOrDefault(b => b.Job == jobB && b.Id == idB),
        });
    }

    // ── Email ─────────────────────────────────────────────────────────────────
    [HttpPost("email/test")]
    public async Task<IActionResult> TestEmail()
    {
        await email.SendAsync(
            "🧪 Pipeline Intelligence — Test Email",
            "<h2>Test email başarılı!</h2><p>Pipeline Intelligence email bildirimleri çalışıyor.</p>"
        );
        await audit.LogAsync("EMAIL_TEST", "email", "Test email gönderildi");
        return Ok(new { message = "Test email gönderildi" });
    }

    [HttpPost("email/send")]
    public async Task<IActionResult> SendEmail([FromBody] EmailSendRequest req)
    {
        await email.SendAsync(req.Subject, req.Body, req.To);
        await audit.LogAsync("EMAIL_SEND", req.To ?? "default", req.Subject);
        return Ok(new { message = "Email gönderildi" });
    }

    [HttpPost("email/build-notification")]
    public async Task<IActionResult> SendBuildNotification([FromBody] BuildNotificationRequest req)
    {
        await email.SendBuildNotificationAsync(req.Job, req.Result, req.BuildId, req.Details);
        await audit.LogAsync("EMAIL_BUILD", req.Job, $"Build={req.BuildId} Result={req.Result}");
        return Ok(new { message = "Build bildirimi gönderildi" });
    }

    private static string TimeAgo(long ts)
    {
        if (ts == 0) return "—";
        var diff = (long)(DateTime.UtcNow - DateTimeOffset.FromUnixTimeMilliseconds(ts).UtcDateTime).TotalSeconds;
        if (diff < 60) return $"{diff}s önce";
        if (diff < 3600) return $"{diff / 60}dk önce";
        if (diff < 86400) return $"{diff / 3600}sa önce";
        return $"{diff / 86400}g önce";
    }
}

public record EmailSendRequest(string Subject, string Body, string? To);
public record BuildNotificationRequest(string Job, string Result, string BuildId, string? Details);