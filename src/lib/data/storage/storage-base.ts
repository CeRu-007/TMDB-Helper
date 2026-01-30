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
   * 检查开发环境状态
   */
  protected static checkDevelopmentEnvironment(): void {
    if (this.isClient()) {
      // 客户端环境检查
    }
  }

  /**
   * 检查存储是否可用（现在总是返回true，因为使用服务端存储）
   */
  protected static isStorageAvailable(): boolean {
    return true; // 服务端存储总是可用
  }

  /**
   * 通用的API调用方法，带有超时和错误处理（包含用户身份信息）
   */
  protected static async makeApiCall(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_15S); // 15秒超时

    // 简化的用户ID处理，使用默认值
    const userId = 'user_admin_system';
    // console.log(`[StorageBase] 发起API请求: ${url} (用户: ${userId})`);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      // 添加用户ID到请求头
      headers['x-user-id'] = userId;

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: 'no-cache',
        credentials: 'include',
        headers,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // 增强的错误处理和监控
      if (error instanceof DOMException && error.name === 'AbortError') {
        // 检查是否是我们主动中止的（超时）还是被意外中止的
        const isTimeout = controller.signal.aborted;
        const errorMessage = isTimeout
          ? '请求超时：API调用超过15秒未响应'
          : '请求被中止：可能由于网络问题或浏览器限制';

        // 移除了abortErrorMonitor，直接抛出错误

        throw new Error(errorMessage);
      } else if (
        error instanceof TypeError &&
        error.message.includes('Failed to fetch')
      ) {
        // 检查是否是本地开发环境
        const isLocalhost =
          url.includes('localhost') || url.includes('127.0.0.1');
        if (isLocalhost) {
          throw new Error(
            '本地服务器连接失败：请确认Next.js开发服务器正在运行 (npm run dev)',
          );
        } else {
          throw new Error('网络连接失败：无法连接到服务器');
        }
      } else if (error instanceof Error) {
        // 保留原始错误信息，但添加上下文
        throw new Error(`API调用失败 (${url}): ${error.message}`);
      } else {
        throw new Error(`API调用失败 (${url}): 未知错误`);
      }
    }
  }

  /**
   * 带重试机制的获取items方法
   * 注意：此方法现在完全通过API获取数据，不再直接访问文件系统
   */
  protected static async getItemsWithRetry(
    retries = this.MAX_RETRIES,
  ): Promise<TMDBItem[]> {
    // 首次调用时进行环境检查
    if (retries === this.MAX_RETRIES) {
      this.checkDevelopmentEnvironment();
    }

    // 客户端：调用API
    if (this.USE_FILE_STORAGE) {
      try {
        const response = await this.makeApiCall(`${this.API_BASE_URL}/items`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(
            `API请求失败: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();
        return (data.items || []) as TMDBItem[];
      } catch (error) {
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
          return this.getItemsWithRetry(retries - 1);
        }

        // 所有重试都失败后，返回空数组
        return [];
      }
    }

    // 如果不使用文件存储，返回空数组（localStorage已移除）
    return [];
  }

  /**
   * 降级到localStorage的方法
   */
  protected static fallbackToLocalStorage(): unknown[] {
    return [];
  }

  /**
   * 保存项目方法已移除（现在使用服务端存储）
   */
  protected static saveItems(items: unknown[]): void {
    // 已移除，现在使用服务端存储
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
