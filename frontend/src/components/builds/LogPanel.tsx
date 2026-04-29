import { useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { dashboardApi } from '../../services/api'

export default function LogPanel() {
  const { logJob, logLines, appendLog, clearLog } = useStore()
  const boxRef    = useRef<HTMLDivElement>(null)
  const startRef  = useRef(0)
  const timerRef  = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!logJob) return
    clearLog()
    startRef.current = 0

    async function poll() {
      const builds = await dashboardApi.getBuilds()
      const b = builds.data.find(x => x.job === logJob)
      if (!b) return

      const res = await dashboardApi.getLog(logJob, b.id, startRef.current)
      const { text, nextStart } = res.data
      startRef.current = nextStart

      text.split('\n').filter(Boolean).forEach(line => {
        appendLog(line)
      })

      if (!b.building) clearInterval(timerRef.current)
    }

    poll()
    timerRef.current = setInterval(poll, 3000)
    return () => clearInterval(timerRef.current)
  }, [logJob])

  // Auto-scroll
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [logLines])

  function lineClass(l: string) {
    if (/error|exception|fail/i.test(l)) return 'log-err'
    if (/warn/i.test(l))                 return 'log-warn'
    if (/success|pass|✅/i.test(l))      return 'log-ok'
    if (/info|stage|▶/i.test(l))         return 'log-info'
    return ''
  }

  return (
    <div className="logp">
      <div className="ch">
        <div className="ct">📡 Canlı Log</div>
        <div className="cm">{logJob || '—'}</div>
      </div>
      <div className="logb" ref={boxRef}>
        {logLines.length === 0 ? (
          <span style={{ color: '#4b5563' }}>Build seçin veya Log butonuna tıklayın...</span>
        ) : logLines.map((l, i) => (
          <div key={i} className={`log-line ${lineClass(l)}`}>{l}</div>
        ))}
      </div>
    </div>
  )
}
