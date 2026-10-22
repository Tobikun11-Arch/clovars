import { useState } from 'react'
import type { Project, Tag, Task } from '../../types/work'
import type { StartTimerInput } from '../../types/time'
import { TagPicker } from './TagPicker'
import { TaskPicker } from './TaskPicker'

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

  function handleProjectChange(nextProjectId: string): void {
    setProjectId(nextProjectId)
    setTaskId('')
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()

    void onStart({
      projectId: projectId || null,
      taskId: taskId || null,
      tagIds,
      description: description.trim() || null
    })
  }

  return (
    <form onSubmit={handleSubmit}>
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
          placeholder="What are you working on?"
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <div className="tag-field">
        <span className="field-label">Tags</span>
        <TagPicker tags={tags} selectedIds={tagIds} onChange={setTagIds} disabled={loading} />
      </div>

      <div className="form-actions">
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Starting...' : 'Start timer'}
        </button>
      </div>
    </form>
  )
}
