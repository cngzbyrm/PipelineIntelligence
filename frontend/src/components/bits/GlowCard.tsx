import { useRef, MouseEvent } from 'react'
import './GlowCard.css'

interface GlowCardProps {
  children: React.ReactNode
  glowColor?: string
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export default function GlowCard({
  children, glowColor = 'var(--teal)', className = '', style, onClick
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    card.style.setProperty('--gx', `${x}%`)
    card.style.setProperty('--gy', `${y}%`)
  }

  function handleMouseLeave() {
    const card = cardRef.current
    if (!card) return
    card.style.setProperty('--gx', '50%')
    card.style.setProperty('--gy', '50%')
  }

  return (
    <div
      ref={cardRef}
      className={`glow-card ${className}`}
      style={{ '--gc': glowColor, ...style } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
