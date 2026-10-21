export type AuthUserType = 'user' | 'admin'

export interface AuthUser {
  id: string
  email: string
  type: AuthUserType
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
