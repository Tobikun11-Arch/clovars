import { useEffect, useState } from 'react'
import { apiRequest } from './api/client'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { useHashRoute } from './hooks/useHashRoute'
import { metaFor } from './routes'
import { AppShell } from './components/layout/AppShell'
import { AuthLayout } from './components/layout/AuthLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import {
  LoginForm,
  RegisterForm,
  VerifyForm,
  ForgotForm,
  ResetForm
} from './components/auth/AuthForms'
import { WorkspacesSection } from './components/workspaces/WorkspacesSection'
import { WorkSection } from './components/work/WorkSection'
import { TimeSection } from './components/time/TimeSection'
import { MiniTimer } from './components/time/MiniTimer'
import { ReportsSection } from './components/reports/ReportsSection'
import { ProfileSection } from './components/profile/ProfileSection'
import { DashboardSection } from './components/dashboard/DashboardSection'
import { useRunningTimer } from './hooks/useRunningTimer'
import {
  Button,
  ConfirmHost,
  EmptyState,
  showToast,
  Spinner,
  Stack,
  ToastContainer
} from './components/ui'
import type {
  AuthUser,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyPayload
} from './types/auth'
import logo from './assets/logo.png'

function Splash(): React.JSX.Element {
  return (
    <div className="boot">
      <img className="brand-logo brand-logo--lg" src={logo} alt="Clovars" />
      <Spinner size={20} />
    </div>
  )
}

function App(): React.JSX.Element {
  const { path, navigate } = useHashRoute()
  const isMiniWindow = path === '/mini'
  const [user, setUser] = useState<AuthUser | null>(null)
  const [bootstrapped, setBootstrapped] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [verifyEmail, setVerifyEmail] = useState('')
  const [resetEmail, setResetEmail] = useState('')

  const timer = useRunningTimer({
    enabled: Boolean(user) && !isMiniWindow,
    onError: (message) => {
      if (message) showToast(message, 'error')
    }
  })

  const isAuthed = Boolean(user)
  const meta = metaFor(path)

  useEffect(() => {
    if (isMiniWindow) {
      setBootstrapped(true)
      return
    }

    let cancelled = false

    async function bootstrapSession(): Promise<void> {
      try {
        await apiRequest('/api/auth/refresh', { method: 'POST' })
        const me = await apiRequest<{ user: AuthUser }>('/api/auth/me')
        if (!cancelled) setUser(me.user)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setBootstrapped(true)
      }
    }

    void bootstrapSession()
    return () => {
      cancelled = true
    }
  }, [isMiniWindow])

  // Listen for toast notifications from main process
  useEffect(() => {
    if (isMiniWindow || !window.api) return

    const toastListener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      const data = args[0] as { message: string; type: 'info' | 'success' | 'error' }
      showToast(data.message, data.type)
    }

    window.api?.on('toast:show', toastListener)

    return () => {
      window.api?.removeListener('toast:show', toastListener)
    }
  }, [isMiniWindow])

  // Listen for quit confirmation when timer is running
  useEffect(() => {
    if (isMiniWindow || !window.api) return

    const quitListener = (_event: Electron.IpcRendererEvent): void => {
      void (async () => {
        const { confirmDialog } = await import('./components/ui')
        const confirmed = await confirmDialog({
          title: 'Quit with timer running?',
          message: 'You have a timer running. Quitting will stop the timer. Are you sure?',
          confirmLabel: 'Quit',
          danger: true
        })

        if (confirmed) {
          // Stop the timer and quit
          await timer.stop()
          // Notify main process to force quit
          window.api?.send('app:force-quit')
        }
      })()
    }

    window.api?.on('timer:confirm-quit', quitListener)

    return () => {
      window.api?.removeListener('timer:confirm-quit', quitListener)
    }
  }, [isMiniWindow, timer])

  // Keep the URL and the session in sync.
  useEffect(() => {
    if (!bootstrapped || isMiniWindow) return

    if (!isAuthed) {
      if (path === '/' || meta.public) return
      navigate('/')
      return
    }

    if (path === '/' || meta.public) {
      navigate('/dashboard')
    }
  }, [bootstrapped, isAuthed, isMiniWindow, path, meta.public, navigate])

  // Clear stale auth errors whenever the user moves between screens.
  useEffect(() => {
    const handle = window.setTimeout(() => setAuthError(null), 0)
    return () => window.clearTimeout(handle)
  }, [path])

  // The Work group has no page of its own; send it to the first child route.
  useEffect(() => {
    if (path === '/work') navigate('/work/projects')
  }, [path, navigate])

  function clearAuthError(): void {
    setAuthError(null)
  }

  async function handleLogin(payload: LoginPayload): Promise<void> {
    setSubmitting(true)
    clearAuthError()
    try {
      const result = await apiRequest<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setUser(result.user)
      showToast('Welcome back to Clovars.', 'success')
      navigate('/dashboard')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegister(payload: RegisterPayload): Promise<void> {
    setSubmitting(true)
    clearAuthError()
    try {
      await apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) })
      setVerifyEmail(payload.email)
      showToast('Account created. Check your email for the verification code.', 'success')
      navigate('/verify')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify(payload: VerifyPayload): Promise<void> {
    setSubmitting(true)
    clearAuthError()
    try {
      await apiRequest('/api/auth/verify', { method: 'POST', body: JSON.stringify(payload) })
      showToast('Email verified. You can sign in now.', 'success')
      navigate('/login')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendVerification(email: string): Promise<void> {
    setSubmitting(true)
    clearAuthError()
    try {
      await apiRequest('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email })
      })
      showToast('Verification code resent.', 'success')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Resend failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgot(payload: ForgotPasswordPayload): Promise<void> {
    setSubmitting(true)
    clearAuthError()
    try {
      await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setResetEmail(payload.email)
      showToast('If that email exists, a reset code is on its way.', 'info')
      navigate('/reset')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReset(payload: ResetPasswordPayload): Promise<void> {
    setSubmitting(true)
    clearAuthError()
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      showToast('Password reset. Sign in with your new password.', 'success')
      navigate('/login')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleChangePassword(payload: ChangePasswordPayload): Promise<void> {
    setSubmitting(true)
    try {
      await apiRequest('/api/auth/password', { method: 'PUT', body: JSON.stringify(payload) })
      showToast('Password changed successfully.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Change password failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout(): Promise<void> {
    setSubmitting(true)
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } catch {
      /* Logging out locally is still the right outcome. */
    } finally {
      timer.clear()
      setUser(null)
      setSubmitting(false)
      navigate('/')
      showToast('Signed out.', 'info')
    }
  }

  function renderAuthPage(): React.JSX.Element {
    if (path === '/register') {
      return (
        <AuthLayout
          title="Create your account"
          subtitle="Start tracking time in under a minute."
          backLabel="Back to sign in"
          onBack={() => navigate('/login')}
          footer={
            <p className="auth__hint">
              Already have an account?{' '}
              <Button variant="link" onClick={() => navigate('/login')}>
                Sign in
              </Button>
            </p>
          }
        >
          <RegisterForm onSubmit={handleRegister} loading={submitting} error={authError} />
        </AuthLayout>
      )
    }

    if (path === '/verify') {
      return (
        <AuthLayout
          title="Verify your email"
          subtitle="Enter the code we sent to your inbox."
          backLabel="Back to sign in"
          onBack={() => navigate('/login')}
        >
          <VerifyForm
            defaultEmail={verifyEmail}
            onSubmit={handleVerify}
            onResend={handleResendVerification}
            loading={submitting}
            error={authError}
          />
        </AuthLayout>
      )
    }

    if (path === '/forgot') {
      return (
        <AuthLayout
          title="Forgot your password?"
          subtitle="We'll email you a code to reset it."
          backLabel="Back to sign in"
          onBack={() => navigate('/login')}
        >
          <ForgotForm onSubmit={handleForgot} loading={submitting} error={authError} />
        </AuthLayout>
      )
    }

    if (path === '/reset') {
      return (
        <AuthLayout
          title="Reset your password"
          subtitle="Enter the code from your email and choose a new password."
          backLabel="Back to sign in"
          onBack={() => navigate('/login')}
        >
          <ResetForm
            defaultEmail={resetEmail}
            onSubmit={handleReset}
            loading={submitting}
            error={authError}
          />
        </AuthLayout>
      )
    }

    if (path === '/login') {
      return (
        <AuthLayout
          title="Sign in"
          subtitle="Pick up where you left off."
          backLabel="Back to welcome"
          onBack={() => navigate('/')}
          footer={
            <p className="auth__hint">
              New to Clovars?{' '}
              <Button variant="link" onClick={() => navigate('/register')}>
                Create an account
              </Button>
            </p>
          }
        >
          <LoginForm onSubmit={handleLogin} loading={submitting} error={authError} />
          <Button variant="link" className="auth__forgot" onClick={() => navigate('/forgot')}>
            Forgot password?
          </Button>
        </AuthLayout>
      )
    }

    return (
      <AuthLayout
        title="Welcome to Clovars"
        subtitle="Track time, manage projects, and report — all in one place."
        footer={<p className="auth__hint">Your data stays inside your workspace.</p>}
      >
        <Stack gap={3}>
          <Button variant="primary" size="lg" block onClick={() => navigate('/login')}>
            Sign in
          </Button>
          <Button variant="secondary" size="lg" block onClick={() => navigate('/register')}>
            Create account
          </Button>
        </Stack>
      </AuthLayout>
    )
  }

  function renderAppPage(): React.JSX.Element {
    if (!user) return <Splash />

    switch (path) {
      case '/time':
        return (
          <TimeSection
            running={timer.running}
            runningElapsedSeconds={timer.elapsedSeconds}
            onRunningChange={timer.applyRunning}
          />
        )
      case '/dashboard':
        return (
          <DashboardSection running={timer.running} runningElapsedSeconds={timer.elapsedSeconds} />
        )
      case '/reports':
        return <ReportsSection />
      case '/work/projects':
        return <WorkSection tab="projects" onNavigate={navigate} />
      case '/work/clients':
        return <WorkSection tab="clients" onNavigate={navigate} />
      case '/work/tasks':
        return <WorkSection tab="tasks" onNavigate={navigate} />
      case '/work/tags':
        return <WorkSection tab="tags" onNavigate={navigate} />
      case '/team':
        return <WorkspacesSection currentUserId={user.id} />
      case '/profile':
        return (
          <ProfileSection
            user={user}
            onSubmit={handleChangePassword}
            loading={submitting}
            onLogout={() => void handleLogout()}
          />
        )
      default:
        return (
          <EmptyState
            title="Page not found"
            description="That page does not exist in Clovars."
            action={
              <Button variant="primary" onClick={() => navigate('/dashboard')}>
                Go to dashboard
              </Button>
            }
          />
        )
    }
  }

  if (isMiniWindow) {
    return (
      <ErrorBoundary>
        <MiniTimer />
      </ErrorBoundary>
    )
  }

  if (!bootstrapped) {
    return (
      <ErrorBoundary>
        <Splash />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <WorkspaceProvider enabled={isAuthed}>
        {user ? (
          <AppShell
            user={user}
            path={path}
            navigate={navigate}
            onLogout={() => void handleLogout()}
            timer={timer}
          >
            {renderAppPage()}
          </AppShell>
        ) : (
          renderAuthPage()
        )}
        <ToastContainer />
        <ConfirmHost />
      </WorkspaceProvider>
    </ErrorBoundary>
  )
}

export default App
