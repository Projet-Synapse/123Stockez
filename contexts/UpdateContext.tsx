// Powered by OnSpace.AI — Update tracker context
import React, { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UpdateState,
  initialState,
  checkForUpdate,
  downloadUpdate,
  installUpdate,
  subscribeToDesktopEvents,
} from '@/services/updates';
import { desktop, isDesktop } from '@/services/platform';

interface UpdateContextType extends UpdateState {
  /** Re-runs the check. `silent` keeps the UI from flashing a spinner. */
  check: (silent?: boolean) => Promise<void>;
  /** Downloads then installs — on desktop this restarts the app. */
  applyUpdate: () => Promise<void>;
  dismiss: () => void;
  dismissed: boolean;
  /** When on, updates download by themselves and install on next quit. */
  autoUpdate: boolean;
  setAutoUpdate: (enabled: boolean) => void;
}

export const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

/** How often to re-check while the app is open. */
const POLL_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Persisted location of the automatic-update preference. */
const AUTO_UPDATE_KEY = 'stockez.updates.autoUpdate';

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UpdateState>(initialState);
  const [dismissed, setDismissed] = useState(false);
  const [autoUpdate, setAutoUpdateState] = useState(false);
  const lastCheckedAt = useRef(0);
  const autoDownloadTriggered = useRef(false);

  const check = useCallback(async (silent = false) => {
    lastCheckedAt.current = Date.now();
    if (!silent) setState((prev) => ({ ...prev, stage: 'checking', error: undefined }));
    const next = await checkForUpdate();
    setState(next);
    if (next.stage === 'available') setDismissed(false);
  }, []);

  // Restore the saved preference and push it to the main process, which owns
  // the electron-updater flags. No-op off desktop.
  useEffect(() => {
    AsyncStorage.getItem(AUTO_UPDATE_KEY)
      .then((stored) => {
        const enabled = stored === 'true';
        setAutoUpdateState(enabled);
        desktop()?.setAutoUpdate(enabled);
      })
      .catch(() => {});
  }, []);

  const setAutoUpdate = useCallback((enabled: boolean) => {
    setAutoUpdateState(enabled);
    void AsyncStorage.setItem(AUTO_UPDATE_KEY, enabled ? 'true' : 'false').catch(() => {});
    desktop()?.setAutoUpdate(enabled);
  }, []);

  // In automatic mode the download starts as soon as an update is found; the
  // installer then runs silently on next quit unless the user restarts from
  // the banner.
  useEffect(() => {
    if (!autoUpdate || state.stage !== 'available') {
      autoDownloadTriggered.current = false;
      return;
    }
    if (autoDownloadTriggered.current) return;
    autoDownloadTriggered.current = true;
    void downloadUpdate();
  }, [autoUpdate, state.stage]);

  // Desktop download/install progress is pushed from the main process.
  useEffect(() => {
    if (!isDesktop()) return;
    return subscribeToDesktopEvents((event) => {
      setState((prev) => {
        switch (event.type) {
          case 'checking':
            return { ...prev, stage: 'checking', error: undefined };
          case 'available':
            return {
              ...prev,
              stage: 'available',
              latestVersion: event.version,
              releaseNotes: event.releaseNotes ?? prev.releaseNotes,
            };
          case 'not-available':
            return { ...prev, stage: 'up-to-date' };
          case 'progress':
            return { ...prev, stage: 'downloading', progress: event.percent };
          case 'downloaded':
            return { ...prev, stage: 'ready', progress: 100, latestVersion: event.version };
          case 'error':
            return { ...prev, stage: 'error', error: event.message };
          default:
            return prev;
        }
      });
    });
  }, []);

  // Check on mount, then periodically and whenever the app comes back to front.
  useEffect(() => {
    void check(true);
    const interval = setInterval(() => void check(true), POLL_INTERVAL_MS);

    const onAppStateChange = (status: AppStateStatus) => {
      if (status === 'active' && Date.now() - lastCheckedAt.current > POLL_INTERVAL_MS) {
        void check(true);
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [check]);

  const applyUpdate = useCallback(async () => {
    // An automatic download may already have finished — install straight away.
    if (state.stage !== 'ready') {
      setState((prev) => ({ ...prev, stage: 'downloading', progress: 0, error: undefined }));
      const result = await downloadUpdate();
      if (!result.ok) {
        setState((prev) => ({ ...prev, stage: 'error', error: result.error }));
        return;
      }
    }
    // On desktop the 'downloaded' event drives the transition to 'ready'; the
    // install below is what actually replaces the build and restarts.
    setState((prev) => ({ ...prev, stage: 'ready', progress: 100 }));
    await installUpdate();
  }, [state.stage]);

  const dismiss = useCallback(() => setDismissed(true), []);

  return (
    <UpdateContext.Provider
      value={{ ...state, check, applyUpdate, dismiss, dismissed, autoUpdate, setAutoUpdate }}
    >
      {children}
    </UpdateContext.Provider>
  );
}
