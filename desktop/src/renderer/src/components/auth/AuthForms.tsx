import { useState } from 'react'
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyPayload
} from '../../types/auth'

interface LoginFormProps {
  onSubmit: (payload: LoginPayload) => void | Promise<void>
  loading: boolean
}

export function LoginForm({ onSubmit, loading }: LoginFormProps): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <section>
      <h2>Login</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit({ email, password })
        }}
      >
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </section>
  )
}

interface RegisterFormProps {
  onSubmit: (payload: RegisterPayload) => void | Promise<void>
  loading: boolean
}

export function RegisterForm({ onSubmit, loading }: RegisterFormProps): React.JSX.Element {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  return (
    <section>
      <h2>Register</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit({ firstName, lastName, email, username, password })
        }}
      >
        <label>
          First name
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </label>
        <label>
          Last name
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </section>
  )
}

interface VerifyFormProps {
  defaultEmail: string
  onSubmit: (payload: VerifyPayload) => void | Promise<void>
  onResend: (email: string) => void | Promise<void>
  loading: boolean
}

export function VerifyForm({
  defaultEmail,
  onSubmit,
  onResend,
  loading
}: VerifyFormProps): React.JSX.Element {
  const [email, setEmail] = useState(defaultEmail)
  const [code, setCode] = useState('')

  return (
    <section>
      <h2>Verify email</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit({ email, code })
        }}
      >
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Code
          <input value={code} onChange={(event) => setCode(event.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify'}
        </button>
        <button type="button" disabled={loading} onClick={() => void onResend(email)}>
          Resend code
        </button>
      </form>
    </section>
  )
}

interface ForgotFormProps {
  onSubmit: (payload: ForgotPasswordPayload) => void | Promise<void>
  loading: boolean
}

export function ForgotForm({ onSubmit, loading }: ForgotFormProps): React.JSX.Element {
  const [email, setEmail] = useState('')

  return (
    <section>
      <h2>Forgot password</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit({ email })
        }}
      >
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset code'}
        </button>
      </form>
    </section>
  )
}

interface ResetFormProps {
  onSubmit: (payload: ResetPasswordPayload) => void | Promise<void>
  loading: boolean
}

export function ResetForm({ onSubmit, loading }: ResetFormProps): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')

  return (
    <section>
      <h2>Reset password</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit({ email, code, newPassword })
        }}
      >
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Code
          <input value={code} onChange={(event) => setCode(event.target.value)} required />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </section>
  )
}

interface ProfileFormProps {
  onSubmit: (payload: ChangePasswordPayload) => void | Promise<void>
  loading: boolean
}

export function ProfileForm({ onSubmit, loading }: ProfileFormProps): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  return (
    <section>
      <h2>Profile / change password</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit({ currentPassword, newPassword })
        }}
      >
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Change password'}
        </button>
      </form>
    </section>
  )
}
