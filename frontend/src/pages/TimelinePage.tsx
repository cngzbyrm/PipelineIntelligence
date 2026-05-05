import { useEffect, useState } from 'react'
import {
  GitCommit, User, GitBranch, CheckCircle, XCircle,
  Warning, Circle, ClockCountdown
} from '@phosphor-icons/react'
import { dashboardApi } from '../services/api'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import { PipelineLoaderInline } from '../components/ui/PipelineLoader'
import PageHeader from '../components/layout/PageHeader'
import type { TimelineEvent } from '../types'

const COLOR_MAP: Record<string, string> = {
  green:  'var(--g)',
  red:    'var(--r)',
  blue:   'var(--b)',
  yellow: 'var(--y)',
}

function statusIcon(color: string) {
  if (color === 'green')  return <CheckCircle size={14} weight="fill" color="var(--g)" />
  if (color === 'red')    return <XCircle size={14} weight="fill" color="var(--r)" />
  if (color === 'yellow') return <Warning size={14} weight="fill" color="var(--y)" />
  return <Circle size={14} weight="fill" color="var(--b)" />
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.getTimeline().then(r => setEvents(r.data)).finally(() => setLoading(false))
  }, [])

  const { page, paged, total, setPage } = usePagination(events, 10)

  return (
    <div className="page-wrap">
      <PageHeader
        icon={<GitCommit size={22} weight="duotone" />}
        kicker="Deploy"
        title="Deployment timeline"
        subtitle="Kim, ne zaman, nereye deploy etti"
      />

      <div className="card" style={{ position: "relative" }}>
        {loading ? (
          <PipelineLoaderInline message="fetching deployments..." />
        ) : (
          <div className="tl">
            {events.length === 0 ? (
              <div className="empty-state">
                <ClockCountdown size={36} weight="duotone" style={{ opacity:.4, marginBottom:8, color:'var(--teal)' }} />
                Deployment kaydı bulunamadı.
              </div>
            ) : (
              paged.map((e, i) => (
                <div key={i} className="tl-row">
                  <div className="tl-dot" style={{ background: COLOR_MAP[e.color] ?? 'var(--mt)', boxShadow:`0 0 6px ${COLOR_MAP[e.color] ?? 'var(--mt)'}40` }} />
                  <div className="tl-main">
                    <div className="tl-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {statusIcon(e.color)}
                      <span>{e.title}</span>
                    </div>
                    <div className="tl-sub" style={{ display:'flex', alignItems:'center', gap:10, marginTop:3 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <User size={11} weight="duotone" color="var(--mt)" /> {e.user}
                      </span>
                      <span style={{ color:'rgba(255,255,255,.15)' }}>·</span>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <GitBranch size={11} weight="duotone" color="var(--mt)" /> {e.env}
                      </span>
                    </div>
                  </div>
                  <div className="tl-time">{e.timeAgo}</div>
                </div>
              ))
            )}
          </div>
        )}
        {!loading && <Pagination page={page} total={total} pageSize={10} onChange={setPage} />}
      </div>
    </div>
  )
}
