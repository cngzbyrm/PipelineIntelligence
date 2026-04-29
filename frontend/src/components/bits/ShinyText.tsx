import './ShinyText.css'

interface ShinyTextProps {
  text: string
  speed?: number
  className?: string
}

export default function ShinyText({ text, speed = 3, className = '' }: ShinyTextProps) {
  return (
    <span
      className={`shiny-text ${className}`}
      style={{ animationDuration: `${speed}s` }}
    >
      {text}
    </span>
  )
}
