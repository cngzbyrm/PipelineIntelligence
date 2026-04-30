import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeSlash, Lightning, User, Lock, EnvelopeSimple, IdentificationCard, CheckCircle } from '@phosphor-icons/react'
import { useAuthStore } from '../store/authStore'

type Mode = 'login' | 'register'

export default function LoginPage() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const { login, register: reg } = useAuthStore()
    const [mode, setMode] = useState<Mode>('login')
    const [form, setForm] = useState({ username: '', email: '', password: '', fullName: '' })
    const [showPw, setShowPw] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (params.get('confirmed') === '1')
            setSuccess('Email adresiniz onaylandı! Şimdi giriş yapabilirsiniz.')
        if (params.get('error') === 'invalid_token')
            setError('Geçersiz veya süresi dolmuş onay linki.')
    }, [])

    function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setError(''); setSuccess('') }

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true); setError(''); setSuccess('')
        try {
            if (mode === 'login') {
                await login(form.email || form.username, form.password)
                navigate('/')
            } else {
                if (!form.username || !form.email || !form.password)
                    return setError('Tüm alanlar zorunlu.')
                const result = await reg(form.username, form.email, form.password, form.fullName)
                if (result.needsConfirmation) {
                    setMode('login')
                    setForm({ username: '', email: '', password: '', fullName: '' })
                    setSuccess(result.message ?? 'Kayıt başarılı! Email adresinizi onaylayın.')
                } else {
                    navigate('/')
                }
            }
        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
        }}>
            <div style={{ width: '100%', maxWidth: 420 }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <img
                        src="/nishcommerce-icon.png"
                        alt="Nish Pipeline"
                        style={{
                            height: 64, width: 'auto', margin: '0 auto 16px', display: 'block',
                            filter: 'var(--logo-filter, brightness(1))',
                            transition: 'filter .3s',
                        }}
                    />
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>
                        Nish <span style={{ color: '#2dd4bf' }}>Pipeline</span>
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--mt)' }}>
                        {mode === 'login' ? 'Hesabınıza giriş yapın' : 'Yeni hesap oluşturun'}
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    background: 'var(--glass)', border: '1px solid var(--glass-bdr)',
                    borderRadius: 16, padding: 32,
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 60px rgba(0,0,0,.4)',
                }}>
                    {/* Tab switcher */}
                    <div style={{
                        display: 'flex', background: 'rgba(255,255,255,.05)', borderRadius: 10, padding: 4, marginBottom: 24,
                    }}>
                        {(['login', 'register'] as Mode[]).map(m => (
                            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                                fontSize: 13, fontWeight: 600, transition: 'all .15s',
                                background: mode === m ? 'var(--teal-dim)' : 'transparent',
                                color: mode === m ? 'var(--teal)' : 'var(--mt)',
                            }}>
                                {m === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                        {/* Full name — sadece register */}
                        {mode === 'register' && (
                            <Field icon={<IdentificationCard size={16} weight="duotone" color="var(--mt)" />} label="Ad Soyad">
                                <input className="fi" placeholder="Adınız Soyadınız" value={form.fullName}
                                    onChange={e => set('fullName', e.target.value)} />
                            </Field>
                        )}

                        {/* Username — sadece register */}
                        {mode === 'register' && (
                            <Field icon={<User size={16} weight="duotone" color="var(--mt)" />} label="Kullanıcı Adı">
                                <input className="fi" placeholder="kullanici_adi" value={form.username}
                                    onChange={e => set('username', e.target.value)} autoComplete="username" />
                            </Field>
                        )}

                        {/* Email */}
                        <Field icon={<EnvelopeSimple size={16} weight="duotone" color="var(--mt)" />}
                            label={mode === 'login' ? 'Email veya Kullanıcı Adı' : 'Email'}>
                            <input className="fi" placeholder={mode === 'login' ? 'email@example.com veya kullanıcı adı' : 'email@example.com'}
                                type={mode === 'login' ? 'text' : 'email'}
                                value={mode === 'login' ? (form.email || form.username) : form.email}
                                onChange={e => mode === 'login' ? set('email', e.target.value) : set('email', e.target.value)}
                                autoComplete="email" />
                        </Field>

                        {/* Password */}
                        <Field icon={<Lock size={16} weight="duotone" color="var(--mt)" />} label="Şifre">
                            <div style={{ position: 'relative' }}>
                                <input className="fi" placeholder={mode === 'login' ? 'Şifreniz' : 'En az 6 karakter'}
                                    type={showPw ? 'text' : 'password'} value={form.password}
                                    onChange={e => set('password', e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                    style={{ paddingRight: 42 }} />
                                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mt)', display: 'grid', placeItems: 'center',
                                }}>
                                    {showPw ? <EyeSlash size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>

                        {/* Success */}
                        {success && (
                            <div style={{ background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--g)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle size={16} weight="fill" /> {success}
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div style={{
                                background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.25)',
                                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--r)',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button type="submit" disabled={loading} style={{
                            padding: '12px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                            background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
                            color: '#0a1a1a', fontSize: 14, fontWeight: 700, marginTop: 4,
                            opacity: loading ? .7 : 1, transition: 'all .15s',
                            boxShadow: '0 4px 20px rgba(45,212,191,.3)',
                        }}>
                            {loading ? 'Lütfen bekleyin...' : mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--mt)', marginTop: 20 }}>
                    Nish Pipeline
                </p>
            </div>
        </div>
    )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                {icon} {label}
            </label>
            {children}
        </div>
    )
}
