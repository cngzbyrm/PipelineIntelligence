import { useState } from 'react'
import { User, Lock, Shield, SignOut, Camera, Bell } from '@phosphor-icons/react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.PROD ? 'http://194.99.74.2:8091' : ''

const ROLE_COLORS: Record<string, string> = {
  Admin:     '#f59e0b',
  Developer: 'var(--teal)',
  Viewer:    'var(--mt)',
}

export default function ProfilePage() {
  const { user, logout, updateUser, setNotifPref } = useAuthStore()
  const navigate = useNavigate()
  const [tab, setTab]     = useState<'profile'|'password'|'security'>('profile')
  const [form, setForm]   = useState({ fullName: user?.fullName ?? '', avatarUrl: user?.avatarUrl ?? '' })
  const [pw, setPw]       = useState({ current: '', new: '', confirm: '' })
  const [msg, setMsg]     = useState<{ type: 'ok'|'err'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg(null)
    try {
      const { data } = await axios.put(`${API_BASE}/api/auth/profile`, { fullName: form.fullName, avatarUrl: form.avatarUrl || null })
      updateUser({ ...user!, ...data })
      setMsg({ type: 'ok', text: 'Profil güncellendi.' })
    } catch { setMsg({ type: 'err', text: 'Güncelleme başarısız.' }) }
    finally { setLoading(false) }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setMsg(null)
    if (pw.new !== pw.confirm) return setMsg({ type: 'err', text: 'Şifreler eşleşmiyor.' })
    if (pw.new.length < 6) return setMsg({ type: 'err', text: 'Şifre en az 6 karakter.' })
    setLoading(true)
    try {
      await axios.put(`${API_BASE}/api/auth/password`, { current: pw.current, new: pw.new })
      setMsg({ type: 'ok', text: 'Şifre değiştirildi.' })
      setPw({ current: '', new: '', confirm: '' })
    } catch (err: any) {
      setMsg({ type: 'err', text: err.response?.data?.error || 'Hata oluştu.' })
    } finally { setLoading(false) }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="page-wrap">
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
        <User size={22} weight="duotone" color="var(--teal)" />
        <div className="page-title" style={{ margin:0 }}>Profil</div>
      </div>
      <div className="page-sub">Hesap bilgileri ve güvenlik ayarları</div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:16, alignItems:'start' }}>

        {/* Sol panel */}
        <div className="card">
          <div style={{ padding:24, textAlign:'center', borderBottom:'1px solid var(--glass-bdr)' }}>
            <div style={{ position:'relative', display:'inline-block', marginBottom:12 }}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="avatar" style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--teal-bdr)' }} />
                : <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal),var(--teal3))', display:'grid', placeItems:'center', fontSize:28, fontWeight:700, color:'#0a1a1a', margin:'0 auto' }}>
                    {user?.fullName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
                  </div>}
              <div style={{ position:'absolute', bottom:0, right:0, width:22, height:22, borderRadius:'50%', background:'var(--teal)', display:'grid', placeItems:'center', cursor:'pointer' }}>
                <Camera size={12} weight="fill" color="#0a1a1a" />
              </div>
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--tx)' }}>{user?.fullName || user?.username}</div>
            <div style={{ fontSize:12, color:'var(--mt)', marginBottom:8 }}>@{user?.username}</div>
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background: ROLE_COLORS[user?.role ?? ''] + '20', color: ROLE_COLORS[user?.role ?? ''] }}>
              {user?.role}
            </span>
          </div>

          <nav style={{ padding:8 }}>
            {[
              { id:'profile',  icon:<User size={15} weight="duotone" />,   label:'Profil'  },
              { id:'password', icon:<Lock size={15} weight="duotone" />,   label:'Şifre'   },
              { id:'security', icon:<Shield size={15} weight="duotone" />, label:'Güvenlik'},
            ].map(item => (
              <button key={item.id} onClick={() => { setTab(item.id as any); setMsg(null) }} style={{
                width:'100%', padding:'10px 14px', borderRadius:8, border:'none', cursor:'pointer',
                display:'flex', alignItems:'center', gap:10, fontSize:13, fontWeight:500,
                background: tab === item.id ? 'var(--teal-dim)' : 'transparent',
                color: tab === item.id ? 'var(--teal)' : 'var(--mt)',
              }}>
                {item.icon} {item.label}
              </button>
            ))}
            <div style={{ borderTop:'1px solid var(--glass-bdr)', margin:'8px 0' }} />
            <button onClick={handleLogout} style={{
              width:'100%', padding:'10px 14px', borderRadius:8, border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', gap:10, fontSize:13, fontWeight:500,
              background:'transparent', color:'var(--r)',
            }}>
              <SignOut size={15} weight="duotone" /> Çıkış Yap
            </button>
          </nav>
        </div>

        {/* Sağ panel */}
        <div className="card">
          <div className="ch">
            <div className="ct">
              {tab === 'profile' ? 'Profil Bilgileri' : tab === 'password' ? 'Şifre Değiştir' : 'Güvenlik'}
            </div>
          </div>
          <div style={{ padding:24 }}>

            {msg && (
              <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, fontSize:13,
                background: msg.type === 'ok' ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)',
                color: msg.type === 'ok' ? 'var(--g)' : 'var(--r)',
                border: `1px solid ${msg.type === 'ok' ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'}`,
              }}>
                {msg.text}
              </div>
            )}

            {tab === 'profile' && (
              <form onSubmit={saveProfile} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div className="fg">
                  <label className="fl">Ad Soyad</label>
                  <input className="fi" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Adınız Soyadınız" />
                </div>
                <div className="fg">
                  <label className="fl">Avatar URL</label>
                  <input className="fi" value={form.avatarUrl} onChange={e => set('avatarUrl', e.target.value)} placeholder="https://..." />
                  <div className="fh">Profil fotoğrafı için URL girin</div>
                </div>
                <div className="fg">
                  <label className="fl">Email</label>
                  <input className="fi" value={user?.email} disabled style={{ opacity:.5 }} />
                  <div className="fh">Email değiştirilemez</div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-p" style={{ alignSelf:'flex-start' }}>
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </form>
            )}

            {tab === 'password' && (
              <form onSubmit={changePassword} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div className="fg">
                  <label className="fl">Mevcut Şifre</label>
                  <input className="fi" type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
                </div>
                <div className="fg">
                  <label className="fl">Yeni Şifre</label>
                  <input className="fi" type="password" value={pw.new} onChange={e => setPw(p => ({ ...p, new: e.target.value }))} />
                  <div className="fh">En az 6 karakter</div>
                </div>
                <div className="fg">
                  <label className="fl">Yeni Şifre (Tekrar)</label>
                  <input className="fi" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
                </div>
                <button type="submit" disabled={loading} className="btn btn-p" style={{ alignSelf:'flex-start' }}>
                  {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                </button>
              </form>
            )}

            {tab === 'security' && (
              <div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid var(--glass-bdr)' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--tx)', marginBottom:4 }}>Son Giriş</div>
                    <div style={{ fontSize:12, color:'var(--mt)', fontFamily:'JetBrains Mono,monospace' }}>
                      {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('tr-TR') : 'Bilinmiyor'}
                    </div>
                  </div>
                  <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid var(--glass-bdr)' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--tx)', marginBottom:4 }}>Rol</div>
                    <div style={{ fontSize:12, color: ROLE_COLORS[user?.role ?? ''] }}>
                      {user?.role === 'Admin' ? '👑 Admin — Tam erişim' : user?.role === 'Developer' ? '⚡ Developer — Build & analiz' : '👁 Viewer — Sadece görüntüleme'}
                    </div>
                  </div>

                  {/* Build mail tercihi */}
                  <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid var(--glass-bdr)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Bell size={16} weight="duotone" color="var(--teal)" />
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--tx)' }}>Build Email Bildirimleri</div>
                        <div style={{ fontSize:11, color:'var(--mt)', marginTop:2 }}>Build/deploy sonuçları email ile bildirilsin</div>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <div
                      onClick={async () => { await setNotifPref(!user?.receiveBuildEmails) }}
                      style={{
                        width:44, height:24, borderRadius:12, cursor:'pointer', transition:'background .2s', flexShrink:0,
                        background: user?.receiveBuildEmails ? 'var(--teal)' : 'rgba(255,255,255,.12)',
                        position:'relative',
                      }}
                    >
                      <div style={{
                        position:'absolute', top:3, left: user?.receiveBuildEmails ? 23 : 3,
                        width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s',
                      }} />
                    </div>
                  </div>

                  {/* Email onay durumu */}
                  <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid var(--glass-bdr)' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--tx)', marginBottom:4 }}>Email Durumu</div>
                    <div style={{ fontSize:12, display:'flex', alignItems:'center', gap:6,
                      color: user?.isEmailConfirmed ? 'var(--g)' : 'var(--y)' }}>
                      {user?.isEmailConfirmed ? '✅ Onaylandı' : '⏳ Onay bekleniyor'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
