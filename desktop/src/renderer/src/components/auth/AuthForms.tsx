import { useState } from 'react'
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyPayload
} from '../../types/auth'
import { Button, Field, Input, PasswordInput, Stack } from '../ui'

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function AuthError({ error }: { error?: string | null }): React.JSX.Element | null {
  if (!error) return null
  return (
    <div className="form-alert" role="alert">
      {error}
    </div>
  )
}

interface LoginFormProps {
  onSubmit: (payload: LoginPayload) => void | Promise<void>
  loading: boolean
  error?: string | null
}

export function LoginForm({ onSubmit, loading, error }: LoginFormProps): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()

    if (!isEmail(email)) {
      setFieldError('Enter a valid email address.')
      return
    }
    if (!password) {
      setFieldError('Enter your password.')
      return
    }

    setFieldError(null)
    void onSubmit({ email: email.trim(), password })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <AuthError error={error ?? fieldError} />
      <Stack gap={4}>
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Password" required>
          <PasswordInput
            value={password}
            autoComplete="current-password"
            placeholder="Your password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
      </Stack>
      <Button variant="primary" type="submit" block loading={loading}>
        Sign in
      </Button>
    </form>
  )
}

interface RegisterFormProps {
  onSubmit: (payload: RegisterPayload) => void | Promise<void>
  loading: boolean
  error?: string | null
}

export function RegisterForm({ onSubmit, loading, error }: RegisterFormProps): React.JSX.Element {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()

    if (!firstName.trim() || !lastName.trim()) {
      setFieldError('Enter your first and last name.')
      return
    }
    if (!isEmail(email)) {
      setFieldError('Enter a valid email address.')
      return
    }
    if (username.trim().length < 3) {
      setFieldError('Usernames need at least 3 characters.')
      return
    }
    if (password.length < 8) {
      setFieldError('Passwords need at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setFieldError('Passwords do not match.')
      return
    }

    setFieldError(null)
    void onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      username: username.trim(),
      password
    })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <AuthError error={error ?? fieldError} />
      <Stack gap={4}>
        <div className="form-row">
          <Field label="First name" required>
            <Input
              value={firstName}
              autoComplete="given-name"
              autoFocus
              onChange={(event) => setFirstName(event.target.value)}
            />
          </Field>
          <Field label="Last name" required>
            <Input
              value={lastName}
              autoComplete="family-name"
              onChange={(event) => setLastName(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            autoComplete="email"
            placeholder="you@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Username" required hint="At least 3 characters.">
          <Input
            value={username}
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
          />
        </Field>
        <Field label="Password" required hint="At least 8 characters.">
          <PasswordInput
            value={password}
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field label="Confirm password" required>
          <PasswordInput
            value={confirm}
            autoComplete="new-password"
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>
      </Stack>
      <Button variant="primary" type="submit" block loading={loading}>
        Create account
      </Button>
    </form>
  )
}

interface VerifyFormProps {
  defaultEmail: string
  onSubmit: (payload: VerifyPayload) => void | Promise<void>
  onResend: (email: string) => void | Promise<void>
  loading: boolean
  error?: string | null
}

export function VerifyForm({
  defaultEmail,
  onSubmit,
  onResend,
  loading,
  error
}: VerifyFormProps): React.JSX.Element {
  const [email, setEmail] = useState(defaultEmail)
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()

    if (!isEmail(email)) {
      setFieldError('Enter the email you registered with.')
      return
    }
    if (code.trim().length < 4) {
      setFieldError('Enter the verification code from your email.')
      return
    }

    setFieldError(null)
    void onSubmit({ email: email.trim(), code: code.trim() })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <AuthError error={error ?? fieldError} />
      <Stack gap={4}>
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Verification code" required hint="Check your inbox for the 6-digit code.">
          <Input
            value={code}
            inputMode="numeric"
            maxLength={12}
            className="input--code"
            autoFocus
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>
      </Stack>
      <Button variant="primary" type="submit" block loading={loading}>
        Verify email
      </Button>
      <Button variant="ghost" block disabled={loading} onClick={() => void onResend(email.trim())}>
        Resend code
      </Button>
    </form>
  )
}

interface ForgotFormProps {
  onSubmit: (payload: ForgotPasswordPayload) => void | Promise<void>
  loading: boolean
  error?: string | null
}

export function ForgotForm({ onSubmit, loading, error }: ForgotFormProps): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()

    if (!isEmail(email)) {
      setFieldError('Enter a valid email address.')
      return
    }

    setFieldError(null)
    void onSubmit({ email: email.trim() })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <AuthError error={error ?? fieldError} />
      <Field label="Email" required hint="We'll send a reset code if the account exists.">
        <Input
          type="email"
          value={email}
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Button variant="primary" type="submit" block loading={loading}>
        Send reset code
      </Button>
    </form>
  )
}

interface ResetFormProps {
  defaultEmail: string
  onSubmit: (payload: ResetPasswordPayload) => void | Promise<void>
  loading: boolean
  error?: string | null
}

export function ResetForm({
  defaultEmail,
  onSubmit,
  loading,
  error
}: ResetFormProps): React.JSX.Element {
  const [email, setEmail] = useState(defaultEmail)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()

    if (!isEmail(email)) {
      setFieldError('Enter a valid email address.')
      return
    }
    if (code.trim().length < 4) {
      setFieldError('Enter the reset code from your email.')
      return
    }
    if (newPassword.length < 8) {
      setFieldError('Passwords need at least 8 characters.')
      return
    }
    if (newPassword !== confirm) {
      setFieldError('Passwords do not match.')
      return
    }

    setFieldError(null)
    void onSubmit({ email: email.trim(), code: code.trim(), newPassword })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <AuthError error={error ?? fieldError} />
      <Stack gap={4}>
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Reset code" required>
          <Input
            value={code}
            inputMode="numeric"
            maxLength={12}
            className="input--code"
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>
        <Field label="New password" required hint="At least 8 characters.">
          <PasswordInput
            value={newPassword}
            autoComplete="new-password"
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
        <Field label="Confirm new password" required>
          <PasswordInput
            value={confirm}
            autoComplete="new-password"
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>
      </Stack>
      <Button variant="primary" type="submit" block loading={loading}>
        Reset password
      </Button>
    </form>
  )
}

interface ProfileFormProps {
  onSubmit: (payload: ChangePasswordPayload) => void | Promise<void>
  loading: boolean
}

export function ProfileForm({ onSubmit, loading }: ProfileFormProps): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()

    if (!currentPassword) {
      setFieldError('Enter your current password.')
      return
    }
    if (newPassword.length < 8) {
      setFieldError('New passwords need at least 8 characters.')
      return
    }
    if (newPassword !== confirm) {
      setFieldError('New passwords do not match.')
      return
    }

    setFieldError(null)
    void onSubmit({ currentPassword, newPassword })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <AuthError error={fieldError} />
      <Stack gap={4}>
        <Field label="Current password" required>
          <PasswordInput
            value={currentPassword}
            autoComplete="current-password"
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>
        <Field label="New password" required hint="At least 8 characters.">
          <PasswordInput
            value={newPassword}
            autoComplete="new-password"
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
        <Field label="Confirm new password" required>
          <PasswordInput
            value={confirm}
            autoComplete="new-password"
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>
      </Stack>
      <Button variant="secondary" type="submit" loading={loading}>
        Change password
      </Button>
    </form>
  )
}
