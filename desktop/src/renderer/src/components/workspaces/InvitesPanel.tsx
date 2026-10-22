import { useState } from 'react'
import type { Invite } from '../../types/workspace'

interface InvitesPanelProps {
  invites: Invite[]
  loading: boolean
  onCreate: (email: string | undefined, role: 'admin' | 'member') => void | Promise<void>
  onRevoke: (invite: Invite) => void | Promise<void>
}

export function InvitesPanel({
  invites,
  loading,
  onCreate,
  onRevoke
}: InvitesPanelProps): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')

  return (
    <section className="invites-panel">
      <h3>Invites</h3>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onCreate(email.trim() ? email.trim() : undefined, role)
        }}
      >
        <label>
          Invite by email (optional)
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@example.com"
          />
        </label>
        <label>
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as 'admin' | 'member')}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create invite'}
        </button>
      </form>

      {invites.length === 0 ? (
        <p>No invites yet.</p>
      ) : (
        <ul>
          {invites.map((invite) => (
            <li key={invite.id}>
              <span>
                {invite.email ?? 'Invite code'} — role {invite.role} — {invite.status}
              </span>
              <code>{invite.code}</code>
              {invite.status === 'pending' && (
                <button type="button" disabled={loading} onClick={() => void onRevoke(invite)}>
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
