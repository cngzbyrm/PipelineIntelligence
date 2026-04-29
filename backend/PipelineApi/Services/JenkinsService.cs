using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using PipelineApi.Models;

namespace PipelineApi.Services;

public class JenkinsService(IHttpClientFactory httpFactory, SettingsService settings)
{
    private bool   _configDirty = true;
    private string _url   = "";
    private string _user  = "";
    private string _token = "";

    public void InvalidateConfig() => _configDirty = true;

    private async Task EnsureConfigAsync()
    {
        if (!_configDirty) return;
        _url   = await settings.GetAsync("jenkins.url",   "http://194.99.74.2:8080");
        _user  = await settings.GetAsync("jenkins.user",  "admin");
        _token = await settings.GetAsync("jenkins.token", "");
        _configDirty = false;
    }

    public async Task<List<BuildResult>> FetchAllBuildsAsync()
    {
        await EnsureConfigAsync();
        var results = new List<BuildResult>();
        try
        {
            using var client = CreateClient();
            var resp = await client.GetAsync(
                $"{_url}/api/json?tree=jobs[name,url,_class,jobs[name,url,_class,jobs[name,url,_class,jobs[name,url,_class]]]]");
            if (!resp.IsSuccessStatusCode) return results;

            var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync()).RootElement;
            if (!doc.TryGetProperty("jobs", out var jobs)) return results;

            var tasks = new List<Task<List<BuildResult>>>();
            foreach (var job in jobs.EnumerateArray())
            {
                var name   = Str(job, "name");
                var cls    = Str(job, "_class");
                var jobUrl = Fix(Str(job, "url"));

                if (cls.Contains("WorkflowJob"))
                    tasks.Add(FetchOneAsync(jobUrl, name, "Deploy Jobs", name, ""));
                else if (cls.Contains("OrganizationFolder") && name == "Nabusoft-Projects")
                    tasks.Add(ParseNabusoftProjectsAsync(job));
                else if (cls.Contains("Folder") && name == "Deployments")
                    tasks.Add(ParseDeploymentsFolderAsync(job));
            }

            var all = await Task.WhenAll(tasks);
            results.AddRange(all.SelectMany(x => x));
        }
        catch (Exception ex) { Console.WriteLine($"FetchAll: {ex.Message}"); }
        return results;
    }

    private async Task<List<BuildResult>> ParseNabusoftProjectsAsync(JsonElement org)
    {
        var tasks = new List<Task<List<BuildResult>>>();
        if (!org.TryGetProperty("jobs", out var repos)) return [];

        foreach (var repo in repos.EnumerateArray())
        {
            var repoName = Str(repo, "name");
            if (!repo.TryGetProperty("jobs", out var branches)) continue;
            foreach (var branch in branches.EnumerateArray())
            {
                var branchName = Str(branch, "name");
                var branchUrl  = Fix(Str(branch, "url"));
                tasks.Add(FetchOneAsync(branchUrl, $"{repoName} / {branchName}", "CI/CD", repoName, branchName));
            }
        }

        var all = await Task.WhenAll(tasks);
        return all.SelectMany(x => x).ToList();
    }

    private async Task<List<BuildResult>> ParseDeploymentsFolderAsync(JsonElement folder)
    {
        var results = new List<BuildResult>();
        if (!folder.TryGetProperty("jobs", out var L1jobs)) return results;

        foreach (var l1 in L1jobs.EnumerateArray())
        {
            var l1Name = Str(l1, "name");
            var l1Cls  = Str(l1, "_class");

            if (l1Cls.Contains("WorkflowJob"))
            {
                results.AddRange(await FetchOneAsync(Fix(Str(l1, "url")), l1Name, "Deployments", l1Name, ""));
                continue;
            }

            if (!l1.TryGetProperty("jobs", out var L2jobs)) continue;
            foreach (var l2 in L2jobs.EnumerateArray())
            {
                var l2Name = Str(l2, "name");
                var l2Cls  = Str(l2, "_class");

                if (l2Cls.Contains("WorkflowJob"))
                {
                    results.AddRange(await FetchOneAsync(Fix(Str(l2, "url")), $"{l1Name} / {l2Name}", "Deployments", l1Name, l2Name));
                    continue;
                }

                if (!l2.TryGetProperty("jobs", out var L3jobs)) continue;
                foreach (var l3 in L3jobs.EnumerateArray())
                {
                    var l3Name = Str(l3, "name");
                    var l3Cls  = Str(l3, "_class");

                    if (l3Cls.Contains("WorkflowJob"))
                    {
                        results.AddRange(await FetchOneAsync(Fix(Str(l3, "url")), $"{l1Name} / {l2Name} / {l3Name}", "Deployments", $"{l1Name} / {l2Name}", l3Name));
                    }
                    else if (l3.TryGetProperty("jobs", out var L4jobs))
                    {
                        foreach (var l4 in L4jobs.EnumerateArray())
                        {
                            var l4Name = Str(l4, "name");
                            if (!Str(l4, "_class").Contains("WorkflowJob")) continue;
                            results.AddRange(await FetchOneAsync(Fix(Str(l4, "url")), $"{l1Name} / {l2Name} / {l3Name} / {l4Name}", "Deployments", $"{l1Name} / {l2Name}", $"{l3Name} / {l4Name}"));
                        }
                    }
                }
            }
        }
        return results;
    }

    private async Task<List<BuildResult>> FetchOneAsync(string jobUrl, string label, string group, string subGroup, string branch)
    {
        try
        {
            if (string.IsNullOrEmpty(jobUrl)) return [];
            using var client = CreateClient();
            var url  = jobUrl.TrimEnd('/') + "/lastBuild/api/json" +
                       "?tree=id,result,duration,timestamp,building,url,actions[causes[userId],testReport[passCount,failCount,skipCount]]";
            var resp = await client.GetAsync(url);
            if (!resp.IsSuccessStatusCode) return [];

            var build = ParseBuild(await resp.Content.ReadAsStringAsync(), label, group, subGroup, branch, jobUrl.TrimEnd('/'));
            return build != null ? [build] : [];
        }
        catch { return []; }
    }

    private static BuildResult? ParseBuild(string json, string label, string group, string subGroup, string branch, string jobUrl = "")
    {
        try
        {
            var doc = JsonDocument.Parse(json).RootElement;
            var id  = doc.TryGetProperty("id", out var idP) ? idP.GetString() ?? "" : "";
            if (string.IsNullOrEmpty(id)) return null;

            var b = new BuildResult
            {
                Job       = label, Id = id, Group = group, SubGroup = subGroup, Branch = branch,
                JobUrl    = jobUrl,
                Result    = doc.TryGetProperty("result",    out var r)  && r.ValueKind != JsonValueKind.Null ? r.GetString() : null,
                Building  = doc.TryGetProperty("building",  out var bl) && bl.GetBoolean(),
                Duration  = doc.TryGetProperty("duration",  out var d)  ? d.GetInt64()  : 0,
                Timestamp = doc.TryGetProperty("timestamp", out var t)  ? t.GetInt64()  : 0,
                Url       = doc.TryGetProperty("url",       out var u)  ? u.GetString() : null,
            };

            if (doc.TryGetProperty("actions", out var actions))
                foreach (var a in actions.EnumerateArray())
                {
                    if (a.TryGetProperty("testReport", out var tr))
                        b.TestReport = new TestReport
                        {
                            PassCount = tr.TryGetProperty("passCount", out var p) ? p.GetInt32() : 0,
                            FailCount = tr.TryGetProperty("failCount", out var f) ? f.GetInt32() : 0,
                            SkipCount = tr.TryGetProperty("skipCount", out var s) ? s.GetInt32() : 0,
                        };
                    if (a.TryGetProperty("causes", out var causes))
                        foreach (var c in causes.EnumerateArray())
                            if (c.TryGetProperty("userId", out var uid))
                                b.TriggerUser = uid.GetString();
                }
            return b;
        }
        catch { return null; }
    }

    // ── Tetikleme — jobUrl direkt parametre olarak geliyor ────────────────────
    public async Task<bool> TriggerBuildAsync(string job, string jobUrl = "", Dictionary<string, string>? parameters = null)
    {
        try
        {
            await EnsureConfigAsync();

            // jobUrl frontend'den geldiyse direkt kullan
            var baseUrl = !string.IsNullOrEmpty(jobUrl)
                ? jobUrl.TrimEnd('/')
                : BuildJobUrlFallback(job);

            using var client = CreateClient();

            // CSRF crumb
            var crumbResp = await client.GetAsync($"{_url}/crumbIssuer/api/json");
            if (crumbResp.IsSuccessStatusCode)
            {
                var crumbDoc   = JsonDocument.Parse(await crumbResp.Content.ReadAsStringAsync()).RootElement;
                var crumbField = crumbDoc.TryGetProperty("crumbRequestField", out var cf) ? cf.GetString() : "Jenkins-Crumb";
                var crumbValue = crumbDoc.TryGetProperty("crumb", out var cv) ? cv.GetString() : "";
                if (!string.IsNullOrEmpty(crumbValue))
                    client.DefaultRequestHeaders.Add(crumbField!, crumbValue);
            }

            var ep = $"{baseUrl}/{(parameters?.Count > 0 ? "buildWithParameters" : "build")}";
            Console.WriteLine($"Trigger URL: {ep}");

            HttpContent? content = parameters?.Count > 0 ? new FormUrlEncodedContent(parameters) : null;
            var resp = await client.PostAsync(ep, content);
            Console.WriteLine($"Trigger status: {(int)resp.StatusCode}");
            return resp.IsSuccessStatusCode || (int)resp.StatusCode == 201;
        }
        catch (Exception ex) { Console.WriteLine($"Trigger error: {ex.Message}"); return false; }
    }

    public async Task<string> FetchConsoleLogAsync(string job, string buildId)
    {
        try
        {
            await EnsureConfigAsync();
            var builds  = await FetchAllBuildsAsync();
            var match   = builds.FirstOrDefault(b => b.Job == job);
            var baseUrl = !string.IsNullOrEmpty(match?.JobUrl) ? match.JobUrl.TrimEnd('/') : BuildJobUrlFallback(job);
            using var client = CreateClient();
            var resp = await client.GetAsync($"{baseUrl}/{buildId}/consoleText");
            return resp.IsSuccessStatusCode ? await resp.Content.ReadAsStringAsync() : "";
        }
        catch { return ""; }
    }

    public async Task<(string Text, int Start)> FetchProgressiveLogAsync(string job, string buildId, int start)
    {
        try
        {
            await EnsureConfigAsync();
            var builds  = await FetchAllBuildsAsync();
            var match   = builds.FirstOrDefault(b => b.Job == job);
            var baseUrl = !string.IsNullOrEmpty(match?.JobUrl) ? match.JobUrl.TrimEnd('/') : BuildJobUrlFallback(job);
            using var client = CreateClient();
            var resp = await client.GetAsync($"{baseUrl}/{buildId}/logText/progressiveText?start={start}");
            if (!resp.IsSuccessStatusCode) return ("", start);
            var text     = await resp.Content.ReadAsStringAsync();
            var newStart = resp.Headers.TryGetValues("X-Text-Size", out var vals) ? int.Parse(vals.First()) : start + text.Length;
            return (text, newStart);
        }
        catch { return ("", start); }
    }

    public async Task<bool> StopBuildAsync(string job, string buildId)
    {
        try
        {
            await EnsureConfigAsync();
            var builds  = await FetchAllBuildsAsync();
            var match   = builds.FirstOrDefault(b => b.Job == job);
            var baseUrl = !string.IsNullOrEmpty(match?.JobUrl) ? match.JobUrl.TrimEnd('/') : BuildJobUrlFallback(job);
            using var client = CreateClient();

            var crumbResp = await client.GetAsync($"{_url}/crumbIssuer/api/json");
            if (crumbResp.IsSuccessStatusCode)
            {
                var crumbDoc   = JsonDocument.Parse(await crumbResp.Content.ReadAsStringAsync()).RootElement;
                var crumbField = crumbDoc.TryGetProperty("crumbRequestField", out var cf) ? cf.GetString() : "Jenkins-Crumb";
                var crumbValue = crumbDoc.TryGetProperty("crumb", out var cv) ? cv.GetString() : "";
                if (!string.IsNullOrEmpty(crumbValue))
                    client.DefaultRequestHeaders.Add(crumbField!, crumbValue);
            }

            return (await client.PostAsync($"{baseUrl}/{buildId}/stop", null)).IsSuccessStatusCode;
        }
        catch { return false; }
    }
   public async Task<InfraStats> GetInfraStatsAsync()
{
    await EnsureConfigAsync();
    using var client = CreateClient();
 
    // 1. Önce node listesini al
    var listJson = await client.GetStringAsync(
        _url + "/computer/api/json?tree=computer[displayName,offline,idle,numExecutors,assignedLabels[name]],busyExecutors,totalExecutors");
 
    using var listDoc = JsonDocument.Parse(listJson);
    var root      = listDoc.RootElement;
    var computers = root.GetProperty("computer");
    var busyExec  = root.TryGetProperty("busyExecutors",  out var be) ? be.GetInt32() : 0;
    var totalExec = root.TryGetProperty("totalExecutors", out var te) ? te.GetInt32() : 0;
 
    // 2. Queue length
    int queueLen = 0;
    try
    {
        var qResp = await client.GetStringAsync(_url + "/queue/api/json?tree=items[id]");
        using var qDoc = JsonDocument.Parse(qResp);
        if (qDoc.RootElement.TryGetProperty("items", out var items))
            queueLen = items.GetArrayLength();
    }
    catch { }
 
    // 3. Jenkins version
    string jenkinsVersion = "—";
    try
    {
        var vResp = await client.GetAsync(_url + "/api/json?tree=version");
        if (vResp.IsSuccessStatusCode)
        {
            using var vDoc = JsonDocument.Parse(await vResp.Content.ReadAsStringAsync());
            if (vDoc.RootElement.TryGetProperty("version", out var v))
                jenkinsVersion = v.GetString() ?? "—";
        }
    }
    catch { }
 
    // 4. Her node için detaylı bilgiyi ayrı ayrı çek
    var nodeNames = new List<(string displayName, bool offline, bool idle, int numExec, List<string> labels)>();
    foreach (var comp in computers.EnumerateArray())
    {
        var dn      = comp.TryGetProperty("displayName",   out var d)  ? d.GetString() ?? "" : "";
        var offline = comp.TryGetProperty("offline",       out var of) ? of.GetBoolean() : true;
        var idle    = comp.TryGetProperty("idle",          out var id) ? id.GetBoolean() : true;
        var numExec = comp.TryGetProperty("numExecutors",  out var ne) ? ne.GetInt32()   : 0;
 
        var labels = new List<string>();
        if (comp.TryGetProperty("assignedLabels", out var al))
            foreach (var lbl in al.EnumerateArray())
                if (lbl.TryGetProperty("name", out var ln) && ln.GetString() is { } lname && lname != dn)
                    labels.Add(lname);
 
        nodeNames.Add((dn, offline, idle, numExec, labels));
    }
 
    // 5. Her node için /computer/{name}/api/json çek (gerçek monitor verileri burada)
    var fetchTasks = nodeNames.Select(n => FetchNodeDetailAsync(client, n.displayName, n.offline, n.idle, n.numExec, n.labels));
    var allNodes   = (await Task.WhenAll(fetchTasks)).ToList();
 
    NodeInfo? masterNode = null;
    var       agentNodes = new List<NodeInfo>();
 
    foreach (var node in allNodes)
    {
        if (node.Name == "Built-In Node" || node.Name == "master")
        {
            node.Name = "Jenkins Master";
            masterNode = node;
        }
        else
        {
            agentNodes.Add(node);
        }
    }
 
    masterNode ??= new NodeInfo { Name = "Jenkins Master", Online = false };
 
    return new InfraStats
    {
        MasterNode     = masterNode,
        Nodes          = agentNodes,
        JenkinsVersion = jenkinsVersion,
        BusyExecutors  = busyExec,
        TotalExecutors = totalExec,
        QueueLength    = queueLen,
    };
}
 
private async Task<NodeInfo> FetchNodeDetailAsync(
    HttpClient client, string displayName, bool offline, bool idle, int numExec, List<string> labels)
{
    var node = new NodeInfo
    {
        Name          = displayName,
        Online        = !offline,
        Idle          = idle,
        Executors     = numExec,
        FreeExecutors = numExec,
        Labels        = labels,
    };
 
    if (offline) return node;
 
    try
    {
        // node adı "Built-In Node" için URL "(built-in)" olur
        var encodedName = displayName == "Built-In Node" ? "(built-in)" : Uri.EscapeDataString(displayName);
        var url = _url + $"/computer/{encodedName}/api/json" +
                  "?tree=numExecutors,idle,monitorData[*[*]]";
 
        var resp = await client.GetAsync(url);
        if (!resp.IsSuccessStatusCode) return node;
 
        using var doc  = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var       root = doc.RootElement;
 
        if (!root.TryGetProperty("monitorData", out var md)) return node;
 
        // CPU — SystemLoadAverageMonitor
        if (md.TryGetProperty("hudson.node_monitors.SystemLoadAverageMonitor", out var cpuMon)
            && cpuMon.ValueKind != JsonValueKind.Null
            && cpuMon.TryGetProperty("average", out var avg))
        {
            var load = avg.GetDouble();
            // Load average'ı CPU % olarak göster (çekirdek sayısına normalize et, max 100)
            node.CpuPercent = Math.Min(100, (int)Math.Round(load * 25)); // yaklaşık
        }
 
        // RAM — SwapSpaceMonitor
        if (md.TryGetProperty("hudson.node_monitors.SwapSpaceMonitor", out var ramMon)
            && ramMon.ValueKind != JsonValueKind.Null)
        {
            if (ramMon.TryGetProperty("totalPhysicalMemory", out var tot))
                node.RamTotalMb = (int)(tot.GetInt64() / (1024 * 1024));
            if (ramMon.TryGetProperty("availablePhysicalMemory", out var avail))
                node.RamUsedMb = node.RamTotalMb - (int)(avail.GetInt64() / (1024 * 1024));
        }
 
        // Disk — DiskSpaceMonitor
        if (md.TryGetProperty("hudson.node_monitors.DiskSpaceMonitor", out var diskMon)
            && diskMon.ValueKind != JsonValueKind.Null
            && diskMon.TryGetProperty("size", out var freeBytes))
        {
            var freeGb = freeBytes.GetInt64() / (1024.0 * 1024 * 1024);
            // Jenkins sadece boş alanı döndürür, toplam bilinmiyor
            // Kullanılan = toplam - boş, toplam için işletim sistemi bilgisiyle tahmin yap
            node.DiskFreeGb  = (int)freeGb;
            node.DiskTotalGb = 500; // varsayılan, disk izleme eklentisi olmadan bilinmiyor
            node.DiskUsedGb  = Math.Max(0, node.DiskTotalGb - (int)freeGb);
        }
 
        // OS — ArchitectureMonitor (string olarak geliyor)
        if (md.TryGetProperty("hudson.node_monitors.ArchitectureMonitor", out var osMon)
            && osMon.ValueKind == JsonValueKind.String)
            node.Os = osMon.GetString() ?? "";
 
        // Response time
        if (md.TryGetProperty("hudson.node_monitors.ResponseTimeMonitor", out var rtMon)
            && rtMon.ValueKind != JsonValueKind.Null
            && rtMon.TryGetProperty("average", out var rt))
            node.ResponseTimeMs = (int)rt.GetDouble();
 
        // Free executors
        if (root.TryGetProperty("numExecutors", out var ne))
            node.FreeExecutors = ne.GetInt32() - (root.TryGetProperty("idle", out var idleProp) && !idleProp.GetBoolean() ? 1 : 0);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Node detail fetch error ({displayName}): {ex.Message}");
    }
 
    return node;
}
 
private static NodeInfo ParseNodeInfo(JsonElement comp)
{
    var name    = comp.TryGetProperty("displayName",  out var dn) ? dn.GetString() ?? "" : "";
    var offline = comp.TryGetProperty("offline",      out var of) ? of.GetBoolean() : true;
    var idle    = comp.TryGetProperty("idle",         out var id) ? id.GetBoolean() : true;
    var numExec = comp.TryGetProperty("numExecutors", out var ne) ? ne.GetInt32()   : 0;
 
    var labels = new List<string>();
    if (comp.TryGetProperty("assignedLabels", out var al))
        foreach (var lbl in al.EnumerateArray())
            if (lbl.TryGetProperty("name", out var ln) && ln.GetString() is { } lname && lname != name)
                labels.Add(lname);
 
    return new NodeInfo
    {
        Name          = name,
        Online        = !offline,
        Idle          = idle,
        Executors     = numExec,
        FreeExecutors = numExec,
        Labels        = labels,
    };
}
    private string BuildJobUrlFallback(string job)
    {
        var parts = job.Split(" / ", StringSplitOptions.TrimEntries);
        if (parts.Length == 1) return $"{_url}/job/{Uri.EscapeDataString(parts[0])}";
        if (parts.Length == 2) return $"{_url}/job/Nabusoft-Projects/job/{Uri.EscapeDataString(parts[0])}/job/{Uri.EscapeDataString(parts[1])}";
        var encoded = parts.Select(Uri.EscapeDataString);
        return $"{_url}/job/Deployments/job/{string.Join("/job/", encoded)}";
    }

    public static DashboardStats ComputeStats(List<BuildResult> builds)
    {
        var pass = builds.Count(b => b.Result == "SUCCESS");
        var total = builds.Count;
        var withDur = builds.Where(b => b.Duration > 0).ToList();
        return new DashboardStats
        {
            Success = pass, Failed = builds.Count(b => b.Result == "FAILURE"),
            Unstable = builds.Count(b => b.Result == "UNSTABLE"), Running = builds.Count(b => b.Building),
            SuccessRate = total > 0 ? Math.Round(pass * 100.0 / total, 1) : 0,
            AvgDurationMinutes = withDur.Count > 0 ? Math.Round(withDur.Average(b => b.Duration) / 60000.0, 1) : 0,
            Leaderboard = builds.Where(b => b.Result == "FAILURE" && b.TriggerUser != null)
                .GroupBy(b => b.TriggerUser!).Select(g => new LeaderboardEntry { User = g.Key, FailCount = g.Count() })
                .OrderByDescending(e => e.FailCount).Take(5).ToList(),
            Coverage = builds.Where(b => b.TestReport != null).Select(b => new CoverageEntry
            {
                Job = b.Job,
                Percentage = b.TestReport!.PassCount + b.TestReport.FailCount > 0
                    ? (int)Math.Round(b.TestReport.PassCount * 100.0 / (b.TestReport.PassCount + b.TestReport.FailCount)) : 0
            }).OrderByDescending(c => c.Percentage).ToList(),
        };
    }

    private static string Str(JsonElement el, string key)
        => el.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";

    private string Fix(string url)
        => string.IsNullOrEmpty(url) ? url : url.Replace("http://localhost:8080", _url);

    private HttpClient CreateClient()
    {
        var client = httpFactory.CreateClient();
        if (!string.IsNullOrEmpty(_token))
        {
            var auth = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_user}:{_token}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", auth);
        }
        return client;
    }
   public async Task<PipelineStagesResult> GetPipelineStagesAsync(string job, string buildId)
{
    await EnsureConfigAsync();
    using var client = CreateClient();
 
    var parts = job.Split(" / ", StringSplitOptions.TrimEntries);
 
    // Blue Ocean REST API URL'si
    // /blue/rest/organizations/jenkins/pipelines/{folder}/pipelines/{repo}/branches/{branch}/runs/{id}/nodes/
    string blueUrl;
 
    if (parts.Length == 2)
    {
        // NishCommerce / test
        blueUrl = $"{_url}/blue/rest/organizations/jenkins/pipelines/Nabusoft-Projects/pipelines/{Uri.EscapeDataString(parts[0])}/branches/{Uri.EscapeDataString(parts[1])}/runs/{buildId}/nodes/?limit=100";
    }
    else if (parts.Length == 3)
    {
        // ForkLifFrontEnd / test / Deploy-to-...
        // Deployments klasöründeki job'lar için
        blueUrl = $"{_url}/blue/rest/organizations/jenkins/pipelines/Deployments/pipelines/{Uri.EscapeDataString(parts[0])}/branches/{Uri.EscapeDataString(parts[1])}/runs/{buildId}/nodes/?limit=100";
    }
    else
    {
        blueUrl = $"{_url}/blue/rest/organizations/jenkins/pipelines/{Uri.EscapeDataString(parts[0])}/runs/{buildId}/nodes/?limit=100";
    }
 
    Console.WriteLine($"[Stages] Blue Ocean URL: {blueUrl}");
 
    var resp = await client.GetAsync(blueUrl);
 
    // İlk deneme başarısız olduysa alternatifleri dene
    if (!resp.IsSuccessStatusCode && parts.Length >= 2)
    {
        var alts = new List<string>();
 
        if (parts.Length == 2)
        {
            alts.Add($"{_url}/blue/rest/organizations/jenkins/pipelines/{Uri.EscapeDataString(parts[0])}/branches/{Uri.EscapeDataString(parts[1])}/runs/{buildId}/nodes/?limit=100");
        }
        else if (parts.Length == 3)
        {
            alts.Add($"{_url}/blue/rest/organizations/jenkins/pipelines/Nabusoft-Projects/pipelines/{Uri.EscapeDataString(parts[0])}/branches/{Uri.EscapeDataString(parts[1])}/runs/{buildId}/nodes/?limit=100");
            alts.Add($"{_url}/blue/rest/organizations/jenkins/pipelines/{Uri.EscapeDataString(parts[0])}/branches/{Uri.EscapeDataString(parts[1])}/runs/{buildId}/nodes/?limit=100");
        }
 
        foreach (var alt in alts)
        {
            Console.WriteLine($"[Stages] Retry: {alt}");
            resp = await client.GetAsync(alt);
            if (resp.IsSuccessStatusCode) break;
        }
    }
 
    if (!resp.IsSuccessStatusCode)
    {
        Console.WriteLine($"[Stages] All failed: {(int)resp.StatusCode}");
        return new PipelineStagesResult { Job = job, BuildId = buildId, Stages = [] };
    }
 
    var json = await resp.Content.ReadAsStringAsync();
    using var doc = JsonDocument.Parse(json);
    var nodes = doc.RootElement;
 
    var result = new PipelineStagesResult { Job = job, BuildId = buildId, Stages = [] };
 
    // Sadece STAGE tipindeki node'ları al (PARALLEL dahil)
    foreach (var node in nodes.EnumerateArray())
    {
        var type   = node.TryGetProperty("type",           out var t) ? t.GetString() ?? "" : "";
        var name   = node.TryGetProperty("displayName",    out var n) ? n.GetString() ?? "" : "";
        var status = node.TryGetProperty("result",         out var r) ? r.GetString() ?? "" : "";
        var state  = node.TryGetProperty("state",          out var st) ? st.GetString() ?? "" : "";
        var dur    = node.TryGetProperty("durationInMillis", out var d) ? d.GetInt64() : 0;
        var id     = node.TryGetProperty("id",             out var i) ? i.GetString() ?? "" : "";
        var startTime = node.TryGetProperty("startTime",   out var s) ? s.GetString() ?? "" : "";
 
        // Çalışıyorsa state'i status olarak kullan
        var effectiveStatus = state == "RUNNING" ? "IN_PROGRESS" : status;
 
        result.Stages.Add(new PipelineStage
        {
            Id          = id,
            Name        = name,
            Status      = effectiveStatus,
            DurationMs  = dur,
            StartTimeMs = 0,
            IsParallel  = type == "PARALLEL",
            Steps       = [],
        });
    }
 
    // Genel durumu ilk stage'den al
    if (result.Stages.Count > 0)
        result.Status = result.Stages.Any(s => s.Status == "FAILED" || s.Status == "FAILURE") ? "FAILED"
                      : result.Stages.Any(s => s.Status == "IN_PROGRESS") ? "IN_PROGRESS"
                      : "SUCCESS";
 
    result.DurationMs = result.Stages.Sum(s => s.IsParallel ? 0 : s.DurationMs);
 
    Console.WriteLine($"[Stages] Got {result.Stages.Count} nodes");
    return result;
}
 
}