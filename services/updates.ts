// Powered by OnSpace.AI — Cross-platform update tracker
//
// One API, three delivery mechanisms:
//
//   desktop  electron-updater downloads the new installer from GitHub
//            Releases, then replaces the installed build and relaunches.
//   native   expo-updates fetches a new JS bundle over the air and reloads;
//            a native-code bump instead points the user at the store.
//   web      nothing to install — a reload picks up the new deployment.
//
// `app_versions` in Supabase is the shared source of truth for "what is the
// newest published version", so every platform can show release notes and
// flag mandatory updates even when it cannot self-install.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import semver from 'semver';
import { getSupabaseClient } from '@/template';
import { AppVersionRow } from '@/types/database';
import { currentPlatform, desktop, isDesktop, isNative, DesktopUpdateEvent } from '@/services/platform';

export type UpdateStage =
  'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error';

export interface UpdateState {
  stage: UpdateStage;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  mandatory: boolean;
  /** 0–100 while downloading, undefined otherwise. */
  progress?: number;
  error?: string;
  /** True when this platform can install the update by itself. */
  canSelfInstall: boolean;
}

export const RELEASE_CHANNEL: 'stable' | 'beta' =
  process.env.EXPO_PUBLIC_RELEASE_CHANNEL === 'beta' ? 'beta' : 'stable';

/** The version this build reports — desktop bridge, then app.json, then env. */
export function getCurrentVersion(): string {
  const bridge = desktop();
  if (bridge?.appVersion && bridge.appVersion !== '0.0.0') return bridge.appVersion;
  return Constants.expoConfig?.version ?? process.env.EXPO_PUBLIC_APP_VERSION ?? '0.0.0';
}

function normalise(version: string): string | null {
  return semver.valid(semver.coerce(version));
}

/** True when `candidate` is strictly newer than `current`. */
export function isNewer(candidate: string, current: string): boolean {
  const a = normalise(candidate);
  const b = normalise(current);
  if (!a || !b) return false;
  return semver.gt(a, b);
}

/** Reads the newest published release for this platform from Supabase. */
export async function fetchLatestRelease(): Promise<AppVersionRow | null> {
  const { data, error } = await getSupabaseClient()
    .from('app_versions')
    .select('*')
    .eq('platform', currentPlatform())
    .eq('channel', RELEASE_CHANNEL)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[Updates] Lecture du manifeste échouée:', error.message);
    return null;
  }
  return (data as AppVersionRow) ?? null;
}

export function initialState(): UpdateState {
  return {
    stage: 'idle',
    currentVersion: getCurrentVersion(),
    mandatory: false,
    canSelfInstall: isDesktop() || (isNative() && Updates.isEnabled),
  };
}

/**
 * Asks the active mechanism whether a newer build exists.
 * Never throws — failures surface as `stage: 'error'` so the UI can retry.
 */
export async function checkForUpdate(): Promise<UpdateState> {
  const base: UpdateState = { ...initialState(), stage: 'checking' };

  try {
    const release = await fetchLatestRelease();
    const manifest = release
      ? {
          latestVersion: release.version,
          releaseNotes: release.release_notes ?? undefined,
          downloadUrl: release.download_url ?? undefined,
          mandatory: release.mandatory,
        }
      : {};

    if (isDesktop()) return await checkDesktop(base, manifest, release);
    if (isNative()) return await checkNative(base, manifest, release);
    return checkWeb(base, manifest, release);
  } catch (error) {
    return {
      ...base,
      stage: 'error',
      error: error instanceof Error ? error.message : 'Vérification impossible',
    };
  }
}

type Manifest = Partial<Pick<UpdateState, 'latestVersion' | 'releaseNotes' | 'downloadUrl'>> & {
  mandatory?: boolean;
};

async function checkDesktop(
  base: UpdateState,
  manifest: Manifest,
  release: AppVersionRow | null,
): Promise<UpdateState> {
  const bridge = desktop();
  if (!bridge) return { ...base, stage: 'error', error: 'Pont desktop indisponible' };

  const result = await bridge.checkForUpdates();
  if (result.error) {
    return { ...base, ...manifest, mandatory: !!manifest.mandatory, stage: 'error', error: result.error };
  }

  // electron-updater is authoritative here: it reads the same GitHub feed the
  // installer will download from. Supabase only enriches the message.
  const version = result.version ?? release?.version;
  if (!result.updateAvailable || !version || !isNewer(version, base.currentVersion)) {
    return { ...base, ...manifest, mandatory: false, stage: 'up-to-date' };
  }
  return {
    ...base,
    ...manifest,
    latestVersion: version,
    mandatory: !!manifest.mandatory,
    stage: 'available',
  };
}

async function checkNative(
  base: UpdateState,
  manifest: Manifest,
  release: AppVersionRow | null,
): Promise<UpdateState> {
  // A store release with a higher version wins: an OTA bundle cannot ship
  // new native code, so the user has to go through the store for it.
  if (release && isNewer(release.version, base.currentVersion)) {
    return {
      ...base,
      ...manifest,
      mandatory: !!manifest.mandatory,
      stage: 'available',
      canSelfInstall: false,
    };
  }

  if (!Updates.isEnabled) {
    return { ...base, ...manifest, mandatory: false, stage: 'up-to-date', canSelfInstall: false };
  }

  const ota = await Updates.checkForUpdateAsync();
  if (!ota.isAvailable) {
    return { ...base, ...manifest, mandatory: false, stage: 'up-to-date' };
  }
  return {
    ...base,
    ...manifest,
    mandatory: !!manifest.mandatory,
    latestVersion: manifest.latestVersion ?? base.currentVersion,
    stage: 'available',
  };
}

function checkWeb(base: UpdateState, manifest: Manifest, release: AppVersionRow | null): UpdateState {
  if (release && isNewer(release.version, base.currentVersion)) {
    return { ...base, ...manifest, mandatory: !!manifest.mandatory, stage: 'available' };
  }
  return { ...base, ...manifest, mandatory: false, stage: 'up-to-date' };
}

/**
 * Downloads the pending update. Resolves once the payload is on disk and
 * `installUpdate()` can be called; on web there is nothing to download.
 */
export async function downloadUpdate(): Promise<{ ok: boolean; error?: string }> {
  if (isDesktop()) {
    const bridge = desktop();
    if (!bridge) return { ok: false, error: 'Pont desktop indisponible' };
    return bridge.downloadUpdate();
  }

  if (isNative() && Updates.isEnabled) {
    try {
      const result = await Updates.fetchUpdateAsync();
      return result.isNew ? { ok: true } : { ok: false, error: 'Aucune mise à jour à télécharger' };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Téléchargement échoué' };
    }
  }

  return { ok: true };
}

/**
 * Applies the downloaded update.
 *
 * On desktop this quits the app, lets the installer replace the currently
 * installed version, and relaunches it — the app will not return from here.
 * On native it reloads into the freshly downloaded bundle. On web it reloads
 * the page so the new deployment is picked up.
 */
export async function installUpdate(): Promise<void> {
  if (isDesktop()) {
    desktop()?.quitAndInstall();
    return;
  }

  if (isNative() && Updates.isEnabled) {
    await Updates.reloadAsync();
    return;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.reload();
  }
}

/** Subscribes to desktop download/install progress. No-op elsewhere. */
export function subscribeToDesktopEvents(handler: (event: DesktopUpdateEvent) => void): () => void {
  const bridge = desktop();
  if (!bridge) return () => {};
  return bridge.onUpdateEvent(handler);
}
