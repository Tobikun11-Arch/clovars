import type { WorkspaceMember, WorkspaceRole } from '../../types/workspace'
import { formatDate } from '../../utils/time'
import { Avatar, Badge, EmptyState, IconButton, Section, Select, TableContainer } from '../ui'
import { Icon, icons } from '../icons'

interface MembersPanelProps {
  members: WorkspaceMember[]
  currentUserId: string | null
  currentRole: WorkspaceRole
  loading: boolean
  onChangeRole: (member: WorkspaceMember, role: 'admin' | 'member') => void | Promise<void>
  onRemove: (member: WorkspaceMember) => void | Promise<void>
}

function memberName(member: WorkspaceMember): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ')
  return name || (member.email?.split('@')[0] ?? 'Unknown')
}

function roleVariant(role: WorkspaceRole): 'primary' | 'success' | 'neutral' {
  if (role === 'owner') return 'primary'
  if (role === 'admin') return 'success'
  return 'neutral'
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

  async function handleRemove(member: WorkspaceMember): Promise<void> {
    await onRemove(member)
  }

  return (
    <Section
      title="Members"
      description={`${members.length} ${members.length === 1 ? 'person has' : 'people have'} access to this workspace.`}
    >
      {members.length === 0 ? (
        <EmptyState
          icon={<Icon d={icons.team} size={24} />}
          title="No members yet"
          description="Invite teammates with an invite code to collaborate."
        />
      ) : (
        <div className="card">
          <div className="card__body card__body--flush">
            <TableContainer>
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th className="col-hide-sm">Email</th>
                    <th>Role</th>
                    <th className="col-hide-md">Joined</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const isSelf = member.userId === currentUserId
                    const editable = canChangeRoles && member.role !== 'owner' && !isSelf
                    const removable = canManage && member.role !== 'owner' && !isSelf

                    return (
                      <tr key={member.id}>
                        <td>
                          <span className="cell-primary">
                            <Avatar name={memberName(member)} size="sm" />
                            <span className="cell-stack">
                              <span>
                                {memberName(member)}
                                {isSelf && <span className="cell-sub"> (you)</span>}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="col-hide-sm">{member.email}</td>
                        <td>
                          {editable ? (
                            <Select
                              className="input--role"
                              value={member.role}
                              aria-label={`Change role for ${member.email}`}
                              disabled={loading}
                              onChange={(event) =>
                                void onChangeRole(member, event.target.value as 'admin' | 'member')
                              }
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </Select>
                          ) : (
                            <Badge variant={roleVariant(member.role)}>{member.role}</Badge>
                          )}
                        </td>
                        <td className="col-hide-md">
                          <span className="cell-sub">
                            {member.joinedAt ? formatDate(member.joinedAt) : '—'}
                          </span>
                        </td>
                        <td>
                          <div className="table__actions">
                            {removable && (
                              <IconButton
                                label={`Remove ${member.email}`}
                                size="sm"
                                icon={<Icon d={icons.trash} size={16} />}
                                disabled={loading}
                                onClick={() => void handleRemove(member)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TableContainer>
          </div>
        </div>
      )}
    </Section>
  )
}
