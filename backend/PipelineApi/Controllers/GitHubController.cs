using Microsoft.AspNetCore.Mvc;
using PipelineApi.Services;

namespace PipelineApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GitHubController(GitHubService github) : ControllerBase
{
    // ── READ ──────────────────────────────────────────────────────────────────
    [HttpGet("repos")]
    public async Task<IActionResult> GetRepos()
        => Ok(await github.GetReposAsync());

    [HttpGet("commits")]
    public async Task<IActionResult> GetCommits(
        [FromQuery] string repo,
        [FromQuery] string branch = "",
        [FromQuery] int    page   = 1)
        => Ok(await github.GetCommitsAsync(repo, branch, page));

    [HttpGet("commit")]
    public async Task<IActionResult> GetCommit(
        [FromQuery] string repo,
        [FromQuery] string sha)
        => Ok(await github.GetCommitDetailAsync(repo, sha));

    [HttpGet("prs")]
    public async Task<IActionResult> GetPRs(
        [FromQuery] string repo,
        [FromQuery] string state = "open",
        [FromQuery] int    page  = 1)
        => Ok(await github.GetPRsAsync(repo, state, page));

    [HttpGet("branches")]
    public async Task<IActionResult> GetBranches([FromQuery] string repo)
        => Ok(await github.GetBranchesAsync(repo));

    [HttpGet("pr/comments")]
    public async Task<IActionResult> GetPRComments(
        [FromQuery] string repo,
        [FromQuery] int    number)
        => Ok(await github.GetPRCommentsAsync(repo, number));

    // ── WRITE ─────────────────────────────────────────────────────────────────

    // PR Merge
    [HttpPost("pr/merge")]
    public async Task<IActionResult> MergePR([FromBody] MergePRRequest req)
    {
        var result = await github.MergePRAsync(req.Repo, req.Number, req.CommitTitle, req.MergeMethod);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // PR Aç
    [HttpPost("pr/create")]
    public async Task<IActionResult> CreatePR([FromBody] CreatePRRequest req)
    {
        var result = await github.CreatePRAsync(req.Repo, req.Title, req.Body, req.Head, req.Base);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // PR Yorum
    [HttpPost("pr/comment")]
    public async Task<IActionResult> CommentPR([FromBody] CommentPRRequest req)
    {
        var result = await github.CommentPRAsync(req.Repo, req.Number, req.Body);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // Branch Sil
    [HttpDelete("branch")]
    public async Task<IActionResult> DeleteBranch(
        [FromQuery] string repo,
        [FromQuery] string branch)
    {
        var result = await github.DeleteBranchAsync(repo, branch);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // PR Kapat
    [HttpPost("pr/close")]
    public async Task<IActionResult> ClosePR([FromBody] ClosePRRequest req)
    {
        var result = await github.ClosePRAsync(req.Repo, req.Number);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}

// ── Request Models ────────────────────────────────────────────────────────────
public record MergePRRequest(string Repo, int Number, string CommitTitle, string MergeMethod = "merge");
public record CreatePRRequest(string Repo, string Title, string Body, string Head, string Base);
public record CommentPRRequest(string Repo, int Number, string Body);
public record ClosePRRequest(string Repo, int Number);