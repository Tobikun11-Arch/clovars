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
  const [showHistory, setShowHistory] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function copyCode(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* ignore */
    }
  }

  // Dedupe by code, keep the latest.
  const seen = new Set<string>()
  const unique = invites.filter((invite) => {
    if (seen.has(invite.code)) return false
    seen.add(invite.code)
    return true
  })

  const pending = unique.filter((i) => i.status === 'pending')
  const history = unique.filter((i) => i.status !== 'pending')

  return (
    <section className="invites-panel">
      <h3>Invites</h3>

      <form
        className="stack"
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
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create invite'}
        </button>
      </form>

      <h4 style={{ marginTop: 'var(--sp-4)' }}>Pending invites ({pending.length})</h4>
      {pending.length === 0 ? (
        <p className="muted">No pending invites.</p>
      ) : (
        <ul>
          {pending.map((invite) => (
            <li key={invite.id}>
              <span>
                {invite.email ?? 'Invite code'} — role {invite.role}
              </span>
              <code>{invite.code}</code>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void copyCode(invite.code)}
              >
                {copied === invite.code ? 'Copied!' : 'Copy code'}
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={loading}
                onClick={() => void onRevoke(invite)}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowHistory((s) => !s)}
          >
            {showHistory ? 'Hide' : 'Show'} history ({history.length})
          </button>
          {showHistory && (
            <ul style={{ marginTop: 'var(--sp-2)' }}>
              {history.map((invite) => (
                <li key={invite.id}>
                  <span>
                    {invite.email ?? 'Invite code'} — role {invite.role} — {invite.status}
                  </span>
                  <code>{invite.code}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
