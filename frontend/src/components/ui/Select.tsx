import { useState, useRef, useEffect } from 'react'
import { CaretDown } from '@phosphor-icons/react'

interface Option {
    value: string
    label: string
}

interface Props {
    value: string
    onChange: (value: string) => void
    options: Option[]
    placeholder?: string
    style?: React.CSSProperties
    className?: string
    width?: number | string
}

export default function Select({ value, onChange, options, placeholder, style, className, width }: Props) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState<'bottom' | 'top'>('bottom')
    const ref = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const selected = options.find(o => o.value === value)

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    useEffect(() => {
        if (open && ref.current) {
            const rect = ref.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            setPos(spaceBelow < 200 ? 'top' : 'bottom')
        }
    }, [open])

    function select(v: string) {
        onChange(v)
        setOpen(false)
    }

    return (
        <div
            ref={ref}
            style={{ position: 'relative', display: 'inline-block', width: width ?? 'auto', ...style }}
            className={className}
        >
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%',
                    padding: '7px 32px 7px 11px',
                    border: `1px solid ${open ? 'var(--teal)' : 'var(--glass-bdr)'}`,
                    borderRadius: 8,
                    fontSize: 12,
                    background: 'var(--glass)',
                    color: selected ? 'var(--tx)' : 'var(--mt)',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    boxShadow: open ? '0 0 0 3px rgba(45,212,191,.15)' : 'none',
                    transition: 'border-color .15s, box-shadow .15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    whiteSpace: 'nowrap',
                    textAlign: 'left',
                }}
            >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selected?.label ?? placeholder ?? 'Seçin...'}
                </span>
                <CaretDown
                    size={11}
                    weight="bold"
                    color="var(--mt)"
                    style={{
                        flexShrink: 0,
                        transition: 'transform .2s',
                        transform: open ? 'rotate(180deg)' : 'none',
                    }}
                />
            </button>

            {/* Dropdown list */}
            {open && (
                <div
                    ref={listRef}
                    style={{
                        position: 'absolute',
                        zIndex: 9999,
                        left: 0,
                        right: 0,
                        minWidth: '100%',
                        ...(pos === 'bottom' ? { top: 'calc(100% + 4px)' } : { bottom: 'calc(100% + 4px)' }),
                        background: 'var(--glass3, rgba(13,31,45,.97))',
                        border: '1px solid var(--glass-bdr)',
                        borderRadius: 10,
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,.35)',
                        overflow: 'hidden',
                        animation: 'sel-open .15s ease',
                    }}
                >
                    <style>{`
            @keyframes sel-open {
              from { opacity: 0; transform: translateY(${pos === 'bottom' ? '-6px' : '6px'}) }
              to   { opacity: 1; transform: translateY(0) }
            }
          `}</style>
                    <div style={{ maxHeight: 220, overflowY: 'auto', padding: 4 }}>
                        {options.map(o => {
                            const isSelected = o.value === value
                            return (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => select(o.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: 7,
                                        border: 'none',
                                        background: isSelected ? 'var(--teal-dim)' : 'transparent',
                                        color: isSelected ? 'var(--teal)' : 'var(--tx)',
                                        fontSize: 12,
                                        fontFamily: 'Inter, sans-serif',
                                        fontWeight: isSelected ? 600 : 400,
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'background .1s',
                                        whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={e => {
                                        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,191,.06)'
                                    }}
                                    onMouseLeave={e => {
                                        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                                    }}
                                >
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
                                    {isSelected && (
                                        <span style={{ fontSize: 10, color: 'var(--teal)', marginLeft: 8 }}>✓</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
