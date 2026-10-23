import { useEffect, useState } from 'react'
import { apiRequest } from './api/client'
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext'
import { WorkspacesSection } from './components/workspaces/WorkspacesSection'
import { WorkSection } from './components/work/WorkSection'
import type { WorkTab } from './components/work/WorkSection'
import { TimeSection } from './components/time/TimeSection'
import { ReportsSection } from './components/reports/ReportsSection'
import {
  LoginForm,
  RegisterForm,
  VerifyForm,
  ForgotForm,
  ResetForm
} from './components/auth/AuthForms'
import { ProfileSection } from './components/profile/ProfileSection'
import { DashboardSection } from './components/dashboard/DashboardSection'
import { useRunningTimer } from './hooks/useRunningTimer'
import { formatDuration } from './utils/time'
import { ToastContainer } from './components/ui'
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
  | 'reports'
  | 'dashboard'

const Icon = ({ d, ...rest }: { d: string } & React.SVGProps<SVGSVGElement>): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <path d={d} />
  </svg>
)

const icons = {
  time: 'M12 8v4l3 3M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
  dashboard: 'M3 13h4v8H3zM10 9h4v12h-4zM17 5h4v16h-4z',
  reports: 'M4 4h16v16H4zM8 16v-4M12 16V8M16 16v-6',
  work: 'M3 7h18M3 12h18M3 17h18',
  projects: 'M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4',
  clients: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  tasks: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  tags: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  team: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'
}

function Sidebar({
  view,
  setView,
  setWorkTab,
  userEmail,
  open,
  onClose,
  onLogout
}: {
  view: View
  setView: (v: View) => void
  setWorkTab: (t: WorkTab) => void
  userEmail: string
  open: boolean
  onClose: () => void
  onLogout: () => void
}): React.JSX.Element {
  const { workspaces, activeWorkspace, setActiveId } = useWorkspace()
  const [workOpen, setWorkOpen] = useState(true)

  function nav(v: View): void {
    setView(v)
    onClose()
  }

  const item = (v: View, label: string, iconPath: string): React.JSX.Element => (
    <button
      type="button"
      className={`sidebar-item ${view === v ? 'active' : ''}`}
      onClick={() => nav(v)}
      title={label}
    >
      <Icon d={iconPath} />
      <span className="sidebar-label">{label}</span>
    </button>
  )

  return (
    <>
      <div className={`sidebar-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">C</span>
          <span className="sidebar-label">Clovars</span>
        </div>

        {/* Global workspace switcher */}
        <div className="sidebar-workspace" onClick={() => nav('workspaces')}>
          <span className="sidebar-workspace-name">{activeWorkspace?.name ?? 'No workspace'}</span>
          <span className="sidebar-workspace-role">{activeWorkspace?.role ?? '—'}</span>
        </div>
        {workspaces.length > 1 && (
          <select
            className="sidebar-label"
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 'var(--fs-xs)'
            }}
            value={activeWorkspace?.id ?? ''}
            onChange={(e) => setActiveId(e.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.role})
              </option>
            ))}
          </select>
        )}

        <div className="sidebar-group">
          <div className="sidebar-group-title">Track</div>
          {item('time', 'Time', icons.time)}
        </div>

        <div className="sidebar-group">
          <div className="sidebar-group-title">Analyze</div>
          {item('dashboard', 'Dashboard', icons.dashboard)}
          {item('reports', 'Reports', icons.reports)}
        </div>

        <div className="sidebar-group">
          <div className="sidebar-group-title">
            <button
              type="button"
              className="sidebar-item"
              style={{ padding: 0, background: 'transparent' }}
              onClick={() => setWorkOpen((o) => !o)}
            >
              <Icon d={icons.work} />
              <span className="sidebar-label">Work</span>
            </button>
          </div>
          {workOpen && (
            <>
              <button
                type="button"
                className={`sidebar-item ${view === 'work' ? 'active' : ''}`}
                onClick={() => {
                  setWorkTab('projects')
                  setView('work')
                }}
                title="Projects"
              >
                <Icon d={icons.projects} />
                <span className="sidebar-label">Projects</span>
              </button>
              <button
                type="button"
                className={`sidebar-item ${view === 'work' ? 'active' : ''}`}
                onClick={() => {
                  setWorkTab('clients')
                  setView('work')
                }}
                title="Clients"
              >
                <Icon d={icons.clients} />
                <span className="sidebar-label">Clients</span>
              </button>
              <button
                type="button"
                className={`sidebar-item ${view === 'work' ? 'active' : ''}`}
                onClick={() => {
                  setWorkTab('tasks')
                  setView('work')
                }}
                title="Tasks"
              >
                <Icon d={icons.tasks} />
                <span className="sidebar-label">Tasks</span>
              </button>
              <button
                type="button"
                className={`sidebar-item ${view === 'work' ? 'active' : ''}`}
                onClick={() => {
                  setWorkTab('tags')
                  setView('work')
                }}
                title="Tags"
              >
                <Icon d={icons.tags} />
                <span className="sidebar-label">Tags</span>
              </button>
            </>
          )}
        </div>

        <div className="sidebar-group">
          <div className="sidebar-group-title">Team</div>
          {item('workspaces', 'Members & Invites', icons.team)}
        </div>

        <div className="sidebar-spacer" />

        <div className="sidebar-user">
          <div className="sidebar-avatar">{(userEmail[0] ?? 'U').toUpperCase()}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{userEmail.split('@')[0]}</span>
            <span className="sidebar-user-email">{userEmail}</span>
          </div>
        </div>
        <div className="sidebar-bottom-actions">
          {item('profile', 'Profile', icons.profile)}
          <button type="button" className="sidebar-item" onClick={onLogout}>
            <Icon d={icons.logout} />
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

function App(): React.JSX.Element {
  const [view, setView] = useState<View>('home')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('')
  const [workTab, setWorkTab] = useState<WorkTab>('projects')
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
      setView('dashboard')
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
      await apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) })
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
      await apiRequest('/api/auth/verify', { method: 'POST', body: JSON.stringify(payload) })
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
      await apiRequest('/api/auth/password', { method: 'PUT', body: JSON.stringify(payload) })
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
      /* ignore */
    } finally {
      timer.clear()
      setUser(null)
      setView('home')
      setLoading(false)
    }
  }

  // Default landing page for logged-in users
  useEffect(() => {
    if (user && (view === 'home' || view === 'login')) {
      const t = setTimeout(() => setView('dashboard'), 0)
      return () => clearTimeout(t)
    }
    return
  }, [user, view])

  const isAuthed = Boolean(user)

  return (
    <WorkspaceProvider enabled={isAuthed}>
      <div className="app-shell">
        {isAuthed && (
          <>
            <Sidebar
              view={view}
              setView={setView}
              setWorkTab={setWorkTab}
              userEmail={user?.email ?? ''}
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onLogout={() => void handleLogout()}
            />
          </>
        )}
        <div className="main-area">
          {isAuthed && (
            <div className="topbar">
              <button
                type="button"
                className="btn btn-ghost btn-icon mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                ☰
              </button>
              <div>
                <div className="topbar-title">
                  {view === 'dashboard'
                    ? 'Dashboard'
                    : view === 'time'
                      ? 'Time'
                      : view === 'reports'
                        ? 'Reports'
                        : view === 'work'
                          ? 'Work'
                          : view === 'workspaces'
                            ? 'Team'
                            : view === 'profile'
                              ? 'Profile'
                              : 'Clovars'}
                </div>
              </div>
              <div className="topbar-actions">
                {user && timer.running && (
                  <div className={timer.running.isPaused ? 'header-timer paused' : 'header-timer'}>
                    <span className={timer.running.isPaused ? 'timer-dot paused' : 'timer-dot'} />
                    <span className="header-timer-clock">
                      {formatDuration(timer.elapsedSeconds)}
                    </span>
                    <span className="header-timer-label">
                      {timer.running.projectName ??
                        timer.running.description ??
                        timer.running.workspaceName ??
                        'Tracking time'}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() =>
                        void (timer.running?.isPaused ? timer.resume() : timer.pause())
                      }
                    >
                      {timer.running.isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void timer.stop()}
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="content">
            <div className="content-inner">
              {error && <p className="error">{error}</p>}
              {info && <p className="info">{info}</p>}

              {!isAuthed && view === 'home' && (
                <section className="card">
                  <h2>Welcome to Clovars</h2>
                  <p className="muted">
                    Track time, manage projects, and report — all in one place.
                  </p>
                  <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
                    <button className="btn btn-primary" onClick={() => setView('login')}>
                      Sign in
                    </button>
                    <button className="btn btn-secondary" onClick={() => setView('register')}>
                      Create account
                    </button>
                  </div>
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
              {view === 'forgot' && !user && (
                <ForgotForm onSubmit={handleForgot} loading={loading} />
              )}
              {view === 'reset' && !user && <ResetForm onSubmit={handleReset} loading={loading} />}

              {view === 'profile' && user && (
                <ProfileSection user={user} onSubmit={handleChangePassword} loading={loading} />
              )}
              {view === 'workspaces' && user && <WorkspacesSection currentUserId={user.id} />}
              {view === 'work' && user && <WorkSection initialTab={workTab} />}
              {view === 'time' && user && (
                <TimeSection
                  running={timer.running}
                  runningElapsedSeconds={timer.elapsedSeconds}
                  onRunningChange={timer.applyRunning}
                />
              )}
              {view === 'reports' && user && <ReportsSection />}
              {view === 'dashboard' && user && (
                <DashboardSection
                  running={timer.running}
                  runningElapsedSeconds={timer.elapsedSeconds}
                />
              )}
            </div>
          </div>
        </div>
        <ToastContainer />
      </div>
    </WorkspaceProvider>
  )
}

export default App

// Re-export login forms from original file? They are defined below in this file's original; keep minimal inline versions.
// The original LoginForm etc. are large; import from a separate file to keep App small.
// For now, define placeholders by importing from the old location is impossible (same file). We'll keep them here.

// NOTE: The original App.tsx contained LoginForm, RegisterForm, etc. inline. To keep this file manageable,
// those are moved to src/renderer/src/components/auth/AuthForms.tsx (created below). Import them.
