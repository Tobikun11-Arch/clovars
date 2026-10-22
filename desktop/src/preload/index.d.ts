import { ElectronAPI } from '@electron-toolkit/preload'

export type TimerCommand = 'start' | 'pause' | 'resume' | 'stop'

export type TimerState = {
  running: boolean
  isPaused: boolean
  startedAt: string | null
  elapsedSeconds: number
  label: string
}

export interface ClovarsApi {
  onTimerCommand: (callback: (command: TimerCommand) => void) => () => void
  updateTimerState: (state: TimerState) => void
  showWindow: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ClovarsApi
  }
}
