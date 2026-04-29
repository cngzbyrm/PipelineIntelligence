using Microsoft.EntityFrameworkCore;

namespace PipelineApi.Data;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "Developer";
    public string FullName { get; set; } = "";
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    // Email onayı
    public bool IsEmailConfirmed { get; set; } = false;
    public string? EmailConfirmToken { get; set; }
    public DateTime? EmailConfirmTokenExp { get; set; }

    // Build mail tercihi
    public bool ReceiveBuildEmails { get; set; } = false;
    public bool NotifPopupShown { get; set; } = false;
}

public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Token { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
}

public class AppSetting
{
    public int Id { get; set; }
    public string Key { get; set; } = "";
    public string Value { get; set; } = "";
    public string Group { get; set; } = "general";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class BuildNote
{
    public int Id { get; set; }
    public string Job { get; set; } = "";
    public string BuildId { get; set; } = "";
    public string Note { get; set; } = "";
    public string Author { get; set; } = "dashboard";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class AuditLog
{
    public int Id { get; set; }
    public string Action { get; set; } = "";
    public string Target { get; set; } = "";
    public string Detail { get; set; } = "";
    public string User { get; set; } = "dashboard";
    public bool Success { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class WebhookConfig
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Url { get; set; } = "";
    public string Type { get; set; } = "teams";
    public bool Active { get; set; } = true;
    public string Events { get; set; } = "failure,success";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class NexusArtifactRecord
{
    public int Id { get; set; }
    public string Repository { get; set; } = "";
    public string Name { get; set; } = "";
    public string Version { get; set; } = "";
    public long SizeBytes { get; set; }
    public string Job { get; set; } = "";
    public string BuildId { get; set; } = "";
    public string DownloadUrl { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AppSetting> Settings { get; set; }
    public DbSet<BuildNote> BuildNotes { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<WebhookConfig> WebhookConfigs { get; set; }
    public DbSet<NexusArtifactRecord> NexusArtifacts { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<AppSetting>().HasIndex(e => e.Key).IsUnique();
        mb.Entity<User>().HasIndex(e => e.Email).IsUnique();
        mb.Entity<User>().HasIndex(e => e.Username).IsUnique();
        mb.Entity<RefreshToken>()
            .HasOne(t => t.User).WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}