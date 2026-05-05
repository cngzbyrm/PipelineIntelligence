import { useEffect, useState } from 'react'
import {
  ClipboardText, CheckCircle, XCircle, ArrowClockwise,
  Lightning, StopCircle, Brain, Gear, Bell, Note, Trash
} from '@phosphor-icons/react'
import { dashboardApi } from '../services/api'
import { PipelineLoaderInline } from '../components/ui/PipelineLoader'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import type { AuditLog } from '../types'
import PageHeader from '../components/layout/PageHeader'

const ACTION_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  TRIGGER:       { icon: <Lightning size={12} weight="fill" />,         color: 'var(--g)',    label: 'Tetiklendi'   },
  STOP:          { icon: <StopCircle size={12} weight="fill" />,         color: 'var(--r)',    label: 'Durduruldu'   },
  ANALYZE:       { icon: <Brain size={12} weight="duotone" />,     color: 'var(--y)',    label: 'AI Analiz'    },
  CONFIG_UPDATE: { icon: <Gear size={12} weight="duotone" />,      color: 'var(--b)',    label: 'Ayar'         },
  NOTE_ADD:      { icon: <Note size={12} weight="duotone" />,      color: 'var(--teal)', label: 'Not'          },
  WEBHOOK_SEND:  { icon: <Bell size={12} weight="duotone" />,      color: 'var(--mt)',   label: 'Webhook'      },
  NEXUS_DELETE:  { icon: <Trash size={12} weight="bold" />,        color: 'var(--r)',    label: 'Nexus Silme'  },
}

function timeAgo(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (d < 60)    return `${d}s önce`
  if (d < 3600)  return `${Math.floor(d / 60)}dk önce`
  if (d < 86400) return `${Math.floor(d / 3600)}sa önce`
  return new Date(ts).toLocaleDateString('tr-TR')
}

export default function AuditPage() {
  const [logs,    setLogs]    = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<string>('ALL')
  const [search,  setSearch]  = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await dashboardApi.getAuditLog(200)
      setLogs(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const actions = ['ALL', ...Array.from(new Set(logs.map(l => l.action)))]
  const filtered = logs.filter(l => {
    if (filter !== 'ALL' && l.action !== filter) return false
    if (search && !l.target.toLowerCase().includes(search.toLowerCase()) && !l.detail.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const { page, paged, total, setPage, reset } = usePagination(filtered, 10)
  useEffect(() => { reset() }, [filter, search])

  const successCount = logs.filter(l => l.success).length
  const failCount    = logs.filter(l => !l.success).length

  return (
    <div className="page-wrap">
      <PageHeader
        icon={<ClipboardText size={22} weight="duotone" />}
        kicker="Denetim"
        title="Aktivite logu"
        subtitle="Kim ne zaman ne yaptı — tüm dashboard aksiyonları"
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <div className="sc"><div className="slbl">Toplam</div><div className="sval">{logs.length}</div><div className="ssub">kayıt</div></div>
        <div className="sc sg"><div className="slbl">Başarılı</div><div className="sval">{successCount}</div></div>
        <div className="sc sr"><div className="slbl">Başarısız</div><div className="sval">{failCount}</div></div>
        <div className="sc"><div className="slbl">Bugün</div><div className="sval sb">{logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length}</div></div>
      </div>

      {/* Filter Bar */}
      <div className="fbar">
        {actions.map(a => (
          <button key={a} className={`fbtn ${filter === a ? 'on' : ''}`} onClick={() => setFilter(a)}>
            {a === 'ALL' ? 'Tümü' : (ACTION_META[a]?.label ?? a)}
          </button>
        ))}
        <input
          className="srch"
          placeholder="Ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 'auto', maxWidth: 220 }}
        />
        <button className="btn btn-g btn-sm" onClick={load}>
          <ArrowClockwise size={13} weight="bold" /> Yenile
        </button>
      </div>

      <div className="card" style={{ position: "relative" }}>
        {loading ? (
          <PipelineLoaderInline message="fetching audit logs..." />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <ClipboardText size={36} weight="duotone" style={{ opacity: .4, marginBottom: 8 }} />
            Kayıt bulunamadı.
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>İşlem</th>
                  <th>Hedef</th>
                  <th>Detay</th>
                  <th>Kullanıcı</th>
                  <th>Durum</th>
                  <th>Zaman</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(l => {
                  const meta = ACTION_META[l.action] ?? { icon: null, color: 'var(--mt)', label: l.action }
                  return (
                    <tr key={l.id}>
                      <td>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: meta.color + '18', display: 'grid', placeItems: 'center', color: meta.color }}>
                          {meta.icon}
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: meta.color + '15', color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td><span style={{ fontSize: 13, fontWeight: 600 }}>{l.target}</span></td>
                      <td>
                        <span style={{ fontSize: 11, color: 'var(--mt)', fontFamily: 'DM Mono,monospace' }}>
                          {l.detail?.length > 60 ? l.detail.substring(0, 60) + '...' : l.detail || '—'}
                        </span>
                      </td>
                      <td><span className="dur">{l.user}</span></td>
                      <td>
                        {l.success
                          ? <span className="badge b-success"><CheckCircle size={10} weight="fill" /> OK</span>
                          : <span className="badge b-fail"><XCircle size={10} weight="fill" /> Hata</span>}
                      </td>
                      <td><span className="dur">{timeAgo(l.createdAt)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pagination page={page} total={total} pageSize={10} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
