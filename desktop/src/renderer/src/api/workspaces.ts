import { apiRequest } from './client'
import type { Invite, Workspace, WorkspaceMember } from '../types/workspace'

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const response = await apiRequest<{ workspaces: Workspace[] }>('/api/workspaces')
  return response.workspaces
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const response = await apiRequest<{ workspace: Workspace }>('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name })
  })
  return response.workspace
}

export async function updateWorkspace(workspaceId: string, name: string): Promise<Workspace> {
  const response = await apiRequest<{ workspace: Workspace }>(`/api/workspaces/${workspaceId}`, {
    method: 'PUT',
    body: JSON.stringify({ name })
  })
  return response.workspace
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await apiRequest(`/api/workspaces/${workspaceId}`, { method: 'DELETE' })
}

export async function fetchMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const response = await apiRequest<{ members: WorkspaceMember[] }>(
    `/api/workspaces/${workspaceId}/members`
  )
  return response.members
}

export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  role: 'admin' | 'member'
): Promise<WorkspaceMember> {
  const response = await apiRequest<{ member: WorkspaceMember }>(
    `/api/workspaces/${workspaceId}/members/${memberId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ role })
    }
  )
  return response.member
}

export async function removeMember(workspaceId: string, memberId: string): Promise<void> {
  await apiRequest(`/api/workspaces/${workspaceId}/members/${memberId}`, {
    method: 'DELETE'
  })
}

export async function fetchInvites(workspaceId: string): Promise<Invite[]> {
  const response = await apiRequest<{ invites: Invite[] }>(`/api/workspaces/${workspaceId}/invites`)
  return response.invites
}

export async function createInvite(
  workspaceId: string,
  email: string | undefined,
  role: 'admin' | 'member'
): Promise<Invite> {
  const response = await apiRequest<{ invite: Invite }>(`/api/workspaces/${workspaceId}/invites`, {
    method: 'POST',
    body: JSON.stringify({ email: email ? email : undefined, role })
  })
  return response.invite
}

export async function revokeInvite(workspaceId: string, inviteId: string): Promise<void> {
  await apiRequest(`/api/workspaces/${workspaceId}/invites/${inviteId}`, {
    method: 'DELETE'
  })
}

export async function fetchMyInvites(): Promise<Invite[]> {
  const response = await apiRequest<{ invites: Invite[] }>('/api/invites/mine')
  return response.invites
}

export async function acceptInvite(code: string): Promise<Workspace> {
  const response = await apiRequest<{ workspace: Workspace }>('/api/invites/accept', {
    method: 'POST',
    body: JSON.stringify({ code })
  })
  return response.workspace
}
