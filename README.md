# Pipeline Intelligence Dashboard

Full-stack CI/CD monitoring dashboard.
- **Frontend**: React 18 + Vite + TypeScript + Zustand
- **Backend**: .NET 9 Web API + SignalR

---

## Kurulum

### Backend

```bash
cd backend/PipelineApi
dotnet restore
dotnet run
# → http://localhost:5000
# → Swagger: http://localhost:5000/swagger
```

**appsettings.json** — Jenkins ve AI bilgilerini girin:
```json
{
  "Jenkins": { "Url": "http://jenkins:8080", "User": "admin", "Token": "..." },
  "Anthropic": { "ApiKey": "sk-ant-...", "Model": "claude-haiku-4-5-20251001" }
}
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🏗 Buildler | Canlı build listesi, filtre, sıralama, favori |
| 🤖 AI Analiz | Claude ile hata analizi, hafıza sistemi |
| 📡 Log Streaming | Build çalışırken canlı log |
| 📊 Analitik | Trend grafiği, heatmap, SonarQube skoru |
| ⚖️ Karşılaştırma | İki build'i yan yana kıyasla |
| 📈 Test Geçmişi | Son 30 build test trendi |
| 🕐 Timeline | Deployment geçmişi |
| 🔔 Real-time | SignalR ile anlık güncellemeler |
| 🌙 Tema | Koyu/açık tema |

---

## API Endpoints

```
GET  /api/dashboard/builds          → Tüm buildler
GET  /api/dashboard/stats           → İstatistikler
POST /api/dashboard/builds/trigger  → Build tetikle
POST /api/dashboard/builds/stop     → Build durdur
GET  /api/dashboard/builds/{j}/{id}/log → Log streaming
POST /api/dashboard/analyze         → AI analiz
GET  /api/dashboard/analytics/trend → Trend verisi
GET  /api/dashboard/analytics/heatmap
GET  /api/dashboard/analytics/top-files
GET  /api/dashboard/analytics/sonar
GET  /api/dashboard/analytics/predictions
GET  /api/dashboard/analytics/history/{job}
GET  /api/dashboard/timeline
GET  /api/dashboard/compare?jobA=&idA=&jobB=&idB=
GET  /api/dashboard/ai/memory
DELETE /api/dashboard/ai/memory
WS   /hubs/builds                   → SignalR hub
```
