using Microsoft.EntityFrameworkCore;
using PipelineApi.Data;

namespace PipelineApi.Services;

public class SettingsService(AppDbContext db)
{
    private readonly Dictionary<string, string> _cache = new();

    public async Task<string> GetAsync(string key, string fallback = "")
    {
        if (_cache.TryGetValue(key, out var cached)) return cached;
        var s = await db.Settings.FirstOrDefaultAsync(x => x.Key == key);
        var val = s?.Value ?? fallback;
        _cache[key] = val;
        return val;
    }

    public async Task SetAsync(string key, string value, string group = "general")
    {
        var s = await db.Settings.FirstOrDefaultAsync(x => x.Key == key);
        if (s == null)
        {
            db.Settings.Add(new AppSetting { Key = key, Value = value, Group = group, UpdatedAt = DateTime.UtcNow });
        }
        else
        {
            s.Value = value;
            s.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        _cache[key] = value;
    }

    public async Task<Dictionary<string, string>> GetGroupAsync(string group)
    {
        return await db.Settings
            .Where(s => s.Group == group)
            .ToDictionaryAsync(s => s.Key, s => s.Value);
    }

    public async Task SetManyAsync(Dictionary<string, string> values, string group)
    {
        foreach (var kv in values)
            await SetAsync(kv.Key, kv.Value, group);
    }

    public void InvalidateCache() => _cache.Clear();
}
