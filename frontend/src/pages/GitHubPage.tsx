import { useEffect, useState, useRef } from 'react'
import {
    GithubLogo, GitBranch, GitMerge, GitPullRequest,
    Star, GitFork, ArrowSquareOut, ArrowsClockwise,
    Clock, User, Shield, CaretDown, Plus, Trash, X
} from '@phosphor-icons/react'
import axios from 'axios'
import CommitDiffModal from '../components/github/CommitDiffModal'
import PRDetailModal from '../components/github/PRDetailModal'
import Select from '../components/ui/Select'

const API_BASE = import.meta.env.PROD ? 'http://194.99.74.2:8091' : ''

interface Repo { name: string; fullName: string; description: string; language: string; stars: number; forks: number; updatedAt: string; defaultBranch: string; htmlUrl: string }
interface Commit { sha: string; message: string; author: string; date: string; avatar: string; htmlUrl: string }
interface PR { number: number; title: string; state: string; author: string; avatar: string; headBranch: string; baseBranch: string; createdAt: string; updatedAt: string; htmlUrl: string; draft: boolean }
interface Branch { name: string; protected: boolean }
interface DiffTarget { sha: string; shortSha: string; message: string }

const LANG_COLORS: Record<string, string> = {
    TypeScript: '#3178c6', JavaScript: '#f1e05a', 'C#': '#178600',
    Python: '#3572A5', Java: '#b07219', Go: '#00ADD8', CSS: '#563d7c', HTML: '#e34c26',
}

function timeAgo(d: string) {
    if (!d) return '—'
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (diff < 60) return `${diff}s önce`
    if (diff < 3600) return `${Math.floor(diff / 60)}m önce`
    if (diff < 86400) return `${Math.floor(diff / 3600)}s önce`
    return `${Math.floor(diff / 86400)}g önce`
}

type Tab = 'commits' | 'prs' | 'branches'

// ── Branch arama dropdown ─────────────────────────────────────────────────────
function BranchSelector({ branches, selected, onChange }: { branches: Branch[]; selected: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])
    const filtered = branches.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)} className="fbtn"
                style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140, justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <GitBranch size={11} weight="duotone" color="var(--teal)" />
                    <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                        {selected || 'Branch seç'}
                    </span>
                </span>
                <CaretDown size={10} style={{ opacity: .5, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>
            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200, background: 'rgba(10,16,26,.98)', border: '1px solid rgba(45,212,191,.2)', borderRadius: 10, width: 240, boxShadow: '0 12px 40px rgba(0,0,0,.6)', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                        <input autoFocus className="srch" placeholder="Branch ara..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {filtered.length === 0
                            ? <div style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,.3)', textAlign: 'center' }}>Bulunamadı</div>
                            : filtered.map(b => (
                                <button key={b.name} onClick={() => { onChange(b.name); setOpen(false); setSearch('') }}
                                    style={{ width: '100%', padding: '8px 14px', border: 'none', textAlign: 'left', background: selected === b.name ? 'var(--teal-dim)' : 'transparent', color: selected === b.name ? 'var(--teal)' : 'var(--tx2)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderLeft: selected === b.name ? '3px solid var(--teal)' : '3px solid transparent', fontFamily: 'JetBrains Mono,monospace', transition: 'background .1s' }}
                                    onMouseEnter={e => { if (selected !== b.name) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.04)' }}
                                    onMouseLeave={e => { if (selected !== b.name) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                                    <GitBranch size={11} weight="duotone" color={selected === b.name ? 'var(--teal)' : 'var(--mt)'} />
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                                    {b.protected && <Shield size={10} weight="fill" color="var(--y)" />}
                                </button>
                            ))}
                    </div>
                    <div style={{ padding: '6px 14px', borderTop: '1px solid rgba(255,255,255,.06)', fontSize: 10, color: 'rgba(255,255,255,.2)' }}>
                        {filtered.length} / {branches.length} branch
                    </div>
                </div>
            )}
        </div>
    )
}

// ── PR Oluştur Modal ──────────────────────────────────────────────────────────
function CreatePRModal({ repo, branches, defaultBranch, onClose, onCreated }: { repo: string; branches: Branch[]; defaultBranch: string; onClose: () => void; onCreated: () => void }) {
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [head, setHead] = useState('')
    const [base, setBase] = useState(defaultBranch)
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')

    async function submit() {
        if (!title.trim() || !head || !base) { setErr('Başlık, kaynak ve hedef branch zorunlu.'); return }
        setBusy(true)
        try {
            const { data } = await axios.post(`${API_BASE}/api/github/pr/create`, { repo, title, body, head, base })
            if (data.success) { onCreated(); onClose() }
            else setErr(data.message)
        } catch (e: any) {
            setErr(e.response?.data?.message ?? 'PR oluşturulamadı.')
        } finally { setBusy(false) }
    }

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px,96vw)', background: 'rgba(8,14,24,.98)', border: '1px solid rgba(45,212,191,.2)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.8)' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <GitPullRequest size={16} weight="duotone" color="var(--teal)" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>Yeni Pull Request</span>
                    </div>
                    <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.4)' }}>
                        <X size={12} />
                    </button>
                </div>
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 11, color: 'var(--mt)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Kaynak Branch (head)</label>
                            <BranchSelector branches={branches} selected={head} onChange={setHead} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2, fontSize: 16, color: 'var(--mt)' }}>→</div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 11, color: 'var(--mt)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Hedef Branch (base)</label>
                            <BranchSelector branches={branches} selected={base} onChange={setBase} />
                        </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 11, color: 'var(--mt)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Başlık *</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="PR başlığı..." className="srch" style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, color: 'var(--mt)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Açıklama</label>
                        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Değişiklikleri açıklayın..." rows={4}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'var(--tx)', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    {err && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>⚠ {err}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={onClose} className="fbtn">İptal</button>
                        <button onClick={submit} disabled={busy}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 8, border: '1px solid rgba(74,222,128,.3)', background: 'rgba(74,222,128,.12)', color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: busy ? .6 : 1 }}>
                            {busy ? <ArrowsClockwise size={12} style={{ animation: 'rot .7s linear infinite' }} /> : <GitPullRequest size={13} weight="duotone" />}
                            Oluştur
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function GitHubPage() {
    const [repos, setRepos] = useState<Repo[]>([])
    const [selected, setSelected] = useState('')
    const [tab, setTab] = useState<Tab>('commits')
    const [commits, setCommits] = useState<Commit[]>([])
    const [prs, setPRs] = useState<PR[]>([])
    const [branches, setBranches] = useState<Branch[]>([])
    const [selBranch, setSelBranch] = useState('')
    const [prState, setPrState] = useState<'open' | 'closed' | 'all'>('open')
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [loadingR, setLoadingR] = useState(true)
    const [diffTarget, setDiffTarget] = useState<DiffTarget | null>(null)
    const [prModal, setPrModal] = useState<PR | null>(null)
    const [createPR, setCreatePR] = useState(false)
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

    function showToast(msg: string, ok: boolean) {
        setToast({ msg, ok })
        setTimeout(() => setToast(null), 3000)
    }

    useEffect(() => {
        axios.get(`${API_BASE}/api/github/repos`)
            .then(r => { setRepos(r.data); if (r.data.length > 0) setSelected(r.data[0].fullName) })
            .finally(() => setLoadingR(false))
    }, [])

    useEffect(() => {
        if (!selected) return
        setBranches([]); setSelBranch('')
        axios.get(`${API_BASE}/api/github/branches?repo=${encodeURIComponent(selected)}`)
            .then(r => {
                setBranches(r.data)
                const repo = repos.find(r => r.fullName === selected)
                setSelBranch(repo?.defaultBranch ?? r.data[0]?.name ?? '')
            })
    }, [selected])

    useEffect(() => {
        if (!selected) return
        if (tab === 'commits' && !selBranch) return
        loadTab(1)
    }, [selected, tab, selBranch, prState])

    async function loadTab(p: number) {
        setLoading(true); setPage(p)
        try {
            if (tab === 'commits') {
                const { data } = await axios.get(`${API_BASE}/api/github/commits?repo=${encodeURIComponent(selected)}&branch=${encodeURIComponent(selBranch)}&page=${p}`)
                setCommits(data)
            } else if (tab === 'prs') {
                const { data } = await axios.get(`${API_BASE}/api/github/prs?repo=${encodeURIComponent(selected)}&state=${prState}&page=${p}`)
                setPRs(data)
            }
        } finally { setLoading(false) }
    }

    async function deleteBranch(b: Branch) {
        if (b.protected) { showToast('Protected branch silinemez.', false); return }
        if (!confirm(`"${b.name}" branch'ini silmek istediğinize emin misiniz?`)) return
        try {
            await axios.delete(`${API_BASE}/api/github/branch?repo=${encodeURIComponent(selected)}&branch=${encodeURIComponent(b.name)}`)
            showToast(`"${b.name}" silindi.`, true)
            setBranches(prev => prev.filter(x => x.name !== b.name))
        } catch { showToast('Branch silinemedi.', false) }
    }

    const selectedRepo = repos.find(r => r.fullName === selected)

    return (
        <div className="page-wrap">
            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, padding: '8px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: toast.ok ? 'rgba(74,222,128,.15)' : 'rgba(248,113,113,.15)', color: toast.ok ? '#4ade80' : '#f87171', border: `1px solid ${toast.ok ? 'rgba(74,222,128,.3)' : 'rgba(248,113,113,.3)'}`, backdropFilter: 'blur(10px)', boxShadow: '0 8px 30px rgba(0,0,0,.4)' }}>
                    {toast.ok ? '✓' : '✗'} {toast.msg}
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <GithubLogo size={22} weight="fill" color="var(--teal)" />
                <div className="page-title" style={{ margin: 0 }}>GitHub</div>
            </div>
            <div className="page-sub">Repository aktivitesi, pull request'ler ve branch yönetimi</div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'start' }}>

                {/* Sol */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="card">
                        <div className="ch">
                            <div className="ct">Repositories</div>
                            <span style={{ fontSize: 11, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace' }}>{repos.length}</span>
                        </div>
                        <div style={{ padding: 6 }}>
                            {loadingR
                                ? <div className="empty-state" style={{ padding: 16 }}>Yükleniyor...</div>
                                : repos.map(r => (
                                    <button key={r.fullName} onClick={() => setSelected(r.fullName)} style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: 'none', background: selected === r.fullName ? 'var(--teal-dim)' : 'transparent', color: selected === r.fullName ? 'var(--teal)' : 'var(--tx2)', fontSize: 12, fontWeight: 600, textAlign: 'left', cursor: 'pointer', borderLeft: selected === r.fullName ? '3px solid var(--teal)' : '3px solid transparent', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                                        {r.language && <span style={{ width: 8, height: 8, borderRadius: '50%', background: LANG_COLORS[r.language] ?? '#888', flexShrink: 0 }} />}
                                    </button>
                                ))}
                        </div>
                    </div>

                    {selectedRepo && (
                        <div className="card">
                            <div style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>{selectedRepo.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace', marginBottom: 8 }}>{selectedRepo.fullName}</div>
                                {selectedRepo.description && <div style={{ fontSize: 11, color: 'var(--mt)', marginBottom: 10, lineHeight: 1.5 }}>{selectedRepo.description}</div>}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                                    {selectedRepo.language && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--mt)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: LANG_COLORS[selectedRepo.language] ?? '#888' }} />{selectedRepo.language}</div>}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--mt)' }}><Star size={11} weight="fill" color="#fbbf24" />{selectedRepo.stars}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--mt)' }}><GitFork size={11} weight="duotone" />{selectedRepo.forks}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--mt)', marginBottom: 10 }}><Clock size={11} weight="duotone" />{timeAgo(selectedRepo.updatedAt)}</div>
                                <a href={selectedRepo.htmlUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>
                                    <ArrowSquareOut size={11} /> GitHub'da Aç
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sağ */}
                <div className="card">
                    <div className="ch" style={{ flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {([
                                { id: 'commits', icon: <GitBranch size={13} weight="duotone" />, label: 'Commits' },
                                { id: 'prs', icon: <GitPullRequest size={13} weight="duotone" />, label: 'Pull Requests' },
                                { id: 'branches', icon: <GitMerge size={13} weight="duotone" />, label: 'Branches' },
                            ] as const).map(t => (
                                <button key={t.id} onClick={() => setTab(t.id)} className={`fbtn ${tab === t.id ? 'on' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                            {tab === 'commits' && branches.length > 0 && <BranchSelector branches={branches} selected={selBranch} onChange={setSelBranch} />}
                            {tab === 'prs' && (
                                <>
                                    <Select
                                        value={prState}
                                        onChange={v => setPrState(v as any)}
                                        options={[
                                            { value: 'open', label: 'Open' },
                                            { value: 'closed', label: 'Closed' },
                                            { value: 'all', label: 'All' },
                                        ]}
                                    />
                                    <button className="fbtn on" onClick={() => setCreatePR(true)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <Plus size={12} weight="bold" /> PR Oluştur
                                    </button>
                                </>
                            )}
                            <button className="fbtn" onClick={() => loadTab(page)}>
                                <ArrowsClockwise size={12} weight="bold" style={{ animation: loading ? 'rot .7s linear infinite' : 'none' }} />
                            </button>
                        </div>
                    </div>

                    {loading ? <div className="empty-state">Yükleniyor...</div> : (
                        <>
                            {/* Commits */}
                            {tab === 'commits' && (commits.length === 0
                                ? <div className="empty-state">Commit bulunamadı.</div>
                                : commits.map(c => (
                                    <div key={c.sha} onClick={() => setDiffTarget({ sha: c.sha, shortSha: c.sha, message: c.message })}
                                        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--glass-bdr)', cursor: 'pointer', transition: 'background .1s' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(45,212,191,.04)' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
                                        {c.avatar
                                            ? <img src={c.avatar} alt={c.author} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal),var(--teal3))', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#0a1a1a', flexShrink: 0 }}>{(c.author[0] ?? '?').toUpperCase()}</div>}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, color: 'var(--tx)', marginBottom: 4, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--mt)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={10} weight="duotone" />{c.author}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} weight="duotone" />{timeAgo(c.date)}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            <code style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: 'var(--teal)', background: 'var(--teal-dim)', padding: '3px 8px', borderRadius: 6 }}>{c.sha}</code>
                                            <span style={{ fontSize: 10, color: 'rgba(45,212,191,.4)' }}>diff →</span>
                                        </div>
                                    </div>
                                ))
                            )}

                            {/* PRs */}
                            {tab === 'prs' && (prs.length === 0
                                ? <div className="empty-state">Pull request bulunamadı.</div>
                                : prs.map(pr => (
                                    <div key={pr.number} onClick={() => setPrModal(pr)}
                                        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--glass-bdr)', cursor: 'pointer', transition: 'background .1s' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(45,212,191,.04)' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
                                        {pr.avatar
                                            ? <img src={pr.avatar} alt={pr.author} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.1)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{(pr.author[0] ?? '?').toUpperCase()}</div>}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                {pr.draft && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,.08)', color: 'var(--mt)' }}>Draft</span>}
                                                <span style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{pr.number} {pr.title}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--mt)', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={10} weight="duotone" />{pr.author}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><GitBranch size={10} weight="duotone" />{pr.headBranch} → {pr.baseBranch}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} weight="duotone" />{timeAgo(pr.updatedAt)}</span>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, flexShrink: 0, background: pr.state === 'open' ? 'rgba(74,222,128,.12)' : 'rgba(167,139,250,.12)', color: pr.state === 'open' ? 'var(--g)' : '#a78bfa' }}>
                                            {pr.state}
                                        </span>
                                    </div>
                                ))
                            )}

                            {/* Branches */}
                            {tab === 'branches' && (branches.length === 0
                                ? <div className="empty-state">Branch bulunamadı.</div>
                                : branches.map(b => (
                                    <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--glass-bdr)' }}>
                                        <GitBranch size={14} weight="duotone" color="var(--teal)" />
                                        <span style={{ fontSize: 13, color: 'var(--tx)', flex: 1, fontFamily: 'JetBrains Mono,monospace' }}>{b.name}</span>
                                        {b.protected && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(251,191,36,.12)', color: 'var(--y)' }}><Shield size={10} weight="fill" /> Protected</span>}
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="fbtn" style={{ fontSize: 11 }} onClick={() => { setSelBranch(b.name); setTab('commits') }}>Commitleri Gör</button>
                                            {!b.protected && (
                                                <button onClick={() => deleteBranch(b)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(248,113,113,.25)', background: 'rgba(248,113,113,.08)', color: '#f87171', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                                    <Trash size={11} weight="duotone" /> Sil
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}

                            {(tab === 'commits' || tab === 'prs') && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--glass-bdr)' }}>
                                    <button className="fbtn" disabled={page <= 1} onClick={() => loadTab(page - 1)}>← Önceki</button>
                                    <span style={{ fontSize: 12, color: 'var(--mt)' }}>Sayfa {page}</span>
                                    <button className="fbtn" onClick={() => loadTab(page + 1)}>Sonraki →</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            {diffTarget && <CommitDiffModal repoFullName={selected} sha={diffTarget.sha} shortSha={diffTarget.shortSha} message={diffTarget.message} onClose={() => setDiffTarget(null)} />}
            {prModal && <PRDetailModal pr={prModal} repoFullName={selected} onClose={() => setPrModal(null)} onRefresh={() => loadTab(1)} />}
            {createPR && selectedRepo && <CreatePRModal repo={selected} branches={branches} defaultBranch={selectedRepo.defaultBranch} onClose={() => setCreatePR(false)} onCreated={() => { loadTab(1); showToast('PR oluşturuldu!', true) }} />}
        </div>
    )
}
