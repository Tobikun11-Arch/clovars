/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'

/* ---------- Button ---------- */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: React.ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  const cls = `btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`.trim()
  return (
    <button className={cls} {...rest}>
      {icon}
      {children}
    </button>
  )
}

/* ---------- Card ---------- */
interface CardProps {
  title?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Card({ title, actions, children, className = '' }: CardProps): React.JSX.Element {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="row-between" style={{ marginBottom: 'var(--sp-3)' }}>
          {title && (
            <h3 className="card-title" style={{ margin: 0 }}>
              {title}
            </h3>
          )}
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}

/* ---------- Badge ---------- */
interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning'
  children: React.ReactNode
}

export function Badge({ variant = 'default', children }: BadgeProps): React.JSX.Element {
  const cls = variant === 'default' ? 'badge' : `badge badge-${variant}`
  return <span className={cls}>{children}</span>
}

/* ---------- PageHeader ---------- */
interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps): React.JSX.Element {
  return (
    <div className="page-header">
      <div className="page-header-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}

/* ---------- EmptyState ---------- */
interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  action,
  icon
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

/* ---------- Modal ---------- */
interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer
}: ModalProps): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
        {footer && (
          <div className="row" style={{ marginTop: 'var(--sp-4)', justifyContent: 'flex-end' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- Drawer ---------- */
interface DrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Drawer({ open, title, onClose, children }: DrawerProps): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <>
      <div className="drawer-backdrop open" onClick={onClose} />
      <div className="drawer">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

/* ---------- Toast ---------- */
interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let toastCounter = 0
const toastListeners = new Set<(items: ToastItem[]) => void>()
let toastItems: ToastItem[] = []

function emit(): void {
  toastListeners.forEach((cb) => cb([...toastItems]))
}

export function showToast(message: string, type: ToastItem['type'] = 'info'): void {
  const id = ++toastCounter
  toastItems = [...toastItems, { id, message, type }]
  emit()
  setTimeout(() => {
    toastItems = toastItems.filter((t) => t.id !== id)
    emit()
  }, 3500)
}

export function ToastContainer(): React.JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    const cb = (next: ToastItem[]): void => setItems(next)
    toastListeners.add(cb)
    return () => {
      toastListeners.delete(cb)
    }
  }, [])
  return (
    <div className="toast-container">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

/* ---------- Skeleton ---------- */
export function Skeleton({
  height = 16,
  width = '100%'
}: {
  height?: number
  width?: string | number
}): React.JSX.Element {
  return (
    <div
      style={{
        height,
        width,
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)',
        animation: 'pulse 1.2s ease-in-out infinite'
      }}
    />
  )
}

/* pulse keyframe */
const style = document.createElement('style')
style.textContent = `@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`
document.head.appendChild(style)
