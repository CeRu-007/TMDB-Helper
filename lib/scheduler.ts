import { StorageManager, ScheduledTask, TMDBItem } from './storage';

class TaskScheduler {
  private static instance: TaskScheduler;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized: boolean = false;
  private lastError: Error | null = null;
  private currentExecution: Map<string, Promise<void>> = new Map(); // 跟踪当前正在执行的任务

  private constructor() {}

  public static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler();
    }
    return TaskScheduler.instance;
  }

  /**
   * 获取最后一次执行错误
   */
  public getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * 检查任务是否正在执行
   */
  public isTaskRunning(taskId: string): boolean {
    return this.currentExecution.has(taskId);
  }

  /**
   * 初始化调度器，加载所有定时任务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[TaskScheduler] 调度器已初始化，跳过');
      return;
    }

    try {
      // 清除所有现有的定时器
      this.clearAllTimers();
      
      // 加载所有定时任务
      const tasks = await StorageManager.getScheduledTasks();
      
      // 为每个启用的任务设置定时器
      tasks.filter(task => task.enabled).forEach(task => {
        this.scheduleTask(task);
      });
      
      this.isInitialized = true;
      console.log(`[TaskScheduler] 初始化完成，已加载 ${tasks.length} 个定时任务`);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      console.error('[TaskScheduler] 初始化失败:', error);
    }
  }

  /**
   * 清除所有定时器
   */
  private clearAllTimers(): void {
    this.timers.forEach((timer, id) => {
      clearTimeout(timer);
      console.log(`[TaskScheduler] 清除定时器: ${id}`);
    });
    this.timers.clear();
  }

  /**
   * 计算下一次执行时间
   */
  private calculateNextRunTime(task: ScheduledTask): Date {
    const now = new Date();
    const nextRun = new Date();
    
    // 设置小时和分钟
    nextRun.setHours(task.schedule.hour);
    nextRun.setMinutes(task.schedule.minute);
    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);
    
    // 如果是每周执行
    if (task.schedule.type === 'weekly' && task.schedule.dayOfWeek !== undefined) {
      // 获取当前是周几 (0-6, 0是周日)
      const currentDay = now.getDay();
      // 调整为我们的约定 (0-6, 0是周一)
      const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;
      const targetDay = task.schedule.dayOfWeek;
      
      // 计算到目标日期的天数差
      let daysUntilTarget = targetDay - adjustedCurrentDay;
      if (daysUntilTarget < 0) {
        daysUntilTarget += 7; // 如果是过去的日期，加上一周
      } else if (daysUntilTarget === 0 && now > nextRun) {
        daysUntilTarget = 7; // 如果是今天但已经过了时间，设为下周
      }
      
      // 设置到正确的日期
      nextRun.setDate(now.getDate() + daysUntilTarget);
    } else {
      // 每天执行，如果今天的时间已过，则设为明天
      if (now > nextRun) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    }
    
    return nextRun;
  }

  /**
   * 为任务设置定时器
   */
  public scheduleTask(task: ScheduledTask): void {
    if (!task.enabled) {
      console.log(`[TaskScheduler] 任务 ${task.id} (${task.name}) 已禁用，不设置定时器`);
      return;
    }
    
    // 如果已有定时器，先清除
    if (this.timers.has(task.id)) {
      clearTimeout(this.timers.get(task.id));
      this.timers.delete(task.id);
      console.log(`[TaskScheduler] 清除任务 ${task.id} 的现有定时器`);
    }
    
    // 计算下一次执行时间
    const nextRunTime = this.calculateNextRunTime(task);
    const delay = nextRunTime.getTime() - Date.now();
    
    // 如果延迟时间为负数或过小，设置一个最小延迟（10秒）
    const adjustedDelay = delay < 10000 ? 10000 : delay;
    
    // 更新任务的下一次执行时间
    this.updateTaskNextRunTime(task.id, nextRunTime.toISOString());
    
    // 设置定时器
    const timer = setTimeout(() => {
      this.executeTask(task);
    }, adjustedDelay);
    
    // 保存定时器引用
    this.timers.set(task.id, timer);
    
    // 格式化下一次执行时间为本地时间字符串
    const nextRunLocale = nextRunTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    console.log(`[TaskScheduler] 已为任务 ${task.id} 设置定时器，将在 ${nextRunLocale} 执行 (延迟 ${Math.round(adjustedDelay / 1000 / 60)} 分钟)`);
  }

  /**
   * 更新任务的下一次执行时间
   */
  private async updateTaskNextRunTime(taskId: string, nextRunTime: string): Promise<void> {
    try {
      const tasks = await StorageManager.getScheduledTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex !== -1) {
        tasks[taskIndex].nextRun = nextRunTime;
        await StorageManager.updateScheduledTask(tasks[taskIndex]);
      } else {
        console.warn(`[TaskScheduler] 更新任务执行时间失败: 找不到ID为 ${taskId} 的任务`);
      }
    } catch (error) {
      console.error(`[TaskScheduler] 更新任务执行时间失败: ${error}`);
    }
  }

  /**
   * 获取关联项目，包含多种备用策略
   */
  private async getRelatedItem(task: ScheduledTask): Promise<TMDBItem | null> {
    try {
      // 策略1：通过itemId直接查找
      const items = await StorageManager.getItemsWithRetry();
      let relatedItem = items.find(item => item.id === task.itemId);
      
      if (relatedItem) {
        console.log(`[TaskScheduler] 通过itemId找到关联项目: ${relatedItem.title} (ID: ${relatedItem.id})`);
        return relatedItem;
      }
      
      // 策略2：如果有itemTmdbId，尝试通过TMDB ID查找
      if (task.itemTmdbId) {
        relatedItem = items.find(item => item.tmdbId === task.itemTmdbId);
        if (relatedItem) {
          console.log(`[TaskScheduler] 通过TMDB ID找到关联项目: ${relatedItem.title} (ID: ${relatedItem.id})`);
          
          // 更新任务的itemId为找到的项目ID
          await this.updateTaskItemId(task.id, relatedItem.id);
          return relatedItem;
        }
      }
      
      // 策略3：通过项目标题匹配
      if (task.itemTitle) {
        // 精确匹配
        relatedItem = items.find(item => item.title === task.itemTitle);
        if (relatedItem) {
          console.log(`[TaskScheduler] 通过标题精确匹配找到关联项目: ${relatedItem.title} (ID: ${relatedItem.id})`);
          await this.updateTaskItemId(task.id, relatedItem.id);
          return relatedItem;
        }
        
        // 近似匹配（包含关系）
        relatedItem = items.find(item => 
          (item.title.includes(task.itemTitle) && item.title.length - task.itemTitle.length < 5) ||
          (task.itemTitle.includes(item.title) && task.itemTitle.length - item.title.length < 5)
        );
        
        if (relatedItem) {
          console.log(`[TaskScheduler] 通过标题近似匹配找到关联项目: ${relatedItem.title} (ID: ${relatedItem.id})`);
          await this.updateTaskItemId(task.id, relatedItem.id);
          return relatedItem;
        }
      }
      
      // 策略4：尝试从任务名称推断项目名
      const taskTitle = task.name.replace(/\s*定时任务$/, '');
      relatedItem = items.find(item => 
        item.title === taskTitle ||
        (item.title.includes(taskTitle) && item.title.length - taskTitle.length < 5) ||
        (taskTitle.includes(item.title) && taskTitle.length - item.title.length < 5)
      );
      
      if (relatedItem) {
        console.log(`[TaskScheduler] 通过任务名称匹配找到关联项目: ${relatedItem.title} (ID: ${relatedItem.id})`);
        await this.updateTaskItemId(task.id, relatedItem.id);
        return relatedItem;
      }
      
      // 如果所有策略都失败，返回null
      console.warn(`[TaskScheduler] 无法找到任务 ${task.id} (${task.name}) 的关联项目`);
      return null;
    } catch (error) {
      console.error(`[TaskScheduler] 获取关联项目失败:`, error);
      return null;
    }
  }
  
  /**
   * 更新任务的itemId
   */
  private async updateTaskItemId(taskId: string, newItemId: string): Promise<void> {
    try {
      const tasks = await StorageManager.getScheduledTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex !== -1) {
        tasks[taskIndex].itemId = newItemId;
        tasks[taskIndex].updatedAt = new Date().toISOString();
        await StorageManager.updateScheduledTask(tasks[taskIndex]);
        console.log(`[TaskScheduler] 已更新任务 ${taskId} 的itemId为 ${newItemId}`);
      }
    } catch (error) {
      console.error(`[TaskScheduler] 更新任务itemId失败:`, error);
    }
  }

  /**
   * 执行定时任务
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    // 如果任务已在执行中，跳过本次执行
    if (this.currentExecution.has(task.id)) {
      console.warn(`[TaskScheduler] 任务 ${task.id} (${task.name}) 已在执行中，跳过本次执行`);
      // 重新调度任务
      this.scheduleTask(task);
      return;
    }
    
    // 创建执行Promise并存储
    const executionPromise = this._executeTaskInternal(task).finally(() => {
      // 执行完成后从映射中移除
      this.currentExecution.delete(task.id);
    });
    
    // 将当前执行添加到映射
    this.currentExecution.set(task.id, executionPromise);
    
    // 等待执行完成
    await executionPromise;
  }
  
  /**
   * 任务执行的内部实现
   */
  private async _executeTaskInternal(task: ScheduledTask): Promise<void> {
    try {
      console.log(`[TaskScheduler] 开始执行任务: ${task.id} - ${task.name}`);
      
      // 更新任务的最后执行时间
      const updatedTask = { ...task, lastRun: new Date().toISOString() };
      await StorageManager.updateScheduledTask(updatedTask);
      
      // 执行TMDB-Import任务
      if (task.type === 'tmdb-import') {
        try {
          // 首先获取关联的项目
          const relatedItem = await this.getRelatedItem(task);
          
          if (!relatedItem) {
            throw new Error(`找不到任务关联的项目 (itemId: ${task.itemId}, 名称: ${task.itemTitle || task.name})`);
          }
          
          // 检查项目是否有指定的季数
          if (task.action.seasonNumber > 0 && relatedItem.mediaType === 'tv') {
            if (!relatedItem.seasons || !relatedItem.seasons.some(s => s.seasonNumber === task.action.seasonNumber)) {
              throw new Error(`项目 ${relatedItem.title} 没有第 ${task.action.seasonNumber} 季`);
            }
          }
          
          // 执行导入任务
          await this.executeTMDBImportTask(task, relatedItem);
          console.log(`[TaskScheduler] 任务执行成功: ${task.id} - ${task.name}`);
          
          // 更新任务状态，标记为成功
          const successTask = { 
            ...updatedTask, 
            lastRunStatus: 'success' as const, 
            lastRunError: null 
          };
          await StorageManager.updateScheduledTask(successTask);
        } catch (importError) {
          console.error(`[TaskScheduler] TMDB-Import任务执行失败:`, importError);
          
          // 更新任务状态，标记为失败
          const failedTask = { 
            ...updatedTask, 
            lastRunStatus: 'failed' as const,
            lastRunError: importError instanceof Error ? importError.message : String(importError)
          };
          await StorageManager.updateScheduledTask(failedTask);
          
          // 重新抛出错误，让外层捕获
          throw importError;
        }
      } else {
        console.warn(`[TaskScheduler] 未知的任务类型: ${task.type}`);
      }
      
      // 重新调度任务
      this.scheduleTask(updatedTask);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[TaskScheduler] 执行任务失败:`, error);
      
      // 即使失败也重新调度任务
      this.scheduleTask(task);
    }
  }

  /**
   * 立即执行任务
   */
  public async runTaskNow(taskId: string): Promise<{ success: boolean; message: string; }> {
    try {
      const tasks = await StorageManager.getScheduledTasks();
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        return { 
          success: false, 
          message: `找不到ID为 ${taskId} 的任务` 
        };
      }
      
      // 如果任务已在执行中，返回提示
      if (this.currentExecution.has(taskId)) {
        return { 
          success: false, 
          message: `任务 ${task.name} 已在执行中` 
        };
      }
      
      console.log(`[TaskScheduler] 手动执行任务: ${task.id} - ${task.name}`);
      
      // 创建执行Promise
      const executionPromise = this._executeTaskInternal(task);
      
      // 将当前执行添加到映射
      this.currentExecution.set(taskId, executionPromise);
      
      // 等待执行完成
      await executionPromise;
      
      return { 
        success: true, 
        message: `任务 ${task.name} 执行完成` 
      };
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[TaskScheduler] 手动执行任务失败:`, error);
      
      return { 
        success: false, 
        message: `执行失败: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * 执行TMDB-Import任务
   */
  private async executeTMDBImportTask(task: ScheduledTask, item: TMDBItem): Promise<void> {
    // 构建请求数据
    const requestData = {
      taskId: task.id,
      itemId: item.id,
      action: task.action
    };
    
    try {
      console.log(`[TaskScheduler] 调用API执行TMDB-Import任务: ${JSON.stringify(requestData)}`);
      
      // 调用API端点执行任务
      const response = await fetch('/api/execute-scheduled-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败 (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`[TaskScheduler] API执行结果:`, result);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return;
    } catch (error) {
      console.error(`[TaskScheduler] 执行TMDB-Import任务失败:`, error);
      throw error;
    }
  }

  /**
   * 添加任务
   */
  public async addTask(task: ScheduledTask): Promise<boolean> {
    try {
      // 确保任务有ID
      if (!task.id) {
        console.error('[TaskScheduler] 添加任务失败: 任务缺少ID');
        return false;
      }
      
      // 添加任务到存储
      const success = await StorageManager.addScheduledTask(task);
      
      if (success && task.enabled) {
        // 如果任务已启用，为其设置定时器
        this.scheduleTask(task);
      }
      
      return success;
    } catch (error) {
      console.error('[TaskScheduler] 添加任务失败:', error);
      return false;
    }
  }

  /**
   * 更新任务
   */
  public async updateTask(task: ScheduledTask): Promise<boolean> {
    try {
      // 确保任务有ID
      if (!task.id) {
        console.error('[TaskScheduler] 更新任务失败: 任务缺少ID');
        return false;
      }
      
      // 获取原始任务状态
      const tasks = await StorageManager.getScheduledTasks();
      const originalTask = tasks.find(t => t.id === task.id);
      const wasEnabled = originalTask?.enabled ?? false;
      
      // 更新任务
      const success = await StorageManager.updateScheduledTask(task);
      
      if (success) {
        // 如果任务状态从禁用变为启用，或者任务保持启用状态但调度信息更改
        if (task.enabled && (!wasEnabled || 
            (originalTask && (
              originalTask.schedule.type !== task.schedule.type ||
              originalTask.schedule.hour !== task.schedule.hour ||
              originalTask.schedule.minute !== task.schedule.minute ||
              (task.schedule.type === 'weekly' && originalTask.schedule.dayOfWeek !== task.schedule.dayOfWeek)
            ))
          )) {
          // 重新调度任务
          this.scheduleTask(task);
        } 
        // 如果任务从启用变为禁用，清除定时器
        else if (!task.enabled && wasEnabled) {
          if (this.timers.has(task.id)) {
            clearTimeout(this.timers.get(task.id));
            this.timers.delete(task.id);
            console.log(`[TaskScheduler] 任务 ${task.id} 已禁用，清除定时器`);
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error('[TaskScheduler] 更新任务失败:', error);
      return false;
    }
  }

  /**
   * 删除任务
   */
  public async deleteTask(taskId: string): Promise<boolean> {
    try {
      // 清除定时器
      if (this.timers.has(taskId)) {
        clearTimeout(this.timers.get(taskId));
        this.timers.delete(taskId);
      }
      
      // 从存储中删除任务
      return await StorageManager.deleteScheduledTask(taskId);
    } catch (error) {
      console.error('[TaskScheduler] 删除任务失败:', error);
      return false;
    }
  }
  
  /**
   * 清理所有无效任务
   */
  public async cleanInvalidTasks(): Promise<{ success: boolean; message: string; cleanedCount: number; }> {
    try {
      // 获取所有任务和项目
      const tasks = await StorageManager.getScheduledTasks();
      const items = await StorageManager.getItemsWithRetry();
      
      // 找出无效任务（没有对应项目的任务）
      const invalidTasks = tasks.filter(task => {
        // 检查是否有对应的项目
        const hasValidItem = items.some(item => item.id === task.itemId);
        return !hasValidItem;
      });
      
      if (invalidTasks.length === 0) {
        return {
          success: true,
          message: "没有发现无效任务",
          cleanedCount: 0
        };
      }
      
      console.log(`[TaskScheduler] 发现 ${invalidTasks.length} 个无效任务，准备清理`);
      
      // 尝试修复任务
      const fixedTasks = await StorageManager.forceRefreshScheduledTasks();
      
      // 再次检查哪些任务仍然无效
      const stillInvalidTasks = fixedTasks.filter(task => {
        return !items.some(item => item.id === task.itemId);
      });
      
      if (stillInvalidTasks.length === 0) {
        return {
          success: true,
          message: `成功修复了 ${invalidTasks.length} 个无效任务`,
          cleanedCount: invalidTasks.length
        };
      }
      
      // 删除仍然无效的任务
      let deleteCount = 0;
      for (const task of stillInvalidTasks) {
        // 清除定时器
        if (this.timers.has(task.id)) {
          clearTimeout(this.timers.get(task.id));
          this.timers.delete(task.id);
        }
        
        // 从存储中删除任务
        const deleted = await StorageManager.deleteScheduledTask(task.id);
        if (deleted) {
          deleteCount++;
        }
      }
      
      const fixedCount = invalidTasks.length - stillInvalidTasks.length;
      
      return {
        success: true,
        message: `清理了 ${invalidTasks.length} 个无效任务: ${fixedCount} 个已修复, ${deleteCount} 个已删除`,
        cleanedCount: fixedCount + deleteCount
      };
    } catch (error) {
      console.error('[TaskScheduler] 清理无效任务失败:', error);
      return {
        success: false,
        message: `清理失败: ${error instanceof Error ? error.message : String(error)}`,
        cleanedCount: 0
      };
    }
  }
}

// 创建全局调度器实例
export const taskScheduler = TaskScheduler.getInstance();

// 导出类型，方便其他模块使用
export type { ScheduledTask, TMDBItem }; 