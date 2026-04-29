import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bug, ShieldWarning, Wrench, ArrowsClockwise,
  File, Warning, Info, XCircle, CheckCircle,
  FunnelSimple, Code, Copy
} from '@phosphor-icons/react'
import axios from 'axios'
import SonarIssueModal from '../components/sonar/SonarIssueModal'

const API_BASE = import.meta.env.PROD ? 'http://194.99.74.2:8091' : ''

interface SonarProject { key: string; name: string }
interface SonarIssue   { key: string; message: string; severity: string; type: string; component: string; line: number }
interface SonarIssuesResult { total: number; issues: SonarIssue[] }
interface SonarMetrics {
  projectKey: string
  bugs: number
  vulnerabilities: number
  codeSmells: number
  coverage: number
  duplicatedLines: number
  linesOfCode: number
  qualityGate: string
  securityRating: string
  reliabilityRating: string
  maintainabilityRating: string
}

const SEV: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  BLOCKER:  { color:'#f87171', bg:'rgba(248,113,113,.1)', icon:<XCircle  size={13} weight="fill"    />, label:'Blocker'  },
  CRITICAL: { color:'#fb923c', bg:'rgba(251,146,60,.1)',  icon:<Warning  size={13} weight="fill"    />, label:'Critical' },
  MAJOR:    { color:'#fbbf24', bg:'rgba(251,191,36,.1)',  icon:<Warning  size={13} weight="duotone" />, label:'Major'    },
  MINOR:    { color:'#60a5fa', bg:'rgba(96,165,250,.1)',  icon:<Info     size={13} weight="duotone" />, label:'Minor'    },
  INFO:     { color:'#94a3b8', bg:'rgba(148,163,184,.1)', icon:<Info     size={13} weight="duotone" />, label:'Info'     },
}
const TYP: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  BUG:           { color:'#f87171', icon:<Bug          size={12} weight="fill"    />, label:'Bug'          },
  VULNERABILITY: { color:'#fb923c', icon:<ShieldWarning size={12} weight="fill"  />, label:'Vulnerability' },
  CODE_SMELL:    { color:'#fbbf24', icon:<Wrench       size={12} weight="duotone" />, label:'Code Smell'   },
}

const RATING_LABEL: Record<string,string> = { '1':'A','2':'B','3':'C','4':'D','5':'E' }
const RATING_COLOR: Record<string,string>  = { '1':'#4ade80','2':'#86efac','3':'#fbbf24','4':'#fb923c','5':'#f87171' }

function RatingBadge({ rating }: { rating: string }) {
  const label = RATING_LABEL[rating] ?? rating
  const color = RATING_COLOR[rating] ?? '#94a3b8'
  return (
    <div style={{ width:24, height:24, borderRadius:5, display:'grid', placeItems:'center', background:`${color}20`, border:`1px solid ${color}40`, fontSize:11, fontWeight:800, color, fontFamily:'JetBrains Mono,monospace' }}>
      {label}
    </div>
  )
}

function sev(s: string) { return SEV[s] ?? SEV['INFO'] }
function typ(t: string) { return TYP[t] ?? TYP['CODE_SMELL'] }
function shortFile(c: string) { return c.split(':').pop() ?? c }

export default function SonarQubePage() {
  const [searchParams] = useSearchParams()
  const initProject  = searchParams.get('project') ?? ''
  const initFile     = searchParams.get('file')    ?? ''

  const [projects,   setProjects]   = useState<SonarProject[]>([])
  const [selected,   setSelected]   = useState(initProject)
  const [fileFilter, setFileFilter] = useState(initFile)
  const [metrics,    setMetrics]    = useState<SonarMetrics | null>(null)
  const [issues,     setIssues]     = useState<SonarIssue[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [loading,    setLoading]    = useState(false)
  const [loadingP,   setLoadingP]   = useState(true)
  const [severity,   setSeverity]   = useState('ALL')
  const [type,       setType]       = useState('ALL')
  const [modalIssue, setModalIssue] = useState<SonarIssue | null>(null)
  useEffect(() => {
    axios.get(`${API_BASE}/api/sonar/projects`)
      .then(r => {
        setProjects(r.data)
        if (initProject) {
          // URL'den gelen projeyi seç
          const found = r.data.find((p: SonarProject) => p.key === initProject)
          setSelected(found ? initProject : r.data[0]?.key ?? '')
        } else if (r.data.length > 0) {
          setSelected(r.data[0].key)
        }
      })
      .finally(() => setLoadingP(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    loadIssues(1)
    axios.get(`${API_BASE}/api/sonar/metrics?project=${encodeURIComponent(selected)}`)
      .then(r => setMetrics(r.data)).catch(() => setMetrics(null))
  }, [selected])

  useEffect(() => { if (selected) loadIssues(1) }, [severity, type, fileFilter])

  async function loadIssues(p: number) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ project: selected, page: String(p) })
      if (severity !== 'ALL') params.append('severity', severity)
      if (type !== 'ALL')     params.append('type', type)
      if (fileFilter)         params.append('componentKeys', fileFilter)
      const { data } = await axios.get<SonarIssuesResult>(`${API_BASE}/api/sonar/issues?${params}`)
      setIssues(data.issues ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } finally { setLoading(false) }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="page-wrap">
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
        <ShieldWarning size={22} weight="duotone" color="var(--teal)" />
        <div className="page-title" style={{ margin:0 }}>SonarQube</div>
      </div>
      <div className="page-sub">Kod kalitesi issues ve güvenlik bulguları</div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16, alignItems:'start' }}>

        {/* Sol — proje listesi */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div className="card">
            <div className="ch">
              <div className="ct">Projeler</div>
              <span style={{ fontSize:11, color:'var(--mt)', fontFamily:'JetBrains Mono,monospace' }}>{projects.length}</span>
            </div>
            <div style={{ padding:6 }}>
              {loadingP
                ? <div className="empty-state" style={{ padding:16 }}>Yükleniyor...</div>
                : projects.map(p => (
                  <button key={p.key} onClick={() => setSelected(p.key)} style={{
                    width:'100%', padding:'8px 12px', borderRadius:7, border:'none',
                    background: selected===p.key ? 'var(--teal-dim)' : 'transparent',
                    color: selected===p.key ? 'var(--teal)' : 'var(--tx2)',
                    fontSize:12, fontWeight:600, textAlign:'left', cursor:'pointer',
                    borderLeft: selected===p.key ? '3px solid var(--teal)' : '3px solid transparent',
                    transition:'all .15s',
                  }}>
                    {p.name}
                  </button>
                ))}
            </div>
          </div>

          {/* Metrikler */}
          {metrics && (
            <div className="card">
              <div className="ch"><div className="ct">Özet</div></div>
              <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>

                {/* Ana metrikler */}
                {([
                  { label:'Bugs',            val:metrics.bugs,                              color:'var(--r)', icon:<Bug          size={12} weight="fill"    /> },
                  { label:'Vulnerabilities', val:metrics.vulnerabilities,                   color:'#fb923c',  icon:<ShieldWarning size={12} weight="fill"   /> },
                  { label:'Code Smells',     val:metrics.codeSmells,                        color:'var(--y)', icon:<Wrench        size={12} weight="duotone"/> },
                  { label:'Coverage',        val:`${metrics.coverage.toFixed(1)}%`,         color:'var(--g)', icon:<CheckCircle   size={12} weight="fill"   /> },
                  { label:'Duplications',    val:`${metrics.duplicatedLines.toFixed(1)}%`,  color: metrics.duplicatedLines > 10 ? 'var(--y)' : 'var(--mt)', icon:<Copy size={12} weight="duotone"/> },
                  { label:'Lines of Code',   val:metrics.linesOfCode.toLocaleString(),      color:'var(--mt)',icon:<Code          size={12} weight="duotone"/> },
                ] as const).map(m => (
                  <div key={m.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:m.color }}>{m.icon}</span>
                    <span style={{ fontSize:11, color:'var(--mt)', flex:1 }}>{m.label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:m.color, fontFamily:'JetBrains Mono,monospace' }}>{m.val}</span>
                  </div>
                ))}

                {/* Rating'ler */}
                <div style={{ borderTop:'1px solid var(--glass-bdr)', paddingTop:10, display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { label:'Security',        rating: metrics.securityRating        },
                    { label:'Reliability',     rating: metrics.reliabilityRating     },
                    { label:'Maintainability', rating: metrics.maintainabilityRating },
                  ].map(r => (
                    <div key={r.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:'var(--mt)', flex:1 }}>{r.label}</span>
                      <RatingBadge rating={r.rating} />
                    </div>
                  ))}
                </div>

                {/* Quality Gate */}
                <div style={{ borderTop:'1px solid var(--glass-bdr)', paddingTop:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:11, color:'var(--mt)' }}>Quality Gate</span>
                  <span style={{ fontSize:11, fontWeight:700, color:metrics.qualityGate==='OK'?'var(--g)':'var(--r)' }}>
                    {metrics.qualityGate==='OK' ? '✅ Passed' : '❌ Failed'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sağ — issues */}
        <div className="card">
          <div className="ch" style={{ flexWrap:'wrap', gap:8 }}>
            <div className="ct" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <FunnelSimple size={13} weight="duotone" color="var(--teal)" />
              Issues ({total})
              {fileFilter && (
                <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:'rgba(251,191,36,.12)', color:'var(--y)' }}>
                  <File size={9} weight="duotone" />
                  {fileFilter.split(':').pop()}
                  <span onClick={() => { setFileFilter(''); loadIssues(1) }} style={{ cursor:'pointer', opacity:.6, marginLeft:2 }}>✕</span>
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <select className="sel" value={severity} onChange={e => setSeverity(e.target.value)}>
                <option value="ALL">Tüm Önem</option>
                <option value="BLOCKER">Blocker</option>
                <option value="CRITICAL">Critical</option>
                <option value="MAJOR">Major</option>
                <option value="MINOR">Minor</option>
                <option value="INFO">Info</option>
              </select>
              <select className="sel" value={type} onChange={e => setType(e.target.value)}>
                <option value="ALL">Tüm Tip</option>
                <option value="BUG">Bug</option>
                <option value="VULNERABILITY">Vulnerability</option>
                <option value="CODE_SMELL">Code Smell</option>
              </select>
              <button className="fbtn" onClick={() => loadIssues(page)}>
                <ArrowsClockwise size={12} weight="bold" style={{ animation:loading?'rot .7s linear infinite':'none' }} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Yükleniyor...</div>
          ) : issues.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={32} weight="duotone" style={{ opacity:.4, marginBottom:8, color:'var(--g)' }} />
              Issue bulunamadı.
            </div>
          ) : (
            <>
              {issues.map(issue => {
                const s = sev(issue.severity)
                const t = typ(issue.type)
                const f = shortFile(issue.component)
                return (
                  <div key={issue.key} onClick={() => setModalIssue(issue)}
                    style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--glass-bdr)', cursor:'pointer', transition:'background .1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background='rgba(45,212,191,.04)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background='transparent' }}>
                    <span style={{ color:s.color, flexShrink:0, marginTop:2 }}>{s.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:'var(--tx)', marginBottom:5, lineHeight:1.4 }}>{issue.message}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:`${t.color}15`, color:t.color }}>
                          {t.icon} {t.label}
                        </span>
                        <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:4, background:s.bg, color:s.color }}>
                          {s.label}
                        </span>
                        <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--mt)', fontFamily:'JetBrains Mono,monospace' }}>
                          <File size={10} weight="duotone" />
                          {f}{issue.line > 0 ? `:${issue.line}` : ''}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize:10, color:'rgba(45,212,191,.4)', flexShrink:0, marginTop:2 }}>Kodu gör →</span>
                  </div>
                )
              })}

              {totalPages > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 16px', borderTop:'1px solid var(--glass-bdr)' }}>
                  <button className="fbtn" disabled={page<=1} onClick={() => loadIssues(page-1)}>← Önceki</button>
                  <span style={{ fontSize:12, color:'var(--mt)' }}>{page} / {totalPages}</span>
                  <button className="fbtn" disabled={page>=totalPages} onClick={() => loadIssues(page+1)}>Sonraki →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalIssue && (
        <SonarIssueModal
          issue={modalIssue}
          projectKey={selected}
          onClose={() => setModalIssue(null)}
        />
      )}
    </div>
  )
}
