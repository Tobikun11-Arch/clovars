import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  fetchGlobalRunningTimeEntry,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer
} from '../api/time'
import type { TimeEntry } from '../types/time'
import { showToast } from '../components/ui'
import { invalidateQueries } from '../lib/queryCache'

const ACTIVE_WORKSPACE_KEY = 'clovars.activeWorkspaceId'
// Mirrors MAX_ENTRY_SECONDS on the server, which does the actual stopping.
const MAX_TIMER_SECONDS = 24 * 60 * 60
const AUTO_STOPPED_MESSAGE =
  'Your timer reached 24 hours, so Clovars stopped and saved it automatically.'
// Window focus also refreshes, but not more often than this.
const FOCUS_REFRESH_MIN_MS = 10_000

/** Seconds on the running timer at `now`, capped at the 24-hour limit. */
export function computeElapsedSeconds(running: TimeEntry | null, now = Date.now()): number {
  if (!running) return 0
  const live = running.isPaused
    ? 0
    : Math.max(0, Math.floor((now - new Date(running.lastResumedAt ?? running.startTime).getTime()) / 1000))
  return Math.min(Math.max(0, running.durationSeconds + live), MAX_TIMER_SECONDS)
}

// One shared one-second clock, so every live display ticks in step.
let clockNow = Date.now()
let clockInterval: number | null = null
const clockListeners = new Set<() => void>()

function subscribeClock(listener: () => void): () => void {
  clockListeners.add(listener)
  if (clockInterval === null) {
    clockNow = Date.now()
    clockInterval = window.setInterval(() => {
      clockNow = Date.now()
      clockListeners.forEach((notify) => notify())
    }, 1000)
  }
  return () => {
    clockListeners.delete(listener)
    if (clockListeners.size === 0 && clockInterval !== null) {
      window.clearInterval(clockInterval)
      clockInterval = null
    }
  }
}

const noSubscription = (): (() => void) => () => {}
const readClock = (): number => clockNow

/**
 * Live elapsed seconds for `running`, ticking once a second. Use it in the
 * component that shows the clock, so only that component re-renders each
 * second instead of the whole app.
 */
export function useElapsedSeconds(running: TimeEntry | null): number {
  const ticking = Boolean(running && !running.isPaused)
  const now = useSyncExternalStore(ticking ? subscribeClock : noSubscription, readClock)
  return computeElapsedSeconds(running, now)
}

interface UseRunningTimerOptions {
  enabled: boolean
  onError: (message: string | null) => void
}

export interface UseRunningTimerResult {
  running: TimeEntry | null
  applyRunning: (entry: TimeEntry | null) => void
  refresh: () => Promise<void>
  startQuickTimer: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  clear: () => void
}

export function useRunningTimer({
  enabled,
  onError
}: UseRunningTimerOptions): UseRunningTimerResult {
  const [running, setRunning] = useState<TimeEntry | null>(null)
  const busyRef = useRef(false)
  const runningKeyRef = useRef('none')
  const lastRefreshRef = useRef(0)

  const applyRunning = useCallback((entry: TimeEntry | null): void => {
    setRunning(entry)

    // Starting, stopping, pausing or resuming changes the entries lists, so any
    // cached list, dashboard or report must be reloaded next time it is shown.
    const key = entry ? `${entry.id}:${entry.isPaused}` : 'none'
    if (key !== runningKeyRef.current) {
      runningKeyRef.current = key
      invalidateQueries((cacheKey) => cacheKey.includes(':entries'))
    }

    window.api?.updateTimerState({
      running: Boolean(entry),
      isPaused: Boolean(entry?.isPaused),
      startedAt: entry && !entry.isPaused ? (entry.lastResumedAt ?? entry.startTime) : null,
      elapsedSeconds: entry ? entry.durationSeconds : 0,
      label: entry
        ? (entry.projectName ?? entry.description ?? entry.workspaceName ?? 'Tracking time')
        : '',
      projectId: entry?.projectId ?? null,
      taskId: entry?.taskId ?? null,
      projectName: entry?.projectName ?? null,
      taskName: entry?.taskName ?? null,
      description: entry?.description ?? null,
      tags: entry?.tags ?? [],
      workspaceId: entry?.workspaceId ?? null,
      workspaceName: entry?.workspaceName ?? null
    })
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) return
    lastRefreshRef.current = Date.now()

    try {
      const { entry, autoStopped } = await fetchGlobalRunningTimeEntry()
      applyRunning(entry)

      if (autoStopped) {
        showToast(AUTO_STOPPED_MESSAGE, 'info')
      }
    } catch {
      // Polling failures are non-fatal; normal requests surface auth errors.
    }
  }, [enabled, applyRunning])

  useEffect(() => {
    if (!enabled) return

    // Defer the initial fetch so it runs outside the effect's synchronous phase.
    const initial = window.setTimeout(() => {
      void refresh()
    }, 0)

    const interval = window.setInterval(() => {
      void refresh()
    }, 30000)

    const onFocus = (): void => {
      if (Date.now() - lastRefreshRef.current < FOCUS_REFRESH_MIN_MS) return
      void refresh()
    }

    window.addEventListener('focus', onFocus)

    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, refresh])

  const startQuickTimer = useCallback(async (): Promise<void> => {
    if (!enabled || running || busyRef.current) return

    const workspaceId = localStorage.getItem(ACTIVE_WORKSPACE_KEY)

    if (!workspaceId) {
      onError('Select a workspace in Work before starting a timer from the tray.')
      window.api?.showWindow()
      return
    }

    busyRef.current = true

    try {
      const entry = await startTimer(workspaceId, {})
      applyRunning(entry)
      onError(null)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not start the timer')
    } finally {
      busyRef.current = false
    }
  }, [enabled, running, applyRunning, onError])

  const stop = useCallback(async (): Promise<void> => {
    if (!running || busyRef.current) return

    busyRef.current = true

    try {
      await stopTimer(running.workspaceId)
      applyRunning(null)
      onError(null)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not stop the timer')
    } finally {
      busyRef.current = false
    }
  }, [running, applyRunning, onError])

  const pause = useCallback(async (): Promise<void> => {
    if (!running || running.isPaused || busyRef.current) return

    busyRef.current = true

    try {
      const entry = await pauseTimer(running.workspaceId)
      applyRunning(entry)
      onError(null)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not pause the timer')
    } finally {
      busyRef.current = false
    }
  }, [running, applyRunning, onError])

  const resume = useCallback(async (): Promise<void> => {
    if (!running || !running.isPaused || busyRef.current) return

    busyRef.current = true

    try {
      const entry = await resumeTimer(running.workspaceId)
      applyRunning(entry)
      onError(null)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not resume the timer')
    } finally {
      busyRef.current = false
    }
  }, [running, applyRunning, onError])

  const clear = useCallback((): void => {
    setRunning(null)
    runningKeyRef.current = 'none'
    window.api?.updateTimerState({
      running: false,
      isPaused: false,
      startedAt: null,
      elapsedSeconds: 0,
      label: '',
      projectId: null,
      taskId: null,
      projectName: null,
      taskName: null,
      description: null,
      tags: [],
      workspaceId: null,
      workspaceName: null
    })
  }, [])

  useEffect(() => {
    if (!enabled || !window.api?.onTimerCommand) return

    const unsubscribe = window.api.onTimerCommand((command) => {
      if (command === 'start') {
        void startQuickTimer()
      } else if (command === 'pause') {
        void pause()
      } else if (command === 'resume') {
        void resume()
      } else {
        void stop()
      }
    })

    return unsubscribe
  }, [enabled, startQuickTimer, pause, resume, stop])

  // While the app is open, ask the server as soon as the 24-hour mark is hit
  // instead of waiting up to 30 seconds for the next poll. Once per entry.
  const limitCheckedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!running || running.isPaused || limitCheckedFor.current === running.id) return
    const remainingMs = (MAX_TIMER_SECONDS - computeElapsedSeconds(running)) * 1000
    const entryId = running.id
    // Timers cap at about 24.8 days; the 30-second poll covers anything longer.
    const handle = window.setTimeout(
      () => {
        limitCheckedFor.current = entryId
        void refresh()
      },
      Math.min(Math.max(0, remainingMs), 2_000_000_000)
    )
    return () => window.clearTimeout(handle)
  }, [running, refresh])

  // Stable between renders unless something changed, so consumers' effects
  // (e.g. the quit-confirmation listener) do not re-subscribe on every render.
  return useMemo(
    () => ({ running, applyRunning, refresh, startQuickTimer, pause, resume, stop, clear }),
    [running, applyRunning, refresh, startQuickTimer, pause, resume, stop, clear]
  )
}
