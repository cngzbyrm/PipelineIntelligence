using Microsoft.AspNetCore.Mvc;
using PipelineApi.Services;

namespace PipelineApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InfraController : ControllerBase
{
    private readonly JenkinsService _jenkins;
    private readonly ILogger<InfraController> _logger;

    public InfraController(JenkinsService jenkins, ILogger<InfraController> logger)
    {
        _jenkins = jenkins;
        _logger  = logger;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            var stats = await _jenkins.GetInfraStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Infra stats alınamadı");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}