import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Apply saved theme on load
const saved = localStorage.getItem('pipeline-dashboard')
try {
  const parsed = JSON.parse(saved ?? '{}')
  if (parsed?.state?.theme) {
    document.documentElement.setAttribute('data-theme', parsed.state.theme)
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
