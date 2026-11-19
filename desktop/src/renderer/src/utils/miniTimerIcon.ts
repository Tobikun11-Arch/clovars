import { useEffect, useState } from 'react'

// The custom mini timer icon lives in localStorage on this computer only. The
// main window and the mini timer window share an origin, so both read it, and
// the `storage` event keeps the other window in sync.
export const MINI_TIMER_ICON_KEY = 'clovars.miniTimerIcon'
const ICON_CHANGE_EVENT = 'clovars:mini-timer-icon-changed'
const ICON_SIZE = 128
const MAX_SOURCE_BYTES = 10 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export function getMiniTimerIcon(): string | null {
  try {
    return localStorage.getItem(MINI_TIMER_ICON_KEY)
  } catch {
    return null
  }
}

export function setMiniTimerIcon(dataUrl: string | null): void {
  try {
    if (dataUrl) {
      localStorage.setItem(MINI_TIMER_ICON_KEY, dataUrl)
    } else {
      localStorage.removeItem(MINI_TIMER_ICON_KEY)
    }
  } catch {
    throw new Error('Could not save the icon on this computer.')
  }
  window.dispatchEvent(new Event(ICON_CHANGE_EVENT))
}

/** Center-crops an image to a square and shrinks it to a small PNG (keeps transparency). */
export async function prepareMiniTimerIcon(file: Blob): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Choose a PNG, JPEG, WebP or GIF image.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('That image is larger than 10 MB.')
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That file could not be read as an image.')
  })

  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - side) / 2
    const sy = (bitmap.height - side) / 2

    const canvas = document.createElement('canvas')
    canvas.width = ICON_SIZE
    canvas.height = ICON_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not process the image.')

    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, ICON_SIZE, ICON_SIZE)

    return canvas.toDataURL('image/png')
  } finally {
    bitmap.close()
  }
}

/** Current custom icon (or null), updated live when either window changes it. */
export function useMiniTimerIcon(): string | null {
  const [icon, setIcon] = useState(getMiniTimerIcon)

  useEffect(() => {
    const refresh = (): void => setIcon(getMiniTimerIcon())
    const onStorage = (event: StorageEvent): void => {
      if (event.key === null || event.key === MINI_TIMER_ICON_KEY) refresh()
    }

    window.addEventListener(ICON_CHANGE_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(ICON_CHANGE_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return icon
}
