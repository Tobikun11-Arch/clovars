import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type TimerCommand = 'start' | 'pause' | 'resume' | 'stop'

type TimerState = {
  running: boolean
  isPaused: boolean
  startedAt: string | null
  elapsedSeconds: number
  label: string
}

// Custom APIs for renderer
const api = {
  onTimerCommand: (callback: (command: TimerCommand) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, command: TimerCommand): void =>
      callback(command)

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
