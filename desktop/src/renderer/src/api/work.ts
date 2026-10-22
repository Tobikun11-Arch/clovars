import { apiRequest } from './client'
import type {
  Client,
  ClientInput,
  Project,
  ProjectInput,
  Tag,
  TagInput,
  Task,
  TaskInput
} from '../types/work'

export async function fetchClients(workspaceId: string): Promise<Client[]> {
  const response = await apiRequest<{ clients: Client[] }>(`/api/workspaces/${workspaceId}/clients`)
  return response.clients
}

export async function createClient(workspaceId: string, input: ClientInput): Promise<Client> {
  const response = await apiRequest<{ client: Client }>(`/api/workspaces/${workspaceId}/clients`, {
    method: 'POST',
    body: JSON.stringify(input)
  })
  return response.client
}

export async function updateClient(
  workspaceId: string,
  clientId: string,
  input: Partial<ClientInput>
): Promise<Client> {
  const response = await apiRequest<{ client: Client }>(
    `/api/workspaces/${workspaceId}/clients/${clientId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input)
    }
  )
  return response.client
}

export async function deleteClient(workspaceId: string, clientId: string): Promise<void> {
  await apiRequest(`/api/workspaces/${workspaceId}/clients/${clientId}`, {
    method: 'DELETE'
  })
}

export async function fetchProjects(workspaceId: string, clientId?: string): Promise<Project[]> {
  const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''
  const response = await apiRequest<{ projects: Project[] }>(
    `/api/workspaces/${workspaceId}/projects${query}`
  )
  return response.projects
}

export async function createProject(workspaceId: string, input: ProjectInput): Promise<Project> {
  const response = await apiRequest<{ project: Project }>(
    `/api/workspaces/${workspaceId}/projects`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  )
  return response.project
}

export async function updateProject(
  workspaceId: string,
  projectId: string,
  input: Partial<ProjectInput>
): Promise<Project> {
  const response = await apiRequest<{ project: Project }>(
    `/api/workspaces/${workspaceId}/projects/${projectId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input)
    }
  )
  return response.project
}

export async function deleteProject(workspaceId: string, projectId: string): Promise<void> {
  await apiRequest(`/api/workspaces/${workspaceId}/projects/${projectId}`, {
    method: 'DELETE'
  })
}

export async function fetchTasks(workspaceId: string, projectId?: string): Promise<Task[]> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
  const response = await apiRequest<{ tasks: Task[] }>(
    `/api/workspaces/${workspaceId}/tasks${query}`
  )
  return response.tasks
}

export async function createTask(workspaceId: string, input: TaskInput): Promise<Task> {
  const response = await apiRequest<{ task: Task }>(`/api/workspaces/${workspaceId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(input)
  })
  return response.task
}

export async function updateTask(
  workspaceId: string,
  taskId: string,
  input: Partial<TaskInput>
): Promise<Task> {
  const response = await apiRequest<{ task: Task }>(
    `/api/workspaces/${workspaceId}/tasks/${taskId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input)
    }
  )
  return response.task
}

export async function deleteTask(workspaceId: string, taskId: string): Promise<void> {
  await apiRequest(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
    method: 'DELETE'
  })
}

export async function fetchTags(workspaceId: string): Promise<Tag[]> {
  const response = await apiRequest<{ tags: Tag[] }>(`/api/workspaces/${workspaceId}/tags`)
  return response.tags
}

export async function createTag(workspaceId: string, input: TagInput): Promise<Tag> {
  const response = await apiRequest<{ tag: Tag }>(`/api/workspaces/${workspaceId}/tags`, {
    method: 'POST',
    body: JSON.stringify(input)
  })
  return response.tag
}

export async function updateTag(
  workspaceId: string,
  tagId: string,
  input: Partial<TagInput>
): Promise<Tag> {
  const response = await apiRequest<{ tag: Tag }>(`/api/workspaces/${workspaceId}/tags/${tagId}`, {
    method: 'PUT',
    body: JSON.stringify(input)
  })
  return response.tag
}

export async function deleteTag(workspaceId: string, tagId: string): Promise<void> {
  await apiRequest(`/api/workspaces/${workspaceId}/tags/${tagId}`, {
    method: 'DELETE'
  })
}
