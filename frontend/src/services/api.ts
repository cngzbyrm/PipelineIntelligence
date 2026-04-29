import axios from 'axios'
import type {
  BuildResult, DashboardStats, AiAnalysis, TrendPoint,
  HeatmapEntry, TopFile, SonarEntry, Prediction, TimelineEvent,
  TestHistoryPoint, JenkinsConfig, NexusRepository, NexusArtifact,
  NexusStorageStats, AuditLog, WebhookConfig, BuildNote, AppSetting
} from '../types'

// Dev'de Vite proxy kullanır (baseURL boş = relative)
// Production'da IIS'teki API'nin tam adresi
const API_BASE = import.meta.env.PROD
  ? 'http://194.99.74.2:8091'
  : ''

const api      = axios.create({ baseURL: `${API_BASE}/api/dashboard` })
const nexusApi = axios.create({ baseURL: `${API_BASE}/api/nexus` })
const infraApi = axios.create({ baseURL: `${API_BASE}/api/infra` })

export const dashboardApi = {
  // ── Config ──────────────────────────────────────────────────────────────
  getConfig:       ()                                  => api.get<JenkinsConfig>('/config'),
  saveConfig:      (cfg: JenkinsConfig)                => api.post('/config', cfg),
  saveAiConfig:    (apiKey: string, model: string)     => api.post('/config/ai', { apiKey, model }),
  getAllSettings:   ()                                  => api.get<AppSetting[]>('/config/all'),
  saveAllSettings: (values: Record<string,string>, group: string) =>
    api.post('/config/all', { values, group }),

  // ── Builds ──────────────────────────────────────────────────────────────
  getBuilds:    ()                                => api.get<BuildResult[]>('/builds'),
  getStats:     ()                                => api.get<DashboardStats>('/stats'),
  triggerBuild: (job: string, jobUrl: string, parameters?: Record<string,string>) =>
    api.post('/builds/trigger', { job, jobUrl, parameters }),
  stopBuild:    (job: string, buildId: string)    => api.post('/builds/stop', { job, buildId }),
  getLog:       (job: string, buildId: string, start = 0) =>
    api.get<{ text: string; nextStart: number }>('/builds/log', { params: { job, buildId, start } }),

  // ── Notes ───────────────────────────────────────────────────────────────
  addNote:  (job: string, buildId: string, note: string, author = 'dashboard') =>
    api.post('/builds/note', { job, buildId, note, author }),
  getNotes: (job: string, buildId: string) =>
    api.get<BuildNote[]>(`/builds/${encodeURIComponent(job)}/${buildId}/notes`),

  // ── AI ──────────────────────────────────────────────────────────────────
  analyze:     (job: string, buildId: string, forceRefresh = false) =>
    api.post<AiAnalysis>('/analyze', { job, buildId, forceRefresh }),
  getAiMemory: ()  => api.get<AiAnalysis[]>('/ai/memory'),
  clearMemory: ()  => api.delete('/ai/memory'),

  // ── Audit ────────────────────────────────────────────────────────────────
  getAuditLog: (count = 100) => api.get<AuditLog[]>(`/audit?count=${count}`),

  // ── Webhooks ─────────────────────────────────────────────────────────────
  getWebhooks:    ()                                           => api.get<WebhookConfig[]>('/webhooks'),
  addWebhook:     (w: Omit<WebhookConfig,'id'|'createdAt'>)   => api.post<WebhookConfig>('/webhooks', w),
  updateWebhook:  (id: number, w: Omit<WebhookConfig,'id'|'createdAt'>) => api.put(`/webhooks/${id}`, w),
  deleteWebhook:  (id: number)                                => api.delete(`/webhooks/${id}`),
  testWebhook:    (id: number)                                => api.post(`/webhooks/test/${id}`),

  // ── Analytics ────────────────────────────────────────────────────────────
  getTrend:       ()            => api.get<TrendPoint[]>('/analytics/trend'),
  getHeatmap:     ()            => api.get<HeatmapEntry[]>('/analytics/heatmap'),
  getTopFiles:    ()            => api.get<TopFile[]>('/analytics/top-files'),
  getSonar:       ()            => api.get<SonarEntry[]>('/analytics/sonar'),
  getPredictions: ()            => api.get<Prediction[]>('/analytics/predictions'),
  getHistory:     (job: string) => api.get<TestHistoryPoint[]>(`/analytics/history/${job}`),

  // ── Timeline / Compare ───────────────────────────────────────────────────
  getTimeline: () => api.get<TimelineEvent[]>('/timeline'),
  compare: (jobA: string, idA: string, jobB: string, idB: string) =>
    api.get('/compare', { params: { jobA, idA, jobB, idB } }),

  // ── Infra ────────────────────────────────────────────────────────────────
  getInfra: () => infraApi.get('/stats'),

  // ── Stages ───────────────────────────────────────────────────────────────
  getStages: (job: string, buildId: string) =>
    axios.get(`${API_BASE}/api/stages`, { params: { job, buildId } }),
}

export const nexus = {
  getRepos:       ()                               => nexusApi.get<NexusRepository[]>('/repositories'),
  getArtifacts:   (repository?: string, pages = 3) =>
    nexusApi.get<NexusArtifact[]>('/artifacts', { params: { repository, pages } }),
  getStats:       ()                               => nexusApi.get<NexusStorageStats>('/stats'),
  getHistory:     (count = 50)                     => nexusApi.get('/history', { params: { count } }),
  deleteArtifact: (id: string)                     => nexusApi.delete(`/artifacts/${id}`),
}