import { useState } from 'react'
import type { Invite } from '../../types/workspace'
import { formatShortDate } from '../../utils/time'
import {
  Badge,
  Button,
  CopyButton,
  Drawer,
  EmptyState,
  Field,
  Input,
  Section,
  Select,
  TableContainer,
  Tabs
} from '../ui'
import { Icon, icons } from '../icons'

interface InvitesPanelProps {
  invites: Invite[]
  loading: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (email: string | undefined, role: 'admin' | 'member') => void | Promise<void>
  onRevoke: (invite: Invite) => void | Promise<void>
}

type InviteTab = 'pending' | 'history'

export function InvitesPanel({
  invites,
  loading,
  open,
  onOpenChange,
  onCreate,
  onRevoke
}: InvitesPanelProps): React.JSX.Element {
  const [tab, setTab] = useState<InviteTab>('pending')

  // Dedupe by code, keeping the latest record for each code.
  const seen = new Set<string>()
  const unique = invites.filter((invite) => {
    if (seen.has(invite.code)) return false
    seen.add(invite.code)
    return true
  })

  const pending = unique.filter((invite) => invite.status === 'pending')
  const history = unique.filter((invite) => invite.status !== 'pending')

  return (
    <>
      <Section
        title="Invites"
        description="Invite teammates by email or share a code."
        actions={
          <>
            <Tabs
              label="Invite status"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'pending', label: 'Pending', count: pending.length },
                { value: 'history', label: 'History', count: history.length }
              ]}
            />
            <Button
              variant="primary"
              icon={<Icon d={icons.plus} />}
              onClick={() => onOpenChange(true)}
            >
              New invite
            </Button>
          </>
        }
      >
        {tab === 'pending' ? (
          pending.length === 0 ? (
            <EmptyState
              icon={<Icon d={icons.team} size={24} />}
              title="No pending invites"
              description="Create an invite to add someone to this workspace."
              action={
                <Button variant="primary" onClick={() => onOpenChange(true)}>
                  Create invite
                </Button>
              }
            />
          ) : (
            <div className="card">
              <div className="card__body card__body--flush">
                <TableContainer>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Recipient</th>
                        <th>Role</th>
                        <th>Code</th>
                        <th className="col-hide-sm">Expires</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((invite) => (
                        <tr key={invite.id}>
                          <td>
                            <span className="cell-primary">{invite.email ?? 'Shareable link'}</span>
                            {invite.emailSent && <span className="cell-sub">Email sent</span>}
                          </td>
                          <td>
                            <Badge variant={invite.role === 'admin' ? 'success' : 'neutral'}>
                              {invite.role}
                            </Badge>
                          </td>
                          <td>
                            <span className="invite-code">
                              <code>{invite.code}</code>
                              <CopyButton value={invite.code} label="Copy" />
                            </span>
                          </td>
                          <td className="col-hide-sm">
                            <span className="cell-sub">
                              {invite.expiresAt ? formatShortDate(invite.expiresAt) : '—'}
                            </span>
                          </td>
                          <td>
                            <div className="table__actions">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={loading}
                                onClick={() => void onRevoke(invite)}
                              >
                                Revoke
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableContainer>
              </div>
            </div>
          )
        ) : history.length === 0 ? (
          <EmptyState
            icon={<Icon d={icons.check} size={24} />}
            title="No invite history"
            description="Accepted and revoked invites will appear here."
          />
        ) : (
          <div className="card">
            <div className="card__body card__body--flush">
              <TableContainer>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="col-hide-sm">Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((invite) => (
                      <tr key={invite.id}>
                        <td>{invite.email ?? 'Shareable link'}</td>
                        <td>{invite.role}</td>
                        <td>
                          <Badge variant={invite.status === 'accepted' ? 'success' : 'neutral'}>
                            {invite.status}
                          </Badge>
                        </td>
                        <td className="col-hide-sm">
                          <code className="muted">{invite.code}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>
          </div>
        )}
      </Section>

      <Drawer
        open={open}
        title="Invite a teammate"
        description="Send an email invite or create a code you can share yourself."
        onClose={() => onOpenChange(false)}
      >
        <InviteForm
          loading={loading}
          onCancel={() => onOpenChange(false)}
          onSubmit={async (email, role) => {
            await onCreate(email, role)
            onOpenChange(false)
          }}
        />
      </Drawer>
    </>
  )
}

function InviteForm({
  loading,
  onSubmit,
  onCancel
}: {
  loading: boolean
  onSubmit: (email: string | undefined, role: 'admin' | 'member') => Promise<void>
  onCancel: () => void
}): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const trimmed = email.trim()

    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address, or leave it blank to create a shareable code.')
      return
    }

    setError(null)
    await onSubmit(trimmed || undefined, role)
  }

  return (
    <form
      className="stack"
      style={{ gap: 'var(--gap-field)' }}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <Field
        label="Email"
        error={error}
        hint="Leave blank to create a code you can share manually."
      >
        <Input
          type="email"
          value={email}
          autoFocus
          placeholder="teammate@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field label="Role" hint="Admins can manage members and see everyone's time.">
        <Select
          value={role}
          onChange={(event) => setRole(event.target.value as 'admin' | 'member')}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>

      <div className="form-actions">
        <Button variant="primary" type="submit" loading={loading}>
          Create invite
        </Button>
        <Button variant="ghost" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
