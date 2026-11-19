import { fetchClients, fetchProjects, fetchTags, fetchTasks } from '../api/work'
import { fetchMembers } from '../api/workspaces'
import { fetchQuery, invalidateQueries, useQuery, type QueryResult } from '../lib/queryCache'
import type { Client, Project, Tag, Task } from '../types/work'
import type { WorkspaceMember } from '../types/workspace'

/**
 * Shared, cached workspace data. Every page reads the same cache, so moving
 * between Time, Reports, Dashboard and Work does not reload these lists.
 */

export const workspaceKeys = {
  projects: (ws: string) => `ws:${ws}:projects`,
  tasks: (ws: string) => `ws:${ws}:tasks`,
  tags: (ws: string) => `ws:${ws}:tags`,
  clients: (ws: string) => `ws:${ws}:clients`,
  members: (ws: string) => `ws:${ws}:members`,
  /** Prefix for anything derived from time entries (lists, dashboard, reports). */
  entries: (ws: string) => `ws:${ws}:entries`
}

export function useProjects(ws: string | null): QueryResult<Project[]> {
  return useQuery(ws ? workspaceKeys.projects(ws) : null, () => fetchProjects(ws!))
}

export function useTasks(ws: string | null): QueryResult<Task[]> {
  return useQuery(ws ? workspaceKeys.tasks(ws) : null, () => fetchTasks(ws!))
}

export function useTags(ws: string | null): QueryResult<Tag[]> {
  return useQuery(ws ? workspaceKeys.tags(ws) : null, () => fetchTags(ws!))
}

export function useClients(ws: string | null): QueryResult<Client[]> {
  return useQuery(ws ? workspaceKeys.clients(ws) : null, () => fetchClients(ws!))
}

export function useMembers(ws: string | null, enabled = true): QueryResult<WorkspaceMember[]> {
  return useQuery(ws && enabled ? workspaceKeys.members(ws) : null, () => fetchMembers(ws!))
}

/** Reload lists after a write, so every page sees the change. */
export const reloadWorkspaceData = {
  projects: (ws: string) => fetchQuery(workspaceKeys.projects(ws), () => fetchProjects(ws), true),
  tasks: (ws: string) => fetchQuery(workspaceKeys.tasks(ws), () => fetchTasks(ws), true),
  tags: (ws: string) => fetchQuery(workspaceKeys.tags(ws), () => fetchTags(ws), true),
  clients: (ws: string) => fetchQuery(workspaceKeys.clients(ws), () => fetchClients(ws), true),
  members: (ws: string) => fetchQuery(workspaceKeys.members(ws), () => fetchMembers(ws), true)
}

/**
 * Time entries carry project, task and tag names, so renaming or deleting one
 * of those makes cached entries and reports out of date.
 */
export function invalidateEntries(ws: string): void {
  invalidateQueries(workspaceKeys.entries(ws))
}
