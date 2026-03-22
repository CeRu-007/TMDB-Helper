import type { TMDBItem } from '@/types/tmdb-item';
import { TIMEOUT_15S } from '@/lib/constants/constants';

export class StorageBase {
  protected static readonly STORAGE_KEY = 'tmdb_helper_items';
  protected static readonly MAX_RETRIES = 3;
  protected static readonly RETRY_DELAY = 300; // 毫秒
  protected static readonly USE_FILE_STORAGE = true; // 始终使用文件存储
  protected static readonly API_BASE_URL = '/api/storage';

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
          ...options.headers,
        },
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
