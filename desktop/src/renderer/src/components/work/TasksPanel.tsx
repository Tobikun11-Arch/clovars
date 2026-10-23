import { useState } from 'react'
import type { Project, Task, TaskInput } from '../../types/work'
import {
  Badge,
  Button,
  Checkbox,
  Drawer,
  EmptyState,
  Field,
  IconButton,
  Input,
  SearchInput,
  Section,
  Select,
  TableContainer,
  Textarea,
  Toolbar,
  confirmDialog
} from '../ui'
import { Icon, icons } from '../icons'

interface TasksPanelProps {
  tasks: Task[]
  projects: Project[]
  loading: boolean
  onCreate: (input: TaskInput) => Promise<void>
  onUpdate: (task: Task, input: TaskInput) => Promise<void>
  onDelete: (task: Task) => Promise<void>
  onNavigate: (path: string) => void
}

export function TasksPanel({
  tasks,
  projects,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onNavigate
}: TasksPanelProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const query = search.trim().toLowerCase()
  const visible = tasks
    .filter((task) => !projectFilter || task.projectId === projectFilter)
    .filter(
      (task) =>
        !query ||
        task.name.toLowerCase().includes(query) ||
        (task.description ?? '').toLowerCase().includes(query)
    )

  function openCreate(): void {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(task: Task): void {
    setEditing(task)
    setDrawerOpen(true)
  }

  function closeDrawer(): void {
    setDrawerOpen(false)
    setEditing(null)
  }

  async function handleSave(input: TaskInput): Promise<void> {
    if (editing) {
      await onUpdate(editing, input)
    } else {
      await onCreate(input)
    }
    closeDrawer()
  }

  async function handleDelete(task: Task): Promise<void> {
    const confirmed = await confirmDialog({
      title: `Delete "${task.name}"?`,
      message: 'Time entries linked to this task keep their tracked time.',
      confirmLabel: 'Delete task',
      danger: true
    })
    if (confirmed) await onDelete(task)
  }

  function projectName(projectId: string): string {
    return projects.find((project) => project.id === projectId)?.name ?? 'Unknown project'
  }

  if (projects.length === 0) {
    return (
      <Section title="Tasks" description="Break projects down into smaller units of work.">
        <EmptyState
          icon={<Icon d={icons.tasks} size={24} />}
          title="Create a project first"
          description="Tasks live inside projects, so you need at least one project before adding tasks."
          action={
            <Button variant="primary" onClick={() => onNavigate('/work/projects')}>
              Go to projects
            </Button>
          }
        />
      </Section>
    )
  }

  return (
    <>
      <Section
        title="Tasks"
        description="Break projects down into smaller units of work."
        actions={
          <Toolbar>
            <SearchInput
              className="toolbar__search"
              value={search}
              placeholder="Search tasks"
              aria-label="Search tasks"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              className="toolbar__filter"
              value={projectFilter}
              aria-label="Filter by project"
              onChange={(event) => setProjectFilter(event.target.value)}
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Button variant="primary" icon={<Icon d={icons.plus} />} onClick={openCreate}>
              New task
            </Button>
          </Toolbar>
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={<Icon d={icons.tasks} size={24} />}
            title={tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
            description={
              tasks.length === 0
                ? 'Add tasks to a project so tracked time can be more specific.'
                : 'Try a different search term or project filter.'
            }
            action={
              tasks.length === 0 ? (
                <Button variant="primary" onClick={openCreate}>
                  Create task
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('')
                    setProjectFilter('')
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <div className="card">
            <div className="card__body card__body--flush">
              <TableContainer>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Project</th>
                      <th className="col-hide-md">Description</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <span className="cell-primary">{task.name}</span>
                        </td>
                        <td>{projectName(task.projectId)}</td>
                        <td className="col-hide-md">
                          <span className="cell-sub">{task.description || '—'}</span>
                        </td>
                        <td>
                          {task.archived ? (
                            <Badge variant="neutral">Archived</Badge>
                          ) : (
                            <Badge variant="success">Active</Badge>
                          )}
                        </td>
                        <td>
                          <div className="table__actions">
                            <IconButton
                              label={`Edit ${task.name}`}
                              size="sm"
                              icon={<Icon d={icons.edit} size={16} />}
                              onClick={() => openEdit(task)}
                            />
                            <IconButton
                              label={`Delete ${task.name}`}
                              size="sm"
                              icon={<Icon d={icons.trash} size={16} />}
                              disabled={loading}
                              onClick={() => void handleDelete(task)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>
          </div>
        )}
      </Section>

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit task' : 'New task'}
        description={editing ? 'Update the task details.' : 'Add a task to one of your projects.'}
        onClose={closeDrawer}
      >
        <TaskForm
          key={editing?.id ?? 'new'}
          task={editing}
          projects={projects}
          loading={loading}
          onCancel={closeDrawer}
          onSubmit={handleSave}
        />
      </Drawer>
    </>
  )
}

function TaskForm({
  task,
  projects,
  loading,
  onSubmit,
  onCancel
}: {
  task: Task | null
  projects: Project[]
  loading: boolean
  onSubmit: (input: TaskInput) => Promise<void>
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState(task?.name ?? '')
  const [projectId, setProjectId] = useState(task?.projectId ?? projects[0]?.id ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [archived, setArchived] = useState(task?.archived ?? false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()

    if (!name.trim()) {
      setError('Task name is required.')
      return
    }
    if (!projectId) {
      setError('Choose a project for this task.')
      return
    }

    setError(null)
    await onSubmit({
      name: name.trim(),
      projectId,
      description: description.trim() || null,
      archived
    })
  }

  return (
    <form
      className="stack"
      style={{ gap: 'var(--gap-field)' }}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <Field label="Name" error={error} required>
        <Input
          value={name}
          autoFocus
          maxLength={120}
          placeholder="Design homepage"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field label="Project" required>
        <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Description">
        <Textarea
          value={description}
          rows={4}
          maxLength={500}
          placeholder="What does this task involve?"
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <Checkbox
        label="Archived"
        checked={archived}
        onChange={(event) => setArchived(event.target.checked)}
      />

      <div className="form-actions">
        <Button variant="primary" type="submit" loading={loading}>
          {task ? 'Save task' : 'Create task'}
        </Button>
        <Button variant="ghost" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
