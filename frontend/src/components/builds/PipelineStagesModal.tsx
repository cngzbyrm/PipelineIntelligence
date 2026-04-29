import { useEffect, useState } from 'react'
import { X, CheckCircle, XCircle, CircleNotch, Warning, Circle, Timer, GitBranch, ArrowsHorizontal } from '@phosphor-icons/react'
import axios from 'axios'

const API_BASE = import.meta.env.PROD ? 'http://194.99.74.2:8091' : ''

interface Stage {
  id: string
  name: string
  status: string
  durationMs: number
  isParallel: boolean
  steps: any[]
}

interface StagesResult {
  job: string
  buildId: string
  status: string
  durationMs: number
  stages: Stage[]
}

function fmtDur(ms: number) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

const STATUS: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  SUCCESS:     { color: '#4ade80', bg: 'rgba(74,222,128,.08)',  border: 'rgba(74,222,128,.25)',  icon: <CheckCircle size={16} weight="fill" /> },
  FAILED:      { color: '#f87171', bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.25)', icon: <XCircle size={16} weight="fill" /> },
  FAILURE:     { color: '#f87171', bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.25)', icon: <XCircle size={16} weight="fill" /> },
  IN_PROGRESS: { color: '#60a5fa', bg: 'rgba(96,165,250,.08)',  border: 'rgba(96,165,250,.25)',  icon: <CircleNotch size={16} weight="bold" style={{ animation: 'rot .7s linear infinite' }} /> },
  UNSTABLE:    { color: '#fbbf24', bg: 'rgba(251,191,36,.08)',  border: 'rgba(251,191,36,.25)',  icon: <Warning size={16} weight="fill" /> },
  ABORTED:     { color: '#6b7280', bg: 'rgba(107,114,128,.08)', border: 'rgba(107,114,128,.2)',  icon: <Circle size={16} weight="fill" /> },
  UNKNOWN:     { color: '#6b7280', bg: 'rgba(107,114,128,.06)', border: 'rgba(107,114,128,.15)', icon: <Circle size={16} weight="duotone" /> },
}

function getS(s: string) { return STATUS[s] ?? STATUS['UNKNOWN'] }

function StageBox({ stage }: { stage: Stage }) {
  const sc = getS(stage.status)
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12, minWidth: 130, maxWidth: 180,
      background: sc.bg, border: `1.5px solid ${sc.border}`,
      boxShadow: `0 0 16px ${sc.color}15`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: sc.color }}>{sc.icon}</span>
        {stage.isParallel && (
          <span style={{ fontSize: 9, color: sc.color, background: `${sc.color}20`, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
            PARALLEL
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#e2f0ef', lineHeight: 1.3 }}>{stage.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,.4)', fontFamily: 'JetBrains Mono,monospace' }}>
        <Timer size={10} weight="duotone" /> {fmtDur(stage.durationMs)}
      </div>
    </div>
  )
}

function Connector({ parallel }: { parallel?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {parallel
        ? <ArrowsHorizontal size={16} color="rgba(45,212,191,.3)" />
        : <div style={{ width: 28, height: 2, background: 'linear-gradient(90deg,rgba(45,212,191,.4),rgba(45,212,191,.1))' }} />
      }
    </div>
  )
}

interface Props { job: string; buildId: string; onClose: () => void }

export default function PipelineStagesModal({ job, buildId, onClose }: Props) {
  const [data,    setData]    = useState<StagesResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    axios.get(`${API_BASE}/api/stages`, { params: { job, buildId } })
      .then(r => setData(r.data))
      .catch(() => setError('Stage bilgisi alınamadı.'))
      .finally(() => setLoading(false))

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Stage'leri grupla: normal → sequential, parallel → yan yana
  const groups: Stage[][] = []
  if (data?.stages) {
    let parallelGroup: Stage[] = []
    for (const s of data.stages) {
      if (s.isParallel) {
        parallelGroup.push(s)
      } else {
        if (parallelGroup.length) { groups.push([...parallelGroup]); parallelGroup = [] }
        groups.push([s])
      }
    }
    if (parallelGroup.length) groups.push(parallelGroup)
  }

  const overall = data ? getS(data.status) : null

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 700,
      background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(1100px,96vw)', maxHeight: '88vh',
        background: 'rgba(8,16,26,.98)', border: '1px solid rgba(45,212,191,.15)',
        borderRadius: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 32px 100px rgba(0,0,0,.8), 0 0 40px rgba(45,212,191,.08)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(45,212,191,.04)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(45,212,191,.1)', border: '1px solid rgba(45,212,191,.2)', display: 'grid', placeItems: 'center' }}>
              <GitBranch size={19} weight="duotone" color="var(--teal)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2f0ef' }}>{job}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: 'JetBrains Mono,monospace', marginTop: 2 }}>
                Build #{buildId}
                {data && overall && (
                  <span style={{ marginLeft: 10, color: overall.color, fontWeight: 600 }}>
                    {data.status} · {fmtDur(data.durationMs)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.4)' }}>
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '28px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 60, color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
              <CircleNotch size={22} weight="bold" color="var(--teal)" style={{ animation: 'rot .7s linear infinite' }} />
              Pipeline adımları yükleniyor...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#f87171', fontSize: 13 }}>{error}</div>
          ) : !data?.stages?.length ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
              Stage bilgisi bulunamadı.<br />
              <span style={{ fontSize: 11, opacity: .6 }}>Jenkinsfile'da stage tanımı olmayabilir.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content' }}>
              {groups.map((group, gi) => (
                <div key={gi} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {/* Parallel group → dikey sütun */}
                  {group.length > 1 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {group.map(s => <StageBox key={s.id} stage={s} />)}
                      </div>
                    </div>
                  ) : (
                    <StageBox stage={group[0]} />
                  )}

                  {/* Connector */}
                  {gi < groups.length - 1 && (
                    <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 28, height: 2, background: 'linear-gradient(90deg,rgba(45,212,191,.5),rgba(45,212,191,.1))' }} />
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(45,212,191,.4)', flexShrink: 0 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '10px 22px', borderTop: '1px solid rgba(255,255,255,.05)', fontSize: 10, color: 'rgba(255,255,255,.2)', textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }}>
          ESC · kapat
        </div>
      </div>
    </div>
  )
}
