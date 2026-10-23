import { useEffect, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { formatDuration } from '../../utils/time'
import { Button } from '../ui'
import { CircularProgress } from './CircularProgress'

type MiniTimerState = Awaited<ReturnType<Window['api']['getMiniTimerState']>>

function elapsedFromState(state: MiniTimerState | null, now: number): number {
  if (!state) return 0

  const accumulated = Number.isFinite(state.elapsedSeconds)
    ? Math.max(0, Math.floor(state.elapsedSeconds))
    : 0

  if (!state.running || state.isPaused || !state.startedAt) {
    return accumulated
  }

  const started = new Date(state.startedAt).getTime()

  if (Number.isNaN(started)) return accumulated

  return accumulated + Math.max(0, Math.floor((now - started) / 1000))
}

export function MiniTimer(): React.JSX.Element {
  const reducedMotion = useReducedMotion()
  const [timerState, setTimerState] = useState<MiniTimerState | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    document.documentElement.classList.add('mini-timer-root')

    return () => {
      document.documentElement.classList.remove('mini-timer-root')
    }
  }, [])

  useEffect(() => {
    if (!window.api) return

    window.api
      .getMiniTimerState()
      .then(setTimerState)
      .catch(() => {
        // Ignore errors — the widget still renders an idle state.
      })

    return window.api.onMiniTimerState(setTimerState)
  }, [])

  useEffect(() => {
    if (!timerState?.running || timerState.isPaused) return

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [timerState?.running, timerState?.isPaused])

  function handleCommand(command: 'start' | 'pause' | 'resume' | 'stop'): void {
    window.api?.miniTimerCommand(command)
  }

  function handleDoubleClick(): void {
    window.api?.showWindow()
  }

  function handleHide(): void {
    window.api?.hideMiniTimer()
  }

  const elapsed = elapsedFromState(timerState, now)
  const progress = timerState?.running && !timerState.isPaused ? Math.min(1, elapsed / 3600) : 0
  const status = timerState?.running ? (timerState.isPaused ? 'Paused' : 'Running') : 'Idle'

  return (
    <div className="mini-timer" onDoubleClick={handleDoubleClick}>
      <button type="button" className="mini-timer__close" onClick={handleHide} title="Hide mini timer">
        ×
      </button>

      <CircularProgress
        progress={progress}
        size={112}
        strokeWidth={8}
        reducedMotion={reducedMotion}
      >
        <div className="mini-timer__time">
          <span className="mini-timer__clock tabular">{formatDuration(elapsed)}</span>
          <span className="mini-timer__status">{status}</span>
        </div>
      </CircularProgress>

      {timerState?.projectName ? (
        <div className="mini-timer__project">{timerState.projectName}</div>
      ) : null}

      {timerState?.taskName ? <div className="mini-timer__task">{timerState.taskName}</div> : null}

      <div className="mini-timer__actions">
        {timerState?.running ? (
          <>
            <Button
              size="sm"
              variant={timerState.isPaused ? 'primary' : 'secondary'}
              onClick={() => handleCommand(timerState.isPaused ? 'resume' : 'pause')}
            >
              {timerState.isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleCommand('stop')}>
              Stop
            </Button>
          </>
        ) : (
          <Button size="sm" variant="primary" onClick={() => handleCommand('start')}>
            Start
          </Button>
        )}
      </div>
    </div>
  )
}
