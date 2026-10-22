import { useEffect, useState } from 'react'
import { apiRequest } from './api/client'
import { WorkspacesSection } from './components/workspaces/WorkspacesSection'
import { WorkSection } from './components/work/WorkSection'
import { TimeSection } from './components/time/TimeSection'
import { useRunningTimer } from './hooks/useRunningTimer'
import { formatDuration } from './utils/time'
import type {
  AuthUser,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyPayload
} from './types/auth'
import './assets/main.css'

type View =
  | 'home'
  | 'login'
  | 'register'
  | 'verify'
  | 'forgot'
  | 'reset'
  | 'profile'
  | 'workspaces'
  | 'work'
  | 'time'

function App(): React.JSX.Element {
  const [view, setView] = useState<View>('home')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('')
  const timer = useRunningTimer({ enabled: Boolean(user), onError: setError })

  useEffect(() => {
    let cancelled = false

    async function bootstrapSession(): Promise<void> {
      try {
        await apiRequest('/api/auth/refresh', { method: 'POST' })
        const me = await apiRequest<{ user: AuthUser }>('/api/auth/me')
        if (!cancelled) setUser(me.user)
      } catch {
        if (!cancelled) setUser(null)
      }
    }

    void bootstrapSession()

    return () => {
      cancelled = true
    }
  }, [])

  function clearMessages(): void {
    setError(null)
    setInfo(null)
  }

  async function handleLogin(payload: LoginPayload): Promise<void> {
    setLoading(true)
    clearMessages()
    try {
      const result = await apiRequest<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setUser(result.user)
      setView('home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(payload: RegisterPayload): Promise<void> {
    setLoading(true)
    clearMessages()
    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setVerifyEmail(payload.email)
      setInfo('Registration successful. Check your email for the verification code.')
      setView('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(payload: VerifyPayload): Promise<void> {
    setLoading(true)
    clearMessages()
    try {
      await apiRequest('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setInfo('Email verified. You can now log in.')
      setView('login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerification(email: string): Promise<void> {
    setLoading(true)
    clearMessages()
    try {
      await apiRequest('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email })
      })
      setInfo('Verification code resent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resend failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(payload: ForgotPasswordPayload): Promise<void> {
    setLoading(true)
    clearMessages()
    try {
      await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setInfo('If that email exists, a reset code has been sent.')
      setView('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(payload: ResetPasswordPayload): Promise<void> {
    setLoading(true)
    clearMessages()
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setInfo('Password reset successfully. You can now log in.')
      setView('login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(payload: ChangePasswordPayload): Promise<void> {
    setLoading(true)
    clearMessages()
    try {
      await apiRequest('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
      setInfo('Password changed successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Change password failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout(): Promise<void> {
    setLoading(true)
    clearMessages()
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    } finally {
      timer.clear()
      setUser(null)
      setView('home')
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <h1>Clovars</h1>
          {user && timer.running && (
            <div className={timer.running.isPaused ? 'header-timer paused' : 'header-timer'}>
              <span className={timer.running.isPaused ? 'timer-dot paused' : 'timer-dot'} />
              <span className="header-timer-clock">{formatDuration(timer.elapsedSeconds)}</span>
              <span className="header-timer-label">
                {timer.running.projectName ??
                  timer.running.description ??
                  timer.running.workspaceName ??
                  'Tracking time'}
              </span>
              <button
                type="button"
                onClick={() => void (timer.running?.isPaused ? timer.resume() : timer.pause())}
              >
                {timer.running.isPaused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" onClick={() => void timer.stop()}>
                Stop
              </button>
            </div>
          )}
        </div>
        <nav>
          <button onClick={() => setView('home')}>Home</button>
          {!user ? (
            <>
              <button onClick={() => setView('login')}>Login</button>
              <button onClick={() => setView('register')}>Register</button>
            </>
          ) : (
            <>
              <button onClick={() => setView('time')}>Time</button>
              <button onClick={() => setView('work')}>Work</button>
              <button onClick={() => setView('workspaces')}>Workspaces</button>
              <button onClick={() => setView('profile')}>Profile</button>
              <button onClick={() => void handleLogout()}>Logout</button>
            </>
          )}
        </nav>
      </header>

      <main className="app-main">
        {error && <p className="error">{error}</p>}
        {info && <p className="info">{info}</p>}

        {view === 'home' && (
          <section>
            <h2>Home</h2>
            {user ? <p>Signed in as {user.email}</p> : <p>You are not signed in.</p>}
          </section>
        )}

        {view === 'login' && !user && <LoginForm onSubmit={handleLogin} loading={loading} />}

        {view === 'register' && !user && (
          <RegisterForm onSubmit={handleRegister} loading={loading} />
        )}

        {view === 'verify' && !user && (
          <VerifyForm
            defaultEmail={verifyEmail}
            onSubmit={handleVerify}
            onResend={handleResendVerification}
            loading={loading}
          />
        )}

        {view === 'forgot' && !user && <ForgotForm onSubmit={handleForgot} loading={loading} />}

        {view === 'reset' && !user && <ResetForm onSubmit={handleReset} loading={loading} />}

        {view === 'profile' && user && (
          <ProfileForm onSubmit={handleChangePassword} loading={loading} />
        )}

        {view === 'workspaces' && user && <WorkspacesSection currentUserId={user.id} />}

        {view === 'work' && user && <WorkSection />}

        {view === 'time' && user && (
          <TimeSection
            running={timer.running}
            runningElapsedSeconds={timer.elapsedSeconds}
            onRunningChange={timer.applyRunning}
          />
        )}
      </main>

      <footer className="app-footer">
        {!user && (
          <>
            <button onClick={() => setView('forgot')}>Forgot password?</button>
          </>
        )}
      </footer>
    </div>
  )
}

interface LoginFormProps {
  onSubmit: (payload: LoginPayload) => void | Promise<void>
  loading: boolean
}

function LoginForm({ onSubmit, loading }: LoginFormProps): React.JSX.Element {
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

function RegisterForm({ onSubmit, loading }: RegisterFormProps): React.JSX.Element {
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

function VerifyForm({
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

function ForgotForm({ onSubmit, loading }: ForgotFormProps): React.JSX.Element {
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

function ResetForm({ onSubmit, loading }: ResetFormProps): React.JSX.Element {
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

function ProfileForm({ onSubmit, loading }: ProfileFormProps): React.JSX.Element {
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

export default App
