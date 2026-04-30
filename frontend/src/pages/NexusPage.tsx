import { useEffect, useState } from 'react'
import {
    Vault, Database, HardDrive, Trash, DownloadSimple,
    MagnifyingGlass, ArrowClockwise, Archive
} from '@phosphor-icons/react'
import { nexus } from '../services/api'
import { PipelineLoaderInline } from '../components/ui/PipelineLoader'
import { toast } from '../components/ui'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import type { NexusRepository, NexusArtifact, NexusStorageStats } from '../types'
import Select from '../components/ui/Select'

function formatSize(bytes: number) {
    if (bytes > 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
    if (bytes > 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${bytes} B`
}

function timeAgo(ts: string) {
    if (!ts) return '—'
    const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
    if (d < 60) return `${d}s önce`
    if (d < 3600) return `${Math.floor(d / 60)}dk önce`
    if (d < 86400) return `${Math.floor(d / 3600)}sa önce`
    return `${Math.floor(d / 86400)}g önce`
}

export default function NexusPage() {
    const [repos, setRepos] = useState<NexusRepository[]>([])
    const [artifacts, setArtifacts] = useState<NexusArtifact[]>([])
    const [stats, setStats] = useState<NexusStorageStats | null>(null)
    const [selRepo, setSelRepo] = useState<string>('')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [tab, setTab] = useState<'artifacts' | 'stats'>('artifacts')

    useEffect(() => {
        nexus.getStats().then(r => setStats(r.data)).catch(() => { })
        // Repolar ve artifact'ları paralel çek
        nexus.getRepos().then(r => setRepos(r.data)).catch(() => { })
        loadArtifacts() // Sayfa açılışında tüm artifact'ları getir
    }, [])

    useEffect(() => {
        if (selRepo !== '') loadArtifacts() // Repo seçilince tekrar yükle
    }, [selRepo])

    async function loadArtifacts() {
        setLoading(true)
        try {
            const res = await nexus.getArtifacts(selRepo || undefined)
            setArtifacts(res.data)
        } catch {
            toast('Nexus bağlantı hatası', 'var(--r)')
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`"${name}" silinsin mi?`)) return
        const res = await nexus.deleteArtifact(id)
        if (res.data.success) {
            setArtifacts(prev => prev.filter(a => a.id !== id))
            toast('Artifact silindi', 'var(--g)')
        } else {
            toast('Silme başarısız', 'var(--r)')
        }
    }

    const filtered = artifacts.filter(a =>
        !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.version.toLowerCase().includes(search.toLowerCase()) ||
        a.repository.toLowerCase().includes(search.toLowerCase())
    )

    const { page, paged, total, setPage, reset } = usePagination(filtered, 10)

    useEffect(() => { reset() }, [search, selRepo])

    const totalSize = artifacts.reduce((s, a) => s + (a.sizeBytes || 0), 0)

    return (
        <div className="page-wrap">
            <div className="page-title">
                <Vault size={22} weight="duotone" style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--teal)' }} />
                Nexus Repository Manager
            </div>
            <div className="page-sub">Artifact deposu — repolar, versiyonlar ve storage istatistikleri</div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                <div className="sc">
                    <div className="slbl">Toplam Artifact</div>
                    <div className="sval sb">{artifacts.length}</div>
                    <div className="ssub">yüklü</div>
                </div>
                <div className="sc">
                    <div className="slbl">Toplam Boyut</div>
                    <div className="sval sy">{formatSize(totalSize)}</div>
                    <div className="ssub">disk kullanımı</div>
                </div>
                <div className="sc">
                    <div className="slbl">Repolar</div>
                    <div className="sval sg">{repos.length}</div>
                    <div className="ssub">aktif repo</div>
                </div>
                <div className="sc">
                    <div className="slbl">Filtrelendi</div>
                    <div className="sval">{filtered.length}</div>
                    <div className="ssub">görüntülenen</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {(['artifacts', 'stats'] as const).map(t => (
                    <button
                        key={t}
                        className={`fbtn ${tab === t ? 'on' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t === 'artifacts' ? <><Vault size={13} /> Artifact Listesi</> : <><HardDrive size={13} /> Storage İstatistikleri</>}
                    </button>
                ))}
            </div>

            {tab === 'artifacts' && (
                <>
                    {/* Filter Bar */}
                    <div className="fbar">
                        <Select
                            value={selRepo}
                            onChange={val => {
                                setSelRepo(val)
                                if (val === '') loadArtifacts()
                            }}
                            options={[
                                { value: '', label: 'Tüm Repolar' },
                                ...repos.map(r => ({ value: r.name, label: r.name }))
                            ]}
                            width={200}
                        />
                        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
                            <MagnifyingGlass size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--mt)' }} />
                            <input
                                className="srch"
                                style={{ paddingLeft: 32, width: '100%' }}
                                placeholder="Artifact ara..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-g btn-sm" onClick={loadArtifacts}>
                            <ArrowClockwise size={13} weight="bold" /> Yenile
                        </button>
                        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--mt)', fontFamily: 'DM Mono,monospace' }}>
                            {filtered.length} artifact
                        </div>
                    </div>

                    <div className="card" style={{ position: "relative" }}>
                        {loading ? (
                            <PipelineLoaderInline message="fetching artifacts..." />
                        ) : filtered.length === 0 ? (
                            <div className="empty-state">
                                <Archive size={36} weight="duotone" style={{ opacity: .4, marginBottom: 8 }} />
                                Artifact bulunamadı. Nexus bağlantısını Ayarlar'dan kontrol edin.
                            </div>
                        ) : (
                            <>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Ad</th>
                                            <th>Versiyon</th>
                                            <th>Repo</th>
                                            <th>Boyut</th>
                                            <th>Tarih</th>
                                            <th>SHA1</th>
                                            <th style={{ width: 90, textAlign: 'right' }}>İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paged.map(a => (
                                            <tr key={a.id}>
                                                <td>
                                                    <div className="pname" style={{ fontSize: 13 }}>
                                                        <Vault size={13} weight="duotone" color="var(--teal)" />
                                                        {a.name}
                                                    </div>
                                                </td>
                                                <td><span className="badge b-neutral">{a.version || '—'}</span></td>
                                                <td><span style={{ fontSize: 12, color: 'var(--mt)' }}>{a.repository}</span></td>
                                                <td><span className="dur">{a.sizeFormatted || formatSize(a.sizeBytes)}</span></td>
                                                <td><span className="dur">{timeAgo(a.lastModified)}</span></td>
                                                <td>
                                                    <span className="dur" style={{ fontSize: 10 }} title={a.sha1}>
                                                        {a.sha1 ? a.sha1.substring(0, 8) + '...' : '—'}
                                                    </span>
                                                </td>
                                                <td style={{ width: 90, textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                                                        {a.downloadUrl && (
                                                            <a href={a.downloadUrl} target="_blank" rel="noreferrer" className="act-btn" title="İndir" style={{ textDecoration: 'none' }}>
                                                                <DownloadSimple size={13} weight="bold" />
                                                            </a>
                                                        )}
                                                        <button className="act-btn red" title="Sil" onClick={() => handleDelete(a.id, a.name)}>
                                                            <Trash size={13} weight="bold" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <Pagination page={page} total={total} pageSize={10} onChange={setPage} />
                            </>
                        )}
                    </div>
                </>
            )}

            {tab === 'stats' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Repo Stats */}
                    <div className="card">
                        <div className="ch">
                            <div className="ct"><Database size={14} weight="duotone" style={{ marginRight: 6 }} />Repo İstatistikleri</div>
                            <div className="cm">{stats?.repositories.length ?? 0} repo</div>
                        </div>
                        <div style={{ padding: 14 }}>
                            {(stats?.repositories ?? []).length === 0 ? (
                                <div className="empty-state" style={{ padding: '20px 0' }}>Veri yok</div>
                            ) : (
                                (stats?.repositories ?? []).map(r => (
                                    <div key={r.name} style={{ marginBottom: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600 }}>{r.name}</span>
                                            <span style={{ fontSize: 11, color: 'var(--mt)', fontFamily: 'DM Mono,monospace' }}>
                                                {r.artifactCount} artifact
                                            </span>
                                        </div>
                                        <div style={{ height: 6, background: 'var(--bdr)', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', borderRadius: 3,
                                                background: 'linear-gradient(90deg, var(--teal), var(--teal-light))',
                                                width: `${Math.min((r.artifactCount / Math.max(...(stats?.repositories ?? []).map(x => x.artifactCount), 1)) * 100, 100)}%`,
                                                transition: 'width .8s ease'
                                            }} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Repo List */}
                    <div className="card">
                        <div className="ch">
                            <div className="ct"><Archive size={14} weight="duotone" style={{ marginRight: 6 }} />Repolar</div>
                            <div className="cm">{repos.length} aktif</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Ad</th>
                                    <th>Format</th>
                                    <th>Tip</th>
                                </tr>
                            </thead>
                            <tbody>
                                {repos.map(r => (
                                    <tr key={r.name}>
                                        <td>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                                            <div style={{ fontSize: 10, color: 'var(--mt)', fontFamily: 'DM Mono,monospace' }}>{r.url?.split('/').pop()}</div>
                                        </td>
                                        <td><span className="badge b-neutral">{r.format}</span></td>
                                        <td><span className={`badge ${r.type === 'hosted' ? 'b-success' : r.type === 'proxy' ? 'b-running' : 'b-warn'}`}>{r.type}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
