/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useRef, useState } from 'react'

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

/* ---------- Buttons ---------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle' | 'link'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      className={cn(
        'btn',
        `btn--${variant}`,
        size !== 'md' && `btn--${size}`,
        block && 'btn--block',
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon: React.ReactNode
}

export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  icon,
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      className={cn(
        'btn',
        `btn--${variant}`,
        'btn--icon',
        size !== 'md' && `btn--${size}`,
        className
      )}
      aria-label={label}
      title={label}
      {...rest}
    >
      {icon}
    </button>
  )
}

export function Spinner({ size = 16 }: { size?: number }): React.JSX.Element {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
}

/* ---------- Badges and chips ---------- */
type BadgeVariant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'neutral'

export function Badge({
  variant = 'default',
  children,
  className = ''
}: {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return <span className={cn('badge', `badge--${variant}`, className)}>{children}</span>
}

export function Chip({
  label,
  color
}: {
  label: string
  color?: string | null
}): React.JSX.Element {
  return (
    <span className="chip" style={color ? { borderColor: color, color } : undefined}>
      <span className="chip__dot" style={{ background: color ?? 'var(--text-subtle)' }} />
      {label}
    </span>
  )
}

/* ---------- Cards and sections ---------- */
interface CardProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  flush?: boolean
}

export function Card({
  title,
  subtitle,
  actions,
  footer,
  children,
  className = '',
  bodyClassName = '',
  flush = false
}: CardProps): React.JSX.Element {
  return (
    <section className={cn('card', className)}>
      {(title || actions) && (
        <header className="card__header">
          <div className="card__heading">
            {title && <h2 className="card__title">{title}</h2>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className={cn('card__body', flush && 'card__body--flush', bodyClassName)}>
        {children}
      </div>
      {footer && <footer className="card__footer">{footer}</footer>}
    </section>
  )
}

export function Section({
  title,
  description,
  actions,
  children,
  className = ''
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <section className={cn('section', className)}>
      {(title || actions) && (
        <header className="section__header">
          <div className="section__heading">
            {title && <h2 className="section__title">{title}</h2>}
            {description && <p className="section__description">{description}</p>}
          </div>
          {actions && <div className="section__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function Divider(): React.JSX.Element {
  return <hr className="divider" />
}

/* ---------- Layout primitives ---------- */
export function Stack({
  gap = 4,
  className = '',
  children
}: {
  gap?: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className={cn('stack', className)} style={{ gap: `var(--sp-${gap})` }}>
      {children}
    </div>
  )
}

export function Inline({
  gap = 2,
  align = 'center',
  justify = 'start',
  wrap = false,
  className = '',
  children
}: {
  gap?: 1 | 2 | 3 | 4 | 5 | 6
  align?: 'start' | 'center' | 'end' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between'
  wrap?: boolean
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div
      className={cn('inline', wrap && 'inline--wrap', className)}
      style={{
        gap: `var(--sp-${gap})`,
        alignItems: align,
        justifyContent: justify === 'between' ? 'space-between' : justify
      }}
    >
      {children}
    </div>
  )
}

export function Grid({
  cols = 2,
  min = 220,
  className = '',
  children
}: {
  cols?: 2 | 3 | 4
  min?: number
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div
      className={cn('grid', className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))` }}
      data-cols={cols}
    >
      {children}
    </div>
  )
}

export function Toolbar({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return <div className={cn('toolbar', className)}>{children}</div>
}

/* ---------- Form primitives ---------- */
export function Field({
  label,
  hint,
  error,
  required = false,
  className = '',
  children
}: {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: string | null
  required?: boolean
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className={cn('field', error && 'field--error', className)}>
      {label && (
        <span className="field__label">
          {label}
          {required && (
            <span className="field__required" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}
      {children}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && (
        <span className="field__error" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

export function Input({
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return <input className={cn('input', className)} {...rest} />
}

export function Select({
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>): React.JSX.Element {
  return (
    <select className={cn('select', className)} {...rest}>
      {children}
    </select>
  )
}

export function Textarea({
  className = '',
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>): React.JSX.Element {
  return <textarea className={cn('textarea', className)} {...rest} />
}

export function Checkbox({
  label,
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }): React.JSX.Element {
  return (
    <label className={cn('checkbox', className)}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  )
}

export function PasswordInput({
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  const [visible, setVisible] = useState(false)

  return (
    <span className="password-field">
      <input
        className={cn('input', 'password-field__input', className)}
        type={visible ? 'text' : 'password'}
        {...rest}
      />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </span>
  )
}

export function SearchInput({
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return (
    <span className={cn('search-field', className)}>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
        className="search-field__icon"
      >
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M20 20l-3.5-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <input type="search" className="input search-field__input" {...rest} />
    </span>
  )
}

/* ---------- States ---------- */
export function EmptyState({
  title,
  description,
  action,
  icon
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">
        {icon ?? '•'}
      </div>
      <h3 className="empty__title">{title}</h3>
      {description && <p className="empty__description">{description}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry
}: {
  title?: string
  message?: string | null
  onRetry?: () => void
}): React.JSX.Element {
  return (
    <div className="empty empty--error" role="alert">
      <div className="empty__icon" aria-hidden="true">
        !
      </div>
      <h3 className="empty__title">{title}</h3>
      {message && <p className="empty__description">{message}</p>}
      {onRetry && (
        <div className="empty__action">
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}

export function Skeleton({
  height = 16,
  width = '100%',
  className = ''
}: {
  height?: number | string
  width?: number | string
  className?: string
}): React.JSX.Element {
  return <span className={cn('skeleton', className)} style={{ height, width }} aria-hidden="true" />
}

/* ---------- Table ---------- */
export function TableContainer({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return <div className={cn('table-wrap', className)}>{children}</div>
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label
}: {
  items: Array<{ value: T; label: string; count?: number }>
  value: T
  onChange: (value: T) => void
  label?: string
}): React.JSX.Element {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={cn('tab', value === item.value && 'tab--active')}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {typeof item.count === 'number' && <span className="tab__count">{item.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------- Segmented Control ---------- */
export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  label
}: {
  items: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  label?: string
}): React.JSX.Element {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          className={cn('segmented-control__item', value === item.value && 'is-active')}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Display helpers ---------- */
export function Avatar({
  name = '',
  size = 'md'
}: {
  name?: string
  size?: 'sm' | 'md' | 'lg'
}): React.JSX.Element {
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <span className={cn('avatar', `avatar--${size}`)} aria-hidden="true">
      {initials || 'U'}
    </span>
  )
}

export function StatCard({
  label,
  value,
  meta,
  tone = 'default'
}: {
  label: string
  value: React.ReactNode
  meta?: React.ReactNode
  tone?: 'default' | 'primary' | 'success'
}): React.JSX.Element {
  return (
    <div className={cn('stat', tone !== 'default' && `stat--${tone}`)}>
      <span className="stat__label">{label}</span>
      <span className="stat__value tabular">{value}</span>
      {meta && <span className="stat__meta">{meta}</span>}
    </div>
  )
}

export function ProgressBar({
  value,
  max = 100,
  color
}: {
  value: number
  max?: number
  color?: string | null
}): React.JSX.Element {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0

  return (
    <div className="progress" role="presentation">
      <div
        className="progress__bar"
        style={{ width: `${pct}%`, background: color ?? 'var(--primary)' }}
      />
    </div>
  )
}

export function BarChart({
  data,
  height = 140,
  formatValue
}: {
  data: Array<{ label: string; seconds: number; color?: string | null }>
  height?: number
  formatValue: (seconds: number) => string
}): React.JSX.Element {
  const max = Math.max(...data.map((item) => item.seconds), 1)

  return (
    <div className="bar-chart" style={{ height }}>
      {data.map((item, index) => (
        <div className="bar-chart__col" key={`${item.label}-${index}`}>
          <div className="bar-chart__track">
            <div
              className="bar-chart__bar"
              style={{
                height: `${item.seconds > 0 ? Math.max(4, Math.round((item.seconds / max) * 100)) : 0}%`,
                background: item.color ?? 'var(--primary)'
              }}
              title={`${item.label}: ${formatValue(item.seconds)}`}
            />
          </div>
          <span className="bar-chart__label">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export function CopyButton({
  value,
  label = 'Copy'
}: {
  value: string
  label?: string
}): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      showToast('Copied to clipboard', 'success')
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      showToast('Could not copy to clipboard', 'error')
    }
  }

  return (
    <Button size="sm" variant="ghost" onClick={() => void handleCopy()}>
      {copied ? 'Copied' : label}
    </Button>
  )
}

/* ---------- Focus trap ---------- */
export function useFocusTrap(
  open: boolean,
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void
): void {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null

    const focusables = (): HTMLElement[] => {
      const node = ref.current
      if (!node) return []
      return Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement)
    }

    const first = focusables()[0]
    first?.focus()

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const items = focusables()
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [open, ref])
}

/* ---------- Modal ---------- */
interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md'
}: ModalProps): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(open, ref, onClose)

  if (!open) return null

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        className={cn('modal', `modal--${size}`)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal__header">
          <div>
            <h2 className="modal__title">{title}</h2>
            {description && <p className="modal__description">{description}</p>}
          </div>
          <IconButton label="Close" icon="✕" onClick={onClose} />
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  )
}

/* ---------- Drawer ---------- */
export function Drawer({
  open,
  title,
  description,
  onClose,
  children,
  footer
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(open, ref, onClose)

  if (!open) return null

  return (
    <div
      className="overlay overlay--drawer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer__header">
          <div>
            <h2 className="modal__title">{title}</h2>
            {description && <p className="modal__description">{description}</p>}
          </div>
          <IconButton label="Close" icon="✕" onClick={onClose} />
        </header>
        <div className="drawer__body">{children}</div>
        {footer && <footer className="drawer__footer">{footer}</footer>}
      </aside>
    </div>
  )
}

/* ---------- Confirm dialog (promise-based) ---------- */
export interface ConfirmOptions {
  title: string
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

let confirmNotify: ((options: ConfirmOptions | null) => void) | null = null
let confirmResolve: ((value: boolean) => void) | null = null

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (!confirmNotify) {
    return Promise.resolve(window.confirm(options.title))
  }

  return new Promise<boolean>((resolve) => {
    confirmResolve = resolve
    confirmNotify?.(options)
  })
}

function settleConfirm(value: boolean): void {
  confirmResolve?.(value)
  confirmResolve = null
  confirmNotify?.(null)
}

export function ConfirmHost(): React.JSX.Element {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)

  useEffect(() => {
    confirmNotify = setOptions
    return () => {
      confirmNotify = null
    }
  }, [])

  return (
    <Modal
      open={Boolean(options)}
      title={options?.title ?? ''}
      onClose={() => settleConfirm(false)}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => settleConfirm(false)}>
            {options?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant={options?.danger ? 'danger' : 'primary'}
            onClick={() => settleConfirm(true)}
          >
            {options?.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    >
      {options?.message && <div className="confirm-message">{options.message}</div>}
    </Modal>
  )
}

/* ---------- Toasts ---------- */
type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

let toastCounter = 0
const toastListeners = new Set<(items: ToastItem[]) => void>()
let toastItems: ToastItem[] = []

function emitToasts(): void {
  toastListeners.forEach((callback) => callback([...toastItems]))
}

function dismissToast(id: number): void {
  toastItems = toastItems.filter((item) => item.id !== id)
  emitToasts()
}

export function showToast(message: string, type: ToastType = 'info'): void {
  const id = ++toastCounter
  toastItems = [...toastItems, { id, message, type }]
  emitToasts()

  window.setTimeout(() => {
    toastItems = toastItems.filter((item) => item.id !== id)
    emitToasts()
  }, 4000)
}

export function ToastContainer(): React.JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const callback = (next: ToastItem[]): void => setItems(next)
    toastListeners.add(callback)
    return () => {
      toastListeners.delete(callback)
    }
  }, [])

  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {items.map((item) => (
        <div key={item.id} className={cn('toast', `toast--${item.type}`)} role="status">
          <span className="toast__icon" aria-hidden="true">
            {item.type === 'success' ? '✓' : item.type === 'error' ? '!' : 'i'}
          </span>
          <span className="toast__message">{item.message}</span>
          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(item.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

/* ---------- Clipboard helper ---------- */
export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

/* ---------- Small hook: click outside ---------- */
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  onOutside: () => void
): void {
  const callback = useCallback(() => {
    onOutside()
  }, [onOutside])

  useEffect(() => {
    if (!enabled) return

    function onPointerDown(event: MouseEvent): void {
      const node = ref.current
      if (node && event.target instanceof Node && !node.contains(event.target)) {
        callback()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [enabled, ref, callback])
}
