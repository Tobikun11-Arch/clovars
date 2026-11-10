import { useEffect, useRef, useState } from 'react'
import { ProfileForm } from '../auth/AuthForms'
import { displayName, type AuthUser, type ChangePasswordPayload } from '../../types/auth'
import { prepareAvatar, removeAvatar, updateProfile, uploadAvatar } from '../../api/profile'
import {
  applyReduceMotionPreference,
  isMiniTimerWidgetEnabled,
  MINI_TIMER_WIDGET_KEY,
  notifyPreferencesChanged,
  REDUCE_MOTION_KEY,
  WEEK_START_KEY
} from '../../utils/preferences'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Field,
  Input,
  Select,
  Stack,
  showToast
} from '../ui'
import { Icon, icons } from '../icons'

interface ProfileSectionProps {
  user: AuthUser
  onSubmit: (payload: ChangePasswordPayload) => void | Promise<void>
  loading: boolean
  onLogout: () => void
  onUserUpdated: (user: AuthUser) => void
}

export function ProfileSection({
  user,
  onSubmit,
  loading,
  onLogout,
  onUserUpdated
}: ProfileSectionProps): React.JSX.Element {
  const [weekStart, setWeekStart] = useState(() => localStorage.getItem(WEEK_START_KEY) ?? 'monday')
  const [reduceMotion, setReduceMotion] = useState(
    () => localStorage.getItem(REDUCE_MOTION_KEY) === 'true'
  )
  const [showMiniTimer, setShowMiniTimer] = useState(isMiniTimerWidgetEnabled)

  useEffect(() => {
    applyReduceMotionPreference(reduceMotion)
  }, [reduceMotion])

  function handleWeekStart(next: string): void {
    setWeekStart(next)
    localStorage.setItem(WEEK_START_KEY, next)
    showToast('Preference saved.', 'success')
  }

  function handleReduceMotion(next: boolean): void {
    setReduceMotion(next)
    localStorage.setItem(REDUCE_MOTION_KEY, String(next))
    applyReduceMotionPreference(next)
    notifyPreferencesChanged()
    showToast(next ? 'Reduced motion enabled.' : 'Reduced motion disabled.', 'success')
  }

  function handleMiniTimerWidget(next: boolean): void {
    setShowMiniTimer(next)
    localStorage.setItem(MINI_TIMER_WIDGET_KEY, String(next))
    window.api?.setMiniTimerAutoShow(next)

    if (next) {
      window.api?.showMiniTimer()
    } else {
      window.api?.hideMiniTimer()
    }

    showToast(
      next ? 'Mini timer widget enabled.' : 'Mini timer widget hidden.',
      'success'
    )
  }

  return (
    <>
      <Card title="Profile photo" subtitle="Shown to teammates in your workspaces.">
        <ProfilePhoto user={user} onUserUpdated={onUserUpdated} />
      </Card>

      <Card title="Personal information">
        <ProfileDetailsForm user={user} onUserUpdated={onUserUpdated} />
        <Divider />
        <div className="detail-list">
          <div className="detail-row">
            <span className="detail-row__label">Email</span>
            <span className="detail-row__value">{user.email}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row__label">Account type</span>
            <span className="detail-row__value">
              <Badge variant={user.type === 'admin' ? 'primary' : 'neutral'}>{user.type}</Badge>
            </span>
          </div>
        </div>
      </Card>

      <Card
        title="Password"
        subtitle="Use at least 8 characters. You'll stay signed in on this device."
      >
        <ProfileForm onSubmit={onSubmit} loading={loading} />
      </Card>

      <Card title="Preferences" subtitle="Saved on this device.">
        <Stack gap={4}>
          <Field label="Week starts on" hint="Used for weekly reports and totals.">
            <Select value={weekStart} onChange={(event) => handleWeekStart(event.target.value)}>
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </Select>
          </Field>

          <Checkbox
            label="Reduce motion (disables most animations)"
            checked={reduceMotion}
            onChange={(event) => handleReduceMotion(event.target.checked)}
          />

          <div>
            <Checkbox
              label="Show floating mini timer"
              checked={showMiniTimer}
              onChange={(event) => handleMiniTimerWidget(event.target.checked)}
            />
            <p className="field__hint">
              Appears when you close Clovars while a timer is running. Toggle anytime with
              Ctrl+Alt+T.
            </p>
          </div>
        </Stack>
      </Card>

      <Card title="Session" subtitle="Signed in on this device.">
        <Stack gap={3}>
          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-row__label">Signed in as</span>
              <span className="detail-row__value">{user.email}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Session security</span>
              <span className="detail-row__value">Access tokens refresh automatically</span>
            </div>
          </div>
          <div className="form-actions">
            <Button
              variant="secondary"
              icon={<Icon d={icons.logout} size={16} />}
              onClick={onLogout}
              disabled={loading}
            >
              Sign out
            </Button>
          </div>
        </Stack>
      </Card>
    </>
  )
}

interface ProfilePartProps {
  user: AuthUser
  onUserUpdated: (user: AuthUser) => void
}

function ProfilePhoto({ user, onUserUpdated }: ProfilePartProps): React.JSX.Element {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return
    setBusy('upload')
    try {
      const dataUrl = await prepareAvatar(file)
      onUserUpdated(await uploadAvatar(dataUrl))
      showToast('Profile photo updated.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update photo', 'error')
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handleRemove(): Promise<void> {
    setBusy('remove')
    try {
      onUserUpdated(await removeAvatar())
      showToast('Profile photo removed.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not remove photo', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="profile-photo">
      <Avatar name={displayName(user)} src={user.avatarUrl} size="xl" />
      <div className="profile-photo__actions">
        <div className="form-actions">
          <Button
            variant="primary"
            loading={busy === 'upload'}
            disabled={busy !== null}
            onClick={() => fileInput.current?.click()}
          >
            {user.avatarUrl ? 'Change photo' : 'Upload photo'}
          </Button>
          {user.avatarUrl && (
            <Button
              variant="secondary"
              loading={busy === 'remove'}
              disabled={busy !== null}
              onClick={() => void handleRemove()}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="field__hint">PNG, JPEG, WebP or GIF. It will be cropped to a square.</p>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  )
}

function ProfileDetailsForm({ user, onUserUpdated }: ProfilePartProps): React.JSX.Element {
  const [firstName, setFirstName] = useState(user.firstName ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const [username, setUsername] = useState(user.username ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const dirty =
    firstName.trim() !== (user.firstName ?? '') ||
    lastName.trim() !== (user.lastName ?? '') ||
    username.trim() !== (user.username ?? '')

  function reset(): void {
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setUsername(user.username ?? '')
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim()
    }

    if (!payload.firstName || !payload.lastName || !payload.username) {
      setError('First name, last name and username are required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const updated = await updateProfile(payload)
      onUserUpdated(updated)
      setFirstName(updated.firstName ?? '')
      setLastName(updated.lastName ?? '')
      setUsername(updated.username ?? '')
      showToast('Profile updated.', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <Stack gap={3}>
        <div className="profile-form-grid">
          <Field label="First name" required>
            <Input
              value={firstName}
              maxLength={60}
              autoComplete="given-name"
              onChange={(event) => setFirstName(event.target.value)}
            />
          </Field>
          <Field label="Last name" required>
            <Input
              value={lastName}
              maxLength={60}
              autoComplete="family-name"
              onChange={(event) => setLastName(event.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Username"
          required
          error={error}
          hint="3 to 30 characters: letters, numbers, dots, dashes and underscores."
        >
          <Input
            value={username}
            maxLength={30}
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
          />
        </Field>
        <div className="form-actions">
          <Button variant="primary" type="submit" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
          <Button variant="secondary" onClick={reset} disabled={!dirty || saving}>
            Cancel
          </Button>
        </div>
      </Stack>
    </form>
  )
}
