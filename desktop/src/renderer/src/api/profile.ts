import { apiRequest } from './client'
import type { AuthUser, UpdateProfilePayload } from '../types/auth'

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  return response.user
}

export async function uploadAvatar(avatar: string): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>('/api/auth/profile/avatar', {
    method: 'PUT',
    body: JSON.stringify({ avatar })
  })
  return response.user
}

export async function removeAvatar(): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>('/api/auth/profile/avatar', {
    method: 'DELETE'
  })
  return response.user
}

const AVATAR_SIZE = 256
const MAX_SOURCE_BYTES = 10 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/**
 * Center-crops the picked image to a square and scales it to 256×256 JPEG,
 * so uploads stay small (typically 15–40 KB) whatever the user selects.
 */
export async function prepareAvatar(file: File): Promise<string> {
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
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not process the image.')

    // JPEG has no transparency; paint white behind transparent PNGs.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)

    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    bitmap.close()
  }
}
