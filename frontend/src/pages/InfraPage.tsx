import { useEffect, useState } from 'react'
import {
  Desktop, HardDrive, Cpu,
  ArrowsClockwise, CheckCircle, XCircle, Warning,
  WifiHigh, WifiSlash, Lightning, GitBranch
} from '@phosphor-icons/react'
import { dashboardApi } from '../services/api'
import { PipelineLoaderInline } from '../components/ui/PipelineLoader'

interface NodeInfo {
  name: string
  online: boolean
  idle: boolean
  cpuPercent: number
  ramUsedMb: number
  ramTotalMb: number
  diskUsedGb: number
  diskTotalGb: number
  os: string
  executors: number
  freeExecutors: number
  responseTimeMs: number
  labels: string[]
}

interface InfraStats {
  masterNode: NodeInfo
  nodes: NodeInfo[]
  jenkinsVersion: string
  queueLength: number
  totalExecutors: number
  busyExecutors: number
}

function pct(used: number, total: number) {
  if (!total) return 0
  return Math.round(used / total * 100)
}

function fmtRam(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`
}

function GaugeCircle({ value, label, warn = 70, danger = 90 }: {
  value: number; label: string; warn?: number; danger?: number
}) {
  const size = 76
  const r = 30
  const cx = size / 2, cy = size / 2
  const startAngle = -215
  const endAngle   = 35
  const angleRange = endAngle - startAngle
  const angle      = startAngle + (Math.min(value, 100) / 100) * angleRange
  const toRad      = (a: number) => (a * Math.PI) / 180

  function arcPath(start: number, end: number, radius: number) {
    const s = toRad(start), e = toRad(end)
    const x1 = cx + radius * Math.cos(s), y1 = cy + radius * Math.sin(s)
    const x2 = cx + radius * Math.cos(e), y2 = cy + radius * Math.sin(e)
    const large = end - start > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`
  }

  const color = value >= danger ? '#f87171' : value >= warn ? '#fbbf24' : '#2dd4bf'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${label}: ${value}%`}>
        <path d={arcPath(startAngle, endAngle, r)} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={7} strokeLinecap="round" />
        {value > 0 && (
          <path d={arcPath(startAngle, angle, r)} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
        )}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={color} fontFamily="JetBrains Mono,monospace">
          {value}%
        </text>
      </svg>
      <span style={{ fontSize: 10, color: 'var(--mt)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>
        {label}
      </span>
    </div>
  )
}

function NodeCard({ node, master = false }: { node: NodeInfo; master?: boolean }) {
  const ramPct  = pct(node.ramUsedMb, node.ramTotalMb)
  const diskPct = pct(node.diskUsedGb, node.diskTotalGb)
  const execPct = node.executors > 0 ? Math.round((node.executors - node.freeExecutors) / node.executors * 100) : 0

  return (
    <div style={{
      background: 'var(--glass)',
      border: `1px solid ${node.online ? (master ? 'rgba(45,212,191,.3)' : 'var(--glass-bdr)') : 'rgba(248,113,113,.3)'}`,
      borderRadius: 12, overflow: 'hidden',
      backdropFilter: 'blur(16px)',
      boxShadow: master ? '0 0 30px rgba(45,212,191,.07), var(--sh)' : 'var(--sh)',
      position: 'relative',
    }}>
      {master && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: 'rgba(45,212,191,.15)', color: 'var(--teal)',
            border: '1px solid var(--teal-bdr)', letterSpacing: '.08em', textTransform: 'uppercase',
          }}>Master</span>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--glass-bdr)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: node.online ? 'rgba(45,212,191,.1)' : 'rgba(248,113,113,.1)',
            border: `1px solid ${node.online ? 'var(--teal-bdr)' : 'rgba(248,113,113,.25)'}`,
            display: 'grid', placeItems: 'center',
          }}>
            <Desktop size={18} weight="duotone" color={node.online ? 'var(--teal)' : 'var(--r)'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {!node.name || node.name === 'master' ? 'Jenkins Master' : node.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              {node.online
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--g)', fontWeight: 600 }}>
                    <WifiHigh size={10} weight="fill" /> Çevrimiçi
                  </span>
                : <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--r)', fontWeight: 600 }}>
                    <WifiSlash size={10} weight="fill" /> Çevrimdışı
                  </span>}
              {node.idle && node.online && <span style={{ fontSize: 10, color: 'var(--mt)' }}>· Boşta</span>}
              {node.os && <span style={{ fontSize: 10, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace' }}>· {node.os}</span>}
              {node.responseTimeMs > 0 && (
                <span style={{ fontSize: 10, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace' }}>· {node.responseTimeMs}ms</span>
              )}
            </div>
          </div>
        </div>

        {node.labels?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
            {node.labels.slice(0, 5).map(l => (
              <span key={l} style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 20,
                background: 'rgba(255,255,255,.05)', color: 'var(--mt)',
                border: '1px solid var(--glass-bdr)', fontFamily: 'JetBrains Mono,monospace',
              }}>{l}</span>
            ))}
          </div>
        )}
      </div>

      {/* Gauges */}
      <div style={{ padding: '16px 18px 10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${node.executors > 0 ? 4 : 3}, 1fr)`, gap: 8, marginBottom: 12 }}>
          <GaugeCircle value={node.cpuPercent} label="CPU" warn={70} danger={90} />
          <GaugeCircle value={ramPct}  label="RAM"  warn={75} danger={90} />
          <GaugeCircle value={diskPct} label="Disk" warn={70} danger={85} />
          {node.executors > 0 && (
            <GaugeCircle value={execPct} label="Exec" warn={80} danger={100} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--mt)', justifyContent: 'center', fontFamily: 'JetBrains Mono,monospace' }}>
          <span>RAM {fmtRam(node.ramUsedMb)}/{fmtRam(node.ramTotalMb)}</span>
          <span>·</span>
          <span>Disk {node.diskUsedGb.toFixed(1)}/{node.diskTotalGb.toFixed(1)} GB</span>
          {node.executors > 0 && <><span>·</span><span>Exec {node.executors - node.freeExecutors}/{node.executors}</span></>}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 18px', borderTop: '1px solid var(--glass-bdr)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(255,255,255,.02)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace' }}>
          <Cpu size={10} weight="duotone" /> {node.freeExecutors}/{node.executors} executor boş
        </span>
      </div>
    </div>
  )
}

export default function InfraPage() {
  const [data,    setData]    = useState<InfraStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [lastUpd, setLastUpd] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await dashboardApi.getInfra()
      setData(r.data)
      setLastUpd(new Date().toLocaleTimeString('tr-TR'))
    } catch {
      setError('Sunucu bilgisi alınamadı. Jenkins bağlantısını kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  const allNodes    = data ? [data.masterNode, ...data.nodes] : []
  const onlineCount = allNodes.filter(n => n.online).length

  const summaryCards = data ? [
    { icon: <Desktop size={14} weight="duotone" />,  label: 'Toplam Node',    val: allNodes.length,    color: 'var(--teal)' },
    { icon: <WifiHigh size={14} weight="fill" />,    label: 'Çevrimiçi',      val: onlineCount,        color: 'var(--g)'    },
    { icon: <Lightning size={14} weight="fill" />,   label: 'Aktif Executor', val: data.busyExecutors, color: 'var(--b)'    },
    { icon: <GitBranch size={14} weight="duotone" />,label: 'Kuyruk',         val: data.queueLength,   color: data.queueLength > 5 ? 'var(--r)' : data.queueLength > 0 ? 'var(--y)' : 'var(--mt)' },
    { icon: <CheckCircle size={14} weight="fill" />, label: 'Jenkins',        val: data.jenkinsVersion, color: 'var(--mt)'  },
  ] : []

  return (
    <div className="page-wrap">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Desktop size={22} weight="duotone" color="var(--teal)" />
        <div className="page-title" style={{ margin: 0 }}>Altyapı Durumu</div>
      </div>
      <div className="page-sub">Jenkins master ve agent node'larının sistem metrikleri</div>

      {/* Summary */}
      {data && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {summaryCards.map(c => (
            <div key={c.label} style={{
              flex: '1 1 130px', background: 'var(--glass)',
              border: '1px solid var(--glass-bdr)', borderRadius: 10,
              padding: '14px 16px', backdropFilter: 'blur(16px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ color: c.color }}>{c.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                  {c.label}
                </span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color, lineHeight: 1, fontFamily: 'JetBrains Mono,monospace' }}>
                {c.val}
              </div>
            </div>
          ))}
          <button className="act-btn" style={{ alignSelf: 'center', width: 38, height: 38, flexShrink: 0 }} onClick={load} title="Yenile">
            <ArrowsClockwise size={15} weight="duotone" style={loading ? { animation: 'rot .7s linear infinite' } : {}} />
          </button>
        </div>
      )}

      {loading && !data && <PipelineLoaderInline message="fetching server metrics..." />}

      {/* Error */}
      {error && (
        <div style={{
          background: 'var(--rb)', border: '1px solid rgba(248,113,113,.25)',
          borderRadius: 10, padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        }}>
          <XCircle size={18} weight="fill" color="var(--r)" />
          <span style={{ fontSize: 13, color: 'var(--r)' }}>{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* Master */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Desktop size={12} weight="duotone" /> Jenkins Master
            </div>
            <NodeCard node={data.masterNode} master />
          </div>

          {/* Agents */}
          {data.nodes.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <HardDrive size={12} weight="duotone" /> Agent Node'lar ({data.nodes.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
                {data.nodes.map(n => <NodeCard key={n.name} node={n} />)}
              </div>
            </div>
          )}

          <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--mt)', marginTop: 14, fontFamily: 'JetBrains Mono,monospace' }}>
            Son güncelleme: {lastUpd} · 30sn'de bir yenilenir
          </div>
        </>
      )}
    </div>
  )
}
