import { StorageManager, ScheduledTask } from './storage';

class TaskScheduler {
  private static instance: TaskScheduler;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler();
    }
    return TaskScheduler.instance;
  }

  /**
   * 初始化调度器，加载所有定时任务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
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
      return;
    }
    
    // 如果已有定时器，先清除
    if (this.timers.has(task.id)) {
      clearTimeout(this.timers.get(task.id));
      this.timers.delete(task.id);
    }
    
    // 计算下一次执行时间
    const nextRunTime = this.calculateNextRunTime(task);
    const delay = nextRunTime.getTime() - Date.now();
    
    // 更新任务的下一次执行时间
    this.updateTaskNextRunTime(task.id, nextRunTime.toISOString());
    
    // 设置定时器
    const timer = setTimeout(() => {
      this.executeTask(task);
    }, delay);
    
    // 保存定时器引用
    this.timers.set(task.id, timer);
    
    console.log(`[TaskScheduler] 已为任务 ${task.id} 设置定时器，将在 ${nextRunTime.toLocaleString()} 执行`);
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
      }
    } catch (error) {
      console.error(`[TaskScheduler] 更新任务执行时间失败: ${error}`);
    }
  }

  /**
   * 执行定时任务
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    try {
      console.log(`[TaskScheduler] 开始执行任务: ${task.id} - ${task.name}`);
      
      // 更新任务的最后执行时间
      const updatedTask = { ...task, lastRun: new Date().toISOString() };
      await StorageManager.updateScheduledTask(updatedTask);
      
      // 执行TMDB-Import任务
      if (task.type === 'tmdb-import') {
        try {
          await this.executeTMDBImportTask(task);
          console.log(`[TaskScheduler] 任务执行成功: ${task.id} - ${task.name}`);
        } catch (importError) {
          console.error(`[TaskScheduler] TMDB-Import任务执行失败: ${importError}`);
          
          // 更新任务状态，标记为失败
          const failedTask = { 
            ...updatedTask, 
            lastRunStatus: 'failed',
            lastRunError: importError instanceof Error ? importError.message : String(importError)
          };
          await StorageManager.updateScheduledTask(failedTask);
          
          // 重新抛出错误，让外层捕获
          throw importError;
        }
      } else {
        console.warn(`[TaskScheduler] 未知的任务类型: ${task.type}`);
      }
      
      // 更新任务状态，标记为成功
      const successTask = { ...updatedTask, lastRunStatus: 'success', lastRunError: null };
      await StorageManager.updateScheduledTask(successTask);
      
      // 重新调度任务
      this.scheduleTask(updatedTask);
    } catch (error) {
      console.error(`[TaskScheduler] 执行任务失败:`, error);
      
      // 即使失败也重新调度任务
      this.scheduleTask(task);
    }
  }

  /**
   * 执行TMDB-Import任务
   */
  private async executeTMDBImportTask(task: ScheduledTask): Promise<void> {
    try {
      // 获取关联的项目
      console.log(`[TaskScheduler] 开始执行TMDB-Import任务: ${task.id}, 获取项目信息...`);
      const items = await StorageManager.getItemsWithRetry();
      let item = items.find(i => i.id === task.itemId);
      
      // 如果找不到项目，尝试通过其他方式查找
      if (!item) {
        console.warn(`[TaskScheduler] 找不到ID为 ${task.itemId} 的项目，尝试通过任务名称查找匹配项...`);
        
        // 尝试从任务名称中提取项目标题
        const taskNameWithoutSuffix = task.name.replace(/\s+定时任务$/, '');
        
        // 尝试通过名称模糊匹配
        const possibleMatches = items.filter(i => 
          i.title.includes(taskNameWithoutSuffix) || 
          taskNameWithoutSuffix.includes(i.title)
        );
        
        if (possibleMatches.length === 1) {
          // 只找到一个匹配项，使用它
          item = possibleMatches[0];
          console.log(`[TaskScheduler] 通过名称找到匹配项: ${item.title} (ID: ${item.id})`);
          
          // 更新任务的项目ID
          const updatedTask = { ...task, itemId: item.id };
          await StorageManager.updateScheduledTask(updatedTask);
          console.log(`[TaskScheduler] 已更新任务的项目ID: ${task.id} -> ${item.id}`);
        } else if (possibleMatches.length > 1) {
          // 找到多个匹配项，尝试通过媒体类型和季数进一步筛选
          const betterMatches = possibleMatches.filter(i => i.mediaType === 'tv');
          if (betterMatches.length === 1) {
            item = betterMatches[0];
            console.log(`[TaskScheduler] 通过名称和媒体类型找到匹配项: ${item.title} (ID: ${item.id})`);
            
            // 更新任务的项目ID
            const updatedTask = { ...task, itemId: item.id };
            await StorageManager.updateScheduledTask(updatedTask);
            console.log(`[TaskScheduler] 已更新任务的项目ID: ${task.id} -> ${item.id}`);
          } else {
            console.error(`[TaskScheduler] 找到多个可能的匹配项 (${possibleMatches.length}个)，无法确定使用哪一个`);
            throw new Error(`找不到唯一匹配的项目，请手动更新任务关联的项目`);
          }
        } else {
          console.error(`[TaskScheduler] 无法找到任何匹配的项目`);
          throw new Error(`找不到ID为 ${task.itemId} 的项目，也无法通过名称匹配到现有项目`);
        }
      }
      
      // 检查项目是否有必要的信息
      if (!item.tmdbId) {
        throw new Error(`项目 ${item.title} 缺少TMDB ID`);
      }
      
      if (!item.platformUrl) {
        throw new Error(`项目 ${item.title} 缺少平台URL`);
      }
      
      // 构建执行参数
      console.log(`[TaskScheduler] 构建API请求参数: 项目=${item.title}, 季=${task.action.seasonNumber}, 自动上传=${task.action.autoUpload}, 自动过滤=${task.action.autoRemoveMarked}`);
      const params = new URLSearchParams({
        itemId: item.id,
        seasonNumber: task.action.seasonNumber.toString(),
        autoUpload: task.action.autoUpload.toString(),
        autoRemoveMarked: task.action.autoRemoveMarked.toString(),
        // 添加额外的参数，用于在找不到项目时进行备用查找
        tmdbId: item.tmdbId,
        title: item.title
      });
      
      // 构建完整URL
      const apiUrl = `/api/execute-scheduled-task?${params.toString()}`;
      console.log(`[TaskScheduler] 调用API: ${apiUrl}`);
      
      // 调用API执行任务
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`API请求失败: ${response.status} - ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      const result = await response.json();
      console.log(`[TaskScheduler] 成功执行TMDB-Import任务: ${task.id}`, result);
    } catch (error) {
      console.error(`[TaskScheduler] 执行TMDB-Import任务失败:`, error);
      throw error; // 重新抛出错误以便上层处理
    }
  }

  /**
   * 添加新任务
   */
  public async addTask(task: ScheduledTask): Promise<boolean> {
    try {
      const success = await StorageManager.addScheduledTask(task);
      
      if (success && task.enabled) {
        this.scheduleTask(task);
      }
      
      return success;
    } catch (error) {
      console.error(`[TaskScheduler] 添加任务失败: ${error}`);
      return false;
    }
  }

  /**
   * 更新任务
   */
  public async updateTask(task: ScheduledTask): Promise<boolean> {
    try {
      const success = await StorageManager.updateScheduledTask(task);
      
      if (success) {
        // 如果任务已启用，重新调度
        if (task.enabled) {
          this.scheduleTask(task);
        } else {
          // 如果任务已禁用，清除定时器
          if (this.timers.has(task.id)) {
            clearTimeout(this.timers.get(task.id));
            this.timers.delete(task.id);
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error(`[TaskScheduler] 更新任务失败: ${error}`);
      return false;
    }
  }

  /**
   * 删除任务
   */
  public async deleteTask(taskId: string): Promise<boolean> {
    try {
      const success = await StorageManager.deleteScheduledTask(taskId);
      
      if (success && this.timers.has(taskId)) {
        clearTimeout(this.timers.get(taskId));
        this.timers.delete(taskId);
      }
      
      return success;
    } catch (error) {
      console.error(`[TaskScheduler] 删除任务失败: ${error}`);
      return false;
    }
  }
}

export const taskScheduler = TaskScheduler.getInstance();

export default taskScheduler; 