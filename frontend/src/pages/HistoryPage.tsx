import { useEffect, useState } from 'react'
import {
    TestTube, CheckCircle, XCircle, SkipForward,
    TrendUp, TrendDown, ArrowsClockwise, Warning,
    ChartBar, Bug, Timer
} from '@phosphor-icons/react'
import { dashboardApi } from '../services/api'
import { PipelineLoaderInline } from '../components/ui/PipelineLoader'
import { useStore } from '../store'
import type { TestHistoryPoint } from '../types'

function fmtDur(ms: number) {
    if (!ms) return '—'
    const s = Math.floor(ms / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}dk ${s % 60}s`
    return `${Math.floor(s / 3600)}sa ${Math.floor((s % 3600) / 60)}dk`
}

function timeAgo(ts: number) {
    if (!ts) return '—'
    const d = Math.floor((Date.now() - ts) / 1000)
    if (d < 60) return `${d}sn önce`
    if (d < 3600) return `${Math.floor(d / 60)}dk önce`
    if (d < 86400) return `${Math.floor(d / 3600)}sa önce`
    return `${Math.floor(d / 86400)}g önce`
}

function StatusDot({ point }: { point: TestHistoryPoint }) {
    const [hovered, setHovered] = useState(false)
    const { status, buildNumber, passCount, failCount, skipCount, duration, timestamp } = point
    const color = status === 'pass' ? 'var(--g)' : status === 'fail' ? 'var(--r)' : 'rgba(255,255,255,.15)'
    const label = status === 'pass' ? 'Başarılı' : status === 'fail' ? 'Başarısız' : 'Atlandı'
    const hasTests = passCount > 0 || failCount > 0 || skipCount > 0

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="th-dot" style={{
                background: color,
                boxShadow: status === 'fail' ? '0 0 8px rgba(248,113,113,.5)' : status === 'pass' ? '0 0 6px rgba(74,222,128,.3)' : 'none',
                cursor: 'pointer',
            }} />
            {hovered && (
                <div style={{
                    position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(10,20,30,.95)', border: `1px solid ${status === 'fail' ? 'rgba(248,113,113,.3)' : 'var(--glass-bdr)'}`,
                    borderRadius: 10, padding: '10px 14px', zIndex: 50,
                    minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,.5)',
                    backdropFilter: 'blur(12px)', whiteSpace: 'nowrap',
                    fontFamily: 'Poppins, sans-serif',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        {status === 'pass' ? <CheckCircle size={13} weight="fill" color="var(--g)" />
                            : status === 'fail' ? <XCircle size={13} weight="fill" color="var(--r)" />
                                : <SkipForward size={13} weight="duotone" color="var(--mt)" />}
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>Build #{buildNumber} — {label}</span>
                    </div>
                    {hasTests && (
                        <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--g)', fontFamily: 'JetBrains Mono,monospace' }}>✓ {passCount}</span>
                            <span style={{ fontSize: 11, color: 'var(--r)', fontFamily: 'JetBrains Mono,monospace' }}>✗ {failCount}</span>
                            {skipCount > 0 && <span style={{ fontSize: 11, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace' }}>⊘ {skipCount}</span>}
                        </div>
                    )}
                    {point.failReason && (
                        <div style={{ fontSize: 10, color: '#fbbf24', fontFamily: 'JetBrains Mono,monospace', marginBottom: 6, maxWidth: 280, whiteSpace: 'normal', lineHeight: 1.4 }}>
                            ⚠ {point.failReason}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--mt)', borderTop: '1px solid var(--glass-bdr)', paddingTop: 6 }}>
                        {duration > 0 && <span>⏱ {fmtDur(duration)}</span>}
                        {timestamp > 0 && <span>🕐 {timeAgo(timestamp)}</span>}
                    </div>
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
    const { builds } = useStore()
    // Mevcut build'lerden proje listesini çek
    const jobsList = [...new Set(builds.map(b => b.job))].sort()

    const [selJob, setSelJob] = useState('')
    const [history, setHistory] = useState<TestHistoryPoint[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (jobsList.length > 0 && !selJob) setSelJob(jobsList[0])
    }, [jobsList])

    async function load(job: string) {
        if (!job) return
        setLoading(true)
        try {
            const r = await dashboardApi.getHistory(job)
            setHistory(r.data)
        } finally { setLoading(false) }
    }

    useEffect(() => { if (selJob) load(selJob) }, [selJob])

    const pass = history.filter(h => h.status === 'pass').length
    const fail = history.filter(h => h.status === 'fail').length
    const skip = history.filter(h => h.status === 'skip').length
    const rate = history.length ? Math.round(pass / history.length * 100) : 0

    // Trend: son 5 vs önceki 5
    const recent = history.slice(-5)
    const previous = history.slice(-10, -5)
    const recentRate = recent.length ? Math.round(recent.filter(h => h.status === 'pass').length / recent.length * 100) : 0
    const prevRate = previous.length ? Math.round(previous.filter(h => h.status === 'pass').length / previous.length * 100) : 0
    const trendUp = recentRate >= prevRate

    // Consecutive fails
    let maxStreak = 0, cur = 0
    for (const h of history) { if (h.status === 'fail') { cur++; maxStreak = Math.max(maxStreak, cur) } else cur = 0 }

    const failPoints = history.filter(h => h.status === 'fail')

    return (
        <div className="page-wrap">
            {/* Page title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <TestTube size={22} weight="duotone" color="var(--teal)" />
                <div className="page-title" style={{ margin: 0 }}>Test Geçmişi</div>
            </div>
            <div className="page-sub">Son 30 build boyunca test geçme/kalma trendi ve hata analizi</div>

            {/* Job selector */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="th-proj-sel">
                    {jobsList.map(j => (
                        <button key={j} className={`th-p ${j === selJob ? 'on' : ''}`} onClick={() => setSelJob(j)}>
                            {j.split(' / ')[0]}
                        </button>
                    ))}
                    <button className="act-btn" style={{ marginLeft: 'auto' }} onClick={() => load(selJob)} title="Yenile">
                        <ArrowsClockwise size={13} weight="duotone" style={{ ...(loading ? { animation: 'rot .7s linear infinite' } : {}) }} />
                    </button>
                </div>
            </div>

            {/* Metric cards */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
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
                    <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TestTube size={13} weight="duotone" color="var(--teal)" />
                        {selJob} — Son {history.length} Build
                    </div>
                    <div className="cm" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={10} weight="fill" color="var(--g)" /> geçti</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={10} weight="fill" color="var(--r)" /> başarısız</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SkipForward size={10} weight="duotone" color="var(--mt)" /> atlandı</span>
                    </div>
                </div>

                <div style={{ padding: '16px 12px 8px' }}>
                    {loading ? (
                        <PipelineLoaderInline message="fetching test history..." />
                    ) : (
                        <div className="th-grid" style={{ gap: 4 }}>
                            {history.map((h) => (
                                <StatusDot key={h.buildNumber} point={h} />
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ padding: '8px 14px 14px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: 'var(--g)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={11} weight="fill" /> {pass} geçti
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: 'var(--r)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <XCircle size={11} weight="fill" /> {fail} başarısız
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: 'var(--mt)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <SkipForward size={11} weight="duotone" /> {skip} atlandı
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: 'var(--mt)', marginLeft: 'auto' }}>
                        Başarı oranı: <span style={{ color: rate >= 80 ? 'var(--g)' : rate >= 60 ? 'var(--y)' : 'var(--r)', fontWeight: 700 }}>{rate}%</span>
                    </span>
                </div>
            </div>

            {/* Failure analysis */}
            {failPoints.length > 0 && (
                <div className="card">
                    <div className="ch">
                        <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Bug size={13} weight="duotone" color="var(--r)" /> Hata Analizi
                        </div>
                        <div className="cm">{failPoints.length} başarısız build</div>
                    </div>
                    <div style={{ padding: '12px 16px' }}>
                        {failPoints.slice(0, 5).map((h) => {
                            const total = h.passCount + h.failCount + h.skipCount
                            return (
                                <div key={h.buildNumber} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 0', borderBottom: '1px solid var(--glass-bdr)'
                                }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                        <XCircle size={16} weight="fill" color="var(--r)" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>
                                            Build #{h.buildNumber}
                                            {h.timestamp > 0 && <span style={{ fontSize: 10, color: 'var(--mt)', fontWeight: 400, marginLeft: 8, fontFamily: 'JetBrains Mono,monospace' }}>{timeAgo(h.timestamp)}</span>}
                                        </div>
                                        {total > 0 && (
                                            <div style={{ display: 'flex', gap: 10, fontSize: 11, fontFamily: 'JetBrains Mono,monospace' }}>
                                                <span style={{ color: 'var(--g)' }}>✓ {h.passCount}</span>
                                                <span style={{ color: 'var(--r)' }}>✗ {h.failCount}</span>
                                                {h.skipCount > 0 && <span style={{ color: 'var(--mt)' }}>⊘ {h.skipCount}</span>}
                                            </div>
                                        )}
                                        {h.failReason && (
                                            <div style={{ fontSize: 11, color: '#fbbf24', fontFamily: 'JetBrains Mono,monospace', marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                                <span style={{ flexShrink: 0 }}>⚠</span>
                                                <span style={{ lineHeight: 1.4 }}>{h.failReason}</span>
                                            </div>
                                        )}
                                    </div>
                                    {h.duration > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace', flexShrink: 0 }}>
                                            <Timer size={10} weight="duotone" /> {fmtDur(h.duration)}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {failPoints.length > 5 && (
                            <div style={{ fontSize: 11, color: 'var(--mt)', padding: '8px 0', textAlign: 'center' }}>
                                + {failPoints.length - 5} başarısız build daha
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
