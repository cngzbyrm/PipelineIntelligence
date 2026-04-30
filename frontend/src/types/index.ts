export interface BuildResult {
    job: string
    id: string
    result: string | null
    building: boolean
    duration: number
    timestamp: number
    url?: string
    jobUrl?: string
    testReport?: TestReport
    triggerUser?: string
    isFavorite?: boolean
    isFlaky?: boolean
    flakyCount?: number
    note?: string
    group: string
    subGroup: string
    branch: string
}
export interface TestReport {
    passCount: number
    failCount: number
    skipCount: number
}
export interface DashboardStats {
    success: number
    failed: number
    unstable: number
    running: number
    successRate: number
    avgDurationMinutes: number
    leaderboard: LeaderboardEntry[]
    coverage: CoverageEntry[]
}
export interface LeaderboardEntry { user: string; failCount: number }
export interface CoverageEntry { job: string; percentage: number }
export interface TrendPoint { label: string; pass: number; fail: number }
export interface HeatmapEntry { hour: number; failCount: number }
export interface TopFile { name: string; count: number }
export interface SonarEntry { project: string; bugs: string; quality: string; security: string }
export interface Prediction { job: string; risk: 'HIGH' | 'MED' | 'LOW'; reason: string }
export interface TimelineEvent { title: string; user: string; env: string; timeAgo: string; color: string; timestamp: string }
export interface TestHistoryPoint {
    buildNumber: number
    status: 'pass' | 'fail' | 'skip'
    passCount: number
    failCount: number
    skipCount: number
    duration: number
    timestamp: number
    result: string
    failReason: string
}
export interface BuildComparison { buildA?: BuildResult; buildB?: BuildResult }
export interface AiAnalysis {
    job: string
    buildId: string
    hata: string
    sebep: string
    cozum: string
    sure: string
    analyzedAt: string
    fromMemory?: boolean
}
export interface JenkinsConfig { url: string; user: string; token: string }
export interface AppSetting { key: string; value: string; group: string; updatedAt: string }
export interface BuildNote { id: number; job: string; buildId: string; note: string; author: string; createdAt: string }
export interface AuditLog { id: number; action: string; target: string; detail: string; user: string; success: boolean; createdAt: string }
export interface WebhookConfig { id: number; name: string; url: string; type: string; active: boolean; events: string; createdAt: string }
export interface NexusRepository { name: string; format: string; type: string; url: string }
export interface NexusArtifact { id: string; repository: string; name: string; version: string; sizeBytes: number; sizeFormatted: string; downloadUrl: string; lastModified: string; sha1: string }
export interface NexusRepoStat { name: string; sizeBytes: number; sizeFormatted: string; artifactCount: number }
export interface NexusStorageStats { totalBytes: number; totalArtifacts: number; repositories: NexusRepoStat[] }
export type FilterType = 'ALL' | 'FAV' | 'FAILURE' | 'RUNNING' | 'SUCCESS' | 'UNSTABLE'
export type SortType = 'time' | 'name' | 'status' | 'tests'
export type Theme = 'light' | 'dark'