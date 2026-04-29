import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  GitBranch, PresentationChart, Vault, ArrowsLeftRight,
  TestTube, GitCommit, ClipboardText, Sliders, Desktop,
  ArrowsClockwise, Moon, Sun, Bell, BellSlash, Lightning,
  List, X, User, SignOut, CaretDown, Shield, Palette, ShieldWarning, GithubLogo
} from '@phosphor-icons/react'
import { useStore } from '../../store'
import { useBuilds } from '../../hooks/useBuilds'
import { useAuthStore } from '../../store/authStore'
import ShinyText from '../bits/ShinyText'
import Magnet from '../bits/Magnet'
import ThemePicker from '../ui/ThemePicker'

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

export default function Header() {
  const { theme, sound, toggleTheme, toggleSound, lastRefresh } = useStore()
  const { refresh } = useBuilds()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const isMobile = useIsMobile()
  const userMenuRef  = useRef<HTMLDivElement>(null)
  const themeMenuRef = useRef<HTMLDivElement>(null)

  // Dışarı tıklayınca kapat
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false)
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node))
        setThemeOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/',          icon: <GitBranch size={16} weight="duotone" />,         label: 'Buildler'    },
    { to: '/analytics', icon: <PresentationChart size={16} weight="duotone" />, label: 'Analitik'    },
    { to: '/nexus',     icon: <Vault size={16} weight="duotone" />,             label: 'Nexus'       },
    { to: '/compare',   icon: <ArrowsLeftRight size={16} weight="duotone" />,   label: 'Karşılaştır' },
    { to: '/history',   icon: <TestTube size={16} weight="duotone" />,          label: 'Test Geçmişi'},
    { to: '/timeline',  icon: <GitCommit size={16} weight="duotone" />,         label: 'Timeline'    },
    { to: '/infra',     icon: <Desktop size={16} weight="duotone" />,           label: 'Altyapı'     },
    { to: '/audit',     icon: <ClipboardText size={16} weight="duotone" />,     label: 'Aktivite'    },
    { to: '/sonar',     icon: <ShieldWarning size={16} weight="duotone" />,     label: 'SonarQube'   },
    { to: '/github',    icon: <GithubLogo size={16} weight="fill" />,           label: 'GitHub'      },
    { to: '/settings',  icon: <Sliders size={16} weight="duotone" />,           label: 'Ayarlar'     },
  ]

  return (
    <>
      <header className="header">
        {/* Logo */}
        <NavLink to="/" className="logo">
          <div className="logo-cube">
            <Lightning size={18} weight="fill" color="#fff" />
          </div>
          <span className="logo-text">Pipeline Intelligence</span>
        </NavLink>

        {/* Desktop nav */}
        {!isMobile && (
          <nav className="nav">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `ntab ${isActive ? 'on' : ''}`}
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="hright">
          {/* Mobil: hamburger butonu — logo yanında */}
          {isMobile && (
            <button
              onClick={() => setMenuOpen(true)}
              style={{
                width: 38, height: 38, borderRadius: 9,
                border: '1px solid rgba(45,212,191,.3)',
                background: 'rgba(45,212,191,.1)',
                cursor: 'pointer', display: 'grid', placeItems: 'center',
                color: '#2dd4bf', flexShrink: 0,
              }}
            >
              <List size={20} weight="bold" />
            </button>
          )}

          <div className="pill pill-live">
            <div className="bub" />
            <ShinyText text="CANLI" speed={2.5} />
          </div>

          {!isMobile && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontFamily: 'JetBrains Mono,monospace' }}>
              {lastRefresh}
            </span>
          )}

          <Magnet strength={0.4}>
            <button className="ibtn" onClick={refresh} title="Yenile">
              <ArrowsClockwise size={16} weight="bold" color="var(--teal)" />
            </button>
          </Magnet>

          {/* Tema seçici */}
          <div ref={themeMenuRef} style={{ position: 'relative' }}>
            <button
              className="ibtn"
              onClick={() => setThemeOpen(!themeOpen)}
              title="Tema"
              style={themeOpen ? { borderColor: 'var(--acc-bdr)', background: 'var(--teal-dim)' } : {}}
            >
              <Palette size={16} weight="duotone" color="var(--teal)" />
            </button>

            {themeOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: 'rgba(13,18,28,.97)', border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 14, minWidth: 260, zIndex: 1000,
                boxShadow: '0 16px 50px rgba(0,0,0,.6)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 20px 8px', borderBottom: '1px solid rgba(255,255,255,.07)', fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>
                  🎨 Tema Seçici
                </div>
                <ThemePicker/>
              </div>
            )}
          </div>

          {!isMobile && (
            <>
              <Magnet strength={0.4}>
                <button className="ibtn" onClick={toggleTheme} title="Tema">
                  {theme === 'dark'
                    ? <Sun size={16} weight="fill" color="#fbbf24" />
                    : <Moon size={16} weight="fill" color="#a78bfa" />}
                </button>
              </Magnet>
              <Magnet strength={0.4}>
                <button className="ibtn" onClick={toggleSound} title="Ses">
                  {sound
                    ? <Bell size={16} weight="fill" color="var(--teal)" />
                    : <BellSlash size={16} weight="fill" color="rgba(255,255,255,.3)" />}
                </button>
              </Magnet>
            </>
          )}

          {/* Kullanıcı menüsü */}
          {user && (
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px 5px 6px', borderRadius: 10,
                  border: '1px solid var(--glass-bdr)', background: 'var(--glass)',
                  cursor: 'pointer', color: 'var(--tx)', backdropFilter: 'blur(8px)',
                }}
              >
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="avatar" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: '#0a1a1a', flexShrink: 0 }}>
                      {(user.fullName || user.username)[0]?.toUpperCase()}
                    </div>}
                {!isMobile && <span style={{ fontSize: 12, fontWeight: 600 }}>{user.fullName || user.username}</span>}
                <CaretDown size={12} weight="bold" color="var(--mt)" />
              </button>

              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'rgba(13,31,45,.97)', border: '1px solid rgba(45,212,191,.15)',
                  borderRadius: 12, padding: 6, minWidth: 180,
                  boxShadow: '0 16px 40px rgba(0,0,0,.5)',
                  zIndex: 1000,
                }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.08)', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2f0ef' }}>{user.fullName || user.username}</div>
                    <div style={{ fontSize: 11, color: '#5a8080', marginTop: 2 }}>{user.email}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#2dd4bf', marginTop: 4, padding: '2px 8px', borderRadius: 20, background: 'rgba(45,212,191,.1)', display: 'inline-block' }}>
                      {user.role}
                    </div>
                  </div>
                  <button onClick={() => { navigate('/profile'); setUserMenuOpen(false) }} style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
                    background: 'transparent', color: '#5a8080', fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
                  }}>
                    <User size={14} weight="duotone" /> Profil
                  </button>
                  {user.role === 'Admin' && (
                    <button onClick={() => { navigate('/admin'); setUserMenuOpen(false) }} style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
                      background: 'transparent', color: '#f59e0b', fontSize: 13, fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
                    }}>
                      <Shield size={14} weight="duotone" /> Admin Paneli
                    </button>
                  )}
                  <button onClick={handleLogout} style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
                    background: 'transparent', color: '#f87171', fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
                  }}>
                    <SignOut size={14} weight="duotone" /> Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="rbar"><div className="rbar-f" id="rbar-fill" /></div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex', justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(300px, 85vw)',
              height: '100dvh',
              background: 'rgba(13,31,45,.97)',
              borderLeft: '1px solid rgba(45,212,191,.15)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Drawer header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', borderBottom: '1px solid rgba(255,255,255,.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'linear-gradient(135deg,#2dd4bf,#0d9488)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <Lightning size={15} weight="fill" color="#fff" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#e2f0ef' }}>Pipeline</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: '1px solid rgba(255,255,255,.1)',
                  background: 'rgba(255,255,255,.05)',
                  cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#5a8080',
                }}
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Nav items */}
            <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMenuOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10, textDecoration: 'none',
                    fontSize: 14, fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#2dd4bf' : '#5a8080',
                    background: isActive ? 'rgba(45,212,191,.1)' : 'transparent',
                    border: `1px solid ${isActive ? 'rgba(45,212,191,.25)' : 'transparent'}`,
                  })}
                >
                  <span style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: 'rgba(255,255,255,.06)',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    {item.icon}
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Footer actions */}
            <div style={{ padding: '12px 10px 28px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { icon: <ArrowsClockwise size={15} weight="duotone" color="#2dd4bf" />, label: 'Yenile', fn: () => { refresh(); setMenuOpen(false) } },
                { icon: theme === 'dark' ? <Sun size={15} weight="fill" color="#fbbf24" /> : <Moon size={15} weight="fill" color="#a78bfa" />, label: theme === 'dark' ? 'Açık Tema' : 'Koyu Tema', fn: toggleTheme },
                { icon: sound ? <Bell size={15} weight="fill" color="#2dd4bf" /> : <BellSlash size={15} weight="fill" color="#5a8080" />, label: sound ? 'Ses Açık' : 'Ses Kapalı', fn: toggleSound },
              ].map(a => (
                <button key={a.label} onClick={a.fn} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#5a8080', fontSize: 13, fontWeight: 500, textAlign: 'left',
                }}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
