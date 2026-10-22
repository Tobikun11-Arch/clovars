import { useCallback, useEffect, useState } from 'react'
import {
  acceptInvite,
  createInvite,
  createWorkspace,
  fetchInvites,
  fetchMembers,
  fetchMyInvites,
  fetchWorkspaces,
  removeMember,
  revokeInvite,
  updateMemberRole
} from '../../api/workspaces'
import type { Invite, Workspace, WorkspaceMember } from '../../types/workspace'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { WorkspaceNameForm } from './WorkspaceNameForm'
import { JoinWithCodeForm } from './JoinWithCodeForm'
import { MembersPanel } from './MembersPanel'
import { InvitesPanel } from './InvitesPanel'

const ACTIVE_WORKSPACE_KEY = 'clovars.activeWorkspaceId'

interface WorkspacesSectionProps {
  currentUserId: string | null
}

export function WorkspacesSection({ currentUserId }: WorkspacesSectionProps): React.JSX.Element {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [myInvites, setMyInvites] = useState<Invite[]>([])
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null
  const currentRole = activeWorkspace?.role ?? 'member'
  const canManageInvites = currentRole === 'owner' || currentRole === 'admin'

  const loadWorkspaces = useCallback(async (preferredId?: string): Promise<void> => {
    const list = await fetchWorkspaces()
    setWorkspaces(list)

    const storedId = preferredId ?? localStorage.getItem(ACTIVE_WORKSPACE_KEY)
    const nextId = list.find((workspace) => workspace.id === storedId)?.id ?? list[0]?.id ?? null

    setActiveWorkspaceId(nextId)

    if (nextId) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, nextId)
    } else {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap(): Promise<void> {
      try {
        await loadWorkspaces()
        const pending = await fetchMyInvites()
        if (!cancelled) setMyInvites(pending)
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
  }, [loadWorkspaces])

  useEffect(() => {
    let cancelled = false

    async function loadWorkspaceData(workspaceId: string, role: string): Promise<void> {
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
          setError(err instanceof Error ? err.message : 'Could not load members')
        }
      }
    }

    if (activeWorkspace) {
      void loadWorkspaceData(activeWorkspace.id, activeWorkspace.role)
    }

    return () => {
      cancelled = true
    }
  }, [activeWorkspace])

  function handleSelect(workspaceId: string): void {
    setActiveWorkspaceId(workspaceId)
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId)
    setError(null)
    setInfo(null)
  }

  async function handleCreateWorkspace(name: string): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const workspace = await createWorkspace(name)
      await loadWorkspaces(workspace.id)
      setMode('idle')
      setInfo(`Workspace "${workspace.name}" created. You are the owner.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create workspace')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinWithCode(code: string): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const workspace = await acceptInvite(code)
      await loadWorkspaces(workspace.id)
      setMode('idle')
      setInfo(`You joined "${workspace.name}".`)
      setMyInvites(await fetchMyInvites())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join workspace')
    } finally {
      setLoading(false)
    }
  }

  async function handleAcceptMyInvite(invite: Invite): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const workspace = await acceptInvite(invite.code)
      await loadWorkspaces(workspace.id)
      setMyInvites(await fetchMyInvites())
      setInfo(`You joined "${workspace.name}".`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invite')
    } finally {
      setLoading(false)
    }
  }

  async function handleChangeRole(
    member: WorkspaceMember,
    role: 'admin' | 'member'
  ): Promise<void> {
    if (!activeWorkspace) return
    setLoading(true)
    setError(null)
    try {
      await updateMemberRole(activeWorkspace.id, member.id, role)
      setMembers(await fetchMembers(activeWorkspace.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change role')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveMember(member: WorkspaceMember): Promise<void> {
    if (!activeWorkspace) return
    setLoading(true)
    setError(null)
    try {
      await removeMember(activeWorkspace.id, member.id)
      setMembers(await fetchMembers(activeWorkspace.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove member')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateInvite(
    email: string | undefined,
    role: 'admin' | 'member'
  ): Promise<void> {
    if (!activeWorkspace) return
    setLoading(true)
    setError(null)
    try {
      const invite = await createInvite(activeWorkspace.id, email, role)
      setInvites(await fetchInvites(activeWorkspace.id))
      setInfo(
        email
          ? `Invite sent to ${email}. Invite code: ${invite.code}`
          : `Invite created. Share code: ${invite.code}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invite')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevokeInvite(invite: Invite): Promise<void> {
    if (!activeWorkspace) return
    setLoading(true)
    setError(null)
    try {
      await revokeInvite(activeWorkspace.id, invite.id)
      setInvites(await fetchInvites(activeWorkspace.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke invite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="workspaces-section">
      <h2>Workspaces</h2>

      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}

      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelect={handleSelect}
        onCreate={() => setMode('create')}
        onJoinWithCode={() => setMode('join')}
      />

      {mode === 'create' && (
        <WorkspaceNameForm
          title="Create workspace"
          submitLabel="Create workspace"
          loading={loading}
          onSubmit={handleCreateWorkspace}
          onCancel={() => setMode('idle')}
        />
      )}

      {mode === 'join' && (
        <JoinWithCodeForm
          loading={loading}
          onSubmit={handleJoinWithCode}
          onCancel={() => setMode('idle')}
        />
      )}

      {myInvites.length > 0 && (
        <section className="my-invites">
          <h3>Invites for you</h3>
          <ul>
            {myInvites.map((invite) => (
              <li key={invite.id}>
                <span>
                  {invite.workspaceName} — role {invite.role}
                </span>
                <code>{invite.code}</code>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleAcceptMyInvite(invite)}
                >
                  Accept
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeWorkspace && (
        <div className="workspace-details">
          <h3>
            {activeWorkspace.name}{' '}
            <span className={`role-badge role-${currentRole}`}>{currentRole}</span>
          </h3>
          <MembersPanel
            members={members}
            currentUserId={currentUserId}
            currentRole={currentRole}
            loading={loading}
            onChangeRole={handleChangeRole}
            onRemove={handleRemoveMember}
          />
          {canManageInvites && (
            <InvitesPanel
              invites={invites}
              loading={loading}
              onCreate={handleCreateInvite}
              onRevoke={handleRevokeInvite}
            />
          )}
        </div>
      )}
    </section>
  )
}
