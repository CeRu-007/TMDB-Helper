import { StorageManager, ScheduledTask, TMDBItem } from './storage';

class TaskScheduler {
  private static instance: TaskScheduler;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized: boolean = false;
  private lastError: Error | null = null;
  private currentExecution: Map<string, Promise<void>> = new Map(); // 跟踪当前正在执行的任务
  private validationTimer: NodeJS.Timeout | null = null; // 定期验证定时器

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
   * 手动执行任务（公开方法）
   */
  public async executeTaskManually(task: ScheduledTask): Promise<void> {
    console.log(`[TaskScheduler] 手动执行任务: ${task.id} - ${task.name}`);

    // 检查任务是否已在执行中
    if (this.currentExecution.has(task.id)) {
      throw new Error(`任务 ${task.name} 已在执行中，请等待完成`);
    }

    // 检查任务是否启用
    if (!task.enabled) {
      console.warn(`[TaskScheduler] 任务 ${task.id} 已禁用，但允许手动执行`);
    }

    // 执行任务
    await this.executeTask(task);
  }

  /**
   * 获取调度器状态信息
   */
  public getSchedulerStatus(): {
    isInitialized: boolean;
    activeTimers: number;
    runningTasks: number;
    timerDetails: Array<{taskId: string, nextRun?: string}>;
  } {
    const timerDetails: Array<{taskId: string, nextRun?: string}> = [];

    // 获取所有定时器的详细信息
    this.timers.forEach((timer, taskId) => {
      timerDetails.push({ taskId });
    });

    return {
      isInitialized: this.isInitialized,
      activeTimers: this.timers.size,
      runningTasks: this.currentExecution.size,
      timerDetails
    };
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

      // 验证和修复任务关联
      console.log('[TaskScheduler] 验证任务关联...');
      const validationResult = await StorageManager.validateAndFixTaskAssociations();

      if (validationResult.invalidTasks > 0) {
        console.log(`[TaskScheduler] 任务关联验证结果: 总任务=${validationResult.totalTasks}, 无效=${validationResult.invalidTasks}, 修复=${validationResult.fixedTasks}, 删除=${validationResult.deletedTasks}`);

        // 记录详细信息
        validationResult.details.forEach(detail => {
          console.log(`[TaskScheduler] ${detail}`);
        });
      }

      // 加载所有定时任务（已经过验证和修复）
      const tasks = await StorageManager.getScheduledTasks();

      // 为每个启用的任务设置定时器
      const enabledTasks = tasks.filter(task => task.enabled);
      enabledTasks.forEach(task => {
        this.scheduleTask(task);
      });

      // 启动定期验证任务关联的定时器（每小时检查一次）
      this.startPeriodicValidation();

      this.isInitialized = true;
      console.log(`[TaskScheduler] 初始化完成，已加载 ${tasks.length} 个定时任务 (${enabledTasks.length} 个已启用)`);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      console.error('[TaskScheduler] 初始化失败:', error);
    }
  }

  /**
   * 启动定期验证任务关联
   */
  private startPeriodicValidation(): void {
    // 清除现有的验证定时器
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
    }

    // 设置每小时验证一次任务关联
    this.validationTimer = setInterval(async () => {
      try {
        console.log('[TaskScheduler] 执行定期任务关联验证');
        const result = await StorageManager.validateAndFixTaskAssociations();

        if (result.invalidTasks > 0) {
          console.log(`[TaskScheduler] 定期验证发现并处理了 ${result.invalidTasks} 个无效任务`);

          // 如果有任务被修复或删除，重新初始化调度器
          if (result.fixedTasks > 0 || result.deletedTasks > 0) {
            console.log(`[TaskScheduler] 任务关联已更新，重新初始化调度器`);
            this.isInitialized = false;
            await this.initialize();
          }
        }
      } catch (error) {
        console.error('[TaskScheduler] 定期验证任务关联失败:', error);
      }
    }, 60 * 60 * 1000); // 每小时执行一次

    console.log('[TaskScheduler] 已启动定期任务关联验证 (每小时一次)');
  }

  /**
   * 停止定期验证
   */
  private stopPeriodicValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
      console.log('[TaskScheduler] 已停止定期任务关联验证');
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

    // 同时清除验证定时器
    this.stopPeriodicValidation();
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
    const timer = setTimeout(async () => {
      // 在执行时获取最新的任务状态
      try {
        const tasks = await StorageManager.getScheduledTasks();
        const latestTask = tasks.find(t => t.id === task.id);

        if (latestTask && latestTask.enabled) {
          this.executeTask(latestTask);
        } else {
          console.warn(`[TaskScheduler] 任务 ${task.id} 不存在或已禁用，跳过执行`);
        }
      } catch (error) {
        console.error(`[TaskScheduler] 获取最新任务状态失败，使用原始任务执行:`, error);
        this.executeTask(task);
      }
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
      console.log(`[TaskScheduler] 获取关联项目: 任务ID=${task.id}, 项目ID=${task.itemId}, 项目标题="${task.itemTitle || '未知'}"`);
      
      let relatedItem: TMDBItem | null = null;
      const items = await StorageManager.getItemsWithRetry();
      console.log(`[TaskScheduler] 当前系统中共有 ${items.length} 个项目`);
      
      if (items.length === 0) {
        console.warn(`[TaskScheduler] 系统中没有可用项目，无法继续处理`);
        throw new Error(`系统中没有可用项目，请先添加项目`);
      }
      
      // 策略1：直接通过ID匹配
      const foundItem = items.find(item => item.id === task.itemId);
      if (foundItem) {
        console.log(`[TaskScheduler] 直接通过ID找到了项目: ${foundItem.title} (ID: ${foundItem.id})`);
        return foundItem;
      }
      
      console.warn(`[TaskScheduler] 未找到ID为 ${task.itemId} 的项目，尝试替代方案...`);
      
      // 策略2：通过TMDB ID匹配
      if (task.itemTmdbId) {
        console.log(`[TaskScheduler] 尝试通过TMDB ID匹配: ${task.itemTmdbId}`);
        const tmdbMatch = items.find(item => item.tmdbId === task.itemTmdbId);
        if (tmdbMatch) {
          console.log(`[TaskScheduler] 通过TMDB ID找到了项目: ${tmdbMatch.title} (ID: ${tmdbMatch.id})`);
          await this.updateTaskItemId(task.id, tmdbMatch.id);
          return tmdbMatch;
        }
      }
      
      // 策略3：通过标题精确匹配
      if (task.itemTitle) {
        console.log(`[TaskScheduler] 尝试通过标题精确匹配: "${task.itemTitle}"`);
        const titleMatch = items.find(item => item.title === task.itemTitle);
        if (titleMatch) {
          console.log(`[TaskScheduler] 通过标题精确匹配找到了项目: ${titleMatch.title} (ID: ${titleMatch.id})`);
          await this.updateTaskItemId(task.id, titleMatch.id);
          return titleMatch;
        }
      }
      
      // 策略4：通过标题模糊匹配
      if (task.itemTitle) {
        console.log(`[TaskScheduler] 尝试通过标题模糊匹配: "${task.itemTitle}"`);
        const possibleItems = items.filter(item => 
          (item.title.includes(task.itemTitle) && item.title.length - task.itemTitle.length < 10) ||
          (task.itemTitle.includes(item.title) && task.itemTitle.length - item.title.length < 10)
        );
        
        if (possibleItems.length > 0) {
          console.log(`[TaskScheduler] 通过标题模糊匹配找到了 ${possibleItems.length} 个可能的项目`);
          
          // 如果只有一个匹配项，直接使用
          if (possibleItems.length === 1) {
            const matchItem = possibleItems[0];
            console.log(`[TaskScheduler] 选择唯一的模糊匹配项: ${matchItem.title} (ID: ${matchItem.id})`);
            await this.updateTaskItemId(task.id, matchItem.id);
            return matchItem;
          }
          
          // 如果有多个，尝试找到与任务创建时间最接近的项目
          const sameTypeItems = [...possibleItems].sort((a, b) => 
            Math.abs(new Date(a.createdAt).getTime() - new Date(task.createdAt).getTime()) -
            Math.abs(new Date(b.createdAt).getTime() - new Date(task.createdAt).getTime())
          );
          const bestMatch = sameTypeItems[0];
          console.log(`[TaskScheduler] 从多个同类型候选项中选择创建时间最接近的: ${bestMatch.title} (ID: ${bestMatch.id})`);
          await this.updateTaskItemId(task.id, bestMatch.id);
          return bestMatch;
        }
      }
      
      // 策略5：尝试紧急修复 - 检查特定问题ID
      if (task.itemId === "1749566411729") {
        console.log(`[TaskScheduler] 检测到问题ID 1749566411729，尝试应用特殊修复...`);
        
        // 检查是否有最近创建的项目可能是此ID的正确对应项
        const recentItems = [...items].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 10); // 获取最近创建的10个项目
        
        console.log(`[TaskScheduler] 最近创建的项目: ${recentItems.map(item => `${item.title} (ID: ${item.id}, 创建时间: ${item.createdAt})`).join(', ')}`);
        
        if (recentItems.length > 0) {
          // 选择第一个项目作为应急措施
          const emergencyItem = recentItems[0];
          console.log(`[TaskScheduler] 应急修复: 将使用最近创建的项目 ${emergencyItem.title} (ID: ${emergencyItem.id}) 替代问题ID`);
          await this.updateTaskItemId(task.id, emergencyItem.id);
          return emergencyItem;
        }
      }
      
      // 策略6：任务名称解析匹配 - 尝试从任务名称中提取可能的项目标题
      const taskNameWithoutSuffix = task.name.replace(/\s*定时任务$/, '');
      console.log(`[TaskScheduler] 尝试通过任务名称匹配: "${taskNameWithoutSuffix}"`);
      
      const nameMatchItems = items.filter(item => 
        (item.title.includes(taskNameWithoutSuffix) && item.title.length - taskNameWithoutSuffix.length < 15) ||
        (taskNameWithoutSuffix.includes(item.title) && taskNameWithoutSuffix.length - item.title.length < 15)
      );
      
      if (nameMatchItems.length > 0) {
        // 如果只有一个匹配项，直接使用
        if (nameMatchItems.length === 1) {
          const nameMatch = nameMatchItems[0];
          console.log(`[TaskScheduler] 通过任务名称找到匹配项: ${nameMatch.title} (ID: ${nameMatch.id})`);
          await this.updateTaskItemId(task.id, nameMatch.id);
          return nameMatch;
        }
        
        // 如果有多个，使用创建时间最接近的
        const sortedByDate = [...nameMatchItems].sort((a, b) => 
          Math.abs(new Date(a.createdAt).getTime() - new Date(task.createdAt).getTime()) -
          Math.abs(new Date(b.createdAt).getTime() - new Date(task.createdAt).getTime())
        );
        
        const closestMatch = sortedByDate[0];
        console.log(`[TaskScheduler] 从多个名称匹配项中选择创建时间最接近的: ${closestMatch.title} (ID: ${closestMatch.id})`);
        await this.updateTaskItemId(task.id, closestMatch.id);
        return closestMatch;
      }
      
      // 策略7：完全备用 - 如果所有策略都失败，使用最近创建的项目
      console.warn(`[TaskScheduler] 所有匹配策略均失败，尝试使用最近创建的项目作为备用`);
      
      const sortedByDate = [...items].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      if (sortedByDate.length > 0) {
        const lastResortItem = sortedByDate[0];
        console.log(`[TaskScheduler] 备用策略: 使用最近创建的项目 ${lastResortItem.title} (ID: ${lastResortItem.id})`);
        await this.updateTaskItemId(task.id, lastResortItem.id);
        return lastResortItem;
      }
      
      // 如果所有策略都失败，返回null
      console.warn(`[TaskScheduler] 无法找到任务 ${task.id} (${task.name}) 的关联项目，所有匹配策略均失败`);
      
      // 创建一个特殊错误
      const error = new Error(`找不到项目ID ${task.itemId}，请尝试对任务进行重新关联或删除`);
      error.name = "ItemNotFoundError";
      this.lastError = error;
      
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
    const currentTime = new Date().toLocaleString('zh-CN');
    console.log(`[TaskScheduler] 定时器触发，准备执行任务: ${task.id} (${task.name}) 在 ${currentTime}`);

    // 如果任务已在执行中，跳过本次执行
    if (this.currentExecution.has(task.id)) {
      console.warn(`[TaskScheduler] 任务 ${task.id} (${task.name}) 已在执行中，跳过本次执行`);
      // 重新调度任务
      this.scheduleTask(task);
      return;
    }

    // 检查任务是否仍然启用
    if (!task.enabled) {
      console.warn(`[TaskScheduler] 任务 ${task.id} (${task.name}) 已禁用，跳过执行`);
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
          let relatedItem = await this.getRelatedItem(task);

          if (!relatedItem) {
            console.warn(`[TaskScheduler] 任务 ${task.name} 的关联项目不存在，尝试重新关联`);

            // 尝试重新关联项目
            const result = await this.attemptToRelinkTask(task);
            if (!result.success) {
              // 如果重新关联失败，尝试使用存储管理器的修复方法
              console.warn(`[TaskScheduler] 重新关联失败，尝试使用存储管理器修复`);
              const items = await StorageManager.getItemsWithRetry();
              const fixResult = await StorageManager['attemptToFixTaskAssociation'](task, items);

              if (fixResult.success && fixResult.newItemId) {
                // 更新任务关联
                const updatedTask = {
                  ...task,
                  itemId: fixResult.newItemId,
                  itemTitle: fixResult.newItemTitle || task.itemTitle,
                  itemTmdbId: fixResult.newItemTmdbId || task.itemTmdbId,
                  updatedAt: new Date().toISOString()
                };

                await StorageManager.updateScheduledTask(updatedTask);
                relatedItem = await this.getRelatedItem(updatedTask);

                if (relatedItem) {
                  console.log(`[TaskScheduler] 成功修复任务关联: ${task.name} -> ${relatedItem.title}`);
                } else {
                  throw new Error(`修复任务关联后仍无法找到项目 (itemId: ${fixResult.newItemId})`);
                }
              } else {
                throw new Error(result.message || `找不到任务关联的项目且无法修复 (itemId: ${task.itemId}, 名称: ${task.itemTitle || task.name})`);
              }
            } else {
              // 使用重新关联的项目
              const updatedTask = {...task, itemId: result.newItemId as string};
              relatedItem = await this.getRelatedItem(updatedTask);

              if (!relatedItem) {
                throw new Error(`重新关联项目失败，仍然找不到有效项目 (itemId: ${result.newItemId})`);
              }

              // 更新任务的项目ID
              await this.updateTaskItemId(task.id, result.newItemId as string);
              console.log(`[TaskScheduler] 成功重新关联任务: ${task.name} -> ${relatedItem.title}`);
            }
          }

          // 验证项目的有效性
          if (!relatedItem) {
            throw new Error(`无法获取有效的关联项目`);
          }

          // 检查项目是否有指定的季数
          if (task.action.seasonNumber > 0 && relatedItem.mediaType === 'tv') {
            if (!relatedItem.seasons || !relatedItem.seasons.some(s => s.seasonNumber === task.action.seasonNumber)) {
              throw new Error(`项目 ${relatedItem.title} 没有第 ${task.action.seasonNumber} 季`);
            }
          }

          // 检查项目是否有平台URL
          if (!relatedItem.platformUrl) {
            throw new Error(`项目 ${relatedItem.title} 没有设置平台URL，无法执行TMDB-Import任务`);
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

          // 使用更新后的任务对象重新调度
          this.scheduleTask(successTask);
        } catch (importError) {
          console.error(`[TaskScheduler] TMDB-Import任务执行失败:`, importError);
          
          // 更新任务状态，标记为失败
          const failedTask = {
            ...updatedTask,
            lastRunStatus: 'failed' as const,
            lastRunError: importError instanceof Error ? importError.message : String(importError)
          };
          await StorageManager.updateScheduledTask(failedTask);

          // 即使失败也要重新调度任务
          this.scheduleTask(failedTask);

          // 重新抛出错误，让外层捕获
          throw importError;
        }
      } else {
        console.warn(`[TaskScheduler] 未知的任务类型: ${task.type}`);
        // 对于未知类型的任务，也要重新调度
        this.scheduleTask(updatedTask);
      }

      // 注意：成功和失败的重新调度已经在各自的分支中处理了
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[TaskScheduler] 执行任务失败:`, error);

      // 对于未捕获的错误，使用原始任务重新调度
      // 但首先尝试更新任务状态
      try {
        const errorTask = {
          ...task,
          lastRun: new Date().toISOString(),
          lastRunStatus: 'failed' as const,
          lastRunError: error instanceof Error ? error.message : String(error)
        };
        await StorageManager.updateScheduledTask(errorTask);
        this.scheduleTask(errorTask);
      } catch (updateError) {
        console.error(`[TaskScheduler] 更新任务状态失败:`, updateError);
        // 如果更新失败，使用原始任务重新调度
        this.scheduleTask(task);
      }
    }
  }

  /**
   * 尝试重新关联任务到有效项目
   */
  private async attemptToRelinkTask(task: ScheduledTask): Promise<{success: boolean, message?: string, newItemId?: string}> {
    try {
      console.log(`[TaskScheduler] 尝试重新关联任务 ${task.id} (${task.name})`);
      
      // 获取所有项目
      const items = await StorageManager.getItemsWithRetry();
      
      if (items.length === 0) {
        return {
          success: false,
          message: "系统中没有任何项目，无法关联任务"
        };
      }
      
      // 策略1: 通过TMDB ID匹配
      if (task.itemTmdbId) {
        console.log(`[TaskScheduler] 尝试通过TMDB ID (${task.itemTmdbId}) 匹配项目`);
        const matchByTmdbId = items.find(item => item.tmdbId === task.itemTmdbId);
        
        if (matchByTmdbId) {
          console.log(`[TaskScheduler] 通过TMDB ID匹配到项目: ${matchByTmdbId.title} (ID: ${matchByTmdbId.id})`);
          return {
            success: true,
            message: `已通过TMDB ID关联到项目 ${matchByTmdbId.title}`,
            newItemId: matchByTmdbId.id
          };
        }
      }
      
      // 策略2: 通过项目标题匹配
      if (task.itemTitle) {
        console.log(`[TaskScheduler] 尝试通过标题 (${task.itemTitle}) 匹配项目`);
        
        // 模糊匹配
        const matchByTitle = items.find(item => 
          item.title === task.itemTitle ||
          (item.title.includes(task.itemTitle) && item.title.length - task.itemTitle.length < 10) ||
          (task.itemTitle.includes(item.title) && task.itemTitle.length - item.title.length < 10)
        );
        
        if (matchByTitle) {
          console.log(`[TaskScheduler] 通过标题匹配到项目: ${matchByTitle.title} (ID: ${matchByTitle.id})`);
          return {
            success: true,
            message: `已通过标题关联到项目 ${matchByTitle.title}`,
            newItemId: matchByTitle.id
          };
        }
      }
      
      // 策略3: 通过任务名称提取可能的标题
      if (task.name) {
        const possibleTitle = task.name.replace(/\s*定时任务$/, '');
        console.log(`[TaskScheduler] 尝试通过任务名称提取的标题 (${possibleTitle}) 匹配项目`);
        
        // 模糊匹配
        const matchByTaskName = items.find(item => 
          item.title === possibleTitle ||
          (item.title.includes(possibleTitle) && item.title.length - possibleTitle.length < 10) ||
          (possibleTitle.includes(item.title) && possibleTitle.length - item.title.length < 10)
        );
        
        if (matchByTaskName) {
          console.log(`[TaskScheduler] 通过任务名称匹配到项目: ${matchByTaskName.title} (ID: ${matchByTaskName.id})`);
          return {
            success: true,
            message: `已通过任务名称关联到项目 ${matchByTaskName.title}`,
            newItemId: matchByTaskName.id
          };
        }
      }
      
      // 策略4: 使用最近创建的项目作为最后手段
      console.log(`[TaskScheduler] 使用最近创建的项目作为最后手段`);
      
      // 按创建时间排序
      const sortedItems = [...items].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      if (sortedItems.length > 0) {
        const fallbackItem = sortedItems[0];
        console.log(`[TaskScheduler] 使用最近创建的项目: ${fallbackItem.title} (ID: ${fallbackItem.id})`);
        
        return {
          success: true,
          message: `已关联到最近创建的项目 ${fallbackItem.title}`,
          newItemId: fallbackItem.id
        };
      }
      
      return {
        success: false,
        message: "无法找到合适的项目进行关联"
      };
    } catch (error) {
      console.error(`[TaskScheduler] 重新关联任务失败:`, error);
      return {
        success: false,
        message: `重新关联任务失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 执行TMDB-Import任务 - 新的完整工作流程
   */
  private async executeTMDBImportTask(task: ScheduledTask, item: TMDBItem): Promise<void> {
    console.log(`[TaskScheduler] 开始执行完整的TMDB-Import工作流程: ${item.title}`);

    try {
      // 验证基本条件
      if (!item.platformUrl) {
        throw new Error(`项目 ${item.title} 缺少平台URL，无法执行TMDB导入`);
      }

      if (task.action.seasonNumber > 0 && item.mediaType === 'tv') {
        if (!item.seasons || !item.seasons.some(s => s.seasonNumber === task.action.seasonNumber)) {
          throw new Error(`项目 ${item.title} 没有第 ${task.action.seasonNumber} 季，请检查季数设置`);
        }
      }

      // 步骤1: 播出平台抓取
      console.log(`[TaskScheduler] 步骤1: 执行播出平台抓取`);
      const extractResult = await this.executePlatformExtraction(item, task.action.seasonNumber);

      if (!extractResult.success) {
        throw new Error(`播出平台抓取失败: ${extractResult.error}`);
      }

      // 步骤2: 检测已标记集数并删除对应CSV行
      console.log(`[TaskScheduler] 步骤2: 处理已标记集数`);
      console.log(`[TaskScheduler] 使用CSV文件: ${extractResult.csvPath}`);

      const csvProcessResult = await this.processCSVWithMarkedEpisodes(
        extractResult.csvPath!,
        item,
        task.action.seasonNumber
      );

      console.log(`[TaskScheduler] CSV处理结果:`, {
        success: csvProcessResult.success,
        processedCsvPath: csvProcessResult.processedCsvPath,
        removedEpisodes: csvProcessResult.removedEpisodes,
        error: csvProcessResult.error
      });

      if (!csvProcessResult.success) {
        throw new Error(`CSV处理失败: ${csvProcessResult.error}`);
      }

      // 步骤3: 执行TMDB导入
      console.log(`[TaskScheduler] 步骤3: 执行TMDB导入`);
      const conflictAction = task.action.conflictAction || 'w';
      const importResult = await this.executeTMDBImport(
        csvProcessResult.processedCsvPath!,
        item,
        task.action.seasonNumber,
        conflictAction
      );

      if (!importResult.success) {
        throw new Error(`TMDB导入失败: ${importResult.error}`);
      }

      // 步骤4: 根据导入结果自动标记集数
      console.log(`[TaskScheduler] 步骤4: 自动标记导入的集数`);
      if (importResult.importedEpisodes && importResult.importedEpisodes.length > 0) {
        await this.markEpisodesAsCompleted(item, task.action.seasonNumber, importResult.importedEpisodes);
      }

      console.log(`[TaskScheduler] TMDB-Import工作流程完成: ${item.title}`);

    } catch (error) {
      console.error(`[TaskScheduler] TMDB-Import工作流程失败:`, error);
      throw error;
    }
  }

  /**
   * 步骤1: 执行播出平台抓取
   */
  private async executePlatformExtraction(item: TMDBItem, seasonNumber: number): Promise<{
    success: boolean;
    csvPath?: string;
    error?: string;
  }> {
    try {
      console.log(`[TaskScheduler] 执行播出平台抓取: ${item.platformUrl}`);

      const response = await fetch('/api/execute-platform-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platformUrl: item.platformUrl,
          seasonNumber: seasonNumber,
          itemId: item.id
        }),
        signal: AbortSignal.timeout(5 * 60 * 1000) // 5分钟超时
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API请求失败 (${response.status}): ${errorData.error || response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '播出平台抓取失败');
      }

      return {
        success: true,
        csvPath: result.csvPath
      };

    } catch (error) {
      console.error(`[TaskScheduler] 播出平台抓取失败:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 步骤2: 处理已标记集数的CSV
   */
  private async processCSVWithMarkedEpisodes(csvPath: string, item: TMDBItem, seasonNumber: number): Promise<{
    success: boolean;
    processedCsvPath?: string;
    removedEpisodes?: number[];
    error?: string;
  }> {
    try {
      console.log(`[TaskScheduler] 处理CSV文件中的已标记集数`);

      // 获取最新的项目数据，确保已标记集数信息是最新的
      const latestItems = await StorageManager.getItemsWithRetry();
      const latestItem = latestItems.find(i => i.id === item.id);

      if (!latestItem) {
        throw new Error(`无法找到项目 ${item.id}`);
      }

      // 获取已标记的集数
      const markedEpisodes = this.getMarkedEpisodes(latestItem, seasonNumber);
      console.log(`[TaskScheduler] 已标记的集数: [${markedEpisodes.join(', ')}]`);

      if (markedEpisodes.length === 0) {
        console.log(`[TaskScheduler] 没有已标记的集数，跳过CSV处理`);
        return {
          success: true,
          processedCsvPath: csvPath,
          removedEpisodes: []
        };
      }

      // 先以测试模式运行，分析CSV处理需求
      console.log(`[TaskScheduler] 先以测试模式分析CSV处理需求`);
      const testResponse = await fetch('/api/process-csv-episodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvPath: csvPath,
          markedEpisodes: markedEpisodes,
          platformUrl: latestItem.platformUrl,
          itemId: latestItem.id,
          testMode: true
        }),
        signal: AbortSignal.timeout(2 * 60 * 1000) // 2分钟超时
      });

      if (!testResponse.ok) {
        const testErrorData = await testResponse.json().catch(() => ({}));
        throw new Error(`CSV测试分析失败: ${testErrorData.error || testResponse.statusText}`);
      }

      const testResult = await testResponse.json();
      console.log(`[TaskScheduler] CSV测试分析结果:`, testResult.analysis);

      // 如果测试显示不需要处理，直接返回原始文件
      if (!testResult.analysis.wouldNeedProcessing) {
        console.log(`[TaskScheduler] 测试显示不需要处理CSV，使用原始文件`);
        return {
          success: true,
          processedCsvPath: csvPath,
          removedEpisodes: []
        };
      }

      // 执行实际的CSV处理
      console.log(`[TaskScheduler] 执行实际的CSV处理`);
      const response = await fetch('/api/process-csv-episodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvPath: csvPath,
          markedEpisodes: markedEpisodes,
          platformUrl: latestItem.platformUrl,
          itemId: latestItem.id,
          testMode: false
        }),
        signal: AbortSignal.timeout(2 * 60 * 1000) // 2分钟超时
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API请求失败 (${response.status}): ${errorData.error || response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'CSV处理失败');
      }

      return {
        success: true,
        processedCsvPath: result.processedCsvPath,
        removedEpisodes: result.removedEpisodes
      };

    } catch (error) {
      console.error(`[TaskScheduler] CSV处理失败:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取已标记的集数
   */
  private getMarkedEpisodes(item: TMDBItem, seasonNumber: number): number[] {
    const markedEpisodes: number[] = [];

    console.log(`[TaskScheduler] 获取已标记集数 - 项目: ${item.title}, 季数: ${seasonNumber}`);
    console.log(`[TaskScheduler] 项目数据结构:`, {
      hasSeasons: !!(item.seasons && item.seasons.length > 0),
      seasonsCount: item.seasons?.length || 0,
      hasEpisodes: !!(item.episodes && item.episodes.length > 0),
      episodesCount: item.episodes?.length || 0
    });

    if (item.seasons && item.seasons.length > 0) {
      // 多季模式
      console.log(`[TaskScheduler] 多季模式，查找第 ${seasonNumber} 季`);
      const targetSeason = item.seasons.find(s => s.seasonNumber === seasonNumber);

      if (targetSeason) {
        console.log(`[TaskScheduler] 找到目标季，集数数量: ${targetSeason.episodes?.length || 0}`);
        if (targetSeason.episodes) {
          targetSeason.episodes.forEach(episode => {
            console.log(`[TaskScheduler] 检查集数 ${episode.number}: completed=${episode.completed}`);
            if (episode.completed) {
              markedEpisodes.push(episode.number);
            }
          });
        }
      } else {
        console.warn(`[TaskScheduler] 未找到第 ${seasonNumber} 季，可用季数: ${item.seasons.map(s => s.seasonNumber).join(', ')}`);
      }
    } else if (item.episodes) {
      // 单季模式
      console.log(`[TaskScheduler] 单季模式，总集数: ${item.episodes.length}`);
      item.episodes.forEach(episode => {
        console.log(`[TaskScheduler] 检查集数 ${episode.number}: completed=${episode.completed}`);
        if (episode.completed) {
          markedEpisodes.push(episode.number);
        }
      });
    } else {
      console.warn(`[TaskScheduler] 项目没有集数信息`);
    }

    const sortedEpisodes = markedEpisodes.sort((a, b) => a - b);
    console.log(`[TaskScheduler] 最终已标记集数: [${sortedEpisodes.join(', ')}]`);
    return sortedEpisodes;
  }



  /**
   * 步骤3: 执行TMDB导入
   */
  private async executeTMDBImport(csvPath: string, item: TMDBItem, seasonNumber: number, conflictAction: 'w' | 'y' | 'n' = 'w'): Promise<{
    success: boolean;
    importedEpisodes?: number[];
    error?: string;
  }> {
    try {
      console.log(`[TaskScheduler] 执行TMDB导入`);

      const response = await fetch('/api/execute-tmdb-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvPath: csvPath,
          seasonNumber: seasonNumber,
          itemId: item.id,
          tmdbId: item.tmdbId,
          conflictAction: conflictAction
        }),
        signal: AbortSignal.timeout(10 * 60 * 1000) // 10分钟超时
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API请求失败 (${response.status}): ${errorData.error || response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'TMDB导入失败');
      }

      return {
        success: true,
        importedEpisodes: result.importedEpisodes || []
      };

    } catch (error) {
      console.error(`[TaskScheduler] TMDB导入失败:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 步骤4: 自动标记导入的集数
   */
  private async markEpisodesAsCompleted(item: TMDBItem, seasonNumber: number, episodeNumbers: number[]): Promise<void> {
    try {
      console.log(`[TaskScheduler] 自动标记集数为已完成: 季=${seasonNumber}, 集数=${episodeNumbers.join(', ')}`);

      const response = await fetch('/api/mark-episodes-completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          seasonNumber: seasonNumber,
          episodeNumbers: episodeNumbers
        }),
        signal: AbortSignal.timeout(30 * 1000) // 30秒超时
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API请求失败 (${response.status}): ${errorData.error || response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '标记集数失败');
      }

      console.log(`[TaskScheduler] 成功标记 ${episodeNumbers.length} 个集数为已完成`);

    } catch (error) {
      console.error(`[TaskScheduler] 标记集数失败:`, error);
      // 这里不抛出错误，因为标记失败不应该影响整个任务的成功状态
      console.warn(`[TaskScheduler] 标记集数失败，但任务继续执行`);
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
   * 验证和修复所有任务的关联
   */
  public async validateAndFixAllTaskAssociations(): Promise<{
    success: boolean;
    message: string;
    details: {
      totalTasks: number;
      invalidTasks: number;
      fixedTasks: number;
      deletedTasks: number;
      details: string[]
    }
  }> {
    try {
      console.log(`[TaskScheduler] 开始验证和修复任务关联`);

      const result = await StorageManager.validateAndFixTaskAssociations();

      // 如果有任务被修复或删除，重新初始化调度器
      if (result.fixedTasks > 0 || result.deletedTasks > 0) {
        console.log(`[TaskScheduler] 任务关联已更新，重新初始化调度器`);
        this.isInitialized = false;
        await this.initialize();
      }

      const message = result.invalidTasks === 0
        ? `所有 ${result.totalTasks} 个任务的关联都是有效的`
        : `处理了 ${result.invalidTasks} 个无效任务: ${result.fixedTasks} 个已修复, ${result.deletedTasks} 个已删除`;

      return {
        success: true,
        message,
        details: result
      };
    } catch (error) {
      console.error(`[TaskScheduler] 验证任务关联失败:`, error);
      return {
        success: false,
        message: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
        details: {
          totalTasks: 0,
          invalidTasks: 0,
          fixedTasks: 0,
          deletedTasks: 0,
          details: []
        }
      };
    }
  }
}

// 创建全局调度器实例
export const taskScheduler = TaskScheduler.getInstance();

// 导出类型，方便其他模块使用
export type { ScheduledTask, TMDBItem }; 