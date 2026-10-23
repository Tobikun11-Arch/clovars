export type ReportGroupBy = 'project' | 'member' | 'date'

export interface ReportGroup {
  key: string
  label: string
  totalSeconds: number
  count: number
}

export interface ReportResult {
  groupBy: ReportGroupBy
  totalSeconds: number
  totalCount: number
  groups: ReportGroup[]
}

export interface ReportFilters {
  from?: string
  to?: string
  projectId?: string
  tagId?: string
  memberId?: string
  groupBy?: ReportGroupBy
  limit?: number
}
