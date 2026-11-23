import { useEffect, useState } from 'react'
import { Button, Modal, ProgressBar, showToast, Stack } from './ui'

type UpdateStatus = Awaited<ReturnType<Window['api']['getUpdateStatus']>>

interface UpdateModalProps {
  timerRunning: boolean
  /** Called before the app restarts so a running timer can be saved. */
  onBeforeRestart: () => Promise<void>
}

// A status the user closed stays closed until the updater moves on
// (for example from "downloading" to "downloaded").
function statusKey(status: UpdateStatus): string {
  return status.state === 'idle' ? 'idle' : `${status.state}:${status.version}`
}

export function UpdateModal({
  timerRunning,
  onBeforeRestart
}: UpdateModalProps): React.JSX.Element | null {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    const api = window.api
    if (!api?.getUpdateStatus) return

    let cancelled = false
    void api.getUpdateStatus().then((current) => {
      if (!cancelled) setStatus(current)
    })
    const unsubscribe = api.onUpdateStatus((next) => setStatus(next))

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  if (status.state === 'idle') return null

  const key = statusKey(status)
  const open = dismissedKey !== key

  function dismiss(): void {
    setDismissedKey(key)
  }

  function later(): void {
    if (status.state === 'downloaded') {
      window.api.installUpdateOnQuit()
      showToast('The update will install the next time you quit Clovars.', 'info')
    }
    dismiss()
  }

  async function restartNow(): Promise<void> {
    setRestarting(true)
    try {
      await onBeforeRestart()
      window.api.installUpdate()
    } catch (err) {
      setRestarting(false)
      showToast(err instanceof Error ? err.message : 'Could not stop the timer.', 'error')
    }
  }

  const notes = status.releaseNotes ? (
    <div className="update-modal__notes">
      <span className="update-modal__notes-title">What&apos;s new</span>
      <p>{status.releaseNotes}</p>
    </div>
  ) : null

  if (status.state === 'available') {
    return (
      <Modal
        open={open}
        title="Update available"
        description={`Clovars ${status.version} is available. You have ${status.currentVersion}.`}
        onClose={dismiss}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={dismiss}>
              Later
            </Button>
            <Button variant="primary" onClick={() => window.api.downloadUpdate()}>
              Download update
            </Button>
          </>
        }
      >
        {notes ?? (
          <p className="confirm-message">Download it now and restart when you&apos;re ready.</p>
        )}
      </Modal>
    )
  }

  if (status.state === 'downloading') {
    return (
      <Modal
        open={open}
        title="Downloading update"
        description={`Clovars ${status.version}`}
        onClose={dismiss}
        size="sm"
        footer={
          <Button variant="secondary" onClick={dismiss}>
            Hide
          </Button>
        }
      >
        <Stack gap={2}>
          <ProgressBar value={status.percent} />
          <p className="confirm-message tabular">
            {status.percent}% · You can keep working while this finishes.
          </p>
        </Stack>
      </Modal>
    )
  }

  if (status.state === 'downloaded') {
    return (
      <Modal
        open={open}
        title="Update ready to install"
        description={`Restart Clovars to finish updating to ${status.version}.`}
        onClose={later}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={later} disabled={restarting}>
              Later
            </Button>
            <Button variant="primary" onClick={() => void restartNow()} loading={restarting}>
              Restart now
            </Button>
          </>
        }
      >
        <Stack gap={3}>
          {timerRunning && (
            <p className="confirm-message">
              Your running timer will be stopped and saved before Clovars restarts.
            </p>
          )}
          {notes}
        </Stack>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      title="Update failed"
      description={`Clovars ${status.version} could not be downloaded.`}
      onClose={dismiss}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={dismiss}>
            Close
          </Button>
          <Button variant="primary" onClick={() => window.api.downloadUpdate()}>
            Try again
          </Button>
        </>
      }
    >
      <p className="confirm-message">{status.message}</p>
    </Modal>
  )
}
