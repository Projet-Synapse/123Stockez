// Powered by OnSpace.AI — Electron main process (Linux / macOS / Windows)
//
// The renderer is the same Expo web bundle the browser build uses. In
// production it is served over a custom `app://` scheme rather than file://,
// because expo-router's client-side routing needs absolute paths and a real
// origin (localStorage, which holds the Supabase session, is per-origin).
const { app, BrowserWindow, ipcMain, shell, protocol, net } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const APP_SCHEME = 'app';
const DEEP_LINK_SCHEME = 'onspaceapp';
const RENDERER_DIR = path.join(__dirname, 'renderer');
const DEV_SERVER_URL = process.env.STOCKEZ_DEV_SERVER_URL || 'http://localhost:8081';
const isDev = !app.isPackaged;

log.transports.file.level = 'info';
autoUpdater.logger = log;
// We drive download and install from the UI so the user is never surprised by
// a restart; see `updates:download` / `updates:install` below.
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

// The preload reads this synchronously; registered at module load so it is
// always answered before the first window is created.
ipcMain.on('app:version', (event) => {
  event.returnValue = app.getVersion();
});

let mainWindow = null;
/** Callback URLs that arrive before the window is ready to receive them. */
let pendingAuthUrl = null;

// The custom scheme must be registered before `app.whenReady()`.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

// ── Single instance: deep links must reach the window that already exists ────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const url = argv.find((arg) => arg.startsWith(`${DEEP_LINK_SCHEME}://`));
    if (url) handleAuthCallback(url);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// macOS delivers deep links through `open-url` instead of argv.
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleAuthCallback(url);
});

function handleAuthCallback(url) {
  if (!url) return;
  if (mainWindow && !mainWindow.webContents.isLoading()) {
    mainWindow.webContents.send('auth:callback', url);
  } else {
    pendingAuthUrl = url;
  }
}

function resolveRendererFile(pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  const resolved = path.resolve(RENDERER_DIR, relative);

  // Never serve anything outside the renderer directory.
  if (resolved !== RENDERER_DIR && !resolved.startsWith(RENDERER_DIR + path.sep)) return null;

  const candidates = path.extname(resolved)
    ? [resolved]
    : // `expo export` emits one .html per route (albums → albums.html), so a
      // reload deep in the app should land on that route's own document.
      [`${resolved}.html`, path.join(resolved, 'index.html'), resolved];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, async (request) => {
    const { pathname } = new URL(request.url);
    const file = resolveRendererFile(pathname);

    if (file) return net.fetch(pathToFileURL(file).toString());

    // Unknown path: hand it to expo-router, which resolves it client-side.
    const fallback = path.join(RENDERER_DIR, 'index.html');
    if (fs.existsSync(fallback)) return net.fetch(pathToFileURL(fallback).toString());
    return new Response('Not found', { status: 404 });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0F0E17',
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (pendingAuthUrl) {
      mainWindow.webContents.send('auth:callback', pendingAuthUrl);
      pendingAuthUrl = null;
    }
  });

  // Anything that tries to open a new window goes to the real browser instead.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL);
  } else {
    mainWindow.loadURL(`${APP_SCHEME}://local/index.html`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Update pipeline ─────────────────────────────────────────────────────────
function send(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updates:event', payload);
  }
}

autoUpdater.on('checking-for-update', () => send({ type: 'checking' }));
autoUpdater.on('update-available', (info) =>
  send({ type: 'available', version: info.version, releaseNotes: stringifyNotes(info.releaseNotes) }),
);
autoUpdater.on('update-not-available', (info) => send({ type: 'not-available', version: info.version }));
autoUpdater.on('download-progress', (p) =>
  send({
    type: 'progress',
    percent: Math.round(p.percent),
    transferred: p.transferred,
    total: p.total,
  }),
);
autoUpdater.on('update-downloaded', (info) => send({ type: 'downloaded', version: info.version }));
autoUpdater.on('error', (err) => send({ type: 'error', message: String(err?.message ?? err) }));

function stringifyNotes(notes) {
  if (!notes) return undefined;
  if (typeof notes === 'string') return notes;
  return notes
    .map((n) => n.note)
    .filter(Boolean)
    .join('\n\n');
}

ipcMain.handle('updates:check', async () => {
  if (isDev) return { updateAvailable: false, error: 'Mises à jour désactivées en développement' };
  try {
    const result = await autoUpdater.checkForUpdates();
    const version = result?.updateInfo?.version;
    return { updateAvailable: version !== app.getVersion(), version };
  } catch (error) {
    log.error('[updates] check failed', error);
    return { updateAvailable: false, error: String(error?.message ?? error) };
  }
});

ipcMain.handle('updates:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (error) {
    log.error('[updates] download failed', error);
    return { ok: false, error: String(error?.message ?? error) };
  }
});

// Quits the app, lets the installer replace the currently installed build, and
// relaunches it — the "désinstalle puis redémarre" step of the update flow.
ipcMain.on('updates:install', () => {
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
});

ipcMain.handle('shell:open-external', async (_event, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return { ok: false };
  await shell.openExternal(url);
  return { ok: true };
});

// ── Lifecycle ───────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  if (!app.isDefaultProtocolClient(DEEP_LINK_SCHEME)) {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME);
  }
  if (!isDev) registerAppProtocol();
  createWindow();

  // Linux/Windows pass the deep link in argv on a cold start.
  const coldStartUrl = process.argv.find((arg) => arg.startsWith(`${DEEP_LINK_SCHEME}://`));
  if (coldStartUrl) pendingAuthUrl = coldStartUrl;

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
