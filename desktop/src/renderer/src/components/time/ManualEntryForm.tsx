import { useState } from 'react'
import type { Project, Tag, Task } from '../../types/work'
import type { ManualTimeEntryInput, TimeEntry } from '../../types/time'
import {
  calculateSeconds,
  formatDurationShort,
  minutesAgo,
  toDateTimeLocal,
  toDateTimeLocalValue
} from '../../utils/time'
import { TagPicker } from './TagPicker'
import { TaskPicker } from './TaskPicker'

interface ManualEntryFormProps {
  entry: TimeEntry | null
  projects: Project[]
  tasks: Task[]
  tags: Tag[]
  loading: boolean
  onSubmit: (input: ManualTimeEntryInput) => void | Promise<void>
  onCancelEdit: () => void
  onCreateTask: (projectId: string, name: string) => Promise<Task | null>
}

export function ManualEntryForm({
  entry,
  projects,
  tasks,
  tags,
  loading,
  onSubmit,
  onCancelEdit,
  onCreateTask
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

    void onSubmit({
      projectId: projectId || null,
      taskId: taskId || null,
      tagIds,
      description: description.trim() || null,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString()
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {entry && <p className="muted">Editing a saved entry.</p>}

      <label>
        Project (optional)
        <select value={projectId} onChange={(event) => handleProjectChange(event.target.value)}>
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <TaskPicker
        projectId={projectId}
        tasks={tasks}
        selectedTaskId={taskId}
        disabled={loading}
        onChange={setTaskId}
        onCreateTask={onCreateTask}
      />

      <label>
        Description (optional)
        <input
          value={description}
          maxLength={500}
          placeholder="What did you work on?"
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <div className="time-input-row">
        <label>
          Start
          <input
            type="datetime-local"
            value={start}
            step={60}
            required
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label>
          End
          <input
            type="datetime-local"
            value={end}
            step={60}
            required
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
      </div>

      <p className="muted">Duration: {formatDurationShort(durationSeconds)}</p>

      <div className="tag-field">
        <span className="field-label">Tags</span>
        <TagPicker tags={tags} selectedIds={tagIds} onChange={setTagIds} disabled={loading} />
      </div>

      {formError && <p className="error">{formError}</p>}

      <div className="form-actions">
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Saving...' : entry ? 'Save entry' : 'Add entry'}
        </button>
        {entry && (
          <button type="button" disabled={loading} onClick={onCancelEdit}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
