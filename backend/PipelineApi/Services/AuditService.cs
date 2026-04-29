using PipelineApi.Data;

namespace PipelineApi.Services;

public class AuditService(AppDbContext db)
{
    public async Task LogAsync(string action, string target, string detail = "", bool success = true, string user = "dashboard")
    {
        db.AuditLogs.Add(new AuditLog
        {
            Action    = action,
            Target    = target,
            Detail    = detail,
            User      = user,
            Success   = success,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }
}
