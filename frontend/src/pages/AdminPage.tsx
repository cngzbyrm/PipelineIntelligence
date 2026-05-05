import { useEffect, useState } from 'react'
import {
  Users, Crown, Code, Eye, CheckCircle, XCircle,
  MagnifyingGlass, Shield
} from '@phosphor-icons/react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'

const API_BASE = import.meta.env.PROD ? 'http://194.99.74.2:8091' : ''

interface User {
  id: number
  username: string
  email: string
  fullName: string
  role: 'Admin' | 'Developer' | 'Viewer'
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

const ROLE_CONFIG = {
  Admin:     { color: '#f59e0b', bg: 'rgba(245,158,11,.12)', icon: <Crown size={12} weight="fill" /> },
  Developer: { color: '#2dd4bf', bg: 'rgba(45,212,191,.12)', icon: <Code size={12} weight="duotone" /> },
  Viewer:    { color: '#94a3b8', bg: 'rgba(148,163,184,.12)', icon: <Eye size={12} weight="duotone" /> },
}

export default function AdminPage() {
  const { user: me } = useAuthStore()
  const navigate = useNavigate()
  const [users,   setUsers]   = useState<User[]>([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'ok'|'err'; text: string } | null>(null)

  useEffect(() => {
    if (me && me.role !== 'Admin') navigate('/')
  }, [me])

  async function load() {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API_BASE}/api/auth/users`)
      setUsers(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function setRole(id: number, role: string) {
    try {
      await axios.put(`${API_BASE}/api/auth/users/${id}/role`, { role })
      setUsers(u => u.map(x => x.id === id ? { ...x, role: role as any } : x))
      setMsg({ type: 'ok', text: 'Rol güncellendi.' })
    } catch { setMsg({ type: 'err', text: 'Güncelleme başarısız.' }) }
  }

  async function toggleActive(id: number, current: boolean) {
    try {
      await axios.put(`${API_BASE}/api/auth/users/${id}/active`, { isActive: !current })
      // DB'den tekrar çek — optimistic update yerine gerçek değer
      await load()
      setMsg({ type: 'ok', text: !current ? 'Kullanıcı aktif edildi.' : 'Kullanıcı devre dışı bırakıldı.' })
    } catch { setMsg({ type: 'err', text: 'İşlem başarısız.' }) }
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.fullName || '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = [
    { label: 'Toplam',    val: users.length,                             color: 'var(--teal)', icon: <Users size={14} weight="duotone" /> },
    { label: 'Admin',     val: users.filter(u => u.role==='Admin').length, color: '#f59e0b',   icon: <Crown size={14} weight="fill" /> },
    { label: 'Aktif',     val: users.filter(u => u.isActive).length,      color: 'var(--g)',   icon: <CheckCircle size={14} weight="fill" /> },
  ]

  return (
    <div className="page-wrap">
      <PageHeader
        icon={<Shield size={22} weight="duotone" />}
        kicker="Yönetim"
        title="Admin paneli"
        subtitle="Kullanıcı yönetimi ve rol atamaları"
      />

      {/* Stats */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ flex:1, background:'var(--glass)', border:'1px solid var(--glass-bdr)', borderRadius:10, padding:'14px 16px', backdropFilter:'blur(16px)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              <span style={{ color:s.color }}>{s.icon}</span>
              <span style={{ fontSize:10, fontWeight:600, color:'var(--mt)', textTransform:'uppercase', letterSpacing:'.07em' }}>{s.label}</span>
            </div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color, fontFamily:'JetBrains Mono,monospace' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Mesaj */}
      {msg && (
        <div onClick={() => setMsg(null)} style={{
          marginBottom:12, padding:'10px 14px', borderRadius:8, fontSize:13, cursor:'pointer',
          background: msg.type==='ok' ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)',
          color: msg.type==='ok' ? 'var(--g)' : 'var(--r)',
          border:`1px solid ${msg.type==='ok' ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'}`,
        }}>
          {msg.text} <span style={{ opacity:.5, fontSize:11 }}>(kapat)</span>
        </div>
      )}

      {/* Tablo */}
      <div className="card">
        <div className="ch">
          <div className="ct" style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Users size={13} weight="duotone" color="var(--teal)" />
            Kullanıcılar ({filtered.length})
          </div>
          <div style={{ position:'relative' }}>
            <MagnifyingGlass size={13} weight="duotone" color="var(--mt)" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }} />
            <input className="srch" style={{ paddingLeft:30, width:200 }} placeholder="Kullanıcı ara..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Yükleniyor...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Son Giriş</th>
                <th>Kayıt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const rc    = ROLE_CONFIG[u.role]
                const isMe  = u.id === me?.id
                return (
                  <tr key={u.id}>
                    {/* Kullanıcı */}
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#2dd4bf,#0d9488)', display:'grid', placeItems:'center', fontSize:12, fontWeight:700, color:'#0a1a1a', flexShrink:0 }}>
                          {(u.fullName||u.username)[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--tx)' }}>
                            {u.fullName || u.username}
                            {isMe && <span style={{ fontSize:10, marginLeft:6, color:'var(--teal)', background:'rgba(45,212,191,.1)', padding:'1px 6px', borderRadius:10 }}>sen</span>}
                          </div>
                          <div style={{ fontSize:11, color:'var(--mt)', fontFamily:'JetBrains Mono,monospace' }}>@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td><span style={{ fontSize:12, color:'var(--mt)', fontFamily:'JetBrains Mono,monospace' }}>{u.email}</span></td>

                    {/* Rol */}
                    <td>
                      {isMe ? (
                        <span className="badge" style={{ background:rc.bg, color:rc.color }}>
                          {rc.icon} {u.role}
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={e => setRole(u.id, e.target.value)}
                          style={{ padding:'4px 8px', borderRadius:6, border:`1px solid ${rc.color}40`, background:rc.bg, color:rc.color, fontSize:12, fontWeight:600, cursor:'pointer', outline:'none' }}
                        >
                          <option value="Admin">Admin</option>
                          <option value="Developer">Developer</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      )}
                    </td>

                    {/* Durum — tıklanabilir toggle */}
                    <td>
                      {isMe ? (
                        <span className="badge b-success"><CheckCircle size={10} weight="fill" /> Aktif</span>
                      ) : (
                        <button
                          onClick={() => toggleActive(u.id, u.isActive)}
                          style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}
                          title={u.isActive ? 'Devre dışı bırak' : 'Aktif et'}
                        >
                          {u.isActive
                            ? <span className="badge b-success" style={{ cursor:'pointer' }}><CheckCircle size={10} weight="fill" /> Aktif</span>
                            : <span className="badge b-fail" style={{ cursor:'pointer' }}><XCircle size={10} weight="fill" /> Pasif</span>}
                        </button>
                      )}
                    </td>

                    {/* Son giriş */}
                    <td><span className="dur">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('tr-TR') : '—'}</span></td>

                    {/* Kayıt */}
                    <td><span className="dur">{new Date(u.createdAt).toLocaleDateString('tr-TR')}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
