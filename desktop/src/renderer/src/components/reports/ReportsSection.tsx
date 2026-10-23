import { useEffect, useState } from 'react'
import { fetchWorkspaces } from '../../api/workspaces'
import { fetchProjects, fetchTags } from '../../api/work'
import { fetchMembers } from '../../api/workspaces'
import { fetchReport, exportDetailedReportCsv } from '../../api/reports'
import type { Project, Tag } from '../../types/work'
import type { ReportFilters, ReportGroupBy, ReportResult } from '../../types/report'
import type { Workspace, WorkspaceMember } from '../../types/workspace'
import { formatDuration } from '../../utils/time'

const ACTIVE_WORKSPACE_KEY = 'clovars.activeWorkspaceId'

export function ReportsSection(): React.JSX.Element {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
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

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeId) ?? null
  const isAdmin = activeWorkspace?.role === 'admin' || activeWorkspace?.role === 'owner'

  useEffect(() => {
    let cancelled = false

    async function bootstrap(): Promise<void> {
      try {
        const list = await fetchWorkspaces()
        if (cancelled) return

        setWorkspaces(list)

        const storedId = localStorage.getItem(ACTIVE_WORKSPACE_KEY)
        const nextId =
          list.find((workspace) => workspace.id === storedId)?.id ?? list[0]?.id ?? null

        setActiveId(nextId)

        if (nextId) {
          localStorage.setItem(ACTIVE_WORKSPACE_KEY, nextId)
        } else {
          localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load workspaces')
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

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
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load workspace data')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [activeId])

  function handleSelectWorkspace(workspaceId: string): void {
    setActiveId(workspaceId)
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId)
    setReport(null)
    setError(null)
    setInfo(null)
  }

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

  return (
    <section className="work-section reports-section">
      <h2>Reports</h2>
      <p className="muted">
        Reports are generated automatically from tracked time. Members see their own time; admins
        see all workspace members.
      </p>

      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}

      {workspaces.length === 0 ? (
        <p className="muted">
          You are not in a workspace yet. Create one in the Workspaces tab first.
        </p>
      ) : (
        <>
          <div className="workspace-switcher">
            <label>
              Workspace
              <select
                value={activeWorkspace?.id ?? ''}
                onChange={(event) => handleSelectWorkspace(event.target.value)}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} ({workspace.role})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="report-filters">
            <label>
              From
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
            <label>
              Project
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tag
              <select value={tagId} onChange={(event) => setTagId(event.target.value)}>
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
            {isAdmin && (
              <label>
                Member
                <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                  <option value="">All members</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.userId}>
                      {member.firstName || member.lastName
                        ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
                        : member.email}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Group by
              <select
                value={groupBy}
                onChange={(event) => setGroupBy(event.target.value as ReportGroupBy)}
              >
                <option value="date">Date</option>
                <option value="project">Project</option>
                <option value="member">Member</option>
              </select>
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="primary"
              disabled={loading || !activeId}
              onClick={() => void handleGenerate()}
            >
              {loading ? 'Loading...' : 'Generate report'}
            </button>
            <button
              type="button"
              disabled={loading || exportingDetailed || !activeId}
              onClick={() => void handleExportDetailed()}
            >
              {exportingDetailed ? 'Exporting...' : 'Export CSV'}
            </button>
            <button type="button" disabled={loading} onClick={handleResetFilters}>
              Reset filters
            </button>
          </div>

          {report && (
            <section className="work-panel">
              <h3>
                {groupLabelHeader} summary — {report.totalCount} entries,{' '}
                {formatDuration(report.totalSeconds)} total
              </h3>

              <p className="muted">
                Date filtered: {report.from ?? 'All'}
                {' – '}
                {report.to ?? 'All'}
                {' · Report date: '}
                {new Date(report.generatedAt).toLocaleString()}
              </p>

              {report.groups.length === 0 ? (
                <p className="muted">No time entries match these filters.</p>
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
            </section>
          )}
        </>
      )}
    </section>
  )
}
