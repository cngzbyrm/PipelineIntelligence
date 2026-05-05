import type { ReactNode } from 'react'

export interface PageHeaderProps {
    /** Phosphor ikonu (örn. `<Vault size={22} weight="duotone" />`) */
    icon: ReactNode
    /** Üstte küçük etiket */
    kicker?: string
    title: string
    subtitle?: string
    /** Sağ üst (örn. butonlar) */
    actions?: ReactNode
    className?: string
}

export default function PageHeader({
    icon,
    kicker,
    title,
    subtitle,
    actions,
    className = '',
}: PageHeaderProps) {
    return (
        <header className={`page-hero ${className}`.trim()}>
            <div className="page-hero-glow" aria-hidden />
            <div className={`page-hero-top${actions ? ' page-hero-top--has-actions' : ''}`}>
                <div className="page-hero-leading">
                    <div className="page-hero-icon-wrap" aria-hidden>
                        {icon}
                    </div>
                    <div className="page-hero-copy">
                        {kicker ? <div className="page-hero-kicker">{kicker}</div> : null}
                        <h1 className="page-hero-heading">{title}</h1>
                        {subtitle ? <p className="page-hero-sub">{subtitle}</p> : null}
                    </div>
                </div>
                {actions ? <div className="page-hero-actions">{actions}</div> : null}
            </div>
        </header>
    )
}
