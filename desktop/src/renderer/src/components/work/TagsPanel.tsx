import { useState } from 'react'
import type { Tag, TagInput } from '../../types/work'

interface TagsPanelProps {
  tags: Tag[]
  loading: boolean
  onCreate: (input: TagInput) => void | Promise<void>
  onUpdate: (tag: Tag, input: TagInput) => void | Promise<void>
  onDelete: (tag: Tag) => void | Promise<void>
}

export function TagsPanel({
  tags,
  loading,
  onCreate,
  onUpdate,
  onDelete
}: TagsPanelProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#4fc3f7')

  function resetForm(): void {
    setEditingId(null)
    setName('')
    setColor('#4fc3f7')
  }

  function startEdit(tag: Tag): void {
    setEditingId(tag.id)
    setName(tag.name)
    setColor(tag.color)
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const input: TagInput = { name: name.trim(), color }
    const editing = tags.find((tag) => tag.id === editingId)

    if (editing) {
      await onUpdate(editing, input)
    } else {
      await onCreate(input)
    }

    resetForm()
  }

  return (
    <section className="work-panel">
      <h3>Tags</h3>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="billable"
            required
          />
        </label>
        <label className="inline-label">
          Color
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : editingId ? 'Save tag' : 'Add tag'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {tags.length === 0 ? (
        <p className="muted">No tags yet.</p>
      ) : (
        <ul className="work-list">
          {tags.map((tag) => (
            <li key={tag.id}>
              <span className="tag-chip" style={{ borderColor: tag.color, color: tag.color }}>
                {tag.name}
              </span>
              <span className="row-actions">
                <button type="button" disabled={loading} onClick={() => startEdit(tag)}>
                  Edit
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (window.confirm(`Delete tag "${tag.name}"?`)) {
                      void onDelete(tag)
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
