import { useState, useEffect, useRef } from 'react'
import {
  CheckCircle, XCircle, CircleNotch, Warning,
  Star, Lightning, StopCircle, Terminal, ArrowSquareOut,
  Brain, X, ArrowsClockwise, FlowArrow, GitPullRequest
} from '@phosphor-icons/react'
import { useStore } from '../../store'
import { dashboardApi } from '../../services/api'
import { toast } from '../ui'
import PipelineStagesModal from '../builds/PipelineStagesModal'
import type { BuildResult } from '../../types'

function statusOf(b: BuildResult) {
  if (b.building)              return { label: 'Çalışıyor', color: '#38bdf8', border: 'rgba(56,189,248,.3)',  bg: 'rgba(56,189,248,.12)',  icon: <CircleNotch size={13} weight="bold" style={{ animation:'rot .8s linear infinite' }} /> }
  if (b.result === 'SUCCESS')  return { label: 'Başarılı',  color: '#4ade80', border: 'rgba(74,222,128,.3)',  bg: 'rgba(74,222,128,.12)',  icon: <CheckCircle size={13} weight="fill" /> }
  if (b.result === 'FAILURE')  return { label: 'Başarısız', color: '#f87171', border: 'rgba(248,113,113,.3)', bg: 'rgba(248,113,113,.12)', icon: <XCircle size={13} weight="fill" /> }
  if (b.result === 'UNSTABLE') return { label: 'Unstable',  color: '#fbbf24', border: 'rgba(251,191,36,.3)',  bg: 'rgba(251,191,36,.12)',  icon: <Warning size={13} weight="fill" /> }
  return { label: '—', color: '#6b7280', border: 'rgba(107,114,128,.2)', bg: 'rgba(107,114,128,.08)', icon: null }
}

function fmtDur(ms: number) {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60)   return `${s}s`
  if (s < 3600) return `${Math.floor(s/60)}dk ${s%60}s`
  return `${Math.floor(s/3600)}sa ${Math.floor((s%3600)/60)}dk`
}

function timeAgo(ts: number) {
  if (!ts) return '—'
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60)    return `${d}sn önce`
  if (d < 3600)  return `${Math.floor(d/60)}dk önce`
  if (d < 86400) return `${Math.floor(d/3600)}sa önce`
  return `${Math.floor(d/86400)}g önce`
}

// ── Log Modal ─────────────────────────────────────────────────────────────────
function LogModal({ job, buildId, onClose }: { job: string; buildId: string; onClose: () => void }) {
  const [lines, setLines] = useState<string[]>([])
  const [live, setLive]   = useState(true)
  const s = useRef(0), box = useRef<HTMLDivElement>(null), t = useRef<any>()

  useEffect(() => {
    async function poll() {
      try {
        const r = await dashboardApi.getLog(job, buildId, s.current)
        if (r.data.text) {
          setLines(p => [...p.slice(-600), ...r.data.text.split('\n').filter(Boolean)])
          s.current = r.data.nextStart
        }
        const bs = await dashboardApi.getBuilds()
        if (!bs.data.find((x: any) => x.job === job && x.id === buildId)?.building) {
          setLive(false); clearInterval(t.current)
        }
      } catch { setLive(false); clearInterval(t.current) }
    }
    poll(); t.current = setInterval(poll, 2500)
    return () => clearInterval(t.current)
  }, [job, buildId])

  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight }, [lines])
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const lc = (l: string) =>
    /error|exception|failed/i.test(l) ? 'le' :
    /warn/i.test(l) ? 'lw' :
    /success|passed/i.test(l) ? 'ls' :
    /^\[Pipeline\]|^\[stage/i.test(l) ? 'li' : ''

  return (
    <div className="lmbg" onClick={onClose}>
      <div className="lm" onClick={e => e.stopPropagation()}>
        <div className="lmh">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(45,212,191,.15)', display:'grid', placeItems:'center' }}>
              <Terminal size={15} weight="duotone" color="var(--teal)" />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--tx)' }}>{job}</div>
              <div style={{ fontSize:10, color:'var(--mt)', fontFamily:'JetBrains Mono,monospace' }}>
                #{buildId} · {live ? '🟢 canlı' : '⚪ tamamlandı'} · {lines.length} satır
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {live && <span style={{ fontSize:10, color:'var(--teal)', display:'flex', alignItems:'center', gap:4, background:'var(--teal-dim)', padding:'3px 9px', borderRadius:20 }}>
              <ArrowsClockwise size={10} style={{ animation:'rot .7s linear infinite' }} /> Canlı
            </span>}
            <button className="lmc" onClick={onClose}><X size={14} weight="bold" /></button>
          </div>
        </div>
        <div className="lmb" ref={box}>
          {lines.length === 0
            ? <div style={{ color:'var(--mt)', padding:'50px 20px', textAlign:'center', fontSize:12 }}>Log bekleniyor...</div>
            : lines.map((l, i) => <div key={i} className={`ll ${lc(l)}`}>{l}</div>)}
        </div>
        <div className="lmf">
          <span style={{ fontSize:10, color:'var(--mt)', fontFamily:'JetBrains Mono,monospace' }}>ESC · kapat</span>
          <button onClick={() => setLines([])} style={{ fontSize:11, color:'var(--mt)', background:'rgba(255,255,255,.06)', border:'1px solid var(--glass-bdr)', borderRadius:6, padding:'3px 12px', cursor:'pointer' }}>Temizle</button>
        </div>
      </div>
    </div>
  )
}

// ── Build Row ─────────────────────────────────────────────────────────────────
function BuildRow({ b, idx, onAnalyze, onLog, onStages }: { b: BuildResult; idx: number; onAnalyze: any; onLog: any; onStages: any }) {
  const { favorites, toggleFavorite, currentAnalysis } = useStore()
  const s     = statusOf(b)
  const isFav = favorites.includes(b.job)
  const canAI = b.result === 'FAILURE' || b.result === 'UNSTABLE'
  const hasAI = currentAnalysis?.job === b.job && currentAnalysis?.buildId === b.id

  const parts  = b.job.split(' / ')
  const name   = parts[0]
  const branch = parts.length > 1 ? parts[parts.length - 1] : null

  const tr    = b.testReport
  const total = (tr?.passCount ?? 0) + (tr?.failCount ?? 0)
  const rate  = total > 0 ? Math.round((tr?.passCount ?? 0) / total * 100) : null

  async function trigger(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      const r = await dashboardApi.triggerBuild(b.job, b.jobUrl ?? '')
      toast(r.data.success ? '✅ Tetiklendi!' : 'Başarısız', r.data.success ? 'var(--g)' : 'var(--r)')
    } catch { toast('Hata', 'var(--r)') }
  }

  async function stop(e: React.MouseEvent) {
    e.stopPropagation()
    await dashboardApi.stopBuild(b.job, b.id)
    toast('Durduruldu', 'var(--r)')
  }

  return (
    <div
      className="brow-v2"
      style={{
        borderLeft: `3px solid ${s.color}`,
        background: idx % 2 === 0 ? 'rgba(255,255,255,.018)' : 'transparent',
      }}
    >
      {/* Star */}
      <button className={`fav-btn ${isFav ? 'on' : ''}`} style={{ flexShrink:0 }} onClick={() => toggleFavorite(b.job)}>
        <Star size={13} weight={isFav ? 'fill' : 'regular'} />
      </button>

      {/* Name */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          {/* Branch icon */}
          <GitPullRequest size={13} weight="duotone" color="var(--mt)" style={{ flexShrink:0 }} />
          <span style={{ fontSize:14, fontWeight:700, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {name}
          </span>
          {branch && (
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 9px', borderRadius:20, background:'rgba(45,212,191,.12)', color:'var(--teal)', border:'1px solid rgba(45,212,191,.25)', fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap', flexShrink:0 }}>
              {branch}
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--mt)' }}>#{b.id}</span>
          <span style={{ color:'rgba(255,255,255,.15)' }}>·</span>
          <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--mt)' }}>{fmtDur(b.duration)}</span>
          <span style={{ color:'rgba(255,255,255,.15)' }}>·</span>
          <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--mt)' }}>{timeAgo(b.timestamp)}</span>
          {b.triggerUser && <>
            <span style={{ color:'rgba(255,255,255,.15)' }}>·</span>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--mt)' }}>{b.triggerUser}</span>
          </>}
        </div>
      </div>

      {/* Test bar */}
      {tr && rate !== null && (
        <div style={{ width:120, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:10, color:'var(--mt)' }}>Test</span>
            <span style={{ fontSize:10, fontFamily:'JetBrains Mono,monospace', color:'var(--mt)' }}>{rate}%</span>
          </div>
          <div style={{ height:4, background:'rgba(255,255,255,.08)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${rate}%`, borderRadius:2, background: rate >= 80 ? 'var(--g)' : rate >= 60 ? 'var(--y)' : 'var(--r)', transition:'width .6s' }} />
          </div>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <span style={{ fontSize:9, color:'var(--g)', fontFamily:'JetBrains Mono,monospace' }}>✓{tr.passCount}</span>
            <span style={{ fontSize:9, color:'var(--r)', fontFamily:'JetBrains Mono,monospace' }}>✗{tr.failCount}</span>
          </div>
        </div>
      )}

      {/* Status badge */}
      <div style={{
        display:'inline-flex', alignItems:'center', gap:6,
        padding:'5px 16px', borderRadius:20, minWidth:120, justifyContent:'center',
        fontSize:12, fontWeight:700, whiteSpace:'nowrap',
        color:s.color, background:s.bg, border:`1px solid ${s.border}`,
        flexShrink:0,
      }}>
        {s.icon}
        {s.label}
        {b.building && <span className="sw" style={{ marginLeft:3 }}>{[1,2,3,4,5].map(i=><span key={i} className="sb2"/>)}</span>}
      </div>

      {/* Actions */}
      <div className="brow-v2-acts">
        {/* AI */}
        <button
          className={`act-btn ${!canAI?'dis':''} ${hasAI?'gold':''}`}
          disabled={!canAI}
          onClick={() => canAI && onAnalyze(b.job, b.id)}
          title="AI Analiz"
        >
          <Brain size={13} weight={hasAI ? 'fill' : 'duotone'} />
        </button>

        {/* Tetikle / Durdur */}
        {b.building
          ? <button className="act-btn red" onClick={stop} title="Durdur">
              <StopCircle size={13} weight="fill" />
            </button>
          : <button className="act-btn" onClick={trigger} title="Tetikle">
              <Lightning size={13} weight="fill" />
            </button>}

        {/* Log */}
        <button className="act-btn" onClick={() => onLog(b.job, b.id)} title="Log">
          <FlowArrow size={13} weight="duotone" />
        </button>

        {/* Stages */}
        <button className="act-btn" onClick={() => onStages(b.job, b.id)} title="Pipeline Adımları">
          <Terminal size={13} weight="duotone" />
        </button>

        {/* Jenkins */}
        {b.url && (
          <a href={`http://194.99.74.2:8080${b.url}`} target="_blank" rel="noreferrer" className="act-btn" title="Jenkins'te Aç">
            <ArrowSquareOut size={13} weight="bold" />
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
import Pagination from '../ui/Pagination'
import { usePagination } from '../../hooks/usePagination'

export default function BuildTable({ onAnalyze }: { onAnalyze: (job: string, buildId: string) => void }) {
  const { builds, filter, search, favorites } = useStore()
  const [logTarget,    setLogTarget]    = useState<{ job: string; id: string } | null>(null)
  const [stagesTarget, setStagesTarget] = useState<{ job: string; id: string } | null>(null)

  const filtered = builds
    .filter(b => {
      if (filter === 'FAV')     return favorites.includes(b.job)
      if (filter === 'RUNNING') return b.building
      if (filter !== 'ALL')     return b.result === filter
      return true
    })
    .filter(b => !search || b.job.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

  const { page, paged, total, setPage, reset } = usePagination(filtered, 10)

  useEffect(() => { reset() }, [filter, search])

  if (!filtered.length) return (
    <div className="empty-state">
      <XCircle size={32} weight="duotone" style={{ opacity:.3, marginBottom:8, color:'var(--r)' }} />
      Eşleşen build bulunamadı.
    </div>
  )

  return (
    <>
      <div className="blist-v2">
        {paged.map((b, i) => (
          <BuildRow
            key={`${b.job}:${b.id}`}
            b={b} idx={i}
            onAnalyze={onAnalyze}
            onLog={(j: string, id: string) => setLogTarget({ job: j, id })}
            onStages={(j: string, id: string) => setStagesTarget({ job: j, id })}
          />
        ))}
      </div>
      <Pagination page={page} total={total} pageSize={10} onChange={setPage} />
      {logTarget    && <LogModal job={logTarget.job} buildId={logTarget.id} onClose={() => setLogTarget(null)} />}
      {stagesTarget && <PipelineStagesModal job={stagesTarget.job} buildId={stagesTarget.id} onClose={() => setStagesTarget(null)} />}
    </>
  )
}
