import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type TimerCommand = 'start' | 'pause' | 'resume' | 'stop'

type TimerState = {
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

// Custom APIs for renderer
const api = {
  onTimerCommand: (callback: (command: TimerCommand) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
      const command = args[0] as TimerCommand
      callback(command)
    }

    ipcRenderer.on('timer:command', listener)

    return () => {
      ipcRenderer.removeListener('timer:command', listener)
    }
  },
  updateTimerState: (state: TimerState): void => {
    ipcRenderer.send('timer:state', state)
  },
  showWindow: (): void => {
    ipcRenderer.send('window:show')
  },
  // Mini timer window
  onMiniTimerState: (callback: (state: TimerState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
      const state = args[0] as TimerState
      callback(state)
    }

    ipcRenderer.on('mini-timer:state', listener)

    return () => {
      ipcRenderer.removeListener('mini-timer:state', listener)
    }
  },
  miniTimerCommand: (command: TimerCommand): void => {
    ipcRenderer.send('mini-timer:command', command)
  },
  hideMiniTimer: (): void => {
    ipcRenderer.send('mini-timer:hide')
  },
  showMiniTimer: (): void => {
    ipcRenderer.send('mini-timer:show')
  },
  toggleMiniTimer: (): void => {
    ipcRenderer.send('mini-timer:toggle')
  },
  setMiniTimerAutoShow: (enabled: boolean): void => {
    ipcRenderer.send('mini-timer:set-auto-show', enabled)
  },
  getMiniTimerState: (): Promise<TimerState> => {
    return ipcRenderer.invoke('mini-timer:get-state')
  },
  // Window state
  onMainWindowState: (callback: (state: { minimized: boolean; visible: boolean; focused: boolean }) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
      const state = args[0] as { minimized: boolean; visible: boolean; focused: boolean }
      callback(state)
    }

    ipcRenderer.on('main-window:state', listener)

    return () => {
      ipcRenderer.removeListener('main-window:state', listener)
    }
  },
  onMiniTimerResized: (callback: (size: { width: number; height: number }) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
      const size = args[0] as { width: number; height: number }
      callback(size)
    }

    ipcRenderer.on('mini-timer:resized', listener)

    return () => {
      ipcRenderer.removeListener('mini-timer:resized', listener)
    }
  },
  showToast: (message: string, type: 'info' | 'success' | 'error' = 'info'): void => {
    ipcRenderer.send('toast:show', { message, type })
  },
  on: (channel: string, callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void): void => {
    ipcRenderer.on(channel, callback)
  },
  removeListener: (channel: string, callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void): void => {
    ipcRenderer.removeListener(channel, callback)
  },
  send: (channel: string, ...args: unknown[]): void => {
    ipcRenderer.send(channel, ...args)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
