import type { Workspace } from '../../types/workspace'

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  onSelect: (workspaceId: string) => void
  onCreate: () => void
  onJoinWithCode: () => void
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onCreate,
  onJoinWithCode
}: WorkspaceSwitcherProps): React.JSX.Element {
  return (
    <div className="workspace-switcher">
      <label>
        Workspace
        <select
          value={activeWorkspaceId ?? ''}
          onChange={(event) => onSelect(event.target.value)}
          disabled={workspaces.length === 0}
        >
          {workspaces.length === 0 && <option value="">No workspaces yet</option>}
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name} ({workspace.role})
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onCreate}>
        New workspace
      </button>
      <button type="button" onClick={onJoinWithCode}>
        Join with invite code
      </button>
    </div>
  )
}
