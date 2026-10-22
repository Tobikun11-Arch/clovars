import { useState } from 'react'
import type { Client, ClientInput } from '../../types/work'

interface ClientsPanelProps {
  clients: Client[]
  loading: boolean
  onCreate: (input: ClientInput) => void | Promise<void>
  onUpdate: (client: Client, input: ClientInput) => void | Promise<void>
  onDelete: (client: Client) => void | Promise<void>
}

export function ClientsPanel({
  clients,
  loading,
  onCreate,
  onUpdate,
  onDelete
}: ClientsPanelProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState('#4fc3f7')

  function resetForm(): void {
    setEditingId(null)
    setName('')
    setNotes('')
    setColor('#4fc3f7')
  }

  function startEdit(client: Client): void {
    setEditingId(client.id)
    setName(client.name)
    setNotes(client.notes ?? '')
    setColor(client.color ?? '#4fc3f7')
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const input: ClientInput = {
      name: name.trim(),
      notes: notes.trim() ? notes.trim() : null,
      color
    }

    const editing = clients.find((client) => client.id === editingId)

    if (editing) {
      await onUpdate(editing, input)
    } else {
      await onCreate(input)
    }

    resetForm()
  }

  return (
    <section className="work-panel">
      <h3>Clients</h3>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme Inc."
            required
          />
        </label>
        <label>
          Notes (optional)
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Billing contact, etc."
          />
        </label>
        <label className="inline-label">
          Color
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : editingId ? 'Save client' : 'Add client'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {clients.length === 0 ? (
        <p className="muted">No clients yet.</p>
      ) : (
        <ul className="work-list">
          {clients.map((client) => (
            <li key={client.id}>
              <span className="color-dot" style={{ backgroundColor: client.color ?? '#6b7280' }} />
              <span className="work-name">{client.name}</span>
              {client.notes && <span className="muted">{client.notes}</span>}
              <span className="row-actions">
                <button type="button" disabled={loading} onClick={() => startEdit(client)}>
                  Edit
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete client "${client.name}"? Projects will be kept and detached.`
                      )
                    ) {
                      void onDelete(client)
                    }
                  }}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
