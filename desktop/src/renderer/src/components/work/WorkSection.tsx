import { useState } from 'react'
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
import {
  invalidateEntries,
  reloadWorkspaceData as reload,
  useClients,
  useProjects,
  useTags,
  useTasks
} from '../../hooks/useWorkspaceData'
import { ErrorState, Skeleton, showToast } from '../ui'
import { ClientsPanel } from './ClientsPanel'
import { ProjectsPanel } from './ProjectsPanel'
import { TasksPanel } from './TasksPanel'
import { TagsPanel } from './TagsPanel'

const EMPTY_LIST: never[] = []

export type WorkTab = 'clients' | 'projects' | 'tasks' | 'tags'

interface WorkSectionProps {
  tab: WorkTab
  onNavigate: (path: string) => void
}

export function WorkSection({ tab, onNavigate }: WorkSectionProps): React.JSX.Element {
  const { activeId } = useWorkspace()
  // Shared caches: other pages see changes made here, and coming back here
  // shows the lists at once while they refresh in the background.
  const queries = [useClients(activeId), useProjects(activeId), useTasks(activeId), useTags(activeId)] as const
  const [clientsQuery, projectsQuery, tasksQuery, tagsQuery] = queries
  const clients: Client[] = clientsQuery.data ?? EMPTY_LIST
  const projects: Project[] = projectsQuery.data ?? EMPTY_LIST
  const tasks: Task[] = tasksQuery.data ?? EMPTY_LIST
  const tags: Tag[] = tagsQuery.data ?? EMPTY_LIST
  const [loading, setLoading] = useState(false)
  const pageLoading = queries.some((query) => query.loading)
  const loadError = queries.find((query) => !query.data && query.error)?.error ?? null

  function retry(): void {
    for (const query of queries) {
      if (!query.data) query.refresh().catch(() => {})
    }
  }

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
      await reload.clients(workspaceId)
      showToast(`Client "${client.name}" created.`, 'success')
    })
  }

  async function handleUpdateClient(client: Client, input: ClientInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateClient(workspaceId, client.id, input)
      await reload.clients(workspaceId)
      showToast(`Client "${input.name}" updated.`, 'success')
    })
  }

  async function handleDeleteClient(client: Client): Promise<void> {
    await run(async (workspaceId) => {
      await deleteClient(workspaceId, client.id)
      await Promise.all([reload.clients(workspaceId), reload.projects(workspaceId)])
      showToast(`Client "${client.name}" deleted.`, 'success')
    })
  }

  async function handleCreateProject(input: ProjectInput): Promise<void> {
    await run(async (workspaceId) => {
      const project = await createProject(workspaceId, input)
      await reload.projects(workspaceId)
      showToast(`Project "${project.name}" created.`, 'success')
    })
  }

  async function handleUpdateProject(project: Project, input: ProjectInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateProject(workspaceId, project.id, input)
      invalidateEntries(workspaceId)
      await reload.projects(workspaceId)
      showToast(`Project "${input.name}" updated.`, 'success')
    })
  }

  async function handleDeleteProject(project: Project): Promise<void> {
    await run(async (workspaceId) => {
      await deleteProject(workspaceId, project.id)
      invalidateEntries(workspaceId)
      await Promise.all([reload.projects(workspaceId), reload.tasks(workspaceId)])
      showToast(`Project "${project.name}" and its tasks were deleted.`, 'success')
    })
  }

  async function handleCreateTask(input: TaskInput): Promise<void> {
    await run(async (workspaceId) => {
      const task = await createTask(workspaceId, input)
      await reload.tasks(workspaceId)
      showToast(`Task "${task.name}" created.`, 'success')
    })
  }

  async function handleUpdateTask(task: Task, input: TaskInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateTask(workspaceId, task.id, input)
      invalidateEntries(workspaceId)
      await reload.tasks(workspaceId)
      showToast(`Task "${input.name}" updated.`, 'success')
    })
  }

  async function handleDeleteTask(task: Task): Promise<void> {
    await run(async (workspaceId) => {
      await deleteTask(workspaceId, task.id)
      invalidateEntries(workspaceId)
      await reload.tasks(workspaceId)
      showToast(`Task "${task.name}" deleted.`, 'success')
    })
  }

  async function handleCreateTag(input: TagInput): Promise<void> {
    await run(async (workspaceId) => {
      const tag = await createTag(workspaceId, input)
      await reload.tags(workspaceId)
      showToast(`Tag "${tag.name}" created.`, 'success')
    })
  }

  async function handleUpdateTag(tag: Tag, input: TagInput): Promise<void> {
    await run(async (workspaceId) => {
      await updateTag(workspaceId, tag.id, input)
      invalidateEntries(workspaceId)
      await reload.tags(workspaceId)
      showToast(`Tag "${input.name}" updated.`, 'success')
    })
  }

  async function handleDeleteTag(tag: Tag): Promise<void> {
    await run(async (workspaceId) => {
      await deleteTag(workspaceId, tag.id)
      invalidateEntries(workspaceId)
      await reload.tags(workspaceId)
      showToast(`Tag "${tag.name}" deleted.`, 'success')
    })
  }

  if (loadError) {
    return (
      <ErrorState
        title="Could not load work data"
        message={loadError}
        onRetry={retry}
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
