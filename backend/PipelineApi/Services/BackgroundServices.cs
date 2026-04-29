using Microsoft.AspNetCore.SignalR;
using PipelineApi.Hubs;
using PipelineApi.Models;

namespace PipelineApi.Services;

public class BuildPollingService(
    IServiceScopeFactory scopeFactory,
    IHubContext<BuildHub> hub,
    ILogger<BuildPollingService> logger) : BackgroundService
{
    private readonly Dictionary<string, string?> _prevResults = new();
    private bool _firstRun = true;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var jenkins     = scope.ServiceProvider.GetRequiredService<JenkinsService>();
                var settings    = scope.ServiceProvider.GetRequiredService<SettingsService>();
                var emailSvc    = scope.ServiceProvider.GetRequiredService<EmailService>();
                var builds      = await jenkins.FetchAllBuildsAsync();
                var intervalSec = int.TryParse(await settings.GetAsync("refresh.interval", "30"), out var iv) ? iv : 30;

                if (builds.Count > 0)
                {
                    await hub.Clients.All.SendAsync("BuildsUpdated", builds, ct);

                    if (_firstRun)
                    {
                        foreach (var b in builds)
                            _prevResults[$"{b.Job}:{b.Id}"] = b.Building ? "BUILDING" : b.Result;
                        _firstRun = false;
                    }
                    else
                    {
                        var newFails = new List<BuildResult>();

                        foreach (var b in builds)
                        {
                            var key     = $"{b.Job}:{b.Id}";
                            var prev    = _prevResults.TryGetValue(key, out var pr) ? pr : null;
                            var current = b.Building ? "BUILDING" : b.Result;

                            if (prev == "BUILDING" && !b.Building && b.Result != null)
                            {
                                var isDeployJob = b.Group is "Deployments" or "Deploy Jobs";
                                var capturedB   = b;

                                if (b.Result is "FAILURE" or "UNSTABLE")
                                {
                                    newFails.Add(b);
                                    _ = Task.Run(async () =>
                                        await emailSvc.SendBuildNotificationAsync(
                                            capturedB.Job, capturedB.Result!, capturedB.Id,
                                            "Build başarısız oldu. Logları inceleyin."));
                                }
                                else if (b.Result == "SUCCESS")
                                {
                                    _ = Task.Run(async () =>
                                        await emailSvc.SendBuildNotificationAsync(
                                            capturedB.Job, capturedB.Result!, capturedB.Id,
                                            isDeployJob ? "Deploy başarıyla tamamlandı." : null));
                                }
                            }

                            _prevResults[key] = current;
                        }

                        if (newFails.Count > 0)
                            await hub.Clients.All.SendAsync("NewFailures", newFails, ct);
                    }
                }

                await Task.Delay(intervalSec * 1000, ct);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                logger.LogWarning("Polling error: {msg}", ex.Message);
                await Task.Delay(10_000, ct);
            }
        }
    }
}