// Powered by OnSpace.AI — Runtime platform detection (mobile / web / desktop)
import { Platform } from 'react-native';

/** Bridge injected by desktop/preload.js when running inside the Electron shell. */
export interface DesktopBridge {
  platform: 'linux' | 'darwin' | 'win32';
  appVersion: string;
  checkForUpdates: () => Promise<{ updateAvailable: boolean; version?: string; error?: string }>;
  downloadUpdate: () => Promise<{ ok: boolean; error?: string }>;
  /** Quits the app, replaces the installed build, then relaunches it. */
  quitAndInstall: () => void;
  onUpdateEvent: (handler: (event: DesktopUpdateEvent) => void) => () => void;
  /** Opens an https URL in the user's real browser. */
  openExternal: (url: string) => Promise<{ ok: boolean }>;
  /** Fires with the full onspaceapp:// callback URL after an OAuth round-trip. */
  onAuthCallback: (handler: (url: string) => void) => () => void;
}

export type DesktopUpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available'; version: string }
  | { type: 'progress'; percent: number; transferred: number; total: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string };

declare global {
  // eslint-disable-next-line no-var
  var stockezDesktop: DesktopBridge | undefined;
}

function getBridge(): DesktopBridge | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  return globalThis.stockezDesktop;
}

/** True when the web bundle is running inside the Electron desktop shell. */
export const isDesktop = (): boolean => Platform.OS === 'web' && getBridge() !== undefined;

/** True on a plain browser (not the desktop shell). */
export const isBrowser = (): boolean => Platform.OS === 'web' && !isDesktop();

/** True on iOS or Android. */
export const isNative = (): boolean => Platform.OS === 'ios' || Platform.OS === 'android';

export const desktop = getBridge;

export type AppPlatform = 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'linux';

/** The platform key used to look up releases in `app_versions`. */
export function currentPlatform(): AppPlatform {
  const bridge = getBridge();
  if (bridge) {
    if (bridge.platform === 'darwin') return 'macos';
    if (bridge.platform === 'win32') return 'windows';
    return 'linux';
  }
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}
