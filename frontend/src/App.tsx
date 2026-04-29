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
import { initAuth }   from './store/authStore'
import { initTheme }  from './components/ui/ThemePicker'

// Tema sayfa açılışında hemen uygulansın
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
  const [loading, setLoading] = useState(false)
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
      {/* Sayfa blur */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9997,
        backdropFilter: 'blur(0px)',
        animation: 'route-blur .15s ease forwards',
      }} />
      <PipelineLoader message={PAGE_MESSAGES[location.pathname] || 'loading...'} minMs={700} />
      <style>{`
        @keyframes route-blur {
          from { backdrop-filter: blur(0px); background: rgba(0,0,0,0) }
          to   { backdrop-filter: blur(12px); background: rgba(8,18,28,.2) }
        }
      `}</style>
    </>
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
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
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
        <Route path="/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}              />
        <Route path="/admin"     element={<ProtectedRoute roles={['Admin']}><AdminPage /></ProtectedRoute>} />
        <Route path="/sonar"     element={<ProtectedRoute><SonarQubePage /></ProtectedRoute>}              />
        <Route path="/github"    element={<ProtectedRoute><GitHubPage /></ProtectedRoute>}                 />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AppInner />
    </BrowserRouter>
  )
}
