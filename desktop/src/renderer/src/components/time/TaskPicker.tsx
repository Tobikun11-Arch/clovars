import { useState } from 'react'
import type { Task } from '../../types/work'
import { Button, Input, Select } from '../ui'

interface TaskPickerProps {
  projectId: string
  tasks: Task[]
  selectedTaskId: string
  disabled: boolean
  onChange: (taskId: string) => void
  onCreateTask: (projectId: string, name: string) => Promise<Task | null>
}

export function TaskPicker({
  projectId,
  tasks,
  selectedTaskId,
  disabled,
  onChange,
  onCreateTask
}: TaskPickerProps): React.JSX.Element {
  const [newTaskName, setNewTaskName] = useState('')
  const [creating, setCreating] = useState(false)

  const visibleTasks = projectId ? tasks.filter((task) => task.projectId === projectId) : []
  const canCreateTask = Boolean(projectId) && visibleTasks.length === 0
  const trimmedName = newTaskName.trim()

  async function handleCreateTask(): Promise<void> {
    if (!projectId || !trimmedName || creating) return

    setCreating(true)

    try {
      const task = await onCreateTask(projectId, trimmedName)

      if (task) {
        setNewTaskName('')
        onChange(task.id)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="field">
      <span className="field__label">Task</span>
      <Select
        value={selectedTaskId}
        onChange={(event) => onChange(event.target.value)}
        disabled={!projectId || visibleTasks.length === 0}
      >
        <option value="">{projectId ? 'No task' : 'Select a project first'}</option>
        {visibleTasks.map((task) => (
          <option key={task.id} value={task.id}>
            {task.name}
          </option>
        ))}
      </Select>
      {canCreateTask && (
        <div className="task-create">
          <Input
            value={newTaskName}
            maxLength={200}
            placeholder="This project has no tasks — add one"
            disabled={disabled || creating}
            onChange={(event) => setNewTaskName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleCreateTask()
              }
            }}
          />
          <Button
            size="sm"
            disabled={disabled || creating || !trimmedName}
            loading={creating}
            onClick={() => void handleCreateTask()}
          >
            Add task
          </Button>
        </div>
      )}
    </div>
  )
}
