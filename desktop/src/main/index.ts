import { app, shell, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen, globalShortcut } from 'electron'
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
  projectId: string | null
  taskId: string | null
  projectName: string | null
  taskName: string | null
  description: string | null
  tags: Array<{ id: string; name: string; color: string }>
  workspaceId: string | null
  workspaceName: string | null
}

let mainWindow: BrowserWindow | null = null
let miniTimerWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let miniTimerPosition: { x: number; y: number } | null = null
let miniTimerAutoShow = true
let timerState: TimerState = {
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

function isMiniTimerVisible(): boolean {
  return Boolean(miniTimerWindow && !miniTimerWindow.isDestroyed() && miniTimerWindow.isVisible())
}

function toggleMiniTimerWindow(): void {
  if (isMiniTimerVisible()) {
    hideMiniTimerWindow()
    return
  }

  createMiniTimerWindow()
}

function setMiniTimerAutoShow(enabled: boolean): void {
  miniTimerAutoShow = enabled

  if (!enabled) {
    hideMiniTimerWindow()
  }
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

  if (timerState.running && timerState.projectName) {
    template.push({ label: `Project: ${timerState.projectName}`, enabled: false })
  }

  if (timerState.running && timerState.taskName) {
    template.push({ label: `Task: ${timerState.taskName}`, enabled: false })
  }

  if (timerState.running && timerState.workspaceName) {
    template.push({ label: `Workspace: ${timerState.workspaceName}`, enabled: false })
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
      label: isMiniTimerVisible() ? 'Hide Mini Timer' : 'Show Mini Timer',
      click: () => toggleMiniTimerWindow()
    },
    {
      label: 'Quit Clovars',
      click: () => {
        if (timerState.running) {
          // If timer is running, show the main window and send confirmation request
          showWindow()
          // Send after a small delay to ensure window is shown
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('timer:confirm-quit')
            }
          }, 100)
        } else {
          isQuitting = true
          app.quit()
        }
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
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    title: 'Clovars',
    backgroundColor: '#f6f7f9',
    show: false,
    autoHideMenuBar: true,
    icon,
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
      // If timer is running, hide to tray and show toast, and show mini timer
      // If timer is idle, quit normally
      if (timerState.running) {
        event.preventDefault()
        mainWindow?.hide()
        if (miniTimerAutoShow) {
          createMiniTimerWindow()
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('toast:show', {
            message: 'Timer continues in the tray. Click the tray icon to control it.',
            type: 'info'
          })
        }
      } else {
        isQuitting = true
        app.quit()
      }
    }
  })

  // Broadcast main window state changes
  mainWindow.on('minimize', () => {
    broadcastMainWindowState()
  })

  mainWindow.on('restore', () => {
    broadcastMainWindowState()
  })

  mainWindow.on('focus', () => {
    broadcastMainWindowState()
  })

  mainWindow.on('blur', () => {
    broadcastMainWindowState()
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

function createMiniTimerWindow(): void {
  if (miniTimerWindow && !miniTimerWindow.isDestroyed()) {
    miniTimerWindow.show()
    miniTimerWindow.focus()
    updateTray()
    return
  }

  const { width } = screen.getPrimaryDisplay().workAreaSize
  const defaultX = width - 220
  const defaultY = 100

  const x = miniTimerPosition?.x ?? defaultX
  const y = miniTimerPosition?.y ?? defaultY

  miniTimerWindow = new BrowserWindow({
    width: 200,
    height: 200,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: true,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  miniTimerWindow.setAlwaysOnTop(true, 'floating')

  miniTimerWindow.on('ready-to-show', () => {
    miniTimerWindow?.show()
    updateTray()
  })

  miniTimerWindow.on('closed', () => {
    miniTimerWindow = null
    updateTray()
  })

  miniTimerWindow.on('moved', () => {
    if (miniTimerWindow) {
      const [x, y] = miniTimerWindow.getPosition()
      miniTimerPosition = { x, y }
    }
  })

  miniTimerWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  miniTimerWindow.webContents.on('did-finish-load', () => {
    if (!miniTimerWindow || miniTimerWindow.isDestroyed()) return

    miniTimerWindow.webContents.send('mini-timer:state', timerState)
    broadcastMainWindowState()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    miniTimerWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/mini`)
  } else {
    miniTimerWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '#/mini' })
  }
}

function hideMiniTimerWindow(): void {
  if (miniTimerWindow && !miniTimerWindow.isDestroyed()) {
    miniTimerWindow.hide()
    updateTray()
  }
}

function broadcastTimerState(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('mini-timer:state', timerState)
  }
  if (miniTimerWindow && !miniTimerWindow.isDestroyed()) {
    miniTimerWindow.webContents.send('mini-timer:state', timerState)
  }
}

function broadcastMainWindowState(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const state = {
    minimized: mainWindow.isMinimized(),
    visible: mainWindow.isVisible(),
    focused: mainWindow.isFocused()
  }

  if (miniTimerWindow && !miniTimerWindow.isDestroyed()) {
    miniTimerWindow.webContents.send('main-window:state', state)
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
    typeof state.label === 'string' &&
    (state.projectId === null || typeof state.projectId === 'string') &&
    (state.taskId === null || typeof state.taskId === 'string') &&
    (state.projectName === null || typeof state.projectName === 'string') &&
    (state.taskName === null || typeof state.taskName === 'string') &&
    (state.description === null || typeof state.description === 'string') &&
    Array.isArray(state.tags) &&
    state.tags.every(
      (tag: unknown) =>
        tag &&
        typeof tag === 'object' &&
        typeof (tag as Record<string, unknown>).id === 'string' &&
        typeof (tag as Record<string, unknown>).name === 'string' &&
        typeof (tag as Record<string, unknown>).color === 'string'
    ) &&
    (state.workspaceId === null || typeof state.workspaceId === 'string') &&
    (state.workspaceName === null || typeof state.workspaceName === 'string')
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
    broadcastTimerState()
  })

  ipcMain.on('window:show', () => showWindow())

  ipcMain.on('toast:show', (_event, { message, type }: { message: string; type: string }) => {
    // Forward toast notification to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('toast:show', { message, type })
    }
  })

  // Listen for quit confirmation from renderer
  ipcMain.on('app:force-quit', () => {
    isQuitting = true
    app.quit()
  })

  // Listen for quit confirmation when triggered from tray with running timer
  ipcMain.on('timer:confirm-quit', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('timer:confirm-quit')
    }
  })

  // Mini timer window IPC handlers
  ipcMain.on('mini-timer:command', (_event, command: TimerCommand) => {
    sendTimerCommand(command)
  })

  ipcMain.on('mini-timer:hide', () => {
    hideMiniTimerWindow()
  })

  ipcMain.on('mini-timer:show', () => {
    createMiniTimerWindow()
  })

  ipcMain.on('mini-timer:toggle', () => {
    toggleMiniTimerWindow()
  })

  ipcMain.on('mini-timer:set-auto-show', (_event, enabled: unknown) => {
    if (typeof enabled === 'boolean') {
      setMiniTimerAutoShow(enabled)
    }
  })

  ipcMain.handle('mini-timer:get-state', () => {
    return timerState
  })

  const shortcutRegistered = globalShortcut.register('CommandOrControl+Alt+T', () => {
    toggleMiniTimerWindow()
  })

  if (!shortcutRegistered) {
    console.error('Registration of Ctrl+Alt+T global shortcut failed')
  }

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
  globalShortcut.unregisterAll()
})

// Keep the app alive in the tray when the window is closed so a running
// timer and the tray controls stay available. Quit from the tray menu.
app.on('window-all-closed', () => {
  // no-op
})
