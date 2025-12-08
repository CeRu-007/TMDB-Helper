import { TMDBItem } from '@/lib/storage';

/**
 * 服务器端文件系统存储服务
 * 只在服务器端运行，处理文件系统操作
 */
export class ServerStorageService {
  private static readonly ADMIN_USER_ID = 'user_admin_system';

  /**
   * 获取文件路径
   */
  private static getPaths() {
    const path = require('path');
    const DATA_DIR = path.join(process.cwd(), 'data');
    const USERS_DIR = path.join(DATA_DIR, 'users');
    const USER_DIR = path.join(USERS_DIR, ServerStorageService.ADMIN_USER_ID);
    const DATA_FILE = path.join(USER_DIR, 'tmdb_items.json');
    
    return { DATA_DIR, USERS_DIR, USER_DIR, DATA_FILE };
  }

  /**
   * 确保数据目录存在
   */
  private static ensureDirectories(): void {
    const fs = require('fs');
    const { DATA_DIR, USERS_DIR, USER_DIR } = ServerStorageService.getPaths();
    
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(USERS_DIR)) {
      fs.mkdirSync(USERS_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(USER_DIR)) {
      fs.mkdirSync(USER_DIR, { recursive: true });
    }
  }

  /**
   * 从文件系统读取所有项目
   */
  static readItemsFromFile(): TMDBItem[] {
    try {
      const fs = require('fs');
      const { DATA_FILE } = ServerStorageService.getPaths();
      
      this.ensureDirectories();
      
      // 检查文件是否存在
      if (!fs.existsSync(DATA_FILE)) {
        console.log(`[ServerStorageService] 数据文件不存在: ${DATA_FILE}`);
        return [];
      }

      // 读取文件内容
      const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
      const items = JSON.parse(fileContent);

      console.log(`[ServerStorageService] 成功从文件系统读取 ${items.length} 个词条`);
      return items;
    } catch (error) {
      console.error(`[ServerStorageService] 从文件系统读取数据失败:`, error);
      return [];
    }
  }

  /**
   * 将所有项目写入文件系统
   */
  static writeItemsToFile(items: TMDBItem[]): boolean {
    try {
      const fs = require('fs');
      const { DATA_FILE } = ServerStorageService.getPaths();
      
      this.ensureDirectories();
      
      // 将数据写入文件
      fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
      
      console.log(`[ServerStorageService] 成功写入 ${items.length} 个词条到文件系统`);
      return true;
    } catch (error) {
      console.error(`[ServerStorageService] 写入数据到文件系统失败:`, error);
      return false;
    }
  }

  /**
   * 添加单个项目到文件
   */
  static addItemToFile(item: TMDBItem): boolean {
    try {
      const items = this.readItemsFromFile();
      const existingIndex = items.findIndex(i => i.id === item.id);
      
      if (existingIndex !== -1) {
        // 更新现有项目
        items[existingIndex] = item;
      } else {
        // 添加新项目
        items.push(item);
      }
      
      return this.writeItemsToFile(items);
    } catch (error) {
      console.error(`[ServerStorageService] 添加项目到文件失败:`, error);
      return false;
    }
  }

  /**
   * 更新单个项目到文件
   */
  static updateItemToFile(item: TMDBItem): boolean {
    try {
      const items = this.readItemsFromFile();
      const index = items.findIndex(i => i.id === item.id);
      
      if (index === -1) {
        console.error(`[ServerStorageService] 更新失败: 找不到ID为 ${item.id} 的项目`);
        return false;
      }
      
      items[index] = item;
      return this.writeItemsToFile(items);
    } catch (error) {
      console.error(`[ServerStorageService] 更新项目到文件失败:`, error);
      return false;
    }
  }

  /**
   * 从文件删除单个项目
   */
  static deleteItemFromFile(id: string): boolean {
    try {
      const items = this.readItemsFromFile();
      const filteredItems = items.filter(i => i.id !== id);
      
      if (filteredItems.length === items.length) {
        console.error(`[ServerStorageService] 删除失败: 找不到ID为 ${id} 的项目`);
        return false;
      }
      
      return this.writeItemsToFile(filteredItems);
    } catch (error) {
      console.error(`[ServerStorageService] 从文件删除项目失败:`, error);
      return false;
    }
  }
}