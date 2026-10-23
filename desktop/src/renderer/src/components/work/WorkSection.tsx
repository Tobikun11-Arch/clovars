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
import { ErrorState, Skeleton, showToast } from '../ui'
import { ClientsPanel } from './ClientsPanel'
import { ProjectsPanel } from './ProjectsPanel'
import { TasksPanel } from './TasksPanel'
import { TagsPanel } from './TagsPanel'

export type WorkTab = 'clients' | 'projects' | 'tasks' | 'tags'

interface WorkSectionProps {
  tab: WorkTab
  onNavigate: (path: string) => void
}

export function WorkSection({ tab, onNavigate }: WorkSectionProps): React.JSX.Element {
  const { activeId } = useWorkspace()
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!activeId) return
    const workspaceId = activeId
    let cancelled = false

    async function load(): Promise<void> {
      setPageLoading(true)
      setLoadError(null)

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
          setLoadError(err instanceof Error ? err.message : 'Could not load workspace data')
        }
      } finally {
        if (!cancelled) setPageLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [activeId, reloadKey])

  async function run(action: (workspaceId: string) => Promise<void>): Promise<void> {
    if (!activeId) return
    setLoading(true)
    try {
      await action(activeId)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Request failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClient(input: ClientInput): Promise<void> {
    await run(async (workspaceId) => {
      const client = await createClient(workspaceId, input)
      setClients(await fetchClients(workspaceId))
      showToast(`Client "${client.name}" created.`, 'success')
    })
  }

  async function handleUpdateClient(client: Client, input: ClientInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateClient(workspaceId, client.id, input)
      setClients(await fetchClients(workspaceId))
      showToast(`Client "${input.name}" updated.`, 'success')
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
      showToast(`Client "${client.name}" deleted.`, 'success')
    })
  }

  async function handleCreateProject(input: ProjectInput): Promise<void> {
    await run(async (workspaceId) => {
      const project = await createProject(workspaceId, input)
      setProjects(await fetchProjects(workspaceId))
      showToast(`Project "${project.name}" created.`, 'success')
    })
  }

  async function handleUpdateProject(project: Project, input: ProjectInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateProject(workspaceId, project.id, input)
      setProjects(await fetchProjects(workspaceId))
      showToast(`Project "${input.name}" updated.`, 'success')
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
      showToast(`Project "${project.name}" and its tasks were deleted.`, 'success')
    })
  }

  async function handleCreateTask(input: TaskInput): Promise<void> {
    await run(async (workspaceId) => {
      const task = await createTask(workspaceId, input)
      setTasks(await fetchTasks(workspaceId))
      showToast(`Task "${task.name}" created.`, 'success')
    })
  }

  async function handleUpdateTask(task: Task, input: TaskInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateTask(workspaceId, task.id, input)
      setTasks(await fetchTasks(workspaceId))
      showToast(`Task "${input.name}" updated.`, 'success')
    })
  }

  async function handleDeleteTask(task: Task): Promise<void> {
    await run(async (workspaceId) => {
      await deleteTask(workspaceId, task.id)
      setTasks(await fetchTasks(workspaceId))
      showToast(`Task "${task.name}" deleted.`, 'success')
    })
  }

  async function handleCreateTag(input: TagInput): Promise<void> {
    await run(async (workspaceId) => {
      const tag = await createTag(workspaceId, input)
      setTags(await fetchTags(workspaceId))
      showToast(`Tag "${tag.name}" created.`, 'success')
    })
  }

  async function handleUpdateTag(tag: Tag, input: TagInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateTag(workspaceId, tag.id, input)
      setTags(await fetchTags(workspaceId))
      showToast(`Tag "${input.name}" updated.`, 'success')
    })
  }

  async function handleDeleteTag(tag: Tag): Promise<void> {
    await run(async (workspaceId) => {
      await deleteTag(workspaceId, tag.id)
      setTags(await fetchTags(workspaceId))
      showToast(`Tag "${tag.name}" deleted.`, 'success')
    })
  }

  if (loadError) {
    return (
      <ErrorState
        title="Could not load work data"
        message={loadError}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    )
  }

  if (pageLoading) {
    return (
      <div className="card">
        <div className="card__body">
          <Skeleton height={28} width="30%" />
          <Skeleton height={44} />
          <Skeleton height={44} />
          <Skeleton height={44} />
        </div>
      </div>
    )
  }

  if (tab === 'clients') {
    return (
      <ClientsPanel
        clients={clients}
        projects={projects}
        loading={loading}
        onCreate={handleCreateClient}
        onUpdate={handleUpdateClient}
        onDelete={handleDeleteClient}
      />
    )
  }

  if (tab === 'tasks') {
    return (
      <TasksPanel
        tasks={tasks}
        projects={projects}
        loading={loading}
        onCreate={handleCreateTask}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onNavigate={onNavigate}
      />
    )
  }

  if (tab === 'tags') {
    return (
      <TagsPanel
        tags={tags}
        loading={loading}
        onCreate={handleCreateTag}
        onUpdate={handleUpdateTag}
        onDelete={handleDeleteTag}
      />
    )
  }

  return (
    <ProjectsPanel
      projects={projects}
      clients={clients}
      tasks={tasks}
      loading={loading}
      onCreate={handleCreateProject}
      onUpdate={handleUpdateProject}
      onDelete={handleDeleteProject}
    />
  )
}
