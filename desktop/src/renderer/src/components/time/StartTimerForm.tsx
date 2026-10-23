import { useState } from 'react'
import type { Project, Tag, Task } from '../../types/work'
import type { StartTimerInput } from '../../types/time'
import { Button, Field, Input, Select } from '../ui'
import { Icon, icons } from '../icons'
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
