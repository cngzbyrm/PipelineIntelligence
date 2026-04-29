import React from 'react'

// ── Badge ─────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'failure' | 'running' | 'unstable' | 'neutral'
export function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  const cls: Record<BadgeVariant, string> = {
    success:  'badge badge-success',
    failure:  'badge badge-fail',
    running:  'badge badge-running',
    unstable: 'badge badge-warn',
    neutral:  'badge badge-neutral',
  }
  return <span className={cls[variant]}>{children}</span>
}

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div className="spinner" style={{ width: size, height: size }} />
  )
}

// ── Empty State ───────────────────────────────────────────────────────────
export function EmptyState({ icon, text }: { icon: string; text: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div>{text}</div>
    </div>
  )
}

// ── Toast (standalone) ─────────────────────────────────────────────────────
let toastContainer: HTMLDivElement | null = null

function getContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.className = 'toast-area'
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

export function toast(msg: string, bg = 'var(--tx)') {
  const el = document.createElement('div')
  el.className = 'toast'
  el.style.background = bg
  el.style.color = bg === 'var(--tx)' ? 'var(--bg)' : 'white'
  el.innerHTML = `<span style="flex:1">${msg}</span><span class="toast-close" onclick="this.parentElement.remove()">×</span>`
  getContainer().appendChild(el)
  setTimeout(() => el.remove(), 3500)
}

// ── Coverage Bar ───────────────────────────────────────────────────────────
export function CoverageBar({ job, pct }: { job: string; pct: number }) {
  const color = pct >= 80 ? 'var(--g)' : pct >= 60 ? 'var(--y)' : 'var(--r)'
  const cls   = pct >= 80 ? 'pct-hi'   : pct >= 60 ? 'pct-mi'   : 'pct-lo'
  return (
    <div className="cov-row">
      <div className="cov-name" title={job}>{job}</div>
      <div className="cov-bar-wrap">
        <div className="cov-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={`cov-pct ${cls}`}>{pct}%</div>
    </div>
  )
}

// ── Grade Badge (SonarQube) ────────────────────────────────────────────────
export function GradeBadge({ grade }: { grade: string }) {
  const cls = { A: 'grade-A', B: 'grade-B', C: 'grade-C', D: 'grade-D' }[grade] ?? ''
  return <span className={`grade-badge ${cls}`}>{grade}</span>
}

// ── Stat Card ──────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  delta?: string
  deltaType?: 'up' | 'down' | 'neutral'
  colorClass?: string
  onClick?: () => void
  active?: boolean
}
export function StatCard({ label, value, sub, delta, deltaType = 'neutral', colorClass = '', onClick, active }: StatCardProps) {
  const deltaClass = { up: 'du', down: 'dd', neutral: 'dn' }[deltaType]
  return (
    <div className={`sc ${colorClass} ${active ? 'sel-f' : ''}`} onClick={onClick}>
      <div className="slbl">{label}</div>
      <div className="sval">{value}</div>
      {sub   && <div className="ssub">{sub}</div>}
      {delta && <div className={`sdelta ${deltaClass}`}>{delta}</div>}
    </div>
  )
}
