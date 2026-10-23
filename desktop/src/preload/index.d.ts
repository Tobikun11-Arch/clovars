import { ElectronAPI } from '@electron-toolkit/preload'

export type TimerCommand = 'start' | 'pause' | 'resume' | 'stop'

export type TimerState = {
  running: boolean
  isPaused: boolean
  startedAt: string | null
  elapsedSeconds: number
  label: string
  projectId: string | null
  taskId: string | null
  projectName: string | null
  taskName: string | null
  description: string | null
  tags: Array<{ id: string; name: string; color: string }>
  workspaceId: string | null
  workspaceName: string | null
}

export interface ClovarsApi {
  onTimerCommand: (callback: (command: TimerCommand) => void) => () => void
  updateTimerState: (state: TimerState) => void
  showWindow: () => void
  // Mini timer window
  onMiniTimerState: (callback: (state: TimerState) => void) => () => void
  miniTimerCommand: (command: TimerCommand) => void
  hideMiniTimer: () => void
  showMiniTimer: () => void
  toggleMiniTimer: () => void
  setMiniTimerAutoShow: (enabled: boolean) => void
  getMiniTimerState: () => Promise<TimerState>
  // Window state
  onMainWindowState: (callback: (state: { minimized: boolean; visible: boolean; focused: boolean }) => void) => () => void
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void
  on: (channel: string, callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) => void
  removeListener: (channel: string, callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) => void
  send: (channel: string, ...args: unknown[]) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ClovarsApi
  }
}
