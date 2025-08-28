import { v4 as uuidv4 } from "uuid";
import { UserManager } from "./user-manager";
import { abortErrorMonitor } from "./abort-error-monitor";

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
    conflictAction: 'w' | 'y' | 'n' // w=覆盖写入, y=跳过, n=取消
    autoRemoveMarked: boolean
    autoConfirm?: boolean // 新增：自动确认上传（输入y）
    removeAirDateColumn?: boolean // 删除air_date列
    removeRuntimeColumn?: boolean // 删除runtime列
    removeBackdropColumn?: boolean // 删除backdrop列
    autoMarkUploaded?: boolean // 新增：自动标记已上传的集数
    // 用户自定义特殊处理选项
    enableYoukuSpecialHandling?: boolean  // 优酷平台特殊处理（+1集数）
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
  mediaType: "tv"
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
  overview?: string // TMDB简�?
  voteAverage?: number // TMDB评分
  weekday: number // 0-6 (Sunday-Saturday)
  secondWeekday?: number // 第二播出日（用于一周两更的动漫�?
  airTime?: string // 播出时间，格式如 "19:00"
  isDailyUpdate?: boolean // 是否为每日更新的内容
  totalEpisodes?: number // 总集数（所有季的总和�?
  manuallySetEpisodes?: boolean // 标记总集数是否为手动设置
  seasons?: Season[] // 多季数据
  episodes?: Episode[] // 保留兼容性，用于单季或总集�?
  completed: boolean
  status: "ongoing" | "completed"
  platformUrl?: string
  maintenanceCode?: string
  notes?: string
  category?: "anime" | "tv" | "kids" | "variety" | "short" // 添加分类字段
  scheduledTasks?: ScheduledTask[] // 添加定时任务
  blurIntensity?: 'light' | 'medium' | 'heavy' // 背景图模糊强�?
  rating?: number // 用户评分
  createdAt: string
  updatedAt: string
}

export class StorageManager {
  private static readonly STORAGE_KEY = "tmdb_helper_items"
  private static readonly SCHEDULED_TASKS_KEY = "tmdb_helper_scheduled_tasks" // 添加定时任务存储�?
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 300 // 毫秒
  private static readonly USE_FILE_STORAGE = true // 始终使用文件存储
  private static readonly API_BASE_URL = "/api/storage"

  /**
   * 检查当前环境是否为客户�?
   */
  static isClient(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * 检查开发环境状�?
   */
  private static checkDevelopmentEnvironment(): void {
    if (this.isClient()) {
      console.log(`[StorageManager] 环境检�?`, {
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
   * 检查存储是否可用（现在总是返回true，因为使用服务端存储）
   */
  static isStorageAvailable(): boolean {
    return true; // 服务端存储总是可用
  }

  /**
   * 通用的API调用方法，带有超时和错误处理（包含用户身份信息）
   */
  private static async makeApiCall(url: string, options: RequestInit = {}): Promise<Response> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`[StorageManager] API请求超时，正在中止: ${url}`);
      controller.abort();
    }, 15000); // 15秒超时

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
        credentials: 'include',
        headers,
      });

      clearTimeout(timeoutId);
      console.log(`[StorageManager] API请求成功: ${url}, 状态码: ${response.status}`);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      console.error(`[StorageManager] API请求失败: ${url}`, error);

      // 增强的错误处理和监控
      if (error instanceof DOMException && error.name === 'AbortError') {
        // 检查是否是我们主动中止的（超时）还是被意外中止的
        const isTimeout = controller.signal.aborted;
        const errorMessage = isTimeout
          ? '请求超时：API调用超过15秒未响应'
          : '请求被中止：可能由于网络问题或浏览器限制';

        // 记录 AbortError 事件
        abortErrorMonitor.recordAbortError(
          url,
          options.method || 'GET',
          'storage_api_call',
          error,
          isTimeout,
          duration
        );

        throw new Error(errorMessage);
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // 检查是否是本地开发环境
        const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
        if (isLocalhost) {
          throw new Error('本地服务器连接失败：请确认Next.js开发服务器正在运行 (npm run dev)');
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
   * 降级到localStorage的方�?
   */
  private static fallbackToLocalStorage(): TMDBItem[] {
    console.warn("[StorageManager] localStorage降级方法已移除，现在完全使用服务端存储");
    return [];
  }

  /**
   * 带重试机制的获取items方法
   */
  static async getItemsWithRetry(retries = this.MAX_RETRIES): Promise<TMDBItem[]> {
    // 首次调用时进行环境检�?
    if (retries === this.MAX_RETRIES) {
      this.checkDevelopmentEnvironment();
    }

    // 如果使用文件存储，则调用API
    if (this.USE_FILE_STORAGE) {
      try {
        console.log(`[StorageManager] 尝试获取数据，剩余重试次�? ${retries}`);

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
          console.log(`[StorageManager] 重试获取数据... (剩余${retries}次尝�?`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          return this.getItemsWithRetry(retries - 1);
        }

        // 所有重试都失败后，返回空数组
        console.error('[StorageManager] API获取失败，无法获取数据');
        return [];
      }
    }

    // 如果不使用文件存储，返回空数组（localStorage已移除）
    console.warn('[StorageManager] 不使用文件存储，返回空数组');
    return [];
  }

  /**
   * 同步获取所有项目
   */
  static getItems(): TMDBItem[] {
    console.warn("同步获取方法已废弃，请使用异步getItemsWithRetry方法获取数据");
    return [];
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
    
    // 不再使用localStorage，只使用服务端存储
    console.error("Cannot add item: 请使用服务端存储API");
    return false;
  }

  /**
   * 更新项目（增强版，使用统一的API调用方法）
   */
  static async updateItem(updatedItem: TMDBItem): Promise<boolean> {
    // 使用文件存储
    if (this.USE_FILE_STORAGE) {
      try {
        console.log(`[StorageManager] 开始更新项目: ${updatedItem.title} (ID: ${updatedItem.id})`);

        const response = await this.makeApiCall(`${this.API_BASE_URL}/item`, {
          method: 'PUT',
          body: JSON.stringify({ item: updatedItem }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
        }

        console.log(`[StorageManager] 项目更新成功: ${updatedItem.title}`);
        return true;
      } catch (error) {
        console.error(`[StorageManager] 更新项目失败: ${updatedItem.title}`, error);

        // 如果是 AbortError，提供更友好的错误信息
        if (error instanceof Error && error.message.includes('请求超时')) {
          console.warn(`[StorageManager] 项目更新超时，可能需要重试: ${updatedItem.title}`);
        }

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
    console.log(`[StorageManager] 开始删除项�? ID=${id}`);

    // 首先检查是否有关联的定时任�?
    const relatedTasks = await this.getRelatedScheduledTasks(id);
    if (relatedTasks.length > 0) {
      console.log(`[StorageManager] 发现 ${relatedTasks.length} 个关联的定时任务，将一并删除`);

      // 删除所有关联的定时任务
      for (const task of relatedTasks) {
        await this.deleteScheduledTask(task.id);
        console.log(`[StorageManager] 已删除关联任�? ${task.name} (ID: ${task.id})`);
      }
    }

    // 使用文件存储
    if (this.USE_FILE_STORAGE) {
      try {
        console.log(`[StorageManager] 开始删除项目: ID=${id}`);

        const response = await this.makeApiCall(`${this.API_BASE_URL}/item?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
        }

        console.log(`[StorageManager] 项目删除成功: ID=${id}`);
        return true;
      } catch (error) {
        console.error(`[StorageManager] 删除项目失败: ID=${id}`, error);

        // 如果是 AbortError，提供更友好的错误信息
        if (error instanceof Error && error.message.includes('请求超时')) {
          console.warn(`[StorageManager] 项目删除超时，可能需要重试: ID=${id}`);
        }

        return false;
      }
    }

    // 不再使用localStorage，只使用服务端存储
    console.error("Cannot delete item: 请使用服务端存储API");
    return false;
  }

  /**
   * 获取与指定项目ID关联的所有定时任�?
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
        // 检查任务是否有有效的项目关�?
        const relatedItem = items.find(item => item.id === task.itemId);

        if (!relatedItem) {
          invalidTasks++;
          console.log(`[StorageManager] 发现无效任务: ${task.name} (ID: ${task.id}, itemId: ${task.itemId})`);

          // 尝试通过多种策略修复关联
          const fixResult = await this.attemptToFixTaskAssociation(task, items);

          if (fixResult.success && fixResult.newItemId) {
            // 更新任务的关�?
            const updatedTask = {
              ...task,
              itemId: fixResult.newItemId,
              itemTitle: fixResult.newItemTitle || task.itemTitle,
              itemTmdbId: fixResult.newItemTmdbId || task.itemTmdbId,
              updatedAt: new Date().toISOString()
            };

            await this.updateScheduledTask(updatedTask);
            fixedTasks++;
            details.push(`修复任务 "${task.name}": 重新关联到项�?"${fixResult.newItemTitle}" (ID: ${fixResult.newItemId})`);
            console.log(`[StorageManager] 成功修复任务: ${task.name} -> ${fixResult.newItemTitle}`);
          } else {
            // 无法修复，删除任�?
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
   * 检查并修复问题ID
   */
  private static isProblematicId(id: string): boolean {
    // 检查已知的问题ID模式
    const problematicPatterns = [
      /^1749566411729$/, // 已知问题ID
      /^\d{10,}$/, // 纯数字且过长
      /^[0-9]+\s+/, // 数字后跟空格
      /\s/, // 包含空格
      /^.{50,}$/ // 过长的ID
    ];
    
    return problematicPatterns.some(pattern => pattern.test(id));
  }

  /**
   * 计算字符串相似度
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    // 使用编辑距离算法
    const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // 插入
          matrix[j - 1][i] + 1,     // 删除
          matrix[j - 1][i - 1] + cost // 替换
        );
      }
    }
    
    const maxLength = Math.max(s1.length, s2.length);
    return maxLength === 0 ? 1 : (maxLength - matrix[s2.length][s1.length]) / maxLength;
  }

  /**
   * 智能项目匹配算法
   */
  private static findBestItemMatch(task: ScheduledTask, items: TMDBItem[]): {
    item: TMDBItem | null;
    confidence: number;
    matchType: string;
    reason: string;
  } {
    if (items.length === 0) {
      return { item: null, confidence: 0, matchType: 'none', reason: '系统中没有可用项目' };
    }

    const candidates: Array<{
      item: TMDBItem;
      score: number;
      matchType: string;
      reasons: string[];
    }> = [];

    items.forEach(item => {
      let score = 0;
      const reasons: string[] = [];
      let matchType = 'unknown';

      // 1. TMDB ID 精确匹配 (最高优先级)
      if (task.itemTmdbId && item.tmdbId === task.itemTmdbId) {
        score += 100;
        matchType = 'tmdb_id';
        reasons.push(`TMDB ID匹配: ${task.itemTmdbId}`);
      }

      // 2. 标题精确匹配
      if (task.itemTitle && item.title === task.itemTitle) {
        score += 90;
        if (matchType === 'unknown') matchType = 'title_exact';
        reasons.push(`标题精确匹配: "${task.itemTitle}"`);
      }

      // 3. 标题模糊匹配
      if (task.itemTitle && item.title !== task.itemTitle) {
        const titleSimilarity = this.calculateStringSimilarity(task.itemTitle, item.title);
        if (titleSimilarity > 0.8) {
          score += Math.round(titleSimilarity * 70);
          if (matchType === 'unknown') matchType = 'title_fuzzy';
          reasons.push(`标题模糊匹配: "${task.itemTitle}" 与 "${item.title}" (${Math.round(titleSimilarity * 100)}%)`);
        }
      }

      // 4. 任务名称匹配
      const taskNameClean = task.name.replace(/\s*定时任务$/, '');
      if (taskNameClean && item.title) {
        const nameSimilarity = this.calculateStringSimilarity(taskNameClean, item.title);
        if (nameSimilarity > 0.7) {
          score += Math.round(nameSimilarity * 50);
          if (matchType === 'unknown') matchType = 'task_name';
          reasons.push(`任务名称匹配: "${taskNameClean}" 与 "${item.title}" (${Math.round(nameSimilarity * 100)}%)`);
        }
      }

      // 5. 创建时间接近�?
      try {
        const taskTime = new Date(task.createdAt).getTime();
        const itemTime = new Date(item.createdAt).getTime();
        const timeDiff = Math.abs(taskTime - itemTime);
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        
        if (daysDiff < 7) { // 一周内
          const timeScore = Math.round(20 * (1 - daysDiff / 7));
          score += timeScore;
          reasons.push(`创建时间接近: ${Math.round(daysDiff * 24)}小时内`);
        }
      } catch (e) {
        // 忽略时间解析错误
      }

      // 6. 媒体类型匹配
      if (item.mediaType === 'tv' && task.action.seasonNumber > 0) {
        score += 10;
        reasons.push('媒体类型匹配: TV剧集');
      }

      // 7. 平台URL匹配
      if (item.platformUrl && task.action.removeAirDateColumn && item.platformUrl.includes('iqiyi.com')) {
        score += 15;
        reasons.push('平台匹配: 爱奇艺');
      }

      if (score > 30) { // 只考虑得分超过30的候选项
        candidates.push({
          item,
          score,
          matchType,
          reasons
        });
      }
    });

    // 按得分排�?
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      // 如果没有好的匹配，使用最近创建的项目作为备�?
      const recentItems = [...items].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      if (recentItems.length > 0) {
        return {
          item: recentItems[0],
          confidence: 0.3,
          matchType: 'fallback_recent',
          reason: `使用最近创建的项目作为备�? ${recentItems[0].title}`
        };
      }
      
      return { item: null, confidence: 0, matchType: 'none', reason: '无法找到合适的匹配项目' };
    }

    const best = candidates[0];
    const confidence = Math.min(best.score / 100, 1.0);
    
    return {
      item: best.item,
      confidence,
      matchType: best.matchType,
      reason: best.reasons.join('; ')
    };
  }

  /**
   * 数据完整性验�?
   */
  private static validateTaskData(task: ScheduledTask): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必需字段检�?
    if (!task.id) errors.push('任务ID不能为空');
    if (!task.name) errors.push('任务名称不能为空');
    if (!task.itemId) errors.push('关联项目ID不能为空');
    if (!task.type) errors.push('任务类型不能为空');
    if (!task.schedule) errors.push('调度配置不能为空');
    if (!task.action) errors.push('执行动作不能为空');

    // ID格式检�?
    if (task.id && this.isProblematicId(task.id)) {
      warnings.push(`任务ID格式可能有问�? ${task.id}`);
    }
    if (task.itemId && this.isProblematicId(task.itemId)) {
      warnings.push(`项目ID格式可能有问�? ${task.itemId}`);
    }

    // 调度配置检�?
    if (task.schedule) {
      if (!['daily', 'weekly'].includes(task.schedule.type)) {
        errors.push('调度类型必须为daily或weekly');
      }
      if (typeof task.schedule.hour !== 'number' || task.schedule.hour < 0 || task.schedule.hour > 23) {
        errors.push('小时必须在0-23之间的数字');
      }
      if (typeof task.schedule.minute !== 'number' || task.schedule.minute < 0 || task.schedule.minute > 59) {
        errors.push('分钟必须在0-59之间的数字');
      }
      if (task.schedule.type === 'weekly' && (typeof task.schedule.dayOfWeek !== 'number' || task.schedule.dayOfWeek < 0 || task.schedule.dayOfWeek > 6)) {
        errors.push('星期几必须是0-6之间的数字');
      }
    }

    // 执行动作检�?
    if (task.action) {
      if (typeof task.action.seasonNumber !== 'number' || task.action.seasonNumber < 1) {
        errors.push('季数必须是大于1的数字');
      }
    }

    // 时间戳检�?
    if (task.createdAt && isNaN(new Date(task.createdAt).getTime())) {
      warnings.push('创建时间格式无效');
    }
    if (task.updatedAt && isNaN(new Date(task.updatedAt).getTime())) {
      warnings.push('更新时间格式无效');
    }
    if (task.nextRun && isNaN(new Date(task.nextRun).getTime())) {
      warnings.push('下次执行时间格式无效');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 尝试修复单个任务的关�?- 增强�?
   */
  private static async attemptToFixTaskAssociation(
    task: ScheduledTask,
    items: TMDBItem[]
  ): Promise<{
    success: boolean;
    newItemId?: string;
    newItemTitle?: string;
    newItemTmdbId?: string;
    reason?: string;
    confidence?: number;
  }> {
    console.log(`[StorageManager] 尝试修复任务关联: ${task.name} (ID: ${task.id})`);

    // 数据验证
    const validation = this.validateTaskData(task);
    if (!validation.isValid) {
      console.error(`[StorageManager] 任务数据验证失败:`, validation.errors);
      return { success: false, reason: `数据验证失败: ${validation.errors.join(', ')}` };
    }

    if (validation.warnings.length > 0) {
      console.warn(`[StorageManager] 任务数据警告:`, validation.warnings);
    }

    if (items.length === 0) {
      return { success: false, reason: "系统中没有可用项目" };
    }

    // 使用智能匹配算法
    const matchResult = this.findBestItemMatch(task, items);
    
    if (matchResult.item && matchResult.confidence > 0.5) {
      console.log(`[StorageManager] 找到高置信度匹配: ${matchResult.item.title} (置信�? ${Math.round(matchResult.confidence * 100)}%)`);
      return {
        success: true,
        newItemId: matchResult.item.id,
        newItemTitle: matchResult.item.title,
        newItemTmdbId: matchResult.item.tmdbId,
        reason: matchResult.reason,
        confidence: matchResult.confidence
      };
    } else if (matchResult.item && matchResult.confidence > 0.2) {
      console.log(`[StorageManager] 找到低置信度匹配: ${matchResult.item.title} (置信�? ${Math.round(matchResult.confidence * 100)}%)`);
      return {
        success: true,
        newItemId: matchResult.item.id,
        newItemTitle: matchResult.item.title,
        newItemTmdbId: matchResult.item.tmdbId,
        reason: `${matchResult.reason} (低置信度匹配)`,
        confidence: matchResult.confidence
      };
    }

    return { 
      success: false, 
      reason: matchResult.reason || "无法找到合适的关联项目",
      confidence: 0
    };
  }

  /**
   * 保存项目方法已移除（现在使用服务端存储）
   */
  private static saveItems(items: TMDBItem[]): void {
    console.warn("saveItems方法已移除，请使用服务端存储API");
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

      // 检查数据格�?
      if (Array.isArray(parsedData)) {
        // 旧格式：直接是项目数�?
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
        // 基本结构检�?
        if (!item || typeof item !== 'object') {
          console.warn(`项目 ${index} 不是有效对象:`, item);
          return false;
        }

        // 必需字段检�?
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

        // mediaType值检�?
        if (!['movie', 'tv'].includes(item.mediaType)) {
          console.warn(`项目 ${index} mediaType无效: ${item.mediaType}`, item);
          return false;
        }

        return true;
      });

      console.log(`验证完成�?{validItems.length}/${items.length} 个项目有效`);

      // 验证任务数据
      const validTasks = tasks.filter(task => {
        // 基本结构检�?
        if (!task || typeof task !== 'object') {
          return false;
        }

        // 必需字段检查（更宽松的验证�?
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
      console.log(`开始导�?${stats.validItemCount} 个项目和 ${stats.validTaskCount} 个任务`);

      // 导入项目数据
      if (this.USE_FILE_STORAGE) {
        try {
          // 发送完整的导出格式给服务器，让服务器端处理格式兼容�?
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
        console.log(`开始导�?${tasks.length} 个定时任务`);

        // 规范化任�?
        const normalizedTasks = tasks.map(task => this.normalizeTask(task));

        try {
          // 使用服务端API批量导入任务
          for (const task of normalizedTasks) {
            const response = await fetch('/api/scheduled-tasks', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(task),
            });

            if (response.ok) {
              tasksImported++;
            } else {
              console.error(`导入任务失败: ${task.name}`, await response.text());
            }
          }
          console.log(`${tasksImported} 个任务导入到服务端成功`);
        } catch (error) {
          console.error("导入任务到服务端失败:", error);
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

  // 缓存定时任务数据
  private static scheduledTasksCache: {
    data: ScheduledTask[];
    timestamp: number;
    ttl: number; // 缓存有效期（毫秒）
  } | null = null;

  /**
   * 获取所有定时任务（增强版，包含详细错误处理和缓存）
   */
  static async getScheduledTasks(forceRefresh: boolean = false): Promise<ScheduledTask[]> {
    try {
      // 检查缓存是否有效（5分钟缓存）
      const now = Date.now();
      const cacheValid = this.scheduledTasksCache &&
        (now - this.scheduledTasksCache.timestamp) < this.scheduledTasksCache.ttl;

      if (!forceRefresh && cacheValid) {
        console.log(`[StorageManager] 使用缓存的定时任务数据: ${this.scheduledTasksCache!.data.length} 个任务`);
        return this.scheduledTasksCache!.data;
      }

      console.log(`[StorageManager] 开始从服务端读取定时任务`);

      const response = await fetch('/api/scheduled-tasks');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '获取定时任务失败');
      }

      const tasks: ScheduledTask[] = result.tasks || [];

      // 验证数据格式
      if (!Array.isArray(tasks)) {
        console.error("[StorageManager] 定时任务数据格式错误：不是数组", typeof tasks);
        throw new Error("定时任务数据格式错误：期望数组格式");
      }

      console.log(`[StorageManager] 成功从服务端获取定时任务: 找到 ${tasks.length} 个任务`);

      // 验证和规范化任务数据
      const normalizedTasks: ScheduledTask[] = [];
      const invalidTasks: any[] = [];

      for (let i = 0; i < tasks.length; i++) {
        try {
          const task = tasks[i];

          // 基本字段验证
          if (!task || typeof task !== 'object') {
            invalidTasks.push({ index: i, task, reason: '不是有效对象' });
            continue;
          }

          if (!task.id || typeof task.id !== 'string') {
            invalidTasks.push({ index: i, task, reason: '缺少有效的ID' });
            continue;
          }

          // 规范化任务
          const normalizedTask = this.normalizeTask(task);
          normalizedTasks.push(normalizedTask);

        } catch (taskError) {
          console.error(`[StorageManager] 处理任务 ${i} 时出错:`, taskError);
          invalidTasks.push({ index: i, task: tasks[i], reason: taskError instanceof Error ? taskError.message : '未知错误' });
        }
      }

      // 报告无效任务
      if (invalidTasks.length > 0) {
        console.warn(`[StorageManager] 发现 ${invalidTasks.length} 个无效任务:`, invalidTasks);
      }

      // 更新缓存
      this.scheduledTasksCache = {
        data: normalizedTasks,
        timestamp: now,
        ttl: 5 * 60 * 1000 // 5分钟缓存
      };

      console.log(`[StorageManager] 成功获取 ${normalizedTasks.length} 个有效定时任务`);
      return normalizedTasks;

    } catch (error) {
      console.error("[StorageManager] 获取定时任务失败:", error);

      // 提供更详细的错误信息
      if (error instanceof Error) {
        throw new Error(`读取定时任务数据失败: ${error.message}`);
      } else {
        throw new Error("读取定时任务数据失败: 未知错误");
      }
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
        removeAirDateColumn: task.action?.removeAirDateColumn === true,
        removeRuntimeColumn: task.action?.removeRuntimeColumn === true,
        removeBackdropColumn: task.action?.removeBackdropColumn === true
      },
      enabled: task.enabled ?? false,
      lastRun: task.lastRun || undefined,
      nextRun: task.nextRun || undefined,
      lastRunStatus: task.lastRunStatus,
      lastRunError: task.lastRunError,
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString()
    };
    
    // 增强的项目ID验证（修复：允许时间戳格式的ID�?
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
   * 强制刷新定时任务缓存
   */
  static async forceRefreshScheduledTasks(): Promise<ScheduledTask[]> {
    console.log('[StorageManager] 强制刷新定时任务缓存');
    return this.getScheduledTasks(true);
  }

  /**
   * 清除定时任务缓存
   */
  static clearScheduledTasksCache(): void {
    console.log('[StorageManager] 清除定时任务缓存');
    this.scheduledTasksCache = null;
  }

  /**
   * 添加定时任务，自动关联项目属性
   */
  static async addScheduledTask(task: ScheduledTask): Promise<boolean> {
    try {
      // 验证任务的必要字段
      if (!task.id) {
        console.error("添加定时任务失败: 缺少必要字段 id");
        return false;
      }
      
      console.log(`[StorageManager] 添加定时任务: ID=${task.id}, 项目ID=${task.itemId}, 名称=${task.name}`);
      
      // 规范化任务对�?
      const normalizedTask = this.normalizeTask(task);
      
      // 仅在任务未提供完整项目信息时才从项目列表查找
      if (!normalizedTask.itemTitle || !normalizedTask.itemTmdbId) {
        // 确保项目相关属性正�?
        const items = await this.getItemsWithRetry();
        const relatedItem = items.find(item => item.id === normalizedTask.itemId);
        
        if (relatedItem) {
          // 只有在任务未提供这些信息时才更新
          if (!normalizedTask.itemTitle) normalizedTask.itemTitle = relatedItem.title;
          if (!normalizedTask.itemTmdbId) normalizedTask.itemTmdbId = relatedItem.tmdbId;
          console.log(`[StorageManager] 补充项目信息: ${relatedItem.title} (ID: ${relatedItem.id})`);
        } else {
          console.warn(`[StorageManager] 添加定时任务警告: ID�?${normalizedTask.itemId} 的项目不存在，但仍将保存任务`);
        }
      } else {
        console.log(`[StorageManager] 任务已包含完整项目信�? ${normalizedTask.itemTitle} (ID: ${normalizedTask.itemId})`);
      }
      
      // 调用服务端API添加任务
      const response = await fetch('/api/scheduled-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalizedTask),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '添加定时任务失败');
      }

      console.log(`[StorageManager] 定时任务保存成功: ID=${normalizedTask.id}`);

      // 清除缓存，确保下次获取时重新读取
      this.clearScheduledTasksCache();

      return true;
    } catch (error) {
      console.error("[StorageManager] Failed to add scheduled task:", error);
      return false;
    }
  }

  /**
   * 更新定时任务，自动更新项目关联属性
   */
  static async updateScheduledTask(updatedTask: ScheduledTask): Promise<boolean> {
    try {
      // 验证任务的必要字段
      if (!updatedTask.id) {
        console.error("更新定时任务失败: 缺少必要字段 id");
        return false;
      }
      
      console.log(`[StorageManager] 更新定时任务: ID=${updatedTask.id}, 项目ID=${updatedTask.itemId}, 名称=${updatedTask.name}`);
      
      // 规范化任务对�?
      const normalizedTask = this.normalizeTask(updatedTask);
      
      // 仅在任务未提供完整项目信息时才从项目列表查找
      if (!normalizedTask.itemTitle || !normalizedTask.itemTmdbId) {
        // 确保项目相关属性正�?
        const items = await this.getItemsWithRetry();
        const relatedItem = items.find(item => item.id === normalizedTask.itemId);
        
        if (relatedItem) {
          // 只有在任务未提供这些信息时才更新
          if (!normalizedTask.itemTitle) normalizedTask.itemTitle = relatedItem.title;
          if (!normalizedTask.itemTmdbId) normalizedTask.itemTmdbId = relatedItem.tmdbId;
          console.log(`[StorageManager] 补充项目信息: ${relatedItem.title} (ID: ${relatedItem.id})`);
        } else {
          console.warn(`[StorageManager] 更新定时任务警告: ID�?${normalizedTask.itemId} 的项目不存在，但仍将更新任务`);
        }
      } else {
        console.log(`[StorageManager] 任务已包含完整项目信�? ${normalizedTask.itemTitle} (ID: ${normalizedTask.itemId})`);
      }
      
      // 更新updatedAt字段
      normalizedTask.updatedAt = new Date().toISOString();

      // 调用服务端API更新任务
      const response = await fetch('/api/scheduled-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalizedTask),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '更新定时任务失败');
      }

      console.log(`[StorageManager] 定时任务更新成功: ID=${normalizedTask.id}`);

      // 清除缓存，确保下次获取时重新读取
      this.clearScheduledTasksCache();

      return true;
    } catch (error) {
      console.error("[StorageManager] Failed to update scheduled task:", error);
      return false;
    }
  }

  /**
   * 删除定时任务
   */
  static async deleteScheduledTask(id: string): Promise<boolean> {
    try {
      console.log(`[StorageManager] 删除定时任务: ID=${id}`);

      // 调用服务端API删除任务
      const response = await fetch(`/api/scheduled-tasks?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '删除定时任务失败');
      }

      console.log(`[StorageManager] 定时任务删除成功: ID=${id}`);

      // 清除缓存，确保下次获取时重新读取
      this.clearScheduledTasksCache();

      return true;
    } catch (error) {
      console.error("[StorageManager] Failed to delete scheduled task:", error);
      return false;
    }
  }

  /**
   * 修复定时任务的项目关联（保留原有的修复逻辑）
   */
  static async fixScheduledTaskAssociations(): Promise<ScheduledTask[]> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      console.warn("[StorageManager] Not in client environment or storage not available");
      return [];
    }

    try {
      // 获取所有任务和项目
      const tasks = await this.getScheduledTasks(true); // 强制刷新
      const items = await this.getItemsWithRetry();

      console.log(`[StorageManager] 修复定时任务关联: 开始检查${tasks.length} 个任务的有效性`);

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
            console.log(`[StorageManager] 通过TMDB ID匹配到项目 ${matchByTmdbId.title}`);
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
            console.log(`[StorageManager] 通过项目标题匹配到项目 ${matchByTitle.title}`);
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
          console.log(`[StorageManager] 通过任务名称匹配到项目 ${matchByTaskName.title}`);
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
        console.warn(`[StorageManager] 无法为任务${task.id} (${task.name}) 找到匹配项目`);
        return task;
      });

      // 如果有任务被修改，通过API更新任务
      if (changed) {
        console.log(`[StorageManager] 检测到任务需要修复，正在更新...`);
        for (const task of fixedTasks) {
          try {
            await this.updateScheduledTask(task);
          } catch (error) {
            console.error(`[StorageManager] 修复任务失败: ${task.id}`, error);
          }
        }
        console.log(`[StorageManager] 已修复任务列表，共${fixedTasks.length} 个任务`);
      } else {
        console.log(`[StorageManager] 所有任务都有效，无需修复`);
      }

      return fixedTasks;
    } catch (error) {
      console.error("[StorageManager] Failed to fix scheduled task associations:", error);
      return [];
    }
  }

  /**
   * 获取指定项目的所有定时任�?
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
   * 检查系统中是否有任何项目可�?
   */
  static async hasAnyItems(): Promise<boolean> {
    try {
      console.log("[StorageManager] 检查项目可用�?..");
      const items = await this.getItemsWithRetry();
      console.log(`[StorageManager] 找到 ${items.length} 个项目`);

      if (items.length === 0) {
        // 如果没有项目，尝试调试存储状态
        console.warn("[StorageManager] 系统中没有项目，检查存储状态");

        // localStorage已移除，现在只使用服务端存储
        console.log(`[StorageManager] 使用服务端存储，localStorage已移除`);

        // 如果使用文件存储，尝试调用调试API
        if (this.USE_FILE_STORAGE) {
          try {
            const debugResponse = await fetch('/api/debug-storage');
            if (debugResponse.ok) {
              const debugData = await debugResponse.json();
              console.log(`[StorageManager] 服务器存储调试信�?`, debugData);
            }
          } catch (debugError) {
            console.warn("[StorageManager] 无法获取调试信息:", debugError);
          }
        }
      }

      return items.length > 0;
    } catch (error) {
      console.error("[StorageManager] 检查项目可用性失�?", error);
      return false;
    }
  }

  /**
   * 获取存储状态的详细信息
   */
  static async getStorageStatus(): Promise<{
    hasItems: boolean;
    itemCount: number;
    storageType: 'fileStorage';
    isClientEnvironment: boolean;
    isStorageAvailable: boolean;
    lastError?: string;
  }> {
    try {
      const items = await this.getItemsWithRetry();

      return {
        hasItems: items.length > 0,
        itemCount: items.length,
        storageType: 'fileStorage',
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
    console.log("=== 开始调试导入功�?===");

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
        console.error("�?验证失败:", validation.error);
        return;
      }

      // 2. 测试导入
      console.log("2. 测试数据导入...");
      const importResult = await this.importData(jsonData);
      console.log("导入结果:", importResult);

      if (importResult.success) {
        console.log("�?导入成功!");

        // 3. 验证导入结果
        console.log("3. 验证导入结果...");
        const items = await this.getItemsWithRetry();
        const debugItem = items.find(item => item.id === "debug-test-1");
        if (debugItem) {
          console.log("�?找到导入的测试项�?", debugItem);
        } else {
          console.log("�?未找到导入的测试项目");
        }
      } else {
        console.error("�?导入失败:", importResult.error);
      }

    } catch (error) {
      console.error("调试过程中发生错�?", error);
    }

    console.log("=== 调试完成 ===");
  }
}
