import { useState } from 'react'
import type { Client, Project, ProjectInput } from '../../types/work'

interface ProjectsPanelProps {
  projects: Project[]
  clients: Client[]
  loading: boolean
  onCreate: (input: ProjectInput) => void | Promise<void>
  onUpdate: (project: Project, input: ProjectInput) => void | Promise<void>
  onDelete: (project: Project) => void | Promise<void>
}

export function ProjectsPanel({
  projects,
  clients,
  loading,
  onCreate,
  onUpdate,
  onDelete
}: ProjectsPanelProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [color, setColor] = useState('#4fc3f7')
  const [archived, setArchived] = useState(false)
  const [filterClientId, setFilterClientId] = useState('')

  function resetForm(): void {
    setEditingId(null)
    setName('')
    setClientId('')
    setColor('#4fc3f7')
    setArchived(false)
  }

  function startEdit(project: Project): void {
    setEditingId(project.id)
    setName(project.name)
    setClientId(project.clientId ?? '')
    setColor(project.color ?? '#4fc3f7')
    setArchived(project.archived)
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const input: ProjectInput = {
      name: name.trim(),
      clientId: clientId || null,
      color,
      archived
    }

    const editing = projects.find((project) => project.id === editingId)

    if (editing) {
      await onUpdate(editing, input)
    } else {
      await onCreate(input)
    }

    resetForm()
  }

  const visibleProjects = filterClientId
    ? projects.filter((project) => project.clientId === filterClientId)
    : projects

  function clientName(projectClientId: string | null): string {
    if (!projectClientId) return 'No client'
    return clients.find((client) => client.id === projectClientId)?.name ?? 'Unknown client'
  }

  return (
    <section className="work-panel">
      <h3>Projects</h3>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Website redesign"
            required
          />
        </label>
        <label>
          Client (optional)
          <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
            <option value="">No client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-label">
          Color
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
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
            {loading ? 'Saving...' : editingId ? 'Save project' : 'Add project'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <label className="filter-label">
        Filter by client
        <select value={filterClientId} onChange={(event) => setFilterClientId(event.target.value)}>
          <option value="">All clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>

      {visibleProjects.length === 0 ? (
        <p className="muted">No projects yet.</p>
      ) : (
        <ul className="work-list">
          {visibleProjects.map((project) => (
            <li key={project.id}>
              <span className="color-dot" style={{ backgroundColor: project.color ?? '#6b7280' }} />
              <span className="work-name">{project.name}</span>
              <span className="muted">{clientName(project.clientId)}</span>
              {project.archived && <span className="role-badge">archived</span>}
              <span className="row-actions">
                <button type="button" disabled={loading} onClick={() => startEdit(project)}>
                  Edit
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (window.confirm(`Delete project "${project.name}" and its tasks?`)) {
                      void onDelete(project)
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
