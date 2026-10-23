import { useState } from 'react'
import { acceptInvite, createWorkspace } from '../../api/workspaces'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { Button, Field, Input, Modal, showToast } from '../ui'

interface DialogProps {
  open: boolean
  onClose: () => void
}

export function CreateWorkspaceDialog({ open, onClose }: DialogProps): React.JSX.Element {
  const { refresh } = useWorkspace()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function close(): void {
    setName('')
    setError(null)
    onClose()
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give your workspace a name.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const workspace = await createWorkspace(trimmed)
      await refresh(workspace.id)
      showToast(`Workspace "${workspace.name}" created.`, 'success')
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="New workspace"
      description="Workspaces keep projects, clients and time entries separate."
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="create-workspace-form" loading={loading}>
            Create workspace
          </Button>
        </>
      }
    >
      <form id="create-workspace-form" onSubmit={(event) => void handleSubmit(event)}>
        <Field label="Workspace name" error={error} required>
          <Input
            value={name}
            autoFocus
            placeholder="Acme Studio"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </form>
    </Modal>
  )
}

export function JoinWorkspaceDialog({ open, onClose }: DialogProps): React.JSX.Element {
  const { refresh } = useWorkspace()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function close(): void {
    setCode('')
    setError(null)
    onClose()
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError('Enter the invite code you received.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const workspace = await acceptInvite(trimmed)
      await refresh(workspace.id)
      showToast(`You joined "${workspace.name}".`, 'success')
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Join with invite code"
      description="Ask a workspace admin for an invite code."
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="join-workspace-form" loading={loading}>
            Join workspace
          </Button>
        </>
      }
    >
      <form id="join-workspace-form" onSubmit={(event) => void handleSubmit(event)}>
        <Field label="Invite code" error={error} hint="Codes look like ABCD2345." required>
          <Input
            value={code}
            autoFocus
            placeholder="ABCD2345"
            maxLength={32}
            className="input--code"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
        </Field>
      </form>
    </Modal>
  )
}
