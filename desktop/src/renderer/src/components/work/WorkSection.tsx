import { useEffect, useState } from 'react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import {
  createClient,
  createProject,
  createTag,
  createTask,
  deleteClient,
  deleteProject,
  deleteTag,
  deleteTask,
  fetchClients,
  fetchProjects,
  fetchTags,
  fetchTasks,
  updateClient,
  updateProject,
  updateTag,
  updateTask
} from '../../api/work'
import type {
  Client,
  ClientInput,
  Project,
  ProjectInput,
  Tag,
  TagInput,
  Task,
  TaskInput
} from '../../types/work'
import { ClientsPanel } from './ClientsPanel'
import { ProjectsPanel } from './ProjectsPanel'
import { TasksPanel } from './TasksPanel'
import { TagsPanel } from './TagsPanel'

export type WorkTab = 'clients' | 'projects' | 'tasks' | 'tags'

interface WorkSectionProps {
  initialTab?: WorkTab
}

export function WorkSection({ initialTab }: WorkSectionProps): React.JSX.Element {
  const { activeId, activeWorkspace } = useWorkspace()
  const [tab, setTab] = useState<WorkTab>(initialTab ?? 'projects')
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!initialTab) return
    const t = setTimeout(() => setTab(initialTab), 0)
    return () => clearTimeout(t)
  }, [initialTab])

  useEffect(() => {
    if (!activeId) return
    const workspaceId = activeId
    let cancelled = false
    async function load(): Promise<void> {
      try {
        const [nextClients, nextProjects, nextTasks, nextTags] = await Promise.all([
          fetchClients(workspaceId),
          fetchProjects(workspaceId),
          fetchTasks(workspaceId),
          fetchTags(workspaceId)
        ])
        if (cancelled) return
        setClients(nextClients)
        setProjects(nextProjects)
        setTasks(nextTasks)
        setTags(nextTags)
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Could not load workspace data')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [activeId])

  async function run(action: (workspaceId: string) => Promise<void>): Promise<void> {
    if (!activeId) return
    setLoading(true)
    setError(null)
    try {
      await action(activeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClient(input: ClientInput): Promise<void> {
    await run(async (ws) => {
      const c = await createClient(ws, input)
      setClients(await fetchClients(ws))
      setInfo(`Client "${c.name}" created.`)
    })
  }
  async function handleUpdateClient(client: Client, input: ClientInput): Promise<void> {
    await run(async (ws) => {
      await updateClient(ws, client.id, input)
      setClients(await fetchClients(ws))
      setInfo(`Client "${input.name}" updated.`)
    })
  }
  async function handleDeleteClient(client: Client): Promise<void> {
    await run(async (ws) => {
      await deleteClient(ws, client.id)
      const [nc, np] = await Promise.all([fetchClients(ws), fetchProjects(ws)])
      setClients(nc)
      setProjects(np)
      setInfo(`Client "${client.name}" deleted.`)
    })
  }
  async function handleCreateProject(input: ProjectInput): Promise<void> {
    await run(async (ws) => {
      const p = await createProject(ws, input)
      setProjects(await fetchProjects(ws))
      setInfo(`Project "${p.name}" created.`)
    })
  }
  async function handleUpdateProject(project: Project, input: ProjectInput): Promise<void> {
    await run(async (ws) => {
      await updateProject(ws, project.id, input)
      setProjects(await fetchProjects(ws))
      setInfo(`Project "${input.name}" updated.`)
    })
  }
  async function handleDeleteProject(project: Project): Promise<void> {
    await run(async (ws) => {
      await deleteProject(ws, project.id)
      const [np, nt] = await Promise.all([fetchProjects(ws), fetchTasks(ws)])
      setProjects(np)
      setTasks(nt)
      setInfo(`Project "${project.name}" and its tasks were deleted.`)
    })
  }
  async function handleCreateTask(input: TaskInput): Promise<void> {
    await run(async (ws) => {
      const t = await createTask(ws, input)
      setTasks(await fetchTasks(ws))
      setInfo(`Task "${t.name}" created.`)
    })
  }
  async function handleUpdateTask(task: Task, input: TaskInput): Promise<void> {
    await run(async (ws) => {
      await updateTask(ws, task.id, input)
      setTasks(await fetchTasks(ws))
      setInfo(`Task "${input.name}" updated.`)
    })
  }
  async function handleDeleteTask(task: Task): Promise<void> {
    await run(async (ws) => {
      await deleteTask(ws, task.id)
      setTasks(await fetchTasks(ws))
      setInfo(`Task "${task.name}" deleted.`)
    })
  }
  async function handleCreateTag(input: TagInput): Promise<void> {
    await run(async (ws) => {
      const t = await createTag(ws, input)
      setTags(await fetchTags(ws))
      setInfo(`Tag "${t.name}" created.`)
    })
  }
  async function handleUpdateTag(tag: Tag, input: TagInput): Promise<void> {
    await run(async (ws) => {
      await updateTag(ws, tag.id, input)
      setInfo(`Tag "${input.name}" updated.`)
      setTags(await fetchTags(ws))
    })
  }
  async function handleDeleteTag(tag: Tag): Promise<void> {
    await run(async (ws) => {
      await deleteTag(ws, tag.id)
      setTags(await fetchTags(ws))
      setInfo(`Tag "${tag.name}" deleted.`)
    })
  }

  if (!activeId) {
    return (
      <section className="work-section">
        <h2>Work</h2>
        <p className="muted">You are not in a workspace yet. Create one in Team.</p>
      </section>
    )
  }

  return (
    <section className="work-section">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Work</h1>
          <p>Manage clients, projects, tasks and tags for {activeWorkspace?.name}.</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}
      <div className="tabs">
        <button
          type="button"
          className={tab === 'projects' ? 'tab active' : 'tab'}
          onClick={() => setTab('projects')}
        >
          Projects ({projects.length})
        </button>
        <button
          type="button"
          className={tab === 'clients' ? 'tab active' : 'tab'}
          onClick={() => setTab('clients')}
        >
          Clients ({clients.length})
        </button>
        <button
          type="button"
          className={tab === 'tasks' ? 'tab active' : 'tab'}
          onClick={() => setTab('tasks')}
        >
          Tasks ({tasks.length})
        </button>
        <button
          type="button"
          className={tab === 'tags' ? 'tab active' : 'tab'}
          onClick={() => setTab('tags')}
        >
          Tags ({tags.length})
        </button>
      </div>
      {tab === 'projects' && (
        <ProjectsPanel
          projects={projects}
          clients={clients}
          loading={loading}
          onCreate={handleCreateProject}
          onUpdate={handleUpdateProject}
          onDelete={handleDeleteProject}
        />
      )}
      {tab === 'clients' && (
        <ClientsPanel
          clients={clients}
          loading={loading}
          onCreate={handleCreateClient}
          onUpdate={handleUpdateClient}
          onDelete={handleDeleteClient}
        />
      )}
      {tab === 'tasks' && (
        <TasksPanel
          tasks={tasks}
          projects={projects}
          loading={loading}
          onCreate={handleCreateTask}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
      {tab === 'tags' && (
        <TagsPanel
          tags={tags}
          loading={loading}
          onCreate={handleCreateTag}
          onUpdate={handleUpdateTag}
          onDelete={handleDeleteTag}
        />
      )}
    </section>
  )
}
