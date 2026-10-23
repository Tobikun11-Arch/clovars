import { useState } from 'react'
import type { Client, Project, ProjectInput, Task } from '../../types/work'
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
  Toolbar,
  confirmDialog
} from '../ui'
import { Icon, icons } from '../icons'

interface ProjectsPanelProps {
  projects: Project[]
  clients: Client[]
  tasks: Task[]
  loading: boolean
  onCreate: (input: ProjectInput) => Promise<void>
  onUpdate: (project: Project, input: ProjectInput) => Promise<void>
  onDelete: (project: Project) => Promise<void>
}

export function ProjectsPanel({
  projects,
  clients,
  tasks,
  loading,
  onCreate,
  onUpdate,
  onDelete
}: ProjectsPanelProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  const query = search.trim().toLowerCase()
  const visible = projects
    .filter((project) => !clientFilter || project.clientId === clientFilter)
    .filter((project) => !query || project.name.toLowerCase().includes(query))

  function openCreate(): void {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(project: Project): void {
    setEditing(project)
    setDrawerOpen(true)
  }

  function closeDrawer(): void {
    setDrawerOpen(false)
    setEditing(null)
  }

  async function handleSave(input: ProjectInput): Promise<void> {
    if (editing) {
      await onUpdate(editing, input)
    } else {
      await onCreate(input)
    }
    closeDrawer()
  }

  async function handleDelete(project: Project): Promise<void> {
    const confirmed = await confirmDialog({
      title: `Delete "${project.name}"?`,
      message: 'The project will be removed. Its tasks are deleted too; time entries are kept.',
      confirmLabel: 'Delete project',
      danger: true
    })
    if (confirmed) await onDelete(project)
  }

  function clientName(clientId: string | null): string {
    if (!clientId) return 'No client'
    return clients.find((client) => client.id === clientId)?.name ?? 'Unknown client'
  }

  return (
    <>
      <Section
        title="Projects"
        description="Group tasks and time entries under a project."
        actions={
          <Toolbar>
            <SearchInput
              className="toolbar__search"
              value={search}
              placeholder="Search projects"
              aria-label="Search projects"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              className="toolbar__filter"
              value={clientFilter}
              aria-label="Filter by client"
              onChange={(event) => setClientFilter(event.target.value)}
            >
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
            <Button variant="primary" icon={<Icon d={icons.plus} />} onClick={openCreate}>
              New project
            </Button>
          </Toolbar>
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={<Icon d={icons.projects} size={24} />}
            title={projects.length === 0 ? 'No projects yet' : 'No matching projects'}
            description={
              projects.length === 0
                ? 'Create your first project to start organising tasks and tracked time.'
                : 'Try a different search term or client filter.'
            }
            action={
              projects.length === 0 ? (
                <Button variant="primary" onClick={openCreate}>
                  Create project
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('')
                    setClientFilter('')
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
                      <th>Project</th>
                      <th>Client</th>
                      <th className="num col-hide-md">Tasks</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((project) => {
                      const taskCount = tasks.filter((task) => task.projectId === project.id).length
                      return (
                        <tr key={project.id}>
                          <td>
                            <span className="cell-primary">
                              <span
                                className="dot"
                                style={{ background: project.color ?? 'var(--text-subtle)' }}
                              />
                              {project.name}
                            </span>
                          </td>
                          <td>{clientName(project.clientId)}</td>
                          <td className="num col-hide-md">{taskCount}</td>
                          <td>
                            {project.archived ? (
                              <Badge variant="neutral">Archived</Badge>
                            ) : (
                              <Badge variant="success">Active</Badge>
                            )}
                          </td>
                          <td>
                            <div className="table__actions">
                              <IconButton
                                label={`Edit ${project.name}`}
                                size="sm"
                                icon={<Icon d={icons.edit} size={16} />}
                                onClick={() => openEdit(project)}
                              />
                              <IconButton
                                label={`Delete ${project.name}`}
                                size="sm"
                                icon={<Icon d={icons.trash} size={16} />}
                                disabled={loading}
                                onClick={() => void handleDelete(project)}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </TableContainer>
            </div>
          </div>
        )}
      </Section>

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit project' : 'New project'}
        description={editing ? 'Update the project details.' : 'Add a project to this workspace.'}
        onClose={closeDrawer}
      >
        <ProjectForm
          key={editing?.id ?? 'new'}
          project={editing}
          clients={clients}
          loading={loading}
          onCancel={closeDrawer}
          onSubmit={handleSave}
        />
      </Drawer>
    </>
  )
}

function ProjectForm({
  project,
  clients,
  loading,
  onSubmit,
  onCancel
}: {
  project: Project | null
  clients: Client[]
  loading: boolean
  onSubmit: (input: ProjectInput) => Promise<void>
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState(project?.name ?? '')
  const [clientId, setClientId] = useState(project?.clientId ?? '')
  const [color, setColor] = useState(project?.color ?? '#0ea5e9')
  const [archived, setArchived] = useState(project?.archived ?? false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()

    if (!name.trim()) {
      setError('Project name is required.')
      return
    }

    setError(null)
    await onSubmit({
      name: name.trim(),
      clientId: clientId || null,
      color,
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
          placeholder="Website redesign"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field label="Client">
        <Select value={clientId} onChange={(event) => setClientId(event.target.value)}>
          <option value="">No client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Colour" hint="Used in charts and project markers.">
        <Input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
      </Field>

      <Checkbox
        label="Archived"
        checked={archived}
        onChange={(event) => setArchived(event.target.checked)}
      />

      <div className="form-actions">
        <Button variant="primary" type="submit" loading={loading}>
          {project ? 'Save project' : 'Create project'}
        </Button>
        <Button variant="ghost" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
