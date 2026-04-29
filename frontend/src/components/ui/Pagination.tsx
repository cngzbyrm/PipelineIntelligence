import { CaretLeft, CaretRight, CaretDoubleLeft, CaretDoubleRight } from '@phosphor-icons/react'

interface PaginationProps {
  page: number
  total: number
  pageSize?: number
  onChange: (page: number) => void
}

export default function Pagination({ page, total, pageSize = 10, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  // Page window: show max 5 page buttons centered around current
  const delta = 2
  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px', borderTop: '1px solid var(--glass-bdr)',
      background: 'rgba(255,255,255,.02)',
    }}>
      {/* Info */}
      <span style={{ fontSize: 11, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace' }}>
        {from}–{to} / {total} kayıt
      </span>

      {/* Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {/* First */}
        <PBtn onClick={() => onChange(1)} disabled={page === 1} title="İlk sayfa">
          <CaretDoubleLeft size={11} weight="bold" />
        </PBtn>
        {/* Prev */}
        <PBtn onClick={() => onChange(page - 1)} disabled={page === 1} title="Önceki">
          <CaretLeft size={11} weight="bold" />
        </PBtn>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`d${i}`} style={{ fontSize: 11, color: 'var(--mt)', padding: '0 4px' }}>…</span>
            : <PBtn
                key={p}
                onClick={() => onChange(p as number)}
                active={p === page}
              >
                {p}
              </PBtn>
        )}

        {/* Next */}
        <PBtn onClick={() => onChange(page + 1)} disabled={page === totalPages} title="Sonraki">
          <CaretRight size={11} weight="bold" />
        </PBtn>
        {/* Last */}
        <PBtn onClick={() => onChange(totalPages)} disabled={page === totalPages} title="Son sayfa">
          <CaretDoubleRight size={11} weight="bold" />
        </PBtn>
      </div>

      {/* Page size info */}
      <span style={{ fontSize: 11, color: 'var(--mt)', fontFamily: 'JetBrains Mono,monospace' }}>
        Sayfa {page} / {totalPages}
      </span>
    </div>
  )
}

function PBtn({ children, onClick, disabled, active, title }: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 28, height: 28, border: 'none', borderRadius: 6, cursor: disabled ? 'default' : 'pointer',
        display: 'grid', placeItems: 'center', fontSize: 11, fontFamily: 'JetBrains Mono,monospace',
        fontWeight: active ? 700 : 400, transition: 'all .13s',
        background: active ? 'var(--teal-dim)' : 'transparent',
        color: active ? 'var(--teal)' : disabled ? 'var(--mt)' : 'var(--tx2)',
        opacity: disabled ? .3 : 1,
        outline: active ? '1px solid var(--teal-bdr)' : 'none',
      }}
    >
      {children}
    </button>
  )
}
