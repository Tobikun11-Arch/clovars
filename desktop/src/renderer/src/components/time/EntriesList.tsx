import type { TimeEntry } from '../../types/time'
import {
  formatDateTime,
  formatDayLabel,
  formatDuration,
  formatDurationShort,
  localDayKey
} from '../../utils/time'

interface EntriesListProps {
  entries: TimeEntry[]
  runningElapsedSeconds: number
  loading: boolean
  onEdit: (entry: TimeEntry) => void
  onDelete: (entry: TimeEntry) => void
}

interface EntryDayGroup {
  key: string
  label: string
  entries: TimeEntry[]
  totalSeconds: number
}

export function EntriesList({
  entries,
  runningElapsedSeconds,
  loading,
  onEdit,
  onDelete
}: EntriesListProps): React.JSX.Element {
  if (entries.length === 0) {
    return <p className="muted">No time entries yet for this workspace.</p>
  }

  const groups = new Map<string, EntryDayGroup>()

  for (const entry of entries) {
    const key = localDayKey(entry.startTime)
    let group = groups.get(key)

    if (!group) {
      group = {
        key,
        label: formatDayLabel(entry.startTime),
        entries: [],
        totalSeconds: 0
      }
      groups.set(key, group)
    }

    group.entries.push(entry)
    group.totalSeconds += entry.isRunning ? runningElapsedSeconds : entry.durationSeconds
  }

  return (
    <div className="time-entry-days">
      {Array.from(groups.values()).map((group) => (
        <div key={group.key} className="time-entry-day">
          <div className="time-entry-day-head">
            <h4>{group.label}</h4>
            <span>{formatDuration(group.totalSeconds)}</span>
          </div>

          <ul className="time-entry-list">
            {group.entries.map((entry) => (
              <li key={entry.id} className={entry.isRunning ? 'time-entry running' : 'time-entry'}>
                <div className="time-entry-row">
                  <span
                    className={
                      entry.isRunning ? 'time-entry-duration running' : 'time-entry-duration'
                    }
                  >
                    {entry.isRunning
                      ? entry.isPaused
                        ? 'Paused'
                        : 'Running'
                      : formatDuration(entry.durationSeconds)}
                  </span>
                  <span className="work-name">{entry.projectName ?? 'No project'}</span>
                  {entry.taskName && <span className="muted">{entry.taskName}</span>}
                  {entry.isRunning && (
                    <span className="role-badge role-admin">
                      {entry.isPaused ? 'paused' : 'live'}
                    </span>
                  )}
                  <span className="row-actions">
                    {!entry.isRunning && (
                      <button type="button" disabled={loading} onClick={() => onEdit(entry)}>
                        Edit
                      </button>
                    )}
                    {!entry.isRunning && (
                      <button type="button" disabled={loading} onClick={() => onDelete(entry)}>
                        Delete
                      </button>
                    )}
                  </span>
                </div>

                <div className="time-entry-row muted">
                  <span>
                    {formatDateTime(entry.startTime)} –{' '}
                    {entry.endTime ? formatDateTime(entry.endTime) : 'now'}
                  </span>
                  {!entry.isRunning && <span>{formatDurationShort(entry.durationSeconds)}</span>}
                </div>

                {entry.description && <p className="time-entry-description">{entry.description}</p>}

                {entry.tags.length > 0 && (
                  <div className="time-entry-tags">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="tag-chip"
                        style={{ borderColor: tag.color, color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
