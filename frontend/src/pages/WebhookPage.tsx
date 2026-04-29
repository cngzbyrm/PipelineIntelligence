import { useEffect, useState } from 'react'
import { Bell, Plus, Trash, PaperPlaneTilt, PencilSimple, CheckCircle, XCircle } from '@phosphor-icons/react'
import { dashboardApi } from '../services/api'
import { toast } from '../components/ui'
import type { WebhookConfig } from '../types'

const EVENT_OPTIONS = [
  { key: 'failure',  label: 'Build Başarısız' },
  { key: 'success',  label: 'Build Başarılı'  },
  { key: 'trigger',  label: 'Build Tetiklendi' },
  { key: 'analyze',  label: 'AI Analiz'        },
]

const emptyForm = { name: '', url: '', type: 'teams', events: 'failure', active: true }

export default function WebhookPage() {
  const [hooks,    setHooks]    = useState<WebhookConfig[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState<number | null>(null)
  const [form,     setForm]     = useState(emptyForm)
  const [saving,   setSaving]   = useState(false)

  async function load() {
    const res = await dashboardApi.getWebhooks()
    setHooks(res.data)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(w: WebhookConfig) {
    setEditId(w.id)
    setForm({ name: w.name, url: w.url, type: w.type, events: w.events, active: w.active })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.url) { toast('Ad ve URL zorunlu', 'var(--r)'); return }
    setSaving(true)
    try {
      if (editId) {
        await dashboardApi.updateWebhook(editId, form)
        toast('Webhook güncellendi', 'var(--g)')
      } else {
        await dashboardApi.addWebhook(form)
        toast('Webhook eklendi', 'var(--g)')
      }
      setShowForm(false)
      load()
    } catch { toast('Kaydetme başarısız', 'var(--r)') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`"${name}" silinsin mi?`)) return
    await dashboardApi.deleteWebhook(id)
    toast('Webhook silindi')
    load()
  }

  async function handleTest(id: number) {
    try {
      await dashboardApi.testWebhook(id)
      toast('Test bildirimi gönderildi ✓', 'var(--g)')
    } catch { toast('Test başarısız', 'var(--r)') }
  }

  function toggleEvent(key: string) {
    const current = form.events.split(',').filter(Boolean)
    const next    = current.includes(key) ? current.filter(e => e !== key) : [...current, key]
    setForm(f => ({ ...f, events: next.join(',') || 'failure' }))
  }

  return (
    <div className="page-wrap">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="page-title">
          <Bell size={22} weight="duotone" style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--teal)' }} />
          Webhook Yönetimi
        </div>
        <button className="btn btn-p" onClick={openNew}>
          <Plus size={14} weight="bold" /> Yeni Webhook
        </button>
      </div>
      <div className="page-sub">Teams, Slack veya özel URL'lere build bildirimleri gönder</div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid var(--teal)', boxShadow: '0 0 0 3px rgba(15,139,141,.08)' }}>
          <div className="ch" style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy3))' }}>
            <div className="ct" style={{ color: '#fff' }}>{editId ? 'Webhook Düzenle' : 'Yeni Webhook Ekle'}</div>
            <button className="mc" style={{ color: 'rgba(255,255,255,.5)' }} onClick={() => setShowForm(false)}>✕</button>
          </div>
          <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="fg">
              <label className="fl">Ad</label>
              <input className="fi" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Teams - Build Bildirimleri" />
            </div>
            <div className="fg">
              <label className="fl">Tip</label>
              <select className="fi" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                <option value="teams">Microsoft Teams</option>
                <option value="slack">Slack</option>
                <option value="custom">Custom (JSON POST)</option>
              </select>
            </div>
            <div className="fg" style={{ gridColumn: '1/-1' }}>
              <label className="fl">Webhook URL</label>
              <input className="fi" value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))} placeholder="https://outlook.office.com/webhook/..." />
            </div>
            <div className="fg" style={{ gridColumn: '1/-1' }}>
              <label className="fl">Tetikleyici Olaylar</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {EVENT_OPTIONS.map(ev => {
                  const active = form.events.split(',').includes(ev.key)
                  return (
                    <button
                      key={ev.key}
                      className={`fbtn ${active ? 'on' : ''}`}
                      onClick={() => toggleEvent(ev.key)}
                      style={{ fontSize: 12 }}
                    >
                      {ev.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="fg">
              <label className="fl">Aktif</label>
              <label className="tg" style={{ marginTop: 4 }}>
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({...f, active: e.target.checked}))} />
                <span className="tgs" />
              </label>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={() => setShowForm(false)}>İptal</button>
            <button className="btn btn-p" onClick={handleSave} disabled={saving}>
              {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </div>
      )}

      {/* Webhook List */}
      {hooks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Bell size={36} weight="duotone" style={{ opacity: .4, marginBottom: 8 }} />
            Henüz webhook eklenmemiş.<br />
            <button className="btn btn-p btn-sm" style={{ marginTop: 12 }} onClick={openNew}>
              <Plus size={13} /> İlk webhook'u ekle
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hooks.map(w => (
            <div key={w.id} className="card" style={{ opacity: w.active ? 1 : .55 }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: w.type === 'teams' ? '#0078d4' : w.type === 'slack' ? '#4a154b' : 'var(--teal)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Bell size={18} weight="duotone" color="#fff" />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {w.name}
                    {w.active
                      ? <CheckCircle size={14} weight="fill" color="var(--g)" />
                      : <XCircle size={14} weight="fill" color="var(--r)" />}
                    <span className="badge b-neutral" style={{ fontSize: 10 }}>{w.type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mt)', fontFamily: 'DM Mono,monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.url}
                  </div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                    {w.events.split(',').filter(Boolean).map(e => (
                      <span key={e} className="badge b-neutral" style={{ fontSize: 10 }}>
                        {EVENT_OPTIONS.find(x => x.key === e)?.label ?? e}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="acell">
                  <button className="ab" onClick={() => handleTest(w.id)}>
                    <PaperPlaneTilt size={12} weight="duotone" /> Test
                  </button>
                  <button className="ab" onClick={() => openEdit(w)}>
                    <PencilSimple size={12} weight="duotone" /> Düzenle
                  </button>
                  <button className="ab dng" onClick={() => handleDelete(w.id, w.name)}>
                    <Trash size={12} weight="bold" /> Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
