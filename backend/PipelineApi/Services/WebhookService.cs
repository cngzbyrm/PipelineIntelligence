using System.Text;
using System.Text.Json;
using PipelineApi.Data;
using Microsoft.EntityFrameworkCore;

namespace PipelineApi.Services;

public class WebhookService(IHttpClientFactory http, AppDbContext db)
{
    public async Task SendAsync(string eventType, string title, string detail, string color = "0F8B8D")
    {
        var hooks = await db.WebhookConfigs
            .Where(w => w.Active && w.Events.Contains(eventType))
            .ToListAsync();

        foreach (var hook in hooks)
        {
            try
            {
                using var client = http.CreateClient();
                string payload = hook.Type switch
                {
                    "slack" => BuildSlackPayload(title, detail, color),
                    _       => BuildTeamsPayload(title, detail, color)
                };
                await client.PostAsync(hook.Url, new StringContent(payload, Encoding.UTF8, "application/json"));
            }
            catch { /* sessizce geç */ }
        }
    }

    private static string BuildTeamsPayload(string title, string detail, string color) =>
        JsonSerializer.Serialize(new
        {
            type         = "MessageCard",
            themeColor   = color,
            summary      = title,
            sections     = new[] { new { activityTitle = title, activityText = detail } },
        });

    private static string BuildSlackPayload(string title, string detail, string color) =>
        JsonSerializer.Serialize(new
        {
            text        = title,
            attachments = new[] { new { color = "#" + color, text = detail } }
        });
}
