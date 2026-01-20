import { TMDBItem } from '@/lib/data/storage';

/**
 * 服务器端文件系统存储服务
 * 只在服务器端运行，处理文件系统操作
 */
export class ServerStorageService {
  private static readonly ADMIN_USER_ID = 'user_admin_system';

  // 缓存机制以减少文件I/O
  private static itemsCache: TMDBItem[] | null = null;
  private static cacheTimestamp: number | null = null;
  private static readonly CACHE_TTL = 5000; // 5秒缓存时间

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
   * 检查缓存是否仍然有效
   */
  private static isCacheValid(): boolean {
    return (
      this.cacheTimestamp !== null &&
      this.itemsCache !== null &&
      Date.now() - this.cacheTimestamp < this.CACHE_TTL
    );
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
      // 检查缓存
      if (this.isCacheValid()) {
        return [...this.itemsCache!]; // 返回副本以避免外部修改
      }

      const fs = require('fs');
      const { DATA_FILE } = ServerStorageService.getPaths();

      this.ensureDirectories();

      // 检查文件是否存在
      if (!fs.existsSync(DATA_FILE)) {
        // 更新缓存
        this.itemsCache = [];
        this.cacheTimestamp = Date.now();
        return [];
      }

      // 读取文件内容
      const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
      const items: TMDBItem[] = JSON.parse(fileContent);

      // 更新缓存
      this.itemsCache = items;
      this.cacheTimestamp = Date.now();

      return [...items]; // 返回副本以避免外部修改
    } catch (error) {
      // 如果读取失败，但缓存有效，返回缓存内容
      if (this.itemsCache !== null) {
        return [...this.itemsCache];
      }
      return [];
    }
  }

  /**
   * 清除缓存
   */
  private static clearCache(): void {
    this.itemsCache = null;
    this.cacheTimestamp = null;
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
      const serializedData = JSON.stringify(items, null, 2);
      fs.writeFileSync(DATA_FILE, serializedData, 'utf-8');

      // 更新缓存
      this.itemsCache = [...items];
      this.cacheTimestamp = Date.now();

      console.log(
        `[ServerStorageService] 成功写入 ${items.length} 个词条到文件系统`,
      );
      return true;
    } catch (error) {
      console.error(`[ServerStorageService] 写入数据到文件系统失败:`, error);
      // 写入失败时清除缓存，强制下次读取从文件获取
      this.clearCache();
      return false;
    }
  }

  /**
   * 添加单个项目到文件
   */
  static addItemToFile(item: TMDBItem): boolean {
    try {
      const items = this.readItemsFromFile(); // 使用缓存
      const existingIndex = items.findIndex((i) => i.id === item.id);

      if (existingIndex !== -1) {
        // 更新现有项目
        items[existingIndex] = item;
      } else {
        // 添加新项目
        items.push(item);
      }

      const result = this.writeItemsToFile(items);
      if (result) {
        console.log(`[ServerStorageService] 成功添加项目: ${item.title}`);
      }
      return result;
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
      const items = this.readItemsFromFile(); // 使用缓存
      const index = items.findIndex((i) => i.id === item.id);

      if (index === -1) {
        console.error(
          `[ServerStorageService] 更新失败: 找不到ID为 ${item.id} 的项目`,
        );
        return false;
      }

      items[index] = item;
      const result = this.writeItemsToFile(items);
      if (result) {
        console.log(`[ServerStorageService] 成功更新项目: ${item.title}`);
      }
      return result;
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
      const items = this.readItemsFromFile(); // 使用缓存
      const filteredItems = items.filter((i) => i.id !== id);

      if (filteredItems.length === items.length) {
        console.error(
          `[ServerStorageService] 删除失败: 找不到ID为 ${id} 的项目`,
        );
        return false;
      }

      const result = this.writeItemsToFile(filteredItems);
      if (result) {
        console.log(`[ServerStorageService] 成功删除项目ID: ${id}`);
      }
      return result;
    } catch (error) {
      console.error(`[ServerStorageService] 从文件删除项目失败:`, error);
      return false;
    }
  }

  /**
   * 预加载缓存
   */
  static preloadCache(): void {
    try {
      this.readItemsFromFile(); // 这会自动填充缓存
      console.log(`[ServerStorageService] 缓存预加载完成`);
    } catch (error) {
      console.error(`[ServerStorageService] 缓存预加载失败:`, error);
    }
  }

  /**
   * 获取当前缓存状态
   */
  static getCacheStatus(): {
    isValid: boolean;
    itemCount: number;
    ageMs: number | null;
  } {
    return {
      isValid: this.isCacheValid(),
      itemCount: this.itemsCache?.length || 0,
      ageMs: this.cacheTimestamp ? Date.now() - this.cacheTimestamp : null,
    };
  }
}
