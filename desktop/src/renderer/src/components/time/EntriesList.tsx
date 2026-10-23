import type { TimeEntry } from '../../types/time'
import { formatDateTime, formatDayLabel, formatDuration, localDayKey } from '../../utils/time'
import { Badge, Button, EmptyState, IconButton, TableContainer } from '../ui'
import { Icon, icons } from '../icons'

interface EntriesListProps {
  entries: TimeEntry[]
  runningElapsedSeconds: number
  loading: boolean
  onEdit: (entry: TimeEntry) => void
  onDelete: (entry: TimeEntry) => void
  onAdd: () => void
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
  onDelete,
  onAdd
}: EntriesListProps): React.JSX.Element {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Icon d={icons.clock} size={24} />}
        title="No time entries yet"
        description="Start a timer above or add a manual entry to see it here."
        action={
          <Button variant="primary" onClick={onAdd}>
            Add your first entry
          </Button>
        }
      />
    )
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
    <div className="card">
      <div className="card__body card__body--flush">
        <TableContainer>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Project / task</th>
                <th className="col-hide-sm">Notes</th>
                <th className="num">Duration</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {Array.from(groups.values()).map((group) => (
                <GroupRows
                  key={group.key}
                  group={group}
                  runningElapsedSeconds={runningElapsedSeconds}
                  loading={loading}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </TableContainer>
      </div>
    </div>
  )
}

function GroupRows({
  group,
  runningElapsedSeconds,
  loading,
  onEdit,
  onDelete
}: {
  group: EntryDayGroup
  runningElapsedSeconds: number
  loading: boolean
  onEdit: (entry: TimeEntry) => void
  onDelete: (entry: TimeEntry) => void
}): React.JSX.Element {
  return (
    <>
      <tr className="entry-day-row">
        <td colSpan={5}>
          {group.label}
          <span className="entry-day-total">{formatDuration(group.totalSeconds)}</span>
        </td>
      </tr>
      {group.entries.map((entry) => (
        <tr key={entry.id}>
          <td>
            <div className="cell-stack">
              <span className="entry-time">{formatDateTime(entry.startTime)}</span>
              <span className="cell-sub">
                {entry.endTime ? `to ${formatDateTime(entry.endTime)}` : 'in progress'}
              </span>
            </div>
          </td>
          <td>
            <div className="cell-stack">
              <span className="cell-primary">
                {entry.projectName ?? 'No project'}
                {entry.isRunning && (
                  <Badge variant={entry.isPaused ? 'warning' : 'success'}>
                    {entry.isPaused ? 'Paused' : 'Live'}
                  </Badge>
                )}
              </span>
              {entry.taskName && <span className="cell-sub">{entry.taskName}</span>}
            </div>
          </td>
          <td className="col-hide-sm">
            <div className="cell-stack">
              {entry.description && <span className="entry-description">{entry.description}</span>}
              {entry.tags.length > 0 && (
                <span className="tag-picker">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="chip"
                      style={{ borderColor: tag.color, color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </span>
              )}
              {!entry.description && entry.tags.length === 0 && <span className="cell-sub">—</span>}
            </div>
          </td>
          <td className="num">
            {entry.isRunning ? (
              <span className="tabular">{formatDuration(runningElapsedSeconds)}</span>
            ) : (
              <span className="tabular">{formatDuration(entry.durationSeconds)}</span>
            )}
          </td>
          <td>
            <div className="table__actions">
              {!entry.isRunning && (
                <IconButton
                  label="Edit entry"
                  size="sm"
                  icon={<Icon d={icons.edit} size={16} />}
                  disabled={loading}
                  onClick={() => onEdit(entry)}
                />
              )}
              {!entry.isRunning && (
                <IconButton
                  label="Delete entry"
                  size="sm"
                  icon={<Icon d={icons.trash} size={16} />}
                  disabled={loading}
                  onClick={() => onDelete(entry)}
                />
              )}
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}
