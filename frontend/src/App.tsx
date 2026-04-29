import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Header         from './components/layout/Header'
import BuildsPage     from './pages/BuildsPage'
import AnalyticsPage  from './pages/AnalyticsPage'
import SettingsPage   from './pages/SettingsPage'
import NexusPage      from './pages/NexusPage'
import AuditPage      from './pages/AuditPage'
import WebhookPage    from './pages/WebhookPage'
import ComparePage    from './pages/ComparePage'
import HistoryPage    from './pages/HistoryPage'
import TimelinePage   from './pages/TimelinePage'
import InfraPage      from './pages/InfraPage'
import LoginPage      from './pages/LoginPage'
import ProfilePage    from './pages/ProfilePage'
import AdminPage      from './pages/AdminPage'
import SonarQubePage  from './pages/SonarQubePage'
import GitHubPage     from './pages/GitHubPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import PipelineLoader from './components/ui/PipelineLoader'
import { useSignalR } from './hooks/useSignalR'
import { useBuilds }  from './hooks/useBuilds'
import { initAuth, useAuthStore } from './store/authStore'
import { initTheme }  from './components/ui/ThemePicker'

initTheme()

const PAGE_MESSAGES: Record<string, string> = {
  '/':          'fetching builds...',
  '/analytics': 'loading analytics...',
  '/nexus':     'syncing nexus...',
  '/compare':   'loading compare...',
  '/history':   'fetching test history...',
  '/timeline':  'fetching deployments...',
  '/infra':     'fetching server metrics...',
  '/audit':     'fetching audit logs...',
  '/webhooks':  'loading webhooks...',
  '/sonar':     'loading sonarqube...',
  '/github':    'loading github...',
  '/profile':   'loading profile...',
}

function RouteLoader() {
  const location = useLocation()
  const [loading, setLoading]   = useState(false)
  const [prevPath, setPrevPath] = useState(location.pathname)

  useEffect(() => {
    if (location.pathname === prevPath) return
    setLoading(true)
    setPrevPath(location.pathname)
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [location.pathname])

  if (!loading) return null
  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:9997, backdropFilter:'blur(0px)', animation:'route-blur .15s ease forwards' }} />
      <PipelineLoader message={PAGE_MESSAGES[location.pathname] || 'loading...'} minMs={700} />
      <style>{`@keyframes route-blur { from{backdrop-filter:blur(0px);background:rgba(0,0,0,0)} to{backdrop-filter:blur(12px);background:rgba(8,18,28,.2)} }`}</style>
    </>
  )
}

function NotifPopup() {
  const { user, setNotifPref } = useAuthStore()
  const [visible, setVisible]  = useState(false)

  useEffect(() => {
    if (user && user.isEmailConfirmed && !user.notifPopupShown) {
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [user])

  if (!visible) return null

  async function handle(receive: boolean) {
    setVisible(false)
    await setNotifPref(receive)
  }

  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:9999, width:340,
      background:'var(--glass)', border:'1px solid var(--glass-bdr)', borderRadius:14,
      backdropFilter:'blur(20px)', boxShadow:'0 8px 40px rgba(0,0,0,.5)',
      padding:20, animation:'slide-up .3s ease',
    }}>
      <style>{`@keyframes slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }`}</style>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ width:38, height:38, borderRadius:10, background:'rgba(45,212,191,.12)', border:'1px solid rgba(45,212,191,.25)', display:'grid', placeItems:'center', flexShrink:0 }}>
          <span style={{ fontSize:18 }}>🔔</span>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--tx)' }}>Build Bildirimleri</div>
          <div style={{ fontSize:11, color:'var(--mt)' }}>Email ile haberdar olmak ister misiniz?</div>
        </div>
      </div>
      <p style={{ fontSize:12, color:'var(--tx2)', marginBottom:16, lineHeight:1.55 }}>
        Build ve deploy sonuçları email olarak gönderilsin mi? Profil sayfasından istediğiniz zaman değiştirebilirsiniz.
      </p>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => handle(true)} style={{
          flex:1, padding:'9px 0', borderRadius:8, border:'none', cursor:'pointer',
          background:'linear-gradient(135deg,#2dd4bf,#0d9488)', color:'#0a1a1a', fontSize:12, fontWeight:700,
        }}>✅ Evet, gönder</button>
        <button onClick={() => handle(false)} style={{
          flex:1, padding:'9px 0', borderRadius:8, border:'1px solid var(--glass-bdr)', cursor:'pointer',
          background:'transparent', color:'var(--mt)', fontSize:12, fontWeight:600,
        }}>Hayır</button>
      </div>
    </div>
  )
}

function AppInner() {
  useEffect(() => { initAuth() }, [])
  useSignalR()
  useBuilds()
  const location = useLocation()
  const isLogin  = location.pathname === '/login'

  return (
    <>
      {!isLogin && <Header />}
      {!isLogin && <RouteLoader />}
      {!isLogin && <NotifPopup />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/"          element={<ProtectedRoute><BuildsPage /></ProtectedRoute>}    />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/nexus"     element={<ProtectedRoute><NexusPage /></ProtectedRoute>}     />
        <Route path="/compare"   element={<ProtectedRoute><ComparePage /></ProtectedRoute>}   />
        <Route path="/history"   element={<ProtectedRoute><HistoryPage /></ProtectedRoute>}   />
        <Route path="/timeline"  element={<ProtectedRoute><TimelinePage /></ProtectedRoute>}  />
        <Route path="/infra"     element={<ProtectedRoute><InfraPage /></ProtectedRoute>}     />
        <Route path="/audit"     element={<ProtectedRoute><AuditPage /></ProtectedRoute>}     />
        <Route path="/webhooks"  element={<ProtectedRoute><WebhookPage /></ProtectedRoute>}   />
        <Route path="/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>}  />
        <Route path="/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}   />
        <Route path="/admin"     element={<ProtectedRoute roles={['Admin']}><AdminPage /></ProtectedRoute>} />
        <Route path="/sonar"     element={<ProtectedRoute><SonarQubePage /></ProtectedRoute>} />
        <Route path="/github"    element={<ProtectedRoute><GitHubPage /></ProtectedRoute>}    />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppInner />
    </BrowserRouter>
  )
}
