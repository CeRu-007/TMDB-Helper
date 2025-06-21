export interface Episode {
  number: number
  completed: boolean
  seasonNumber?: number // 添加季数标识
}

export interface Season {
  seasonNumber: number
  name: string
  totalEpisodes: number
  episodes: Episode[]
  posterUrl?: string
}

export interface ScheduledTask {
  id: string
  itemId: string
  name: string
  type: "tmdb-import"
  schedule: {
    type: "weekly" | "daily"
    dayOfWeek?: number // 0-6，周一到周日，仅weekly类型需要
    hour: number // 0-23
    minute: number // 0-59
  }
  action: {
    seasonNumber: number
    autoUpload: boolean
    autoRemoveMarked: boolean
    autoConfirm?: boolean // 新增：自动确认上传（输入y）
    removeIqiyiAirDate?: boolean // 新增：删除爱奇艺平台的air_date列
    autoMarkUploaded?: boolean // 新增：自动标记已上传的集数
  }
  enabled: boolean
  lastRun?: string
  nextRun?: string
  lastRunStatus?: "success" | "failed" // 新增：最后执行状态
  lastRunError?: string | null // 新增：最后执行错误信息
  createdAt: string
  updatedAt: string
}

export interface TMDBItem {
  id: string
  title: string
  mediaType: "movie" | "tv"
  tmdbId: string
  tmdbUrl?: string
  posterUrl?: string
  weekday: number // 0-6 (Sunday-Saturday)
  secondWeekday?: number // 第二播出日（用于一周两更的动漫）
  airTime?: string // 播出时间，格式如 "19:00"
  isDailyUpdate?: boolean // 是否为每日更新的内容
  totalEpisodes?: number // 总集数（所有季的总和）
  manuallySetEpisodes?: boolean // 标记总集数是否为手动设置
  seasons?: Season[] // 多季数据
  episodes?: Episode[] // 保留兼容性，用于单季或总集数
  completed: boolean
  status: "ongoing" | "completed"
  platformUrl?: string
  maintenanceCode?: string
  notes?: string
  category?: "anime" | "tv" | "kids" | "variety" | "short" | "movie" // 添加分类字段
  scheduledTasks?: ScheduledTask[] // 添加定时任务
  createdAt: string
  updatedAt: string
}

export class StorageManager {
  private static readonly STORAGE_KEY = "tmdb_helper_items"
  private static readonly SCHEDULED_TASKS_KEY = "tmdb_helper_scheduled_tasks" // 添加定时任务存储键
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 300 // 毫秒
  private static readonly USE_FILE_STORAGE = false // 控制是否使用文件存储
  private static readonly API_BASE_URL = "/api/storage"

  /**
   * 检查当前环境是否为客户端
   */
  static isClient(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /**
   * 检查localStorage是否可用
   */
  static isStorageAvailable(): boolean {
    if (!this.isClient()) {
      return false;
    }

    try {
      const testKey = "__storage_test__";
      localStorage.setItem(testKey, testKey);
      const result = localStorage.getItem(testKey) === testKey;
      localStorage.removeItem(testKey);
      return result;
    } catch (e) {
      return false;
    }
  }

  /**
   * 带重试机制的获取items方法
   */
  static async getItemsWithRetry(retries = this.MAX_RETRIES): Promise<TMDBItem[]> {
    // 如果使用文件存储，则调用API
    if (this.USE_FILE_STORAGE) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/items`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.items || [];
      } catch (error) {
        console.error('从API获取数据失败:', error);
        
        if (retries > 0) {
          console.log(`重试获取数据... (剩余${retries}次尝试)`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          return this.getItemsWithRetry(retries - 1);
        }
        
        return [];
      }
    }
    
    // 使用原始的localStorage方法
    if (!this.isClient()) {
      console.warn("Not in client environment, cannot access localStorage");
      await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
      if (retries > 0) {
        return this.getItemsWithRetry(retries - 1);
      }
      return [];
    }

    try {
      // 如果localStorage不可用，等待一段时间后重试
      if (!this.isStorageAvailable()) {
        if (retries > 0) {
          console.log(`Storage not available, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          return this.getItemsWithRetry(retries - 1);
        } else {
          console.error("Storage is not available after multiple attempts");
          return [];
        }
      }

      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      
      try {
        const parsedData = JSON.parse(data);
        return Array.isArray(parsedData) ? parsedData : [];
      } catch (parseError) {
        console.error("Failed to parse storage data:", parseError);
        return [];
      }
    } catch (error) {
      console.error("Failed to load items from storage:", error);
      if (retries > 0) {
        console.log(`Error loading data, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.getItemsWithRetry(retries - 1);
      }
      return [];
    }
  }

  /**
   * 同步获取所有项目
   */
  static getItems(): TMDBItem[] {
    // 如果使用文件存储但在客户端调用同步方法，返回空数组并警告
    if (this.USE_FILE_STORAGE) {
      console.warn("使用文件存储时，请使用异步getItemsWithRetry方法获取数据");
      return [];
    }
    
    if (!this.isClient()) {
      console.warn("Not in client environment, cannot access localStorage");
      return [];
    }
    
    try {
      if (!this.isStorageAvailable()) {
        console.warn("localStorage is not available");
        return [];
      }
      
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("Failed to load items from storage:", error)
      return []
    }
  }

  /**
   * 添加新项目
   */
  static async addItem(item: TMDBItem): Promise<boolean> {
    // 使用文件存储
    if (this.USE_FILE_STORAGE) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/item`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ item }),
        });

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }

        return true;
      } catch (error) {
        console.error('添加项目失败:', error);
        return false;
      }
    }
    
    // 使用原始的localStorage方法
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.error("Cannot add item: localStorage is not available");
      return false;
    }
    
    try {
      const items = this.getItems()
      items.push(item)
      this.saveItems(items)
      return true;
    } catch (error) {
      console.error("Failed to add item:", error);
      return false;
    }
  }

  /**
   * 更新项目
   */
  static async updateItem(updatedItem: TMDBItem): Promise<boolean> {
    // 使用文件存储
    if (this.USE_FILE_STORAGE) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/item`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ item: updatedItem }),
        });

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }

        return true;
      } catch (error) {
        console.error('更新项目失败:', error);
        return false;
      }
    }
    
    // 使用原始的localStorage方法
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.error("Cannot update item: localStorage is not available");
      return false;
    }
    
    try {
      const items = this.getItems()
      const index = items.findIndex((item) => item.id === updatedItem.id)
      if (index !== -1) {
        items[index] = updatedItem
        this.saveItems(items)
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update item:", error);
      return false;
    }
  }

  /**
   * 删除项目
   */
  static async deleteItem(id: string): Promise<boolean> {
    // 使用文件存储
    if (this.USE_FILE_STORAGE) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/item?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }

        return true;
      } catch (error) {
        console.error('删除项目失败:', error);
        return false;
      }
    }
    
    // 使用原始的localStorage方法
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.error("Cannot delete item: localStorage is not available");
      return false;
    }
    
    try {
      const items = this.getItems()
      const filteredItems = items.filter((item) => item.id !== id)
      this.saveItems(filteredItems)
      return true;
    } catch (error) {
      console.error("Failed to delete item:", error);
      return false;
    }
  }

  /**
   * 保存项目到localStorage
   */
  private static saveItems(items: TMDBItem[]): void {
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.error("Cannot save items: localStorage is not available");
      return;
    }
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error("Failed to save items to storage:", error)
    }
  }

  /**
   * 导出数据
   */
  static async exportData(): Promise<string> {
      try {
      const items = await this.getItemsWithRetry();
      const tasks = await this.getScheduledTasks();
      
      const exportData = {
        items,
        tasks,
        version: "1.0.0",
        exportDate: new Date().toISOString()
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error("Failed to export data:", error);
      throw error;
    }
  }

  /**
   * 导入数据
   */
  static async importData(jsonData: string): Promise<boolean> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.error("Cannot import data: localStorage is not available");
      return false;
    }
    
    try {
      const data = JSON.parse(jsonData);
      
      // 验证数据格式
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error("Invalid data format: items array is missing");
      }
      
      // 保存项目数据
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data.items));
      
      // 如果有定时任务数据，保存它
      if (data.tasks && Array.isArray(data.tasks)) {
        localStorage.setItem(this.SCHEDULED_TASKS_KEY, JSON.stringify(data.tasks));
      }
      
      return true;
    } catch (error) {
      console.error("Failed to import data:", error);
      return false;
    }
  }

  /**
   * 获取所有定时任务
   */
  static async getScheduledTasks(): Promise<ScheduledTask[]> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.warn("Not in client environment or storage not available");
      return [];
    }
    
    try {
      const data = localStorage.getItem(this.SCHEDULED_TASKS_KEY);
      console.log(`[StorageManager] 读取定时任务: 找到 ${data ? JSON.parse(data).length : 0} 个任务`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Failed to load scheduled tasks from storage:", error);
      return [];
    }
  }

  /**
   * 添加定时任务
   */
  static async addScheduledTask(task: ScheduledTask): Promise<boolean> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.error("Cannot add scheduled task: localStorage is not available");
      return false;
    }
    
    try {
      // 验证任务的必要字段
      if (!task.id || !task.itemId) {
        console.error("添加定时任务失败: 缺少必要字段 id 或 itemId");
        return false;
      }
      
      console.log(`[StorageManager] 添加定时任务: ID=${task.id}, 项目ID=${task.itemId}, 名称=${task.name}`);
      
      // 验证关联的项目是否存在
      const items = await this.getItemsWithRetry();
      const itemExists = items.some(item => item.id === task.itemId);
      
      if (!itemExists) {
        console.warn(`[StorageManager] 添加定时任务警告: ID为 ${task.itemId} 的项目不存在，但仍将保存任务`);
        // 我们仍然保存任务，因为项目可能稍后会被添加，或者这是一个导入操作
      }
      
      const tasks = await this.getScheduledTasks();
      
      // 检查是否已存在相同ID的任务
      const taskExists = tasks.some(t => t.id === task.id);
      if (taskExists) {
        console.warn(`[StorageManager] 添加定时任务警告: ID为 ${task.id} 的任务已存在，将更新现有任务`);
        return this.updateScheduledTask(task);
      }
      
      tasks.push(task);
      localStorage.setItem(this.SCHEDULED_TASKS_KEY, JSON.stringify(tasks));
      
      // 验证任务是否已成功保存
      const savedTasks = await this.getScheduledTasks();
      const taskSaved = savedTasks.some(t => t.id === task.id);
      
      if (taskSaved) {
        console.log(`[StorageManager] 定时任务保存成功: ID=${task.id}`);
        return true;
      } else {
        console.error(`[StorageManager] 定时任务保存失败: ID=${task.id}, 任务未在存储中找到`);
        return false;
      }
    } catch (error) {
      console.error("[StorageManager] Failed to add scheduled task:", error);
      return false;
    }
  }

  /**
   * 更新定时任务
   */
  static async updateScheduledTask(updatedTask: ScheduledTask): Promise<boolean> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.error("Cannot update scheduled task: localStorage is not available");
      return false;
    }
    
    try {
      // 验证任务的必要字段
      if (!updatedTask.id || !updatedTask.itemId) {
        console.error("更新定时任务失败: 缺少必要字段 id 或 itemId");
        return false;
      }
      
      console.log(`[StorageManager] 更新定时任务: ID=${updatedTask.id}, 项目ID=${updatedTask.itemId}, 名称=${updatedTask.name}`);
      
      // 验证关联的项目是否存在
      const items = await this.getItemsWithRetry();
      const itemExists = items.some(item => item.id === updatedTask.itemId);
      
      if (!itemExists) {
        console.warn(`[StorageManager] 更新定时任务警告: ID为 ${updatedTask.itemId} 的项目不存在，但仍将更新任务`);
        // 我们仍然更新任务，因为项目可能稍后会被添加，或者这是一个导入操作
      }
      
      const tasks = await this.getScheduledTasks();
      
      // 检查任务是否存在
      const taskExists = tasks.some(t => t.id === updatedTask.id);
      if (!taskExists) {
        console.warn(`[StorageManager] 更新定时任务警告: ID为 ${updatedTask.id} 的任务不存在，将添加新任务`);
        return this.addScheduledTask(updatedTask);
      }
      
      const updatedTasks = tasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      );
      localStorage.setItem(this.SCHEDULED_TASKS_KEY, JSON.stringify(updatedTasks));
      
      // 验证任务是否已成功更新
      const savedTasks = await this.getScheduledTasks();
      const taskUpdated = savedTasks.some(t => 
        t.id === updatedTask.id && t.updatedAt === updatedTask.updatedAt
      );
      
      if (taskUpdated) {
        console.log(`[StorageManager] 定时任务更新成功: ID=${updatedTask.id}`);
        return true;
      } else {
        console.error(`[StorageManager] 定时任务更新失败: ID=${updatedTask.id}, 任务未在存储中更新`);
        return false;
      }
    } catch (error) {
      console.error("[StorageManager] Failed to update scheduled task:", error);
      return false;
    }
  }

  /**
   * 删除定时任务
   */
  static async deleteScheduledTask(id: string): Promise<boolean> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.error("[StorageManager] Cannot delete scheduled task: localStorage is not available");
      return false;
    }
    
    try {
      console.log(`[StorageManager] 删除定时任务: ID=${id}`);
      const tasks = await this.getScheduledTasks();
      const filteredTasks = tasks.filter(task => task.id !== id);
      localStorage.setItem(this.SCHEDULED_TASKS_KEY, JSON.stringify(filteredTasks));
      
      // 验证任务是否已成功删除
      const savedTasks = await this.getScheduledTasks();
      const taskDeleted = !savedTasks.some(t => t.id === id);
      
      if (taskDeleted) {
        console.log(`[StorageManager] 定时任务删除成功: ID=${id}`);
        return true;
      } else {
        console.error(`[StorageManager] 定时任务删除失败: ID=${id}, 任务仍在存储中`);
        return false;
      }
    } catch (error) {
      console.error("[StorageManager] Failed to delete scheduled task:", error);
      return false;
    }
  }

  /**
   * 强制刷新定时任务列表
   */
  static async forceRefreshScheduledTasks(): Promise<ScheduledTask[]> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.warn("[StorageManager] Not in client environment or storage not available");
      return [];
    }
    
    try {
      // 清除可能的缓存
      const data = localStorage.getItem(this.SCHEDULED_TASKS_KEY);
      console.log(`[StorageManager] 强制刷新定时任务: 找到 ${data ? JSON.parse(data).length : 0} 个任务`);
      
      const raw = data ? JSON.parse(data) : [];
      // 自动迁移并返回修复后的任务
      const migrated = await this.migrateScheduledTasks();
      // 如果迁移没有改变任何内容，返回 raw，否则返回 migrated
      return migrated.length ? migrated : raw;
    } catch (error) {
      console.error("[StorageManager] Failed to force refresh scheduled tasks:", error);
      return [];
    }
  }

  /**
   * 获取指定项目的所有定时任务
   */
  static async getItemScheduledTasks(itemId: string): Promise<ScheduledTask[]> {
    const allTasks = await this.getScheduledTasks();
    return allTasks.filter(task => task.itemId === itemId);
  }

  /**
   * 迁移并修复无效 itemId 的定时任务
   * 如果任务的 itemId 在当前 items 列表中不存在，将尝试通过标题 / tmdbId / 平台URL 自动匹配
   * 修复成功的任务会立即写回 localStorage，返回修复后的任务数组
   */
  static async migrateScheduledTasks(): Promise<ScheduledTask[]> {
    const tasks = await this.getScheduledTasks();
    const items = await this.getItemsWithRetry();
    let changed = false;

    const fixedTasks = tasks.map(task => {
      const exists = items.some(it => it.id === task.itemId);
      if (exists) return task;

      // 尝试自动匹配
      const candidates: Array<{item: TMDBItem, score: number}> = [];
      // 按 TMDB ID
      if (task.itemId && task.itemId.length <= 13) {
        // 若 itemId 看似时间戳数字，可忽略
      }
      // 尝试通过任务名(去除 " 定时任务" 后缀)
      const title = task.name.replace(/\s*定时任务$/, '');
      items.forEach(it => {
        let score = 0;
        if (it.title === title) score = 100;
        else if (it.title.includes(title) || title.includes(it.title)) {
          const similarity = Math.min(it.title.length, title.length) / Math.max(it.title.length, title.length);
          score = Math.round(similarity * 90);
        }
        if (it.tmdbId && task.action && (task as any).tmdbId && it.tmdbId === (task as any).tmdbId) score += 30;
        if (score > 60) candidates.push({item: it, score});
      });
      if (candidates.length > 0) {
        candidates.sort((a,b)=>b.score-a.score);
        const best = candidates[0].item;
        const newTask = {...task, itemId: best.id, updatedAt: new Date().toISOString()};
        changed = true;
        return newTask;
      }
      return task;
    });

    if (changed) {
      try {
        localStorage.setItem(this.SCHEDULED_TASKS_KEY, JSON.stringify(fixedTasks));
        console.log('[StorageManager] migrateScheduledTasks 已修复无效 itemId 的任务');
      } catch (e) {
        console.error('[StorageManager] 写入修复后任务时出错', e);
      }
    }
    return fixedTasks;
  }
}
