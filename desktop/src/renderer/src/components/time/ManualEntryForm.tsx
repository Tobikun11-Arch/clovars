import { useState } from 'react'
import type { Project, Tag, Task } from '../../types/work'
import type { ManualTimeEntryInput, TimeEntry, UpdateTimeEntryInput } from '../../types/time'
import {
  calculateSeconds,
  formatDurationShort,
  minutesAgo,
  toDateTimeLocal,
  toDateTimeLocalValue
} from '../../utils/time'
import { Button, Field, Input, Select, Stack } from '../ui'
import { TagPicker } from './TagPicker'
import { TaskPicker } from './TaskPicker'

interface ManualEntryFormProps {
  entry: TimeEntry | null
  projects: Project[]
  tasks: Task[]
  tags: Tag[]
  loading: boolean
  onSubmit: (input: ManualTimeEntryInput | UpdateTimeEntryInput) => void | Promise<void>
  onCancelEdit: () => void
  onCreateTask: (projectId: string, name: string) => Promise<Task | null>
  showCancel?: boolean
  disableTimeFields?: boolean
}

export function ManualEntryForm({
  entry,
  projects,
  tasks,
  tags,
  loading,
  onSubmit,
  onCancelEdit,
  onCreateTask,
  showCancel = true,
  disableTimeFields = false
}: ManualEntryFormProps): React.JSX.Element {
  const [projectId, setProjectId] = useState(entry?.projectId ?? '')
  const [taskId, setTaskId] = useState(entry?.taskId ?? '')
  const [description, setDescription] = useState(entry?.description ?? '')
  const [tagIds, setTagIds] = useState<string[]>(entry?.tagIds ?? [])
  const [start, setStart] = useState(
    entry ? toDateTimeLocal(entry.startTime) : toDateTimeLocalValue(minutesAgo(30))
  )
  const [end, setEnd] = useState(
    entry?.endTime ? toDateTimeLocal(entry.endTime) : toDateTimeLocalValue(new Date())
  )
  const [formError, setFormError] = useState<string | null>(null)

  const durationSeconds = calculateSeconds(start, end)

  function handleProjectChange(nextProjectId: string): void {
    setProjectId(nextProjectId)
    setTaskId('')
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()
    setFormError(null)

    // Skip time validation if editing a running timer
    if (!disableTimeFields) {
      if (!start || !end) {
        setFormError('Start and end times are required.')
        return
      }

      if (durationSeconds <= 0) {
        setFormError('End time must be after start time.')
        return
      }

      const startDate = new Date(start)
      const endDate = new Date(end)

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        setFormError('Enter valid start and end times.')
        return
      }
    }

    // For running timers, only submit metadata (no time fields)
    if (disableTimeFields && entry?.isRunning) {
      void onSubmit({
        projectId: projectId || null,
        taskId: taskId || null,
        tagIds,
        description: description.trim() || null
      })
    } else {
      const startDate = new Date(start)
      const endDate = new Date(end)

      void onSubmit({
        projectId: projectId || null,
        taskId: taskId || null,
        tagIds,
        description: description.trim() || null,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString()
      })
    }

    // Reset form if creating new entry (not editing)
    if (!entry) {
      setProjectId('')
      setTaskId('')
      setDescription('')
      setTagIds([])
      setStart(toDateTimeLocalValue(minutesAgo(30)))
      setEnd(toDateTimeLocalValue(new Date()))
    }
  }

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
        alwaysShowCreate={disableTimeFields}
      />

      <Field label="Description">
        <Input
          value={description}
          maxLength={500}
          placeholder="What did you work on?"
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      {!disableTimeFields && (
        <div className="time-input-row">
          <Field label="Start" required>
            <Input
              type="datetime-local"
              value={start}
              step={60}
              required
              onChange={(event) => setStart(event.target.value)}
            />
          </Field>
          <Field label="End" required>
            <Input
              type="datetime-local"
              value={end}
              step={60}
              required
              onChange={(event) => setEnd(event.target.value)}
            />
          </Field>
        </div>
      )}

      {disableTimeFields && (
        <div className="field">
          <span className="field__label">Timer status</span>
          <div className="muted">
            {entry?.isRunning ? 'Timer is running - time fields are locked' : 'Timer is stopped'}
          </div>
        </div>
      )}

      <div className="field">
        <span className="field__label">Tags</span>
        <TagPicker tags={tags} selectedIds={tagIds} onChange={setTagIds} disabled={loading} />
      </div>

      <div className="inline" style={{ justifyContent: 'space-between' }}>
        <span className="muted">Duration: {formatDurationShort(durationSeconds)}</span>
      </div>

      {formError && (
        <div className="form-alert" role="alert">
          {formError}
        </div>
      )}

      <Stack gap={2}>
        <Button variant="primary" type="submit" loading={loading}>
          {entry ? 'Save changes' : 'Add entry'}
        </Button>
        {showCancel && (
          <Button variant="ghost" disabled={loading} onClick={onCancelEdit}>
            {entry ? 'Cancel edit' : 'Cancel'}
          </Button>
        )}
      </Stack>
    </form>
  )
}
