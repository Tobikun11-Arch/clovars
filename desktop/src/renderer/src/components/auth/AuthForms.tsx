import { useId, useRef, useState } from 'react'
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
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

const CODE_LENGTH = 6

interface CodeInputProps {
  value: string
  onChange: (value: string) => void
  labelledBy: string
  invalid?: boolean
  autoFocus?: boolean
}

function CodeInput({
  value,
  onChange,
  labelledBy,
  invalid,
  autoFocus
}: CodeInputProps): React.JSX.Element {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? '')

  function focusAt(index: number): void {
    const target = refs.current[Math.max(0, Math.min(CODE_LENGTH - 1, index))]
    target?.focus()
    target?.select()
  }

  function setDigits(next: string[]): void {
    onChange(next.join('').slice(0, CODE_LENGTH))
  }

  function handleChange(index: number, raw: string): void {
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) return
    const next = [...digits]
    // Typing (or autofill) can deliver several digits at once — spread them forward.
    for (let i = 0; i < cleaned.length && index + i < CODE_LENGTH; i++) {
      next[index + i] = cleaned[i]
    }
    setDigits(next)
    focusAt(index + cleaned.length)
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = [...digits]
      if (next[index]) {
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        next[index - 1] = ''
        setDigits(next)
        focusAt(index - 1)
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusAt(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusAt(index + 1)
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>): void {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    event.preventDefault()
    onChange(pasted)
    focusAt(pasted.length)
  }

  return (
    <div className="code-input" role="group" aria-labelledby={labelledBy}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          className="code-input__cell"
          value={digit}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={CODE_LENGTH}
          aria-invalid={invalid || undefined}
          autoFocus={autoFocus && index === 0}
          aria-label={`Digit ${index + 1}`}
          onFocus={(event) => event.target.select()}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  )
}

interface ResetCodeFormProps {
  onSubmit: (code: string) => void | Promise<void>
  onResend: () => void | Promise<void>
  onChangeEmail: () => void
  loading: boolean
  error?: string | null
}

export function ResetCodeForm({
  onSubmit,
  onResend,
  onChangeEmail,
  loading,
  error
}: ResetCodeFormProps): React.JSX.Element {
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const labelId = useId()

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()
    if (loading) return

    if (code.length !== CODE_LENGTH) {
      setFieldError(`Enter the ${CODE_LENGTH}-digit code from your email.`)
      return
    }

    setFieldError(null)
    void onSubmit(code)
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <AuthError error={error ?? fieldError} />
      <div className="field">
        <span className="field__label" id={labelId}>
          Reset code
        </span>
        {/* Not disabled while verifying: disabling drops focus, stranding keyboard users after a wrong code. */}
        <CodeInput
          value={code}
          onChange={setCode}
          labelledBy={labelId}
          invalid={Boolean(error ?? fieldError)}
          autoFocus
        />
      </div>
      <Button variant="primary" type="submit" block loading={loading}>
        Verify code
      </Button>
      <p className="auth__hint">
        Didn&apos;t get it?{' '}
        <Button variant="link" disabled={loading} onClick={() => void onResend()}>
          Resend code
        </Button>
        {' · '}
        <Button variant="link" disabled={loading} onClick={onChangeEmail}>
          Use a different email
        </Button>
      </p>
    </form>
  )
}

interface ResetPasswordFormProps {
  onSubmit: (newPassword: string) => void | Promise<void>
  loading: boolean
  error?: string | null
}

export function ResetPasswordForm({
  onSubmit,
  loading,
  error
}: ResetPasswordFormProps): React.JSX.Element {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()

    if (newPassword.length < 8) {
      setFieldError('Passwords need at least 8 characters.')
      return
    }
    if (newPassword !== confirm) {
      setFieldError('Passwords do not match.')
      return
    }

    setFieldError(null)
    void onSubmit(newPassword)
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <AuthError error={error ?? fieldError} />
      <Stack gap={4}>
        <Field label="New password" required hint="At least 8 characters.">
          <PasswordInput
            value={newPassword}
            autoComplete="new-password"
            autoFocus
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
