/**
 * 项目管理器 - 处理TMDB项目的增删改查
 */
export class ItemManager {
  private static readonly API_BASE_URL = '/api/storage';
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 300;

  /**
   * 检查当前环境是否为客户端
   */
  static isClient(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * 通用的API调用方法，带有超时和错误处理
   */
  private static async makeApiCall(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

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
   */
  static async getItemsWithRetry(
    retries = this.MAX_RETRIES,
  ): Promise<unknown[]> {
    // 客户端：调用API
    if (typeof window !== 'undefined') {
      try {
        const response = await ItemManager.makeApiCall(`${ItemManager.API_BASE_URL}/items`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(
            `API请求失败: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();
        return data.items || [];
      } catch (_error) {
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, ItemManager.RETRY_DELAY));
          return ItemManager.getItemsWithRetry(retries - 1);
        }

        // 所有重试都失败后，返回空数组
        return [];
      }
    }

    // 服务端：返回空数组
    return [];
  }

  /**
   * 同步获取所有项目
   */
  static getItems(): unknown[] {
    return [];
  }

  /**
   * 添加新项目
   */
  static async addItem(item: unknown): Promise<boolean> {
    // 使用文件存储
    if (typeof window !== 'undefined') {
      try {
        const response = await this.makeApiCall(`${this.API_BASE_URL}/item`, {
          method: 'POST',
          body: JSON.stringify({ item }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `API请求失败: ${response.status} ${response.statusText}`,
          );
        }

        return true;
      } catch (error) {
        console.error('[ItemManager] 添加项目失败:', error);
        return false;
      }
    }
    // 不再使用localStorage，只使用服务端存储
    return false;
  }

  /**
   * 更新项目
   */
  static async updateItem(updatedItem: unknown): Promise<boolean> {
    // 使用文件存储
    if (typeof window !== 'undefined') {
      try {
        console.log(
          `[ItemManager] 开始更新项目: ${updatedItem.title} (ID: ${updatedItem.id})`,
        );

        const response = await this.makeApiCall(`${this.API_BASE_URL}/item`, {
          method: 'PUT',
          body: JSON.stringify({ item: updatedItem }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `API请求失败: ${response.status} ${response.statusText} - ${errorText}`,
          );
        }

        return true;
      } catch (_error) {
        // 如果是 AbortError，提供更友好的错误信息
        // 移除console语句，使用更安全的日志记录方式

        return false;
      }
    }
    // 使用原始的localStorage方法
    if (!this.isClient()) {
      return false;
    }
    try {
      const items = this.getItems();
      const index = items.findIndex((item) => item.id === updatedItem.id);
      if (index !== -1) {
        items[index] = updatedItem;
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 删除项目
   */
  static async deleteItem(id: string): Promise<boolean> {
    // 使用文件存储
    if (typeof window !== 'undefined') {
      try {
        const response = await this.makeApiCall(
          `${this.API_BASE_URL}/item?id=${encodeURIComponent(id)}`,
          { method: 'DELETE' },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `API请求失败: ${response.status} ${response.statusText} - ${errorText}`,
          );
        }

        return true;
      } catch (_error) {
        // 如果是 AbortError，提供更友好的错误信息
        // 移除console语句，使用更安全的日志记录方式

        return false;
      }
    }

    // 不再使用localStorage，只使用服务端存储
    return false;
  }

  /**
   * 查找指定项目是否存在
   */
  static async findItemById(id: string): Promise<unknown | null> {
    try {
      const items = await this.getItemsWithRetry();
      const item = items.find((item) => item.id === id);
      return item || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查系统中是否有任何项目可用
   */
  static async hasAnyItems(): Promise<boolean> {
    try {
      const items = await this.getItemsWithRetry();
      return items.length > 0;
    } catch (_error) {
      return false;
    }
  }
}
