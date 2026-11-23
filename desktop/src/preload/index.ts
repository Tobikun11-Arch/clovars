import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type TimerCommand = 'start' | 'pause' | 'resume' | 'stop'
type MiniTimerMode = 'full' | 'icon'

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
  getMiniTimerMode: (): Promise<MiniTimerMode> => {
    return ipcRenderer.invoke('mini-timer:get-mode')
  },
  setMiniTimerMode: (mode: MiniTimerMode): void => {
    ipcRenderer.send('mini-timer:set-mode', mode)
  },
  onMiniTimerMode: (callback: (mode: MiniTimerMode) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
      callback(args[0] as MiniTimerMode)
    }
    ipcRenderer.on('mini-timer:mode', listener)
    return () => {
      ipcRenderer.removeListener('mini-timer:mode', listener)
    }
  },
  moveMiniTimer: (position: { x: number; y: number }): void => {
    ipcRenderer.send('mini-timer:move', position)
  },
  showMiniTimerIconMenu: (hasCustomIcon: boolean): void => {
    ipcRenderer.send('mini-timer:icon-menu', hasCustomIcon)
  },
  onMiniTimerIconFile: (
    callback: (file: { bytes: Uint8Array; type: string }) => void
  ): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
      callback(args[0] as { bytes: Uint8Array; type: string })
    }
    ipcRenderer.on('mini-timer:icon-file', listener)
    return () => {
      ipcRenderer.removeListener('mini-timer:icon-file', listener)
    }
  },
  onMiniTimerIconReset: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('mini-timer:icon-reset', listener)
    return () => {
      ipcRenderer.removeListener('mini-timer:icon-reset', listener)
    }
  },
  onMiniTimerIconError: (callback: (message: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
      callback(String(args[0]))
    }
    ipcRenderer.on('mini-timer:icon-error', listener)
    return () => {
      ipcRenderer.removeListener('mini-timer:icon-error', listener)
    }
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
  // App updates
  getUpdateStatus: (): Promise<unknown> => {
    return ipcRenderer.invoke('updater:get-status')
  },
  onUpdateStatus: (callback: (status: unknown) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
      callback(args[0])
    }
    ipcRenderer.on('updater:status', listener)
    return () => {
      ipcRenderer.removeListener('updater:status', listener)
    }
  },
  downloadUpdate: (): void => {
    ipcRenderer.send('updater:download')
  },
  installUpdate: (): void => {
    ipcRenderer.send('updater:install')
  },
  installUpdateOnQuit: (): void => {
    ipcRenderer.send('updater:install-on-quit')
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
