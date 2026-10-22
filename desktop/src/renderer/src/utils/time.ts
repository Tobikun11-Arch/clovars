export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export function formatDurationShort(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.round((safe % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`
  }

  if (minutes > 0) {
    return `${minutes}m`
  }

  return `${safe}s`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function toDateTimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export function toDateTimeLocal(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return ''

  return toDateTimeLocalValue(date)
}

export function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000)
}

export function calculateSeconds(start: string, end: string): number {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 0

  return Math.round((endMs - startMs) / 1000)
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function isToday(iso: string): boolean {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return false

  const now = new Date()

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isSameLocalDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  )
}

export function localDayKey(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return 'unknown'

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function formatDayLabel(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return 'Unknown date'

  const today = new Date()

  if (isSameLocalDay(date, today)) return 'Today'

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (isSameLocalDay(date, yesterday)) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric'
  })
}
