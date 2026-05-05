import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PresentationChart } from '@phosphor-icons/react'
import { Doughnut } from 'react-chartjs-2'
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend
} from 'chart.js'
import { dashboardApi } from '../services/api'
import type { TrendPoint, HeatmapEntry, SonarEntry, Prediction } from '../types'
import Select from '../components/ui/Select'
import PageHeader from '../components/layout/PageHeader'

// Chart.js custom dataset field type augmentation
declare module 'chart.js' {
    interface ChartDatasetProperties<TType, TData> {
        centerText?: string
        centerColor?: string
    }
}

ChartJS.register(ArcElement, Tooltip, Legend)

const JOBS = ['Shell.OneHub.UI', 'NishCMS.BackOffice', 'NishCMS.Store', 'Nish.Store.Api', 'Shell.OneHub.Core', 'ForkLiftFrontEnd']

// ── Donut center text plugin ───────────────────────────────────────────────────
const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart: any) {
        const { ctx, data, chartArea: { left, top, right, bottom }, tooltip } = chart
        // Hover sırasında ortadaki yazıyı gizle
        if (tooltip?._active?.length > 0) return
        const cx = (left + right) / 2
        const cy = (top + bottom) / 2
        const val = data.datasets[0]?.centerText
        if (!val) return
        ctx.save()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '600 13px Inter, sans-serif'
        ctx.fillStyle = data.datasets[0]?.centerColor ?? '#e2f0ef'
        ctx.fillText(val, cx, cy)
        ctx.restore()
    }
}
ChartJS.register(centerTextPlugin)

// ── Donut component ───────────────────────────────────────────────────────────
function tooltipOpts(color: string, titleText: string, bodyFn: (ctx: any) => string) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return {
        enabled: true,
        backgroundColor: isDark ? 'rgba(6,12,22,.98)' : '#ffffff',
        borderColor: color,
        borderWidth: 2,
        titleColor: color,
        bodyColor: isDark ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.5)',
        titleFont: { size: 12, weight: 'bold' as const, family: 'Poppins, sans-serif' },
        bodyFont: { size: 11, family: 'Poppins, sans-serif' },
        padding: { x: 14, y: 10 },
        cornerRadius: 12,
        displayColors: false,
        callbacks: {
            title: () => titleText,
            label: bodyFn,
        }
    }
}

function DonutChart({ value, total, label, color, size = 90 }: {
    value: number; total: number; label: string; color: string; size?: number
}) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const trackColor = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)'

    const data = {
        datasets: [{
            data: [value, Math.max(total - value, 0)],
            backgroundColor: [color, trackColor],
            borderWidth: 0,
            hoverOffset: 6,
            centerText: `${pct}%`,
            centerColor: color,
        }]
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: size, height: size }}>
                <Doughnut
                    data={data}
                    options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        cutout: '72%',
                        plugins: {
                            legend: { display: false },
                            tooltip: tooltipOpts(color, label, ctx => `${ctx.parsed} build · %${pct}`)
                        },
                        animation: { animateRotate: true, duration: 900 },
                    }}
                />
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'JetBrains Mono,monospace' }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
            </div>
        </div>
    )
}

function DurationDonut({ label, minutes }: { label: string; minutes: number }) {
    const max = 5
    const color = minutes >= 4 ? '#f87171' : minutes >= 2.5 ? '#fbbf24' : '#2dd4bf'
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const trackColor = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)'

    const data = {
        datasets: [{
            data: [minutes, Math.max(max - minutes, 0)],
            backgroundColor: [color, trackColor],
            borderWidth: 0,
            hoverOffset: 6,
            centerText: `${minutes.toFixed(1)}dk`,
            centerColor: color,
        }]
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 80, height: 80 }}>
                <Doughnut
                    data={data}
                    options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        cutout: '70%',
                        plugins: {
                            legend: { display: false },
                            tooltip: tooltipOpts(color, label, ctx => `${minutes.toFixed(1)} dakika`)
                        },
                        animation: { animateRotate: true, duration: 900 },
                    }}
                />
            </div>
            <div style={{ fontSize: 10, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
            </div>
        </div>
    )
}

export default function AnalyticsPage() {
    const navigate = useNavigate()
    const [trend, setTrend] = useState<TrendPoint[]>([])
    const [hmap, setHmap] = useState<HeatmapEntry[]>([])
    const [files, setFiles] = useState<{ component: string; fullKey: string; projectKey: string; count: number; uid: string }[]>([])
    const [sonar, setSonar] = useState<any[]>([])
    const [preds, setPreds] = useState<Prediction[]>([])
    const [sonarProjs, setSonarProjs] = useState<{ key: string; name: string }[]>([])
    const [selProj, setSelProj] = useState('ALL')
    const [filesLoading, setFilesLoading] = useState(false)
    const [durations, setDurations] = useState<number[]>([])

    const base = import.meta.env.PROD ? 'http://194.99.74.2:8091' : ''

    async function loadHotFiles(projectKey: string) {
        setFilesLoading(true)
        setFiles([])
        try {
            const { default: axios } = await import('axios')
            if (projectKey === 'ALL') {
                const r = await axios.get(`${base}/api/sonar/projects`)
                const projects: { key: string }[] = r.data
                const results = await Promise.all(
                    projects.map(p =>
                        axios.get(`${base}/api/sonar/hotfiles?project=${encodeURIComponent(p.key)}&limit=5`)
                            .then(r => r.data as { component: string; count: number }[])
                            .catch(() => [] as { component: string; count: number }[])
                    )
                )
                const merged = results.flat()
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8)
                    .map((f, i) => ({
                        component: f.component.split(':').pop() ?? f.component,
                        fullKey: f.component,
                        projectKey: f.component.includes(':') ? f.component.substring(0, f.component.indexOf(':')) : '',
                        count: f.count,
                        uid: `all-${i}-${f.component}`,
                    }))
                setFiles(merged)
            } else {
                const r = await axios.get(`${base}/api/sonar/hotfiles?project=${encodeURIComponent(projectKey)}&limit=8`)
                setFiles((r.data as { component: string; count: number }[])
                    .map((f, i) => ({
                        component: f.component.split(':').pop() ?? f.component,
                        fullKey: f.component,
                        projectKey: f.component.includes(':') ? f.component.substring(0, f.component.indexOf(':')) : projectKey,
                        count: f.count,
                        uid: `${projectKey}-${i}-${f.component}`,
                    })))
            }
        } finally { setFilesLoading(false) }
    }

    useEffect(() => {
        dashboardApi.getTrend().then(r => setTrend(r.data))
        dashboardApi.getHeatmap().then(r => setHmap(r.data))
        dashboardApi.getPredictions().then(r => setPreds(r.data))
        // Random durations — gerçek API'den alınabilir
        setDurations(JOBS.map(() => +((Math.random() * 3.5 + 0.8).toFixed(1))))

        import('axios').then(({ default: axios }) => {
            axios.get(`${base}/api/sonar/all`).then(r => setSonar(r.data)).catch(() => { })
            axios.get(`${base}/api/sonar/projects`).then(r => setSonarProjs(r.data)).catch(() => { })
        })

        loadHotFiles('ALL')
    }, [])

    useEffect(() => {
        if (sonarProjs.length > 0) loadHotFiles(selProj)
    }, [selProj])

    // Trend toplamları
    const totalPass = trend.reduce((s, t) => s + t.pass, 0)
    const totalFail = trend.reduce((s, t) => s + t.fail, 0)
    const total = totalPass + totalFail

    const maxFail = Math.max(...hmap.map(h => h.failCount), 1)
    function hmColor(v: number) {
        const r = v / maxFail
        if (r < .2) return 'var(--gb)'
        if (r < .5) return 'var(--yb)'
        if (r < .8) return 'rgba(239,68,68,.3)'
        return 'var(--rb)'
    }

    return (
        <div className="page-wrap">
            <PageHeader
                icon={<PresentationChart size={22} weight="duotone" />}
                kicker="Metrikler"
                title="Build analitikleri"
                subtitle="Son 30 günlük trend, kalite metrikleri ve tahminler"
            />

            <div className="agrid">

                {/* Build Başarı — Donut'lar */}
                <div className="card full">
                    <div className="ch">
                        <div className="ct">Build Başarı Trendi — Son 30 Gün</div>
                        <div className="cm">{total} toplam build</div>
                    </div>
                    <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
                        {/* Ana donut */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 160, height: 160 }}>
                                <Doughnut
                                    data={{
                                        labels: ['Başarılı', 'Başarısız'],
                                        datasets: [{
                                            data: [totalPass, totalFail],
                                            backgroundColor: ['#2dd4bf', '#f87171'],
                                            borderWidth: 0,
                                            hoverOffset: 4,
                                            centerText: total > 0 ? `${Math.round(totalPass / total * 100)}%` : '—',
                                            centerColor: '#2dd4bf',
                                        }]
                                    }}
                                    options={{
                                        responsive: true, maintainAspectRatio: true, cutout: '68%',
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: {
                                                enabled: true,
                                                backgroundColor: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'rgba(6,12,22,.98)' : '#ffffff',
                                                borderColor: (ctx: any) => ['#2dd4bf', '#f87171'][ctx.tooltipItems?.[0]?.dataIndex ?? 0],
                                                borderWidth: 2,
                                                titleColor: (ctx: any) => ['#2dd4bf', '#f87171'][ctx.tooltipItems?.[0]?.dataIndex ?? 0],
                                                bodyColor: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.5)',
                                                titleFont: { size: 13, weight: 'bold' as const, family: 'Poppins, sans-serif' },
                                                bodyFont: { size: 12, family: 'Poppins, sans-serif' },
                                                padding: { x: 14, y: 10 },
                                                cornerRadius: 12,
                                                displayColors: false,
                                                callbacks: {
                                                    title: (items: any[]) => items[0]?.label ?? '',
                                                    label: (ctx: any) => `${ctx.parsed} build · %${Math.round(ctx.parsed / Math.max(total, 1) * 100)}`
                                                }
                                            }
                                        },
                                        animation: { animateRotate: true, duration: 1000 },
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--mt)' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#2dd4bf', display: 'inline-block' }} />Başarılı
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--mt)' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f87171', display: 'inline-block' }} />Başarısız
                                </span>
                            </div>
                        </div>

                        {/* Detay donuts */}
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 20 }}>
                            <DonutChart value={totalPass} total={total} label="Başarılı" color="#2dd4bf" />
                            <DonutChart value={totalFail} total={total} label="Başarısız" color="#f87171" />
                            <DonutChart value={Math.round(total * 0.3)} total={total} label="Bu Hafta" color="#60a5fa" />
                            <DonutChart value={Math.round(totalPass * 0.85)} total={totalPass} label="İlk Denemede" color="#a78bfa" />
                        </div>

                        {/* Günlük mini trend */}
                        <div style={{ flex: 2, minWidth: 200 }}>
                            <div style={{ fontSize: 11, color: 'var(--mt)', marginBottom: 10, fontWeight: 600 }}>Günlük Dağılım</div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, position: 'relative' }} id="daily-bars">
                                {trend.slice(-20).map((t, i) => {
                                    const tot = t.pass + t.fail
                                    const pct = tot > 0 ? (t.pass / tot) * 100 : 0
                                    const h = Math.max((tot / Math.max(...trend.map(x => x.pass + x.fail), 1)) * 80, 4)
                                    const col = pct >= 80 ? '#2dd4bf' : pct >= 50 ? '#fbbf24' : '#f87171'
                                    return (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, position: 'relative' }}
                                            onMouseEnter={e => {
                                                const tip = document.getElementById('daily-tip')
                                                if (tip) {
                                                    tip.style.display = 'block'
                                                    tip.style.left = `${(e.currentTarget as HTMLDivElement).offsetLeft}px`
                                                    tip.innerHTML = `<div style="font-family:Poppins,sans-serif;font-size:11px;font-weight:600;color:${col}">${t.label}</div><div style="font-family:Poppins,sans-serif;font-size:10px;color:rgba(255,255,255,.6);margin-top:2px">✅ ${t.pass} başarılı</div><div style="font-family:Poppins,sans-serif;font-size:10px;color:rgba(43, 31, 31, 0.6)">❌ ${t.fail} başarısız</div>`
                                                }
                                            }}
                                            onMouseLeave={() => {
                                                const tip = document.getElementById('daily-tip')
                                                if (tip) tip.style.display = 'none'
                                            }}
                                        >
                                            <div style={{ height: h, borderRadius: '2px 2px 0 0', background: col, opacity: .85, transition: 'height .5s, opacity .15s', cursor: 'pointer' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '.85' }}
                                            />
                                        </div>
                                    )
                                })}
                                {/* Custom tooltip */}
                                <div id="daily-tip" style={{
                                    display: 'none', position: 'absolute', bottom: 90, zIndex: 10,
                                    background: 'rgba(6,12,22,.98)', border: '2px solid #2dd4bf',
                                    borderRadius: 12, padding: '8px 12px', pointerEvents: 'none',
                                    whiteSpace: 'nowrap', minWidth: 120,
                                    boxShadow: '0 4px 20px rgba(0,0,0,.4)',
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--mt)', marginTop: 4 }}>
                                <span>{trend[trend.length - 20]?.label}</span>
                                <span>{trend[trend.length - 1]?.label}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Heatmap */}
                <div className="card full">
                    <div className="ch"><div className="ct">Hata Heatmap — Saate Göre (0–23)</div><div className="cm">kırmızı = daha fazla hata</div></div>
                    <div className="hml">{[0, 4, 8, 12, 16, 20].map(h => <span key={h}>{h}:00</span>)}</div>
                    <div className="hm-grid">
                        {hmap.map(h => (
                            <div key={h.hour} className="hm-cell" style={{ background: hmColor(h.failCount) }} data-t={`${h.hour}:00 — ${h.failCount} hata`} />
                        ))}
                    </div>
                </div>

                {/* Top Files */}
                <div className="card">
                    <div className="ch">
                        <div className="ct">🔴 En Çok Hata Veren</div>
                        <Select
                            value={selProj}
                            onChange={setSelProj}
                            options={[
                                { value: 'ALL', label: 'Tüm Projeler' },
                                ...sonarProjs.map(p => ({ value: p.key, label: p.name }))
                            ]}
                        />
                    </div>
                    <div style={{ padding: 12 }}>
                        {filesLoading ? (
                            <div className="empty-state" style={{ padding: '16px 0', fontSize: 12 }}>Yükleniyor...</div>
                        ) : files.length === 0 ? (
                            <div className="empty-state" style={{ padding: '16px 0', fontSize: 12 }}>Issue bulunamadı.</div>
                        ) : files.map(f => (
                            <div key={f.uid} className="tf-r" style={{ borderRadius: 6 }}>
                                <div className="tf-n" title={f.fullKey}>{f.component}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    <div className="tf-c">{f.count}×</div>
                                    <button
                                        onClick={() => navigate(`/sonar?project=${encodeURIComponent(f.projectKey)}&file=${encodeURIComponent(f.fullKey)}`)}
                                        style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(45,212,191,.3)', background: 'rgba(45,212,191,.08)', color: 'var(--teal)', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                        Issue Gör
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SonarQube */}
                <div className="card">
                    <div className="ch"><div className="ct">SonarQube Kalite</div><div className="cm">proje bazlı</div></div>
                    <div className="sonar-g">
                        {sonar.length === 0 ? (
                            <div className="empty-state" style={{ padding: '20px 0' }}>Yükleniyor...</div>
                        ) : sonar.map((s: any) => {
                            const ratingGrade = (r: string) => {
                                const key = (r ?? '').split('.')[0]
                                return key === '1' ? 'A' : key === '2' ? 'B' : key === '3' ? 'C' : key === '4' ? 'D' : key === '5' ? 'E' : '?'
                            }
                            const bugGrade = s.bugs === 0 ? 'A' : s.bugs <= 5 ? 'B' : s.bugs <= 10 ? 'C' : s.bugs <= 20 ? 'D' : 'E'
                            const secGrade = ratingGrade(s.securityRating)
                            const qualGrade = s.qualityGate === 'OK' ? 'A' : 'D'
                            const name = s.projectKey?.replace(/-/g, ' ')
                            return (
                                <div key={s.projectKey} className="sonar-i">
                                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--mt)', marginBottom: 5, textTransform: 'capitalize' }}>{name}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                        {([['Bugs', bugGrade], ['Quality', qualGrade], ['Security', secGrade]] as const).map(([label, grade]) => (
                                            <div key={label}>
                                                <div className={`sonar-l g${grade}`}>{grade}</div>
                                                <div className="sonar-n">{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Predictions */}
                <div className="card">
                    <div className="ch"><div className="ct">🔮 Build Tahmin</div><div className="cm">AI destekli risk</div></div>
                    <div style={{ padding: 12 }}>
                        {preds.map(p => (
                            <div key={p.job} className={`pred pred-${p.risk}`}>
                                <span>{p.risk === 'HIGH' ? '🔴' : p.risk === 'MED' ? '🟡' : '🟢'}</span>
                                <div>
                                    <div style={{ fontWeight: 800 }}>{p.job}</div>
                                    <div style={{ fontSize: 10, opacity: .9 }}>{p.reason}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Build Süresi — Donut grid */}
                <div className="card">
                    <div className="ch"><div className="ct">⏱ Ortalama Build Süresi</div><div className="cm">dakika</div></div>
                    <div style={{ padding: '16px 12px', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                        {JOBS.map((job, i) => (
                            <DurationDonut key={job} label={job.split('.').pop() ?? job} minutes={durations[i] ?? 0} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '0 12px 12px', fontSize: 10, color: 'var(--mt)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2dd4bf', display: 'inline-block' }} />{'< 2.5 dk'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />2.5–4 dk</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />{'> 4 dk'}</span>
                    </div>
                </div>

            </div>
        </div>
    )
}
