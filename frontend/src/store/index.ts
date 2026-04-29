import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BuildResult, DashboardStats, FilterType, SortType, Theme, AiAnalysis } from '../types'

interface AppState {
  // Data
  builds: BuildResult[]
  stats: DashboardStats | null
  lastRefresh: string

  // UI
  filter: FilterType
  sort: SortType
  search: string
  theme: Theme
  sound: boolean
  autoAI: boolean
  flakyDetect: boolean
  refreshInterval: number

  // Favorites (persisted)
  favorites: string[]

  // AI
  currentAnalysis: AiAnalysis | null
  aiLoading: boolean

  // Log
  logJob: string
  logLines: string[]

  // Actions
  setBuilds: (b: BuildResult[]) => void
  setStats: (s: DashboardStats) => void
  setFilter: (f: FilterType) => void
  setSort: (s: SortType) => void
  setSearch: (s: string) => void
  toggleTheme: () => void
  toggleSound: () => void
  toggleFavorite: (job: string) => void
  isFavorite: (job: string) => boolean
  setCurrentAnalysis: (a: AiAnalysis | null) => void
  setAiLoading: (v: boolean) => void
  setLogJob: (job: string) => void
  appendLog: (line: string) => void
  clearLog: () => void
  setRefreshInterval: (s: number) => void
  setAutoAI: (v: boolean) => void
  setFlakyDetect: (v: boolean) => void
  setLastRefresh: (s: string) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      builds: [],
      stats: null,
      lastRefresh: '—',
      filter: 'ALL',
      sort: 'time',
      search: '',
      theme: 'light',
      sound: true,
      autoAI: false,
      flakyDetect: true,
      refreshInterval: 30,
      favorites: [],
      currentAnalysis: null,
      aiLoading: false,
      logJob: '',
      logLines: [],

      setBuilds: (builds) => set({ builds }),
      setStats:  (stats)  => set({ stats }),
      setFilter: (filter) => set({ filter }),
      setSort:   (sort)   => set({ sort }),
      setSearch: (search) => set({ search }),
      setLastRefresh: (s) => set({ lastRefresh: s }),
      setRefreshInterval: (s) => set({ refreshInterval: s }),
      setAutoAI: (v) => set({ autoAI: v }),
      setFlakyDetect: (v) => set({ flakyDetect: v }),

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', next)
        set({ theme: next })
      },
      toggleSound: () => set(s => ({ sound: !s.sound })),

      toggleFavorite: (job) => set(s => ({
        favorites: s.favorites.includes(job)
          ? s.favorites.filter(f => f !== job)
          : [...s.favorites, job]
      })),
      isFavorite: (job) => get().favorites.includes(job),

      setCurrentAnalysis: (a) => set({ currentAnalysis: a }),
      setAiLoading: (v) => set({ aiLoading: v }),

      setLogJob: (job) => set({ logJob: job, logLines: [] }),
      appendLog: (line) => set(s => ({ logLines: [...s.logLines.slice(-200), line] })),
      clearLog: () => set({ logLines: [] }),
    }),
    {
      name: 'pipeline-dashboard',
      partialize: (s) => ({
        theme: s.theme,
        favorites: s.favorites,
        sound: s.sound,
        refreshInterval: s.refreshInterval,
        autoAI: s.autoAI,
        flakyDetect: s.flakyDetect,
      }),
    }
  )
)
