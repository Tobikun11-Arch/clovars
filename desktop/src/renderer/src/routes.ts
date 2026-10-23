import type { IconName } from './components/icons'

export type PageWidth = 'narrow' | 'default' | 'wide'

export interface RouteMeta {
  title: string
  group?: string
  width: PageWidth
  requiresWorkspace?: boolean
  public?: boolean
}

export const ROUTES: Record<string, RouteMeta> = {
  '/': { title: 'Welcome', width: 'narrow', public: true },
  '/login': { title: 'Sign in', width: 'narrow', public: true },
  '/register': { title: 'Create account', width: 'narrow', public: true },
  '/verify': { title: 'Verify email', width: 'narrow', public: true },
  '/forgot': { title: 'Forgot password', width: 'narrow', public: true },
  '/reset': { title: 'Reset password', width: 'narrow', public: true },
  '/mini': { title: 'Mini Timer', width: 'narrow', public: true },
  '/dashboard': { title: 'Dashboard', group: 'Analyze', width: 'wide', requiresWorkspace: true },
  '/time': { title: 'Time', group: 'Track', width: 'default', requiresWorkspace: true },
  '/reports': { title: 'Reports', group: 'Analyze', width: 'wide', requiresWorkspace: true },
  '/work/projects': { title: 'Projects', group: 'Work', width: 'default', requiresWorkspace: true },
  '/work/clients': { title: 'Clients', group: 'Work', width: 'default', requiresWorkspace: true },
  '/work/tasks': { title: 'Tasks', group: 'Work', width: 'default', requiresWorkspace: true },
  '/work/tags': { title: 'Tags', group: 'Work', width: 'default', requiresWorkspace: true },
  '/team': { title: 'Team', group: 'Workspace', width: 'default' },
  '/profile': { title: 'Profile', group: 'Account', width: 'narrow' },
  '/not-found': { title: 'Page not found', width: 'narrow' }
}

export interface NavItem {
  path: string
  label: string
  icon: IconName
}

export interface NavGroup {
  id: string
  label: string
  collapsible?: boolean
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'track',
    label: 'Track',
    items: [{ path: '/time', label: 'Time', icon: 'time' }]
  },
  {
    id: 'analyze',
    label: 'Analyze',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { path: '/reports', label: 'Reports', icon: 'reports' }
    ]
  },
  {
    id: 'work',
    label: 'Work',
    collapsible: true,
    items: [
      { path: '/work/projects', label: 'Projects', icon: 'projects' },
      { path: '/work/clients', label: 'Clients', icon: 'clients' },
      { path: '/work/tasks', label: 'Tasks', icon: 'tasks' },
      { path: '/work/tags', label: 'Tags', icon: 'tags' }
    ]
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [{ path: '/team', label: 'Team', icon: 'team' }]
  }
]

export function metaFor(path: string): RouteMeta {
  return ROUTES[path] ?? ROUTES['/not-found']
}

export function isKnownRoute(path: string): boolean {
  return path in ROUTES
}
