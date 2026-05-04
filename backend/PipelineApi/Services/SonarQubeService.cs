using System.Text.Json;

namespace PipelineApi.Services;

public class SonarQubeService(IHttpClientFactory httpFactory, IConfiguration config)
{
    private string Url => config["SonarQube:Url"] ?? "http://194.99.74.2:9000";

    private HttpClient CreateClient() => httpFactory.CreateClient();

    // ── Dosya bazlı metrikler (SonarQube Code tab ile aynı yapı) ─────────────
    public async Task<List<SonarFileMetrics>> GetFileMetricsAsync(string projectKey)
    {
        var all = new List<SonarFileMetrics>();
        int page = 1;
        const int ps = 100;
        const string metricKeys = "lines,coverage,duplicated_lines_density,sqale_rating,reliability_rating,security_rating,security_hotspots,security_hotspots_reviewed,ncloc";

        while (true)
        {
            using var client = CreateClient();
            var url = $"{Url}/api/measures/component_tree?component={Uri.EscapeDataString(projectKey)}&metricKeys={metricKeys}&qualifiers=FIL&ps={ps}&p={page}";
            var resp = await client.GetAsync(url);
            Console.WriteLine($"[FileMetrics] p={page} status={resp.StatusCode} url={url}");
            if (!resp.IsSuccessStatusCode) break;

            var json = await resp.Content.ReadAsStringAsync();
            Console.WriteLine($"[FileMetrics] response length={json.Length}");
            using var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("components", out var comps)) break;

            var batch = comps.EnumerateArray().Select(comp =>
            {
                var fm = new SonarFileMetrics
                {
                    Path = comp.TryGetProperty("path", out var p) ? p.GetString() ?? "" : "",
                    Key = comp.TryGetProperty("key", out var k) ? k.GetString() ?? "" : "",
                };

                if (comp.TryGetProperty("measures", out var measures))
                {
                    foreach (var m in measures.EnumerateArray())
                    {
                        var metric = m.TryGetProperty("metric", out var mk) ? mk.GetString() : "";
                        var value = m.TryGetProperty("value", out var mv) ? mv.GetString() : null;
                        switch (metric)
                        {
                            case "lines": fm.Lines = int.TryParse(value, out var l) ? l : 0; break;
                            case "ncloc": fm.LinesOfCode = int.TryParse(value, out var nl) ? nl : 0; break;
                            case "coverage": fm.Coverage = double.TryParse(value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var cv) ? cv : 0; break;
                            case "duplicated_lines_density": fm.Duplications = double.TryParse(value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var dup) ? dup : 0; break;
                            case "security_rating": fm.SecurityRating = value ?? ""; break;
                            case "reliability_rating": fm.ReliabilityRating = value ?? ""; break;
                            case "sqale_rating": fm.MaintainabilityRating = value ?? ""; break;
                            case "security_hotspots": fm.SecurityHotspots = int.TryParse(value, out var sh) ? sh : 0; break;
                        }
                    }
                }
                return fm;
            }).ToList();

            all.AddRange(batch);

            // Toplam sayfa kontrolü
            var paging = doc.RootElement.TryGetProperty("paging", out var pg) ? pg : default;
            var total = paging.ValueKind != JsonValueKind.Undefined && paging.TryGetProperty("total", out var t) ? t.GetInt32() : 0;
            if (all.Count >= total || batch.Count < ps) break;
            page++;
        }

        return all;
    }

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
            Key = c.TryGetProperty("key", out var k) ? k.GetString() ?? "" : "",
            Name = c.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
        }).ToList();
    }

    // ── Proje metrikleri ─────────────────────────────────────────────────────
    public async Task<SonarMetrics?> GetMetricsAsync(string projectKey)
    {
        using var client = CreateClient();
        const string keys = "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,security_rating,security_review_rating,reliability_rating,sqale_rating,alert_status";
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
            var value = m.TryGetProperty("value", out var vk) ? vk.GetString() : "";
            switch (metric)
            {
                case "bugs": result.Bugs = int.TryParse(value, out var b) ? b : 0; break;
                case "vulnerabilities": result.Vulnerabilities = int.TryParse(value, out var v) ? v : 0; break;
                case "code_smells": result.CodeSmells = int.TryParse(value, out var cs) ? cs : 0; break;
                case "coverage": result.Coverage = ParseDouble(value); break;
                case "duplicated_lines_density": result.DuplicatedLines = ParseDouble(value); break;
                case "ncloc": result.LinesOfCode = int.TryParse(value, out var l) ? l : 0; break;
                case "alert_status": result.QualityGate = value ?? ""; break;
                case "security_rating": result.SecurityRating = ParseRating(value); break;
                case "security_review_rating": result.SecurityReviewRating = ParseRating(value); break;
                case "reliability_rating": result.ReliabilityRating = ParseRating(value); break;
                case "sqale_rating": result.MaintainabilityRating = ParseRating(value); break;
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
        var tasks = projects.Select(p => GetMetricsAsync(p.Key));
        var results = await Task.WhenAll(tasks);
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
        if (!string.IsNullOrEmpty(type)) url += $"&types={type}";

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
                Key = i.TryGetProperty("key", out var k) ? k.GetString() ?? "" : "",
                Message = i.TryGetProperty("message", out var msg) ? msg.GetString() ?? "" : "",
                Severity = i.TryGetProperty("severity", out var s) ? s.GetString() ?? "" : "",
                Type = i.TryGetProperty("type", out var ty) ? ty.GetString() ?? "" : "",
                Component = i.TryGetProperty("component", out var co) ? co.GetString() ?? "" : "",
                Line = i.TryGetProperty("line", out var li) ? li.GetInt32() : 0,
            }).ToList();
        }
        return result;
    }

    // ── Security Hotspots ────────────────────────────────────────────────────
    public async Task<SonarIssuesResult> GetHotspotsAsync(string projectKey, string componentKeys = "", int page = 1)
    {
        using var client = CreateClient();

        var url = $"{Url}/api/hotspots/search?projectKey={Uri.EscapeDataString(projectKey)}&ps=20&p={page}&status=TO_REVIEW";

        // Dosya filtresi — tam component key ile
        if (!string.IsNullOrEmpty(componentKeys))
        {
            // Eğer zaten proje:path formatındaysa direkt kullan, değilse ekle
            var fullKey = componentKeys.Contains(':') ? componentKeys : $"{projectKey}:{componentKeys}";
            url += $"&component={Uri.EscapeDataString(fullKey)}";
        }

        Console.WriteLine($"[Hotspots] GET {url}");
        var resp = await client.GetAsync(url);
        Console.WriteLine($"[Hotspots] Status: {resp.StatusCode}");

        if (!resp.IsSuccessStatusCode) return new();

        var json = await resp.Content.ReadAsStringAsync();
        Console.WriteLine($"[Hotspots] Response length: {json.Length}");
        using var doc = JsonDocument.Parse(json);

        var result = new SonarIssuesResult
        {
            Total = doc.RootElement.TryGetProperty("paging", out var pg) && pg.TryGetProperty("total", out var t) ? t.GetInt32() : 0,
        };

        Console.WriteLine($"[Hotspots] Total: {result.Total}");

        if (doc.RootElement.TryGetProperty("hotspots", out var hotspots))
        {
            result.Issues = hotspots.EnumerateArray().Select(h => new SonarIssue
            {
                Key = h.TryGetProperty("key", out var k) ? k.GetString() ?? "" : "",
                Message = h.TryGetProperty("message", out var m) ? m.GetString() ?? "" : "",
                Severity = h.TryGetProperty("vulnerabilityProbability", out var vp) ? vp.GetString() ?? "MEDIUM" : "MEDIUM",
                Type = "SECURITY_HOTSPOT",
                Component = h.TryGetProperty("component", out var co) ? co.GetString() ?? "" : "",
                Line = h.TryGetProperty("line", out var li) ? li.GetInt32() : 0,
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
                    Component = v.TryGetProperty("val", out var val) ? val.GetString() ?? "" : "",
                    Count = v.TryGetProperty("count", out var cnt) ? cnt.GetInt32() : 0,
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
                var k = v.TryGetProperty("val", out var vk) ? vk.GetString() ?? "" : "";
                var c = v.TryGetProperty("count", out var ck) ? ck.GetInt32() : 0;
                if (prop == "severities") result.Severities[k] = c;
                if (prop == "types") result.Types[k] = c;
            }
        }
        return result;
    }

    // ── Tüm issue'ları çek (rapor için) ──────────────────────────────────────
    public async Task<List<SonarIssue>> GetAllIssuesAsync(string projectKey)
    {
        var all = new List<SonarIssue>();
        int page = 1;
        const int ps = 100;

        // SonarQube hard limit: p * ps <= 10000
        // Aşmak için severity bazlı ayrı ayrı çek, birleştir
        var severities = new[] { "BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO" };

        foreach (var severity in severities)
        {
            page = 1;
            while (true)
            {
                using var client = CreateClient();
                var url = $"{Url}/api/issues/search?componentKeys={Uri.EscapeDataString(projectKey)}&ps={ps}&p={page}&resolved=false&severities={severity}";
                var resp = await client.GetAsync(url);
                if (!resp.IsSuccessStatusCode) break;

                var json = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);

                var total = doc.RootElement.TryGetProperty("total", out var t) ? t.GetInt32() : 0;

                if (doc.RootElement.TryGetProperty("issues", out var issues))
                {
                    var batch = issues.EnumerateArray().Select(i => new SonarIssue
                    {
                        Key = i.TryGetProperty("key", out var k) ? k.GetString() ?? "" : "",
                        Message = i.TryGetProperty("message", out var m) ? m.GetString() ?? "" : "",
                        Severity = i.TryGetProperty("severity", out var s) ? s.GetString() ?? "" : "",
                        Type = i.TryGetProperty("type", out var tp) ? tp.GetString() ?? "" : "",
                        Component = i.TryGetProperty("component", out var c) ? c.GetString() ?? "" : "",
                        Line = i.TryGetProperty("line", out var l) ? l.GetInt32() : 0,
                    }).ToList();

                    all.AddRange(batch);
                    // Her severity için max 10000 — toplamda 50000'e kadar çekilebilir
                    if (batch.Count < ps || page * ps >= Math.Min(total, 9900)) break;
                }
                else break;

                page++;
            }
        }

        return all;
    }
}

// ── Models ───────────────────────────────────────────────────────────────────
public class SonarProject
{
    public string Key { get; set; } = "";
    public string Name { get; set; } = "";
}

public class SonarMetrics
{
    public string ProjectKey { get; set; } = "";
    public int Bugs { get; set; }
    public int Vulnerabilities { get; set; }
    public int CodeSmells { get; set; }
    public double Coverage { get; set; }
    public double DuplicatedLines { get; set; }
    public int LinesOfCode { get; set; }
    public string QualityGate { get; set; } = "";
    public string SecurityRating { get; set; } = "";
    public string SecurityReviewRating { get; set; } = "";
    public string ReliabilityRating { get; set; } = "";
    public string MaintainabilityRating { get; set; } = "";
}

public class SonarIssuesResult
{
    public int Total { get; set; }
    public List<SonarIssue> Issues { get; set; } = new();
}

public class SonarIssue
{
    public string Key { get; set; } = "";
    public string Message { get; set; } = "";
    public string Severity { get; set; } = "";
    public string Type { get; set; } = "";
    public string Component { get; set; } = "";
    public int Line { get; set; }
}


public class SonarHotFile
{
    public string Component { get; set; } = "";
    public int Count { get; set; }
}

public class SonarDistribution
{
    public Dictionary<string, int> Severities { get; set; } = new();
    public Dictionary<string, int> Types { get; set; } = new();
}

public class SonarFileMetrics
{
    public string Path { get; set; } = "";
    public string Key { get; set; } = "";
    public int Lines { get; set; }
    public int LinesOfCode { get; set; }
    public double Coverage { get; set; }
    public double Duplications { get; set; }
    public string SecurityRating { get; set; } = "";
    public string ReliabilityRating { get; set; } = "";
    public string MaintainabilityRating { get; set; } = "";
    public int SecurityHotspots { get; set; }

    // 1-5 → A-E
    public string SecurityGrade => Rating(SecurityRating);
    public string ReliabilityGrade => Rating(ReliabilityRating);
    public string MaintainabilityGrade => Rating(MaintainabilityRating);

    // Hotspot review + vulnerability'nin worst case'i
    public string WorstSecurityGrade
    {
        get
        {
            var vRating = int.TryParse(SecurityRating.Split('.')[0], out var v) ? v : 1;
            var hRating = SecurityHotspots > 0 ? 4 : 1; // hotspot varsa minimum D
            return Rating(Math.Max(vRating, hRating).ToString());
        }
    }

    private static string Rating(string r)
    {
        // SonarQube bazen "1.0", "2.0" gibi decimal döndürüyor
        var key = r.Split('.')[0];
        return key switch { "1" => "A", "2" => "B", "3" => "C", "4" => "D", "5" => "E", _ => r };
    }
}