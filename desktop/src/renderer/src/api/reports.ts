import { apiRequest } from './client'
import type { ReportFilters, ReportResult } from '../types/report'

export async function fetchReport(
  workspaceId: string,
  filters: ReportFilters = {}
): Promise<ReportResult> {
  const params = new URLSearchParams()

  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.tagId) params.set('tagId', filters.tagId)
  if (filters.memberId) params.set('memberId', filters.memberId)
  if (filters.groupBy) params.set('groupBy', filters.groupBy)
  if (filters.limit) params.set('limit', String(filters.limit))

  const query = params.toString() ? `?${params.toString()}` : ''
  return apiRequest<ReportResult>(`/api/workspaces/${workspaceId}/reports${query}`)
}

export async function exportReportCsv(
  workspaceId: string,
  filters: ReportFilters = {}
): Promise<void> {
  const params = new URLSearchParams()

  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.tagId) params.set('tagId', filters.tagId)
  if (filters.memberId) params.set('memberId', filters.memberId)
  if (filters.groupBy) params.set('groupBy', filters.groupBy)
  if (filters.limit) params.set('limit', String(filters.limit))

  const query = params.toString() ? `?${params.toString()}` : ''
  const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000'

  const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/reports/export${query}`, {
    method: 'GET',
    credentials: 'include'
  })

  if (!response.ok) {
    let message = `Export failed (${response.status})`
    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'clovars-report.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
