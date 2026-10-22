export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface Workspace {
  id: string
  name: string
  ownerId?: string
  role: WorkspaceRole
  createdAt?: string
}

export interface WorkspaceMember {
  id: string
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  role: WorkspaceRole
  joinedAt?: string
}

export interface Invite {
  id: string
  workspaceId?: string
  workspaceName?: string
  email: string | null
  code: string
  role: 'admin' | 'member'
  status: 'pending' | 'accepted' | 'revoked'
  expiresAt?: string
  createdAt?: string
  emailSent?: boolean
}
