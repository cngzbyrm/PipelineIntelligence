import { useEffect, useState } from 'react'
import {
  X, ArrowSquareOut, Plus, Minus, File,
  GitCommit, User, Clock, ArrowsClockwise
} from '@phosphor-icons/react'
import axios from 'axios'

const API_BASE = import.meta.env.PROD ? 'http://194.99.74.2:8091' : ''

interface FileDiff {
  filename: string
  status: string
  additions: number
  deletions: number
  patch: string
}

interface CommitDetail {
  sha: string
  shortSha: string
  message: string
  author: string
  date: string
  avatar: string
  htmlUrl: string
  additions: number
  deletions: number
  total: number
  files: FileDiff[]
}

interface Props {
  repoFullName: string
  sha: string
  shortSha: string
  message: string
  onClose: () => void
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

const STATUS_COLOR: Record<string, string> = {
  added: '#4ade80', removed: '#f87171', modified: '#60a5fa',
  renamed: '#fbbf24', copied: '#a78bfa',
}

function DiffLine({ line }: { line: string }) {
  const isAdd = line.startsWith('+') && !line.startsWith('+++')
  const isDel = line.startsWith('-') && !line.startsWith('---')
  const isHdr = line.startsWith('@@')

  let bg = 'transparent'
  let color = 'rgba(255,255,255,.55)'
  let borderLeft = '3px solid transparent'

  if (isAdd) { bg = 'rgba(74,222,128,.08)';  color = '#86efac'; borderLeft = '3px solid rgba(74,222,128,.4)' }
  if (isDel) { bg = 'rgba(248,113,113,.08)'; color = '#fca5a5'; borderLeft = '3px solid rgba(248,113,113,.4)' }
  if (isHdr) { bg = 'rgba(96,165,250,.06)';  color = '#93c5fd'; borderLeft = '3px solid rgba(96,165,250,.3)' }

  return (
    <div style={{
      display: 'flex', background: bg, borderLeft, minHeight: 20,
    }}>
      <div style={{ width: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isAdd && <Plus  size={10} weight="bold" color="#4ade80" />}
        {isDel && <Minus size={10} weight="bold" color="#f87171" />}
      </div>
      <pre style={{
        margin: 0, padding: '1px 12px 1px 4px', fontSize: 12, fontFamily: 'JetBrains Mono,monospace',
        color, whiteSpace: 'pre-wrap', wordBreak: 'break-all', flex: 1, lineHeight: 1.7,
      }}>
        {line}
      </pre>
    </div>
  )
}

function FilePanel({ file, index }: { file: FileDiff; index: number }) {
  const [open, setOpen] = useState(index < 3)
  const lines = file.patch ? file.patch.split('\n') : []
  const statusColor = STATUS_COLOR[file.status] ?? '#94a3b8'
  const ext = file.filename.split('.').pop() ?? ''

  return (
    <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      {/* File header */}
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,.04)', cursor: 'pointer' }}
      >
        <File size={13} weight="duotone" color="var(--teal)" />
        <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: 'var(--tx)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.filename}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${statusColor}15`, color: statusColor, flexShrink: 0 }}>
          {file.status}
        </span>
        {file.additions > 0 && (
          <span style={{ fontSize: 11, color: '#4ade80', fontFamily: 'JetBrains Mono,monospace', flexShrink: 0 }}>+{file.additions}</span>
        )}
        {file.deletions > 0 && (
          <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'JetBrains Mono,monospace', flexShrink: 0 }}>-{file.deletions}</span>
        )}
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Diff lines */}
      {open && (
        <div style={{ background: '#010d14', overflowX: 'auto' }}>
          {lines.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,.3)', fontStyle: 'italic' }}>
              Binary file veya diff yok
            </div>
          ) : (
            lines.map((line, i) => <DiffLine key={i} line={line} />)
          )}
        </div>
      )}
    </div>
  )
}

export default function CommitDiffModal({ repoFullName, sha, shortSha, message, onClose }: Props) {
  const [detail,  setDetail]  = useState<CommitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    axios.get(`${API_BASE}/api/github/commit`, { params: { repo: repoFullName, sha } })
      .then(r => setDetail(r.data))
      .catch(() => setError('Commit detayı yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  const filteredFiles = detail?.files.filter(f =>
    !search || f.filename.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(1000px,96vw)', maxHeight: '90vh', background: 'rgba(6,12,20,.98)', border: '1px solid rgba(45,212,191,.15)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,.9)' }}
      >
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(45,212,191,.03)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(45,212,191,.1)', border: '1px solid rgba(45,212,191,.2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <GitCommit size={18} weight="duotone" color="var(--teal)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2f0ef', lineHeight: 1.4, marginBottom: 6 }}>{message}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {detail?.avatar && (
                  <img src={detail.avatar} style={{ width: 18, height: 18, borderRadius: '50%' }} />
                )}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <User size={10} weight="duotone" /> {detail?.author ?? '...'}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} weight="duotone" /> {detail ? timeAgo(detail.date) : '...'}
                </span>
                <code style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: 'var(--teal)', background: 'var(--teal-dim)', padding: '2px 7px', borderRadius: 5 }}>
                  {shortSha}
                </code>
                {detail && (
                  <>
                    <span style={{ fontSize: 11, color: '#4ade80' }}>+{detail.additions}</span>
                    <span style={{ fontSize: 11, color: '#f87171' }}>-{detail.deletions}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>{detail.files.length} dosya</span>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {detail && (
                <a href={detail.htmlUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(45,212,191,.25)', background: 'rgba(45,212,191,.08)', color: 'var(--teal)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                  <ArrowSquareOut size={12} /> GitHub
                </a>
              )}
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.4)' }}>
                <X size={13} weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        {detail && detail.files.length > 3 && (
          <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
            <input
              className="srch"
              placeholder="Dosya ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', maxWidth: 300 }}
            />
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 60, color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
              <ArrowsClockwise size={18} weight="bold" color="var(--teal)" style={{ animation: 'rot .7s linear infinite' }} />
              Diff yükleniyor...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#f87171', fontSize: 13 }}>{error}</div>
          ) : filteredFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.3)', fontSize: 13 }}>Dosya bulunamadı.</div>
          ) : (
            filteredFiles.map((f, i) => <FilePanel key={f.filename} file={f} index={i} />)
          )}
        </div>

        <div style={{ padding: '8px 20px', borderTop: '1px solid rgba(255,255,255,.05)', fontSize: 10, color: 'rgba(255,255,255,.2)', display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono,monospace', flexShrink: 0 }}>
          <span>{repoFullName}</span>
          <span>ESC · kapat</span>
        </div>
      </div>
    </div>
  )
}
