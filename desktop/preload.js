// Powered by OnSpace.AI — Electron preload bridge
//
// The renderer runs the Expo web bundle with contextIsolation on and node
// integration off. Everything it may ask of the OS goes through this narrow,
// explicitly enumerated surface — see services/platform.ts for the typed view.
const { contextBridge, ipcRenderer } = require('electron');

const UPDATE_CHANNEL = 'updates:event';
const AUTH_CHANNEL = 'auth:callback';

contextBridge.exposeInMainWorld('stockezDesktop', {
  platform: process.platform,
  appVersion: ipcRenderer.sendSync('app:version'),

  // ── Updates ──────────────────────────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  /** Replaces the installed build with the downloaded one and relaunches. */
  quitAndInstall: () => ipcRenderer.send('updates:install'),
  /** Turns automatic download + install-on-quit on or off. */
  setAutoUpdate: (enabled) => ipcRenderer.send('updates:set-auto', enabled),
  onUpdateEvent: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on(UPDATE_CHANNEL, listener);
    return () => ipcRenderer.removeListener(UPDATE_CHANNEL, listener);
  },

  // ── OAuth ────────────────────────────────────────────────────────────────
  /** Opens a URL in the user's real browser (Google rejects embedded views). */
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  /** Fires with the full callback URL when onspaceapp:// is handed to the app. */
  onAuthCallback: (handler) => {
    const listener = (_event, url) => handler(url);
    ipcRenderer.on(AUTH_CHANNEL, listener);
    return () => ipcRenderer.removeListener(AUTH_CHANNEL, listener);
  },
});
