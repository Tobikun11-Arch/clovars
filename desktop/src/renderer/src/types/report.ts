export type ReportGroupBy = 'project' | 'member' | 'date'

export interface ReportGroup {
  key: string
  label: string
  totalSeconds: number
  count: number
  date: string | null
  endDate: string | null
}

export interface ReportResult {
  groupBy: ReportGroupBy
  totalSeconds: number
  totalCount: number
  groups: ReportGroup[]
  from: string | null
  to: string | null
  fromDate: string | null
  toDate: string | null
  startDate: string | null
  endDate: string | null
  filters: { from: string | null; to: string | null }
  dateRange: { from: string | null; to: string | null }
  generatedAt: string
  generatedDate: string
  reportDate: string
  date: string
  workspaceName: string
  memberLabel: string
  projectLabel: string
  tagLabel: string
  dateFrom: string
  dateTo: string
  reportGenerated: string
  groupByLabel: string
}

export interface ReportFilters {
  from?: string
  to?: string
  projectId?: string
  tagId?: string
  memberId?: string
  groupBy?: ReportGroupBy
  limit?: number
  timezoneOffset?: number
}
