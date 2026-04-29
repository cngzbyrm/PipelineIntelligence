using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PipelineApi.Services;
using System.Security.Claims;

namespace PipelineApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AuthService auth) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) ||
            string.IsNullOrWhiteSpace(req.Email) ||
            string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { error = "Tüm alanlar zorunlu." });

        var result = await auth.RegisterAsync(req.Username, req.Email, req.Password, req.FullName ?? "");
        if (!result.Success) return BadRequest(new { error = result.Error });
        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var result = await auth.LoginAsync(req.EmailOrUsername, req.Password);
        if (!result.Success) return Unauthorized(new { error = result.Error });
        return Ok(result);
    }

    // ── Email onayı ────────────────────────────────────────────────────────────
    [HttpGet("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromQuery] string token)
    {
        var result = await auth.ConfirmEmailAsync(token);
        if (!result.Success)
        {
            // Frontend'e hata sayfasına yönlendir
            return Redirect($"http://194.99.74.2:8090/login?error=invalid_token");
        }
        // Başarılıysa login sayfasına yönlendir, token ile otomatik login yapılabilir
        return Redirect($"http://194.99.74.2:8090/login?confirmed=1");
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
    {
        var result = await auth.RefreshAsync(req.RefreshToken);
        if (!result.Success) return Unauthorized(new { error = result.Error });
        return Ok(result);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest req)
    {
        await auth.LogoutAsync(req.RefreshToken);
        return Ok(new { success = true });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var user = await auth.GetUserAsync(CurrentUserId);
        if (user == null) return NotFound();
        return Ok(new UserDto(user));
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] ProfileRequest req)
    {
        var result = await auth.UpdateProfileAsync(CurrentUserId, req.FullName, req.AvatarUrl);
        if (!result.Success) return BadRequest(new { error = result.Error });
        return Ok(result.User);
    }

    [HttpPut("password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] PasswordRequest req)
    {
        var result = await auth.ChangePasswordAsync(CurrentUserId, req.Current, req.New);
        if (!result.Success) return BadRequest(new { error = result.Error });
        return Ok(new { success = true });
    }

    // ── Build mail tercihi ─────────────────────────────────────────────────────
    [HttpPut("notification-pref")]
    [Authorize]
    public async Task<IActionResult> SetNotifPref([FromBody] NotifPrefRequest req)
    {
        await auth.SetBuildEmailPrefAsync(CurrentUserId, req.Receive);
        return Ok(new { success = true });
    }

    [HttpPut("popup-shown")]
    [Authorize]
    public async Task<IActionResult> SetPopupShown()
    {
        await auth.SetPopupShownAsync(CurrentUserId);
        return Ok(new { success = true });
    }

    // ── Admin endpoints ────────────────────────────────────────────────────────
    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await auth.GetAllUsersAsync();
        return Ok(users.Select(u => new UserDto(u)));
    }

    [HttpPut("users/{id}/role")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetRole(int id, [FromBody] RoleRequest req)
    {
        var ok = await auth.SetUserRoleAsync(id, req.Role);
        if (!ok) return NotFound();
        return Ok(new { success = true });
    }

    [HttpPut("users/{id}/active")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetActive(int id, [FromBody] ActiveRequest req)
    {
        var ok = await auth.SetUserActiveAsync(id, req.IsActive);
        if (!ok) return NotFound();
        return Ok(new { success = true });
    }
}

public record RegisterRequest(string Username, string Email, string Password, string? FullName);
public record LoginRequest(string EmailOrUsername, string Password);
public record RefreshRequest(string RefreshToken);
public record ProfileRequest(string FullName, string? AvatarUrl);
public record PasswordRequest(string Current, string New);
public record RoleRequest(string Role);
public record ActiveRequest(bool IsActive);
public record NotifPrefRequest(bool Receive);