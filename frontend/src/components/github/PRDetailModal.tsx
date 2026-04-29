import { useEffect, useState } from 'react'
import {
  X, GitMerge, GitPullRequest, XCircle, ChatText,
  ArrowSquareOut, User, Clock, PaperPlaneTilt,
  CheckCircle, Warning, ArrowsClockwise
} from '@phosphor-icons/react'
import axios from 'axios'

const API_BASE = import.meta.env.PROD ? 'http://194.99.74.2:8091' : ''

interface PR {
  number: number; title: string; state: string; author: string
  avatar: string; headBranch: string; baseBranch: string
  createdAt: string; updatedAt: string; htmlUrl: string; draft: boolean
}

interface Comment {
  id: number; body: string; author: string; avatar: string; createdAt: string
}

interface Props {
  pr: PR
  repoFullName: string
  onClose: () => void
  onRefresh: () => void
}

function timeAgo(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60)    return `${diff}s önce`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m önce`
  if (diff < 86400) return `${Math.floor(diff / 3600)}s önce`
  return `${Math.floor(diff / 86400)}g önce`
}

export default function PRDetailModal({ pr, repoFullName, onClose, onRefresh }: Props) {
  const [comments,    setComments]    = useState<Comment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [newComment,  setNewComment]  = useState('')
  const [mergeMethod, setMergeMethod] = useState<'merge'|'squash'|'rebase'>('merge')
  const [busy,        setBusy]        = useState(false)
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    axios.get(`${API_BASE}/api/github/pr/comments?repo=${encodeURIComponent(repoFullName)}&number=${pr.number}`)
      .then(r => setComments(r.data))
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleMerge() {
    if (!confirm(`#${pr.number} PR'ı merge etmek istediğinize emin misiniz?`)) return
    setBusy(true)
    try {
      await axios.post(`${API_BASE}/api/github/pr/merge`, {
        repo: repoFullName, number: pr.number,
        commitTitle: pr.title, mergeMethod,
      })
      showToast('PR başarıyla merge edildi!', true)
      onRefresh()
      setTimeout(onClose, 1500)
    } catch (e: any) {
      showToast(e.response?.data?.message ?? 'Merge başarısız.', false)
    } finally { setBusy(false) }
  }

  async function handleClose() {
    if (!confirm(`#${pr.number} PR'ı kapatmak istediğinize emin misiniz?`)) return
    setBusy(true)
    try {
      await axios.post(`${API_BASE}/api/github/pr/close`, { repo: repoFullName, number: pr.number })
      showToast('PR kapatıldı.', true)
      onRefresh()
      setTimeout(onClose, 1500)
    } catch {
      showToast('PR kapatılamadı.', false)
    } finally { setBusy(false) }
  }

  async function handleComment() {
    if (!newComment.trim()) return
    setBusy(true)
    try {
      await axios.post(`${API_BASE}/api/github/pr/comment`, {
        repo: repoFullName, number: pr.number, body: newComment,
      })
      setNewComment('')
      showToast('Yorum eklendi.', true)
      // Yorumları yenile
      const { data } = await axios.get(`${API_BASE}/api/github/pr/comments?repo=${encodeURIComponent(repoFullName)}&number=${pr.number}`)
      setComments(data)
    } catch {
      showToast('Yorum eklenemedi.', false)
    } finally { setBusy(false) }
  }

  const isOpen = pr.state === 'open'

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:800, background:'rgba(0,0,0,.8)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width:'min(780px,96vw)', maxHeight:'90vh', background:'rgba(6,12,20,.98)', border:'1px solid rgba(45,212,191,.15)', borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 32px 100px rgba(0,0,0,.9)' }}>

        {/* Toast */}
        {toast && (
          <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', zIndex:10, padding:'8px 18px', borderRadius:20, fontSize:12, fontWeight:700, background: toast.ok ? 'rgba(74,222,128,.15)' : 'rgba(248,113,113,.15)', color: toast.ok ? '#4ade80' : '#f87171', border:`1px solid ${toast.ok ? 'rgba(74,222,128,.3)' : 'rgba(248,113,113,.3)'}`, backdropFilter:'blur(10px)' }}>
            {toast.ok ? '✓' : '✗'} {toast.msg}
          </div>
        )}

        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.07)', background:'rgba(45,212,191,.03)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background: isOpen ? 'rgba(74,222,128,.1)' : 'rgba(167,139,250,.1)', border:`1px solid ${isOpen ? 'rgba(74,222,128,.2)' : 'rgba(167,139,250,.2)'}`, display:'grid', placeItems:'center', flexShrink:0 }}>
              <GitPullRequest size={18} weight="duotone" color={isOpen ? '#4ade80' : '#a78bfa'} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#e2f0ef', marginBottom:4 }}>#{pr.number} {pr.title}</div>
              <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:11, color:'rgba(255,255,255,.4)', flexWrap:'wrap' }}>
                {pr.avatar && <img src={pr.avatar} style={{ width:16, height:16, borderRadius:'50%' }} />}
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><User size={10} weight="duotone" />{pr.author}</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={10} weight="duotone" />{timeAgo(pr.createdAt)}</span>
                <code style={{ fontSize:10, fontFamily:'JetBrains Mono,monospace', color:'var(--teal)', background:'var(--teal-dim)', padding:'1px 6px', borderRadius:4 }}>
                  {pr.headBranch} → {pr.baseBranch}
                </code>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background: isOpen ? 'rgba(74,222,128,.12)' : 'rgba(167,139,250,.12)', color: isOpen ? '#4ade80' : '#a78bfa' }}>
                  {pr.state}
                </span>
              </div>
            </div>
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              <a href={pr.htmlUrl} target="_blank" rel="noreferrer"
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, border:'1px solid rgba(45,212,191,.25)', background:'rgba(45,212,191,.08)', color:'var(--teal)', fontSize:11, fontWeight:600, textDecoration:'none' }}>
                <ArrowSquareOut size={12} /> GitHub
              </a>
              <button onClick={onClose} style={{ width:28, height:28, borderRadius:7, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', cursor:'pointer', display:'grid', placeItems:'center', color:'rgba(255,255,255,.4)' }}>
                <X size={13} weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {/* Actions — sadece açık PR için */}
        {isOpen && (
          <div style={{ padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.02)', flexShrink:0, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.4)', fontWeight:600 }}>İşlemler:</span>

            {/* Merge method */}
            <select className="sel" value={mergeMethod} onChange={e => setMergeMethod(e.target.value as any)}>
              <option value="merge">Merge commit</option>
              <option value="squash">Squash & merge</option>
              <option value="rebase">Rebase & merge</option>
            </select>

            {/* Merge */}
            <button
              onClick={handleMerge}
              disabled={busy}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, border:'1px solid rgba(74,222,128,.3)', background:'rgba(74,222,128,.1)', color:'#4ade80', fontSize:12, fontWeight:700, cursor:'pointer' }}
            >
              {busy ? <ArrowsClockwise size={12} weight="bold" style={{ animation:'rot .7s linear infinite' }} /> : <GitMerge size={13} weight="duotone" />}
              Merge
            </button>

            {/* Kapat */}
            <button
              onClick={handleClose}
              disabled={busy}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, border:'1px solid rgba(248,113,113,.3)', background:'rgba(248,113,113,.1)', color:'#f87171', fontSize:12, fontWeight:700, cursor:'pointer' }}
            >
              <XCircle size={13} weight="duotone" /> Kapat
            </button>
          </div>
        )}

        {/* Yorumlar */}
        <div style={{ flex:1, overflow:'auto', padding:'16px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <ChatText size={14} weight="duotone" color="var(--teal)" />
            <span style={{ fontSize:12, fontWeight:700, color:'var(--tx)' }}>Yorumlar ({comments.length})</span>
          </div>

          {loading ? (
            <div className="empty-state">Yükleniyor...</div>
          ) : comments.length === 0 ? (
            <div className="empty-state" style={{ padding:'20px 0' }}>Henüz yorum yok.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
              {comments.map(c => (
                <div key={c.id} style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)' }}>
                  {c.avatar
                    ? <img src={c.avatar} style={{ width:32, height:32, borderRadius:'50%', flexShrink:0 }} />
                    : <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal),var(--teal3))', display:'grid', placeItems:'center', fontSize:13, fontWeight:800, color:'#0a1a1a', flexShrink:0 }}>
                        {(c.author[0] ?? '?').toUpperCase()}
                      </div>}
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--tx)' }}>{c.author}</span>
                      <span style={{ fontSize:10, color:'var(--mt)' }}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--tx2)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Yorum yaz */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--mt)', marginBottom:8 }}>Yorum Ekle</div>
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Yorumunuzu yazın..."
              rows={3}
              style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.04)', color:'var(--tx)', fontSize:12, resize:'vertical', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
            />
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
              <button
                onClick={handleComment}
                disabled={busy || !newComment.trim()}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8, border:'1px solid rgba(45,212,191,.3)', background:'rgba(45,212,191,.1)', color:'var(--teal)', fontSize:12, fontWeight:700, cursor:'pointer', opacity: (!newComment.trim() || busy) ? .5 : 1 }}
              >
                {busy ? <ArrowsClockwise size={12} style={{ animation:'rot .7s linear infinite' }} /> : <PaperPlaneTilt size={13} weight="duotone" />}
                Gönder
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding:'8px 20px', borderTop:'1px solid rgba(255,255,255,.05)', fontSize:10, color:'rgba(255,255,255,.2)', display:'flex', justifyContent:'space-between', fontFamily:'JetBrains Mono,monospace', flexShrink:0 }}>
          <span>{repoFullName}</span>
          <span>ESC · kapat</span>
        </div>
      </div>
    </div>
  )
}
