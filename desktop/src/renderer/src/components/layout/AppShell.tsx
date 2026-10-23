import { useEffect, useRef, useState } from 'react'
import type { AuthUser } from '../../types/auth'
import type { UseRunningTimerResult } from '../../hooks/useRunningTimer'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { NAV_GROUPS, metaFor } from '../../routes'
import type { NavGroup } from '../../routes'
import { formatDuration } from '../../utils/time'
import { Avatar, Button, cn, ErrorState, IconButton, Modal, Skeleton, useClickOutside } from '../ui'
import { Icon, icons } from '../icons'
import { Page } from './Page'
import { CreateWorkspaceDialog, JoinWorkspaceDialog } from '../workspaces/WorkspaceDialogs'
import { WorkspaceOnboarding } from '../workspaces/WorkspaceOnboarding'
import logo from '../../assets/logo.png'

const WORK_NAV_KEY = 'clovars.workNavOpen'

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = (): void => setMatches(list.matches)
    list.addEventListener('change', onChange)
    onChange()
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = (): void => setOnline(true)
    const goOffline = (): void => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}

interface AppShellProps {
  user: AuthUser
  path: string
  navigate: (path: string) => void
  onLogout: () => void
  timer: UseRunningTimerResult
  children: React.ReactNode
}

export function AppShell({
  user,
  path,
  navigate,
  onLogout,
  timer,
  children
}: AppShellProps): React.JSX.Element {
  const meta = metaFor(path)
  const {
    workspaces,
    activeId,
    activeWorkspace,
    loading: workspacesLoading,
    error: workspacesError,
    setActiveId,
    refresh
  } = useWorkspace()

  const isRail = useMediaQuery('(max-width: 1100px)')
  const isMobile = useMediaQuery('(max-width: 768px)')
  const online = useOnline()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [railMenu, setRailMenu] = useState<string | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [workOpen, setWorkOpen] = useState(() => localStorage.getItem(WORK_NAV_KEY) !== 'false')

  const contentRef = useRef<HTMLDivElement>(null)
  const workspaceMenuRef = useRef<HTMLDivElement>(null)
  const railMenuRef = useRef<HTMLDivElement>(null)

  useClickOutside(workspaceMenuRef, workspaceMenuOpen, () => setWorkspaceMenuOpen(false))
  useClickOutside(railMenuRef, Boolean(railMenu), () => setRailMenu(null))

  const collapsed = isRail && !isMobile

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setMobileOpen(false)
      setWorkspaceMenuOpen(false)
      setRailMenu(null)
      contentRef.current?.scrollTo({ top: 0 })
    }, 0)
    return () => window.clearTimeout(handle)
  }, [path])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      const typing =
        target?.closest('input, textarea, select, [contenteditable="true"]') !== null &&
        target?.closest('input, textarea, select, [contenteditable="true"]') !== undefined

      if (event.key === '?' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        setShortcutsOpen((open) => !open)
        return
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const destinations: Record<string, string> = {
          '1': '/time',
          '2': '/dashboard',
          '3': '/reports',
          '4': '/work/projects',
          '5': '/team'
        }
        const next = destinations[event.key]
        if (next) {
          event.preventDefault()
          navigate(next)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  function go(next: string): void {
    navigate(next)
    setMobileOpen(false)
    setRailMenu(null)
  }

  function toggleWorkGroup(): void {
    if (collapsed) {
      setRailMenu((current) => (current === 'work' ? null : 'work'))
      return
    }

    setWorkOpen((open) => {
      const next = !open
      localStorage.setItem(WORK_NAV_KEY, String(next))
      return next
    })
  }

  function renderNavItem(item: NavGroup['items'][number], sub = false): React.JSX.Element {
    const active = path === item.path

    return (
      <button
        key={item.path}
        type="button"
        className={cn('nav-item', sub && 'nav-item--sub', active && 'is-active')}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        onClick={() => go(item.path)}
      >
        <Icon d={icons[item.icon]} size={18} />
        <span className="nav-item__label">{item.label}</span>
      </button>
    )
  }

  function renderNavGroup(group: NavGroup): React.JSX.Element {
    const hasActive = group.items.some((item) => item.path === path)

    if (group.collapsible) {
      const expanded = workOpen || path.startsWith('/work')
      const firstIcon: keyof typeof icons = 'work'

      return (
        <div className="nav-group" key={group.id}>
          <button
            type="button"
            className={cn('nav-group__toggle', hasActive && 'is-active')}
            aria-expanded={collapsed ? railMenu === group.id : expanded}
            title={collapsed ? group.label : undefined}
            onClick={toggleWorkGroup}
          >
            <Icon d={icons[firstIcon]} size={18} />
            <span className="nav-item__label">{group.label}</span>
            <Icon d={icons.chevronDown} size={14} className="nav-group__chevron" />
          </button>

          {!collapsed && expanded && (
            <div className="nav-group__items">
              {group.items.map((item) => renderNavItem(item, true))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="nav-group" key={group.id}>
        <p className="nav-group__label">{group.label}</p>
        {group.items.map((item) => renderNavItem(item))}
      </div>
    )
  }

  const activeRailGroup = NAV_GROUPS.find((group) => group.id === railMenu) ?? null
  const showWorkspaceGate = meta.requiresWorkspace

  return (
    <div className="shell">
      {isMobile && (
        <div
          className={cn('shell__backdrop', mobileOpen && 'is-open')}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn('sidebar', isMobile && mobileOpen && 'is-open', collapsed && 'sidebar--rail')}
        aria-label="Main navigation"
      >
        <div className="sidebar__brand">
          <img className="brand-logo" src={logo} alt="" />
          <span className="sidebar__brand-name">Clovars</span>
        </div>
        <div className="ws" ref={workspaceMenuRef}>
          <button
            type="button"
            className="ws__trigger"
            aria-haspopup="menu"
            aria-expanded={workspaceMenuOpen}
            title={activeWorkspace?.name ?? 'Workspace'}
            onClick={() => setWorkspaceMenuOpen((open) => !open)}
          >
            <span className="ws__mark">
              {(activeWorkspace?.name ?? 'C').slice(0, 1).toUpperCase()}
            </span>
            <span className="ws__text">
              <span className="ws__name">
                {activeWorkspace?.name ??
                  (workspaces.length > 0 ? 'Select workspace' : 'No workspace')}
              </span>
              <span className="ws__role">{activeWorkspace?.role ?? '—'}</span>
            </span>
            <Icon d={icons.chevronDown} size={14} className="ws__chevron" />
          </button>

          {workspaceMenuOpen && (
            <div className="menu ws__menu" role="menu" aria-label="Workspaces">
              <p className="menu__label">Workspaces</p>
              <div className="menu__scroll">
                {workspaces.length === 0 && <p className="menu__empty">No workspaces yet</p>}
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={workspace.id === activeId}
                    className={cn('menu__item', workspace.id === activeId && 'is-selected')}
                    onClick={() => {
                      setActiveId(workspace.id)
                      setWorkspaceMenuOpen(false)
                    }}
                  >
                    <span className="menu__item-main">{workspace.name}</span>
                    <span className="menu__meta">{workspace.role}</span>
                  </button>
                ))}
              </div>
              <hr className="menu__sep" />
              <button
                type="button"
                className="menu__item"
                onClick={() => {
                  setWorkspaceMenuOpen(false)
                  setCreateOpen(true)
                }}
              >
                <Icon d={icons.plus} size={16} />
                New workspace
              </button>
              <button
                type="button"
                className="menu__item"
                onClick={() => {
                  setWorkspaceMenuOpen(false)
                  setJoinOpen(true)
                }}
              >
                <Icon d={icons.building} size={16} />
                Join with invite code
              </button>
            </div>
          )}
        </div>

        <nav className="sidebar__nav">{NAV_GROUPS.map((group) => renderNavGroup(group))}</nav>

        <div className="sidebar__footer">
          <button
            type="button"
            className="user-card"
            onClick={() => go('/profile')}
            title={user?.email ?? ''}
          >
            <Avatar name={user?.email} size="sm" />
            <span className="user-card__text">
              <span className="user-card__name">{user?.email?.split('@')[0] ?? ''}</span>
              <span className="user-card__email">{user?.email ?? ''}</span>
            </span>
          </button>
          <div className="sidebar__footer-actions">
            <IconButton
              label="Profile"
              icon={<Icon d={icons.profile} />}
              onClick={() => go('/profile')}
            />
            <IconButton label="Sign out" icon={<Icon d={icons.logout} />} onClick={onLogout} />
          </div>
        </div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <IconButton
            label="Open navigation"
            icon={<Icon d={icons.menu} />}
            className="topbar__menu"
            onClick={() => setMobileOpen(true)}
          />
          <div className="topbar__titles">
            {meta.group && <span className="topbar__crumb">{meta.group}</span>}
            <h1 className="topbar__title">{meta.title}</h1>
          </div>

          <div className="topbar__actions">
            {timer.running && (
              <div className={cn('timer-chip', timer.running.isPaused && 'is-paused')}>
                <span className="timer-chip__dot" aria-hidden="true" />
                <span className="timer-chip__clock tabular">
                  {formatDuration(timer.elapsedSeconds)}
                </span>
                <span className="timer-chip__label">
                  {timer.running.projectName ??
                    timer.running.description ??
                    timer.running.workspaceName ??
                    'Tracking time'}
                </span>
                <div className="timer-chip__actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void (timer.running?.isPaused ? timer.resume() : timer.pause())}
                  >
                    {timer.running.isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => void timer.stop()}>
                    Stop
                  </Button>
                </div>
              </div>
            )}
            <IconButton
              label="Keyboard shortcuts (?)"
              icon={<Icon d={icons.help} />}
              onClick={() => setShortcutsOpen(true)}
            />
          </div>
        </header>

        <main className="app-content" ref={contentRef}>
          {!online && (
            <div className="offline-banner" role="status">
              You are offline. Clovars will retry when the connection returns.
            </div>
          )}

          <Page width={meta.width}>
            {showWorkspaceGate && workspacesLoading && !activeWorkspace ? (
              <div className="page-skeleton">
                <Skeleton height={32} width="40%" />
                <div className="grid">
                  <Skeleton height={110} />
                  <Skeleton height={110} />
                  <Skeleton height={110} />
                </div>
                <Skeleton height={220} />
              </div>
            ) : showWorkspaceGate && workspacesError && !activeWorkspace ? (
              <ErrorState
                title="Could not load your workspaces"
                message={workspacesError}
                onRetry={() => void refresh()}
              />
            ) : showWorkspaceGate && !activeWorkspace ? (
              <WorkspaceOnboarding
                onCreate={() => setCreateOpen(true)}
                onJoin={() => setJoinOpen(true)}
              />
            ) : (
              children
            )}
          </Page>
        </main>
      </div>

      {collapsed && activeRailGroup && (
        <div className="rail-menu" ref={railMenuRef} role="menu" aria-label={activeRailGroup.label}>
          <p className="menu__label">{activeRailGroup.label}</p>
          {activeRailGroup.items.map((item) => (
            <button
              key={item.path}
              type="button"
              role="menuitem"
              className={cn('menu__item', path === item.path && 'is-selected')}
              onClick={() => go(item.path)}
            >
              <Icon d={icons[item.icon]} size={16} />
              {item.label}
            </button>
          ))}
        </div>
      )}

      <Modal
        open={shortcutsOpen}
        title="Keyboard shortcuts"
        description="Move around Clovars without reaching for the mouse."
        onClose={() => setShortcutsOpen(false)}
        size="sm"
      >
        <ul className="shortcut-list">
          <li>
            <span>Open this help</span>
            <kbd>?</kbd>
          </li>
          <li>
            <span>Go to Time</span>
            <kbd>Alt</kbd>
            <kbd>1</kbd>
          </li>
          <li>
            <span>Go to Dashboard</span>
            <kbd>Alt</kbd>
            <kbd>2</kbd>
          </li>
          <li>
            <span>Go to Reports</span>
            <kbd>Alt</kbd>
            <kbd>3</kbd>
          </li>
          <li>
            <span>Go to Projects</span>
            <kbd>Alt</kbd>
            <kbd>4</kbd>
          </li>
          <li>
            <span>Go to Team</span>
            <kbd>Alt</kbd>
            <kbd>5</kbd>
          </li>
          <li>
            <span>Close a dialog or drawer</span>
            <kbd>Esc</kbd>
          </li>
        </ul>
      </Modal>

      <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinWorkspaceDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  )
}
