import type { PageWidth } from '../../routes'
import { cn } from '../ui'

export function Page({
  width = 'default',
  className = '',
  children
}: {
  width?: PageWidth
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return <div className={cn('page', `page--${width}`, className)}>{children}</div>
}
