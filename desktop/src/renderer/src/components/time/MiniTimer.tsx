import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { formatDuration } from '../../utils/time'
import {
  prepareMiniTimerIcon,
  setMiniTimerIcon,
  useMiniTimerIcon
} from '../../utils/miniTimerIcon'
import logo from '../../assets/logo.png'
import { Button } from '../ui'
import { CircularProgress } from './CircularProgress'

type MiniTimerState = Awaited<ReturnType<Window['api']['getMiniTimerState']>>
type MiniTimerMode = Awaited<ReturnType<Window['api']['getMiniTimerMode']>>
type TimerStatus = 'Running' | 'Paused' | 'Idle'

// Keep in sync with MINI_FULL_MIN / MINI_FULL_MAX in the main process.
const FULL_MIN = { width: 180, height: 210 }
const FULL_MAX = { width: 400, height: 400 }
// Dragging the resize handle this far past the minimum shrinks to the icon.
const SNAP_TO_ICON_DISTANCE = 40
const RING_MIN = 64
const RING_MAX = 160

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
  const [ringSize, setRingSize] = useState(96)
  const [isResizing, setIsResizing] = useState(false)
  const [mode, setMode] = useState<MiniTimerMode>('full')
  const ringArea = useRef<HTMLDivElement>(null)
  const customIcon = useMiniTimerIcon()

  useEffect(() => {
    document.documentElement.classList.add('mini-timer-root')
    return () => {
      document.documentElement.classList.remove('mini-timer-root')
    }
  }, [])

  useEffect(() => {
    if (!window.api) return
    window.api
      .getMiniTimerMode()
      .then(setMode)
      .catch(() => {
        // Fall back to the full widget.
      })
    return window.api.onMiniTimerMode(setMode)
  }, [])

  // Custom icon chosen from the icon's right-click menu.
  useEffect(() => {
    if (!window.api) return
    const offFile = window.api.onMiniTimerIconFile(({ bytes, type }) => {
      prepareMiniTimerIcon(new Blob([bytes as BlobPart], { type }))
        .then(setMiniTimerIcon)
        .catch((err: unknown) => {
          window.api?.showToast(err instanceof Error ? err.message : 'Could not use that icon', 'error')
        })
    })
    const offReset = window.api.onMiniTimerIconReset(() => setMiniTimerIcon(null))
    const offError = window.api.onMiniTimerIconError((message) => {
      window.api?.showToast(message, 'error')
    })
    return () => {
      offFile()
      offReset()
      offError()
    }
  }, [])

  // Size the ring to whatever space is left after the labels and buttons, so
  // nothing gets clipped at small window sizes.
  useEffect(() => {
    const el = ringArea.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setRingSize(Math.floor(Math.max(RING_MIN, Math.min(RING_MAX, width, height))))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [mode])

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
      const rawWidth = startWidth + moveEvent.clientX - startX
      const rawHeight = startHeight + moveEvent.clientY - startY

      if (
        rawWidth < FULL_MIN.width - SNAP_TO_ICON_DISTANCE ||
        rawHeight < FULL_MIN.height - SNAP_TO_ICON_DISTANCE
      ) {
        handleMouseUp()
        window.api?.setMiniTimerMode('icon')
        return
      }

      const width = Math.max(FULL_MIN.width, Math.min(FULL_MAX.width, rawWidth))
      const height = Math.max(FULL_MIN.height, Math.min(FULL_MAX.height, rawHeight))
      window.api?.send('mini-timer:resize', { width, height })
    }

    function handleMouseUp(): void {
      setIsResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const elapsed = elapsedFromState(timerState, now)
  const progress = timerState?.running && !timerState.isPaused ? Math.min(1, elapsed / 3600) : 0
  const status: TimerStatus = timerState?.running
    ? timerState.isPaused
      ? 'Paused'
      : 'Running'
    : 'Idle'

  if (mode === 'icon') {
    return (
      <MiniTimerIcon
        src={customIcon ?? logo}
        hasCustomIcon={customIcon !== null}
        status={status}
        elapsed={elapsed}
      />
    )
  }

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
      <button
        type="button"
        className="mini-timer__shrink"
        onClick={() => window.api?.setMiniTimerMode('icon')}
        title="Shrink to icon"
        aria-label="Shrink to icon"
      >
        ◉
      </button>
      <button type="button" className="mini-timer__close" onClick={handleHide} title="Hide mini timer">
        ×
      </button>

      <div
        className="mini-timer__ring"
        ref={ringArea}
        style={{ '--ring-size': `${ringSize}px` } as React.CSSProperties}
      >
        <CircularProgress
          progress={progress}
          size={ringSize}
          strokeWidth={ringSize < 90 ? 6 : 8}
          reducedMotion={reducedMotion}
        >
          <div className="mini-timer__time">
            <span className="mini-timer__clock tabular">{formatDuration(elapsed)}</span>
            <span className="mini-timer__status">{status}</span>
          </div>
        </CircularProgress>
      </div>

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

interface MiniTimerIconProps {
  src: string
  hasCustomIcon: boolean
  status: TimerStatus
  elapsed: number
}

// The ultra-small mode: a round image with a status ring. Click to expand,
// drag to move, right-click for options. Dragging is done by hand (not with
// -webkit-app-region) because drag regions swallow clicks on Windows.
function MiniTimerIcon({ src, hasCustomIcon, status, elapsed }: MiniTimerIconProps): React.JSX.Element {
  const drag = useRef<{
    pointerId: number
    screenX: number
    screenY: number
    windowX: number
    windowY: number
    moved: boolean
  } | null>(null)

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>): void {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointerId: event.pointerId,
      screenX: event.screenX,
      screenY: event.screenY,
      windowX: window.screenX,
      windowY: window.screenY,
      moved: false
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>): void {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return

    const dx = event.screenX - state.screenX
    const dy = event.screenY - state.screenY
    if (!state.moved && Math.hypot(dx, dy) < 4) return

    state.moved = true
    window.api?.moveMiniTimer({ x: state.windowX + dx, y: state.windowY + dy })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>): void {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    if (!state.moved) window.api?.setMiniTimerMode('full')
  }

  const label = `${formatDuration(elapsed)} · ${status}`

  return (
    <button
      type="button"
      className={`mini-timer-icon mini-timer-icon--${status.toLowerCase()}`}
      title={`${label}\nClick to expand · Drag to move · Right-click for options`}
      aria-label={`Mini timer, ${label}. Expand timer`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        drag.current = null
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          window.api?.setMiniTimerMode('full')
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        window.api?.showMiniTimerIconMenu(hasCustomIcon)
      }}
    >
      <img className="mini-timer-icon__image" src={src} alt="" draggable={false} />
    </button>
  )
}
