import { useEffect, useRef, useState } from 'react'
import { useInView, useMotionValue, useSpring } from 'framer-motion'

interface CountUpProps {
  to: number
  from?: number
  duration?: number
  decimals?: number
  suffix?: string
  prefix?: string
  className?: string
}

export default function CountUp({
  to, from = 0, duration = 1.5, decimals = 0,
  suffix = '', prefix = '', className = ''
}: CountUpProps) {
  const ref        = useRef<HTMLSpanElement>(null)
  const motionVal  = useMotionValue(from)
  const springVal  = useSpring(motionVal, { duration: duration * 1000, bounce: 0 })
  const isInView   = useInView(ref, { once: true, margin: '0px' })
  const [display,  setDisplay] = useState(from.toFixed(decimals))

  useEffect(() => {
    if (isInView) motionVal.set(to)
  }, [isInView, motionVal, to])

  useEffect(() => {
    return springVal.on('change', v => setDisplay(v.toFixed(decimals)))
  }, [springVal, decimals])

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  )
}
