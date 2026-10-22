import { useState } from 'react'

interface WorkspaceNameFormProps {
  title: string
  submitLabel: string
  loading: boolean
  onSubmit: (name: string) => void | Promise<void>
  onCancel?: () => void
}

export function WorkspaceNameForm({
  title,
  submitLabel,
  loading,
  onSubmit,
  onCancel
}: WorkspaceNameFormProps): React.JSX.Element {
  const [name, setName] = useState('')

  return (
    <section className="workspace-form">
      <h3>{title}</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit(name.trim())
        }}
      >
        <label>
          Workspace name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme Studio"
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Working...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </form>
    </section>
  )
}
