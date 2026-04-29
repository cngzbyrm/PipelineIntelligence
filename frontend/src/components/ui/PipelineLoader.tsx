import { useEffect, useState } from 'react'

const MESSAGES = [
  'fetching builds...',
  'connecting jenkins...',
  'loading artifacts...',
  'syncing nexus...',
  'initializing...',
]

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700&family=JetBrains+Mono:wght@500&display=swap');
  @keyframes pl-spin   { to { stroke-dashoffset: -251 } }
  @keyframes pl-spin2  { to { stroke-dashoffset: 188 } }
  @keyframes pl-blink  { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes pl-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes pl-fadeup { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pl-fadein { from{opacity:0} to{opacity:1} }
  @keyframes pl-ripple { 0%{transform:scale(.6);opacity:.7} 100%{transform:scale(2.6);opacity:0} }
  @keyframes pl-orbit  { to{transform:rotate(360deg)} }
`

// ── Loader animasyon içeriği (kart yok) ───────────────────────────────────────
function LoaderContent({ message }: { message: string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:22 }}>

      {/* Ring + ripple + orbit */}
      <div style={{ position:'relative', width:80, height:80 }}>

        {/* Ripples */}
        {[0, 0.65, 1.3].map((delay, i) => (
          <div key={i} style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{
              width:36, height:36, borderRadius:'50%',
              border:'1px solid rgba(45,212,191,.4)',
              animation:`pl-ripple 2s ${delay}s ease-out infinite`,
            }} />
          </div>
        ))}

        {/* Orbit */}
        <div style={{ position:'absolute', inset:-6, animation:'pl-orbit 3s linear infinite' }}>
          <div style={{
            position:'absolute', top:'50%', left:'100%',
            width:6, height:6, borderRadius:'50%', background:'#2dd4bf',
            transform:'translate(-50%,-50%)',
            boxShadow:'0 0 8px rgba(45,212,191,.9)',
          }} />
        </div>

        {/* Ring */}
        <svg style={{ width:'100%', height:'100%', transform:'rotate(-90deg)' }} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(45,212,191,.1)" strokeWidth="3" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(45,212,191,.25)" strokeWidth="1.5"
            strokeLinecap="round" strokeDasharray="50 201"
            style={{ animation:'pl-spin2 2.2s cubic-bezier(.6,0,.4,1) infinite reverse' }} />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#2dd4bf" strokeWidth="3"
            strokeLinecap="round" strokeDasharray="70 181"
            style={{ animation:'pl-spin 1.6s cubic-bezier(.6,0,.4,1) infinite' }} />
        </svg>
      </div>

      {/* Pipeline dots */}
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{
              width:7, height:7, borderRadius:'50%',
              background: i>=3 ? `rgba(45,212,191,${i===3?.3:.15})` : '#2dd4bf',
              animation:`pl-blink 1.2s ${i*.2}s infinite`,
            }} />
            {i < 4 && <div style={{ width:14, height:1.5, background:'linear-gradient(90deg,rgba(45,212,191,.4),rgba(45,212,191,.05))', borderRadius:1 }} />}
          </div>
        ))}
      </div>

      {/* Title */}
      <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:12, fontWeight:700, color:'#2dd4bf', letterSpacing:'.14em', textTransform:'uppercase', animation:'pl-blink 2.5s ease infinite' }}>
        Pipeline Intelligence
      </div>

      {/* Terminal */}
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, display:'flex', alignItems:'center', gap:6, marginTop:-14, animation:'pl-fadeup .6s ease forwards' }}>
        <span style={{ color:'rgba(45,212,191,.35)' }}>~/pipeline $</span>
        <span style={{ color:'rgba(45,212,191,.7)' }}>{message}</span>
        <span style={{ display:'inline-block', width:6, height:12, background:'rgba(45,212,191,.5)', borderRadius:1, animation:'pl-cursor .8s ease infinite' }} />
      </div>

    </div>
  )
}

// ── Inline — sayfa içinde pozisyon:relative parent içine gömülür ──────────────
export function PipelineLoaderInline({ message = 'loading...' }: { message?: string }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      minHeight: 200, width: '100%',
    }}>
      <style>{KEYFRAMES}</style>
      <LoaderContent message={message} />
    </div>
  )
}

// ── Full screen ───────────────────────────────────────────────────────────────
export default function PipelineLoader({ message, minMs = 800, show = true }: {
  message?: string
  minMs?: number
  show?: boolean
}) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % MESSAGES.length), 1800)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!show) {
      const t = setTimeout(() => setVisible(false), minMs)
      return () => clearTimeout(t)
    } else {
      setVisible(true)
    }
  }, [show, minMs])

  if (!visible) return null

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9998,
      background:'rgba(0,0,0,.1)',
      display:'flex', alignItems:'center', justifyContent:'center',
      animation:'pl-fadein .3s ease forwards',
    }}>
      <style>{KEYFRAMES}</style>
      <LoaderContent message={message || MESSAGES[idx]} />
    </div>
  )
}
