import { useState } from 'react'
import { ArrowsLeftRight } from '@phosphor-icons/react'
import { useStore } from '../store'
import type { BuildResult } from '../types'

function timeAgo(ts: number) {
  if (!ts) return '—'
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60)    return `${d}s önce`
  if (d < 3600)  return `${Math.floor(d / 60)}dk önce`
  return `${Math.floor(d / 3600)}sa önce`
}

function cmpClass(a: number | string | undefined, b: number | string | undefined, higherIsBetter = true): [string, string] {
  if (a === undefined || b === undefined) return ['same', 'same']
  if (typeof a === 'number' && typeof b === 'number') {
    if (a === b) return ['same', 'same']
    const aWins = higherIsBetter ? a > b : a < b
    return aWins ? ['better', 'worse'] : ['worse', 'better']
  }
  return ['same', 'same']
}

function buildRows(a: BuildResult | undefined, b: BuildResult | undefined) {
  const ta = a?.testReport, tb = b?.testReport
  return [
    { label: 'Proje',          av: a?.job,                                            bv: b?.job },
    { label: 'Durum',          av: a?.result ?? 'Running',                            bv: b?.result ?? 'Running' },
    { label: 'Süre (sn)',      av: a?.duration ? (a.duration/1000).toFixed(0) : '—', bv: b?.duration ? (b.duration/1000).toFixed(0) : '—', cmp: cmpClass(a?.duration, b?.duration, false) },
    { label: 'Test Geçen',     av: ta?.passCount ?? '—',                              bv: tb?.passCount ?? '—',     cmp: cmpClass(ta?.passCount, tb?.passCount) },
    { label: 'Test Başarısız', av: ta?.failCount ?? '—',                              bv: tb?.failCount ?? '—',     cmp: cmpClass(ta?.failCount, tb?.failCount, false) },
    { label: 'Coverage %',     av: ta ? Math.round(ta.passCount/(ta.passCount+ta.failCount)*100)+'%' : '—', bv: tb ? Math.round(tb.passCount/(tb.passCount+tb.failCount)*100)+'%' : '—' },
    { label: 'Tetikleyen',     av: a?.triggerUser ?? '—',                             bv: b?.triggerUser ?? '—' },
    { label: 'Zaman',          av: a ? timeAgo(a.timestamp) : '—',                   bv: b ? timeAgo(b.timestamp) : '—' },
  ]
}

export default function ComparePage() {
  const { builds } = useStore()
  const [selA, setSelA] = useState('')
  const [selB, setSelB] = useState('')

  const buildA = builds.find(b => `${b.job}:${b.id}` === selA)
  const buildB = builds.find(b => `${b.job}:${b.id}` === selB)

  const opts = builds.map(b => ({
    value: `${b.job}:${b.id}`,
    label: `${b.job} #${b.id} (${b.result ?? 'running'})`
  }))

  return (
    <div className="page-wrap">
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
        <ArrowsLeftRight size={22} weight="duotone" color="var(--teal)" />
        <div className="page-title" style={{ margin:0 }}>Build Karşılaştırma</div>
      </div>
      <div className="page-sub">İki build'i yan yana kıyasla</div>

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <select className="sel" style={{ flex:1, maxWidth:300 }} value={selA} onChange={e => setSelA(e.target.value)}>
          <option value="">— Build A Seç —</option>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="sel" style={{ flex:1, maxWidth:300 }} value={selB} onChange={e => setSelB(e.target.value)}>
          <option value="">— Build B Seç —</option>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="card">
        {(!buildA || !buildB) ? (
          <div className="empty-state">
            <ArrowsLeftRight size={36} weight="duotone" style={{ opacity:.4, marginBottom:8, color:'var(--teal)' }} />
            İki build seçin
          </div>
        ) : (
          <div className="cmp-grid">
            <div className="cmp-col">
              <div className="cmp-hdr">
                <span className="badge badge-success">A</span>
                {buildA.job} #{buildA.id}
              </div>
              {buildRows(buildA, buildB).map(r => (
                <div key={r.label} className="cmp-row">
                  <span className="cmp-lbl">{r.label}</span>
                  <span className={`cmp-val ${r.cmp ? r.cmp[0] : 'same'}`}>{String(r.av ?? '—')}</span>
                </div>
              ))}
            </div>
            <div className="cmp-col">
              <div className="cmp-hdr">
                <span className="badge badge-running">B</span>
                {buildB.job} #{buildB.id}
              </div>
              {buildRows(buildA, buildB).map(r => (
                <div key={r.label} className="cmp-row">
                  <span className="cmp-lbl">{r.label}</span>
                  <span className={`cmp-val ${r.cmp ? r.cmp[1] : 'same'}`}>{String(r.bv ?? '—')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
