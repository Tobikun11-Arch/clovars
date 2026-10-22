import { apiRequest } from './client'
import type {
  ManualTimeEntryInput,
  StartTimerInput,
  TimeEntry,
  TimeEntryFilters,
  UpdateTimeEntryInput
} from '../types/time'

export async function fetchTimeEntries(
  workspaceId: string,
  filters: TimeEntryFilters = {}
): Promise<TimeEntry[]> {
  const params = new URLSearchParams()

  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.taskId) params.set('taskId', filters.taskId)
  if (filters.limit) params.set('limit', String(filters.limit))

  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await apiRequest<{ entries: TimeEntry[] }>(
    `/api/workspaces/${workspaceId}/time-entries${query}`
  )

  return response.entries
}

export async function fetchRunningTimeEntry(workspaceId: string): Promise<TimeEntry | null> {
  const response = await apiRequest<{ entry: TimeEntry | null }>(
    `/api/workspaces/${workspaceId}/time-entries/running`
  )

  return response.entry
}

export async function fetchGlobalRunningTimeEntry(): Promise<TimeEntry | null> {
  const response = await apiRequest<{ entry: TimeEntry | null }>('/api/time/running')
  return response.entry
}

export async function createManualTimeEntry(
  workspaceId: string,
  input: ManualTimeEntryInput
): Promise<TimeEntry> {
  const response = await apiRequest<{ entry: TimeEntry }>(
    `/api/workspaces/${workspaceId}/time-entries`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  )

  return response.entry
}

export async function updateTimeEntry(
  workspaceId: string,
  entryId: string,
  input: UpdateTimeEntryInput
): Promise<TimeEntry> {
  const response = await apiRequest<{ entry: TimeEntry }>(
    `/api/workspaces/${workspaceId}/time-entries/${entryId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input)
    }
  )

  return response.entry
}

export async function deleteTimeEntry(workspaceId: string, entryId: string): Promise<void> {
  await apiRequest(`/api/workspaces/${workspaceId}/time-entries/${entryId}`, {
    method: 'DELETE'
  })
}

export async function startTimer(workspaceId: string, input: StartTimerInput): Promise<TimeEntry> {
  const response = await apiRequest<{ entry: TimeEntry }>(
    `/api/workspaces/${workspaceId}/time-entries/start`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  )

  return response.entry
}

export async function stopTimer(workspaceId: string): Promise<TimeEntry> {
  const response = await apiRequest<{ entry: TimeEntry }>(
    `/api/workspaces/${workspaceId}/time-entries/stop`,
    {
      method: 'POST',
      body: JSON.stringify({})
    }
  )

  return response.entry
}

export async function pauseTimer(workspaceId: string): Promise<TimeEntry> {
  const response = await apiRequest<{ entry: TimeEntry }>(
    `/api/workspaces/${workspaceId}/time-entries/pause`,
    {
      method: 'POST',
      body: JSON.stringify({})
    }
  )

  return response.entry
}

export async function resumeTimer(workspaceId: string): Promise<TimeEntry> {
  const response = await apiRequest<{ entry: TimeEntry }>(
    `/api/workspaces/${workspaceId}/time-entries/resume`,
    {
      method: 'POST',
      body: JSON.stringify({})
    }
  )

  return response.entry
}
