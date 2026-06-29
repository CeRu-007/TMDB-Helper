/**
 * 客户端配置管理器
 * 替代localStorage，所有配置都存储在服务端
 */

import { logger } from '@/lib/utils/logger';

// Constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const API_ENDPOINT = '/api/system/config';
const REQUEST_TIMEOUT = 10000; // 增加到10秒，避免服务器响应慢导致超时

// Client Config Manager Class
export class ClientConfigManager {
  private static cache: Map<string, unknown> = new Map();
  private static cacheExpiry: Map<string, number> = new Map();

  private static isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry) {
      return false;
    }
    return Date.now() < expiry;
  }

  private static updateCache(key: string, value: unknown): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + CACHE_DURATION);
  }

  private static getFromLocalStorage(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          logger.info(`🔄 [ClientConfigManager] 从localStorage恢复配置: ${key}`);
          this.updateCache(key, value);
          return value;
        }
      }
    } catch (error) {
      logger.warn('从localStorage读取配置失败:', error);
    }
    return null;
  }

  private static setToLocalStorage(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      logger.warn('保存配置到localStorage失败:', error);
    }
  }

  private static async fetchFromServer(key: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${API_ENDPOINT}?key=${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Server error');
      }

      return data.value;
    } catch (error) {
      clearTimeout(timeoutId);

      // 特殊处理 AbortError（超时错误）
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn(`获取配置项超时: ${key}`);
        throw new Error(`Request timeout for key: ${key}`);
      }

      throw error;
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      if (this.isCacheValid(key)) {
        const cachedValue = this.cache.get(key);
        return cachedValue !== undefined ? String(cachedValue) : null;
      }

      const value = await this.fetchFromServer(key);
      let valueToReturn = value;

      if (typeof value === 'object' && value !== null) {
        try {
          valueToReturn = JSON.stringify(value);
        } catch (error) {
          logger.error('JSON序列化失败:', error);
          return this.getFromLocalStorage(key);
        }
      }

      this.updateCache(key, valueToReturn);
      this.setToLocalStorage(key, String(valueToReturn));
      return valueToReturn !== undefined ? String(valueToReturn) : null;
    } catch (error) {
      logger.error('获取配置项失败，可能是服务不可用:', error);
      return this.getFromLocalStorage(key);
    }
  }

  static async setItem(key: string, value: string): Promise<boolean> {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', key, value }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        logger.warn(`设置配置失败: ${response.status} ${response.statusText}`);
        this.setToLocalStorage(key, value);
        return false;
      }

      const data = await response.json();
      if (data.success) {
        this.updateCache(key, value);
        this.setToLocalStorage(key, value);
        return true;
      }

      logger.warn('设置配置失败:', data.error);
      this.setToLocalStorage(key, value);
      return false;
    } catch (error) {
      logger.warn('设置配置失败:', error instanceof Error ? error.message : String(error));
      this.setToLocalStorage(key, value);
      return false;
    }
  }

  static async removeItem(key: string): Promise<boolean> {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', key }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        logger.warn(`删除配置失败: ${response.status} ${response.statusText}`);
        return false;
      }

      const data = await response.json();
      if (data.success) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
        return true;
      }

      logger.warn('删除配置失败:', data.error);
      return false;
    } catch (error) {
      logger.error('删除配置项失败:', error);
      return false;
    }
  }

  static async getConfig(): Promise<any> {
    try {
      const response = await fetch(API_ENDPOINT, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        logger.warn(`获取配置失败: ${response.status} ${response.statusText}`);
        return {};
      }

      const data = await response.json();
      return data.success ? data.fullConfig || data.config : {};
    } catch (error) {
      logger.error('获取完整配置失败:', error);
      return {};
    }
  }

  static async updateConfig(updates: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', updates }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        logger.warn(`更新配置失败: ${response.status} ${response.statusText}`);
        return false;
      }

      const data = await response.json();
      if (data.success) {
        Object.entries(updates).forEach(([key, value]) => {
          this.updateCache(key, value);
        });
        return true;
      }

      logger.warn('更新配置失败:', data.error);
      return false;
    } catch (error) {
      logger.error('更新配置项失败:', error);
      return false;
    }
  }

  static clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  static async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
      return response.ok;
    } catch (error) {
      logger.info(
        '🔍 [ClientConfigManager] 服务端不可用:',
        error instanceof Error ? error.message : '网络错误'
      );
      return false;
    }
  }

  static createLocalStorageAdapter() {
    return {
      getItem: (key: string) => this.getItem(key),
      setItem: (key: string, value: string) => this.setItem(key, value),
      removeItem: (key: string) => this.removeItem(key),
      clear: () => this.clearCache(),
    };
  }

  static async getItems(keys: string[]): Promise<Record<string, string | null>> {
    const promises = keys.map(async (key) => {
      const value = await this.getItem(key);
      return { key, value };
    });

    const results = await Promise.all(promises);
    return results.reduce(
      (acc, { key, value }) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string | null>
    );
  }

  static async setItems(items: Record<string, string>): Promise<boolean> {
    return this.updateConfig(items);
  }

  static async getConfigInfo(): Promise<any> {
    try {
      const response = await fetch(`${API_ENDPOINT}?info=true`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        logger.warn(`获取配置信息失败: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data.success ? data.info : null;
    } catch (error) {
      logger.error('获取配置文件信息失败:', error);
      return null;
    }
  }

  static async exportConfig(): Promise<string | null> {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        logger.warn(`导出配置失败: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data.success ? data.configJson : null;
    } catch (error) {
      logger.error('导出配置失败:', error);
      return null;
    }
  }

  static async importConfig(configJson: string): Promise<boolean> {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', configJson }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        logger.warn(`导入配置失败: ${response.status} ${response.statusText}`);
        return false;
      }

      const data = await response.json();
      if (data.success) {
        this.clearCache();
        return true;
      }

      logger.warn('导入配置失败:', data.error);
      return false;
    } catch (error) {
      logger.error('导入配置失败:', error);
      return false;
    }
  }

  static async resetToDefault(): Promise<boolean> {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        logger.warn(`重置配置失败: ${response.status} ${response.statusText}`);
        return false;
      }

      const data = await response.json();
      if (data.success) {
        this.clearCache();
        return true;
      }

      logger.warn('重置配置失败:', data.error);
      return false;
    } catch (error) {
      logger.error('重置配置失败:', error);
      return false;
    }
  }
}
