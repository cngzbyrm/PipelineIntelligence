using Microsoft.AspNetCore.Mvc;
using PipelineApi.Services;

namespace PipelineApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SonarController(SonarQubeService sonar) : ControllerBase
{
    [HttpGet("projects")]
    public async Task<IActionResult> GetProjects()
        => Ok(await sonar.GetProjectsAsync());

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics([FromQuery] string project)
    {
        var result = await sonar.GetMetricsAsync(project);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetAll()
        => Ok(await sonar.GetAllMetricsAsync());

    [HttpGet("hotspots-debug")]
    public async Task<IActionResult> DebugHotspots([FromQuery] string project)
        => Ok(await sonar.GetHotspotsAsync(project, "", 1));

    [HttpGet("hotspots")]
    public async Task<IActionResult> GetHotspots(
        [FromQuery] string project,
        [FromQuery] string componentKeys = "",
        [FromQuery] int page = 1)
        => Ok(await sonar.GetHotspotsAsync(project, componentKeys, page));

    [HttpGet("issues")]
    public async Task<IActionResult> GetIssues(
        [FromQuery] string project,
        [FromQuery] int page = 1,
        [FromQuery] string severity = "",
        [FromQuery] string type = "",
        [FromQuery] string componentKeys = "")
        => Ok(await sonar.GetIssuesAsync(project, page, severity, type, componentKeys));

    [HttpGet("source")]
    public async Task<IActionResult> GetSource(
        [FromQuery] string component,
        [FromQuery] int from = 1,
        [FromQuery] int to = 20)
        => Ok(await sonar.GetSourceAsync(component, from, to));

    [HttpGet("hotfiles")]
    public async Task<IActionResult> GetHotFiles([FromQuery] string project, [FromQuery] int limit = 10)
        => Ok(await sonar.GetHotFilesAsync(project, limit));

    [HttpGet("file-metrics")]
    public async Task<IActionResult> GetFileMetrics([FromQuery] string project)
        => Ok(await sonar.GetFileMetricsAsync(project));

    [HttpGet("distribution")]
    public async Task<IActionResult> GetDistribution([FromQuery] string project)
        => Ok(await sonar.GetDistributionAsync(project));

    [HttpGet("report/excel")]
    public async Task<IActionResult> DownloadExcel([FromQuery] string project)
    {
        var issues = await sonar.GetAllIssuesAsync(project);
        var metrics = await sonar.GetMetricsAsync(project);
        var fileMetrics = await sonar.GetFileMetricsAsync(project);
        var bytes = SonarReportService.GenerateExcel(project, issues, metrics, fileMetrics);
        var name = $"sonarqube-report-{project}-{DateTime.Now:yyyyMMdd}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name);
    }

    [HttpGet("report/pdf")]
    public async Task<IActionResult> DownloadPdf([FromQuery] string project)
    {
        var issues = await sonar.GetAllIssuesAsync(project);
        var metrics = await sonar.GetMetricsAsync(project);
        var bytes = SonarReportService.GeneratePdf(project, issues, metrics);
        var name = $"sonarqube-report-{project}-{DateTime.Now:yyyyMMdd}.pdf";
        return File(bytes, "application/pdf", name);
    }
}