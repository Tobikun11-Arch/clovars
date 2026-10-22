import { useState } from 'react'
import type { Project, Task, TaskInput } from '../../types/work'

interface TasksPanelProps {
  tasks: Task[]
  projects: Project[]
  loading: boolean
  onCreate: (input: TaskInput) => void | Promise<void>
  onUpdate: (task: Task, input: TaskInput) => void | Promise<void>
  onDelete: (task: Task) => void | Promise<void>
}

export function TasksPanel({
  tasks,
  projects,
  loading,
  onCreate,
  onUpdate,
  onDelete
}: TasksPanelProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [archived, setArchived] = useState(false)
  const [filterProjectId, setFilterProjectId] = useState('')

  function resetForm(): void {
    setEditingId(null)
    setName('')
    setProjectId('')
    setDescription('')
    setArchived(false)
  }

  function startEdit(task: Task): void {
    setEditingId(task.id)
    setName(task.name)
    setProjectId(task.projectId)
    setDescription(task.description ?? '')
    setArchived(task.archived)
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const selectedProjectId = projectId || projects[0]?.id || ''

    if (!selectedProjectId) return

    const input: TaskInput = {
      name: name.trim(),
      projectId: selectedProjectId,
      description: description.trim() ? description.trim() : null,
      archived
    }

    const editing = tasks.find((task) => task.id === editingId)

    if (editing) {
      await onUpdate(editing, input)
    } else {
      await onCreate(input)
    }

    resetForm()
  }

  const visibleTasks = filterProjectId
    ? tasks.filter((task) => task.projectId === filterProjectId)
    : tasks

  function projectName(taskProjectId: string): string {
    return projects.find((project) => project.id === taskProjectId)?.name ?? 'Unknown project'
  }

  if (projects.length === 0) {
    return (
      <section className="work-panel">
        <h3>Tasks</h3>
        <p className="muted">Create a project first, then you can add tasks to it.</p>
      </section>
    )
  }

  return (
    <section className="work-panel">
      <h3>Tasks</h3>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Write homepage copy"
            required
          />
        </label>
        <label>
          Project
          <select
            value={projectId || projects[0]?.id}
            onChange={(event) => setProjectId(event.target.value)}
            required
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Description (optional)
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short description"
          />
        </label>
        <label className="inline-label">
          <input
            type="checkbox"
            checked={archived}
            onChange={(event) => setArchived(event.target.checked)}
          />
          Archived
        </label>
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : editingId ? 'Save task' : 'Add task'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <label className="filter-label">
        Filter by project
        <select
          value={filterProjectId}
          onChange={(event) => setFilterProjectId(event.target.value)}
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      {visibleTasks.length === 0 ? (
        <p className="muted">No tasks yet.</p>
      ) : (
        <ul className="work-list">
          {visibleTasks.map((task) => (
            <li key={task.id}>
              <span className="work-name">{task.name}</span>
              <span className="muted">{projectName(task.projectId)}</span>
              {task.description && <span className="muted">{task.description}</span>}
              {task.archived && <span className="role-badge">archived</span>}
              <span className="row-actions">
                <button type="button" disabled={loading} onClick={() => startEdit(task)}>
                  Edit
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (window.confirm(`Delete task "${task.name}"?`)) {
                      void onDelete(task)
                    }
                  }}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
