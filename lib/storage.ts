import { v4 as uuidv4 } from "uuid";
import { UserManager } from "./user-manager";

// 执行日志条目接口
export interface ExecutionLog {
  id: string
  timestamp: string
  step: string
  message: string
  level: 'info' | 'success' | 'warning' | 'error'
  details?: any
}

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
    secondDayOfWeek?: number // 0-6，第二播出日，用于每周双更剧集，可选
    hour: number // 0-23
    minute: number // 0-59
  }
  action: {
    seasonNumber: number
    autoUpload: boolean
    conflictAction: 'w' | 'y' | 'n' // w=覆盖写入, y=是, n=否
    autoRemoveMarked: boolean
    autoConfirm?: boolean // 新增：自动确认上传（输入y）
    removeIqiyiAirDate?: boolean // 新增：删除爱奇艺平台的air_date列
    autoMarkUploaded?: boolean // 新增：自动标记已上传的集数
    // 用户自定义特殊处理选项
    enableYoukuSpecialHandling?: boolean  // 优酷平台特殊处理（-1集数）
    enableTitleCleaning?: boolean         // 词条标题清理功能
    autoDeleteWhenCompleted?: boolean     // 完结后自动删除任务
  }
  enabled: boolean
  lastRun?: string
  nextRun?: string
  lastRunStatus?: "success" | "failed" | "user_interrupted" // 新增：最后执行状态
  lastRunError?: string | null // 新增：最后执行错误信息
  // 执行日志相关字段
  currentStep?: string           // 当前执行步骤
  executionProgress?: number     // 执行进度 (0-100)
  executionLogs?: ExecutionLog[] // 执行日志列表
  isRunning?: boolean           // 是否正在执行
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
  private static readonly USE_FILE_STORAGE = true // 控制是否使用文件存储
  private static readonly API_BASE_URL = "/api/storage"

  /**
   * 检查当前环境是否为客户端
   */
  static isClient(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /**
   * 检查开发环境状态
   */
  private static checkDevelopmentEnvironment(): void {
    if (this.isClient()) {
      console.log(`[StorageManager] 环境检查:`, {
        userAgent: navigator.userAgent,
        location: window.location.href,
        protocol: window.location.protocol,
        host: window.location.host,
        useFileStorage: this.USE_FILE_STORAGE,
        apiBaseUrl: this.API_BASE_URL
      });
    }
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
   * 通用的API调用方法，带有超时和错误处理（包含用户身份信息）
   */
  private static async makeApiCall(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加到15秒超时

    // 获取用户ID并添加到请求头
    const userId = this.isClient() ? UserManager.getUserId() : null;

    console.log(`[StorageManager] 发起API请求: ${url} (用户: ${userId})`);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
      };

      // 添加用户ID到请求头
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: 'no-cache',
        headers,
      });

      clearTimeout(timeoutId);
      console.log(`[StorageManager] API请求成功: ${url}, 状态码: ${response.status}`);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      console.error(`[StorageManager] API请求失败: ${url}`, error);

      // 提供更详细的错误信息
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('请求超时：API调用超过15秒未响应');
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // 检查是否是本地开发环境
        const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
        if (isLocalhost) {
          throw new Error('本地服务器连接失败：请确认Next.js开发服务器正在运行 (npm run dev)');
        } else {
          throw new Error('网络连接失败：无法连接到服务器');
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 降级到localStorage的方法
   */
  private static fallbackToLocalStorage(): TMDBItem[] {
    console.log('[StorageManager] 尝试从localStorage获取数据作为降级方案');

    if (!this.isClient()) {
      console.warn("[StorageManager] 不在客户端环境，无法访问localStorage");
      return [];
    }

    try {
      if (!this.isStorageAvailable()) {
        console.warn("[StorageManager] localStorage不可用");
        return [];
      }

      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        console.log('[StorageManager] localStorage中没有数据');
        return [];
      }

      try {
        const parsedData = JSON.parse(data);
        const items = Array.isArray(parsedData) ? parsedData : [];
        console.log(`[StorageManager] 从localStorage成功获取 ${items.length} 个项目`);
        return items;
      } catch (parseError) {
        console.error("[StorageManager] 解析localStorage数据失败:", parseError);
        return [];
      }
    } catch (error) {
      console.error("[StorageManager] 从localStorage获取数据失败:", error);
      return [];
    }
  }

  /**
   * 带重试机制的获取items方法
   */
  static async getItemsWithRetry(retries = this.MAX_RETRIES): Promise<TMDBItem[]> {
    // 首次调用时进行环境检查
    if (retries === this.MAX_RETRIES) {
      this.checkDevelopmentEnvironment();
    }

    // 如果使用文件存储，则调用API
    if (this.USE_FILE_STORAGE) {
      try {
        console.log(`[StorageManager] 尝试获取数据，剩余重试次数: ${retries}`);

        const response = await this.makeApiCall(`${this.API_BASE_URL}/items`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[StorageManager] 成功获取 ${data.items?.length || 0} 个项目`);
        return data.items || [];
      } catch (error) {
        console.error('[StorageManager] 从API获取数据失败:', error);

        if (retries > 0) {
          console.log(`[StorageManager] 重试获取数据... (剩余${retries}次尝试)`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          return this.getItemsWithRetry(retries - 1);
        }

        // 所有重试都失败后，尝试降级到localStorage
        console.warn('[StorageManager] API获取失败，尝试降级到localStorage');
        return this.fallbackToLocalStorage();
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
        const response = await this.makeApiCall(`${this.API_BASE_URL}/item`, {
          method: 'POST',
          body: JSON.stringify({ item }),
        });

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
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
    console.log(`[StorageManager] 开始删除项目: ID=${id}`);

    // 首先检查是否有关联的定时任务
    const relatedTasks = await this.getRelatedScheduledTasks(id);
    if (relatedTasks.length > 0) {
      console.log(`[StorageManager] 发现 ${relatedTasks.length} 个关联的定时任务，将一并删除`);

      // 删除所有关联的定时任务
      for (const task of relatedTasks) {
        await this.deleteScheduledTask(task.id);
        console.log(`[StorageManager] 已删除关联任务: ${task.name} (ID: ${task.id})`);
      }
    }

    // 使用文件存储
    if (this.USE_FILE_STORAGE) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/item?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }

        console.log(`[StorageManager] 项目删除成功: ID=${id}`);
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
      console.log(`[StorageManager] 项目删除成功: ID=${id}`);
      return true;
    } catch (error) {
      console.error("Failed to delete item:", error);
      return false;
    }
  }

  /**
   * 获取与指定项目ID关联的所有定时任务
   */
  static async getRelatedScheduledTasks(itemId: string): Promise<ScheduledTask[]> {
    try {
      const tasks = await this.getScheduledTasks();
      return tasks.filter(task => task.itemId === itemId);
    } catch (error) {
      console.error(`[StorageManager] 获取关联任务失败:`, error);
      return [];
    }
  }

  /**
   * 验证并修复所有定时任务的关联
   */
  static async validateAndFixTaskAssociations(): Promise<{
    totalTasks: number;
    invalidTasks: number;
    fixedTasks: number;
    deletedTasks: number;
    details: string[]
  }> {
    try {
      console.log(`[StorageManager] 开始验证和修复任务关联`);

      const tasks = await this.getScheduledTasks();
      const items = await this.getItemsWithRetry();
      const details: string[] = [];

      let invalidTasks = 0;
      let fixedTasks = 0;
      let deletedTasks = 0;

      for (const task of tasks) {
        // 检查任务是否有有效的项目关联
        const relatedItem = items.find(item => item.id === task.itemId);

        if (!relatedItem) {
          invalidTasks++;
          console.log(`[StorageManager] 发现无效任务: ${task.name} (ID: ${task.id}, itemId: ${task.itemId})`);

          // 尝试通过多种策略修复关联
          const fixResult = await this.attemptToFixTaskAssociation(task, items);

          if (fixResult.success && fixResult.newItemId) {
            // 更新任务的关联
            const updatedTask = {
              ...task,
              itemId: fixResult.newItemId,
              itemTitle: fixResult.newItemTitle || task.itemTitle,
              itemTmdbId: fixResult.newItemTmdbId || task.itemTmdbId,
              updatedAt: new Date().toISOString()
            };

            await this.updateScheduledTask(updatedTask);
            fixedTasks++;
            details.push(`修复任务 "${task.name}": 重新关联到项目 "${fixResult.newItemTitle}" (ID: ${fixResult.newItemId})`);
            console.log(`[StorageManager] 成功修复任务: ${task.name} -> ${fixResult.newItemTitle}`);
          } else {
            // 无法修复，删除任务
            await this.deleteScheduledTask(task.id);
            deletedTasks++;
            details.push(`删除无效任务 "${task.name}": ${fixResult.reason || '无法找到合适的关联项目'}`);
            console.log(`[StorageManager] 删除无效任务: ${task.name} - ${fixResult.reason}`);
          }
        }
      }

      const result = {
        totalTasks: tasks.length,
        invalidTasks,
        fixedTasks,
        deletedTasks,
        details
      };

      console.log(`[StorageManager] 任务关联验证完成:`, result);
      return result;
    } catch (error) {
      console.error(`[StorageManager] 验证任务关联失败:`, error);
      return {
        totalTasks: 0,
        invalidTasks: 0,
        fixedTasks: 0,
        deletedTasks: 0,
        details: [`验证失败: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * 尝试修复单个任务的关联
   */
  private static async attemptToFixTaskAssociation(
    task: ScheduledTask,
    items: TMDBItem[]
  ): Promise<{
    success: boolean;
    newItemId?: string;
    newItemTitle?: string;
    newItemTmdbId?: string;
    reason?: string
  }> {
    if (items.length === 0) {
      return { success: false, reason: "系统中没有可用项目" };
    }

    // 策略1: 通过TMDB ID匹配
    if (task.itemTmdbId) {
      const tmdbMatch = items.find(item => item.tmdbId === task.itemTmdbId);
      if (tmdbMatch) {
        return {
          success: true,
          newItemId: tmdbMatch.id,
          newItemTitle: tmdbMatch.title,
          newItemTmdbId: tmdbMatch.tmdbId,
          reason: `通过TMDB ID匹配到项目`
        };
      }
    }

    // 策略2: 通过标题精确匹配
    if (task.itemTitle) {
      const titleMatch = items.find(item =>
        item.title.toLowerCase().trim() === task.itemTitle.toLowerCase().trim()
      );
      if (titleMatch) {
        return {
          success: true,
          newItemId: titleMatch.id,
          newItemTitle: titleMatch.title,
          newItemTmdbId: titleMatch.tmdbId,
          reason: `通过标题精确匹配到项目`
        };
      }
    }

    // 策略3: 通过标题模糊匹配
    if (task.itemTitle) {
      const fuzzyMatches = items.filter(item => {
        const taskTitle = task.itemTitle.toLowerCase().trim();
        const itemTitle = item.title.toLowerCase().trim();
        return taskTitle.includes(itemTitle) || itemTitle.includes(taskTitle);
      });

      if (fuzzyMatches.length === 1) {
        const match = fuzzyMatches[0];
        return {
          success: true,
          newItemId: match.id,
          newItemTitle: match.title,
          newItemTmdbId: match.tmdbId,
          reason: `通过标题模糊匹配到项目`
        };
      }
    }

    // 策略4: 通过任务名称匹配项目标题
    const taskNameMatches = items.filter(item => {
      const taskName = task.name.toLowerCase().replace(/定时任务|任务/g, '').trim();
      const itemTitle = item.title.toLowerCase().trim();
      return taskName.includes(itemTitle) || itemTitle.includes(taskName);
    });

    if (taskNameMatches.length === 1) {
      const match = taskNameMatches[0];
      return {
        success: true,
        newItemId: match.id,
        newItemTitle: match.title,
        newItemTmdbId: match.tmdbId,
        reason: `通过任务名称匹配到项目`
      };
    }

    // 策略5: 如果只有一个项目，直接关联
    if (items.length === 1) {
      const onlyItem = items[0];
      return {
        success: true,
        newItemId: onlyItem.id,
        newItemTitle: onlyItem.title,
        newItemTmdbId: onlyItem.tmdbId,
        reason: `系统中只有一个项目，自动关联`
      };
    }

    // 策略6: 使用最近创建的项目
    const sortedItems = [...items].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (sortedItems.length > 0) {
      const latestItem = sortedItems[0];
      return {
        success: true,
        newItemId: latestItem.id,
        newItemTitle: latestItem.title,
        newItemTmdbId: latestItem.tmdbId,
        reason: `关联到最近创建的项目`
      };
    }

    return { success: false, reason: "无法找到合适的关联项目" };
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
   * 验证导入数据格式
   */
  static validateImportData(jsonData: string): {
    isValid: boolean;
    error?: string;
    data?: {
      items: TMDBItem[];
      tasks: ScheduledTask[];
      version?: string;
      exportDate?: string;
    };
    stats?: {
      itemCount: number;
      taskCount: number;
      validItemCount: number;
      validTaskCount: number;
    };
  } {
    try {
      console.log("开始验证导入数据，数据长度:", jsonData.length);
      const parsedData = JSON.parse(jsonData);
      console.log("解析后的数据结构:", {
        isArray: Array.isArray(parsedData),
        hasItems: !!parsedData.items,
        hasItemsArray: Array.isArray(parsedData.items),
        hasTasks: !!parsedData.tasks,
        hasTasksArray: Array.isArray(parsedData.tasks),
        version: parsedData.version,
        exportDate: parsedData.exportDate
      });

      let items: TMDBItem[] = [];
      let tasks: ScheduledTask[] = [];
      let version: string | undefined;
      let exportDate: string | undefined;

      // 检查数据格式
      if (Array.isArray(parsedData)) {
        // 旧格式：直接是项目数组
        console.log("检测到旧格式数据（项目数组）");
        items = parsedData;
      } else if (parsedData && typeof parsedData === 'object') {
        // 新格式：包含items和tasks
        console.log("检测到新格式数据（对象）");
        if (parsedData.items && Array.isArray(parsedData.items)) {
          items = parsedData.items;
          console.log(`找到 ${items.length} 个项目`);
        } else {
          console.error("数据格式错误：缺少items字段或items不是数组", parsedData);
          return {
            isValid: false,
            error: "数据格式错误：缺少items字段或items不是数组"
          };
        }

        if (parsedData.tasks && Array.isArray(parsedData.tasks)) {
          tasks = parsedData.tasks;
          console.log(`找到 ${tasks.length} 个任务`);
        } else {
          console.log("没有找到任务数据或任务数据不是数组");
        }

        version = parsedData.version;
        exportDate = parsedData.exportDate;
      } else {
        console.error("数据格式错误：不支持的数据结构", typeof parsedData);
        return {
          isValid: false,
          error: "数据格式错误：不支持的数据结构"
        };
      }

      // 验证项目数据
      console.log(`开始验证 ${items.length} 个项目`);
      const validItems = items.filter((item, index) => {
        // 基本结构检查
        if (!item || typeof item !== 'object') {
          console.warn(`项目 ${index} 不是有效对象:`, item);
          return false;
        }

        // 必需字段检查
        const requiredFields = ['id', 'title', 'mediaType', 'tmdbId'];
        for (const field of requiredFields) {
          if (!item[field]) {
            console.warn(`项目 ${index} 缺少必需字段 ${field}:`, {
              id: item.id,
              title: item.title,
              mediaType: item.mediaType,
              tmdbId: item.tmdbId
            });
            return false;
          }
        }

        // mediaType值检查
        if (!['movie', 'tv'].includes(item.mediaType)) {
          console.warn(`项目 ${index} mediaType无效: ${item.mediaType}`, item);
          return false;
        }

        return true;
      });

      console.log(`验证完成：${validItems.length}/${items.length} 个项目有效`);

      // 验证任务数据
      const validTasks = tasks.filter(task => {
        // 基本结构检查
        if (!task || typeof task !== 'object') {
          return false;
        }

        // 必需字段检查（更宽松的验证）
        if (!task.itemId || !task.name) {
          console.warn(`Task missing required fields (itemId or name)`, task);
          return false;
        }

        // 如果没有type字段，默认设置为tmdb-import
        if (!task.type) {
          task.type = 'tmdb-import';
        }

        return true;
      });

      return {
        isValid: true,
        data: {
          items: validItems,
          tasks: validTasks,
          version,
          exportDate
        },
        stats: {
          itemCount: items.length,
          taskCount: tasks.length,
          validItemCount: validItems.length,
          validTaskCount: validTasks.length
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "JSON解析失败"
      };
    }
  }

  /**
   * 导入数据
   */
  static async importData(jsonData: string): Promise<{
    success: boolean;
    error?: string;
    stats?: {
      itemsImported: number;
      tasksImported: number;
      itemsSkipped: number;
      tasksSkipped: number;
    };
  }> {
    console.log("StorageManager.importData called with data length:", jsonData.length);

    if (!this.isClient() || !this.isStorageAvailable()) {
      console.error("Cannot import data: localStorage is not available");
      return {
        success: false,
        error: "localStorage不可用"
      };
    }

    // 首先验证数据
    const validation = this.validateImportData(jsonData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const { items, tasks } = validation.data!;
    const stats = validation.stats!;

    try {
      console.log(`开始导入 ${stats.validItemCount} 个项目和 ${stats.validTaskCount} 个任务`);

      // 导入项目数据
      if (this.USE_FILE_STORAGE) {
        try {
          // 发送完整的导出格式给服务器，让服务器端处理格式兼容性
          const serverData = {
            items,
            tasks: [], // 服务器端暂时不处理任务，任务仍然保存在客户端
            version: "1.0.0",
            exportDate: new Date().toISOString()
          };

          const response = await fetch(`${this.API_BASE_URL}/data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(serverData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API请求失败: ${response.status} - ${errorText}`);
          }

          console.log("项目数据通过API导入成功");
        } catch (error) {
          console.error('通过API导入项目失败:', error);
          return {
            success: false,
            error: `导入项目失败: ${error instanceof Error ? error.message : '未知错误'}`
          };
        }
      } else {
        // 使用localStorage
        this.saveItems(items);
        console.log("项目数据保存到localStorage成功");
      }

      // 导入定时任务
      let tasksImported = 0;
      if (tasks.length > 0) {
        console.log(`开始导入 ${tasks.length} 个定时任务`);

        // 规范化任务
        const normalizedTasks = tasks.map(task => this.normalizeTask(task));

        try {
          localStorage.setItem(this.SCHEDULED_TASKS_KEY, JSON.stringify(normalizedTasks));
          tasksImported = normalizedTasks.length;
          console.log(`${tasksImported} 个任务保存到localStorage成功`);
        } catch (error) {
          console.error("保存任务到localStorage失败:", error);
          // 任务导入失败不应该影响整个导入过程
        }
      }

      console.log("数据导入完成");
      return {
        success: true,
        stats: {
          itemsImported: stats.validItemCount,
          tasksImported,
          itemsSkipped: stats.itemCount - stats.validItemCount,
          tasksSkipped: stats.taskCount - stats.validTaskCount
        }
      };
    } catch (error) {
      console.error("导入数据失败:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "导入过程中发生未知错误"
      };
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
   * 规范化任务对象，确保所有必要字段都存在
   */
  private static normalizeTask(task: any): ScheduledTask {
    const normalized: ScheduledTask = {
      id: task.id || uuidv4(),
      itemId: task.itemId || '',
      itemTitle: task.itemTitle || '',
      itemTmdbId: task.itemTmdbId || undefined,
      name: task.name || '未命名任务',
      type: "tmdb-import",
      schedule: {
        type: task.schedule?.type || "weekly",
        dayOfWeek: task.schedule?.dayOfWeek ?? new Date().getDay(),
        secondDayOfWeek: task.schedule?.secondDayOfWeek ?? undefined,
        hour: task.schedule?.hour ?? new Date().getHours(),
        minute: task.schedule?.minute ?? 0
      },
      action: {
        seasonNumber: task.action?.seasonNumber ?? 1,
        autoUpload: task.action?.autoUpload ?? true,
        conflictAction: task.action?.conflictAction ?? 'w',
        autoRemoveMarked: task.action?.autoRemoveMarked ?? true,
        autoConfirm: task.action?.autoConfirm !== false,
        autoMarkUploaded: task.action?.autoMarkUploaded !== false,
        removeIqiyiAirDate: task.action?.removeIqiyiAirDate === true
      },
      enabled: task.enabled ?? false,
      lastRun: task.lastRun || undefined,
      nextRun: task.nextRun || undefined,
      lastRunStatus: task.lastRunStatus,
      lastRunError: task.lastRunError,
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString()
    };
    
    // 增强的项目ID验证（修复：允许时间戳格式的ID）
    if (!normalized.itemId || normalized.itemId.trim() === '') {
      console.error("[StorageManager] 错误: 任务缺少项目ID", task);
      normalized.lastRunStatus = "failed";
      normalized.lastRunError = "任务缺少项目ID，无法执行";
      normalized.enabled = false; // 自动禁用无效任务
    } else if (normalized.itemId.length > 50 ||
               normalized.itemId.includes(' ') ||
               normalized.itemId.includes('\n') ||
               normalized.itemId.includes('\t')) {
      console.warn("[StorageManager] 警告: 任务的项目ID格式有问题", normalized.itemId);
      normalized.lastRunStatus = "failed";
      normalized.lastRunError = `项目ID "${normalized.itemId}" 格式无效，请重新关联正确的项目`;
      normalized.enabled = false; // 自动禁用无效任务
    }
    
    // 记录详细日志
    console.log(`[StorageManager] 规范化任务: ID=${normalized.id}, 项目ID=${normalized.itemId}, 标题=${normalized.itemTitle}`);
    
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
      
      // 仅在任务未提供完整项目信息时才从项目列表查找
      if (!normalizedTask.itemTitle || !normalizedTask.itemTmdbId) {
        // 确保项目相关属性正确
        const items = await this.getItemsWithRetry();
        const relatedItem = items.find(item => item.id === normalizedTask.itemId);
        
        if (relatedItem) {
          // 只有在任务未提供这些信息时才更新
          if (!normalizedTask.itemTitle) normalizedTask.itemTitle = relatedItem.title;
          if (!normalizedTask.itemTmdbId) normalizedTask.itemTmdbId = relatedItem.tmdbId;
          console.log(`[StorageManager] 补充项目信息: ${relatedItem.title} (ID: ${relatedItem.id})`);
        } else {
          console.warn(`[StorageManager] 添加定时任务警告: ID为 ${normalizedTask.itemId} 的项目不存在，但仍将保存任务`);
        }
      } else {
        console.log(`[StorageManager] 任务已包含完整项目信息: ${normalizedTask.itemTitle} (ID: ${normalizedTask.itemId})`);
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
      
      // 仅在任务未提供完整项目信息时才从项目列表查找
      if (!normalizedTask.itemTitle || !normalizedTask.itemTmdbId) {
        // 确保项目相关属性正确
        const items = await this.getItemsWithRetry();
        const relatedItem = items.find(item => item.id === normalizedTask.itemId);
        
        if (relatedItem) {
          // 只有在任务未提供这些信息时才更新
          if (!normalizedTask.itemTitle) normalizedTask.itemTitle = relatedItem.title;
          if (!normalizedTask.itemTmdbId) normalizedTask.itemTmdbId = relatedItem.tmdbId;
          console.log(`[StorageManager] 补充项目信息: ${relatedItem.title} (ID: ${relatedItem.id})`);
        } else {
          console.warn(`[StorageManager] 更新定时任务警告: ID为 ${normalizedTask.itemId} 的项目不存在，但仍将更新任务`);
        }
      } else {
        console.log(`[StorageManager] 任务已包含完整项目信息: ${normalizedTask.itemTitle} (ID: ${normalizedTask.itemId})`);
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

  /**
   * 查找指定项目是否存在
   */
  static async findItemById(id: string): Promise<TMDBItem | null> {
    try {
      const items = await this.getItemsWithRetry();
      const item = items.find(item => item.id === id);
      return item || null;
    } catch (error) {
      console.error("[StorageManager] 查找项目失败:", error);
      return null;
    }
  }
  
  /**
   * 检查系统中是否有任何项目可用
   */
  static async hasAnyItems(): Promise<boolean> {
    try {
      console.log("[StorageManager] 检查项目可用性...");
      const items = await this.getItemsWithRetry();
      console.log(`[StorageManager] 找到 ${items.length} 个项目`);

      if (items.length === 0) {
        // 如果没有项目，尝试调试存储状态
        console.warn("[StorageManager] 系统中没有项目，检查存储状态");

        // 检查localStorage是否可用
        if (this.isClient() && this.isStorageAvailable()) {
          const rawData = localStorage.getItem(this.STORAGE_KEY);
          console.log(`[StorageManager] localStorage原始数据:`, rawData ? rawData.substring(0, 200) + '...' : 'null');
        }

        // 如果使用文件存储，尝试调用调试API
        if (this.USE_FILE_STORAGE) {
          try {
            const debugResponse = await fetch('/api/debug-storage');
            if (debugResponse.ok) {
              const debugData = await debugResponse.json();
              console.log(`[StorageManager] 服务器存储调试信息:`, debugData);
            }
          } catch (debugError) {
            console.warn("[StorageManager] 无法获取调试信息:", debugError);
          }
        }
      }

      return items.length > 0;
    } catch (error) {
      console.error("[StorageManager] 检查项目可用性失败:", error);
      return false;
    }
  }

  /**
   * 获取存储状态的详细信息
   */
  static async getStorageStatus(): Promise<{
    hasItems: boolean;
    itemCount: number;
    storageType: 'localStorage' | 'fileStorage';
    isClientEnvironment: boolean;
    isStorageAvailable: boolean;
    lastError?: string;
  }> {
    try {
      const items = await this.getItemsWithRetry();

      return {
        hasItems: items.length > 0,
        itemCount: items.length,
        storageType: this.USE_FILE_STORAGE ? 'fileStorage' : 'localStorage',
        isClientEnvironment: this.isClient(),
        isStorageAvailable: this.isStorageAvailable(),
      };
    } catch (error) {
      return {
        hasItems: false,
        itemCount: 0,
        storageType: this.USE_FILE_STORAGE ? 'fileStorage' : 'localStorage',
        isClientEnvironment: this.isClient(),
        isStorageAvailable: this.isStorageAvailable(),
        lastError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 调试方法：创建测试数据并尝试导入
   */
  static async debugImport(): Promise<void> {
    console.log("=== 开始调试导入功能 ===");

    // 创建测试数据
    const testData = {
      items: [
        {
          id: "debug-test-1",
          title: "调试测试项目",
          mediaType: "tv" as const,
          tmdbId: "999999",
          weekday: 1,
          completed: false,
          status: "ongoing" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      tasks: [],
      version: "1.0.0",
      exportDate: new Date().toISOString()
    };

    const jsonData = JSON.stringify(testData, null, 2);
    console.log("测试数据:", testData);
    console.log("JSON数据长度:", jsonData.length);

    try {
      // 1. 测试验证
      console.log("1. 测试数据验证...");
      const validation = this.validateImportData(jsonData);
      console.log("验证结果:", validation);

      if (!validation.isValid) {
        console.error("❌ 验证失败:", validation.error);
        return;
      }

      // 2. 测试导入
      console.log("2. 测试数据导入...");
      const importResult = await this.importData(jsonData);
      console.log("导入结果:", importResult);

      if (importResult.success) {
        console.log("✅ 导入成功!");

        // 3. 验证导入结果
        console.log("3. 验证导入结果...");
        const items = await this.getItemsWithRetry();
        const debugItem = items.find(item => item.id === "debug-test-1");
        if (debugItem) {
          console.log("✅ 找到导入的测试项目:", debugItem);
        } else {
          console.log("❌ 未找到导入的测试项目");
        }
      } else {
        console.error("❌ 导入失败:", importResult.error);
      }

    } catch (error) {
      console.error("调试过程中发生错误:", error);
    }

    console.log("=== 调试完成 ===");
  }
}
