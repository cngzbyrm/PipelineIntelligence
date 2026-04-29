import { useState } from 'react'
import { Sun, Moon } from '@phosphor-icons/react'

interface Theme {
  id: string
  name: string
  light?: boolean
  acc: string; acc2: string; acc3: string
  bg1: string; bg2: string; bgm: string
  // light mod overrides
  tx?: string; tx2?: string; mt?: string
  glass?: string; glassBdr?: string
}

export const THEMES: Theme[] = [
  { id: 'teal',   name: 'Teal',   acc: '45,212,191',  acc2: '13,148,136',  acc3: '20,184,166',  bg1: '13,31,45',  bg2: '10,42,42',  bgm: '15,35,24'  },
  { id: 'violet', name: 'Violet', acc: '167,139,250', acc2: '124,58,237',  acc3: '139,92,246',  bg1: '18,13,35',  bg2: '20,10,40',  bgm: '14,10,30'  },
  { id: 'rose',   name: 'Rose',   acc: '251,113,133', acc2: '225,29,72',   acc3: '244,63,94',   bg1: '35,13,18',  bg2: '40,10,16',  bgm: '30,12,14'  },
  { id: 'amber',  name: 'Amber',  acc: '251,191,36',  acc2: '217,119,6',   acc3: '245,158,11',  bg1: '32,24,8',   bg2: '36,20,5',   bgm: '28,20,6'   },
  { id: 'sky',    name: 'Sky',    acc: '96,165,250',  acc2: '37,99,235',   acc3: '59,130,246',  bg1: '11,20,38',  bg2: '8,18,40',   bgm: '10,16,32'  },
  { id: 'lime',   name: 'Lime',   acc: '163,230,53',  acc2: '101,163,13',  acc3: '132,204,22',  bg1: '14,24,8',   bg2: '10,26,6',   bgm: '12,22,5'   },
  { id: 'pink',   name: 'Pink',   acc: '232,121,249', acc2: '192,38,211',  acc3: '217,70,239',  bg1: '32,10,36',  bg2: '36,8,40',   bgm: '28,8,32'   },
  { id: 'orange', name: 'Orange', acc: '251,146,60',  acc2: '234,88,12',   acc3: '249,115,22',  bg1: '36,18,8',   bg2: '40,14,5',   bgm: '32,16,6'   },
  { id: 'slate',  name: 'Slate',  acc: '148,163,184', acc2: '100,116,139', acc3: '126,142,163', bg1: '15,20,26',  bg2: '12,18,24',  bgm: '14,18,22'  },
  // ── Light modes ──────────────────────────────────────────────────────────────
  {
    id: 'light-teal', name: 'Light', light: true,
    acc: '13,148,136', acc2: '15,118,110', acc3: '20,184,166',
    bg1: '240,253,250', bg2: '236,254,255', bgm: '245,255,254',
    tx: '15,23,42', tx2: '51,65,85', mt: '100,116,139',
    glass: 'rgba(255,255,255,.7)', glassBdr: 'rgba(0,0,0,.1)',
  },
  {
    id: 'light-blue', name: 'Light Blue', light: true,
    acc: '37,99,235', acc2: '29,78,216', acc3: '59,130,246',
    bg1: '239,246,255', bg2: '238,242,255', bgm: '243,248,255',
    tx: '15,23,42', tx2: '51,65,85', mt: '100,116,139',
    glass: 'rgba(255,255,255,.7)', glassBdr: 'rgba(0,0,0,.1)',
  },
  {
    id: 'light-purple', name: 'Light Purple', light: true,
    acc: '124,58,237', acc2: '109,40,217', acc3: '139,92,246',
    bg1: '245,243,255', bg2: '243,232,255', bgm: '248,246,255',
    tx: '15,23,42', tx2: '51,65,85', mt: '100,116,139',
    glass: 'rgba(255,255,255,.7)', glassBdr: 'rgba(0,0,0,.1)',
  },
]

export function applyTheme(id: string) {
  const t = THEMES.find(x => x.id === id) ?? THEMES[0]
  const r = document.documentElement

  r.style.setProperty('--teal',       `rgb(${t.acc})`)
  r.style.setProperty('--teal2',      `rgb(${t.acc2})`)
  r.style.setProperty('--teal3',      `rgb(${t.acc3})`)
  r.style.setProperty('--teal-dim',   `rgba(${t.acc},.12)`)
  r.style.setProperty('--teal-glow',  `rgba(${t.acc},.25)`)
  r.style.setProperty('--teal-light', `rgb(${t.acc})`)
  r.style.setProperty('--acc',        `rgb(${t.acc})`)
  r.style.setProperty('--acc-bg',     `rgba(${t.acc},.12)`)
  r.style.setProperty('--acc-bdr',    `rgba(${t.acc},.3)`)
  r.style.setProperty('--bg-from',    `rgb(${t.bg1})`)
  r.style.setProperty('--bg-to',      `rgb(${t.bg2})`)

  if (t.light) {
    // Açık mod renkleri
    r.style.setProperty('--tx',         `rgb(${t.tx})`)
    r.style.setProperty('--tx2',        `rgb(${t.tx2})`)
    r.style.setProperty('--mt',         `rgb(${t.mt})`)
    r.style.setProperty('--glass',      t.glass ?? 'rgba(255,255,255,.7)')
    r.style.setProperty('--glass2',     'rgba(255,255,255,.85)')
    r.style.setProperty('--glass3',     'rgba(255,255,255,.95)')
    r.style.setProperty('--glass-bdr',  t.glassBdr ?? 'rgba(0,0,0,.1)')
    r.style.setProperty('--glass-bdr2', 'rgba(0,0,0,.22)')
    r.style.setProperty('--header-bg',  'rgba(255,255,255,.92)')
    r.style.setProperty('--header-bdr', 'rgba(0,0,0,.15)')
    r.style.setProperty('--sh',         '0 2px 12px rgba(0,0,0,.08)')
    r.style.setProperty('--sh2',        '0 4px 24px rgba(0,0,0,.12)')
    document.body.style.background =
      `linear-gradient(135deg, rgb(${t.bg1}) 0%, rgb(${t.bgm}) 40%, rgb(${t.bg2}) 100%)`
    document.body.style.color = `rgb(${t.tx})`
  } else {
    // Koyu mod varsayılanlar
    r.style.setProperty('--tx',         '#e2f0ef')
    r.style.setProperty('--tx2',        '#94b5b3')
    r.style.setProperty('--mt',         '#5a8080')
    r.style.setProperty('--glass',      'rgba(255,255,255,.04)')
    r.style.setProperty('--glass2',     'rgba(255,255,255,.07)')
    r.style.setProperty('--glass3',     'rgba(255,255,255,.1)')
    r.style.setProperty('--glass-bdr',  'rgba(255,255,255,.1)')
    r.style.setProperty('--glass-bdr2', 'rgba(255,255,255,.18)')
    r.style.setProperty('--header-bg',  'rgba(13,31,45,.85)')
    r.style.setProperty('--header-bdr', 'rgba(255,255,255,.1)')
    r.style.setProperty('--sh',         '0 4px 24px rgba(0,0,0,.3)')
    r.style.setProperty('--sh2',        '0 8px 40px rgba(0,0,0,.4)')
    document.body.style.background =
      `linear-gradient(135deg, rgb(${t.bg1}) 0%, rgb(${t.bgm}) 40%, rgb(${t.bg2}) 100%)`
    document.body.style.color = '#e2f0ef'
  }

  localStorage.setItem('pipeline-theme', id)
}

export function initTheme() {
  const saved = localStorage.getItem('pipeline-theme') ?? 'teal'
  applyTheme(saved)
  return saved
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ThemePicker() {
  const [active, setActive] = useState(() => localStorage.getItem('pipeline-theme') ?? 'teal')

  function pick(id: string) {
    setActive(id)
    applyTheme(id)
  }

  const darkThemes  = THEMES.filter(t => !t.light)
  const lightThemes = THEMES.filter(t => t.light)

  return (
    <div style={{ padding: '16px 20px' }}>

      {/* Koyu temalar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Moon size={12} weight="fill" color="var(--mt)" />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Koyu</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {darkThemes.map(t => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            title={t.name}
            style={{
              width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
              background: `rgb(${t.acc})`,
              border: active === t.id ? '3px solid white' : '3px solid transparent',
              outline: active === t.id ? `2px solid rgb(${t.acc})` : 'none',
              outlineOffset: 2,
              transform: active === t.id ? 'scale(1.15)' : 'scale(1)',
              transition: 'all .15s',
              boxShadow: `0 0 10px rgba(${t.acc},.4)`,
            }}
          />
        ))}
      </div>

      {/* Açık temalar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Sun size={12} weight="fill" color="var(--mt)" />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Açık</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {lightThemes.map(t => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            title={t.name}
            style={{
              width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
              background: `rgb(${t.acc})`,
              border: active === t.id ? '3px solid #333' : '3px solid rgba(0,0,0,.15)',
              outline: active === t.id ? `2px solid rgb(${t.acc})` : 'none',
              outlineOffset: 2,
              transform: active === t.id ? 'scale(1.15)' : 'scale(1)',
              transition: 'all .15s',
              boxShadow: `0 0 10px rgba(${t.acc},.3)`,
            }}
          />
        ))}
      </div>

      {/* İsim butonları */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: `1px solid rgba(${t.acc},.3)`,
              background: active === t.id ? `rgba(${t.acc},.15)` : 'transparent',
              color: active === t.id ? `rgb(${t.acc})` : 'var(--mt)',
              transition: 'all .15s',
            }}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  )
}
