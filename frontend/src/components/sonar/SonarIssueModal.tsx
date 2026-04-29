import { useEffect, useState } from 'react'
import { X, File, Warning, Bug, ShieldWarning, Wrench, ArrowSquareOut } from '@phosphor-icons/react'
import axios from 'axios'

const API_BASE = import.meta.env.PROD ? 'http://194.99.74.2:8091' : ''
const SONAR_URL = 'http://194.99.74.2:9000'

interface SonarIssue {
  key: string
  message: string
  severity: string
  type: string
  component: string
  line: number
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  BUG:           <Bug size={14} weight="fill" color="#f87171" />,
  VULNERABILITY: <ShieldWarning size={14} weight="fill" color="#fb923c" />,
  CODE_SMELL:    <Wrench size={14} weight="duotone" color="#fbbf24" />,
}

const SEV_COLOR: Record<string, string> = {
  BLOCKER: '#f87171', CRITICAL: '#fb923c', MAJOR: '#fbbf24', MINOR: '#60a5fa', INFO: '#94a3b8',
}

interface SourceLine { line: number; html: string }

interface Props {
  issue: SonarIssue
  projectKey: string
  onClose: () => void
}

export default function SonarIssueModal({ issue, projectKey, onClose }: Props) {
  const [lines,   setLines]   = useState<SourceLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const hLine = issue.line
  const from  = Math.max(1, hLine - 8)
  const to    = hLine + 8

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!issue.component) { setLoading(false); return }

    axios.get(`${API_BASE}/api/sonar/source`, {
      params: { component: issue.component, from, to }
    })
    .then(r => {
      const src = r.data?.sources ?? []
      setLines(src.map(([ln, html]: [number, string]) => ({ line: ln, html })))
    })
    .catch(() => setError('Kaynak kodu yüklenemedi.'))
    .finally(() => setLoading(false))
  }, [])

  const fileName = issue.component.split(':').pop() ?? issue.component
  const sevColor = SEV_COLOR[issue.severity] ?? '#94a3b8'

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:800, background:'rgba(0,0,0,.75)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width:'min(860px,96vw)', maxHeight:'88vh', background:'rgba(8,14,24,.98)', border:'1px solid rgba(45,212,191,.15)', borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 32px 100px rgba(0,0,0,.8)' }}
      >
        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.07)', background:'rgba(45,212,191,.03)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                {TYPE_ICON[issue.type] ?? TYPE_ICON['CODE_SMELL']}
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4, background:`${sevColor}15`, color:sevColor }}>
                  {issue.severity}
                </span>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{issue.type.replace('_',' ')}</span>
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:'#e2f0ef', lineHeight:1.4 }}>{issue.message}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, fontSize:11, color:'rgba(255,255,255,.35)', fontFamily:'JetBrains Mono,monospace' }}>
                <File size={11} weight="duotone" />
                {fileName}{hLine > 0 ? ` · satır ${hLine}` : ''}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <a
                href={`${SONAR_URL}/project/issues?id=${projectKey}&open=${issue.key}`}
                target="_blank"
                rel="noreferrer"
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, border:'1px solid rgba(45,212,191,.25)', background:'rgba(45,212,191,.08)', color:'var(--teal)', fontSize:11, fontWeight:600, textDecoration:'none' }}
              >
                <ArrowSquareOut size={12} /> SonarQube
              </a>
              <button onClick={onClose} style={{ width:28, height:28, borderRadius:7, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', cursor:'pointer', display:'grid', placeItems:'center', color:'rgba(255,255,255,.4)' }}>
                <X size={13} weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {/* Code viewer */}
        <div style={{ flex:1, overflow:'auto', background:'#020a10' }}>
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, color:'rgba(255,255,255,.3)', fontSize:13 }}>
              Kaynak kodu yükleniyor...
            </div>
          ) : error ? (
            <div style={{ textAlign:'center', padding:60, color:'#f87171', fontSize:13 }}>{error}</div>
          ) : lines.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,.3)', fontSize:13 }}>Kaynak kodu bulunamadı.</div>
          ) : (
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12.5, lineHeight:1.8 }}>
              {/* SonarQube CSS */}
              <style>{`
                .sonar-code .k  { color: #c678dd }
                .sonar-code .s  { color: #98c379 }
                .sonar-code .cd { color: #5c6370; font-style: italic }
                .sonar-code .sym { color: #abb2bf }
                .sonar-code .a  { color: #e5c07b }
                .sonar-code .c  { color: #56b6c2 }
              `}</style>
              <div className="sonar-code">
                {lines.map(({ line, html }) => {
                  const isHot = line === hLine
                  return (
                    <div
                      key={line}
                      style={{
                        display:'flex',
                        background: isHot ? 'rgba(248,113,113,.12)' : 'transparent',
                        borderLeft: isHot ? '3px solid #f87171' : '3px solid transparent',
                        position:'relative',
                      }}
                    >
                      {/* Satır numarası */}
                      <div style={{ width:48, flexShrink:0, textAlign:'right', paddingRight:16, color: isHot ? '#f87171' : 'rgba(255,255,255,.2)', userSelect:'none', fontWeight: isHot ? 700 : 400 }}>
                        {line}
                      </div>

                      {/* Kod */}
                      <div
                        style={{ flex:1, paddingRight:24, color:'#abb2bf', whiteSpace:'pre' }}
                        dangerouslySetInnerHTML={{ __html: html }}
                      />

                      {/* Issue marker */}
                      {isHot && (
                        <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', display:'flex', alignItems:'center', gap:4 }}>
                          <Warning size={12} weight="fill" color="#f87171" />
                          <span style={{ fontSize:10, color:'#f87171', fontWeight:700 }}>issue</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'8px 20px', borderTop:'1px solid rgba(255,255,255,.05)', fontSize:10, color:'rgba(255,255,255,.2)', display:'flex', justifyContent:'space-between', fontFamily:'JetBrains Mono,monospace', flexShrink:0 }}>
          <span>{issue.component}</span>
          <span>ESC · kapat</span>
        </div>
      </div>
    </div>
  )
}
