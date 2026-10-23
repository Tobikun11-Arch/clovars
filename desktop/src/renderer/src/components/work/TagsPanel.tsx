import { useState } from 'react'
import type { Tag, TagInput } from '../../types/work'
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
  Toolbar,
  confirmDialog
} from '../ui'
import { Icon, icons } from '../icons'

interface TagsPanelProps {
  tags: Tag[]
  loading: boolean
  onCreate: (input: TagInput) => Promise<void>
  onUpdate: (tag: Tag, input: TagInput) => Promise<void>
  onDelete: (tag: Tag) => Promise<void>
}

export function TagsPanel({
  tags,
  loading,
  onCreate,
  onUpdate,
  onDelete
}: TagsPanelProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)

  const query = search.trim().toLowerCase()
  const visible = tags.filter((tag) => !query || tag.name.toLowerCase().includes(query))

  function openCreate(): void {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(tag: Tag): void {
    setEditing(tag)
    setDrawerOpen(true)
  }

  function closeDrawer(): void {
    setDrawerOpen(false)
    setEditing(null)
  }

  async function handleSave(input: TagInput): Promise<void> {
    if (editing) {
      await onUpdate(editing, input)
    } else {
      await onCreate(input)
    }
    closeDrawer()
  }

  async function handleDelete(tag: Tag): Promise<void> {
    const confirmed = await confirmDialog({
      title: `Delete "${tag.name}"?`,
      message: 'The tag is removed from all time entries that use it.',
      confirmLabel: 'Delete tag',
      danger: true
    })
    if (confirmed) await onDelete(tag)
  }

  return (
    <>
      <Section
        title="Tags"
        description="Optional labels for cross-project reporting."
        actions={
          <Toolbar>
            <SearchInput
              className="toolbar__search"
              value={search}
              placeholder="Search tags"
              aria-label="Search tags"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button variant="primary" icon={<Icon d={icons.plus} />} onClick={openCreate}>
              New tag
            </Button>
          </Toolbar>
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={<Icon d={icons.tags} size={24} />}
            title={tags.length === 0 ? 'No tags yet' : 'No matching tags'}
            description={
              tags.length === 0
                ? 'Tags help you report on work across projects, like "billable" or "internal".'
                : 'Try a different search term.'
            }
            action={
              tags.length === 0 ? (
                <Button variant="primary" onClick={openCreate}>
                  Create tag
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
                      <th>Tag</th>
                      <th className="col-hide-sm">Colour</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((tag) => (
                      <tr key={tag.id}>
                        <td>
                          <span
                            className="chip"
                            style={{ borderColor: tag.color, color: tag.color }}
                          >
                            <span className="chip__dot" style={{ background: tag.color }} />
                            {tag.name}
                          </span>
                        </td>
                        <td className="col-hide-sm">
                          <code>{tag.color}</code>
                        </td>
                        <td>
                          <div className="table__actions">
                            <IconButton
                              label={`Edit ${tag.name}`}
                              size="sm"
                              icon={<Icon d={icons.edit} size={16} />}
                              onClick={() => openEdit(tag)}
                            />
                            <IconButton
                              label={`Delete ${tag.name}`}
                              size="sm"
                              icon={<Icon d={icons.trash} size={16} />}
                              disabled={loading}
                              onClick={() => void handleDelete(tag)}
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
        title={editing ? 'Edit tag' : 'New tag'}
        description={editing ? 'Update the tag details.' : 'Add a tag to this workspace.'}
        onClose={closeDrawer}
      >
        <TagForm
          key={editing?.id ?? 'new'}
          tag={editing}
          loading={loading}
          onCancel={closeDrawer}
          onSubmit={handleSave}
        />
      </Drawer>
    </>
  )
}

function TagForm({
  tag,
  loading,
  onSubmit,
  onCancel
}: {
  tag: Tag | null
  loading: boolean
  onSubmit: (input: TagInput) => Promise<void>
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState(tag?.color ?? '#0ea5e9')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()

    if (!name.trim()) {
      setError('Tag name is required.')
      return
    }

    setError(null)
    await onSubmit({ name: name.trim(), color })
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
          maxLength={60}
          placeholder="billable"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field label="Colour">
        <Input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
      </Field>

      <div className="inline" style={{ gap: 'var(--sp-2)' }}>
        <span className="chip" style={{ borderColor: color, color }}>
          <span className="chip__dot" style={{ background: color }} />
          {name || 'Preview'}
        </span>
      </div>

      <div className="form-actions">
        <Button variant="primary" type="submit" loading={loading}>
          {tag ? 'Save tag' : 'Create tag'}
        </Button>
        <Button variant="ghost" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
