import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { fetchReport, exportReportCsv, exportDetailedReportCsv } from '../../api/reports'
import { fetchQuery, isQueryFresh, peekQuery } from '../../lib/queryCache'
import { useMembers, useProjects, useTags, workspaceKeys } from '../../hooks/useWorkspaceData'
import type { ReportFilters, ReportGroupBy, ReportResult } from '../../types/report'
import { formatDuration, formatDurationShort, formatShortDate } from '../../utils/time'
import {
  Avatar,
  BarChart,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Section,
  Select,
  Spinner,
  StatCard,
  TableContainer,
  showToast
} from '../ui'
import { Icon, icons } from '../icons'

const EMPTY_LIST: never[] = []

type Preset = 'today' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'all-time'

const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This week' },
  { value: 'last-week', label: 'Last week' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'all-time', label: 'All time' }
]

function toDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfWeek(date: Date, weekStartsOn: number): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - ((day - weekStartsOn + 7) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

function presetRange(preset: Preset, weekStartsOn: number): { from: string; to: string } {
  const today = new Date()
  const weekStart = startOfWeek(today, weekStartsOn)

  if (preset === 'today') {
    return { from: toDateInput(today), to: toDateInput(today) }
  }

  if (preset === 'this-week') {
    return { from: toDateInput(weekStart), to: toDateInput(today) }
  }

  if (preset === 'last-week') {
    const start = new Date(weekStart)
    start.setDate(start.getDate() - 7)
    const end = new Date(weekStart)
    end.setDate(end.getDate() - 1)
    return { from: toDateInput(start), to: toDateInput(end) }
  }

  if (preset === 'this-month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: toDateInput(start), to: toDateInput(today) }
  }

  if (preset === 'last-month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const end = new Date(today.getFullYear(), today.getMonth(), 0)
    return { from: toDateInput(start), to: toDateInput(end) }
  }

  return { from: '', to: '' }
}

export function ReportsSection(): React.JSX.Element {
  const { activeId, activeWorkspace } = useWorkspace()
  // Filter options come from the shared cache, so they are there at once when
  // coming back to this page and refresh in the background.
  const projectsQuery = useProjects(activeId)
  const tagsQuery = useTags(activeId)
  const membersQuery = useMembers(activeId)
  const projects = projectsQuery.data ?? EMPTY_LIST
  const tags = tagsQuery.data ?? EMPTY_LIST
  const members = membersQuery.data ?? EMPTY_LIST
  const avatarByUserId = useMemo(
    () => new Map(members.map((member) => [member.userId, member.avatarUrl])),
    [members]
  )
  const optionsError = [projectsQuery, tagsQuery, membersQuery].some(
    (query) => !query.data && query.error
  )
  const reportRequest = useRef(0)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [projectId, setProjectId] = useState('')
  const [tagId, setTagId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('date')
  const [activePreset, setActivePreset] = useState<Preset | null>('today')

  const [report, setReport] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportingSummary, setExportingSummary] = useState(false)
  const [exportingDetailed, setExportingDetailed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = activeWorkspace?.role === 'admin' || activeWorkspace?.role === 'owner'

  // Load today's report automatically so the page never starts blank.
  useEffect(() => {
    if (!activeId) return
    const workspaceId = activeId
    const handle = window.setTimeout(() => {
      const weekStartsOn = localStorage.getItem('clovars.weekStart') === 'sunday' ? 0 : 1
      const range = presetRange('today', weekStartsOn)
      setFrom(range.from)
      setTo(range.to)
      setProjectId('')
      setTagId('')
      setMemberId('')
      setGroupBy('date')
      setActivePreset('today')
      void loadReport(workspaceId, range, true, true)
    }, 0)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  function buildFilters(
    overrides: { from?: string; to?: string } = {},
    resetFilters = false
  ): ReportFilters {
    const nextFrom = overrides.from ?? from
    const nextTo = overrides.to ?? to
    const nextGroupBy = resetFilters ? 'date' : groupBy
    const filters: ReportFilters = {
      groupBy: nextGroupBy,
      timezoneOffset: new Date().getTimezoneOffset()
    }
    if (nextFrom) filters.from = nextFrom
    if (nextTo) filters.to = nextTo
    if (!resetFilters && projectId) filters.projectId = projectId
    if (!resetFilters && tagId) filters.tagId = tagId
    if (isAdmin && !resetFilters && memberId) filters.memberId = memberId
    return filters
  }

  /**
   * Show the report for these filters. A cached copy is shown at once (no
   * spinner) and refreshed; on page load a recent cached copy is used as is.
   */
  async function loadReport(
    workspaceId: string,
    overrides: { from?: string; to?: string } = {},
    resetFilters = false,
    allowCached = false
  ): Promise<void> {
    const filters = buildFilters(overrides, resetFilters)
    const key = `${workspaceKeys.entries(workspaceId)}:report:${JSON.stringify(filters)}`
    const request = ++reportRequest.current
    const cached = peekQuery<ReportResult>(key)

    setError(null)
    if (cached) {
      setReport(cached)
      if (allowCached && isQueryFresh(key)) return
    } else {
      setLoading(true)
    }

    try {
      const result = await fetchQuery(key, () => fetchReport(workspaceId, filters), true)
      if (request === reportRequest.current) setReport(result)
    } catch (err) {
      if (request === reportRequest.current) {
        const message = err instanceof Error ? err.message : 'Could not load the report'
        // Keep the cached report on screen if the refresh fails.
        if (cached) {
          showToast(message, 'error')
        } else {
          setError(message)
          setReport(null)
        }
      }
    } finally {
      if (request === reportRequest.current) setLoading(false)
    }
  }

  async function handleGenerate(): Promise<void> {
    if (!activeId) return
    await loadReport(activeId)
  }

  function handlePreset(preset: Preset): void {
    if (!activeId) return
    const weekStartsOn = localStorage.getItem('clovars.weekStart') === 'sunday' ? 0 : 1
    const range = presetRange(preset, weekStartsOn)
    setFrom(range.from)
    setTo(range.to)
    setActivePreset(preset)
    void loadReport(activeId, range)
  }

  async function handleExport(kind: 'summary' | 'detailed'): Promise<void> {
    if (!activeId) return
    const setExporting = kind === 'summary' ? setExportingSummary : setExportingDetailed
    setExporting(true)
    try {
      const fileName =
        kind === 'summary'
          ? await exportReportCsv(activeId, buildFilters())
          : await exportDetailedReportCsv(activeId, buildFilters())
      showToast(`Exported ${fileName}`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not export the report', 'error')
    } finally {
      setExporting(false)
    }
  }

  function handleResetFilters(): void {
    setFrom('')
    setTo('')
    setProjectId('')
    setTagId('')
    setMemberId('')
    setGroupBy('date')
    setActivePreset(null)
    setReport(null)
    setError(null)
  }

  if (!activeId) {
    return (
      <EmptyState
        icon={<Icon d={icons.reports} size={24} />}
        title="No workspace selected"
        description="Create or join a workspace to see reports."
      />
    )
  }

  const groupLabelHeader =
    groupBy === 'project' ? 'Project' : groupBy === 'member' ? 'Member' : 'Date'
  const showGroupColumn = groupBy !== 'date'
  const chartData = report
    ? [...report.groups]
        .sort((a, b) =>
          groupBy === 'date'
            ? (a.date ?? a.endDate ?? '').localeCompare(b.date ?? b.endDate ?? '')
            : b.totalSeconds - a.totalSeconds
        )
        .slice(0, 12)
        .map((group) => ({
          label:
            groupBy === 'date'
              ? group.date
                ? formatShortDate(group.date)
                : group.label
              : group.label,
          seconds: group.totalSeconds
        }))
    : []

  return (
    <>
      <Section
        title="Reports"
        description="Generated automatically from tracked time. Members see their own time; admins and owners see everyone."
      >
        <div className="report-presets" role="group" aria-label="Date range presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`chip chip--button${activePreset === preset.value ? ' is-active' : ''}`}
              aria-pressed={activePreset === preset.value}
              disabled={loading}
              onClick={() => handlePreset(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Section>

      <Card title="Filters">
        <div className="report-filters">
          <Field label="From">
            <Input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value)
                setActivePreset(null)
              }}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value)
                setActivePreset(null)
              }}
            />
          </Field>
          <Field label="Project">
            <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tag">
            <Select value={tagId} onChange={(event) => setTagId(event.target.value)}>
              <option value="">All tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </Select>
          </Field>
          {isAdmin && (
            <Field label="Member">
              <Select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                <option value="">All members</option>
                {members.map((member) => (
                  <option key={member.id} value={member.userId}>
                    {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.email}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Group by">
            <Select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as ReportGroupBy)}
            >
              <option value="date">Date</option>
              <option value="project">Project</option>
              <option value="member">Member</option>
            </Select>
          </Field>
        </div>

        <div className="form-actions">
          <Button
            variant="primary"
            loading={loading}
            icon={<Icon d={icons.reports} size={16} />}
            onClick={() => void handleGenerate()}
          >
            Generate report
          </Button>
          <Button
            variant="secondary"
            loading={exportingSummary}
            disabled={exportingDetailed}
            icon={<Icon d={icons.download} size={16} />}
            onClick={() => void handleExport('summary')}
          >
            Export summary
          </Button>
          <Button
            variant="secondary"
            loading={exportingDetailed}
            disabled={exportingSummary}
            icon={<Icon d={icons.download} size={16} />}
            onClick={() => void handleExport('detailed')}
          >
            Export detailed CSV
          </Button>
          <Button variant="ghost" disabled={loading} onClick={handleResetFilters}>
            Reset
          </Button>
        </div>
        {optionsError && (
          <p className="field__hint">
            Some filter options could not be loaded. Reload to try again.
          </p>
        )}
      </Card>

      {error ? (
        <ErrorState
          title="Could not load the report"
          message={error}
          onRetry={() => void handleGenerate()}
        />
      ) : loading ? (
        <Card title="Loading report">
          <div className="report-loading">
            <Spinner />
            <span>Crunching your tracked time…</span>
          </div>
        </Card>
      ) : report ? (
        <>
          <div className="stat-grid">
            <StatCard
              label="Total time"
              value={formatDuration(report.totalSeconds)}
              meta={`${report.totalCount} ${report.totalCount === 1 ? 'entry' : 'entries'}`}
              tone="primary"
            />
            <StatCard label="Groups" value={report.groups.length} meta={groupLabelHeader} />
            <StatCard
              label="From"
              value={report.from ? formatShortDate(report.from) : 'All time'}
              meta={report.from ?? 'No start limit'}
            />
            <StatCard
              label="To"
              value={report.to ? formatShortDate(report.to) : 'Today'}
              meta={report.to ?? 'No end limit'}
            />
          </div>

          {report.groups.length === 0 ? (
            <EmptyState
              icon={<Icon d={icons.reports} size={24} />}
              title="No time entries match these filters"
              description="Try a wider date range, or clear the project, tag, and member filters."
              action={
                <Button variant="secondary" onClick={handleResetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <Card
                title={`${groupLabelHeader} breakdown`}
                subtitle={`${report.groups.length} ${report.groups.length === 1 ? 'group' : 'groups'} · top ${Math.min(report.groups.length, 12)} shown`}
              >
                <BarChart data={chartData} height={180} formatValue={formatDurationShort} />
              </Card>

              <Card title="Report details">
                <TableContainer>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        {showGroupColumn && <th>{groupLabelHeader}</th>}
                        <th className="num">Entries</th>
                        <th className="num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.groups.map((group) => (
                        <Fragment key={group.key}>
                          <tr className={group.members?.length ? 'report-group-row' : undefined}>
                            <td>
                              <span className="tabular">
                                {group.date ?? '—'}
                                {group.endDate && group.date && group.endDate !== group.date
                                  ? ` – ${group.endDate}`
                                  : ''}
                              </span>
                            </td>
                            {showGroupColumn && (
                              <td>
                                {report.groupBy === 'member' ? (
                                  <span className="report-member report-member--group">
                                    <Avatar
                                      name={group.label}
                                      src={avatarByUserId.get(group.key)}
                                      size="sm"
                                    />
                                    <span className="report-member__name">{group.label}</span>
                                  </span>
                                ) : (
                                  group.label
                                )}
                              </td>
                            )}
                            <td className="num">{group.count}</td>
                            <td className="num tabular">{formatDuration(group.totalSeconds)}</td>
                          </tr>
                          {group.members?.map((member) => (
                            <tr key={`${group.key}:${member.userId}`} className="report-member-row">
                              <td colSpan={showGroupColumn ? 2 : 1}>
                                <span className="report-member">
                                  <Avatar
                                    name={member.name}
                                    src={avatarByUserId.get(member.userId)}
                                    size="sm"
                                  />
                                  <span className="report-member__name">{member.name}</span>
                                </span>
                              </td>
                              <td className="num">{member.count}</td>
                              <td className="num tabular">{formatDuration(member.totalSeconds)}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                      <tr className="report-total-row">
                        <td>—</td>
                        {showGroupColumn && <td>Total</td>}
                        <td className="num">{report.totalCount}</td>
                        <td className="num tabular">{formatDuration(report.totalSeconds)}</td>
                      </tr>
                    </tbody>
                  </table>
                </TableContainer>
              </Card>
            </>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Icon d={icons.reports} size={24} />}
          title="No report generated yet"
          description="Pick a date range or preset, then generate a report from your tracked time."
        />
      )}
    </>
  )
}
