namespace PipelineApi.Models;

public class BuildResult
{
    public string Job          { get; set; } = "";
    public string Id           { get; set; } = "";
    public string? Result      { get; set; }
    public bool   Building     { get; set; }
    public long   Duration     { get; set; }
    public long   Timestamp    { get; set; }
    public string? Url         { get; set; }
    public string  JobUrl      { get; set; } = "";
    public TestReport? TestReport { get; set; }
    public string? TriggerUser { get; set; }
    public bool   IsFavorite   { get; set; }
    public bool   IsFlaky      { get; set; }
    public int    FlakyCount   { get; set; }
    public string? Note        { get; set; }
    public string Group        { get; set; } = "";
    public string SubGroup     { get; set; } = "";
    public string Branch       { get; set; } = "";
}

public class TestReport       { public int PassCount { get; set; } public int FailCount { get; set; } public int SkipCount { get; set; } }
public class LeaderboardEntry { public string User { get; set; } = ""; public int FailCount { get; set; } }
public class CoverageEntry    { public string Job  { get; set; } = ""; public int Percentage { get; set; } }
public class TrendPoint       { public string Label { get; set; } = ""; public int Pass { get; set; } public int Fail { get; set; } }
public class HeatmapEntry     { public int Hour { get; set; } public int FailCount { get; set; } }
public class TopFile          { public string Name { get; set; } = ""; public int Count { get; set; } }
public class SonarEntry       { public string Project { get; set; } = ""; public string Bugs { get; set; } = "A"; public string Quality { get; set; } = "A"; public string Security { get; set; } = "A"; }
public class Prediction       { public string Job { get; set; } = ""; public string Risk { get; set; } = "LOW"; public string Reason { get; set; } = ""; }
public class TimelineEvent    { public string Title { get; set; } = ""; public string User { get; set; } = ""; public string Env { get; set; } = ""; public string TimeAgo { get; set; } = ""; public string Color { get; set; } = "green"; public DateTime Timestamp { get; set; } }
public class TestHistoryPoint { public int BuildNumber { get; set; } public string Status { get; set; } = "skip"; }
public class BuildComparison  { public BuildResult? BuildA { get; set; } public BuildResult? BuildB { get; set; } }

public class TriggerRequest
{
    public string Job    { get; set; } = "";
    public string Branch { get; set; } = "test";
    public string JobUrl { get; set; } = "";   // Frontend'den gelen gerçek Jenkins URL'i
    public Dictionary<string, string>? Parameters { get; set; }
}

public class AnalyzeRequest { public string Job { get; set; } = ""; public string BuildId { get; set; } = ""; public bool ForceRefresh { get; set; } }

public class AiAnalysis
{
    public string Job        { get; set; } = "";
    public string BuildId    { get; set; } = "";
    public string Hata       { get; set; } = "";
    public string Sebep      { get; set; } = "";
    public string Cozum      { get; set; } = "";
    public string Sure       { get; set; } = "";
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
    public bool FromMemory   { get; set; }
}

public class DashboardStats
{
    public int Success { get; set; } public int Failed { get; set; } public int Unstable { get; set; } public int Running { get; set; }
    public double SuccessRate { get; set; } public double AvgDurationMinutes { get; set; }
    public List<LeaderboardEntry> Leaderboard { get; set; } = [];
    public List<CoverageEntry>    Coverage    { get; set; } = [];
}

public class NexusRepository  { public string Name { get; set; } = ""; public string Format { get; set; } = ""; public string Type { get; set; } = ""; public string Url { get; set; } = ""; }
public class NexusArtifact    { public string Id { get; set; } = ""; public string Repository { get; set; } = ""; public string Name { get; set; } = ""; public string Version { get; set; } = ""; public long SizeBytes { get; set; } public string DownloadUrl { get; set; } = ""; public string LastModified { get; set; } = ""; public string Sha1 { get; set; } = ""; public string SizeFormatted => SizeBytes > 1_048_576 ? $"{SizeBytes/1_048_576.0:F1} MB" : SizeBytes > 1024 ? $"{SizeBytes/1024.0:F1} KB" : $"{SizeBytes} B"; }
public class NexusRepoStat    { public string Name { get; set; } = ""; public long SizeBytes { get; set; } public int ArtifactCount { get; set; } public string SizeFormatted => SizeBytes > 1_073_741_824 ? $"{SizeBytes/1_073_741_824.0:F1} GB" : SizeBytes > 1_048_576 ? $"{SizeBytes/1_048_576.0:F1} MB" : $"{SizeBytes/1024.0:F1} KB"; }
public class NexusStorageStats { public long TotalBytes { get; set; } public int TotalArtifacts { get; set; } public List<NexusRepoStat> Repositories { get; set; } = []; }

public record AiConfigDto(string ApiKey, string Model);
public record StopRequest(string Job, string BuildId);
public record NoteRequest(string Job, string BuildId, string Note, string Author);
public record WebhookRequest(string Name, string Url, string Type, string Events);
public record SettingsUpdateRequest(Dictionary<string, string> Values, string Group);
public record JenkinsConfig { public string Url { get; init; } = ""; public string User { get; init; } = ""; public string Token { get; init; } = ""; }

public class NodeInfo
{
    public string       Name           { get; set; } = "";
    public bool         Online         { get; set; }
    public bool         Idle           { get; set; }
    public int          CpuPercent     { get; set; }
    public int          RamUsedMb      { get; set; }
    public int          RamTotalMb     { get; set; }
    public int          DiskUsedGb     { get; set; }
    public int          DiskFreeGb     { get; set; }
    public int          DiskTotalGb    { get; set; }
    public string       Os             { get; set; } = "";
    public int          Executors      { get; set; }
    public int          FreeExecutors  { get; set; }
    public int          ResponseTimeMs { get; set; }
    public List<string> Labels         { get; set; } = new();
}
 
public class InfraStats
{
    public NodeInfo       MasterNode      { get; set; } = new();
    public List<NodeInfo> Nodes           { get; set; } = new();
    public string         JenkinsVersion  { get; set; } = "";
    public int            BusyExecutors   { get; set; }
    public int            TotalExecutors  { get; set; }
    public int            QueueLength     { get; set; }
}

public class PipelineStagesResult
{
    public string              Job        { get; set; } = "";
    public string              BuildId    { get; set; } = "";
    public string              Status     { get; set; } = "";
    public long                DurationMs { get; set; }
    public List<PipelineStage> Stages     { get; set; } = new();
}
 
public class PipelineStage
{
    public string             Id          { get; set; } = "";
    public string             Name        { get; set; } = "";
    public string             Status      { get; set; } = "";
    public long               DurationMs  { get; set; }
    public long               StartTimeMs { get; set; }
    public bool               IsParallel  { get; set; }
    public List<PipelineStep> Steps       { get; set; } = new();
}
 
public class PipelineStep
{
    public string Id         { get; set; } = "";
    public string Name       { get; set; } = "";
    public string Status     { get; set; } = "";
    public long   DurationMs { get; set; }
}
 