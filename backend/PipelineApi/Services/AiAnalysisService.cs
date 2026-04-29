using System.Text;
using System.Text.Json;
using PipelineApi.Models;

namespace PipelineApi.Services;

public class AiAnalysisService(IHttpClientFactory httpFactory, SettingsService settings)
{
    private bool   _dirty  = true;
    private string _apiKey = "";
    private string _model  = "claude-haiku-4-5-20251001";

    public void InvalidateConfig() => _dirty = true;

    private async Task EnsureConfigAsync()
    {
        if (!_dirty) return;
        _apiKey = await settings.GetAsync("ai.apikey", "");
        _model  = await settings.GetAsync("ai.model",  "claude-haiku-4-5-20251001");
        _dirty  = false;
    }

    public async Task<AiAnalysis?> AnalyzeAsync(string job, string buildId, string errorLog, string pastContext)
    {
        await EnsureConfigAsync();
        if (string.IsNullOrEmpty(_apiKey)) return BuildDemoAnalysis(job, buildId);

        try
        {
            var trimmed = errorLog.Length > 3000 ? errorLog[..3000] + "\n...(kısaltıldı)" : errorLog;
            var past    = string.IsNullOrEmpty(pastContext) ? "" : "ÖNCEKİ HATALAR:\n" + pastContext + "\n\n";

            var prompt = "Sen senior bir .NET CI/CD mühendisisin. Türkçe analiz yap.\n" +
                         "Proje: " + job + "  Build: #" + buildId + "\n" +
                         past + "HATA LOGU:\n" + trimmed + "\n\n" +
                         "SADECE şu JSON formatında yanıt ver:\n" +
                         "{\"hata\":\"...\",\"sebep\":\"...\",\"cozum\":\"...\",\"sure\":\"...\"}";

            using var client = httpFactory.CreateClient();
            client.DefaultRequestHeaders.Add("x-api-key", _apiKey);
            client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

            var body = JsonSerializer.Serialize(new
            {
                model      = _model,
                max_tokens = 500,
                messages   = new[] { new { role = "user", content = prompt } }
            });

            var resp = await client.PostAsync("https://api.anthropic.com/v1/messages",
                new StringContent(body, Encoding.UTF8, "application/json"));

            if (!resp.IsSuccessStatusCode) return BuildDemoAnalysis(job, buildId);

            var json    = await resp.Content.ReadAsStringAsync();
            var doc     = JsonDocument.Parse(json);
            var rawText = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "";
            rawText     = rawText.Replace("```json", "").Replace("```", "").Trim();

            var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(rawText, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return new AiAnalysis
            {
                Job     = job,
                BuildId = buildId,
                Hata    = parsed?.GetValueOrDefault("hata")  ?? "Analiz edilemedi",
                Sebep   = parsed?.GetValueOrDefault("sebep") ?? "",
                Cozum   = parsed?.GetValueOrDefault("cozum") ?? "",
                Sure    = parsed?.GetValueOrDefault("sure")  ?? "",
            };
        }
        catch { return BuildDemoAnalysis(job, buildId); }
    }

    private static AiAnalysis BuildDemoAnalysis(string job, string buildId)
    {
        var demos = new Dictionary<string, AiAnalysis>
        {
            ["NishCMS.BackOffice"] = new() { Job=job, BuildId=buildId, Hata="NullReferenceException — CustomerRepository.cs:87", Sebep="GetCustomerByIdAsync mock edilmemiş.", Cozum="_repoMock.Setup(...).ReturnsAsync(obj) ekle", Sure="10–15 dk" },
            ["Nish.Store.Api"]     = new() { Job=job, BuildId=buildId, Hata="EqualException — ProductController_Tests.cs:42",       Sebep="HTTP 200 bekleniyor ama 404 dönüyor.",         Cozum="if(id<=0) → if(id<0) düzelt",               Sure="5–10 dk" },
        };
        return demos.TryGetValue(job.Split(" / ")[0], out var d) ? d : new AiAnalysis
        {
            Job=job, BuildId=buildId, Hata="Assert.Equal başarısız",
            Sebep="Beklenen ile gerçek değer eşleşmiyor.", Cozum="Mock setup'ları kontrol et", Sure="15–30 dk",
        };
    }
}

// ── AI Memory (in-memory, DB'ye taşınabilir) ──────────────────────────────────
public class AiMemoryService
{
    private readonly Dictionary<string, AiAnalysis> _store = new();
    public AiAnalysis? Get(string job, string buildId) => _store.TryGetValue(Key(job, buildId), out var v) ? v : null;
    public void Set(AiAnalysis a) => _store[Key(a.Job, a.BuildId)] = a;
    public List<AiAnalysis> GetRecent(int count = 10) => _store.Values.OrderByDescending(a => a.AnalyzedAt).Take(count).ToList();
    public void Clear() => _store.Clear();
    private static string Key(string job, string id) => $"{job}:{id}";
}
