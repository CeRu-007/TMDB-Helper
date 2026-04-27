import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { UpdateCheckResult, UpdateCheckOptions } from '@/types/updates';

interface UpdateCheckState extends UpdateCheckResult {
  isLoading: boolean;
  error: string | null;
}

const CACHE_KEY = 'update_check_result';
const CACHE_DURATION = 60 * 60 * 1000; // 1小时缓存
const POLLING_INTERVAL = 30 * 60 * 1000; // 30分钟轮询一次
const INITIAL_DELAY = 5 * 1000; // 首次加载延迟5秒检查

// 全局状态，避免多个组件重复请求
let globalState: UpdateCheckState | null = null;
let globalListeners: Set<(state: UpdateCheckState) => void> = new Set();
let pollingTimer: NodeJS.Timeout | null = null;
let hasInitialized = false;

// 通知所有监听器
function notifyListeners(state: UpdateCheckState) {
  globalState = state;
  globalListeners.forEach(listener => listener(state));
}

// 获取缓存数据
function getCachedState(): UpdateCheckState | null {
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
}

// 保存缓存
function saveCache(data: UpdateCheckResult) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    // 隐私模式或存储已满时，静默失败
    if (error instanceof DOMException && (
      error.name === 'QuotaExceededError' ||
      error.name === 'SecurityError'
    )) {
      console.warn('无法保存更新缓存（隐私模式或存储已满）:', error);
    } else {
      console.error('Failed to save update cache:', error);
    }
  }
}

// 执行检查
async function performCheck(options: UpdateCheckOptions = {}): Promise<UpdateCheckState | null> {
  const { force = false, silent = false, showToast = false } = options;

  if (!force) {
    const cached = getCachedState();
    if (cached) {
      notifyListeners(cached);
      return cached;
    }
  }

  // 设置加载状态
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
    const response = await fetch(`/api/updates/check?force=${force}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '检查更新失败');
    }

    const data: UpdateCheckResult = result.data;
    const newState: UpdateCheckState = {
      ...data,
      // 强制检查时，明确设置为非缓存状态
      isCached: force ? false : data.isCached,
      isLoading: false,
      error: null,
    };

    saveCache(data);
    notifyListeners(newState);

    // 只在非静默模式下显示提示
    if (!silent && data.hasUpdate) {
      if (showToast) {
        toast.success(`发现新版本 ${data.latestVersion}，快去看看吧！`, {
          description: '点击「版本更新」查看详情',
          duration: 5000,
        });
      } else {
        // 自动检查时，显示温和提示
        toast.info(`发现新版本 ${data.latestVersion}`, {
          description: '前往「设置 → 帮助与支持 → 版本更新」查看详情',
          duration: 8000,
          action: {
            label: '查看',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('open-settings-dialog', { detail: { section: 'help' } }));
            },
          },
        });
      }
    }

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

    if (showToast && !silent) {
      toast.error(errorMessage);
    }

    return null;
  }
}

// 启动全局轮询
function startGlobalPolling() {
  if (pollingTimer) return; // 已经在轮询

  pollingTimer = setInterval(() => {
    performCheck({ silent: true });
  }, POLLING_INTERVAL);
}

// 停止全局轮询
function stopGlobalPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

// 初始化全局检查
function initializeGlobalCheck() {
  if (hasInitialized) return;
  hasInitialized = true;

  // 从缓存读取
  const cached = getCachedState();
  if (cached) {
    notifyListeners(cached);
  }

  // 延迟首次检查
  setTimeout(() => {
    performCheck({ silent: true });
  }, INITIAL_DELAY);

  // 启动轮询
  startGlobalPolling();

  // 监听页面可见性
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      const cached = getCachedState();
      if (!cached) {
        performCheck({ silent: true });
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
    // 订阅全局状态变化
    globalListeners.add(setState);

    // 首次渲染时初始化
    if (isFirstRender.current) {
      isFirstRender.current = false;
      initializeGlobalCheck();
    }

    // 清理时取消订阅
    return () => {
      globalListeners.delete(setState);
    };
  }, []);

  const checkForUpdates = useCallback(async (options: UpdateCheckOptions = {}) => {
    return performCheck(options);
  }, []);

  const clearCache = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(CACHE_KEY);
    const emptyState: UpdateCheckState = {
      hasUpdate: false,
      currentVersion: '',
      latestVersion: '',
      releaseInfo: null,
      lastChecked: '',
      isCached: false,
      isLoading: false,
      error: null,
    };
    notifyListeners(emptyState);
  }, []);

  return {
    ...state,
    checkForUpdates,
    clearCache,
  };
}
