import type { TMDBItem } from '@/types/tmdb-item';
import { TIMEOUT_15S } from '@/lib/constants/constants';

export class StorageBase {
  protected static readonly STORAGE_KEY = 'tmdb_helper_items';
  protected static readonly SCHEDULED_TASKS_KEY = 'tmdb_helper_scheduled_tasks';
  protected static readonly MAX_RETRIES = 3;
  protected static readonly RETRY_DELAY = 300; // 毫秒
  protected static readonly USE_FILE_STORAGE = true; // 始终使用文件存储
  protected static readonly API_BASE_URL = '/api/storage';

  // 缓存定时任务数据
  protected static scheduledTasksCache: {
    data: unknown[];
    timestamp: number;
    ttl: number; // 缓存有效期（毫秒）
  } | null = null;

  /**
   * 检查当前环境是否为客户端
   */
  protected static isClient(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * 检查存储是否可用（服务端存储总是可用）
   */
  protected static isStorageAvailable(): boolean {
    return true;
  }

  /**
   * 通用的API调用方法，带有超时和错误处理
   */
  protected static async makeApiCall(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_15S);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: 'no-cache',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_admin_system',
          ...(options.headers as Record<string, string>),
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('请求超时：API调用超过15秒未响应');
      }

      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
        throw new Error(
          isLocalhost
            ? '本地服务器连接失败：请确认Next.js开发服务器正在运行'
            : '网络连接失败：无法连接到服务器',
        );
      }

      const message = error instanceof Error ? error.message : '未知错误';
      throw new Error(`API调用失败: ${message}`);
    }
  }

  /**
   * 带重试机制的获取items方法
   */
  protected static async getItemsWithRetry(
    retries = this.MAX_RETRIES,
  ): Promise<TMDBItem[]> {
    if (!this.USE_FILE_STORAGE) {
      return [];
    }

    try {
      const response = await this.makeApiCall(`${this.API_BASE_URL}/items`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return (data.items || []) as TMDBItem[];
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
        return this.getItemsWithRetry(retries - 1);
      }
      return [];
    }
  }

  /**
   * 查找指定项目是否存在
   */
  protected static async findItemById(id: string): Promise<any | null> {
    try {
      const items = await this.getItemsWithRetry();
      const item = items.find((item) => item.id === id);
      return item || null;
    } catch (error) {
      return null;
    }
  }
}
