using System.Net;
using System.Net.Mail;

namespace PipelineApi.Services;

public class EmailService(SettingsService settings)
{
    // ── Belirli adrese gönder ─────────────────────────────────────────────────
    public async Task SendToAsync(string toEmail, string subject, string html)
    {
        try
        {
            var host = await settings.GetAsync("email.host", "smtp.gmail.com");
            var port = int.Parse(await settings.GetAsync("email.port", "587"));
            var user = await settings.GetAsync("email.user", "");
            var pass = await settings.GetAsync("email.password", "");
            var from = await settings.GetAsync("email.from", user);

            if (string.IsNullOrEmpty(user) || string.IsNullOrEmpty(pass) || string.IsNullOrEmpty(toEmail))
            {
                Console.WriteLine("Email config eksik, gönderilmedi.");
                return;
            }

            using var client = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(user, pass),
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
            };

            var msg = new MailMessage
            {
                From = new MailAddress(from, "Pipeline Intelligence"),
                Subject = subject,
                Body = html,
                IsBodyHtml = true,
            };
            msg.To.Add(toEmail);

            await client.SendMailAsync(msg);
            Console.WriteLine($"Email gönderildi: {toEmail}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Email hatası: {ex.Message}");
        }
    }

    // ── Settings'teki varsayılan adrese gönder ────────────────────────────────
    public async Task SendAsync(string subject, string body, string? toOverride = null)
    {
        var to = toOverride ?? await settings.GetAsync("email.to", "");
        await SendToAsync(to, subject, body);
    }

    // ── Build bildirimi — belirli adrese ──────────────────────────────────────
    public async Task SendBuildNotificationToAsync(string toEmail, string job, string result, string buildId, string? details = null)
    {
        var emoji = result == "SUCCESS" ? "✅" : result == "FAILURE" ? "❌" : result == "UNSTABLE" ? "⚠️" : "🔵";
        var color = result == "SUCCESS" ? "#16a34a" : result == "FAILURE" ? "#dc2626" : result == "UNSTABLE" ? "#d97706" : "#2563eb";
        var subject = $"{emoji} [{result}] {job} — Pipeline Intelligence";
        var html = $"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
              <div style="background:{color};padding:20px;color:white">
                <h2 style="margin:0;font-size:20px">{emoji} Build {result}</h2>
                <p style="margin:5px 0 0;opacity:.85;font-size:14px">{job} · Build #{buildId}</p>
              </div>
              <div style="padding:20px;background:#f9fafb">
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:8px;color:#6b7280;font-size:13px">Proje</td><td style="padding:8px;font-weight:600;font-size:13px">{job}</td></tr>
                  <tr style="background:#fff"><td style="padding:8px;color:#6b7280;font-size:13px">Build ID</td><td style="padding:8px;font-family:monospace;font-size:13px">#{buildId}</td></tr>
                  <tr><td style="padding:8px;color:#6b7280;font-size:13px">Sonuç</td><td style="padding:8px;color:{color};font-weight:700;font-size:13px">{result}</td></tr>
                  <tr style="background:#fff"><td style="padding:8px;color:#6b7280;font-size:13px">Zaman</td><td style="padding:8px;font-size:13px">{DateTime.Now:dd.MM.yyyy HH:mm}</td></tr>
                  {(details != null ? $"<tr><td style=\"padding:8px;color:#6b7280;font-size:13px\">Detay</td><td style=\"padding:8px;font-size:13px\">{details}</td></tr>" : "")}
                </table>
              </div>
              <div style="padding:15px 20px;background:#f3f4f6;text-align:center;font-size:12px;color:#9ca3af">
                Pipeline Intelligence · Nabusoft
              </div>
            </div>
            """;
        await SendToAsync(toEmail, subject, html);
    }

    // ── Build bildirimi — settings'teki varsayılan adrese ─────────────────────
    public async Task SendBuildNotificationAsync(string job, string result, string buildId, string? details = null)
    {
        var to = await settings.GetAsync("email.to", "");
        if (!string.IsNullOrEmpty(to))
            await SendBuildNotificationToAsync(to, job, result, buildId, details);
    }
}