import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
    Star, XCircle, CircleNotch, MagnifyingGlass,
    Trophy, Medal, SealCheck, ChartBar, ArrowsLeftRight,
    ClockCounterClockwise, Pulse, Rocket, ListBullets,
} from '@phosphor-icons/react'
import { useStore } from '../store'
import { PipelineLoaderInline } from '../components/ui/PipelineLoader'
import Select from '../components/ui/Select'
import { dashboardApi } from '../services/api'
import { CoverageBar, toast } from '../components/ui'
import BuildTable from '../components/builds/BuildTable'
import AiPanel from '../components/builds/AiPanel'
import CountUp from '../components/bits/CountUp'
import BlurText from '../components/bits/BlurText'
import GlowCard from '../components/bits/GlowCard'
import type { FilterType, SortType } from '../types'

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
    label: string
    value: number
    suffix?: string
    decimals?: number
    sub: string
    colorClass?: string
    delta?: string
    deltaType?: 'up' | 'down' | 'neutral'
    onClick?: () => void
    active?: boolean
    glowColor?: string
    index: number
}

function StatCard({ label, value, suffix = '', decimals = 0, sub, colorClass = '', delta, deltaType, onClick, active, glowColor, index }: StatCardProps) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true })

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
        >
            <GlowCard
                glowColor={glowColor ?? 'var(--teal)'}
                className={`sc ${colorClass} ${active ? 'active' : ''}`}
                style={{ cursor: onClick ? 'pointer' : 'default' }}
                onClick={onClick}
            >
                <div className="slbl">{label}</div>
                <div className="sval">
                    <CountUp to={value} suffix={suffix} decimals={decimals} duration={1.2} />
                </div>
                <div className="ssub">{sub}</div>
                <div className="sdelta-slot" aria-hidden={!delta}>
                    {delta ? <div className={`sdelta ${deltaType ?? ''}`}>{delta}</div> : <span className="sdelta sdelta--placeholder">&nbsp;</span>}
                </div>
            </GlowCard>
        </motion.div>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BuildsPage() {
    const {
        stats, builds, filter, sort, search, lastRefresh,
        setFilter, setSort, setSearch,
        setCurrentAnalysis, setAiLoading,
    } = useStore()

    async function handleAnalyze(job: string, buildId: string) {
        setAiLoading(true)
        setCurrentAnalysis(null)
        try {
            const res = await dashboardApi.analyze(job, buildId)
            setCurrentAnalysis(res.data)
            toast('🤖 Analiz tamamlandı', 'var(--ym)')
        } catch {
            toast('AI analizi başarısız', 'var(--r)')
        } finally {
            setAiLoading(false)
        }
    }

    const s = stats
    const fail = s?.failed ?? 0
    const pass = s?.success ?? 0
    const rate = s?.successRate ?? 0

    const statCards = [
        { label: 'Başarılı', value: pass, sub: 'build', colorClass: 'sg', glowColor: '#22c55e', delta: pass > fail ? '↑ İyi' : '—', deltaType: (pass > fail ? 'up' : 'neutral') as 'up' | 'down' | 'neutral', filter: 'SUCCESS' as FilterType },
        { label: 'Başarısız', value: fail, sub: 'build', colorClass: 'sr', glowColor: '#ef4444', delta: fail > 0 ? `↓ ${fail} hata` : '✓ Temiz', deltaType: (fail > 0 ? 'down' : 'up') as 'up' | 'down' | 'neutral', filter: 'FAILURE' as FilterType },
        { label: 'Unstable', value: s?.unstable ?? 0, sub: 'flaky', colorClass: 'sy', glowColor: '#f59e0b', filter: 'UNSTABLE' as FilterType },
        { label: 'Çalışıyor', value: s?.running ?? 0, sub: 'aktif', colorClass: 'sb', glowColor: '#3b82f6', filter: 'RUNNING' as FilterType },
        { label: 'Başarı Oranı', value: rate, sub: 'bu hafta', suffix: '%', decimals: 1, glowColor: '#0F8B8D', delta: rate >= 80 ? '↑ Sağlıklı' : '— Orta', deltaType: (rate >= 80 ? 'up' : 'neutral') as 'up' | 'down' | 'neutral' },
        { label: 'Ort. Süre', value: s?.avgDurationMinutes ?? 0, sub: 'dakika', suffix: 'dk', decimals: 1, glowColor: '#8b5cf6' },
    ]

    const running = s?.running ?? 0
    const jobCount = builds.length

    return (
        <div className="page-wrap dash-home">
            <header className="dash-hero">
                <div className="dash-hero-glow" aria-hidden />
                <div className="dash-hero-top">
                    <div className="dash-hero-titles">
                        <div className="dash-hero-kicker">
                            <Rocket size={15} weight="duotone" className="dash-hero-kicker-ic" />
                            CI/CD Özet
                        </div>
                        <BlurText text="Pipeline Intelligence" as="h1" className="dash-hero-title" duration={0.4} />
                        <p className="dash-hero-sub">
                            Jenkins job’ları, canlı durum ve haftalık sağlık metrikleri tek ekranda.
                        </p>
                    </div>
                    <div className="dash-hero-aside">
                        <div className="dash-hero-chips">
                            <span className="dash-chip dash-chip-live" title="SignalR canlı güncelleme">
                                <span className="bub" /> Canlı
                            </span>
                            <span className="dash-chip mono-sm">
                                Son yenileme · {lastRefresh || '—'}
                            </span>
                        </div>
                        <nav className="dash-quick-nav" aria-label="Hızlı sayfalar">
                            <Link to="/analytics" className="dash-qa">
                                <ChartBar size={17} weight="duotone" />
                                Analitik
                            </Link>
                            <Link to="/compare" className="dash-qa">
                                <ArrowsLeftRight size={17} weight="duotone" />
                                Karşılaştır
                            </Link>
                            <Link to="/timeline" className="dash-qa">
                                <ClockCounterClockwise size={17} weight="duotone" />
                                Zaman çizelgesi
                            </Link>
                        </nav>
                    </div>
                </div>
                <div className="dash-hero-summary">
                    <div className="dash-sum-item">
                        <Pulse size={18} weight="duotone" className="dash-sum-ic" />
                        <div>
                            <div className="dash-sum-label">İzlenen job</div>
                            <div className="dash-sum-val">{jobCount}</div>
                        </div>
                    </div>
                    <div className="dash-sum-div" />
                    <div className="dash-sum-item">
                        <CircleNotch size={18} weight="bold" className="dash-sum-ic dash-sum-spin" />
                        <div>
                            <div className="dash-sum-label">Şu an çalışan</div>
                            <div className="dash-sum-val">{running}</div>
                        </div>
                    </div>
                    <div className="dash-sum-div" />
                    <div className="dash-sum-item">
                        <ChartBar size={18} weight="duotone" className="dash-sum-ic" />
                        <div>
                            <div className="dash-sum-label">Başarı oranı</div>
                            <div className="dash-sum-val">{rate.toFixed(1)}<span className="dash-sum-suf">%</span></div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stat cards */}
            <div className="scards">
                {statCards.map((c, i) => (
                    <StatCard
                        key={c.label}
                        index={i}
                        label={c.label}
                        value={c.value}
                        suffix={c.suffix}
                        decimals={c.decimals}
                        sub={c.sub}
                        colorClass={c.colorClass}
                        glowColor={c.glowColor}
                        delta={c.delta}
                        deltaType={c.deltaType}
                        onClick={c.filter ? () => setFilter(c.filter!) : undefined}
                        active={c.filter ? filter === c.filter : false}
                    />
                ))}
            </div>

            {/* Filter bar */}
            <div className="dash-toolbar">
            <div className="fbar fbar-dash">
                {(['ALL', 'FAV', 'FAILURE', 'RUNNING'] as FilterType[]).map(f => (
                    <button key={f} className={`fbtn ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                        {f === 'ALL' ? 'Tümü'
                            : f === 'FAV' ? <><Star size={12} weight="fill" color="#f59e0b" /> Favoriler</>
                                : f === 'FAILURE' ? <><XCircle size={12} weight="fill" color="var(--r)" /> Başarısız</>
                                    : <><CircleNotch size={12} weight="bold" color="var(--b)" /> Çalışıyor</>}
                    </button>
                ))}
                <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
                    <MagnifyingGlass size={13} weight="duotone" color="var(--mt)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input className="srch" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Proje ara..." />
                </div>
                <div className="fright">
                    <Select
                        value={sort}
                        onChange={v => setSort(v as SortType)}
                        options={[
                            { value: 'time', label: 'Zamana Göre' },
                            { value: 'name', label: 'Ada Göre' },
                            { value: 'status', label: 'Duruma Göre' },
                        ]}
                    />
                </div>
            </div>
            </div>

            {/* Main grid */}
            <div className="mg">
                <div className="dash-primary">
                    <div className="section-row dash-section-head">
                        <div className="dash-section-title-wrap">
                            <div className="dash-section-icon" aria-hidden>
                                <ListBullets size={18} weight="duotone" />
                            </div>
                            <div>
                                <div className="section-title dash-section-title">Build listesi</div>
                                <div className="dash-section-hint">Filtreleyin, sıralayın veya satırdan log / AI analizi açın</div>
                            </div>
                        </div>
                        <div className="section-meta dash-job-pill">{builds.length} job</div>
                    </div>
                    <div className="card dash-builds-card" style={{ padding: 0, overflow: 'hidden' }}>
                        {builds.length === 0 ? (
                            <PipelineLoaderInline message="connecting to jenkins..." />
                        ) : (
                            <BuildTable onAnalyze={handleAnalyze} />
                        )}
                    </div>
                </div>
                {/* Sidebar */}
                <div className="sbar">
                    <AiPanel />

                    <div className="card">
                        <div className="ch">
                            <div className="ct">Test Coverage</div>
                            <div className="cm">
                                {s?.coverage?.length
                                    ? 'Ort. ' + Math.round(s.coverage.reduce((a: number, c: { percentage: number }) => a + c.percentage, 0) / s.coverage.length) + '%'
                                    : '—'}
                            </div>
                        </div>
                        <div style={{ padding: 12 }}>
                            {s?.coverage?.length
                                ? s.coverage.map((c: { job: string; percentage: number }) => <CoverageBar key={c.job} job={c.job} pct={c.percentage} />)
                                : <div className="empty-state" style={{ padding: '14px 0', fontSize: 11 }}>Veri yok</div>}
                        </div>
                    </div>

                    <div className="card">
                        <div className="ch">
                            <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Trophy size={14} weight="duotone" color="#f59e0b" /> Kırma Sıralaması
                            </div>
                            <div className="cm">bu hafta</div>
                        </div>
                        <div style={{ padding: '10px 14px' }}>
                            {s?.leaderboard?.length
                                ? s.leaderboard.map((e: { user: string; failCount: number }, i: number) => (
                                    <div key={e.user} className="lbr">
                                        <div className="lbn">
                                            {i === 0 ? <Medal size={16} weight="fill" color="#f59e0b" />
                                                : i === 1 ? <Medal size={16} weight="fill" color="#94a3b8" />
                                                    : i === 2 ? <Medal size={16} weight="fill" color="#b45309" />
                                                        : <span style={{ fontSize: 11, color: 'var(--mt)' }}>{i + 1}</span>}
                                        </div>
                                        <div className="lba">{e.user[0]?.toUpperCase()}</div>
                                        <div className="lbm">{e.user}</div>
                                        <div className="lbc lbb">{e.failCount}×</div>
                                    </div>
                                ))
                                : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 0', color: 'var(--mt)', fontSize: 12 }}>
                                    <SealCheck size={24} weight="duotone" color="var(--g)" />
                                    Başarısız build yok!
                                </div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
