import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchGlobalRunningTimeEntry,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer
} from '../api/time'
import type { TimeEntry } from '../types/time'

const ACTIVE_WORKSPACE_KEY = 'clovars.activeWorkspaceId'

interface UseRunningTimerOptions {
  enabled: boolean
  onError: (message: string | null) => void
}

export interface UseRunningTimerResult {
  running: TimeEntry | null
  elapsedSeconds: number
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
  const [now, setNow] = useState(() => Date.now())
  const busyRef = useRef(false)

  const applyRunning = useCallback((entry: TimeEntry | null): void => {
    setRunning(entry)
    setNow(Date.now())

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

    try {
      const entry = await fetchGlobalRunningTimeEntry()
      applyRunning(entry)
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
      void refresh()
    }

    window.addEventListener('focus', onFocus)

    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, refresh])

  useEffect(() => {
    if (!running) return

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [running])

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

  const elapsedSeconds = running
    ? Math.max(
        0,
        running.durationSeconds +
          (running.isPaused
            ? 0
            : Math.floor(
                (now - new Date(running.lastResumedAt ?? running.startTime).getTime()) / 1000
              ))
      )
    : 0

  return {
    running,
    elapsedSeconds,
    applyRunning,
    refresh,
    startQuickTimer,
    pause,
    resume,
    stop,
    clear
  }
}
