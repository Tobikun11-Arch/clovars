import { useEffect, useState } from 'react'
import { ProfileForm } from '../auth/AuthForms'
import type { AuthUser, ChangePasswordPayload } from '../../types/auth'
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
}

export function ProfileSection({
  user,
  onSubmit,
  loading,
  onLogout
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
      <Card title="Account">
        <div className="profile-head">
          <Avatar name={user.email} size="lg" />
          <div className="cell-stack">
            <span className="cell-primary">{user.email}</span>
            <span className="cell-sub">
              <Badge variant={user.type === 'admin' ? 'primary' : 'neutral'}>{user.type}</Badge>{' '}
              account
            </span>
          </div>
        </div>
        <Divider />
        <div className="detail-list">
          <div className="detail-row">
            <span className="detail-row__label">Email</span>
            <span className="detail-row__value">{user.email}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row__label">Account type</span>
            <span className="detail-row__value">{user.type}</span>
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
