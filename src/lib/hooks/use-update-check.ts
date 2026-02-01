import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { UpdateCheckResult, UpdateCheckOptions } from '@/types/updates';

interface UpdateCheckState extends UpdateCheckResult {
  isLoading: boolean;
  error: string | null;
}

const CACHE_KEY = 'update_check_result';
const CACHE_DURATION = 60 * 60 * 1000;

export function useUpdateCheck() {
  const [state, setState] = useState<UpdateCheckState>({
    hasUpdate: false,
    currentVersion: '',
    latestVersion: '',
    releaseInfo: null,
    lastChecked: '',
    isCached: false,
    isLoading: false,
    error: null,
  });

  const getCachedState = useCallback((): UpdateCheckState | null => {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      if (now - timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return {
        ...data,
        isLoading: false,
        error: null,
      };
    } catch {
      return null;
    }
  }, []);

  const saveCache = useCallback((data: UpdateCheckResult) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to save update cache:', error);
    }
  }, []);

  const checkForUpdates = useCallback(async (options: UpdateCheckOptions = {}) => {
    const { force = false, showToast = false } = options;

    if (!force) {
      const cached = getCachedState();
      if (cached) {
        setState(cached);
        return cached;
      }
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/updates/check?force=${force}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '检查更新失败');
      }

      const data: UpdateCheckResult = result.data;
      const newState: UpdateCheckState = {
        ...data,
        isLoading: false,
        error: null,
      };

      setState(newState);
      saveCache(data);

      if (showToast) {
        if (data.hasUpdate) {
          toast.success(`发现新版本 ${data.latestVersion}，快去看看吧！`, {
            description: '点击「版本更新」查看详情',
            duration: 5000,
          });
        } else if (data.isCached) {
          toast.info('当前已是最新版本（来自缓存）');
        } else {
          toast.success('当前已是最新版本');
        }
      }

      return newState;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '检查更新失败';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      if (showToast) {
        toast.error(errorMessage);
      }

      return null;
    }
  }, [getCachedState, saveCache]);

  const clearCache = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(CACHE_KEY);
    setState({
      hasUpdate: false,
      currentVersion: '',
      latestVersion: '',
      releaseInfo: null,
      lastChecked: '',
      isCached: false,
      isLoading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    const cached = getCachedState();
    if (cached) {
      setState(cached);
    }
  }, [getCachedState]);

  return {
    ...state,
    checkForUpdates,
    clearCache,
  };
}