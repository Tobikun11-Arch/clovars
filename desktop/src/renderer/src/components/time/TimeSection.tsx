import { useEffect, useState } from 'react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
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
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { formatDuration, formatDurationShort, isToday } from '../../utils/time'
import {
  Badge,
  Button,
  Card,
  Divider,
  Drawer,
  ErrorState,
  Section,
  Skeleton,
  SegmentedControl,
  confirmDialog,
  showToast
} from '../ui'
import { Icon, icons } from '../icons'
import { EntriesList } from './EntriesList'
import { ManualEntryForm } from './ManualEntryForm'
import { StartTimerForm } from './StartTimerForm'
import { CircularProgress } from './CircularProgress'

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
  const { activeId, activeWorkspace } = useWorkspace()
  const reducedMotion = useReducedMotion()
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formVersion, setFormVersion] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [timerMode, setTimerMode] = useState<'timer' | 'manual'>('timer')

  const runningId = running?.id ?? null
  const runningPaused = running?.isPaused ?? false

  useEffect(() => {
    if (!activeId) return

    const workspaceId = activeId
    let cancelled = false

    async function load(): Promise<void> {
      setPageLoading(true)
      setLoadError(null)

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
          setLoadError(err instanceof Error ? err.message : 'Could not load time data')
        }
      } finally {
        if (!cancelled) setPageLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [activeId, runningId, runningPaused, reloadKey])

  async function handleStart(input: StartTimerInput): Promise<void> {
    if (!activeId) return

    setLoading(true)
    try {
      const entry = await startTimer(activeId, input)
      onRunningChange(entry)
      showToast('Timer started.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not start the timer', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleStop(): Promise<void> {
    if (!running) return

    setLoading(true)
    try {
      await stopTimer(running.workspaceId)
      onRunningChange(null)
      showToast('Timer stopped.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not stop the timer', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handlePause(): Promise<void> {
    if (!running || running.isPaused) return

    setLoading(true)
    try {
      const entry = await pauseTimer(running.workspaceId)
      onRunningChange(entry)
      showToast('Timer paused.', 'info')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not pause the timer', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleResume(): Promise<void> {
    if (!running || !running.isPaused) return

    setLoading(true)
    try {
      const entry = await resumeTimer(running.workspaceId)
      onRunningChange(entry)
      showToast('Timer resumed.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not resume the timer', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleManualSubmit(input: ManualTimeEntryInput): Promise<void> {
    if (!activeId) return

    setLoading(true)
    try {
      if (editingEntry) {
        await updateTimeEntry(activeId, editingEntry.id, input)
        showToast('Time entry updated.', 'success')
      } else {
        const entry = await createManualTimeEntry(activeId, input)
        showToast(`Added ${formatDurationShort(entry.durationSeconds)}.`, 'success')
        setFormVersion((version) => version + 1)
      }

      setEditingEntry(null)
      setDrawerOpen(false)
      setEntries(await fetchTimeEntries(activeId))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save the time entry', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(entry: TimeEntry): Promise<void> {
    if (!activeId) return

    const confirmed = await confirmDialog({
      title: 'Delete time entry?',
      message: `This will permanently remove the ${formatDurationShort(entry.durationSeconds)} entry from ${entry.projectName ?? 'No project'}.`,
      confirmLabel: 'Delete entry',
      danger: true
    })

    if (!confirmed) return

    setLoading(true)
    try {
      await deleteTimeEntry(activeId, entry.id)
      setEntries(await fetchTimeEntries(activeId))
      if (editingEntry?.id === entry.id) {
        setEditingEntry(null)
        setDrawerOpen(false)
      }
      showToast('Time entry deleted.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete the time entry', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTask(projectId: string, name: string): Promise<Task | null> {
    if (!activeId) return null

    try {
      const task = await createTask(activeId, { name, projectId })
      setTasks(await fetchTasks(activeId))
      showToast(`Task "${task.name}" created.`, 'success')
      return task
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create the task', 'error')
      return null
    }
  }

  function openNewEntry(): void {
    setTimerMode('manual')
    setFormVersion((version) => version + 1)
  }

  function handleEdit(entry: TimeEntry): void {
    setEditingEntry(entry)
    setDrawerOpen(true)
  }

  function closeDrawer(): void {
    setDrawerOpen(false)
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
  const todayCount = entries.filter((entry) => isToday(entry.startTime)).length

  return (
    <>
      <div className="time-top">
        <Card
          title="Timer"
          subtitle={
            running
              ? (running.workspaceName ?? activeWorkspace?.name ?? undefined)
              : activeWorkspace?.name
          }
          actions={
            running ? (
              <Badge variant={running.isPaused ? 'warning' : 'success'}>
                {running.isPaused ? 'Paused' : 'Live'}
              </Badge>
            ) : undefined
          }
        >
          <SegmentedControl
            items={[
              { value: 'timer', label: 'Timer' },
              { value: 'manual', label: 'Manual entry' }
            ]}
            value={timerMode}
            onChange={setTimerMode}
            label="Timer mode"
          />

          {timerMode === 'timer' ? (
            running ? (
              <div className="timer-bar">
                <CircularProgress
                  progress={running.isPaused ? 0 : Math.min(1, runningElapsedSeconds / 3600)}
                  size={140}
                  strokeWidth={10}
                  reducedMotion={reducedMotion}
                >
                  <div className="timer-bar__time">
                    <span className="timer-bar__clock tabular">
                      {formatDuration(runningElapsedSeconds)}
                    </span>
                    <span className="timer-bar__status">
                      {running.isPaused ? 'Paused' : 'Running'}
                    </span>
                  </div>
                </CircularProgress>

                <div className="timer-bar__info">
                  <div className="timer-bar__meta">
                    <span className="work-name">{running.projectName ?? 'No project'}</span>
                    {running.taskName && <span>· {running.taskName}</span>}
                    {running.workspaceId !== activeId && running.workspaceName && (
                      <Badge variant="primary">in {running.workspaceName}</Badge>
                    )}
                  </div>

                  {running.description && (
                    <p className="timer-bar__description">{running.description}</p>
                  )}

                  {running.tags.length > 0 && (
                    <div className="tag-picker">
                      {running.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="chip"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="timer-bar__actions">
                    <Button
                      variant={running.isPaused ? 'primary' : 'secondary'}
                      loading={loading}
                      onClick={() => void (running.isPaused ? handleResume() : handlePause())}
                    >
                      {running.isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button variant="danger" loading={loading} onClick={() => void handleStop()}>
                      Stop
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <StartTimerForm
                projects={projects}
                tasks={tasks}
                tags={tags}
                loading={loading}
                onStart={handleStart}
                onCreateTask={handleCreateTask}
              />
            )
          ) : (
            <ManualEntryForm
              entry={null}
              projects={projects}
              tasks={tasks}
              tags={tags}
              loading={loading}
              onSubmit={handleManualSubmit}
              onCancelEdit={() => setTimerMode('timer')}
              onCreateTask={handleCreateTask}
              showCancel={false}
            />
          )}
        </Card>

        <Card title="Today">
          <div className="stat__value tabular">{formatDuration(todaysTotalSeconds)}</div>
          <p className="muted">
            {todayCount} saved {todayCount === 1 ? 'entry' : 'entries'} today
          </p>
          <Divider />
          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-row__label">Workspace</span>
              <span className="detail-row__value">{activeWorkspace?.name ?? '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Your role</span>
              <span className="detail-row__value">{activeWorkspace?.role ?? '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Timer</span>
              <span className="detail-row__value">
                {running ? (running.isPaused ? 'Paused' : 'Running') : 'Idle'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Section
        title="Time entries"
        description="Entries are grouped by day. Running timers update live."
        actions={
          <Button variant="primary" icon={<Icon d={icons.plus} />} onClick={openNewEntry}>
            Add entry
          </Button>
        }
      >
        {loadError ? (
          <ErrorState
            title="Could not load time entries"
            message={loadError}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        ) : pageLoading ? (
          <div className="card">
            <div className="card__body">
              <Skeleton height={28} />
              <Skeleton height={52} />
              <Skeleton height={52} />
              <Skeleton height={52} />
            </div>
          </div>
        ) : (
          <EntriesList
            entries={entries}
            runningElapsedSeconds={runningElapsedSeconds}
            loading={loading}
            onEdit={handleEdit}
            onDelete={(entry) => void handleDelete(entry)}
            onAdd={openNewEntry}
          />
        )}
      </Section>

      <Drawer
        open={drawerOpen}
        title="Edit time entry"
        description="Adjust the details, then save your changes."
        onClose={closeDrawer}
      >
        <ManualEntryForm
          key={editingEntry?.id ?? `edit-${formVersion}`}
          entry={editingEntry}
          projects={projects}
          tasks={tasks}
          tags={tags}
          loading={loading}
          onSubmit={handleManualSubmit}
          onCancelEdit={closeDrawer}
          onCreateTask={handleCreateTask}
        />
      </Drawer>
    </>
  )
}
