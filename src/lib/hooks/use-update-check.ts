import { useState, useCallback, useEffect, useRef } from 'react';
import { UpdateCheckResult, UpdateCheckOptions } from '@/types/updates';

interface UpdateCheckState extends UpdateCheckResult {
  isLoading: boolean;
  error: string | null;
}

const CACHE_KEY = 'update_check_result';
const NOTIFIED_VERSIONS_KEY = 'update_notified_versions';
const DISMISSED_VERSIONS_KEY = 'update_dismissed_versions';
const CACHE_DURATION = 4 * 60 * 60 * 1000;
const POLLING_INTERVAL = 4 * 60 * 60 * 1000;
const INITIAL_DELAY = 5 * 1000;

let globalState: UpdateCheckState | null = null;
let globalListeners: Set<(state: UpdateCheckState) => void> = new Set();
let pollingTimer: NodeJS.Timeout | null = null;
let hasInitialized = false;

function notifyListeners(state: UpdateCheckState) {
  globalState = state;
  globalListeners.forEach(listener => listener(state));
}

function getNotifiedVersions(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(NOTIFIED_VERSIONS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveNotifiedVersion(version: string) {
  if (typeof window === 'undefined') return;
  try {
    const versions = getNotifiedVersions();
    versions.add(version);
    localStorage.setItem(NOTIFIED_VERSIONS_KEY, JSON.stringify([...versions]));
  } catch {}
}

function getDismissedVersions(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(DISMISSED_VERSIONS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveDismissedVersion(version: string) {
  if (typeof window === 'undefined') return;
  try {
    const versions = getDismissedVersions();
    versions.add(version);
    localStorage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify([...versions]));
  } catch {}
}

export function isVersionDismissed(version: string): boolean {
  return getDismissedVersions().has(version);
}

function getCachedState(): UpdateCheckState | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return { ...data, isLoading: false, error: null };
  } catch {
    return null;
  }
}

function saveCache(data: UpdateCheckResult) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

function dispatchUpdateEvent(data: UpdateCheckResult) {
  if (!data.hasUpdate || !data.latestVersion) return

  const notified = getNotifiedVersions()
  const dismissed = getDismissedVersions()

  if (!notified.has(data.latestVersion) && !dismissed.has(data.latestVersion)) {
    saveNotifiedVersion(data.latestVersion)
    window.dispatchEvent(new CustomEvent('version-update-available', {
      detail: {
        currentVersion: data.currentVersion,
        latestVersion: data.latestVersion,
        releaseInfo: data.releaseInfo,
      },
    }))
  }
}

async function performCheck(options: UpdateCheckOptions = {}): Promise<UpdateCheckState | null> {
  const { force = false } = options;

  if (!force) {
    const cached = getCachedState();
    if (cached) {
      notifyListeners(cached);
      dispatchUpdateEvent(cached);
      return cached;
    }
  }

  const loadingState: UpdateCheckState = {
    hasUpdate: globalState?.hasUpdate || false,
    currentVersion: globalState?.currentVersion || '',
    latestVersion: globalState?.latestVersion || '',
    releaseInfo: globalState?.releaseInfo || null,
    lastChecked: globalState?.lastChecked || '',
    isCached: false,
    isLoading: true,
    error: null,
  };
  notifyListeners(loadingState);

  try {
    const response = await fetch(`/api/updates/check?force=${force}`, { cache: 'no-store' });
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '检查更新失败');
    }

    const data: UpdateCheckResult = result.data;
    const newState: UpdateCheckState = {
      ...data,
      isCached: force ? false : data.isCached,
      isLoading: false,
      error: null,
    };

    saveCache(data);
    notifyListeners(newState);
    dispatchUpdateEvent(data);

    return newState;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '检查更新失败';
    const errorState: UpdateCheckState = {
      hasUpdate: globalState?.hasUpdate || false,
      currentVersion: globalState?.currentVersion || '',
      latestVersion: globalState?.latestVersion || '',
      releaseInfo: globalState?.releaseInfo || null,
      lastChecked: globalState?.lastChecked || '',
      isCached: false,
      isLoading: false,
      error: errorMessage,
    };
    notifyListeners(errorState);
    return null;
  }
}

function startGlobalPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(() => {
    performCheck();
  }, POLLING_INTERVAL);
}

function stopGlobalPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

function initializeGlobalCheck() {
  if (hasInitialized) return;
  hasInitialized = true;

  const cached = getCachedState();
  if (cached) {
    notifyListeners(cached);
    dispatchUpdateEvent(cached);
  }

  setTimeout(() => {
    performCheck();
  }, INITIAL_DELAY);

  startGlobalPolling();

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      const cached = getCachedState();
      if (!cached) {
        performCheck();
      }
      startGlobalPolling();
    } else {
      stopGlobalPolling();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
}

export function useUpdateCheck() {
  const [state, setState] = useState<UpdateCheckState>(globalState || {
    hasUpdate: false,
    currentVersion: '',
    latestVersion: '',
    releaseInfo: null,
    lastChecked: '',
    isCached: false,
    isLoading: false,
    error: null,
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    globalListeners.add(setState);

    if (isFirstRender.current) {
      isFirstRender.current = false;
      initializeGlobalCheck();
    }

    return () => {
      globalListeners.delete(setState);
    };
  }, []);

  const checkForUpdates = useCallback(async (options: UpdateCheckOptions = {}) => {
    return performCheck(options);
  }, []);

  return {
    ...state,
    checkForUpdates,
  };
}
