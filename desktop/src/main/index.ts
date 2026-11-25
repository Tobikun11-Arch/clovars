import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  nativeImage,
  screen,
  globalShortcut,
  dialog
} from 'electron'
import { autoUpdater } from 'electron-updater'
import type { MenuItemConstructorOptions } from 'electron'
import { readFile, stat } from 'fs/promises'
import { extname, join } from 'path'
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

// Mini timer sizing. The full widget never shrinks below the size where the
// ring, labels and buttons still fit; anything smaller is the icon mode.
type MiniTimerMode = 'full' | 'icon'
const MINI_FULL_MIN = { width: 180, height: 210 }
const MINI_FULL_MAX = { width: 400, height: 400 }
const MINI_FULL_DEFAULT = { width: 200, height: 240 }
const MINI_ICON_SIZE = 84
const MINI_ICON_MAX_BYTES = 10 * 1024 * 1024
const MINI_ICON_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}
let miniTimerMode: MiniTimerMode = 'full'
let miniTimerFullSize = { ...MINI_FULL_DEFAULT }
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

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  }
  mainWindow.show()
  mainWindow.focus()
}

function maximizeWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }

  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.maximize()
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
    { label: 'Maximize Clovars', click: () => maximizeWindow() },
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
  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isMinimized()) {
      mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    } else {
      showWindow()
    }
  })
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
    // Show mini timer when main window is minimized if timer is running
    if (timerState.running && miniTimerAutoShow) {
      createMiniTimerWindow()
    }
    broadcastMainWindowState()
  })

  mainWindow.on('restore', () => {
    // Hide mini timer when main window is restored
    if (isMiniTimerVisible()) {
      hideMiniTimerWindow()
    }
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
  const defaultX = width - MINI_FULL_DEFAULT.width - 20
  const defaultY = 100

  const x = miniTimerPosition?.x ?? defaultX
  const y = miniTimerPosition?.y ?? defaultY
  const isIcon = miniTimerMode === 'icon'
  const size = isIcon ? { width: MINI_ICON_SIZE, height: MINI_ICON_SIZE } : miniTimerFullSize

  miniTimerWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    minWidth: isIcon ? MINI_ICON_SIZE : MINI_FULL_MIN.width,
    minHeight: isIcon ? MINI_ICON_SIZE : MINI_FULL_MIN.height,
    maxWidth: isIcon ? MINI_ICON_SIZE : MINI_FULL_MAX.width,
    maxHeight: isIcon ? MINI_ICON_SIZE : MINI_FULL_MAX.height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: !isIcon,
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

  miniTimerWindow.on('resized', () => {
    if (miniTimerWindow) {
      const [width, height] = miniTimerWindow.getSize()
      if (miniTimerMode === 'full') {
        miniTimerFullSize = clampFullSize(width, height)
      }
      // Send new size to renderer to adjust component scaling
      miniTimerWindow.webContents.send('mini-timer:resized', { width, height })
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

function clampFullSize(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.round(Math.max(MINI_FULL_MIN.width, Math.min(MINI_FULL_MAX.width, width))),
    height: Math.round(Math.max(MINI_FULL_MIN.height, Math.min(MINI_FULL_MAX.height, height)))
  }
}

function setMiniTimerMode(mode: MiniTimerMode): void {
  miniTimerMode = mode
  const win = miniTimerWindow
  if (!win || win.isDestroyed()) return

  const [x, y] = win.getPosition()
  const [currentWidth] = win.getSize()

  if (mode === 'icon') {
    win.setResizable(false)
    win.setMinimumSize(MINI_ICON_SIZE, MINI_ICON_SIZE)
    win.setMaximumSize(MINI_ICON_SIZE, MINI_ICON_SIZE)
    // Keep the icon where the widget's top-right corner was, so it shrinks
    // toward the corner people usually park it in.
    win.setBounds({
      x: Math.round(x + currentWidth - MINI_ICON_SIZE),
      y,
      width: MINI_ICON_SIZE,
      height: MINI_ICON_SIZE
    })
  } else {
    const { width, height } = miniTimerFullSize
    win.setMaximumSize(MINI_FULL_MAX.width, MINI_FULL_MAX.height)
    win.setMinimumSize(MINI_FULL_MIN.width, MINI_FULL_MIN.height)
    win.setResizable(true)

    // Grow from the icon's top-right corner and stay inside the screen.
    const area = screen.getDisplayNearestPoint({ x, y }).workArea
    const nextX = Math.max(area.x, Math.min(x + currentWidth - width, area.x + area.width - width))
    const nextY = Math.max(area.y, Math.min(y, area.y + area.height - height))
    win.setBounds({ x: Math.round(nextX), y: Math.round(nextY), width, height })
  }

  const [px, py] = win.getPosition()
  miniTimerPosition = { x: px, y: py }
  win.webContents.send('mini-timer:mode', mode)
}

async function pickMiniTimerIcon(): Promise<void> {
  const win = miniTimerWindow
  if (!win || win.isDestroyed()) return

  const result = await dialog.showOpenDialog(win, {
    title: 'Choose mini timer icon',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return

  const filePath = result.filePaths[0]
  const type = MINI_ICON_TYPES[extname(filePath).toLowerCase()]
  if (!type) {
    win.webContents.send('mini-timer:icon-error', 'Choose a PNG, JPEG, WebP or GIF image.')
    return
  }

  const info = await stat(filePath)
  if (info.size > MINI_ICON_MAX_BYTES) {
    win.webContents.send('mini-timer:icon-error', 'That image is larger than 10 MB.')
    return
  }

  const bytes = await readFile(filePath)
  if (!win.isDestroyed()) {
    win.webContents.send('mini-timer:icon-file', { bytes: new Uint8Array(bytes), type })
  }
}

function showMiniTimerIconMenu(hasCustomIcon: boolean): void {
  const win = miniTimerWindow
  if (!win || win.isDestroyed()) return

  Menu.buildFromTemplate([
    { label: 'Expand timer', click: () => setMiniTimerMode('full') },
    { label: 'Open Clovars', click: () => showWindow() },
    { type: 'separator' },
    { label: 'Change icon…', click: () => void pickMiniTimerIcon() },
    {
      label: 'Use default icon',
      enabled: hasCustomIcon,
      click: () => win.webContents.send('mini-timer:icon-reset')
    },
    { type: 'separator' },
    { label: 'Hide mini timer', click: () => hideMiniTimerWindow() }
  ]).popup({ window: win })
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

type UpdateInfoFields = { version: string; currentVersion: string; releaseNotes: string | null }

type UpdateStatus =
  | { state: 'idle' }
  | ({ state: 'available' } & UpdateInfoFields)
  | ({ state: 'downloading'; percent: number } & UpdateInfoFields)
  | ({ state: 'downloaded' } & UpdateInfoFields)
  | ({ state: 'error'; message: string } & UpdateInfoFields)

let updateStatus: UpdateStatus = { state: 'idle' }

// Kept in main so a renderer that loads after the check finishes can still ask for it.
function setUpdateStatus(next: UpdateStatus): void {
  updateStatus = next
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', updateStatus)
  }
}

function formatReleaseNotes(notes: unknown): string | null {
  const raw = Array.isArray(notes)
    ? notes
        .map((entry) =>
          entry && typeof entry === 'object' && 'note' in entry ? String(entry.note ?? '') : ''
        )
        .join('\n')
    : typeof notes === 'string'
      ? notes
      : ''

  // GitHub release notes arrive as HTML; show them as plain text.
  const text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text || null
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

// Only one Clovars process may run. Launching the app again (desktop icon,
// Start menu, taskbar) hands off to the running instance, which brings its
// existing window — and its signed-in session — back to the front.
const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  const focusExistingWindow = (): void => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow()
      return
    }
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }

  app.on('second-instance', () => {
    if (app.isReady()) {
      focusExistingWindow()
    } else {
      app.whenReady().then(focusExistingWindow)
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.clovars.desktop')

  // Configure auto-updater (GitHub releases auto-detect from electron-builder/app-update.yml).
  // Nothing downloads or installs until the user says so in the update modal.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
    setUpdateStatus({
      state: 'available',
      version: info.version,
      currentVersion: app.getVersion(),
      releaseNotes: formatReleaseNotes(info.releaseNotes)
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('No update available. Current version:', info.version)
  })

  autoUpdater.on('download-progress', (progress) => {
    if (updateStatus.state !== 'downloading') return
    setUpdateStatus({ ...updateStatus, percent: Math.round(progress.percent) })
  })

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error)
    // Only surface errors for a download the user asked for; a failed
    // background check stays quiet.
    if (updateStatus.state === 'downloading') {
      setUpdateStatus({
        state: 'error',
        version: updateStatus.version,
        currentVersion: updateStatus.currentVersion,
        releaseNotes: updateStatus.releaseNotes,
        message: error?.message ?? 'The update could not be downloaded.'
      })
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version)
    setUpdateStatus({
      state: 'downloaded',
      version: info.version,
      currentVersion: app.getVersion(),
      releaseNotes: formatReleaseNotes(info.releaseNotes)
    })
  })

  ipcMain.handle('updater:get-status', () => updateStatus)

  ipcMain.on('updater:download', () => {
    if (updateStatus.state !== 'available' && updateStatus.state !== 'error') return
    setUpdateStatus({
      state: 'downloading',
      version: updateStatus.version,
      currentVersion: updateStatus.currentVersion,
      releaseNotes: updateStatus.releaseNotes,
      percent: 0
    })
    autoUpdater.downloadUpdate().catch((error) => {
      console.error('Update download failed:', error)
    })
  })

  ipcMain.on('updater:install', () => {
    if (updateStatus.state !== 'downloaded') return
    isQuitting = true
    autoUpdater.quitAndInstall()
  })

  // "Later" on a downloaded update: install it the next time Clovars quits.
  ipcMain.on('updater:install-on-quit', () => {
    if (updateStatus.state === 'downloaded') autoUpdater.autoInstallOnAppQuit = true
  })

  // electron-updater only works in packaged builds.
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('Update check failed:', error)
    })
  } else {
    console.log('Skipping auto-update check in development')
  }

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

  // Forward mini timer edit request to main window
  ipcMain.on('mini-timer:edit', (_event, state: unknown) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      showWindow()
      mainWindow.webContents.send('mini-timer:edit', state)
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

  ipcMain.on('mini-timer:resize', (_event, size: unknown) => {
    if (
      miniTimerWindow &&
      !miniTimerWindow.isDestroyed() &&
      size &&
      typeof size === 'object' &&
      'width' in size &&
      'height' in size &&
      typeof size.width === 'number' &&
      typeof size.height === 'number'
    ) {
      if (miniTimerMode !== 'full') return
      const clamped = clampFullSize(size.width, size.height)
      miniTimerFullSize = clamped
      miniTimerWindow.setSize(clamped.width, clamped.height)
    }
  })

  ipcMain.handle('mini-timer:get-mode', () => miniTimerMode)

  ipcMain.on('mini-timer:set-mode', (_event, mode: unknown) => {
    if (mode === 'full' || mode === 'icon') setMiniTimerMode(mode)
  })

  ipcMain.on('mini-timer:move', (_event, position: unknown) => {
    if (
      miniTimerWindow &&
      !miniTimerWindow.isDestroyed() &&
      position &&
      typeof position === 'object' &&
      'x' in position &&
      'y' in position &&
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      Number.isFinite(position.x) &&
      Number.isFinite(position.y)
    ) {
      const x = Math.round(position.x)
      const y = Math.round(position.y)
      // setBounds with a fixed size, not setPosition: on Windows at fractional
      // display scaling (125%/150% laptops) setPosition grows the window ~1px per move.
      const { width, height } =
        miniTimerMode === 'icon'
          ? { width: MINI_ICON_SIZE, height: MINI_ICON_SIZE }
          : miniTimerFullSize
      miniTimerWindow.setBounds({ x, y, width, height })
      miniTimerPosition = { x, y }
    }
  })

  ipcMain.on('mini-timer:icon-menu', (_event, hasCustomIcon: unknown) => {
    showMiniTimerIconMenu(hasCustomIcon === true)
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
