import { app, shell, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

type TimerCommand = 'start' | 'pause' | 'resume' | 'stop'

type TimerState = {
  running: boolean
  isPaused: boolean
  startedAt: string | null
  elapsedSeconds: number
  label: string
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let timerState: TimerState = {
  running: false,
  isPaused: false,
  startedAt: null,
  elapsedSeconds: 0,
  label: ''
}

function formatElapsed(state: TimerState): string {
  const accumulated = Number.isFinite(state.elapsedSeconds)
    ? Math.max(0, Math.floor(state.elapsedSeconds))
    : 0

  if (!state.startedAt) {
    return formatSeconds(accumulated)
  }

  const started = new Date(state.startedAt).getTime()

  if (Number.isNaN(started)) return formatSeconds(accumulated)

  const segment = Math.max(0, Math.floor((Date.now() - started) / 1000))

  return formatSeconds(accumulated + segment)
}

function formatSeconds(elapsed: number): string {
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

function showWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }

  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function sendTimerCommand(command: TimerCommand): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  mainWindow.webContents.send('timer:command', command)
}

function updateTray(): void {
  if (!tray) return

  const elapsed = timerState.running ? formatElapsed(timerState) : ''
  const stateLabel = timerState.isPaused ? 'Paused' : 'Running'
  const status = timerState.running
    ? `${stateLabel}: ${elapsed}${timerState.label ? ` — ${timerState.label}` : ''}`
    : 'No timer running'

  tray.setToolTip(`Clovars — ${status}`)

  const template: MenuItemConstructorOptions[] = [
    {
      label: timerState.running ? `${stateLabel}: ${elapsed}` : 'No timer running',
      enabled: false
    }
  ]

  if (timerState.running && timerState.label) {
    template.push({ label: timerState.label, enabled: false })
  }

  template.push({ type: 'separator' })

  if (timerState.running) {
    template.push(
      {
        label: timerState.isPaused ? 'Resume timer' : 'Pause timer',
        click: () => sendTimerCommand(timerState.isPaused ? 'resume' : 'pause')
      },
      {
        label: 'Stop timer',
        click: () => sendTimerCommand('stop')
      }
    )
  } else {
    template.push({
      label: 'Start timer',
      click: () => sendTimerCommand('start')
    })
  }

  template.push(
    { type: 'separator' },
    { label: 'Show Clovars', click: () => showWindow() },
    {
      label: 'Quit Clovars',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  )

  tray.setContextMenu(Menu.buildFromTemplate(template))
}

function createTray(): void {
  if (tray) return

  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.on('click', () => showWindow())
  updateTray()

  // Keep the tray status current while a timer is running.
  setInterval(() => {
    if (timerState.running) updateTray()
  }, 1000)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Closing the window keeps Clovars running in the tray so timers continue.
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function isValidTimerState(value: unknown): value is TimerState {
  if (!value || typeof value !== 'object') return false

  const state = value as Record<string, unknown>

  return (
    typeof state.running === 'boolean' &&
    typeof state.isPaused === 'boolean' &&
    (state.startedAt === null || typeof state.startedAt === 'string') &&
    typeof state.elapsedSeconds === 'number' &&
    Number.isFinite(state.elapsedSeconds) &&
    typeof state.label === 'string'
  )
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.clovars.desktop')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('timer:state', (_event, state: unknown) => {
    if (!isValidTimerState(state)) return

    timerState = state
    updateTray()
  })

  ipcMain.on('window:show', () => showWindow())

  createWindow()
  createTray()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      showWindow()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

// Keep the app alive in the tray when the window is closed so a running
// timer and the tray controls stay available. Quit from the tray menu.
app.on('window-all-closed', () => {
  // no-op
})
