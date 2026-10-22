import { useState } from 'react'
import type { Task } from '../../types/work'

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
    <label>
      Task (optional)
      <select
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
      </select>
      {canCreateTask && (
        <div className="task-create">
          <input
            value={newTaskName}
            maxLength={200}
            placeholder="New task name"
            disabled={disabled || creating}
            onChange={(event) => setNewTaskName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleCreateTask()
              }
            }}
          />
          <button
            type="button"
            disabled={disabled || creating || !trimmedName}
            onClick={() => void handleCreateTask()}
          >
            {creating ? 'Adding...' : 'Add task'}
          </button>
        </div>
      )}
    </label>
  )
}
