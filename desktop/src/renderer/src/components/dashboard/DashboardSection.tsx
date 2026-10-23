import { useEffect, useState } from 'react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { fetchProjects } from '../../api/work'
import { fetchTimeEntries } from '../../api/time'
import { fetchMembers } from '../../api/workspaces'
import type { Project } from '../../types/work'
import type { TimeEntry } from '../../types/time'
import type { WorkspaceMember } from '../../types/workspace'
import { formatDateTime, formatDuration, formatDurationShort } from '../../utils/time'
import {
  Avatar,
  Badge,
  BarChart,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
  Section,
  Skeleton,
  StatCard
} from '../ui'
import { Icon, icons } from '../icons'

interface DashboardSectionProps {
  running: TimeEntry | null
  runningElapsedSeconds: number
}

function startOfWeek(date: Date, weekStartsOn: number): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - diff)
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

function memberLabel(member: WorkspaceMember): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ')
  return name || member.email
}

export function DashboardSection({
  running,
  runningElapsedSeconds
}: DashboardSectionProps): React.JSX.Element {
  const { activeWorkspace, activeId } = useWorkspace()
  const [projects, setProjects] = useState<Project[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const role = activeWorkspace?.role
  const isAdmin = role === 'admin' || role === 'owner'

  useEffect(() => {
    if (!activeId) return
    const ws = activeId
    let cancelled = false

    async function load(): Promise<void> {
      setLoading(true)
      setError(null)

      try {
        const [nextProjects, nextEntries] = await Promise.all([
          fetchProjects(ws),
          fetchTimeEntries(ws)
        ])
        if (cancelled) return
        setProjects(nextProjects)
        setEntries(nextEntries)

        if (isAdmin) {
          try {
            const memberList = await fetchMembers(ws)
            if (!cancelled) setMembers(memberList)
          } catch {
            /* Member list is a nice-to-have; the dashboard still works without it. */
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load dashboard')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [activeId, isAdmin, reloadKey])

  const now = new Date()
  const weekStartsOn = localStorage.getItem('clovars.weekStart') === 'sunday' ? 0 : 1
  const weekStart = startOfWeek(now, weekStartsOn)

  function entryDuration(entry: TimeEntry): number {
    if (entry.isRunning) {
      return running && entry.id === running.id ? runningElapsedSeconds : entry.durationSeconds
    }
    return entry.durationSeconds
  }

  const todayEntries = entries.filter((entry) => isSameDay(new Date(entry.startTime), now))
  const weekEntries = entries.filter((entry) => new Date(entry.startTime) >= weekStart)
  const monthEntries = entries.filter((entry) => {
    const date = new Date(entry.startTime)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })

  const todaySeconds = todayEntries.reduce((sum, entry) => sum + entryDuration(entry), 0)
  const weekSeconds = weekEntries.reduce((sum, entry) => sum + entryDuration(entry), 0)
  const monthSeconds = monthEntries.reduce((sum, entry) => sum + entryDuration(entry), 0)
  const activeProjects = projects.filter((project) => !project.archived).length

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return date
  })

  const perDay = days.map((date) =>
    weekEntries
      .filter((entry) => isSameDay(new Date(entry.startTime), date))
      .reduce((sum, entry) => sum + entryDuration(entry), 0)
  )

  const chartData = days.map((date, index) => ({
    label: date.toLocaleDateString(undefined, { weekday: 'short' }),
    seconds: perDay[index]
  }))

  const projectMap = new Map(projects.map((project) => [project.id, project]))
  const projectSeconds = new Map<string, number>()
  for (const entry of weekEntries) {
    const key = entry.projectId ?? '__none__'
    projectSeconds.set(key, (projectSeconds.get(key) ?? 0) + entryDuration(entry))
  }
  const topProjects = Array.from(projectSeconds.entries())
    .map(([id, seconds]) => ({
      project: id === '__none__' ? null : (projectMap.get(id) ?? null),
      seconds
    }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5)

  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5)

  if (loading) {
    return (
      <>
        <div className="stat-grid">
          {[1, 2, 3, 4].map((key) => (
            <div className="stat" key={key}>
              <Skeleton height={12} width="40%" />
              <Skeleton height={28} width="60%" />
              <Skeleton height={10} width="30%" />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card__body">
            <Skeleton height={20} width="30%" />
            <Skeleton height={160} />
          </div>
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}
        >
          <div className="card">
            <div className="card__body">
              <Skeleton height={20} width="40%" />
              <Skeleton height={120} />
            </div>
          </div>
          <div className="card">
            <div className="card__body">
              <Skeleton height={20} width="40%" />
              <Skeleton height={120} />
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load your dashboard"
        message={error}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    )
  }

  return (
    <>
      <Section
        title={`This week in ${activeWorkspace?.name ?? 'your workspace'}`}
        description="Totals include your live timer. Reports follow the workspace timezone."
        actions={
          <Button
            variant="secondary"
            icon={<Icon d={icons.reports} size={16} />}
            onClick={() => {
              window.location.hash = '/reports'
            }}
          >
            Open reports
          </Button>
        }
      >
        <div className="stat-grid">
          <StatCard
            label="Today"
            value={formatDuration(todaySeconds)}
            meta={`${todayEntries.length} ${todayEntries.length === 1 ? 'entry' : 'entries'}`}
            tone="primary"
          />
          <StatCard
            label="This week"
            value={formatDuration(weekSeconds)}
            meta={`${weekEntries.length} ${weekEntries.length === 1 ? 'entry' : 'entries'}`}
          />
          <StatCard
            label="This month"
            value={formatDuration(monthSeconds)}
            meta={`${monthEntries.length} ${monthEntries.length === 1 ? 'entry' : 'entries'}`}
          />
          <StatCard
            label="Active projects"
            value={activeProjects}
            meta={`of ${projects.length} total`}
          />
        </div>
      </Section>

      {running && (
        <Card
          title="Currently running"
          actions={
            <Badge variant={running.isPaused ? 'warning' : 'success'}>
              {running.isPaused ? 'Paused' : 'Live'}
            </Badge>
          }
        >
          <div className="row-between">
            <div className="cell-stack">
              <span className="running-timer__clock">{formatDuration(runningElapsedSeconds)}</span>
              <span className="cell-sub">
                {running.projectName ?? 'No project'}
                {running.taskName ? ` · ${running.taskName}` : ''}
                {running.workspaceName ? ` · ${running.workspaceName}` : ''}
              </span>
            </div>
            <span className={running.isPaused ? 'timer-dot paused' : 'timer-dot'} />
          </div>
        </Card>
      )}

      <Card title="Hours this week" subtitle="Tracked time per day, including today.">
        <BarChart data={chartData} height={160} formatValue={formatDurationShort} />
      </Card>

      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}
      >
        <Card title="Top projects this week">
          {topProjects.length === 0 ? (
            <EmptyState
              icon={<Icon d={icons.projects} size={22} />}
              title="No time this week"
              description="Start a timer to see your top projects here."
            />
          ) : (
            <div className="stack" style={{ gap: 'var(--sp-4)' }}>
              {topProjects.map((item, index) => {
                const max = topProjects[0]?.seconds || 1
                return (
                  <div key={`${item.project?.id ?? 'none'}-${index}`}>
                    <div className="row-between">
                      <span className="cell-primary">
                        <span
                          className="dot"
                          style={{ background: item.project?.color ?? 'var(--text-subtle)' }}
                        />
                        {item.project?.name ?? 'No project'}
                      </span>
                      <span className="muted tabular">{formatDurationShort(item.seconds)}</span>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <ProgressBar
                        value={item.seconds}
                        max={max}
                        color={item.project?.color ?? undefined}
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
              icon={<Icon d={icons.clock} size={22} />}
              title="No entries yet"
              description="Start a timer or add a manual entry to see it here."
            />
          ) : (
            <div className="stack" style={{ gap: 'var(--sp-3)' }}>
              {recentEntries.map((entry) => (
                <div key={entry.id} className="row-between">
                  <div className="cell-stack">
                    <span className="cell-primary">
                      {entry.projectName ?? 'No project'}
                      {entry.taskName ? ` · ${entry.taskName}` : ''}
                    </span>
                    <span className="cell-sub">
                      {formatDateTime(entry.startTime)}
                      {entry.description ? ` · ${entry.description}` : ''}
                    </span>
                  </div>
                  <span className="tabular cell-primary">
                    {formatDuration(
                      entry.isRunning ? runningElapsedSeconds : entry.durationSeconds
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {isAdmin && (
        <Card
          title="Team activity this week"
          subtitle="Member overview"
          actions={<Badge variant="primary">{members.length} members</Badge>}
        >
          {members.length === 0 ? (
            <EmptyState title="No members loaded" description="Invite your team to collaborate." />
          ) : (
            <div className="stack" style={{ gap: 'var(--sp-3)' }}>
              {members.map((member) => (
                <div key={member.id} className="row-between">
                  <span className="cell-primary">
                    <Avatar name={memberLabel(member)} size="sm" />
                    {memberLabel(member)}
                  </span>
                  <Badge
                    variant={
                      member.role === 'owner'
                        ? 'primary'
                        : member.role === 'admin'
                          ? 'success'
                          : 'neutral'
                    }
                  >
                    {member.role}
                  </Badge>
                </div>
              ))}
              {/* TODO: needs endpoint for team-wide time entries to show per-member hours. */}
              <p className="field__hint">
                Per-member hours need a team time-entries endpoint; only membership is shown.
              </p>
            </div>
          )}
        </Card>
      )}
    </>
  )
}
