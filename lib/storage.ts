import { v4 as uuidv4 } from "uuid";

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
  itemId: string       // 关联的项目ID
  itemTitle: string    // 冗余存储项目标题，用于显示和恢复
  itemTmdbId?: string  // 冗余存储项目TMDB ID，用于恢复关联
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
  originalTitle?: string
  mediaType: "movie" | "tv"
  tmdbId: string
  tmdbUrl?: string
  posterUrl?: string
  posterPath?: string
  backdropUrl?: string
  backdropPath?: string
  logoUrl?: string // TMDB标志URL
  networkId?: number // 播出网络ID
  networkName?: string // 播出网络名称
  networkLogoUrl?: string // 播出网络logo URL
  overview?: string // TMDB简介
  voteAverage?: number // TMDB评分
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
  blurIntensity?: 'light' | 'medium' | 'heavy' // 背景图模糊强度
  rating?: number // 用户评分
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
      let tasks: ScheduledTask[] = [];
      
      if (data) {
        try {
          tasks = JSON.parse(data);
          console.log(`[StorageManager] 读取定时任务: 找到 ${tasks.length} 个任务`);
        } catch (parseError) {
          console.error("解析定时任务数据失败:", parseError);
          tasks = [];
        }
      }
      
      // 确保所有任务都有必要的字段
      const normalizedTasks = tasks.map(task => this.normalizeTask(task));
      
      // 检查是否需要自动修复
      const needsAutoFix = JSON.stringify(normalizedTasks) !== JSON.stringify(tasks);
      if (needsAutoFix) {
        console.log("[StorageManager] 任务数据需要标准化，正在保存修复后的数据");
        localStorage.setItem(this.SCHEDULED_TASKS_KEY, JSON.stringify(normalizedTasks));
      }
      
      return normalizedTasks;
    } catch (error) {
      console.error("Failed to load scheduled tasks from storage:", error);
      return [];
    }
  }

  /**
   * 标准化任务对象，确保所有必要字段都存在
   */
  private static normalizeTask(task: any): ScheduledTask {
    // 确定是否是新任务（没有lastRun且没有nextRun）
    const isNewTask = !task.lastRun && !task.nextRun && !task.createdAt;
    
    // 确保基本字段存在
    const normalized: ScheduledTask = {
      id: task.id || uuidv4(),
      itemId: task.itemId || "",
      itemTitle: task.itemTitle || task.name?.replace(/\s*定时任务$/, '') || "未知项目",
      itemTmdbId: task.itemTmdbId || "",
      name: task.name || "未命名任务",
      type: task.type || "tmdb-import",
      schedule: {
        type: task.schedule?.type || "daily",
        hour: typeof task.schedule?.hour === 'number' ? task.schedule.hour : 3,
        minute: typeof task.schedule?.minute === 'number' ? task.schedule.minute : 0
      },
      action: {
        seasonNumber: typeof task.action?.seasonNumber === 'number' ? task.action.seasonNumber : 1,
        autoUpload: Boolean(task.action?.autoUpload),
        autoRemoveMarked: Boolean(task.action?.autoRemoveMarked),
        autoConfirm: task.action?.autoConfirm !== false,
        autoMarkUploaded: task.action?.autoMarkUploaded !== false,
        removeIqiyiAirDate: Boolean(task.action?.removeIqiyiAirDate)
      },
      // 新任务强制设置为禁用状态，已有任务保持原有状态
      enabled: isNewTask ? false : Boolean(task.enabled),
      lastRun: task.lastRun || null,
      nextRun: task.nextRun || null,
      lastRunStatus: task.lastRunStatus || null,
      lastRunError: task.lastRunError || null,
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString()
    };
    
    // 如果是weekly类型，确保dayOfWeek字段存在
    if (normalized.schedule.type === "weekly") {
      normalized.schedule.dayOfWeek = typeof task.schedule?.dayOfWeek === 'number' 
        ? task.schedule.dayOfWeek 
        : (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); // 默认为今天
    }
    
    // 检查是否有问题ID
    if (normalized.itemId === "1749566411729") {
      console.warn(`[StorageManager] 检测到任务 ${normalized.id} 使用了已知的问题ID 1749566411729，标记为禁用状态`);
      normalized.enabled = false;
    }
    
    // 检查ID格式是否有问题（过长或格式错误）
    if (!normalized.itemId || normalized.itemId.length > 20 || !/^\d+$/.test(normalized.itemId)) {
      console.warn(`[StorageManager] 任务 ${normalized.id} 的项目ID "${normalized.itemId}"格式可能有问题，标记为禁用状态`);
      normalized.enabled = false;
      normalized.lastRunStatus = "failed";
      normalized.lastRunError = `项目ID "${normalized.itemId}" 格式无效，请重新关联正确的项目`;
    }
    
    return normalized;
  }

  /**
   * 添加定时任务，自动关联项目属性
   */
  static async addScheduledTask(task: ScheduledTask): Promise<boolean> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.error("Cannot add scheduled task: localStorage is not available");
      return false;
    }
    
    try {
      // 验证任务的必要字段
      if (!task.id) {
        console.error("添加定时任务失败: 缺少必要字段 id");
        return false;
      }
      
      console.log(`[StorageManager] 添加定时任务: ID=${task.id}, 项目ID=${task.itemId}, 名称=${task.name}`);
      
      // 规范化任务对象
      const normalizedTask = this.normalizeTask(task);
      
      // 确保项目相关属性正确
      const items = await this.getItemsWithRetry();
      const relatedItem = items.find(item => item.id === normalizedTask.itemId);
      
      if (relatedItem) {
        // 如果找到关联项目，更新任务的项目相关属性
        normalizedTask.itemTitle = relatedItem.title;
        normalizedTask.itemTmdbId = relatedItem.tmdbId;
        console.log(`[StorageManager] 关联到项目: ${relatedItem.title} (ID: ${relatedItem.id})`);
      } else {
        console.warn(`[StorageManager] 添加定时任务警告: ID为 ${normalizedTask.itemId} 的项目不存在，但仍将保存任务`);
      }
      
      const tasks = await this.getScheduledTasks();
      
      // 检查是否已存在相同ID的任务
      const taskExists = tasks.some(t => t.id === normalizedTask.id);
      if (taskExists) {
        console.warn(`[StorageManager] 添加定时任务警告: ID为 ${normalizedTask.id} 的任务已存在，将更新现有任务`);
        return this.updateScheduledTask(normalizedTask);
      }
      
      tasks.push(normalizedTask);
      localStorage.setItem(this.SCHEDULED_TASKS_KEY, JSON.stringify(tasks));
      
      // 验证任务是否已成功保存
      const savedTasks = await this.getScheduledTasks();
      const taskSaved = savedTasks.some(t => t.id === normalizedTask.id);
      
      if (taskSaved) {
        console.log(`[StorageManager] 定时任务保存成功: ID=${normalizedTask.id}`);
        return true;
      } else {
        console.error(`[StorageManager] 定时任务保存失败: ID=${normalizedTask.id}, 任务未在存储中找到`);
        return false;
      }
    } catch (error) {
      console.error("[StorageManager] Failed to add scheduled task:", error);
      return false;
    }
  }

  /**
   * 更新定时任务，自动更新项目关联属性
   */
  static async updateScheduledTask(updatedTask: ScheduledTask): Promise<boolean> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.error("Cannot update scheduled task: localStorage is not available");
      return false;
    }
    
    try {
      // 验证任务的必要字段
      if (!updatedTask.id) {
        console.error("更新定时任务失败: 缺少必要字段 id");
        return false;
      }
      
      console.log(`[StorageManager] 更新定时任务: ID=${updatedTask.id}, 项目ID=${updatedTask.itemId}, 名称=${updatedTask.name}`);
      
      // 规范化任务对象
      const normalizedTask = this.normalizeTask(updatedTask);
      
      // 确保项目相关属性正确
      const items = await this.getItemsWithRetry();
      const relatedItem = items.find(item => item.id === normalizedTask.itemId);
      
      if (relatedItem) {
        // 如果找到关联项目，更新任务的项目相关属性
        normalizedTask.itemTitle = relatedItem.title;
        normalizedTask.itemTmdbId = relatedItem.tmdbId;
        console.log(`[StorageManager] 关联到项目: ${relatedItem.title} (ID: ${relatedItem.id})`);
      } else {
        console.warn(`[StorageManager] 更新定时任务警告: ID为 ${normalizedTask.itemId} 的项目不存在，但仍将更新任务`);
      }
      
      // 更新updatedAt字段
      normalizedTask.updatedAt = new Date().toISOString();
      
      const tasks = await this.getScheduledTasks();
      
      // 检查任务是否存在
      const taskExists = tasks.some(t => t.id === normalizedTask.id);
      if (!taskExists) {
        console.warn(`[StorageManager] 更新定时任务警告: ID为 ${normalizedTask.id} 的任务不存在，将添加新任务`);
        return this.addScheduledTask(normalizedTask);
      }
      
      const updatedTasks = tasks.map(task => 
        task.id === normalizedTask.id ? normalizedTask : task
      );
      localStorage.setItem(this.SCHEDULED_TASKS_KEY, JSON.stringify(updatedTasks));
      
      // 验证任务是否已成功更新
      const savedTasks = await this.getScheduledTasks();
      const taskUpdated = savedTasks.some(t => 
        t.id === normalizedTask.id && t.updatedAt === normalizedTask.updatedAt
      );
      
      if (taskUpdated) {
        console.log(`[StorageManager] 定时任务更新成功: ID=${normalizedTask.id}`);
        return true;
      } else {
        console.error(`[StorageManager] 定时任务更新失败: ID=${normalizedTask.id}, 任务未在存储中更新`);
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
   * 强制刷新定时任务列表，修复无效项目关联
   */
  static async forceRefreshScheduledTasks(): Promise<ScheduledTask[]> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.warn("[StorageManager] Not in client environment or storage not available");
      return [];
    }
    
    try {
      // 获取所有任务和项目
      const tasks = await this.getScheduledTasks();
      const items = await this.getItemsWithRetry();
      
      console.log(`[StorageManager] 强制刷新定时任务: 开始检查 ${tasks.length} 个任务的有效性`);
      
      // 修复所有任务
      let changed = false;
      const fixedTasks = tasks.map(task => {
        // 检查任务是否已关联到有效项目
        const relatedItem = items.find(item => item.id === task.itemId);
        
        if (relatedItem) {
          // 如果已关联到有效项目，确保项目属性是最新的
          if (task.itemTitle !== relatedItem.title || task.itemTmdbId !== relatedItem.tmdbId) {
            console.log(`[StorageManager] 更新任务 ${task.id} 的项目属性`);
            changed = true;
            return {
              ...task,
              itemTitle: relatedItem.title,
              itemTmdbId: relatedItem.tmdbId,
              updatedAt: new Date().toISOString()
            };
          }
          return task;
        }
        
        // 如果没有关联到有效项目，尝试通过项目标题、TMDB ID或项目名称匹配
        console.log(`[StorageManager] 任务 ${task.id} (${task.name}) 关联的项目ID ${task.itemId} 无效，尝试修复`);
        
        // 1. 尝试通过TMDB ID匹配
        if (task.itemTmdbId) {
          const matchByTmdbId = items.find(item => item.tmdbId === task.itemTmdbId);
          if (matchByTmdbId) {
            console.log(`[StorageManager] 通过TMDB ID匹配到项目: ${matchByTmdbId.title}`);
            changed = true;
            return {
              ...task,
              itemId: matchByTmdbId.id,
              itemTitle: matchByTmdbId.title,
              updatedAt: new Date().toISOString()
            };
          }
        }
        
        // 2. 尝试通过项目标题匹配
        if (task.itemTitle) {
          const matchByTitle = items.find(item => 
            item.title === task.itemTitle ||
            (item.title.includes(task.itemTitle) && item.title.length - task.itemTitle.length < 5) ||
            (task.itemTitle.includes(item.title) && task.itemTitle.length - item.title.length < 5)
          );
          
          if (matchByTitle) {
            console.log(`[StorageManager] 通过项目标题匹配到项目: ${matchByTitle.title}`);
            changed = true;
            return {
              ...task,
              itemId: matchByTitle.id,
              itemTitle: matchByTitle.title,
              itemTmdbId: matchByTitle.tmdbId,
              updatedAt: new Date().toISOString()
            };
          }
        }
        
        // 3. 尝试通过任务名称匹配（去除"定时任务"后缀）
        const taskTitle = task.name.replace(/\s*定时任务$/, '');
        const matchByTaskName = items.find(item => 
          item.title === taskTitle ||
          (item.title.includes(taskTitle) && item.title.length - taskTitle.length < 5) ||
          (taskTitle.includes(item.title) && taskTitle.length - item.title.length < 5)
        );
        
        if (matchByTaskName) {
          console.log(`[StorageManager] 通过任务名称匹配到项目: ${matchByTaskName.title}`);
          changed = true;
          return {
            ...task,
            itemId: matchByTaskName.id,
            itemTitle: matchByTaskName.title,
            itemTmdbId: matchByTaskName.tmdbId,
            updatedAt: new Date().toISOString()
          };
        }
        
        // 如果无法修复，保留原始任务
        console.warn(`[StorageManager] 无法为任务 ${task.id} (${task.name}) 找到匹配项目`);
        return task;
      });
      
      // 如果有任务被修改，保存更新后的任务列表
      if (changed) {
        localStorage.setItem(this.SCHEDULED_TASKS_KEY, JSON.stringify(fixedTasks));
        console.log(`[StorageManager] 已保存修复后的任务列表，共 ${fixedTasks.length} 个任务`);
      } else {
        console.log(`[StorageManager] 所有任务都有效，无需修复`);
      }
      
      return fixedTasks;
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
}
