using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PipelineApi.Data;
using PipelineApi.Models;

namespace PipelineApi.Services;

public class NexusService(IHttpClientFactory http, SettingsService settings, AppDbContext db)
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    private async Task<HttpClient> CreateClientAsync()
    {
        var url  = await settings.GetAsync("nexus.url",      "http://194.99.74.2:8081");
        var user = await settings.GetAsync("nexus.user",     "admin");
        var pass = await settings.GetAsync("nexus.password", "");

        var client = http.CreateClient();
        client.BaseAddress = new Uri(url);

        if (!string.IsNullOrEmpty(pass))
        {
            var auth = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{user}:{pass}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", auth);
        }
        return client;
    }

    // ── Repositories ─────────────────────────────────────────────────────────
    public async Task<List<NexusRepository>> GetRepositoriesAsync()
    {
        try
        {
            using var client = await CreateClientAsync();
            var resp  = await client.GetAsync("/service/rest/v1/repositories");
            if (!resp.IsSuccessStatusCode) return [];
            var json  = await resp.Content.ReadAsStringAsync();
            var repos = JsonSerializer.Deserialize<List<NexusRepository>>(json, Json) ?? [];
            return repos;
        }
        catch { return []; }
    }

    // ── Artifacts (components) ────────────────────────────────────────────────
    public async Task<List<NexusArtifact>> GetArtifactsAsync(string? repository = null, int maxPages = 3)
    {
        try
        {
            using var client = await CreateClientAsync();

            // Repository belirtilmemişse tüm repoları çek, her biri için paralel istek at
            if (string.IsNullOrEmpty(repository))
            {
                var repos = await GetRepositoriesAsync();
                if (repos.Count == 0) return [];

                var tasks = repos.Take(15).Select(r => FetchFromRepoAsync(client, r.Name, maxPages));
                var all   = await Task.WhenAll(tasks);
                return all.SelectMany(x => x)
                          .OrderByDescending(a => a.LastModified)
                          .ToList();
            }

            return await FetchFromRepoAsync(client, repository, maxPages);
        }
        catch { return []; }
    }

    private async Task<List<NexusArtifact>> FetchFromRepoAsync(HttpClient client, string repository, int maxPages = 3)
    {
        var all   = new List<NexusArtifact>();
        string? token = null;
        int page  = 0;

        do
        {
            var url = $"/service/rest/v1/components?repository={Uri.EscapeDataString(repository)}";
            if (token != null) url += $"&continuationToken={Uri.EscapeDataString(token)}";

            var resp = await client.GetAsync(url);
            if (!resp.IsSuccessStatusCode) break;

            var json = await resp.Content.ReadAsStringAsync();
            var doc  = JsonDocument.Parse(json).RootElement;

            if (doc.TryGetProperty("items", out var items))
            {
                foreach (var item in items.EnumerateArray())
                {
                    var artifact = new NexusArtifact
                    {
                        Id         = item.TryGetProperty("id",         out var id)   ? id.GetString()   ?? "" : "",
                        Repository = item.TryGetProperty("repository", out var repo) ? repo.GetString() ?? "" : "",
                        Name       = item.TryGetProperty("name",       out var name) ? name.GetString() ?? "" : "",
                        Version    = item.TryGetProperty("version",    out var ver)  ? ver.GetString()  ?? "" : "",
                    };

                    if (item.TryGetProperty("assets", out var assets))
                    {
                        foreach (var asset in assets.EnumerateArray())
                        {
                            artifact.DownloadUrl = asset.TryGetProperty("downloadUrl", out var du) ? du.GetString() ?? "" : "";
                            if (asset.TryGetProperty("fileSize",     out var fs)) artifact.SizeBytes    = fs.GetInt64();
                            if (asset.TryGetProperty("lastModified", out var lm) && lm.ValueKind != JsonValueKind.Null)
                                artifact.LastModified = lm.GetString() ?? "";
                            if (asset.TryGetProperty("checksum", out var cs) && cs.TryGetProperty("sha1", out var sha))
                                artifact.Sha1 = sha.GetString() ?? "";
                            break;
                        }
                    }

                    all.Add(artifact);
                }
            }

            token = doc.TryGetProperty("continuationToken", out var ct) && ct.ValueKind != JsonValueKind.Null
                ? ct.GetString() : null;
            page++;

        } while (token != null && page < maxPages);

        return all;
    }

    // ── Storage Stats ─────────────────────────────────────────────────────────
    public async Task<NexusStorageStats> GetStorageStatsAsync()
    {
        try
        {
            using var client = await CreateClientAsync();
            var repos  = await GetRepositoriesAsync();
            var stats  = new NexusStorageStats { Repositories = [] };

            // Her repo için artifact sayısını çek (paralel)
            var tasks = repos.Take(10).Select(async repo =>
            {
                try
                {
                    var resp = await client.GetAsync($"/service/rest/v1/components?repository={Uri.EscapeDataString(repo.Name)}");
                    if (!resp.IsSuccessStatusCode) return (repo.Name, 0L, 0);

                    var json  = await resp.Content.ReadAsStringAsync();
                    var doc   = JsonDocument.Parse(json).RootElement;
                    var count = doc.TryGetProperty("items", out var items) ? items.GetArrayLength() : 0;
                    return (repo.Name, 0L, count);
                }
                catch { return (repo.Name, 0L, 0); }
            });

            var results = await Task.WhenAll(tasks);

            stats.Repositories = results.Select(r => new NexusRepoStat
            {
                Name       = r.Item1,
                SizeBytes  = r.Item2,
                ArtifactCount = r.Item3,
            }).ToList();

            stats.TotalArtifacts = stats.Repositories.Sum(r => r.ArtifactCount);
            return stats;
        }
        catch { return new NexusStorageStats { Repositories = [] }; }
    }

    // ── Delete Artifact ───────────────────────────────────────────────────────
    public async Task<bool> DeleteArtifactAsync(string componentId)
    {
        try
        {
            using var client = await CreateClientAsync();
            var resp = await client.DeleteAsync($"/service/rest/v1/components/{Uri.EscapeDataString(componentId)}");
            return resp.IsSuccessStatusCode;
        }
        catch { return false; }
    }

    // ── Save artifact record to DB ────────────────────────────────────────────
    public async Task SaveArtifactRecordAsync(string repo, string name, string version, long size, string job, string buildId, string url)
    {
        db.NexusArtifacts.Add(new NexusArtifactRecord
        {
            Repository  = repo,
            Name        = name,
            Version     = version,
            SizeBytes   = size,
            Job         = job,
            BuildId     = buildId,
            DownloadUrl = url,
            CreatedAt   = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }

    // ── Artifact history from DB ──────────────────────────────────────────────
    public async Task<List<NexusArtifactRecord>> GetArtifactHistoryAsync(int count = 50)
        => await db.NexusArtifacts.OrderByDescending(a => a.CreatedAt).Take(count).ToListAsync();
}