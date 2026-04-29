using System.Text.Json;

namespace PipelineApi.Services;

public class SonarQubeService(IHttpClientFactory httpFactory, IConfiguration config)
{
    private string Url => config["SonarQube:Url"] ?? "http://194.99.74.2:9000";

    private HttpClient CreateClient() => httpFactory.CreateClient();

    // ── Proje listesi ─────────────────────────────────────────────────────────
    public async Task<List<SonarProject>> GetProjectsAsync()
    {
        using var client = CreateClient();
        var resp = await client.GetAsync($"{Url}/api/components/search?qualifiers=TRK&ps=100");
        if (!resp.IsSuccessStatusCode) return [];
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("components", out var comps)) return [];
        return comps.EnumerateArray().Select(c => new SonarProject
        {
            Key  = c.TryGetProperty("key",  out var k) ? k.GetString() ?? "" : "",
            Name = c.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
        }).ToList();
    }

    // ── Proje metrikleri ─────────────────────────────────────────────────────
    public async Task<SonarMetrics?> GetMetricsAsync(string projectKey)
    {
        using var client = CreateClient();
        const string keys = "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,security_rating,reliability_rating,sqale_rating,alert_status";
        var resp = await client.GetAsync($"{Url}/api/measures/component?component={Uri.EscapeDataString(projectKey)}&metricKeys={keys}");
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("component", out var comp)) return null;
        if (!comp.TryGetProperty("measures", out var measures)) return null;

        var result = new SonarMetrics { ProjectKey = projectKey };
        foreach (var m in measures.EnumerateArray())
        {
            var metric = m.TryGetProperty("metric", out var mk) ? mk.GetString() : "";
            var value  = m.TryGetProperty("value",  out var vk) ? vk.GetString() : "";
            switch (metric)
            {
                case "bugs":                     result.Bugs                  = int.TryParse(value, out var b)  ? b  : 0; break;
                case "vulnerabilities":          result.Vulnerabilities       = int.TryParse(value, out var v)  ? v  : 0; break;
                case "code_smells":              result.CodeSmells            = int.TryParse(value, out var cs) ? cs : 0; break;
                case "coverage":                 result.Coverage              = ParseDouble(value); break;
                case "duplicated_lines_density": result.DuplicatedLines       = ParseDouble(value); break;
                case "ncloc":                    result.LinesOfCode           = int.TryParse(value, out var l)  ? l  : 0; break;
                case "alert_status":             result.QualityGate           = value ?? ""; break;
                case "security_rating":          result.SecurityRating        = ParseRating(value); break;
                case "reliability_rating":       result.ReliabilityRating     = ParseRating(value); break;
                case "sqale_rating":             result.MaintainabilityRating = ParseRating(value); break;
            }
        }
        return result;
    }

    // "1.0" → "1", "3.0" → "3"
    private static string ParseRating(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (double.TryParse(value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var d))
            return ((int)Math.Round(d)).ToString();
        return value;
    }

    // Locale-safe double parse
    private static double ParseDouble(string? value)
    {
        if (string.IsNullOrEmpty(value)) return 0;
        if (double.TryParse(value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var d))
            return d;
        return 0;
    }

    // ── Tüm projeler ─────────────────────────────────────────────────────────
    public async Task<List<SonarMetrics>> GetAllMetricsAsync()
    {
        var projects = await GetProjectsAsync();
        var tasks    = projects.Select(p => GetMetricsAsync(p.Key));
        var results  = await Task.WhenAll(tasks);
        return results.Where(r => r != null).Select(r => r!).ToList();
    }

    // ── Issues ───────────────────────────────────────────────────────────────
    public async Task<SonarIssuesResult> GetIssuesAsync(string projectKey, int page = 1, string severity = "", string type = "", string componentKeys = "")
    {
        using var client = CreateClient();
        string filterKey;
        if (!string.IsNullOrEmpty(componentKeys))
        {
            // Eğer component key zaten proje prefix'i içeriyorsa direkt kullan
            // Yoksa projectKey:componentKeys formatına çevir
            filterKey = componentKeys.Contains(':') ? componentKeys : $"{projectKey}:{componentKeys}";
        }
        else
        {
            filterKey = projectKey;
        }
        var url = $"{Url}/api/issues/search?componentKeys={Uri.EscapeDataString(filterKey)}&ps=20&p={page}&resolved=false";
        if (!string.IsNullOrEmpty(severity)) url += $"&severities={severity}";
        if (!string.IsNullOrEmpty(type))     url += $"&types={type}";

        var resp = await client.GetAsync(url);
        if (!resp.IsSuccessStatusCode) return new();
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var result = new SonarIssuesResult
        {
            Total = doc.RootElement.TryGetProperty("total", out var t) ? t.GetInt32() : 0,
        };

        if (doc.RootElement.TryGetProperty("issues", out var issues))
        {
            result.Issues = issues.EnumerateArray().Select(i => new SonarIssue
            {
                Key       = i.TryGetProperty("key",       out var k)   ? k.GetString()   ?? "" : "",
                Message   = i.TryGetProperty("message",   out var msg) ? msg.GetString() ?? "" : "",
                Severity  = i.TryGetProperty("severity",  out var s)   ? s.GetString()   ?? "" : "",
                Type      = i.TryGetProperty("type",      out var ty)  ? ty.GetString()  ?? "" : "",
                Component = i.TryGetProperty("component", out var co)  ? co.GetString()  ?? "" : "",
                Line      = i.TryGetProperty("line",      out var li)  ? li.GetInt32()   : 0,
            }).ToList();
        }
        return result;
    }

    // ── Kaynak kodu ──────────────────────────────────────────────────────────
    public async Task<object> GetSourceAsync(string component, int from, int to)
    {
        using var client = CreateClient();
        var resp = await client.GetAsync($"{Url}/api/sources/show?key={Uri.EscapeDataString(component)}&from={from}&to={to}");
        if (!resp.IsSuccessStatusCode) return new { sources = Array.Empty<object>() };
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }

    // ── En çok issue'lu dosyalar ─────────────────────────────────────────────
    public async Task<List<SonarHotFile>> GetHotFilesAsync(string projectKey, int limit = 10)
    {
        using var client = CreateClient();
        var resp = await client.GetAsync($"{Url}/api/issues/search?componentKeys={Uri.EscapeDataString(projectKey)}&ps=500&resolved=false&facets=files");
        if (!resp.IsSuccessStatusCode) return [];
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("facets", out var facets)) return [];
        foreach (var facet in facets.EnumerateArray())
        {
            if (facet.TryGetProperty("property", out var prop) && prop.GetString() == "files"
                && facet.TryGetProperty("values", out var values))
            {
                return values.EnumerateArray().Take(limit).Select(v => new SonarHotFile
                {
                    Component = v.TryGetProperty("val",   out var val) ? val.GetString() ?? "" : "",
                    Count     = v.TryGetProperty("count", out var cnt) ? cnt.GetInt32()       : 0,
                }).ToList();
            }
        }
        return [];
    }

    // ── Issue dağılımı (severity bazlı) ─────────────────────────────────────
    public async Task<SonarDistribution> GetDistributionAsync(string projectKey)
    {
        using var client = CreateClient();
        var resp = await client.GetAsync($"{Url}/api/issues/search?componentKeys={Uri.EscapeDataString(projectKey)}&ps=1&resolved=false&facets=severities,types");
        if (!resp.IsSuccessStatusCode) return new();
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var result = new SonarDistribution();
        if (!doc.RootElement.TryGetProperty("facets", out var facets)) return result;
        foreach (var facet in facets.EnumerateArray())
        {
            var prop = facet.TryGetProperty("property", out var p) ? p.GetString() : "";
            if (!facet.TryGetProperty("values", out var values)) continue;
            foreach (var v in values.EnumerateArray())
            {
                var k = v.TryGetProperty("val",   out var vk) ? vk.GetString() ?? "" : "";
                var c = v.TryGetProperty("count", out var ck) ? ck.GetInt32()       : 0;
                if (prop == "severities") result.Severities[k] = c;
                if (prop == "types")      result.Types[k]      = c;
            }
        }
        return result;
    }
}

// ── Models ───────────────────────────────────────────────────────────────────
public class SonarProject
{
    public string Key  { get; set; } = "";
    public string Name { get; set; } = "";
}

public class SonarMetrics
{
    public string ProjectKey            { get; set; } = "";
    public int    Bugs                  { get; set; }
    public int    Vulnerabilities       { get; set; }
    public int    CodeSmells            { get; set; }
    public double Coverage              { get; set; }
    public double DuplicatedLines       { get; set; }
    public int    LinesOfCode           { get; set; }
    public string QualityGate           { get; set; } = "";
    public string SecurityRating        { get; set; } = "";
    public string ReliabilityRating     { get; set; } = "";
    public string MaintainabilityRating { get; set; } = "";
}

public class SonarIssuesResult
{
    public int              Total  { get; set; }
    public List<SonarIssue> Issues { get; set; } = new();
}

public class SonarIssue
{
    public string Key       { get; set; } = "";
    public string Message   { get; set; } = "";
    public string Severity  { get; set; } = "";
    public string Type      { get; set; } = "";
    public string Component { get; set; } = "";
    public int    Line      { get; set; }
}


public class SonarHotFile
{
    public string Component { get; set; } = "";
    public int    Count     { get; set; }
}

public class SonarDistribution
{
    public Dictionary<string, int> Severities { get; set; } = new();
    public Dictionary<string, int> Types      { get; set; } = new();
}