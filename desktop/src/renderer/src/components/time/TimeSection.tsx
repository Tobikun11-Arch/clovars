import { useEffect, useState } from 'react'
import { fetchWorkspaces } from '../../api/workspaces'
import {
  createManualTimeEntry,
  deleteTimeEntry,
  fetchTimeEntries,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  updateTimeEntry
} from '../../api/time'
import { createTask, fetchProjects, fetchTags, fetchTasks } from '../../api/work'
import type { Project, Tag, Task } from '../../types/work'
import type { ManualTimeEntryInput, StartTimerInput, TimeEntry } from '../../types/time'
import type { Workspace } from '../../types/workspace'
import { formatDuration, formatDurationShort, isToday } from '../../utils/time'
import { EntriesList } from './EntriesList'
import { ManualEntryForm } from './ManualEntryForm'
import { StartTimerForm } from './StartTimerForm'

const ACTIVE_WORKSPACE_KEY = 'clovars.activeWorkspaceId'

type TimeTab = 'timer' | 'manual'

interface TimeSectionProps {
  running: TimeEntry | null
  runningElapsedSeconds: number
  onRunningChange: (entry: TimeEntry | null) => void
}

export function TimeSection({
  running,
  runningElapsedSeconds,
  onRunningChange
}: TimeSectionProps): React.JSX.Element {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tab, setTab] = useState<TimeTab>('timer')
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [formVersion, setFormVersion] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeId) ?? null
  const runningId = running?.id ?? null
  const runningPaused = running?.isPaused ?? false

  useEffect(() => {
    let cancelled = false

    async function bootstrap(): Promise<void> {
      try {
        const list = await fetchWorkspaces()
        if (cancelled) return

        setWorkspaces(list)

        const storedId = localStorage.getItem(ACTIVE_WORKSPACE_KEY)
        const nextId =
          list.find((workspace) => workspace.id === storedId)?.id ?? list[0]?.id ?? null

        setActiveId(nextId)

        if (nextId) {
          localStorage.setItem(ACTIVE_WORKSPACE_KEY, nextId)
        } else {
          localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load workspaces')
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!activeId) return

    const workspaceId = activeId
    let cancelled = false

    async function load(): Promise<void> {
      try {
        const [nextProjects, nextTasks, nextTags, nextEntries] = await Promise.all([
          fetchProjects(workspaceId),
          fetchTasks(workspaceId),
          fetchTags(workspaceId),
          fetchTimeEntries(workspaceId)
        ])

        if (cancelled) return

        setProjects(nextProjects)
        setTasks(nextTasks)
        setTags(nextTags)
        setEntries(nextEntries)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load time data')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [activeId, runningId, runningPaused])

  function handleSelectWorkspace(workspaceId: string): void {
    setActiveId(workspaceId)
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId)
    setEditingEntry(null)
    setError(null)
    setInfo(null)
  }

  async function handleStart(input: StartTimerInput): Promise<void> {
    if (!activeId) return

    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      const entry = await startTimer(activeId, input)
      onRunningChange(entry)
      setInfo('Timer started.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the timer')
    } finally {
      setLoading(false)
    }
  }

  async function handleStop(): Promise<void> {
    if (!running) return

    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      await stopTimer(running.workspaceId)
      onRunningChange(null)
      setInfo('Timer stopped.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stop the timer')
    } finally {
      setLoading(false)
    }
  }

  async function handlePause(): Promise<void> {
    if (!running || running.isPaused) return

    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      const entry = await pauseTimer(running.workspaceId)
      onRunningChange(entry)
      setInfo('Timer paused.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pause the timer')
    } finally {
      setLoading(false)
    }
  }

  async function handleResume(): Promise<void> {
    if (!running || !running.isPaused) return

    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      const entry = await resumeTimer(running.workspaceId)
      onRunningChange(entry)
      setInfo('Timer resumed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resume the timer')
    } finally {
      setLoading(false)
    }
  }

  async function handleManualSubmit(input: ManualTimeEntryInput): Promise<void> {
    if (!activeId) return

    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      if (editingEntry) {
        await updateTimeEntry(activeId, editingEntry.id, input)
        setInfo('Time entry updated.')
      } else {
        const entry = await createManualTimeEntry(activeId, input)
        setInfo(`Time entry for ${formatDurationShort(entry.durationSeconds)} added.`)
        setFormVersion((version) => version + 1)
      }

      setEditingEntry(null)
      setEntries(await fetchTimeEntries(activeId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the time entry')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(entry: TimeEntry): Promise<void> {
    if (!activeId) return

    if (!window.confirm(`Delete this ${formatDurationShort(entry.durationSeconds)} entry?`)) {
      return
    }

    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      await deleteTimeEntry(activeId, entry.id)
      setEntries(await fetchTimeEntries(activeId))
      if (editingEntry?.id === entry.id) setEditingEntry(null)
      setInfo('Time entry deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the time entry')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTask(projectId: string, name: string): Promise<Task | null> {
    if (!activeId) return null

    setError(null)
    setInfo(null)

    try {
      const task = await createTask(activeId, { name, projectId })
      setTasks(await fetchTasks(activeId))
      setInfo(`Task "${task.name}" created.`)
      return task
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the task')
      return null
    }
  }

  function handleEdit(entry: TimeEntry): void {
    setEditingEntry(entry)
    setTab('manual')
  }

  function handleCancelEdit(): void {
    setEditingEntry(null)
  }

  const runningIsListed = running ? entries.some((entry) => entry.id === running.id) : false
  const todaysTotalSeconds =
    entries
      .filter((entry) => isToday(entry.startTime))
      .reduce(
        (total, entry) => total + (entry.isRunning ? runningElapsedSeconds : entry.durationSeconds),
        0
      ) +
    (running && running.workspaceId === activeId && !runningIsListed && isToday(running.startTime)
      ? runningElapsedSeconds
      : 0)

  return (
    <section className="work-section time-section">
      <h2>Time</h2>
      <p className="muted">Start a live timer or add time entries manually.</p>

      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}

      {workspaces.length === 0 ? (
        <p className="muted">
          You are not in a workspace yet. Create one in the Workspaces tab first.
        </p>
      ) : (
        <>
          <div className="workspace-switcher">
            <label>
              Workspace
              <select
                value={activeWorkspace?.id ?? ''}
                onChange={(event) => handleSelectWorkspace(event.target.value)}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} ({workspace.role})
                  </option>
                ))}
              </select>
            </label>

            <p className="today-total">
              Today (timer + manual): <strong>{formatDuration(todaysTotalSeconds)}</strong>
            </p>
          </div>

          {running && (
            <div className={running.isPaused ? 'running-timer paused' : 'running-timer'}>
              <div className="running-timer-head">
                <span className={running.isPaused ? 'timer-dot paused' : 'timer-dot'} />
                <span className="running-timer-clock">{formatDuration(runningElapsedSeconds)}</span>
                {running.isPaused && <span className="role-badge role-admin">paused</span>}
                <span className="work-name">{running.projectName ?? 'No project'}</span>
                {running.taskName && <span className="muted">{running.taskName}</span>}
                {running.workspaceId !== activeId && running.workspaceName && (
                  <span className="role-badge role-admin">in {running.workspaceName}</span>
                )}
              </div>

              {running.description && <p className="muted">{running.description}</p>}

              {running.tags.length > 0 && (
                <div className="time-entry-tags">
                  {running.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="tag-chip"
                      style={{ borderColor: tag.color, color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="running-timer-actions">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void (running.isPaused ? handleResume() : handlePause())}
                >
                  {running.isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={loading}
                  onClick={() => void handleStop()}
                >
                  {loading ? 'Stopping...' : 'Stop timer'}
                </button>
              </div>
            </div>
          )}

          <div className="tabs">
            <button
              type="button"
              className={tab === 'timer' ? 'tab active' : 'tab'}
              onClick={() => setTab('timer')}
            >
              Timer
            </button>
            <button
              type="button"
              className={tab === 'manual' ? 'tab active' : 'tab'}
              onClick={() => setTab('manual')}
            >
              {editingEntry ? 'Edit entry' : 'Manual entry'}
            </button>
          </div>

          {tab === 'timer' &&
            (running ? (
              <p className="muted">
                A timer is already running or paused. Stop it before starting a new one.
              </p>
            ) : (
              <StartTimerForm
                projects={projects}
                tasks={tasks}
                tags={tags}
                loading={loading}
                onStart={handleStart}
                onCreateTask={handleCreateTask}
              />
            ))}

          {tab === 'manual' && (
            <ManualEntryForm
              key={editingEntry?.id ?? `new-${formVersion}`}
              entry={editingEntry}
              projects={projects}
              tasks={tasks}
              tags={tags}
              loading={loading}
              onSubmit={handleManualSubmit}
              onCancelEdit={handleCancelEdit}
              onCreateTask={handleCreateTask}
            />
          )}

          <section className="work-panel">
            <h3>Entries by day</h3>
            <EntriesList
              entries={entries}
              runningElapsedSeconds={runningElapsedSeconds}
              loading={loading}
              onEdit={handleEdit}
              onDelete={(entry) => void handleDelete(entry)}
            />
          </section>
        </>
      )}
    </section>
  )
}
