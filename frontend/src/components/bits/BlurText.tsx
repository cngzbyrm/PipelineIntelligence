import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface BlurTextProps {
  text: string
  className?: string
  delay?: number
  duration?: number
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'p'
}

export default function BlurText({
  text, className = '', delay = 0, duration = 0.5, as = 'span'
}: BlurTextProps) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true })
  const words  = text.split(' ')
  const Tag    = as

  return (
    <Tag ref={ref as any} className={className} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25em' }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: 'blur(10px)', y: 8 }}
          animate={inView ? { opacity: 1, filter: 'blur(0px)', y: 0 } : {}}
          transition={{ duration, delay: delay + i * 0.06, ease: 'easeOut' }}
          style={{ display: 'inline-block' }}
        >
          {word}
        </motion.span>
      ))}
    </Tag>
  )
}
