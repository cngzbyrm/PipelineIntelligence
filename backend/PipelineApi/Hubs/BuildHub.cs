using Microsoft.AspNetCore.SignalR;

namespace PipelineApi.Hubs;

public class BuildHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", new { message = "Pipeline Intelligence connected" });
        await base.OnConnectedAsync();
    }
}
