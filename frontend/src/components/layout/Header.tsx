import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
    GitBranch, PresentationChart, Vault, ArrowsLeftRight,
    TestTube, GitCommit, ClipboardText, Sliders, Desktop,
    ArrowsClockwise, Moon, Sun, Bell, BellSlash, Lightning,
    List, X, User, SignOut, CaretDown, Shield, Palette, ShieldWarning, GithubLogo,
    Plugs,
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
    const userMenuRef = useRef<HTMLDivElement>(null)
    const themeMenuRef = useRef<HTMLDivElement>(null)

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
        { to: '/', icon: <GitBranch size={20} weight="duotone" />, label: 'Buildler' },
        { to: '/analytics', icon: <PresentationChart size={20} weight="duotone" />, label: 'Analitik' },
        { to: '/nexus', icon: <Vault size={20} weight="duotone" />, label: 'Nexus' },
        { to: '/compare', icon: <ArrowsLeftRight size={20} weight="duotone" />, label: 'Karşılaştır' },
        { to: '/history', icon: <TestTube size={20} weight="duotone" />, label: 'Test Geçmişi' },
        { to: '/timeline', icon: <GitCommit size={20} weight="duotone" />, label: 'Timeline' },
        { to: '/infra', icon: <Desktop size={20} weight="duotone" />, label: 'Altyapı' },
        { to: '/audit', icon: <ClipboardText size={20} weight="duotone" />, label: 'Aktivite' },
        { to: '/webhooks', icon: <Plugs size={20} weight="duotone" />, label: 'Webhook' },
        { to: '/sonar', icon: <ShieldWarning size={20} weight="duotone" />, label: 'SonarQube' },
        { to: '/github', icon: <GithubLogo size={20} weight="fill" />, label: 'GitHub' },
        { to: '/settings', icon: <Sliders size={20} weight="duotone" />, label: 'Ayarlar' },
    ]

    const themePanel = themeOpen && (
        <div className="sidebar-flyout sidebar-flyout--theme">
            <div style={{ padding: '12px 18px 8px', borderBottom: '1px solid rgba(255,255,255,.07)', fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>
                Tema seçici
            </div>
            <ThemePicker />
        </div>
    )

    const userPanel = user && userMenuOpen && (
        <div className="sidebar-flyout sidebar-flyout--user">
            <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.08)', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e2f0ef' }}>{user.fullName || user.username}</div>
                <div style={{ fontSize: 11, color: '#5a8080', marginTop: 2 }}>{user.email}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#2dd4bf', marginTop: 4, padding: '2px 8px', borderRadius: 20, background: 'rgba(45,212,191,.1)', display: 'inline-block' }}>
                    {user.role}
                </div>
            </div>
            <button type="button" onClick={() => { navigate('/profile'); setUserMenuOpen(false) }} className="sidebar-dd-btn">
                <User size={14} weight="duotone" /> Profil
            </button>
            {user.role === 'Admin' && (
                <button type="button" onClick={() => { navigate('/admin'); setUserMenuOpen(false) }} className="sidebar-dd-btn sidebar-dd-btn--admin">
                    <Shield size={14} weight="duotone" /> Admin paneli
                </button>
            )}
            <button type="button" onClick={handleLogout} className="sidebar-dd-btn sidebar-dd-btn--danger">
                <SignOut size={14} weight="duotone" /> Çıkış
            </button>
        </div>
    )

    const toolbarIcons = (
        <div className="sidebar-tools">
            <Magnet strength={0.35}>
                <button type="button" className="ibtn ibtn--sidebar" onClick={refresh} title="Yenile">
                    <ArrowsClockwise size={18} weight="bold" color="var(--teal)" />
                </button>
            </Magnet>
            <div ref={themeMenuRef} className="sidebar-tools__rel">
                <button
                    type="button"
                    className="ibtn ibtn--sidebar"
                    onClick={() => setThemeOpen(!themeOpen)}
                    title="Tema paleti"
                    style={themeOpen ? { borderColor: 'var(--acc-bdr)', background: 'var(--teal-dim)' } : {}}
                >
                    <Palette size={18} weight="duotone" color="var(--teal)" />
                </button>
                {themePanel}
            </div>
            <Magnet strength={0.35}>
                <button type="button" className="ibtn ibtn--sidebar" onClick={toggleTheme} title="Açık / koyu">
                    {theme === 'dark'
                        ? <Sun size={18} weight="fill" color="#fbbf24" />
                        : <Moon size={18} weight="fill" color="#a78bfa" />}
                </button>
            </Magnet>
            <Magnet strength={0.35}>
                <button type="button" className="ibtn ibtn--sidebar" onClick={toggleSound} title="Ses">
                    {sound
                        ? <Bell size={18} weight="fill" color="var(--teal)" />
                        : <BellSlash size={18} weight="fill" color="rgba(255,255,255,.3)" />}
                </button>
            </Magnet>
        </div>
    )

    return (
        <>
            {!isMobile && (
                <aside className="sidebar" aria-label="Ana navigasyon">
                    <NavLink to="/" className="sidebar-brand" end>
                        <img
                            src="/nishcommerce-icon.png"
                            alt=""
                            className="sidebar-brand__img"
                        />
                        <div className="sidebar-brand__text">
                            <span className="sidebar-brand__line1">Nish</span>
                            <span className="sidebar-brand__line2">Pipeline</span>
                        </div>
                    </NavLink>

                    <nav className="sidebar-nav">
                        {navItems.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === '/'}
                                className={({ isActive }) => `snav${isActive ? ' snav--on' : ''}`}
                            >
                                <span className="snav__ic">{item.icon}</span>
                                <span className="snav__label">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    <div className="sidebar-footer">
                        <div className="sidebar-live">
                            <div className="pill pill-live sidebar-live__pill">
                                <span className="bub" />
                                <ShinyText text="CANLI" speed={2.5} />
                            </div>
                            <span className="sidebar-live__time mono-sm">{lastRefresh}</span>
                        </div>
                        {toolbarIcons}
                        {user && (
                            <div ref={userMenuRef} className="sidebar-user">
                                <button
                                    type="button"
                                    className="sidebar-user__btn"
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                >
                                    {user.avatarUrl
                                        ? <img src={user.avatarUrl} alt="" className="sidebar-user__avatar" />
                                        : <div className="sidebar-user__avatar sidebar-user__avatar--ph">
                                            {(user.fullName || user.username)[0]?.toUpperCase()}
                                        </div>}
                                    <span className="sidebar-user__name">{user.fullName || user.username}</span>
                                    <CaretDown size={12} weight="bold" color="var(--mt)" />
                                </button>
                                {userPanel}
                            </div>
                        )}
                    </div>
                </aside>
            )}

            {isMobile && (
                <header className="mobile-topbar">
                    <button
                        type="button"
                        className="mobile-topbar__menu"
                        onClick={() => setMenuOpen(true)}
                        aria-label="Menüyü aç"
                    >
                        <List size={22} weight="bold" />
                    </button>
                    <NavLink to="/" className="mobile-topbar__logo" end>
                        <img src="/nishcommerce-icon.png" alt="" />
                        <span>Pipeline</span>
                    </NavLink>
                    <div className="mobile-topbar__spacer" />
                    {user && (
                        <div ref={userMenuRef} style={{ position: 'relative' }}>
                            <button
                                type="button"
                                className="mobile-topbar__avatar-btn"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                {user.avatarUrl
                                    ? <img src={user.avatarUrl} alt="" />
                                    : <span>{(user.fullName || user.username)[0]?.toUpperCase()}</span>}
                            </button>
                            {userMenuOpen && (
                                <div className="sidebar-flyout sidebar-flyout--mobile-user">
                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.08)', marginBottom: 4 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700 }}>{user.fullName || user.username}</div>
                                        <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 2 }}>{user.email}</div>
                                    </div>
                                    <button type="button" onClick={() => { navigate('/profile'); setUserMenuOpen(false) }} className="sidebar-dd-btn">
                                        <User size={14} weight="duotone" /> Profil
                                    </button>
                                    {user.role === 'Admin' && (
                                        <button type="button" onClick={() => { navigate('/admin'); setUserMenuOpen(false) }} className="sidebar-dd-btn sidebar-dd-btn--admin">
                                            <Shield size={14} weight="duotone" /> Admin
                                        </button>
                                    )}
                                    <button type="button" onClick={handleLogout} className="sidebar-dd-btn sidebar-dd-btn--danger">
                                        <SignOut size={14} weight="duotone" /> Çıkış
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </header>
            )}

            <div className="rbar" aria-hidden><div className="rbar-f" id="rbar-fill" /></div>

            {menuOpen && (
                <div
                    className="drawer-overlay"
                    onClick={() => setMenuOpen(false)}
                    role="presentation"
                >
                    <div
                        className="drawer-panel"
                        onClick={e => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="drawer-panel__head">
                            <div className="drawer-panel__brand">
                                <div className="drawer-panel__brand-icon">
                                    <Lightning size={15} weight="fill" color="#fff" />
                                </div>
                                <span>Pipeline</span>
                            </div>
                            <button type="button" className="drawer-panel__close" onClick={() => setMenuOpen(false)} aria-label="Kapat">
                                <X size={16} weight="bold" />
                            </button>
                        </div>
                        <nav className="drawer-panel__nav">
                            {navItems.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === '/'}
                                    onClick={() => setMenuOpen(false)}
                                    className={({ isActive }) => `drawer-link${isActive ? ' drawer-link--on' : ''}`}
                                >
                                    <span className="drawer-link__ic">{item.icon}</span>
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>
                        <div className="drawer-panel__foot">
                            {[
                                { icon: <ArrowsClockwise size={15} weight="duotone" color="#2dd4bf" />, label: 'Yenile', fn: () => { refresh(); setMenuOpen(false) } },
                                { icon: theme === 'dark' ? <Sun size={15} weight="fill" color="#fbbf24" /> : <Moon size={15} weight="fill" color="#a78bfa" />, label: theme === 'dark' ? 'Açık tema' : 'Koyu tema', fn: toggleTheme },
                                { icon: sound ? <Bell size={15} weight="fill" color="#2dd4bf" /> : <BellSlash size={15} weight="fill" color="#5a8080" />, label: sound ? 'Ses açık' : 'Ses kapalı', fn: toggleSound },
                            ].map(a => (
                                <button key={a.label} type="button" className="drawer-panel__foot-btn" onClick={a.fn}>
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
