import { ElectronAPI } from '@electron-toolkit/preload'

export type TimerCommand = 'start' | 'pause' | 'resume' | 'stop'

export type MiniTimerMode = 'full' | 'icon'

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

type UpdateInfoFields = { version: string; currentVersion: string; releaseNotes: string | null }

export type UpdateStatus =
  | { state: 'idle' }
  | ({ state: 'available' } & UpdateInfoFields)
  | ({ state: 'downloading'; percent: number } & UpdateInfoFields)
  | ({ state: 'downloaded' } & UpdateInfoFields)
  | ({ state: 'error'; message: string } & UpdateInfoFields)

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
  getMiniTimerMode: () => Promise<MiniTimerMode>
  setMiniTimerMode: (mode: MiniTimerMode) => void
  onMiniTimerMode: (callback: (mode: MiniTimerMode) => void) => () => void
  moveMiniTimer: (position: { x: number; y: number }) => void
  showMiniTimerIconMenu: (hasCustomIcon: boolean) => void
  onMiniTimerIconFile: (callback: (file: { bytes: Uint8Array; type: string }) => void) => () => void
  onMiniTimerIconReset: (callback: () => void) => () => void
  onMiniTimerIconError: (callback: (message: string) => void) => () => void
  // Window state
  onMainWindowState: (callback: (state: { minimized: boolean; visible: boolean; focused: boolean }) => void) => () => void
  onMiniTimerResized: (callback: (size: { width: number; height: number }) => void) => () => void
  // App updates
  getUpdateStatus: () => Promise<UpdateStatus>
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void
  downloadUpdate: () => void
  installUpdate: () => void
  installUpdateOnQuit: () => void
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
