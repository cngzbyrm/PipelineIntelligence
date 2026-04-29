import { useCallback, useEffect, useRef } from 'react'
import { dashboardApi } from '../services/api'
import { useStore } from '../store'

export function useBuilds() {
  const { setBuilds, setStats, setLastRefresh, refreshInterval, autoAI } = useStore()
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const refresh = useCallback(async () => {
    try {
      const [buildsRes, statsRes] = await Promise.all([
        dashboardApi.getBuilds(),
        dashboardApi.getStats(),
      ])
      setBuilds(buildsRes.data)
      setStats(statsRes.data)
      setLastRefresh(new Date().toLocaleTimeString('tr-TR'))
    } catch {
      setLastRefresh('Bağlantı hatası')
    }
    timerRef.current = setTimeout(refresh, refreshInterval * 1000)
  }, [refreshInterval, autoAI])

  useEffect(() => {
    refresh()
    return () => clearTimeout(timerRef.current)
  }, [refresh])

  return { refresh }
}
