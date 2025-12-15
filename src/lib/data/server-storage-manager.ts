import { ServerStorageService } from './server-storage-service';
import { TMDBItem, ScheduledTask } from './storage';

/**
 * 服务器端存储管理器
 * 专门用于服务器端API路由，不会被客户端打包工具处理
 */
export class ServerStorageManager {
  /**
   * 获取所有项目
   */
  static getItems(): TMDBItem[] {
    return ServerStorageService.readItemsFromFile();
  }

  /**
   * 添加项目
   */
  static addItem(item: TMDBItem): boolean {
    return ServerStorageService.addItemToFile(item);
  }

  /**
   * 更新项目
   */
  static updateItem(item: TMDBItem): boolean {
    return ServerStorageService.updateItemToFile(item);
  }

  /**
   * 删除项目
   */
  static deleteItem(id: string): boolean {
    return ServerStorageService.deleteItemFromFile(id);
  }

  /**
   * 导入数据
   */
  static importData(items: TMDBItem[]): boolean {
    try {
      // 直接覆盖所有项目数据
      return ServerStorageService.writeItemsToFile(items);
    } catch (error) {
      console.error(`[ServerStorageManager] 导入数据失败:`, error);
      return false;
    }
  }

  /**
   * 导出数据
   */
  static exportData(): { items: TMDBItem[] } {
    try {
      const items = ServerStorageService.readItemsFromFile();
      return { items };
    } catch (error) {
      console.error(`[ServerStorageManager] 导出数据失败:`, error);
      return { items: [] };
    }
  }
}
