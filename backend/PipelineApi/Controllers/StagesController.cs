using Microsoft.AspNetCore.Mvc;
using PipelineApi.Services;

namespace PipelineApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StagesController(JenkinsService jenkins) : ControllerBase
{
   [HttpGet]
public async Task<IActionResult> GetStages([FromQuery] string job, [FromQuery] string buildId)
{
    Console.WriteLine($"[StagesController] job={job} buildId={buildId}");
    try
    {
        var stages = await jenkins.GetPipelineStagesAsync(job, buildId);
        Console.WriteLine($"[StagesController] stages count={stages.Stages.Count}");
        return Ok(stages);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[StagesController] ERROR: {ex.Message}");
        return StatusCode(500, new { error = ex.Message });
    }
}
}