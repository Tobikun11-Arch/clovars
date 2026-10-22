import type { WorkspaceMember, WorkspaceRole } from '../../types/workspace'

interface MembersPanelProps {
  members: WorkspaceMember[]
  currentUserId: string | null
  currentRole: WorkspaceRole
  loading: boolean
  onChangeRole: (member: WorkspaceMember, role: 'admin' | 'member') => void | Promise<void>
  onRemove: (member: WorkspaceMember) => void | Promise<void>
}

function displayName(member: WorkspaceMember): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ')
  return name ? `${name} (${member.email})` : member.email
}

export function MembersPanel({
  members,
  currentUserId,
  currentRole,
  loading,
  onChangeRole,
  onRemove
}: MembersPanelProps): React.JSX.Element {
  const canManage = currentRole === 'owner' || currentRole === 'admin'
  const canChangeRoles = currentRole === 'owner'

  return (
    <section className="members-panel">
      <h3>Members</h3>
      {members.length === 0 && <p>No members found.</p>}
      <ul>
        {members.map((member) => (
          <li key={member.id}>
            <span>{displayName(member)}</span>
            <span className={`role-badge role-${member.role}`}>{member.role}</span>
            {member.userId === currentUserId && <em> (you)</em>}
            {canManage && member.role !== 'owner' && (
              <>
                {canChangeRoles && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void onChangeRole(member, member.role === 'admin' ? 'member' : 'admin')
                    }
                  >
                    Make {member.role === 'admin' ? 'member' : 'admin'}
                  </button>
                )}
                <button type="button" disabled={loading} onClick={() => void onRemove(member)}>
                  Remove
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
