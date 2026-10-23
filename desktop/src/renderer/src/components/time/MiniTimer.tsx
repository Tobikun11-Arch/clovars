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
  const [isHovered, setIsHovered] = useState(false)
  const [isTransparent, setIsTransparent] = useState(false)
  const [containerSize, setContainerSize] = useState(112)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('mini-timer-root')

    const handleResize = () => {
      const size = Math.min(window.innerWidth, window.innerHeight) * 0.45
      setContainerSize(Math.max(80, Math.min(160, size)))
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    // Listen for resize events from main process
    const cleanup = window.api?.onMiniTimerResized?.(() => {
      handleResize()
    })

    return () => {
      document.documentElement.classList.remove('mini-timer-root')
      window.removeEventListener('resize', handleResize)
      cleanup?.()
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

  // Handle glassmorphism transparency after 3 seconds of no hover
  useEffect(() => {
    let timeoutId: number | null = null

    if (!isHovered && !isResizing) {
      timeoutId = window.setTimeout(() => {
        setIsTransparent(true)
      }, 3000)
    } else {
      setIsTransparent(false)
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [isHovered, isResizing])

  function handleCommand(command: 'start' | 'pause' | 'resume' | 'stop'): void {
    window.api?.miniTimerCommand(command)
  }

  function handleDoubleClick(): void {
    window.api?.showWindow()
  }

  function handleHide(): void {
    window.api?.hideMiniTimer()
  }

  function handleMaximize(): void {
    window.api?.showWindow()
  }

  function handleEdit(): void {
    window.api?.showWindow()
    // Send an event to the main window to open the edit drawer
    window.api?.send('mini-timer:edit', timerState)
  }

  function handleResizeStart(event: React.MouseEvent): void {
    event.preventDefault()
    setIsResizing(true)

    const startX = event.clientX
    const startY = event.clientY
    const startWidth = window.innerWidth
    const startHeight = window.innerHeight

    const handleMouseMove = (moveEvent: MouseEvent): void => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      const newWidth = Math.max(150, Math.min(400, startWidth + deltaX))
      const newHeight = Math.max(150, Math.min(400, startHeight + deltaY))

      // Update window size via IPC
      window.api?.send('mini-timer:resize', { width: newWidth, height: newHeight })

      // Update container size immediately for smooth UI
      const size = Math.min(newWidth, newHeight) * 0.45
      setContainerSize(Math.max(80, Math.min(160, size)))
    }

    const handleMouseUp = (): void => {
      setIsResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const elapsed = elapsedFromState(timerState, now)
  const progress = timerState?.running && !timerState.isPaused ? Math.min(1, elapsed / 3600) : 0
  const status = timerState?.running ? (timerState.isPaused ? 'Paused' : 'Running') : 'Idle'

  return (
    <div
      className={`mini-timer ${isTransparent ? 'mini-timer--transparent' : ''}`}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isResizing) setIsHovered(false)
      }}
    >
      <button
        type="button"
        className="mini-timer__maximize"
        onClick={handleMaximize}
        title="Open Clovars"
      >
        ⛶
      </button>
      <button
        type="button"
        className="mini-timer__edit"
        onClick={handleEdit}
        title="Edit timer"
      >
        ✎
      </button>
      <button type="button" className="mini-timer__close" onClick={handleHide} title="Hide mini timer">
        ×
      </button>

      <CircularProgress
        progress={progress}
        size={containerSize}
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
      <div
        className="mini-timer__resize-handle"
        title="Resize"
        onMouseDown={handleResizeStart}
      ></div>
    </div>
  )
}
