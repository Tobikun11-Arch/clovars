import type { Tag } from './work'

export interface TimeEntry {
  id: string
  workspaceId: string
  projectId: string | null
  taskId: string | null
  tagIds: string[]
  description: string | null
  startTime: string
  endTime: string | null
  durationSeconds: number
  elapsedSeconds?: number
  isRunning: boolean
  isPaused: boolean
  pausedAt?: string | null
  lastResumedAt?: string | null
  projectName: string | null
  taskName: string | null
  tags: Tag[]
  workspaceName?: string | null
}

export interface TimeEntryLinksInput {
  projectId?: string | null
  taskId?: string | null
  tagIds?: string[]
  description?: string | null
}

export interface ManualTimeEntryInput extends TimeEntryLinksInput {
  startTime: string
  endTime: string
}

export interface UpdateTimeEntryInput extends TimeEntryLinksInput {
  startTime?: string
  endTime?: string
}

export interface StartTimerInput extends TimeEntryLinksInput {
  startTime?: string
}

export interface TimeEntryFilters {
  from?: string
  to?: string
  projectId?: string
  taskId?: string
  limit?: number
}
