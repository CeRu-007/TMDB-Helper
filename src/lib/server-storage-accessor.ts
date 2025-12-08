import { ServerStorageService } from './server-storage-service';
import { TMDBItem } from './storage';

/**
 * 服务器端存储访问器
 * 专门用于服务器端代码直接访问文件系统，不会被客户端打包工具处理
 */
export class ServerStorageAccessor {
  /**
   * 服务器端直接获取所有项目
   */
  static getItems(): TMDBItem[] {
    return ServerStorageService.readItemsFromFile();
  }

  /**
   * 服务器端直接添加项目
   */
  static addItem(item: TMDBItem): boolean {
    return ServerStorageService.addItemToFile(item);
  }

  /**
   * 服务器端直接更新项目
   */
  static updateItem(item: TMDBItem): boolean {
    return ServerStorageService.updateItemToFile(item);
  }

  /**
   * 服务器端直接删除项目
   */
  static deleteItem(id: string): boolean {
    return ServerStorageService.deleteItemFromFile(id);
  }
}