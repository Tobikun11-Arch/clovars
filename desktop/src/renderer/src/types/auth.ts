export type AuthUserType = 'user' | 'admin'

export interface AuthUser {
  id: string
  email: string
  type: AuthUserType
  firstName?: string
  lastName?: string
  username?: string | null
  avatarUrl?: string | null
}

export interface UpdateProfilePayload {
  firstName: string
  lastName: string
  username: string
}

/** Full name when known, otherwise the email's local part. */
export function displayName(user: Pick<AuthUser, 'email' | 'firstName' | 'lastName'>): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return full || user.email?.split('@')[0] || ''
}

export interface LoginResponse {
  user: AuthUser
}

export interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  password: string
  username: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface VerifyPayload {
  email: string
  code: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  email: string
  code: string
  newPassword: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}
