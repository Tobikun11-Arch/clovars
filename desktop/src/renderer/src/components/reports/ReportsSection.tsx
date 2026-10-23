import { useEffect, useState } from 'react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { fetchProjects, fetchTags } from '../../api/work'
import { fetchMembers } from '../../api/workspaces'
import { fetchReport, exportDetailedReportCsv } from '../../api/reports'
import type { Project, Tag } from '../../types/work'
import type { ReportFilters, ReportGroupBy, ReportResult } from '../../types/report'
import type { WorkspaceMember } from '../../types/workspace'
import { formatDuration } from '../../utils/time'
import { Card, EmptyState } from '../ui'

export function ReportsSection(): React.JSX.Element {
  const { activeId, activeWorkspace } = useWorkspace()
  const [projects, setProjects] = useState<Project[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [projectId, setProjectId] = useState('')
  const [tagId, setTagId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('date')

  const [report, setReport] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportingDetailed, setExportingDetailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const isAdmin = activeWorkspace?.role === 'admin' || activeWorkspace?.role === 'owner'

  useEffect(() => {
    if (!activeId) return
    const workspaceId = activeId
    let cancelled = false
    async function load(): Promise<void> {
      try {
        const [nextProjects, nextTags, nextMembers] = await Promise.all([
          fetchProjects(workspaceId),
          fetchTags(workspaceId),
          fetchMembers(workspaceId)
        ])
        if (cancelled) return
        setProjects(nextProjects)
        setTags(nextTags)
        setMembers(nextMembers)
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Could not load workspace data')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [activeId])

  function buildFilters(): ReportFilters {
    const filters: ReportFilters = { groupBy, timezoneOffset: new Date().getTimezoneOffset() }
    if (from) filters.from = from
    if (to) filters.to = to
    if (projectId) filters.projectId = projectId
    if (tagId) filters.tagId = tagId
    if (isAdmin && memberId) filters.memberId = memberId
    return filters
  }

  async function handleGenerate(): Promise<void> {
    if (!activeId) return
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      const result = await fetchReport(activeId, buildFilters())
      setReport(result)
      setInfo(
        `Loaded ${result.totalCount} entries totaling ${formatDuration(result.totalSeconds)}.`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the report')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportDetailed(): Promise<void> {
    if (!activeId) return
    setExportingDetailed(true)
    setError(null)
    try {
      const fileName = await exportDetailedReportCsv(activeId, buildFilters())
      setInfo(`CSV exported: ${fileName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export the detailed report')
    } finally {
      setExportingDetailed(false)
    }
  }

  function handleResetFilters(): void {
    setFrom('')
    setTo('')
    setProjectId('')
    setTagId('')
    setMemberId('')
    setGroupBy('date')
    setReport(null)
    setError(null)
    setInfo(null)
  }

  const groupLabelHeader =
    groupBy === 'project' ? 'Project' : groupBy === 'member' ? 'Member' : 'Date'
  const showGroupColumn = groupBy !== 'date'

  if (!activeId) {
    return (
      <section className="work-section">
        <h2>Reports</h2>
        <p className="muted">You are not in a workspace yet.</p>
      </section>
    )
  }

  return (
    <section className="work-section">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Reports</h1>
          <p>
            Reports are generated automatically from tracked time. Members see their own time;
            admins see all members.
          </p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}

      <Card title="Filters">
        <div className="report-filters">
          <label>
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label>
            Project
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tag
            <select value={tagId} onChange={(e) => setTagId(e.target.value)}>
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          {isAdmin && (
            <label>
              Member
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">All members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.userId}>
                    {m.firstName || m.lastName
                      ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
                      : m.email}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Group by
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as ReportGroupBy)}>
              <option value="date">Date</option>
              <option value="project">Project</option>
              <option value="member">Member</option>
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !activeId}
            onClick={() => void handleGenerate()}
          >
            {loading ? 'Loading...' : 'Generate report'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading || exportingDetailed || !activeId}
            onClick={() => void handleExportDetailed()}
          >
            {exportingDetailed ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={loading}
            onClick={handleResetFilters}
          >
            Reset filters
          </button>
        </div>
      </Card>

      {report && (
        <Card
          title={`${groupLabelHeader} summary — ${report.totalCount} entries, ${formatDuration(report.totalSeconds)} total`}
        >
          <p className="muted">
            Date filtered: {report.from ?? 'All'} – {report.to ?? 'All'} · Report date:{' '}
            {new Date(report.generatedAt).toLocaleString()}
          </p>
          {report.groups.length === 0 ? (
            <EmptyState title="No time entries match these filters." />
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {showGroupColumn && <th>{groupLabelHeader}</th>}
                  <th>Entries</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {report.groups.map((group) => (
                  <tr key={group.key}>
                    <td>
                      {group.date ?? '—'}
                      {group.endDate && group.date && group.endDate !== group.date
                        ? ` – ${group.endDate}`
                        : ''}
                    </td>
                    {showGroupColumn && <td>{group.label}</td>}
                    <td>{group.count}</td>
                    <td className="duration-cell">{formatDuration(group.totalSeconds)}</td>
                  </tr>
                ))}
                <tr className="report-total-row">
                  <td>—</td>
                  {showGroupColumn && <td>Total</td>}
                  <td>{report.totalCount}</td>
                  <td className="duration-cell">{formatDuration(report.totalSeconds)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>
      )}
    </section>
  )
}
