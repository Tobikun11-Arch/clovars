import { Icon, icons } from '../icons'

export function AuthLayout({
  title,
  subtitle,
  backLabel,
  onBack,
  footer,
  children
}: {
  title: string
  subtitle?: string
  backLabel?: string
  onBack?: () => void
  footer?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="auth__brand">
          <span className="brand-mark">C</span>
          <span className="auth__brand-name">Clovars</span>
        </div>

        <div className="auth__card">
          {onBack && (
            <button type="button" className="auth__back" onClick={onBack}>
              <Icon d={icons.chevronRight} size={16} className="auth__back-icon" />
              {backLabel ?? 'Back'}
            </button>
          )}
          <h1 className="auth__title">{title}</h1>
          {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          {children}
        </div>

        {footer && <div className="auth__footer">{footer}</div>}
      </div>

      <aside className="auth__aside" aria-hidden="true">
        <div className="auth__aside-inner">
          <p className="auth__eyebrow">Time tracking, simplified</p>
          <p className="auth__aside-title">Know where your hours go — without the busywork.</p>
          <ul className="auth__points">
            <li>One running timer across every workspace</li>
            <li>Projects, clients, tasks and tags in one place</li>
            <li>Reports generated automatically from tracked time</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}
