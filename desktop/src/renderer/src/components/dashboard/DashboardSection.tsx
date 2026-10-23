import { useEffect, useState } from 'react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { fetchProjects } from '../../api/work'
import { fetchTimeEntries } from '../../api/time'
import { fetchMembers } from '../../api/workspaces'
import type { Project } from '../../types/work'
import type { TimeEntry } from '../../types/time'
import type { WorkspaceMember } from '../../types/workspace'
import { formatDuration, formatDurationShort } from '../../utils/time'
import { Card, EmptyState } from '../ui'

interface DashboardSectionProps {
  running: TimeEntry | null
  runningElapsedSeconds: number
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - (day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function DashboardSection({
  running,
  runningElapsedSeconds
}: DashboardSectionProps): React.JSX.Element {
  const { activeWorkspace, activeId } = useWorkspace()
  const [projects, setProjects] = useState<Project[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeId) return
    const ws = activeId
    let cancelled = false
    async function load(): Promise<void> {
      setLoading(true)
      setError(null)
      try {
        const [p, e] = await Promise.all([fetchProjects(ws), fetchTimeEntries(ws)])
        if (cancelled) return
        setProjects(p)
        setEntries(e)
        if (activeWorkspace?.role === 'admin' || activeWorkspace?.role === 'owner') {
          try {
            const m = await fetchMembers(ws)
            if (!cancelled) setMembers(m)
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [activeId, activeWorkspace?.role])

  const now = new Date()
  const weekStart = startOfWeek(now)

  function entryDuration(e: TimeEntry): number {
    if (e.isRunning)
      return running && e.id === running.id ? runningElapsedSeconds : e.durationSeconds
    return e.durationSeconds
  }

  const todayEntries = entries.filter((e) => isSameDay(new Date(e.startTime), now))
  const weekEntries = entries.filter((e) => new Date(e.startTime) >= weekStart)
  const monthEntries = entries.filter(
    (e) =>
      new Date(e.startTime).getMonth() === now.getMonth() &&
      new Date(e.startTime).getFullYear() === now.getFullYear()
  )

  const todaySeconds = todayEntries.reduce((s, e) => s + entryDuration(e), 0)
  const weekSeconds = weekEntries.reduce((s, e) => s + entryDuration(e), 0)
  const monthSeconds = monthEntries.reduce((s, e) => s + entryDuration(e), 0)
  const activeProjects = projects.filter((p) => !p.archived).length

  // hours per day this week
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
  const perDay = days.map((d) =>
    weekEntries
      .filter((e) => isSameDay(new Date(e.startTime), d))
      .reduce((s, e) => s + entryDuration(e), 0)
  )

  // top projects this week
  const projectMap = new Map(projects.map((p) => [p.id, p]))
  const projectSeconds = new Map<string, number>()
  for (const e of weekEntries) {
    const key = e.projectId ?? '__none__'
    projectSeconds.set(key, (projectSeconds.get(key) ?? 0) + entryDuration(e))
  }
  const topProjects = Array.from(projectSeconds.entries())
    .map(([id, secs]) => ({
      project: id === '__none__' ? null : (projectMap.get(id) ?? null),
      seconds: secs
    }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5)

  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5)

  const isAdmin = activeWorkspace?.role === 'admin' || activeWorkspace?.role === 'owner'

  if (!activeWorkspace) {
    return (
      <section className="work-section">
        <h2>Dashboard</h2>
        <EmptyState
          title="No workspace"
          description="Create or join a workspace to see your dashboard."
        />
      </section>
    )
  }

  return (
    <section className="work-section">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Dashboard</h1>
          <p>Welcome back. Here&apos;s your time for {activeWorkspace.name}.</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading && <p className="muted">Loading...</p>}

      {!loading && (
        <>
          <div className="card-grid">
            <Card title="Today">
              <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-bold)' }}>
                {formatDuration(todaySeconds)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {todayEntries.length} entries
              </p>
            </Card>
            <Card title="This week">
              <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-bold)' }}>
                {formatDuration(weekSeconds)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {weekEntries.length} entries
              </p>
            </Card>
            <Card title="This month">
              <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-bold)' }}>
                {formatDuration(monthSeconds)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {monthEntries.length} entries
              </p>
            </Card>
            <Card title="Active projects">
              <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-bold)' }}>
                {activeProjects}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                of {projects.length} total
              </p>
            </Card>
          </div>

          {running && (
            <Card title="Currently running">
              <div className="row-between">
                <div>
                  <div
                    style={{
                      fontSize: 'var(--fs-xl)',
                      fontWeight: 'var(--fw-bold)',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {formatDuration(runningElapsedSeconds)}
                  </div>
                  <p className="muted" style={{ margin: 0 }}>
                    {running.projectName ?? 'No project'}
                    {running.taskName ? ` · ${running.taskName}` : ''}
                  </p>
                </div>
                <span className="badge badge-danger">Live</span>
              </div>
            </Card>
          )}

          <Card title="Hours this week">
            <div
              style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--sp-2)', height: 120 }}
            >
              {perDay.map((secs, i) => {
                const max = Math.max(...perDay, 1)
                const h = Math.round((secs / max) * 100)
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${h}%`,
                        minHeight: secs > 0 ? 4 : 0,
                        background: 'var(--primary)',
                        borderRadius: '4px 4px 0 0'
                      }}
                    />
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                      {days[i].toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>

          <div className="grid-2">
            <Card title="Top projects this week">
              {topProjects.length === 0 ? (
                <EmptyState
                  title="No data yet"
                  description="Track some time to see your top projects."
                />
              ) : (
                <div className="stack">
                  {topProjects.map((tp, idx) => {
                    const max = topProjects[0]?.seconds || 1
                    const pct = Math.round((tp.seconds / max) * 100)
                    return (
                      <div key={idx}>
                        <div className="row-between">
                          <span style={{ fontWeight: 'var(--fw-medium)' }}>
                            {tp.project?.name ?? 'No project'}
                          </span>
                          <span className="muted">{formatDurationShort(tp.seconds)}</span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            background: 'var(--surface-2)',
                            borderRadius: 3,
                            marginTop: 4,
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: tp.project?.color ?? 'var(--primary)',
                              borderRadius: 3
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card title="Recent entries">
              {recentEntries.length === 0 ? (
                <EmptyState
                  title="No entries yet"
                  description="Start a timer to log your first entry."
                />
              ) : (
                <div className="stack">
                  {recentEntries.map((e) => (
                    <div key={e.id} className="row-between">
                      <div>
                        <div style={{ fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-sm)' }}>
                          {e.projectName ?? 'No project'}
                          {e.taskName ? ` · ${e.taskName}` : ''}
                        </div>
                        <div className="muted">{e.description ?? '—'}</div>
                      </div>
                      <span
                        className="tabular"
                        style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}
                      >
                        {formatDuration(e.isRunning ? runningElapsedSeconds : e.durationSeconds)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {isAdmin && (
            <Card title="Team activity this week">
              <p className="muted" style={{ marginTop: 0 }}>
                TODO: needs endpoint for team-wide time entries. Showing members only.
              </p>
              <div className="stack">
                {members.map((m) => (
                  <div key={m.id} className="row-between">
                    <span>
                      {m.firstName || m.lastName
                        ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
                        : m.email}
                    </span>
                    <span className="badge">{m.role}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </section>
  )
}
