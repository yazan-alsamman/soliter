'use strict';

const { app, BrowserWindow, shell, Menu, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const APP_ID = 'com.mediflow.clinic';

let mainWindow = null;

// ─── Window State ────────────────────────────────────────────────────────────

function windowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(windowStatePath(), 'utf-8'));
  } catch {
    return { width: 1280, height: 800 };
  }
}

function saveWindowState(win) {
  try {
    const bounds = win.getBounds();
    fs.writeFileSync(
      windowStatePath(),
      JSON.stringify({ ...bounds, maximized: win.isMaximized() })
    );
  } catch { /* ignore */ }
}

// ─── Persistent Config (userData/config.json) ────────────────────────────────

function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf-8')); }
  catch { return {}; }
}

function saveConfig(data) {
  try { fs.writeFileSync(configPath(), JSON.stringify(data, null, 2)); }
  catch { /* ignore */ }
}

// ─── Security: CSP Headers ───────────────────────────────────────────────────

function setupSecurityHeaders() {
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    const connectSrc = isDev
      ? "'self' http://localhost:* ws://localhost:*"
      : "'self' http://127.0.0.1:3000";

    cb({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; ` +
          `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}; ` +
          `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
          `font-src 'self' data: https://fonts.gstatic.com; ` +
          `img-src 'self' data: blob:; ` +
          `connect-src ${connectSrc};`,
        ],
      },
    });
  });
}

// ─── Native Menu (Arabic) ────────────────────────────────────────────────────

function buildMenu() {
  const template = [
    {
      label: 'ميدي فلو',
      submenu: [
        { label: 'حول ميدي فلو', role: 'about' },
        { type: 'separator' },
        { label: 'إنهاء', role: 'quit', accelerator: 'CmdOrCtrl+Q' },
      ],
    },
    {
      label: 'تحرير',
      submenu: [
        { label: 'تراجع', role: 'undo' },
        { label: 'إعادة', role: 'redo' },
        { type: 'separator' },
        { label: 'قص', role: 'cut' },
        { label: 'نسخ', role: 'copy' },
        { label: 'لصق', role: 'paste' },
        { label: 'تحديد الكل', role: 'selectAll' },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'إعادة تحميل', role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { type: 'separator' },
        { label: 'حجم افتراضي', role: 'resetZoom' },
        { label: 'تكبير', role: 'zoomIn' },
        { label: 'تصغير', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'ملء الشاشة', role: 'togglefullscreen', accelerator: 'F11' },
        ...(isDev
          ? [{ label: 'أدوات المطور', role: 'toggleDevTools', accelerator: 'F12' }]
          : []),
      ],
    },
    {
      label: 'نافذة',
      submenu: [
        { label: 'تصغير', role: 'minimize', accelerator: 'CmdOrCtrl+M' },
        { label: 'تكبير / استعادة', role: 'zoom' },
        { label: 'إغلاق', role: 'close', accelerator: 'CmdOrCtrl+W' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

function registerIpcHandlers() {
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:platform', () => process.platform);

  // Safe external link opening — only http/https
  ipcMain.handle('shell:openExternal', (_, url) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });

  // Window controls (for custom titlebar integration if needed)
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (!mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // Persistent user config (API URL overrides, etc.)
  ipcMain.handle('config:get', (_, key) => loadConfig()[key] ?? null);
  ipcMain.handle('config:set', (_, key, value) => {
    const cfg = loadConfig();
    cfg[key] = value;
    saveConfig(cfg);
  });
}

// ─── Window Creation ─────────────────────────────────────────────────────────

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width ?? 1280,
    height: state.height ?? 800,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 640,
    title: 'ميدي فلو',
    show: false,
    // Prevents white flash before React mounts
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  if (state.maximized) mainWindow.maximize();

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Detached DevTools so they don't narrow the app window
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', () => saveWindowState(mainWindow));
  mainWindow.on('closed', () => { mainWindow = null; });

  // Block renderer from spawning new browser windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Block renderer navigation away from the app origin
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isAppOrigin = isDev
      ? /^http:\/\/localhost:517[0-9]/.test(url)
      : url.startsWith('file://');
    if (!isAppOrigin) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────

if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

// Enforce single instance — focus existing window instead of opening a second
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    setupSecurityHeaders();
    buildMenu();
    registerIpcHandlers();
    createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
