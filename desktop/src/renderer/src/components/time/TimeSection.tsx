import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '../../lib/queryCache'
import { useElapsedSeconds } from '../../hooks/useRunningTimer'
import {
  invalidateEntries,
  reloadWorkspaceData,
  useProjects,
  useTags,
  useTasks,
  workspaceKeys
} from '../../hooks/useWorkspaceData'
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
import { createTask } from '../../api/work'
import type { Task } from '../../types/work'
import type { ManualTimeEntryInput, StartTimerInput, TimeEntry, UpdateTimeEntryInput } from '../../types/time'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import {
  addDays,
  formatDuration,
  formatDurationShort,
  isToday,
  startOfWeek
} from '../../utils/time'
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
  onRunningChange: (entry: TimeEntry | null) => void
}

const ENTRIES_LIMIT = 500

const EMPTY_LIST: never[] = []

/** `base` plus the entries of `extra` it does not already contain. */
function mergeEntries(base: TimeEntry[], extra: TimeEntry[]): TimeEntry[] {
  if (extra.length === 0) return base
  const known = new Set(base.map((entry) => entry.id))
  return [...base, ...extra.filter((entry) => !known.has(entry.id))]
}

/** Start of last week: the list shows this week and last week by default. */
function defaultListFrom(): Date {
  return addDays(startOfWeek(new Date()), -7)
}

/** Entries older than the default window, added by "Show older entries". */
interface OlderEntries {
  workspaceId: string | null
  /** Start of the oldest week shown. */
  from: Date
  entries: TimeEntry[]
  reachedEnd: boolean
}

export function TimeSection({
  running,
  onRunningChange
}: TimeSectionProps): React.JSX.Element {
  const { activeId, activeWorkspace } = useWorkspace()
  const reducedMotion = useReducedMotion()
  const runningElapsedSeconds = useElapsedSeconds(running)
  const projects = useProjects(activeId).data ?? EMPTY_LIST
  const tasks = useTasks(activeId).data ?? EMPTY_LIST
  const tags = useTags(activeId).data ?? EMPTY_LIST
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formVersion, setFormVersion] = useState(0)
  const [loading, setLoading] = useState(false)
  // The list shows this week and last week. It is cached, so coming back to
  // this page shows it at once and refreshes in the background. "Show older
  // entries" adds a week at a time on top; older history lives in Reports.
  const [listFrom] = useState(defaultListFrom)
  const entriesQuery = useQuery(
    activeId ? `${workspaceKeys.entries(activeId)}:list:${listFrom.toISOString()}` : null,
    () => fetchTimeEntries(activeId!, { from: listFrom.toISOString(), limit: ENTRIES_LIMIT })
  )
  const refreshEntries = entriesQuery.refresh
  const [olderState, setOlderState] = useState<OlderEntries | null>(null)
  // Switching workspace starts over at the default two weeks.
  const older: OlderEntries =
    olderState && olderState.workspaceId === activeId
      ? olderState
      : { workspaceId: activeId, from: listFrom, entries: [], reachedEnd: false }
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [timerMode, setTimerMode] = useState<'timer' | 'manual'>('timer')

  const entries = mergeEntries(entriesQuery.data ?? EMPTY_LIST, older.entries)
  // Keep showing what we have if a background refresh fails.
  const loadError = entriesQuery.data ? null : entriesQuery.error
  const pageLoading = entriesQuery.loading

  // Starting, stopping, pausing or resuming changes the list: reload it then.
  // Not on mount, where the cache already decides whether to reload.
  const runningKey = running ? `${running.id}:${running.isPaused}` : 'none'
  const lastRunningKey = useRef(runningKey)

  useEffect(() => {
    if (lastRunningKey.current === runningKey) return
    lastRunningKey.current = runningKey
    refreshEntries().catch(() => {})
  }, [runningKey, refreshEntries])

  // Listen for edit request from mini timer
  useEffect(() => {
    if (!window.api) return

    const editListener = (_event: Electron.IpcRendererEvent, state: unknown) => {
      if (running && state && typeof state === 'object' && 'id' in state) {
        handleEdit(running)
      }
    }

    window.api?.on('mini-timer:edit', editListener)

    return () => {
      window.api?.removeListener('mini-timer:edit', editListener)
    }
  }, [running])

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

  async function handleManualSubmit(input: ManualTimeEntryInput | UpdateTimeEntryInput): Promise<void> {
    if (!activeId) return

    setLoading(true)
    try {
      if (editingEntry) {
        const updated = await updateTimeEntry(activeId, editingEntry.id, input)
        showToast('Time entry updated.', 'success')
        updateOlder((list) => list.map((entry) => (entry.id === updated.id ? updated : entry)))

        // If editing a running timer, update the running state
        if (editingEntry.isRunning) {
          onRunningChange(updated)
        }
      } else {
        // When creating a new entry, time fields are always present
        const entry = await createManualTimeEntry(activeId, input as ManualTimeEntryInput)
        showToast(`Added ${formatDurationShort(entry.durationSeconds)}.`, 'success')
        setFormVersion((version) => version + 1)
      }

      setEditingEntry(null)
      setDrawerOpen(false)
      await afterEntriesChanged(activeId)
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
      updateOlder((list) => list.filter((item) => item.id !== entry.id))
      await afterEntriesChanged(activeId)
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
      await reloadWorkspaceData.tasks(activeId)
      showToast(`Task "${task.name}" created.`, 'success')
      return task
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create the task', 'error')
      return null
    }
  }

  /** Reload the list, and mark the dashboard and report caches out of date. */
  async function afterEntriesChanged(workspaceId: string): Promise<void> {
    invalidateEntries(workspaceId)
    await refreshEntries()
  }

  function updateOlder(update: (list: TimeEntry[]) => TimeEntry[]): void {
    setOlderState((state) =>
      state && state.workspaceId === activeId ? { ...state, entries: update(state.entries) } : state
    )
  }

  async function handleShowOlder(): Promise<void> {
    if (!activeId || loadingOlder) return

    const workspaceId = activeId
    const current = older
    const before = new Date(current.from.getTime() - 1).toISOString()
    // Ignore the result if the workspace or the window changed meanwhile.
    const stillCurrent = (state: OlderEntries | null): boolean =>
      (state?.workspaceId === workspaceId ? state.from : listFrom).getTime() ===
      current.from.getTime()
    setLoadingOlder(true)

    try {
      let olderFrom = addDays(current.from, -7)
      let fetched = await fetchTimeEntries(workspaceId, {
        from: olderFrom.toISOString(),
        to: before,
        limit: ENTRIES_LIMIT
      })

      if (fetched.length === 0) {
        // Skip empty weeks: jump straight to the week of the next older entry.
        const [latest] = await fetchTimeEntries(workspaceId, { to: before, limit: 1 })

        if (!latest) {
          setOlderState((state) =>
            stillCurrent(state) ? { ...current, reachedEnd: true } : state
          )
          return
        }

        olderFrom = startOfWeek(new Date(latest.startTime))
        fetched = await fetchTimeEntries(workspaceId, {
          from: olderFrom.toISOString(),
          to: before,
          limit: ENTRIES_LIMIT
        })
      }

      setOlderState((state) =>
        stillCurrent(state)
          ? {
              workspaceId,
              from: olderFrom,
              entries: mergeEntries(current.entries, fetched),
              reachedEnd: false
            }
          : state
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load older entries', 'error')
    } finally {
      setLoadingOlder(false)
    }
  }

  function openNewEntry(): void {
    setTimerMode('manual')
    setFormVersion((version) => version + 1)
  }

  const handleEdit = useCallback((entry: TimeEntry): void => {
    setEditingEntry(entry)
    setDrawerOpen(true)
  }, [])

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
  const thisWeekStart = startOfWeek(new Date()).getTime()
  const inThisWeek = (iso: string): boolean => new Date(iso).getTime() >= thisWeekStart
  const thisWeekTotalSeconds =
    entries
      .filter((entry) => inThisWeek(entry.startTime))
      .reduce(
        (total, entry) => total + (entry.isRunning ? runningElapsedSeconds : entry.durationSeconds),
        0
      ) +
    (running && running.workspaceId === activeId && !runningIsListed && inThisWeek(running.startTime)
      ? runningElapsedSeconds
      : 0)

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
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(running)}
                    >
                      Edit
                    </Button>
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
              <span className="detail-row__label">This week</span>
              <span className="detail-row__value tabular">
                {formatDuration(thisWeekTotalSeconds)}
              </span>
            </div>
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
        description="This week and last week, grouped by day with weekly totals. Running timers update live."
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
            onRetry={() => void refreshEntries().catch(() => {})}
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
            onShowOlder={() => void handleShowOlder()}
            loadingOlder={loadingOlder}
            reachedEnd={older.reachedEnd}
          />
        )}
      </Section>

      <Drawer
        open={drawerOpen}
        title={editingEntry?.isRunning ? 'Edit running timer' : 'Edit time entry'}
        description={editingEntry?.isRunning
          ? 'You can change the project, task, tags, and description while the timer is running.'
          : 'Adjust the details, then save your changes.'}
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
          disableTimeFields={editingEntry?.isRunning}
        />
      </Drawer>
    </>
  )
}
