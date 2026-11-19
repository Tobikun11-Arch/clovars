import { useEffect, useState } from 'react'
import type { Project, Tag, Task } from '../../types/work'
import type { StartTimerInput } from '../../types/time'
import { Button, Checkbox, Field, Input, Select } from '../ui'
import { formatDurationShort, minutesAgo, toDateTimeLocalValue } from '../../utils/time'
import { Icon, icons } from '../icons'
import { TagPicker } from './TagPicker'
import { TaskPicker } from './TaskPicker'

// Must match the server: a timer can't start 24 or more hours ago (the
// 24-hour guard would stop it at once), and can't start in the future.
const MAX_BACKDATE_MS = 24 * 60 * 60 * 1000
const QUICK_STARTS = [
  { label: '15 min ago', minutes: 15 },
  { label: '30 min ago', minutes: 30 },
  { label: '1 hr ago', minutes: 60 },
  { label: '2 hr ago', minutes: 120 }
]

function validateStart(value: string, now: number): string | null {
  const start = new Date(value).getTime()
  if (!value || Number.isNaN(start)) return 'Choose when you started.'
  if (start > now) return "Start time can't be in the future."
  if (now - start >= MAX_BACKDATE_MS) {
    return 'That is 24 hours or more ago. Use Manual entry for it instead.'
  }
  return null
}

interface StartTimerFormProps {
  projects: Project[]
  tasks: Task[]
  tags: Tag[]
  loading: boolean
  onStart: (input: StartTimerInput) => void | Promise<void>
  onCreateTask: (projectId: string, name: string) => Promise<Task | null>
}

export function StartTimerForm({
  projects,
  tasks,
  tags,
  loading,
  onStart,
  onCreateTask
}: StartTimerFormProps): React.JSX.Element {
  const [projectId, setProjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [description, setDescription] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [startedEarlier, setStartedEarlier] = useState(false)
  const [startValue, setStartValue] = useState(() => toDateTimeLocalValue(minutesAgo(60)))
  const [startError, setStartError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Keep "already tracked" and the picker's limits current while it's open.
  useEffect(() => {
    if (!startedEarlier) return
    const interval = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [startedEarlier])

  function handleProjectChange(nextProjectId: string): void {
    setProjectId(nextProjectId)
    setTaskId('')
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()

    let startTime: string | undefined
    if (startedEarlier) {
      const error = validateStart(startValue, Date.now())
      setStartError(error)
      if (error) return
      startTime = new Date(startValue).toISOString()
    }

    void onStart({
      projectId: projectId || null,
      taskId: taskId || null,
      tagIds,
      description: description.trim() || null,
      startTime
    })
  }

  function handleStartedEarlier(next: boolean): void {
    setStartedEarlier(next)
    setStartError(null)
    if (next) {
      setNow(Date.now())
      setStartValue(toDateTimeLocalValue(minutesAgo(60)))
    }
  }

  function handleQuickStart(minutes: number): void {
    setStartValue(toDateTimeLocalValue(minutesAgo(minutes)))
    setStartError(null)
  }

  const startMs = new Date(startValue).getTime()
  const alreadyTracked =
    startedEarlier && !Number.isNaN(startMs) && startMs <= now
      ? Math.floor((now - startMs) / 1000)
      : 0

  return (
    <form className="stack" style={{ gap: 'var(--gap-field)' }} onSubmit={handleSubmit}>
      <Field label="Project">
        <Select value={projectId} onChange={(event) => handleProjectChange(event.target.value)}>
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </Field>

      <TaskPicker
        projectId={projectId}
        tasks={tasks}
        selectedTaskId={taskId}
        disabled={loading}
        onChange={setTaskId}
        onCreateTask={onCreateTask}
        alwaysShowCreate={true}
      />

      <Field label="Description">
        <Input
          value={description}
          maxLength={500}
          placeholder="What are you working on?"
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <div className="field">
        <span className="field__label">Tags</span>
        <TagPicker tags={tags} selectedIds={tagIds} onChange={setTagIds} disabled={loading} />
      </div>

      <div className="timer-start">
        <Checkbox
          label="I started earlier"
          checked={startedEarlier}
          disabled={loading}
          onChange={(event) => handleStartedEarlier(event.target.checked)}
        />

        {startedEarlier && (
          <div className="timer-start__earlier">
            <Field
              label="Started at"
              error={startError}
              hint={
                startError
                  ? undefined
                  : alreadyTracked > 0
                    ? `The timer starts with ${formatDurationShort(alreadyTracked)} already tracked.`
                    : 'Pick the time you actually began working.'
              }
            >
              <Input
                type="datetime-local"
                value={startValue}
                max={toDateTimeLocalValue(new Date(now))}
                min={toDateTimeLocalValue(new Date(now - MAX_BACKDATE_MS + 60 * 1000))}
                disabled={loading}
                onChange={(event) => {
                  setStartValue(event.target.value)
                  setStartError(null)
                }}
              />
            </Field>
            <div className="timer-start__quick" role="group" aria-label="Quick start times">
              {QUICK_STARTS.map((option) => (
                <Button
                  key={option.minutes}
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => handleQuickStart(option.minutes)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="form-actions">
        <Button
          variant="primary"
          type="submit"
          loading={loading}
          icon={<Icon d={icons.play} size={16} />}
        >
          Start timer
        </Button>
      </div>
    </form>
  )
}
