import { useState } from 'react'

interface JoinWithCodeFormProps {
  loading: boolean
  onSubmit: (code: string) => void | Promise<void>
  onCancel: () => void
}

export function JoinWithCodeForm({
  loading,
  onSubmit,
  onCancel
}: JoinWithCodeFormProps): React.JSX.Element {
  const [code, setCode] = useState('')

  return (
    <section className="workspace-form">
      <h3>Join with invite code</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit(code.trim().toUpperCase())
        }}
      >
        <label>
          Invite code
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="ABCD2345"
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Joining...' : 'Join workspace'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </form>
    </section>
  )
}
