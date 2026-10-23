import { ProfileForm } from '../auth/AuthForms'
import type { AuthUser, ChangePasswordPayload } from '../../types/auth'
import { Card } from '../ui'

interface ProfileSectionProps {
  user: AuthUser | null
  onSubmit: (payload: ChangePasswordPayload) => void | Promise<void>
  loading: boolean
}

export function ProfileSection({
  user,
  onSubmit,
  loading
}: ProfileSectionProps): React.JSX.Element {
  return (
    <section className="work-section">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Profile</h1>
          <p>Manage your account and password.</p>
        </div>
      </div>
      <div className="grid-2">
        <Card title="Account">
          <div className="stack">
            <div>
              <div className="muted">Email</div>
              <div>{user?.email}</div>
            </div>
            <div>
              <div className="muted">Account type</div>
              <div>{user?.type}</div>
            </div>
          </div>
        </Card>
        <Card title="Change password">
          <ProfileForm onSubmit={onSubmit} loading={loading} />
        </Card>
      </div>
    </section>
  )
}
