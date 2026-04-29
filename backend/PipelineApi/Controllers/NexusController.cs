using Microsoft.AspNetCore.Mvc;
using PipelineApi.Services;

namespace PipelineApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NexusController(NexusService nexus, AuditService audit) : ControllerBase
{
    [HttpGet("repositories")]
    public async Task<IActionResult> GetRepos() => Ok(await nexus.GetRepositoriesAsync());

    [HttpGet("artifacts")]
    public async Task<IActionResult> GetArtifacts([FromQuery] string? repository = null, [FromQuery] int pages = 3)
        => Ok(await nexus.GetArtifactsAsync(repository, pages));

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats() => Ok(await nexus.GetStorageStatsAsync());

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int count = 50)
        => Ok(await nexus.GetArtifactHistoryAsync(count));

    [HttpDelete("artifacts/{id}")]
    public async Task<IActionResult> DeleteArtifact(string id)
    {
        var ok = await nexus.DeleteArtifactAsync(id);
        await audit.LogAsync("NEXUS_DELETE", id, "", ok);
        return Ok(new { success = ok });
    }
}
