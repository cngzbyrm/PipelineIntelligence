import { useRef, MouseEvent } from 'react'
import { motion, useSpring } from 'framer-motion'

interface MagnetProps {
  children: React.ReactNode
  strength?: number
  className?: string
}

export default function Magnet({ children, strength = 0.4, className = '' }: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x   = useSpring(0, { stiffness: 200, damping: 15 })
  const y   = useSpring(0, { stiffness: 200, damping: 15 })

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el   = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx   = rect.left + rect.width  / 2
    const cy   = rect.top  + rect.height / 2
    x.set((e.clientX - cx) * strength)
    y.set((e.clientY - cy) * strength)
  }

  function handleMouseLeave() { x.set(0); y.set(0) }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y, display: 'inline-flex' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  )
}
