import { useState } from 'react'
import type { Client, ClientInput, Project } from '../../types/work'
import {
  Button,
  Drawer,
  EmptyState,
  Field,
  IconButton,
  Input,
  SearchInput,
  Section,
  TableContainer,
  Textarea,
  Toolbar,
  confirmDialog
} from '../ui'
import { Icon, icons } from '../icons'

interface ClientsPanelProps {
  clients: Client[]
  projects: Project[]
  loading: boolean
  onCreate: (input: ClientInput) => Promise<void>
  onUpdate: (client: Client, input: ClientInput) => Promise<void>
  onDelete: (client: Client) => Promise<void>
}

export function ClientsPanel({
  clients,
  projects,
  loading,
  onCreate,
  onUpdate,
  onDelete
}: ClientsPanelProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)

  const query = search.trim().toLowerCase()
  const visible = clients.filter(
    (client) =>
      !query ||
      client.name.toLowerCase().includes(query) ||
      (client.notes ?? '').toLowerCase().includes(query)
  )

  function openCreate(): void {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(client: Client): void {
    setEditing(client)
    setDrawerOpen(true)
  }

  function closeDrawer(): void {
    setDrawerOpen(false)
    setEditing(null)
  }

  async function handleSave(input: ClientInput): Promise<void> {
    if (editing) {
      await onUpdate(editing, input)
    } else {
      await onCreate(input)
    }
    closeDrawer()
  }

  async function handleDelete(client: Client): Promise<void> {
    const confirmed = await confirmDialog({
      title: `Delete "${client.name}"?`,
      message: 'Projects linked to this client are kept and become unassigned.',
      confirmLabel: 'Delete client',
      danger: true
    })
    if (confirmed) await onDelete(client)
  }

  return (
    <>
      <Section
        title="Clients"
        description="Keep track of who your projects are for."
        actions={
          <Toolbar>
            <SearchInput
              className="toolbar__search"
              value={search}
              placeholder="Search clients"
              aria-label="Search clients"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button variant="primary" icon={<Icon d={icons.plus} />} onClick={openCreate}>
              New client
            </Button>
          </Toolbar>
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={<Icon d={icons.clients} size={24} />}
            title={clients.length === 0 ? 'No clients yet' : 'No matching clients'}
            description={
              clients.length === 0
                ? 'Add a client to link projects and keep billing details together.'
                : 'Try a different search term.'
            }
            action={
              clients.length === 0 ? (
                <Button variant="primary" onClick={openCreate}>
                  Create client
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              )
            }
          />
        ) : (
          <div className="card">
            <div className="card__body card__body--flush">
              <TableContainer>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th className="col-hide-sm">Notes</th>
                      <th className="num">Projects</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((client) => (
                      <tr key={client.id}>
                        <td>
                          <span className="cell-primary">
                            <span
                              className="dot"
                              style={{ background: client.color ?? 'var(--text-subtle)' }}
                            />
                            {client.name}
                          </span>
                        </td>
                        <td className="col-hide-sm">
                          <span className="cell-sub">{client.notes || '—'}</span>
                        </td>
                        <td className="num">
                          {projects.filter((project) => project.clientId === client.id).length}
                        </td>
                        <td>
                          <div className="table__actions">
                            <IconButton
                              label={`Edit ${client.name}`}
                              size="sm"
                              icon={<Icon d={icons.edit} size={16} />}
                              onClick={() => openEdit(client)}
                            />
                            <IconButton
                              label={`Delete ${client.name}`}
                              size="sm"
                              icon={<Icon d={icons.trash} size={16} />}
                              disabled={loading}
                              onClick={() => void handleDelete(client)}
                            />
                          </div>
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
        open={drawerOpen}
        title={editing ? 'Edit client' : 'New client'}
        description={editing ? 'Update the client details.' : 'Add a client to this workspace.'}
        onClose={closeDrawer}
      >
        <ClientForm
          key={editing?.id ?? 'new'}
          client={editing}
          loading={loading}
          onCancel={closeDrawer}
          onSubmit={handleSave}
        />
      </Drawer>
    </>
  )
}

function ClientForm({
  client,
  loading,
  onSubmit,
  onCancel
}: {
  client: Client | null
  loading: boolean
  onSubmit: (input: ClientInput) => Promise<void>
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState(client?.name ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [color, setColor] = useState(client?.color ?? '#0ea5e9')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()

    if (!name.trim()) {
      setError('Client name is required.')
      return
    }

    setError(null)
    await onSubmit({
      name: name.trim(),
      notes: notes.trim() || null,
      color
    })
  }

  return (
    <form
      className="stack"
      style={{ gap: 'var(--gap-field)' }}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <Field label="Name" error={error} required>
        <Input
          value={name}
          autoFocus
          maxLength={120}
          placeholder="Acme Inc."
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field label="Notes">
        <Textarea
          value={notes}
          rows={4}
          maxLength={500}
          placeholder="Billing contact, timezone, anything useful."
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>

      <Field label="Colour" hint="Used in project markers.">
        <Input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
      </Field>

      <div className="form-actions">
        <Button variant="primary" type="submit" loading={loading}>
          {client ? 'Save client' : 'Create client'}
        </Button>
        <Button variant="ghost" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
