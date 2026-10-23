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
  if (filters.timezoneOffset !== undefined)
    params.set('timezoneOffset', String(filters.timezoneOffset))

  const query = params.toString() ? `?${params.toString()}` : ''
  return apiRequest<ReportResult>(`/api/workspaces/${workspaceId}/reports${query}`)
}

function parseFileName(response: Response, fallback: string): string {
  const disposition = response.headers.get('content-disposition') ?? ''
  const match = /filename="?([^"]+)"?/i.exec(disposition)
  return match?.[1] ?? fallback
}

async function downloadCsv(url: string, fallbackName: string): Promise<string> {
  const response = await fetch(url, {
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

  const fileName = parseFileName(response, fallbackName)
  const blob = await response.blob()
  const urlObj = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = urlObj
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(urlObj)

  return fileName
}

export async function exportReportCsv(
  workspaceId: string,
  filters: ReportFilters = {}
): Promise<string> {
  const params = new URLSearchParams()

  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.tagId) params.set('tagId', filters.tagId)
  if (filters.memberId) params.set('memberId', filters.memberId)
  if (filters.groupBy) params.set('groupBy', filters.groupBy)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.timezoneOffset !== undefined)
    params.set('timezoneOffset', String(filters.timezoneOffset))

  const query = params.toString() ? `?${params.toString()}` : ''
  const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000'

  return downloadCsv(
    `${API_URL}/api/workspaces/${workspaceId}/reports/export${query}`,
    'clovars-report.csv'
  )
}

export async function exportDetailedReportCsv(
  workspaceId: string,
  filters: ReportFilters = {}
): Promise<string> {
  const params = new URLSearchParams()

  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.tagId) params.set('tagId', filters.tagId)
  if (filters.memberId) params.set('memberId', filters.memberId)
  if (filters.groupBy) params.set('groupBy', filters.groupBy)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.timezoneOffset !== undefined)
    params.set('timezoneOffset', String(filters.timezoneOffset))

  const query = params.toString() ? `?${params.toString()}` : ''
  const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000'

  return downloadCsv(
    `${API_URL}/api/workspaces/${workspaceId}/reports/export/detailed${query}`,
    'clovars-report-detailed.csv'
  )
}
