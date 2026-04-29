using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PipelineApi.Data;

namespace PipelineApi.Services;

public class AuthService(AppDbContext db, IConfiguration config, EmailService email)
{
    private readonly string _secret = config["Jwt:Secret"] ?? "PipelineIntelligence_SuperSecretKey_2026!";
    private readonly string _issuer = config["Jwt:Issuer"] ?? "PipelineApi";
    private readonly string _appUrl = config["AppUrl"] ?? "http://194.99.74.2:8091";

    // ── Register ──────────────────────────────────────────────────────────────
    public async Task<AuthResult> RegisterAsync(string username, string emailAddr, string password, string fullName = "", string role = "Developer")
    {
        if (await db.Users.AnyAsync(u => u.Email == emailAddr.ToLower()))
            return AuthResult.Fail("Bu email zaten kayıtlı.");

        if (await db.Users.AnyAsync(u => u.Username == username))
            return AuthResult.Fail("Bu kullanıcı adı alınmış.");

        if (password.Length < 6)
            return AuthResult.Fail("Şifre en az 6 karakter olmalı.");

        var isFirst = !await db.Users.AnyAsync();
        if (isFirst) role = "Admin";

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var tokenExp = DateTime.UtcNow.AddHours(24);

        var user = new User
        {
            Username = username.Trim(),
            Email = emailAddr.Trim().ToLower(),
            PasswordHash = HashPassword(password),
            FullName = fullName.Trim(),
            Role = role,
            IsEmailConfirmed = isFirst, // ilk kullanıcı (admin) otomatik onaylı
            EmailConfirmToken = isFirst ? null : token,
            EmailConfirmTokenExp = isFirst ? null : tokenExp,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        // Email onay maili gönder (admin'e gönderme)
        if (!isFirst)
            await SendConfirmEmailAsync(user, token);

        if (isFirst)
            return await GenerateTokensAsync(user);

        // Onay bekleniyor — token dönme, sadece mesaj
        return new AuthResult
        {
            Success = true,
            NeedsEmailConfirmation = true,
            Message = "Kayıt başarılı! Email adresinize onay linki gönderildi.",
        };
    }

    // ── Email Onay ────────────────────────────────────────────────────────────
    public async Task<AuthResult> ConfirmEmailAsync(string token)
    {
        var user = await db.Users.FirstOrDefaultAsync(u =>
            u.EmailConfirmToken == token &&
            u.EmailConfirmTokenExp > DateTime.UtcNow &&
            !u.IsEmailConfirmed);

        if (user == null)
            return AuthResult.Fail("Geçersiz veya süresi dolmuş onay linki.");

        user.IsEmailConfirmed = true;
        user.EmailConfirmToken = null;
        user.EmailConfirmTokenExp = null;
        await db.SaveChangesAsync();

        return await GenerateTokensAsync(user);
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    public async Task<AuthResult> LoginAsync(string emailOrUsername, string password)
    {
        var user = await db.Users.FirstOrDefaultAsync(u =>
            u.Email == emailOrUsername.ToLower() || u.Username == emailOrUsername);

        if (user == null || !VerifyPassword(password, user.PasswordHash))
            return AuthResult.Fail("Email/kullanıcı adı veya şifre hatalı.");

        if (!user.IsEmailConfirmed)
            return AuthResult.Fail("Email adresinizi onaylamadan giriş yapamazsınız. Lütfen gelen kutunuzu kontrol edin.");

        if (!user.IsActive)
            return AuthResult.Fail("Hesabınız devre dışı bırakılmış.");

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return await GenerateTokensAsync(user);
    }

    // ── Refresh token ─────────────────────────────────────────────────────────
    public async Task<AuthResult> RefreshAsync(string refreshToken)
    {
        var token = await db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == refreshToken && !t.IsRevoked);

        if (token == null || token.ExpiresAt < DateTime.UtcNow)
            return AuthResult.Fail("Geçersiz veya süresi dolmuş token.");

        token.IsRevoked = true;
        return await GenerateTokensAsync(token.User);
    }

    // ── Logout ────────────────────────────────────────────────────────────────
    public async Task LogoutAsync(string refreshToken)
    {
        var token = await db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == refreshToken);
        if (token != null) { token.IsRevoked = true; await db.SaveChangesAsync(); }
    }

    // ── Get user ──────────────────────────────────────────────────────────────
    public async Task<User?> GetUserAsync(int id) => await db.Users.FindAsync(id);

    public async Task<List<User>> GetAllUsersAsync()
        => await db.Users.OrderBy(u => u.CreatedAt).ToListAsync();

    public async Task<AuthResult> UpdateProfileAsync(int userId, string fullName, string? avatarUrl)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return AuthResult.Fail("Kullanıcı bulunamadı.");
        user.FullName = fullName;
        user.AvatarUrl = avatarUrl;
        await db.SaveChangesAsync();
        return AuthResult.Ok(null!, null!, user);
    }

    public async Task<AuthResult> ChangePasswordAsync(int userId, string current, string newPass)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return AuthResult.Fail("Kullanıcı bulunamadı.");
        if (!VerifyPassword(current, user.PasswordHash)) return AuthResult.Fail("Mevcut şifre hatalı.");
        if (newPass.Length < 6) return AuthResult.Fail("Yeni şifre en az 6 karakter olmalı.");
        user.PasswordHash = HashPassword(newPass);
        await db.SaveChangesAsync();
        return AuthResult.Ok(null!, null!, user);
    }

    public async Task<bool> SetUserRoleAsync(int userId, string role)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return false;
        user.Role = role;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetUserActiveAsync(int userId, bool active)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return false;
        user.IsActive = active;
        await db.SaveChangesAsync();
        return true;
    }

    // ── Build mail tercihi ────────────────────────────────────────────────────
    public async Task<bool> SetBuildEmailPrefAsync(int userId, bool receive)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return false;
        user.ReceiveBuildEmails = receive;
        user.NotifPopupShown = true;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetPopupShownAsync(int userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return false;
        user.NotifPopupShown = true;
        await db.SaveChangesAsync();
        return true;
    }

    // ── Build mail gönder (tüm onaylı kullanıcılara) ──────────────────────────
    public async Task SendBuildEmailToSubscribersAsync(string job, string result, string buildId)
    {
        var users = await db.Users
            .Where(u => u.IsEmailConfirmed && u.IsActive && u.ReceiveBuildEmails)
            .ToListAsync();

        foreach (var u in users)
            await email.SendBuildNotificationToAsync(u.Email, job, result, buildId);
    }

    // ── Confirm email helper ──────────────────────────────────────────────────
    private async Task SendConfirmEmailAsync(User user, string token)
    {
        var link = $"{_appUrl}/api/auth/confirm-email?token={Uri.EscapeDataString(token)}";
        var html = $"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#0d9488,#2dd4bf);padding:24px;color:white">
                <h2 style="margin:0;font-size:20px">⚡ Pipeline Intelligence</h2>
                <p style="margin:6px 0 0;opacity:.85;font-size:14px">Email Onayı</p>
              </div>
              <div style="padding:24px;background:#f9fafb">
                <p style="font-size:15px;color:#111827">Merhaba <strong>{user.FullName.Replace("&", "&amp;").Replace("<", "&lt;")}</strong>,</p>
                <p style="font-size:14px;color:#6b7280">Pipeline Intelligence'a kaydolduğunuz için teşekkürler. Hesabınızı etkinleştirmek için aşağıdaki butona tıklayın.</p>
                <div style="text-align:center;margin:28px 0">
                  <a href="{link}" style="background:#0d9488;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Email Adresimi Onayla</a>
                </div>
                <p style="font-size:12px;color:#9ca3af;text-align:center">Bu link 24 saat geçerlidir.</p>
              </div>
              <div style="padding:14px 20px;background:#f3f4f6;text-align:center;font-size:12px;color:#9ca3af">Pipeline Intelligence · Nabusoft</div>
            </div>
            """;

        await email.SendToAsync(user.Email, "⚡ Email Adresinizi Onaylayın — Pipeline Intelligence", html);
    }

    // ── Token helpers ─────────────────────────────────────────────────────────
    private async Task<AuthResult> GenerateTokensAsync(User user)
    {
        var access = GenerateAccessToken(user);
        var refresh = GenerateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = refresh,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
        });

        var old = await db.RefreshTokens
            .Where(t => t.UserId == user.Id && (t.IsRevoked || t.ExpiresAt < DateTime.UtcNow))
            .ToListAsync();
        db.RefreshTokens.RemoveRange(old);

        await db.SaveChangesAsync();
        return AuthResult.Ok(access, refresh, user);
    }

    private string GenerateAccessToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name,           user.Username),
            new Claim(ClaimTypes.Email,          user.Email),
            new Claim(ClaimTypes.Role,           user.Role),
            new Claim("fullName",                user.FullName),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    private static string HashPassword(string password)
        => BCrypt.Net.BCrypt.HashPassword(password, 12);

    private static bool VerifyPassword(string password, string hash)
        => BCrypt.Net.BCrypt.Verify(password, hash);
}

public class AuthResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public string? Message { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public UserDto? User { get; set; }
    public bool NeedsEmailConfirmation { get; set; }

    public static AuthResult Fail(string error) => new() { Success = false, Error = error };
    public static AuthResult Ok(string access, string refresh, User user) => new()
    {
        Success = true,
        AccessToken = access,
        RefreshToken = refresh,
        User = new UserDto(user),
    };
}

public record UserDto(int Id, string Username, string Email, string FullName, string Role, string? AvatarUrl, DateTime? LastLoginAt, bool IsActive, bool IsEmailConfirmed, bool ReceiveBuildEmails, bool NotifPopupShown)
{
    public UserDto(User u) : this(u.Id, u.Username, u.Email, u.FullName, u.Role, u.AvatarUrl, u.LastLoginAt, u.IsActive, u.IsEmailConfirmed, u.ReceiveBuildEmails, u.NotifPopupShown) { }
}