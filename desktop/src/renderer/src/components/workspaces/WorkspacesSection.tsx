import { useEffect, useState } from 'react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import {
  acceptInvite,
  createInvite,
  fetchInvites,
  fetchMembers,
  fetchMyInvites,
  removeMember,
  revokeInvite,
  updateMemberRole
} from '../../api/workspaces'
import type { Invite, WorkspaceMember } from '../../types/workspace'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Section,
  Inline,
  Skeleton,
  confirmDialog,
  showToast
} from '../ui'
import { Icon, icons } from '../icons'
import { MembersPanel } from './MembersPanel'
import { InvitesPanel } from './InvitesPanel'
import { CreateWorkspaceDialog, JoinWorkspaceDialog } from './WorkspaceDialogs'
import { WorkspaceOnboarding } from './WorkspaceOnboarding'

interface WorkspacesSectionProps {
  currentUserId: string | null
}

export function WorkspacesSection({ currentUserId }: WorkspacesSectionProps): React.JSX.Element {
  const { workspaces, activeWorkspace, refresh } = useWorkspace()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [myInvites, setMyInvites] = useState<Invite[]>([])
  const [busy, setBusy] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const currentRole = activeWorkspace?.role ?? 'member'
  const canManageInvites = currentRole === 'owner' || currentRole === 'admin'

  useEffect(() => {
    let cancelled = false

    async function loadInvitesForMe(): Promise<void> {
      try {
        const pending = await fetchMyInvites()
        if (!cancelled) setMyInvites(pending)
      } catch {
        /* Non-critical: the invite banner simply won't show. */
      }
    }

    void loadInvitesForMe()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    if (!activeWorkspace) return

    const workspaceId = activeWorkspace.id
    const role = activeWorkspace.role
    let cancelled = false

    async function load(): Promise<void> {
      setPageLoading(true)
      setLoadError(null)

      try {
        const list = await fetchMembers(workspaceId)
        if (cancelled) return
        setMembers(list)

        if (role === 'owner' || role === 'admin') {
          const workspaceInvites = await fetchInvites(workspaceId)
          if (!cancelled) setInvites(workspaceInvites)
        } else {
          setInvites([])
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Could not load workspace members')
        }
      } finally {
        if (!cancelled) setPageLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [activeWorkspace, reloadKey])

  async function handleChangeRole(
    member: WorkspaceMember,
    role: 'admin' | 'member'
  ): Promise<void> {
    if (!activeWorkspace) return
    setBusy(true)
    try {
      await updateMemberRole(activeWorkspace.id, member.id, role)
      setMembers(await fetchMembers(activeWorkspace.id))
      showToast(`${member.email} is now ${role}.`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not change role', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveMember(member: WorkspaceMember): Promise<void> {
    if (!activeWorkspace) return

    const confirmed = await confirmDialog({
      title: `Remove ${member.email}?`,
      message: 'They will lose access to this workspace. Their tracked time is kept.',
      confirmLabel: 'Remove member',
      danger: true
    })
    if (!confirmed) return

    setBusy(true)
    try {
      await removeMember(activeWorkspace.id, member.id)
      setMembers(await fetchMembers(activeWorkspace.id))
      showToast(`${member.email} was removed.`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not remove member', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateInvite(
    email: string | undefined,
    role: 'admin' | 'member'
  ): Promise<void> {
    if (!activeWorkspace) return
    setBusy(true)
    try {
      const invite = await createInvite(activeWorkspace.id, email, role)
      setInvites(await fetchInvites(activeWorkspace.id))
      showToast(
        email
          ? `Invite sent to ${email}. Code: ${invite.code}`
          : `Invite created. Share code: ${invite.code}`,
        'success'
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create invite', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleRevokeInvite(invite: Invite): Promise<void> {
    if (!activeWorkspace) return

    const confirmed = await confirmDialog({
      title: 'Revoke invite?',
      message: `The code ${invite.code} will stop working immediately.`,
      confirmLabel: 'Revoke invite',
      danger: true
    })
    if (!confirmed) return

    setBusy(true)
    try {
      await revokeInvite(activeWorkspace.id, invite.id)
      setInvites(await fetchInvites(activeWorkspace.id))
      showToast('Invite revoked.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not revoke invite', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleAcceptMyInvite(invite: Invite): Promise<void> {
    setBusy(true)
    try {
      const workspace = await acceptInvite(invite.code)
      await refresh(workspace.id)
      setMyInvites(await fetchMyInvites())
      showToast(`You joined "${workspace.name}".`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not accept invite', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!activeWorkspace) {
    return (
      <>
        {myInvites.length > 0 && (
          <Section
            title="Invites for you"
            description="Accept an invite to join a teammate's workspace."
          >
            <div className="card">
              <div className="card__body">
                {myInvites.map((invite) => (
                  <div className="row-between" key={invite.id}>
                    <div className="cell-stack">
                      <span className="cell-primary">{invite.workspaceName ?? 'Workspace'}</span>
                      <span className="cell-sub">
                        Role: {invite.role} · Code: <code>{invite.code}</code>
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      loading={busy}
                      onClick={() => void handleAcceptMyInvite(invite)}
                    >
                      Accept invite
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        <WorkspaceOnboarding
          onCreate={() => setCreateOpen(true)}
          onJoin={() => setJoinOpen(true)}
        />

        <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
        <JoinWorkspaceDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
      </>
    )
  }

  const membersLoading = pageLoading && members.length === 0

  return (
    <>
      {myInvites.length > 0 && (
        <Section title="Invites for you">
          <div className="card">
            <div className="card__body">
              {myInvites.map((invite) => (
                <div className="row-between" key={invite.id}>
                  <div className="cell-stack">
                    <span className="cell-primary">{invite.workspaceName ?? 'Workspace'}</span>
                    <span className="cell-sub">
                      Role: {invite.role} · Code: <code>{invite.code}</code>
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    loading={busy}
                    onClick={() => void handleAcceptMyInvite(invite)}
                  >
                    Accept
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      <Card
        title="Workspace"
        subtitle={`You are ${currentRole} · ${members.length} ${members.length === 1 ? 'member' : 'members'}`}
        actions={
          <Inline gap={2}>
            <Badge
              variant={
                currentRole === 'owner'
                  ? 'primary'
                  : currentRole === 'admin'
                    ? 'success'
                    : 'neutral'
              }
            >
              {currentRole}
            </Badge>
            {canManageInvites && (
              <Button
                variant="primary"
                icon={<Icon d={icons.plus} />}
                onClick={() => setInviteOpen(true)}
              >
                Invite people
              </Button>
            )}
          </Inline>
        }
      >
        <div className="detail-list">
          <div className="detail-row">
            <span className="detail-row__label">Workspace ID</span>
            <span className="detail-row__value">
              <code>{activeWorkspace.id}</code>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-row__label">Workspaces you belong to</span>
            <span className="detail-row__value">{workspaces.length}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row__label">Your permissions</span>
            <span className="detail-row__value">
              {currentRole === 'owner'
                ? 'Full access, roles, invites and billing'
                : currentRole === 'admin'
                  ? 'Manage members, invites and all time'
                  : 'Track your own time'}
            </span>
          </div>
        </div>
      </Card>

      {loadError ? (
        <ErrorState
          title="Could not load workspace"
          message={loadError}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : membersLoading ? (
        <div className="card">
          <div className="card__body">
            <Skeleton height={28} width="30%" />
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </div>
        </div>
      ) : (
        <MembersPanel
          members={members}
          currentUserId={currentUserId}
          currentRole={currentRole}
          loading={busy}
          onChangeRole={handleChangeRole}
          onRemove={handleRemoveMember}
        />
      )}

      {canManageInvites && (
        <InvitesPanel
          invites={invites}
          loading={busy}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onCreate={handleCreateInvite}
          onRevoke={handleRevokeInvite}
        />
      )}

      {members.length === 0 && !membersLoading && !loadError && (
        <EmptyState
          title="No members found"
          description="Reload the page to fetch the latest member list."
          action={
            <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
              Refresh
            </Button>
          }
        />
      )}

      <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinWorkspaceDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  )
}
