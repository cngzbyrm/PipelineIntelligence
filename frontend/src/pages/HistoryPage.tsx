import { useEffect, useState } from 'react'
import {
  TestTube, CheckCircle, XCircle, SkipForward,
  TrendUp, TrendDown, ArrowsClockwise, Warning,
  ChartBar, Code, Bug, Timer
} from '@phosphor-icons/react'
import { dashboardApi } from '../services/api'
import { PipelineLoaderInline } from '../components/ui/PipelineLoader'
import type { TestHistoryPoint } from '../types'

const JOBS_LIST = [
  'Shell.OneHub.UI', 'NishCMS.BackOffice', 'NishCMS.Store',
  'Nish.Store.Api',  'Shell.OneHub.Core',  'ForkLiftFrontEnd'
]

// Failure sebep kategorileri (backend'den gelmiyorsa simüle)
const FAILURE_HINTS: Record<string, string[]> = {
  'Shell.OneHub.UI':      ['Timeout: API bağlantısı', 'Snapshot mismatch', 'Null reference hatası'],
  'NishCMS.BackOffice':  ['DB bağlantı hatası', 'Token süresi doldu', 'Assert hatası'],
  'NishCMS.Store':       ['Network error', 'Memory overflow', 'Missing mock'],
  'Nish.Store.Api':      ['401 Unauthorized', 'Timeout', 'Schema validation'],
  'Shell.OneHub.Core':   ['NullReferenceException', 'DB migration failed', 'Port conflict'],
  'ForkLiftFrontEnd':    ['Bundle error', 'Component snapshot', 'API 500'],
}

function StatusDot({ status, buildNumber, failReason }: { status: string; buildNumber: number; failReason?: string }) {
  const [hovered, setHovered] = useState(false)

  const color = status === 'pass' ? 'var(--g)' : status === 'fail' ? 'var(--r)' : 'rgba(255,255,255,.15)'
  const label = status === 'pass' ? 'Geçti' : status === 'fail' ? 'Başarısız' : 'Atlandı'

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="th-dot"
        style={{
          background: color,
          boxShadow: status === 'fail' ? `0 0 8px rgba(248,113,113,.5)` : status === 'pass' ? `0 0 6px rgba(74,222,128,.3)` : 'none',
          cursor: 'pointer',
        }}
      />
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,20,30,.95)', border: '1px solid var(--glass-bdr)',
          borderRadius: 8, padding: '8px 12px', zIndex: 50,
          minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,.5)',
          backdropFilter: 'blur(12px)', whiteSpace: 'nowrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: failReason ? 6 : 0 }}>
            {status === 'pass'
              ? <CheckCircle size={12} weight="fill" color="var(--g)" />
              : status === 'fail'
              ? <XCircle size={12} weight="fill" color="var(--r)" />
              : <SkipForward size={12} weight="duotone" color="var(--mt)" />}
            <span style={{ fontSize: 11, fontWeight: 700, color: color }}>
              Build #{buildNumber} — {label}
            </span>
          </div>
          {status === 'fail' && failReason && (
            <div style={{ fontSize: 10, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace', borderTop: '1px solid var(--glass-bdr)', paddingTop: 6 }}>
              <Bug size={10} weight="duotone" style={{ marginRight: 4 }} />
              {failReason}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TrendCard({ label, value, icon, color, sub }: { label: string; value: string; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,.04)', border: '1px solid var(--glass-bdr)',
      borderRadius: 10, padding: '14px 16px', flex: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--mt)', marginTop: 4, fontFamily: 'JetBrains Mono,monospace' }}>{sub}</div>}
    </div>
  )
}

export default function HistoryPage() {
  const [selJob,  setSelJob]  = useState(JOBS_LIST[0])
  const [history, setHistory] = useState<TestHistoryPoint[]>([])
  const [loading, setLoading] = useState(false)

  async function load(job: string) {
    setLoading(true)
    try {
      const r = await dashboardApi.getHistory(job)
      setHistory(r.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(selJob) }, [selJob])

  const pass  = history.filter(h => h.status === 'pass').length
  const fail  = history.filter(h => h.status === 'fail').length
  const skip  = history.filter(h => h.status === 'skip').length
  const rate  = history.length ? Math.round(pass / history.length * 100) : 0

  // Trend: son 5 vs önceki 5
  const recent   = history.slice(-5)
  const previous = history.slice(-10, -5)
  const recentRate  = recent.length   ? Math.round(recent.filter(h=>h.status==='pass').length / recent.length * 100) : 0
  const prevRate    = previous.length ? Math.round(previous.filter(h=>h.status==='pass').length / previous.length * 100) : 0
  const trendUp     = recentRate >= prevRate

  // Failure hints
  const hints = FAILURE_HINTS[selJob] ?? ['Bilinmeyen hata']
  const failPoints = history.filter(h => h.status === 'fail')

  // Consecutive fails
  let maxStreak = 0, cur = 0
  for (const h of history) { if (h.status === 'fail') { cur++; maxStreak = Math.max(maxStreak, cur) } else cur = 0 }

  return (
    <div className="page-wrap">
      {/* Page title */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
        <TestTube size={22} weight="duotone" color="var(--teal)" />
        <div className="page-title" style={{ margin:0 }}>Test Geçmişi</div>
      </div>
      <div className="page-sub">Son 30 build boyunca test geçme/kalma trendi ve hata analizi</div>

      {/* Job selector */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="th-proj-sel">
          {JOBS_LIST.map(j => (
            <button key={j} className={`th-p ${j === selJob ? 'on' : ''}`} onClick={() => setSelJob(j)}>
              {j}
            </button>
          ))}
          <button className="act-btn" style={{ marginLeft:'auto' }} onClick={() => load(selJob)} title="Yenile">
            <ArrowsClockwise size={13} weight="duotone" style={{ ...(loading ? { animation:'rot .7s linear infinite' } : {}) }} />
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        <TrendCard label="Başarı Oranı"
          value={`${rate}%`}
          icon={<ChartBar size={14} weight="duotone" />}
          color={rate >= 80 ? 'var(--g)' : rate >= 60 ? 'var(--y)' : 'var(--r)'}
          sub={`Son ${history.length} build`}
        />
        <TrendCard label="Trend"
          value={`${trendUp ? '+' : ''}${recentRate - prevRate}%`}
          icon={trendUp ? <TrendUp size={14} weight="duotone" /> : <TrendDown size={14} weight="duotone" />}
          color={trendUp ? 'var(--g)' : 'var(--r)'}
          sub="Son 5 vs önceki 5"
        />
        <TrendCard label="Hata Serisi"
          value={maxStreak > 0 ? `${maxStreak}×` : '—'}
          icon={<Warning size={14} weight="duotone" />}
          color={maxStreak >= 3 ? 'var(--r)' : maxStreak >= 1 ? 'var(--y)' : 'var(--g)'}
          sub="Ard arda başarısız"
        />
        <TrendCard label="Atlandı"
          value={`${skip}`}
          icon={<SkipForward size={14} weight="duotone" />}
          color="var(--mt)"
          sub="skip/ignore"
        />
      </div>

      {/* Main chart card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="ch">
          <div className="ct" style={{ display:'flex', alignItems:'center', gap:6 }}>
            <TestTube size={13} weight="duotone" color="var(--teal)" />
            {selJob} — Son {history.length} Build
          </div>
          <div className="cm" style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><CheckCircle size={10} weight="fill" color="var(--g)" /> geçti</span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><XCircle size={10} weight="fill" color="var(--r)" /> başarısız</span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><SkipForward size={10} weight="duotone" color="var(--mt)" /> atlandı</span>
          </div>
        </div>

        <div style={{ padding: '16px 12px 8px' }}>
          {loading ? (
            <PipelineLoaderInline message="fetching test history..." />
          ) : (
            <div className="th-grid" style={{ gap:4 }}>
              {history.map((h, i) => (
                <StatusDot
                  key={h.buildNumber}
                  status={h.status}
                  buildNumber={h.buildNumber}
                  failReason={h.status === 'fail' ? hints[i % hints.length] : undefined}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ padding:'8px 14px 14px', display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--g)', display:'flex', alignItems:'center', gap:4 }}>
            <CheckCircle size={11} weight="fill" /> {pass} geçti
          </span>
          <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--r)', display:'flex', alignItems:'center', gap:4 }}>
            <XCircle size={11} weight="fill" /> {fail} başarısız
          </span>
          <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--mt)', display:'flex', alignItems:'center', gap:4 }}>
            <SkipForward size={11} weight="duotone" /> {skip} atlandı
          </span>
          <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--mt)', marginLeft:'auto' }}>
            Başarı oranı: <span style={{ color: rate >= 80 ? 'var(--g)' : rate >= 60 ? 'var(--y)' : 'var(--r)', fontWeight:700 }}>{rate}%</span>
          </span>
        </div>
      </div>

      {/* Failure analysis */}
      {failPoints.length > 0 && (
        <div className="card" style={{ position: "relative" }}>
          <div className="ch">
            <div className="ct" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Bug size={13} weight="duotone" color="var(--r)" /> Hata Analizi
            </div>
            <div className="cm">{failPoints.length} başarısız build</div>
          </div>
          <div style={{ padding:'12px 16px' }}>
            {failPoints.slice(0, 5).map((h, i) => (
              <div key={h.buildNumber} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'9px 0', borderBottom:'1px solid var(--glass-bdr)'
              }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.2)', display:'grid', placeItems:'center', flexShrink:0 }}>
                  <XCircle size={16} weight="fill" color="var(--r)" />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--tx)', marginBottom:3 }}>
                    Build #{h.buildNumber}
                  </div>
                  <div style={{ fontSize:11, color:'var(--mt)', fontFamily:'JetBrains Mono,monospace', display:'flex', alignItems:'center', gap:4 }}>
                    <Bug size={10} weight="duotone" /> {hints[i % hints.length]}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--mt)', fontFamily:'JetBrains Mono,monospace', flexShrink:0 }}>
                  <Timer size={10} weight="duotone" /> Build {h.buildNumber}
                </div>
              </div>
            ))}
            {failPoints.length > 5 && (
              <div style={{ fontSize:11, color:'var(--mt)', padding:'8px 0', textAlign:'center' }}>
                + {failPoints.length - 5} daha
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
