using System.Text.Json;

namespace PipelineApi.Services;

public class GitHubService(IHttpClientFactory httpFactory, IConfiguration config)
{
    private string Token => config["GitHub:Token"] ?? "";
    private string Owner => config["GitHub:Owner"] ?? "";

    private HttpClient CreateClient()
    {
        var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Add("User-Agent",     "PipelineIntelligence");
        client.DefaultRequestHeaders.Add("Accept",         "application/vnd.github+json");
        client.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        if (!string.IsNullOrEmpty(Token))
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {Token}");
        return client;
    }

    // ── Repo listesi ──────────────────────────────────────────────────────────
    public async Task<List<GithubRepo>> GetReposAsync()
    {
        using var client = CreateClient();
        var all = new List<GithubRepo>();

        // Önce authenticated user'ın tüm repo'ları (private dahil)
        var resp = await client.GetAsync($"https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,organization_member");
        if (resp.IsSuccessStatusCode)
        {
            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            all.AddRange(doc.RootElement.EnumerateArray().Select(MapRepo));
        }

        // Org repo'ları da dene
        var orgResp = await client.GetAsync($"https://api.github.com/orgs/{Owner}/repos?per_page=100&sort=updated&type=all");
        if (orgResp.IsSuccessStatusCode)
        {
            var json = await orgResp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            foreach (var r in doc.RootElement.EnumerateArray())
            {
                var repo = MapRepo(r);
                if (!all.Any(x => x.FullName == repo.FullName))
                    all.Add(repo);
            }
        }

        return all.OrderByDescending(r => r.UpdatedAt).ToList();
    }

    private static GithubRepo MapRepo(JsonElement r) => new()
    {
        Name          = r.TryGetProperty("name",             out var n)  ? n.GetString()  ?? "" : "",
        FullName      = r.TryGetProperty("full_name",        out var fn) ? fn.GetString() ?? "" : "",
        Description   = r.TryGetProperty("description",      out var d)  ? d.GetString()  ?? "" : "",
        Language      = r.TryGetProperty("language",         out var l)  ? l.GetString()  ?? "" : "",
        Stars         = r.TryGetProperty("stargazers_count", out var s)  ? s.GetInt32()        : 0,
        Forks         = r.TryGetProperty("forks_count",      out var f)  ? f.GetInt32()        : 0,
        UpdatedAt     = r.TryGetProperty("updated_at",       out var u)  ? u.GetString()  ?? "" : "",
        DefaultBranch = r.TryGetProperty("default_branch",   out var db) ? db.GetString() ?? "" : "",
        HtmlUrl       = r.TryGetProperty("html_url",         out var hu) ? hu.GetString() ?? "" : "",
    };

    // ── Commit listesi ────────────────────────────────────────────────────────
    public async Task<List<GithubCommit>> GetCommitsAsync(string repoFullName, string branch = "", int page = 1)
    {
        using var client = CreateClient();
        var url = $"https://api.github.com/repos/{repoFullName}/commits?per_page=20&page={page}";
        if (!string.IsNullOrEmpty(branch)) url += $"&sha={branch}";
        var resp = await client.GetAsync(url);
        if (!resp.IsSuccessStatusCode) return [];
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.EnumerateArray().Select(c =>
        {
            var commit = c.TryGetProperty("commit", out var cm) ? cm : default;
            var author = commit.ValueKind != JsonValueKind.Undefined && commit.TryGetProperty("author", out var a) ? a : default;
            var ghUser = c.TryGetProperty("author", out var gu) ? gu : default;
            var sha    = c.TryGetProperty("sha", out var s) ? s.GetString() ?? "" : "";
            return new GithubCommit
            {
                Sha     = sha.Length >= 7 ? sha[..7] : sha,
                Message = commit.ValueKind != JsonValueKind.Undefined && commit.TryGetProperty("message", out var m) ? (m.GetString() ?? "").Split('\n')[0] : "",
                Author  = author.ValueKind != JsonValueKind.Undefined && author.TryGetProperty("name",  out var an) ? an.GetString()  ?? "" : "",
                Date    = author.ValueKind != JsonValueKind.Undefined && author.TryGetProperty("date",  out var ad) ? ad.GetString()  ?? "" : "",
                Avatar  = ghUser.ValueKind != JsonValueKind.Undefined && ghUser.TryGetProperty("avatar_url", out var av) ? av.GetString() ?? "" : "",
                HtmlUrl = c.TryGetProperty("html_url", out var hu) ? hu.GetString() ?? "" : "",
            };
        }).ToList();
    }

    // ── Pull Request listesi ──────────────────────────────────────────────────
    public async Task<List<GithubPR>> GetPRsAsync(string repoFullName, string state = "open", int page = 1)
    {
        using var client = CreateClient();
        var resp = await client.GetAsync($"https://api.github.com/repos/{repoFullName}/pulls?state={state}&per_page=20&page={page}");
        if (!resp.IsSuccessStatusCode) return [];
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.EnumerateArray().Select(pr =>
        {
            var user = pr.TryGetProperty("user", out var u) ? u : default;
            var head = pr.TryGetProperty("head", out var h) ? h : default;
            var bas  = pr.TryGetProperty("base", out var b) ? b : default;
            return new GithubPR
            {
                Number     = pr.TryGetProperty("number",     out var n)  ? n.GetInt32()        : 0,
                Title      = pr.TryGetProperty("title",      out var t)  ? t.GetString()  ?? "" : "",
                State      = pr.TryGetProperty("state",      out var s)  ? s.GetString()  ?? "" : "",
                Author     = user.ValueKind != JsonValueKind.Undefined && user.TryGetProperty("login",      out var ul)  ? ul.GetString()  ?? "" : "",
                Avatar     = user.ValueKind != JsonValueKind.Undefined && user.TryGetProperty("avatar_url", out var uav) ? uav.GetString() ?? "" : "",
                HeadBranch = head.ValueKind != JsonValueKind.Undefined && head.TryGetProperty("ref", out var hr) ? hr.GetString() ?? "" : "",
                BaseBranch = bas.ValueKind  != JsonValueKind.Undefined && bas.TryGetProperty("ref",  out var br) ? br.GetString() ?? "" : "",
                CreatedAt  = pr.TryGetProperty("created_at", out var ca) ? ca.GetString() ?? "" : "",
                UpdatedAt  = pr.TryGetProperty("updated_at", out var ua) ? ua.GetString() ?? "" : "",
                HtmlUrl    = pr.TryGetProperty("html_url",   out var hu) ? hu.GetString() ?? "" : "",
                Draft      = pr.TryGetProperty("draft",      out var dr) ? dr.GetBoolean()     : false,
            };
        }).ToList();
    }

    // ── Commit detail + diff ──────────────────────────────────────────────────
    public async Task<GithubCommitDetail?> GetCommitDetailAsync(string repoFullName, string sha)
    {
        using var client = CreateClient();
        var resp = await client.GetAsync($"https://api.github.com/repos/{repoFullName}/commits/{sha}");
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var commit  = root.TryGetProperty("commit",  out var cm) ? cm : default;
        var author  = commit.ValueKind != JsonValueKind.Undefined && commit.TryGetProperty("author",    out var a) ? a : default;
        var ghUser  = root.TryGetProperty("author",  out var gu) ? gu : default;
        var stats   = root.TryGetProperty("stats",   out var st) ? st : default;
        var shaFull = root.TryGetProperty("sha",     out var s)  ? s.GetString() ?? "" : "";

        var detail = new GithubCommitDetail
        {
            Sha        = shaFull,
            ShortSha   = shaFull.Length >= 7 ? shaFull[..7] : shaFull,
            Message    = commit.ValueKind != JsonValueKind.Undefined && commit.TryGetProperty("message", out var msg) ? msg.GetString() ?? "" : "",
            Author     = author.ValueKind != JsonValueKind.Undefined && author.TryGetProperty("name",    out var an)  ? an.GetString()  ?? "" : "",
            Date       = author.ValueKind != JsonValueKind.Undefined && author.TryGetProperty("date",    out var ad)  ? ad.GetString()  ?? "" : "",
            Avatar     = ghUser.ValueKind != JsonValueKind.Undefined && ghUser.TryGetProperty("avatar_url", out var av) ? av.GetString() ?? "" : "",
            HtmlUrl    = root.TryGetProperty("html_url", out var hu) ? hu.GetString() ?? "" : "",
            Additions  = stats.ValueKind != JsonValueKind.Undefined && stats.TryGetProperty("additions", out var add) ? add.GetInt32() : 0,
            Deletions  = stats.ValueKind != JsonValueKind.Undefined && stats.TryGetProperty("deletions", out var del) ? del.GetInt32() : 0,
            Total      = stats.ValueKind != JsonValueKind.Undefined && stats.TryGetProperty("total",     out var tot) ? tot.GetInt32() : 0,
        };

        if (root.TryGetProperty("files", out var files))
        {
            detail.Files = files.EnumerateArray().Select(f => new GithubFileDiff
            {
                Filename  = f.TryGetProperty("filename",  out var fn)  ? fn.GetString()  ?? "" : "",
                Status    = f.TryGetProperty("status",    out var fs)  ? fs.GetString()  ?? "" : "",
                Additions = f.TryGetProperty("additions", out var fa)  ? fa.GetInt32()        : 0,
                Deletions = f.TryGetProperty("deletions", out var fd)  ? fd.GetInt32()        : 0,
                Patch     = f.TryGetProperty("patch",     out var fp)  ? fp.GetString()  ?? "" : "",
            }).ToList();
        }

        return detail;
    }
    public async Task<List<GithubBranch>> GetBranchesAsync(string repoFullName)
    {
        using var client = CreateClient();
        var all = new List<GithubBranch>();
        int page = 1;
        while (true)
        {
            var resp = await client.GetAsync($"https://api.github.com/repos/{repoFullName}/branches?per_page=100&page={page}");
            if (!resp.IsSuccessStatusCode) break;
            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var items = doc.RootElement.EnumerateArray().ToList();
            if (items.Count == 0) break;
            all.AddRange(items.Select(b => new GithubBranch
            {
                Name      = b.TryGetProperty("name",      out var n) ? n.GetString() ?? "" : "",
                Protected = b.TryGetProperty("protected", out var p) ? p.GetBoolean()     : false,
            }));
            if (items.Count < 100) break;
            page++;
        }
        return all.OrderBy(b => b.Name).ToList();
    }

    // ── PR Yorumları ──────────────────────────────────────────────────────────
    public async Task<List<GithubComment>> GetPRCommentsAsync(string repoFullName, int number)
    {
        using var client = CreateClient();
        var resp = await client.GetAsync($"https://api.github.com/repos/{repoFullName}/issues/{number}/comments?per_page=50");
        if (!resp.IsSuccessStatusCode) return [];
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.EnumerateArray().Select(c =>
        {
            var user = c.TryGetProperty("user", out var u) ? u : default;
            return new GithubComment
            {
                Id        = c.TryGetProperty("id",         out var id)  ? id.GetInt32()       : 0,
                Body      = c.TryGetProperty("body",       out var b)   ? b.GetString()  ?? "" : "",
                Author    = user.ValueKind != JsonValueKind.Undefined && user.TryGetProperty("login",      out var ul)  ? ul.GetString()  ?? "" : "",
                Avatar    = user.ValueKind != JsonValueKind.Undefined && user.TryGetProperty("avatar_url", out var av)  ? av.GetString()  ?? "" : "",
                CreatedAt = c.TryGetProperty("created_at", out var ca)  ? ca.GetString() ?? "" : "",
            };
        }).ToList();
    }

    // ── PR Merge ──────────────────────────────────────────────────────────────
    public async Task<GithubActionResult> MergePRAsync(string repoFullName, int number, string commitTitle, string mergeMethod = "merge")
    {
        using var client = CreateClient();
        var body = JsonSerializer.Serialize(new { commit_title = commitTitle, merge_method = mergeMethod });
        var content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");
        var resp = await client.PutAsync($"https://api.github.com/repos/{repoFullName}/pulls/{number}/merge", content);
        var json = await resp.Content.ReadAsStringAsync();
        return new GithubActionResult
        {
            Success = resp.IsSuccessStatusCode,
            Message = resp.IsSuccessStatusCode ? "PR başarıyla merge edildi." : $"Merge başarısız: {json}",
        };
    }

    // ── PR Aç ─────────────────────────────────────────────────────────────────
    public async Task<GithubActionResult> CreatePRAsync(string repoFullName, string title, string body, string head, string baseB)
    {
        using var client = CreateClient();
        var payload = JsonSerializer.Serialize(new { title, body, head, @base = baseB });
        var content = new StringContent(payload, System.Text.Encoding.UTF8, "application/json");
        var resp = await client.PostAsync($"https://api.github.com/repos/{repoFullName}/pulls", content);
        var json = await resp.Content.ReadAsStringAsync();
        string? url = null;
        try { using var doc = JsonDocument.Parse(json); url = doc.RootElement.TryGetProperty("html_url", out var hu) ? hu.GetString() : null; } catch { }
        return new GithubActionResult
        {
            Success = resp.IsSuccessStatusCode,
            Message = resp.IsSuccessStatusCode ? "PR başarıyla oluşturuldu." : $"PR oluşturulamadı: {json}",
            Url     = url,
        };
    }

    // ── PR Yorum ──────────────────────────────────────────────────────────────
    public async Task<GithubActionResult> CommentPRAsync(string repoFullName, int number, string body)
    {
        using var client = CreateClient();
        var payload = JsonSerializer.Serialize(new { body });
        var content = new StringContent(payload, System.Text.Encoding.UTF8, "application/json");
        var resp = await client.PostAsync($"https://api.github.com/repos/{repoFullName}/issues/{number}/comments", content);
        return new GithubActionResult
        {
            Success = resp.IsSuccessStatusCode,
            Message = resp.IsSuccessStatusCode ? "Yorum eklendi." : "Yorum eklenemedi.",
        };
    }

    // ── Branch Sil ────────────────────────────────────────────────────────────
    public async Task<GithubActionResult> DeleteBranchAsync(string repoFullName, string branch)
    {
        using var client = CreateClient();
        var resp = await client.DeleteAsync($"https://api.github.com/repos/{repoFullName}/git/refs/heads/{Uri.EscapeDataString(branch)}");
        return new GithubActionResult
        {
            Success = resp.IsSuccessStatusCode,
            Message = resp.IsSuccessStatusCode ? $"'{branch}' branch silindi." : "Branch silinemedi.",
        };
    }

    // ── PR Kapat ──────────────────────────────────────────────────────────────
    public async Task<GithubActionResult> ClosePRAsync(string repoFullName, int number)
    {
        using var client = CreateClient();
        var payload = JsonSerializer.Serialize(new { state = "closed" });
        var content = new StringContent(payload, System.Text.Encoding.UTF8, "application/json");
        var resp = await client.PatchAsync($"https://api.github.com/repos/{repoFullName}/pulls/{number}", content);
        return new GithubActionResult
        {
            Success = resp.IsSuccessStatusCode,
            Message = resp.IsSuccessStatusCode ? "PR kapatıldı." : "PR kapatılamadı.",
        };
    }
}

// ── Models ────────────────────────────────────────────────────────────────────
public class GithubRepo
{
    public string Name          { get; set; } = "";
    public string FullName      { get; set; } = "";
    public string Description   { get; set; } = "";
    public string Language      { get; set; } = "";
    public int    Stars         { get; set; }
    public int    Forks         { get; set; }
    public string UpdatedAt     { get; set; } = "";
    public string DefaultBranch { get; set; } = "";
    public string HtmlUrl       { get; set; } = "";
}

public class GithubCommit
{
    public string Sha     { get; set; } = "";
    public string Message { get; set; } = "";
    public string Author  { get; set; } = "";
    public string Email   { get; set; } = "";
    public string Date    { get; set; } = "";
    public string Avatar  { get; set; } = "";
    public string HtmlUrl { get; set; } = "";
}

public class GithubPR
{
    public int    Number     { get; set; }
    public string Title      { get; set; } = "";
    public string State      { get; set; } = "";
    public string Author     { get; set; } = "";
    public string Avatar     { get; set; } = "";
    public string HeadBranch { get; set; } = "";
    public string BaseBranch { get; set; } = "";
    public string CreatedAt  { get; set; } = "";
    public string UpdatedAt  { get; set; } = "";
    public string HtmlUrl    { get; set; } = "";
    public bool   Draft      { get; set; }
}

public class GithubBranch
{
    public string Name      { get; set; } = "";
    public bool   Protected { get; set; }
}

public class GithubCommitDetail
{
    public string              Sha       { get; set; } = "";
    public string              ShortSha  { get; set; } = "";
    public string              Message   { get; set; } = "";
    public string              Author    { get; set; } = "";
    public string              Date      { get; set; } = "";
    public string              Avatar    { get; set; } = "";
    public string              HtmlUrl   { get; set; } = "";
    public int                 Additions { get; set; }
    public int                 Deletions { get; set; }
    public int                 Total     { get; set; }
    public List<GithubFileDiff> Files    { get; set; } = new();
}

public class GithubFileDiff
{
    public string Filename  { get; set; } = "";
    public string Status    { get; set; } = "";
    public int    Additions { get; set; }
    public int    Deletions { get; set; }
    public string Patch     { get; set; } = "";
}

public class GithubComment
{
    public int    Id        { get; set; }
    public string Body      { get; set; } = "";
    public string Author    { get; set; } = "";
    public string Avatar    { get; set; } = "";
    public string CreatedAt { get; set; } = "";
}

public class GithubActionResult
{
    public bool    Success { get; set; }
    public string  Message { get; set; } = "";
    public string? Url     { get; set; }
}