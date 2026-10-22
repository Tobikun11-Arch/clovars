export interface Client {
  id: string
  workspaceId?: string
  name: string
  notes: string | null
  color: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ClientInput {
  name: string
  notes?: string | null
  color?: string | null
}

export interface Project {
  id: string
  workspaceId?: string
  clientId: string | null
  name: string
  color: string | null
  archived: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ProjectInput {
  name: string
  clientId?: string | null
  color?: string | null
  archived?: boolean
}

export interface Task {
  id: string
  workspaceId?: string
  projectId: string
  name: string
  description: string | null
  archived: boolean
  createdAt?: string
  updatedAt?: string
}

export interface TaskInput {
  name: string
  projectId: string
  description?: string | null
  archived?: boolean
}

export interface Tag {
  id: string
  workspaceId?: string
  name: string
  color: string
  createdAt?: string
  updatedAt?: string
}

export interface TagInput {
  name: string
  color?: string
}
