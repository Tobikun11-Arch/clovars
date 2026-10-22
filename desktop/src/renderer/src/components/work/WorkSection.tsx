import { useEffect, useState } from 'react'
import { fetchWorkspaces } from '../../api/workspaces'
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
import type { Workspace } from '../../types/workspace'
import { ClientsPanel } from './ClientsPanel'
import { ProjectsPanel } from './ProjectsPanel'
import { TasksPanel } from './TasksPanel'
import { TagsPanel } from './TagsPanel'

const ACTIVE_WORKSPACE_KEY = 'clovars.activeWorkspaceId'

type WorkTab = 'clients' | 'projects' | 'tasks' | 'tags'

export function WorkSection(): React.JSX.Element {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tab, setTab] = useState<WorkTab>('projects')
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeId) ?? null

  useEffect(() => {
    let cancelled = false

    async function bootstrap(): Promise<void> {
      try {
        const list = await fetchWorkspaces()
        if (cancelled) return

        setWorkspaces(list)

        const storedId = localStorage.getItem(ACTIVE_WORKSPACE_KEY)
        const nextId =
          list.find((workspace) => workspace.id === storedId)?.id ?? list[0]?.id ?? null

        setActiveId(nextId)

        if (nextId) {
          localStorage.setItem(ACTIVE_WORKSPACE_KEY, nextId)
        } else {
          localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load workspaces')
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

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
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load workspace data')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [activeId])

  function handleSelectWorkspace(workspaceId: string): void {
    setActiveId(workspaceId)
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId)
    setError(null)
    setInfo(null)
  }

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
    await run(async (workspaceId) => {
      const client = await createClient(workspaceId, input)
      setClients(await fetchClients(workspaceId))
      setInfo(`Client "${client.name}" created.`)
    })
  }

  async function handleUpdateClient(client: Client, input: ClientInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateClient(workspaceId, client.id, input)
      setClients(await fetchClients(workspaceId))
      setInfo(`Client "${input.name}" updated.`)
    })
  }

  async function handleDeleteClient(client: Client): Promise<void> {
    await run(async (workspaceId) => {
      await deleteClient(workspaceId, client.id)
      const [nextClients, nextProjects] = await Promise.all([
        fetchClients(workspaceId),
        fetchProjects(workspaceId)
      ])
      setClients(nextClients)
      setProjects(nextProjects)
      setInfo(`Client "${client.name}" deleted. Its projects were kept.`)
    })
  }

  async function handleCreateProject(input: ProjectInput): Promise<void> {
    await run(async (workspaceId) => {
      const project = await createProject(workspaceId, input)
      setProjects(await fetchProjects(workspaceId))
      setInfo(`Project "${project.name}" created.`)
    })
  }

  async function handleUpdateProject(project: Project, input: ProjectInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateProject(workspaceId, project.id, input)
      setProjects(await fetchProjects(workspaceId))
      setInfo(`Project "${input.name}" updated.`)
    })
  }

  async function handleDeleteProject(project: Project): Promise<void> {
    await run(async (workspaceId) => {
      await deleteProject(workspaceId, project.id)
      const [nextProjects, nextTasks] = await Promise.all([
        fetchProjects(workspaceId),
        fetchTasks(workspaceId)
      ])
      setProjects(nextProjects)
      setTasks(nextTasks)
      setInfo(`Project "${project.name}" and its tasks were deleted.`)
    })
  }

  async function handleCreateTask(input: TaskInput): Promise<void> {
    await run(async (workspaceId) => {
      const task = await createTask(workspaceId, input)
      setTasks(await fetchTasks(workspaceId))
      setInfo(`Task "${task.name}" created.`)
    })
  }

  async function handleUpdateTask(task: Task, input: TaskInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateTask(workspaceId, task.id, input)
      setTasks(await fetchTasks(workspaceId))
      setInfo(`Task "${input.name}" updated.`)
    })
  }

  async function handleDeleteTask(task: Task): Promise<void> {
    await run(async (workspaceId) => {
      await deleteTask(workspaceId, task.id)
      setTasks(await fetchTasks(workspaceId))
      setInfo(`Task "${task.name}" deleted.`)
    })
  }

  async function handleCreateTag(input: TagInput): Promise<void> {
    await run(async (workspaceId) => {
      const tag = await createTag(workspaceId, input)
      setTags(await fetchTags(workspaceId))
      setInfo(`Tag "${tag.name}" created.`)
    })
  }

  async function handleUpdateTag(tag: Tag, input: TagInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateTag(workspaceId, tag.id, input)
      setTags(await fetchTags(workspaceId))
      setInfo(`Tag "${input.name}" updated.`)
    })
  }

  async function handleDeleteTag(tag: Tag): Promise<void> {
    await run(async (workspaceId) => {
      await deleteTag(workspaceId, tag.id)
      setTags(await fetchTags(workspaceId))
      setInfo(`Tag "${tag.name}" deleted.`)
    })
  }

  return (
    <section className="work-section">
      <h2>Work</h2>
      <p className="muted">Clients, projects, tasks and tags for the selected workspace.</p>

      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}

      {workspaces.length === 0 ? (
        <p className="muted">
          You are not in a workspace yet. Create one in the Workspaces tab first.
        </p>
      ) : (
        <>
          <div className="workspace-switcher">
            <label>
              Workspace
              <select
                value={activeWorkspace?.id ?? ''}
                onChange={(event) => handleSelectWorkspace(event.target.value)}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} ({workspace.role})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="tabs">
            <button
              type="button"
              className={tab === 'clients' ? 'tab active' : 'tab'}
              onClick={() => setTab('clients')}
            >
              Clients ({clients.length})
            </button>
            <button
              type="button"
              className={tab === 'projects' ? 'tab active' : 'tab'}
              onClick={() => setTab('projects')}
            >
              Projects ({projects.length})
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

          {tab === 'clients' && (
            <ClientsPanel
              clients={clients}
              loading={loading}
              onCreate={handleCreateClient}
              onUpdate={handleUpdateClient}
              onDelete={handleDeleteClient}
            />
          )}

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
        </>
      )}
    </section>
  )
}
