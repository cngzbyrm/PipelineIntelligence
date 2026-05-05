import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Bug, ShieldWarning, Wrench, ArrowsClockwise,
    File, Warning, Info, XCircle, CheckCircle, FunnelSimple, Code, Copy
} from '@phosphor-icons/react'
import axios from 'axios'
import SonarIssueModal from '../components/sonar/SonarIssueModal'
import Select from '../components/ui/Select'
import PageHeader from '../components/layout/PageHeader'

const API_BASE = import.meta.env.PROD ? 'http://194.99.74.2:8091' : ''

interface SonarProject { key: string; name: string }
interface SonarIssue { key: string; message: string; severity: string; type: string; component: string; line: number }
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
    securityReviewRating: string
    reliabilityRating: string
    maintainabilityRating: string
}

const SEV: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    BLOCKER: { color: '#f87171', bg: 'rgba(248,113,113,.1)', icon: <XCircle size={13} weight="fill" />, label: 'Blocker' },
    CRITICAL: { color: '#fb923c', bg: 'rgba(251,146,60,.1)', icon: <Warning size={13} weight="fill" />, label: 'Critical' },
    MAJOR: { color: '#fbbf24', bg: 'rgba(251,191,36,.1)', icon: <Warning size={13} weight="duotone" />, label: 'Major' },
    MINOR: { color: '#60a5fa', bg: 'rgba(96,165,250,.1)', icon: <Info size={13} weight="duotone" />, label: 'Minor' },
    INFO: { color: '#94a3b8', bg: 'rgba(148,163,184,.1)', icon: <Info size={13} weight="duotone" />, label: 'Info' },
}
const TYP: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    BUG: { color: '#f87171', icon: <Bug size={12} weight="fill" />, label: 'Bug' },
    VULNERABILITY: { color: '#fb923c', icon: <ShieldWarning size={12} weight="fill" />, label: 'Vulnerability' },
    CODE_SMELL: { color: '#fbbf24', icon: <Wrench size={12} weight="duotone" />, label: 'Code Smell' },
}

const RATING_LABEL: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' }
const RATING_COLOR: Record<string, string> = { '1': '#4ade80', '2': '#86efac', '3': '#fbbf24', '4': '#fb923c', '5': '#f87171' }

function normalizeRating(r: string) { return (r ?? '').split('.')[0] }

function RatingBadge({ rating }: { rating: string }) {
    const key = normalizeRating(rating)
    const label = RATING_LABEL[key] ?? key
    const color = RATING_COLOR[key] ?? '#94a3b8'
    return (
        <div style={{ width: 24, height: 24, borderRadius: 5, display: 'grid', placeItems: 'center', background: `${color}20`, border: `1px solid ${color}40`, fontSize: 11, fontWeight: 800, color, fontFamily: 'JetBrains Mono,monospace' }}>
            {label}
        </div>
    )
}

function sev(s: string) { return SEV[s] ?? SEV['INFO'] }
function typ(t: string) { return TYP[t] ?? TYP['CODE_SMELL'] }
function shortFile(c: string) { return c.split(':').pop() ?? c }

const ratingColor = (r: string) => ({ A: '#16A34A', B: '#65A30D', C: '#CA8A04', D: '#EA580C', E: '#DC2626' } as Record<string, string>)[r] ?? '#94A3B8'
const ratingBg = (r: string) => ({ A: 'rgba(22,163,74,.12)', B: 'rgba(101,163,13,.12)', C: 'rgba(202,138,4,.12)', D: 'rgba(234,88,12,.12)', E: 'rgba(220,38,38,.12)' } as Record<string, string>)[r] ?? 'transparent'
const toGrade = (r: string) => { const k = (r ?? '').split('.')[0]; return ({ 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' } as Record<string, string>)[k] ?? r }

function FileIssues({ projectKey, fileKey, allHotspots, onIssueClick }: { projectKey: string; fileKey: string; allHotspots: any[]; onIssueClick: (i: any) => void }) {
    const [issues, setIssues] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'issues' | 'hotspots'>('issues')

    // Hotspot'ları dosyaya göre filtrele
    const hotspots = allHotspots.filter(h => h.component === fileKey)

    useEffect(() => {
        setLoading(true)
        setIssues([])
        axios.get(`${API_BASE}/api/sonar/issues?project=${encodeURIComponent(projectKey)}&componentKeys=${encodeURIComponent(fileKey)}&page=1`)
            .then(r => setIssues(r.data.issues ?? []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [fileKey])

    if (loading) return <div style={{ padding: 20, fontSize: 12, color: 'var(--mt)', textAlign: 'center' }}>Yükleniyor...</div>

    const list = tab === 'issues' ? issues : hotspots

    return (
        <div>
            {/* Tab */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-bdr)' }}>
                {([['issues', '🔍 Issues', issues.length], ['hotspots', '🔥 Hotspots', hotspots.length]] as const).map(([t, label, count]) => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700, border: 'none',
                        background: 'none', cursor: 'pointer',
                        color: tab === t ? 'var(--teal)' : 'var(--mt)',
                        borderBottom: tab === t ? '2px solid var(--teal)' : '2px solid transparent',
                    }}>
                        {label} <span style={{ fontSize: 10, background: 'var(--glass2)', padding: '1px 5px', borderRadius: 8 }}>{count}</span>
                    </button>
                ))}
            </div>

            {list.length === 0 ? (
                <div style={{ padding: 20, fontSize: 12, color: 'var(--mt)', textAlign: 'center' }}>
                    {tab === 'issues' ? 'Bu dosyada issue yok' : 'Bu dosyada hotspot yok'}
                </div>
            ) : (
                list.map((issue: any, i: number) => {
                    const isHotspot = tab === 'hotspots'
                    const sevColor = isHotspot
                        ? ({ HIGH: '#DC2626', MEDIUM: '#EA580C', LOW: '#CA8A04' } as any)[issue.severity] ?? '#64748B'
                        : ({ BLOCKER: '#DC2626', CRITICAL: '#EA580C', MAJOR: '#CA8A04', MINOR: '#2563EB', INFO: '#64748B' } as any)[issue.severity] ?? '#64748B'

                    return (
                        <div key={issue.key ?? i}
                            onClick={() => onIssueClick(issue)}
                            style={{
                                padding: '8px 14px', borderBottom: '1px solid var(--glass-bdr)',
                                cursor: 'pointer', transition: 'background .1s',
                                background: i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent')}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ fontSize: 9, fontWeight: 700, color: sevColor, background: `${sevColor}18`, padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 1 }}>
                                    {isHotspot ? (issue.severity ?? 'MEDIUM') : issue.severity}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 11, color: 'var(--tx)', lineHeight: 1.4 }}>{issue.message}</div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                                        {issue.line > 0 && <span style={{ fontSize: 9, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace' }}>Satır {issue.line}</span>}
                                        {isHotspot && <span style={{ fontSize: 9, color: '#EA580C' }}>🔥 Hotspot</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}

export default function SonarQubePage() {
    const [searchParams] = useSearchParams()
    const initProject = searchParams.get('project') ?? ''
    const initFile = searchParams.get('file') ?? ''
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const [leftOpen, setLeftOpen] = useState(false)

    useEffect(() => {
        const fn = () => setIsMobile(window.innerWidth <= 768)
        window.addEventListener('resize', fn)
        return () => window.removeEventListener('resize', fn)
    }, [])

    const [projects, setProjects] = useState<SonarProject[]>([])
    const [selected, setSelected] = useState(initProject)
    const [fileFilter, setFileFilter] = useState(initFile)
    const [metrics, setMetrics] = useState<SonarMetrics | null>(null)
    const [issues, setIssues] = useState<SonarIssue[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [loadingP, setLoadingP] = useState(true)
    const [severity, setSeverity] = useState('ALL')
    const [type, setType] = useState('ALL')
    const [modalIssue, setModalIssue] = useState<SonarIssue | null>(null)
    const [activeTab, setActiveTab] = useState<'issues' | 'code'>('issues')
    const [fileMetrics, setFileMetrics] = useState<any[]>([])
    const [allHotspots, setAllHotspots] = useState<any[]>([])
    const [loadingFM, setLoadingFM] = useState(false)
    const [fmSearch, setFmSearch] = useState('')
    const [fmExtFilter, setFmExtFilter] = useState('ALL')
    const [fmSecFilter, setFmSecFilter] = useState('ALL')
    const [fmRelFilter, setFmRelFilter] = useState('ALL')
    const [fmMntFilter, setFmMntFilter] = useState('ALL')
    const [selectedFile, setSelectedFile] = useState<any>(null)

    const applyFmFilters = useCallback((f: any) => {
        if (fmSearch && !f.path?.toLowerCase().includes(fmSearch.toLowerCase())) return false
        if (fmExtFilter !== 'ALL') {
            const ext = f.path?.split('.').pop()?.toLowerCase()
            if (ext !== fmExtFilter) return false
        }
        if (fmSecFilter !== 'ALL' && (f.securityGrade ?? toGrade(f.securityRating ?? '')) !== fmSecFilter) return false
        if (fmRelFilter !== 'ALL' && (f.reliabilityGrade ?? toGrade(f.reliabilityRating ?? '')) !== fmRelFilter) return false
        if (fmMntFilter !== 'ALL' && (f.maintainabilityGrade ?? toGrade(f.maintainabilityRating ?? '')) !== fmMntFilter) return false
        return true
    }, [fmSearch, fmExtFilter, fmSecFilter, fmRelFilter, fmMntFilter])
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
        setFileMetrics([])
        setAllHotspots([])  // proje değişince hotspot cache temizle
        setActiveTab('issues')  // issues tab'a dön
        axios.get(`${API_BASE}/api/sonar/metrics?project=${encodeURIComponent(selected)}`)
            .then(r => setMetrics(r.data)).catch(() => setMetrics(null))
    }, [selected])

    useEffect(() => { if (selected) loadIssues(1) }, [severity, type, fileFilter])

    useEffect(() => {
        if (selected && activeTab === 'code' && fileMetrics.length === 0) {
            setLoadingFM(true)
            Promise.all([
                axios.get(`${API_BASE}/api/sonar/file-metrics?project=${encodeURIComponent(selected)}`)
                    .then(r => setFileMetrics(r.data)),
                axios.get(`${API_BASE}/api/sonar/hotspots?project=${encodeURIComponent(selected)}&page=1`)
                    .then(r => setAllHotspots(r.data.issues ?? [])),
            ]).catch(() => { }).finally(() => setLoadingFM(false))
        }
    }, [selected, activeTab])

    async function loadIssues(p: number) {
        setLoading(true)
        try {
            const params = new URLSearchParams({ project: selected, page: String(p) })
            if (severity !== 'ALL') params.append('severity', severity)
            if (type !== 'ALL') params.append('type', type)
            if (fileFilter) params.append('componentKeys', fileFilter)
            const { data } = await axios.get<SonarIssuesResult>(`${API_BASE}/api/sonar/issues?${params}`)
            setIssues(data.issues ?? [])
            setTotal(data.total ?? 0)
            setPage(p)
        } finally { setLoading(false) }
    }

    const totalPages = Math.ceil(total / 20)

    return (
        <div className="page-wrap">
            <PageHeader
                icon={<ShieldWarning size={22} weight="duotone" />}
                kicker="Kalite kapısı"
                title="SonarQube"
                subtitle="Kod kalitesi issues ve güvenlik bulguları"
                actions={selected ? (
                    <>
                        <a
                            href={`${API_BASE}/api/sonar/report/excel?project=${encodeURIComponent(selected)}`}
                            download
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                background: 'rgba(22,163,74,.12)', border: '1px solid rgba(22,163,74,.3)',
                                color: '#4ade80', textDecoration: 'none', transition: 'all .15s',
                            }}
                        >
                            ⬇ Excel
                        </a>
                        <a
                            href={`${API_BASE}/api/sonar/report/pdf?project=${encodeURIComponent(selected)}`}
                            download
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)',
                                color: '#f87171', textDecoration: 'none', transition: 'all .15s',
                            }}
                        >
                            ⬇ PDF
                        </a>
                    </>
                ) : undefined}
            />

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: 16, alignItems: 'start' }}>

                {/* Sol — proje listesi + özet */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Mobilde accordion başlık */}
                    {isMobile && (
                        <button
                            onClick={() => setLeftOpen(o => !o)}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 10,
                                border: '1px solid var(--glass-bdr)', background: 'var(--glass)',
                                color: 'var(--tx)', fontSize: 13, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer',
                            }}
                        >
                            <span>📋 {projects.find(p => p.key === selected)?.name ?? 'Proje Seç'}</span>
                            <span style={{ fontSize: 10, color: 'var(--mt)', transition: 'transform .2s', display: 'inline-block', transform: leftOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                        </button>
                    )}

                    {/* Panel içeriği — mobilde toggle */}
                    {(!isMobile || leftOpen) && (
                        <>
                            <div className="card">
                                <div className="ch">
                                    <div className="ct">Projeler</div>
                                    <span style={{ fontSize: 11, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace' }}>{projects.length}</span>
                                </div>
                                <div style={{ padding: 6 }}>
                                    {loadingP
                                        ? <div className="empty-state" style={{ padding: 16 }}>Yükleniyor...</div>
                                        : projects.map(p => (
                                            <button key={p.key} onClick={() => { setSelected(p.key); if (isMobile) setLeftOpen(false) }} style={{
                                                width: '100%', padding: '8px 12px', borderRadius: 7, border: 'none',
                                                background: selected === p.key ? 'var(--teal-dim)' : 'transparent',
                                                color: selected === p.key ? 'var(--teal)' : 'var(--tx2)',
                                                fontSize: 12, fontWeight: 600, textAlign: 'left', cursor: 'pointer',
                                                borderLeft: selected === p.key ? '3px solid var(--teal)' : '3px solid transparent',
                                                transition: 'all .15s',
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
                                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {([
                                            { label: 'Bugs', val: metrics.bugs, color: 'var(--r)', icon: <Bug size={12} weight="fill" /> },
                                            { label: 'Vulnerabilities', val: metrics.vulnerabilities, color: '#fb923c', icon: <ShieldWarning size={12} weight="fill" /> },
                                            { label: 'Code Smells', val: metrics.codeSmells, color: 'var(--y)', icon: <Wrench size={12} weight="duotone" /> },
                                            { label: 'Coverage', val: `${metrics.coverage.toFixed(1)}%`, color: 'var(--g)', icon: <CheckCircle size={12} weight="fill" /> },
                                            { label: 'Duplications', val: `${metrics.duplicatedLines.toFixed(1)}%`, color: metrics.duplicatedLines > 10 ? 'var(--y)' : 'var(--mt)', icon: <Copy size={12} weight="duotone" /> },
                                            { label: 'Lines of Code', val: metrics.linesOfCode.toLocaleString(), color: 'var(--mt)', icon: <Code size={12} weight="duotone" /> },
                                        ] as const).map(m => (
                                            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ color: m.color }}>{m.icon}</span>
                                                <span style={{ fontSize: 11, color: 'var(--mt)', flex: 1 }}>{m.label}</span>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: m.color, fontFamily: 'JetBrains Mono,monospace' }}>{m.val}</span>
                                            </div>
                                        ))}
                                        <div style={{ borderTop: '1px solid var(--glass-bdr)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {[
                                                { label: 'Security (Vuln.)', rating: metrics.securityRating },
                                                { label: 'Security (Hotspot)', rating: metrics.securityReviewRating },
                                                { label: 'Reliability', rating: metrics.reliabilityRating },
                                                { label: 'Maintainability', rating: metrics.maintainabilityRating },
                                            ].map(r => (
                                                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: 11, color: 'var(--mt)', flex: 1 }}>{r.label}</span>
                                                    <RatingBadge rating={r.rating} />
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ borderTop: '1px solid var(--glass-bdr)', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 11, color: 'var(--mt)' }}>Quality Gate</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: metrics.qualityGate === 'OK' ? 'var(--g)' : 'var(--r)' }}>
                                                {metrics.qualityGate === 'OK' ? '✅ Passed' : '❌ Failed'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Sağ — tabs */}
                <div className="card">
                    {/* Tab header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid var(--glass-bdr)', padding: '0 16px' }}>
                        {([['issues', 'Issues', '🔍'], ['code', 'Kod Analizi', '📄']] as const).map(([tab, label, icon]) => (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                padding: '10px 16px', fontSize: 12, fontWeight: 700, border: 'none', background: 'none',
                                cursor: 'pointer', color: activeTab === tab ? 'var(--teal)' : 'var(--mt)',
                                borderBottom: activeTab === tab ? '2px solid var(--teal)' : '2px solid transparent',
                                transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5,
                            }}>
                                {icon} {label}
                                {tab === 'issues' && <span style={{ fontSize: 10, background: 'var(--teal-dim)', color: 'var(--teal)', padding: '1px 6px', borderRadius: 10 }}>{total}</span>}
                                {tab === 'code' && fileMetrics.length > 0 && <span style={{ fontSize: 10, background: 'var(--glass2)', color: 'var(--mt)', padding: '1px 6px', borderRadius: 10 }}>{fileMetrics.length}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Issues tab */}
                    {activeTab === 'issues' && (
                        <>
                            <div className="ch" style={{ flexWrap: 'wrap', gap: 8 }}>
                                <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <FunnelSimple size={13} weight="duotone" color="var(--teal)" />
                                    Issues ({total})
                                    {fileFilter && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(251,191,36,.12)', color: 'var(--y)' }}>
                                            <File size={9} weight="duotone" />
                                            {fileFilter.split(':').pop()}
                                            <span onClick={() => { setFileFilter(''); loadIssues(1) }} style={{ cursor: 'pointer', opacity: .6, marginLeft: 2 }}>✕</span>
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <Select value={severity} onChange={setSeverity} options={[
                                        { value: 'ALL', label: 'Tüm Önem' },
                                        { value: 'BLOCKER', label: 'Blocker' },
                                        { value: 'CRITICAL', label: 'Critical' },
                                        { value: 'MAJOR', label: 'Major' },
                                        { value: 'MINOR', label: 'Minor' },
                                        { value: 'INFO', label: 'Info' },
                                    ]} />
                                    <Select value={type} onChange={setType} options={[
                                        { value: 'ALL', label: 'Tüm Tip' },
                                        { value: 'BUG', label: 'Bug' },
                                        { value: 'VULNERABILITY', label: 'Vulnerability' },
                                        { value: 'CODE_SMELL', label: 'Code Smell' },
                                    ]} />
                                    <button className="fbtn" onClick={() => loadIssues(page)}>
                                        <ArrowsClockwise size={12} weight="bold" style={{ animation: loading ? 'rot .7s linear infinite' : 'none' }} />
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="empty-state">Yükleniyor...</div>
                            ) : issues.length === 0 ? (
                                <div className="empty-state">
                                    <CheckCircle size={32} weight="duotone" style={{ opacity: .4, marginBottom: 8, color: 'var(--g)' }} />
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
                                                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--glass-bdr)', cursor: 'pointer', transition: 'background .1s' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(45,212,191,.04)' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
                                                <span style={{ color: s.color, flexShrink: 0, marginTop: 2 }}>{s.icon}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 13, color: 'var(--tx)', marginBottom: 5, lineHeight: 1.4 }}>{issue.message}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${t.color}15`, color: t.color }}>
                                                            {t.icon} {t.label}
                                                        </span>
                                                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: s.bg, color: s.color }}>
                                                            {s.label}
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace' }}>
                                                            <File size={10} weight="duotone" />
                                                            {f}{issue.line > 0 ? `:${issue.line}` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: 10, color: 'rgba(45,212,191,.4)', flexShrink: 0, marginTop: 2 }}>Kodu gör →</span>
                                            </div>
                                        )
                                    })}

                                    {totalPages > 1 && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--glass-bdr)' }}>
                                            <button className="fbtn" disabled={page <= 1} onClick={() => loadIssues(page - 1)}>← Önceki</button>
                                            <span style={{ fontSize: 12, color: 'var(--mt)' }}>{page} / {totalPages}</span>
                                            <button className="fbtn" disabled={page >= totalPages} onClick={() => loadIssues(page + 1)}>Sonraki →</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* Kod Analizi tab */}
                    {activeTab === 'code' && (
                        <>
                            {/* Rating açıklaması */}
                            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--glass-bdr)', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 10, color: 'var(--mt)' }}>Rating:</span>
                                {[['A', '#16A34A', 'En iyi'], ['B', '#65A30D', 'İyi'], ['C', '#CA8A04', 'Orta'], ['D', '#EA580C', 'Kötü'], ['E', '#DC2626', 'En kötü']].map(([g, c, l]) => (
                                    <span key={g} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontWeight: 800, color: c as string }}>{g}</span>
                                        <span style={{ color: 'var(--mt)' }}>{l}</span>
                                    </span>
                                ))}
                            </div>

                            {/* Filtreler */}
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--glass-bdr)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                {/* Dosya arama */}
                                <input
                                    className="srch"
                                    placeholder="Dosya ara..."
                                    value={fmSearch}
                                    onChange={e => setFmSearch(e.target.value)}
                                    style={{ width: 220 }}
                                />

                                {/* Dosya türü */}
                                <Select
                                    value={fmExtFilter}
                                    onChange={setFmExtFilter}
                                    options={[
                                        { value: 'ALL', label: 'Tüm Türler' },
                                        { value: 'cs', label: '.cs' },
                                        { value: 'js', label: '.js' },
                                        { value: 'cshtml', label: '.cshtml' },
                                    ]}
                                />

                                {/* Security filtre */}
                                <Select
                                    value={fmSecFilter}
                                    onChange={setFmSecFilter}
                                    options={[
                                        { value: 'ALL', label: 'Security: Tümü' },
                                        { value: 'A', label: 'Security: A' },
                                        { value: 'B', label: 'Security: B' },
                                        { value: 'C', label: 'Security: C' },
                                        { value: 'D', label: 'Security: D' },
                                        { value: 'E', label: 'Security: E' },
                                    ]}
                                />

                                {/* Reliability filtre */}
                                <Select
                                    value={fmRelFilter}
                                    onChange={setFmRelFilter}
                                    options={[
                                        { value: 'ALL', label: 'Reliability: Tümü' },
                                        { value: 'A', label: 'Reliability: A' },
                                        { value: 'B', label: 'Reliability: B' },
                                        { value: 'C', label: 'Reliability: C' },
                                        { value: 'D', label: 'Reliability: D' },
                                        { value: 'E', label: 'Reliability: E' },
                                    ]}
                                />

                                {/* Maintainability filtre */}
                                <Select
                                    value={fmMntFilter}
                                    onChange={setFmMntFilter}
                                    options={[
                                        { value: 'ALL', label: 'Maint.: Tümü' },
                                        { value: 'A', label: 'Maint.: A' },
                                        { value: 'B', label: 'Maint.: B' },
                                        { value: 'C', label: 'Maint.: C' },
                                        { value: 'D', label: 'Maint.: D' },
                                        { value: 'E', label: 'Maint.: E' },
                                    ]}
                                />

                                {/* Sıfırla */}
                                {(fmSearch || fmExtFilter !== 'ALL' || fmSecFilter !== 'ALL' || fmRelFilter !== 'ALL' || fmMntFilter !== 'ALL') && (
                                    <button className="fbtn" onClick={() => { setFmSearch(''); setFmExtFilter('ALL'); setFmSecFilter('ALL'); setFmRelFilter('ALL'); setFmMntFilter('ALL') }}>
                                        ✕ Sıfırla
                                    </button>
                                )}

                                <span style={{ fontSize: 11, color: 'var(--mt)', marginLeft: 'auto' }}>
                                    {fileMetrics.filter(applyFmFilters).length} / {fileMetrics.length} dosya
                                </span>
                            </div>

                            {loadingFM ? (
                                <div className="empty-state" style={{ padding: 40 }}>Yükleniyor...</div>
                            ) : fileMetrics.length === 0 ? (
                                <div className="empty-state" style={{ padding: 40 }}>Veri yok</div>
                            ) : (
                                <>
                                    {/* Tablo başlığı */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 80px 90px 110px 70px', gap: 0, padding: '6px 16px', borderBottom: '1px solid var(--glass-bdr)', background: 'var(--glass2)' }}>
                                        {['Dosya', 'Lines', 'Coverage', 'Duplications', 'Security', 'Reliability', 'Maintainability', 'Hotspot'].map(h => (
                                            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--mt)', textAlign: h === 'Dosya' ? 'left' : 'center' }}>{h}</div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: 0, maxHeight: 600 }}>
                                        {/* Dosya listesi */}
                                        <div style={{ flex: 1, overflowY: 'auto', borderRight: selectedFile ? '1px solid var(--glass-bdr)' : 'none' }}>
                                            {fileMetrics
                                                .filter(applyFmFilters)
                                                .map((f: any, i: number) => {
                                                    const fileName = f.path?.split('/').pop() ?? f.path
                                                    const isSelected = selectedFile?.key === f.key

                                                    return (
                                                        <div key={f.key ?? i}
                                                            onClick={() => setSelectedFile(isSelected ? null : f)}
                                                            style={{
                                                                display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 80px 90px 110px 70px',
                                                                gap: 0, padding: '6px 16px', borderBottom: '1px solid var(--glass-bdr)',
                                                                background: isSelected ? 'var(--teal-dim)' : i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent',
                                                                alignItems: 'center', cursor: 'pointer', transition: 'background .1s',
                                                                borderLeft: isSelected ? '3px solid var(--teal)' : '3px solid transparent',
                                                            }}>
                                                            <div style={{ overflow: 'hidden' }}>
                                                                <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? 'var(--teal)' : 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.path}>{fileName}</div>
                                                                <div style={{ fontSize: 9, color: 'var(--mt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</div>
                                                            </div>
                                                            <div style={{ fontSize: 11, color: 'var(--mt)', textAlign: 'center', fontFamily: 'JetBrains Mono,monospace' }}>{f.lines ?? 0}</div>
                                                            <div style={{ fontSize: 11, textAlign: 'center', color: f.coverage === 0 ? 'var(--mt)' : '#16A34A', fontFamily: 'JetBrains Mono,monospace' }}>{(f.coverage ?? 0).toFixed(1)}%</div>
                                                            <div style={{ fontSize: 11, textAlign: 'center', color: (f.duplications ?? 0) > 10 ? '#DC2626' : (f.duplications ?? 0) > 3 ? '#CA8A04' : '#16A34A', fontFamily: 'JetBrains Mono,monospace' }}>{(f.duplications ?? 0).toFixed(1)}%</div>
                                                            {[f.securityRating, f.reliabilityRating, f.maintainabilityRating].map((r, gi) => {
                                                                const g = toGrade(r ?? '')
                                                                return (
                                                                    <div key={gi} style={{ textAlign: 'center' }}>
                                                                        <span style={{ fontSize: 11, fontWeight: 800, color: ratingColor(g), background: ratingBg(g), padding: '2px 8px', borderRadius: 6 }}>{g || '—'}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                            <div style={{ fontSize: 11, textAlign: 'center', color: (f.securityHotspots ?? 0) > 0 ? '#EA580C' : 'var(--mt)', fontFamily: 'JetBrains Mono,monospace' }}>{f.securityHotspots ?? 0}</div>
                                                        </div>
                                                    )
                                                })}
                                        </div>

                                        {/* Dosya issue paneli */}
                                        {selectedFile && (
                                            <div style={{ width: 360, flexShrink: 0, overflowY: 'auto', background: 'var(--glass)', borderLeft: '1px solid var(--glass-bdr)' }}>
                                                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--glass-bdr)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{selectedFile.path?.split('/').pop()}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--mt)' }}>{selectedFile.lines} satır · {selectedFile.path}</div>
                                                    </div>
                                                    <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mt)', fontSize: 16 }}>✕</button>
                                                </div>
                                                {/* Rating özeti */}
                                                <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--glass-bdr)', display: 'flex', gap: 8 }}>
                                                    {[['Security', selectedFile.securityRating], ['Reliability', selectedFile.reliabilityRating], ['Maint.', selectedFile.maintainabilityRating]].map(([label, rating]) => {
                                                        const grade = toGrade(rating ?? '')
                                                        return (
                                                            <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                                                                <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 2 }}>{label}</div>
                                                                <span style={{ fontSize: 14, fontWeight: 800, color: ratingColor(grade), background: ratingBg(grade), padding: '2px 10px', borderRadius: 6 }}>{grade || '—'}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                {/* Bu dosyanın issue'ları */}
                                                <FileIssues projectKey={selected} fileKey={selectedFile.key} allHotspots={allHotspots} onIssueClick={setModalIssue} />
                                            </div>
                                        )}
                                    </div>

                                </>
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
