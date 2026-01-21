import { StorageBase } from './storage-base';
import { ScheduledTask } from './types';

export class TaskAssociationManager extends StorageBase {
  /**
   * 验证并修复所有定时任务的关联
   */
  static async validateAndFixTaskAssociations(): Promise<{
    totalTasks: number;
    invalidTasks: number;
    fixedTasks: number;
    deletedTasks: number;
    details: string[];
  }> {
    try {
      const tasks = await this.getScheduledTasks();
      const items = await this.getItemsWithRetry();
      const details: string[] = [];

      let invalidTasks = 0;
      let fixedTasks = 0;
      let deletedTasks = 0;

      // 限制同时处理的任务数量以减少内存使用
      const BATCH_SIZE = 10;
      for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE);

        for (const task of batch) {
          // 检查任务是否有有效的项目关联
          const relatedItem = items.find((item) => item.id === task.itemId);

          if (!relatedItem) {
            invalidTasks++;
            console.log(
              `[TaskAssociationManager] 发现无效任务: ${task.name} (ID: ${task.id}, itemId: ${task.itemId})`,
            );

            // 尝试通过多种策略修复关联
            const fixResult = await this.attemptToFixTaskAssociation(
              task,
              items,
            );

            if (fixResult.success && fixResult.newItemId) {
              // 更新任务的关联
              const updatedTask = {
                ...task,
                itemId: fixResult.newItemId,
                itemTitle: fixResult.newItemTitle || task.itemTitle,
                itemTmdbId: fixResult.newItemTmdbId || task.itemTmdbId,
                updatedAt: new Date().toISOString(),
              };

              await this.updateScheduledTask(updatedTask);
              fixedTasks++;
              details.push(
                `修复任务 "${task.name}": 重新关联到项目"${fixResult.newItemTitle}" (ID: ${fixResult.newItemId})`,
              );
            } else {
              // 无法修复，删除任务
              await this.deleteScheduledTask(task.id);
              deletedTasks++;
              details.push(
                `删除无效任务 "${task.name}": ${fixResult.reason || '无法找到合适的关联项目'}`,
              );
            }
          }
        }

        // 在处理批次之间添加轻量级的垃圾回收提示（可选）
        if (typeof global !== 'undefined' && global.gc) {
          global.gc();
        }
      }

      const result = {
        totalTasks: tasks.length,
        invalidTasks,
        fixedTasks,
        deletedTasks,
        details,
      };

      return result;
    } catch (error) {
      return {
        totalTasks: 0,
        invalidTasks: 0,
        fixedTasks: 0,
        deletedTasks: 0,
        details: [
          `验证失败: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * 检查并修复问题ID
   */
  private static isProblematicId(id: string): boolean {
    // 检查已知的问题ID模式
    const problematicPatterns = [
      /^1749566411729$/,
      /^\d{10,}$/,
      /^[0-9]+\s+/,
      /\s/,
      /^.{50,}$/,
    ];
    return problematicPatterns.some((pattern) => pattern.test(id));
  }

  /**
   * 计算字符串相似度，改进版本以减少内存使用
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    // 如果长度差异太大，则不需要计算相似度
    const lenDiff = Math.abs(s1.length - s2.length);
    if (lenDiff > 10 && lenDiff > Math.max(s1.length, s2.length) * 0.5) {
      return 0; // 差异太大，返回0
    }

    // 使用动态规划的空间优化版本，只使用两行而不是整个矩阵
    const n = s1.length;
    const m = s2.length;

    // 只使用两行来节省空间
    let prev = new Array(n + 1).fill(0).map((_, i) => i);
    let curr = new Array(n + 1).fill(0);

    for (let j = 1; j <= m; j++) {
      curr[0] = j;

      for (let i = 1; i <= n; i++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        curr[i] = Math.min(
          curr[i - 1] + 1, // 插入
          prev[i] + 1, // 删除
          prev[i - 1] + cost, // 替换
        );
      }

      // 交换数组引用
      [prev, curr] = [curr, prev];
    }

    const editDistance = prev[n];
    const maxLength = Math.max(s1.length, s2.length);
    return maxLength === 0 ? 1 : (maxLength - editDistance) / maxLength;
  }

  /**
   * 智能项目匹配算法
   */
  private static findBestItemMatch(
    task: ScheduledTask,
    items: unknown[],
  ): {
    item: unknown | null;
    confidence: number;
    matchType: string;
    reason: string;
  } {
    if (items.length === 0) {
      return {
        item: null,
        confidence: 0,
        matchType: 'none',
        reason: '系统中没有可用项目',
      };
    }

    const candidates: Array<{
      item: unknown;
      score: number;
      matchType: string;
      reasons: string[];
    }> = [];

    items.forEach((item) => {
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
        const titleSimilarity = this.calculateStringSimilarity(
          task.itemTitle,
          item.title,
        );
        if (titleSimilarity > 0.8) {
          score += Math.round(titleSimilarity * 70);
          if (matchType === 'unknown') matchType = 'title_fuzzy';
          reasons.push(
            `标题模糊匹配: "${task.itemTitle}" 与 "${item.title}" (${Math.round(titleSimilarity * 100)}%)`,
          );
        }
      }

      // 4. 任务名称匹配
      const taskNameClean = task.name.replace(/\s*定时任务$/, '');
      if (taskNameClean && item.title) {
        const nameSimilarity = this.calculateStringSimilarity(
          taskNameClean,
          item.title,
        );
        if (nameSimilarity > 0.7) {
          score += Math.round(nameSimilarity * 50);
          if (matchType === 'unknown') matchType = 'task_name';
          reasons.push(
            `任务名称匹配: "${taskNameClean}" 与 "${item.title}" (${Math.round(nameSimilarity * 100)}%)`,
          );
        }
      }

      // 5. 创建时间接近度
      try {
        const taskTime = new Date(task.createdAt).getTime();
        const itemTime = new Date(item.createdAt).getTime();
        const timeDiff = Math.abs(taskTime - itemTime);
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        if (daysDiff < 7) {
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

      if (score > 30) {
        // 只考虑得分超过30的候选项
        candidates.push({
          item,
          score,
          matchType,
          reasons,
        });
      }
    });

    // 按得分排序
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      // 如果没有好的匹配，使用最近创建的项目作为备选
      const recentItems = [...items].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      if (recentItems.length > 0) {
        return {
          item: recentItems[0],
          confidence: 0.3,
          matchType: 'fallback_recent',
          reason: `使用最近创建的项目作为备选: ${recentItems[0].title}`,
        };
      }
      return {
        item: null,
        confidence: 0,
        matchType: 'none',
        reason: '无法找到合适的匹配项目',
      };
    }

    const best = candidates[0];
    const confidence = Math.min(best.score / 100, 1.0);
    return {
      item: best.item,
      confidence,
      matchType: best.matchType,
      reason: best.reasons.join('; '),
    };
  }

  /**
   * 数据完整性验证
   */
  private static validateTaskData(task: ScheduledTask): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必需字段检查
    if (!task.id) errors.push('任务ID不能为空');
    if (!task.name) errors.push('任务名称不能为空');
    if (!task.itemId) errors.push('关联项目ID不能为空');
    if (!task.type) errors.push('任务类型不能为空');
    if (!task.schedule) errors.push('调度配置不能为空');
    if (!task.action) errors.push('执行动作不能为空');

    // ID格式检查
    if (task.id && this.isProblematicId(task.id)) {
      warnings.push(`任务ID格式可能有问题: ${task.id}`);
    }
    if (task.itemId && this.isProblematicId(task.itemId)) {
      warnings.push(`项目ID格式可能有问题: ${task.itemId}`);
    }

    // 调度配置检查
    if (task.schedule) {
      if (!['daily', 'weekly'].includes(task.schedule.type)) {
        errors.push('调度类型必须为daily或weekly');
      }
      if (
        typeof task.schedule.hour !== 'number' ||
        task.schedule.hour < 0 ||
        task.schedule.hour > 23
      ) {
        errors.push('小时必须在0-23之间的数字');
      }
      if (
        typeof task.schedule.minute !== 'number' ||
        task.schedule.minute < 0 ||
        task.schedule.minute > 59
      ) {
        errors.push('分钟必须在0-59之间的数字');
      }
      if (
        task.schedule.type === 'weekly' &&
        (typeof task.schedule.dayOfWeek !== 'number' ||
          task.schedule.dayOfWeek < 0 ||
          task.schedule.dayOfWeek > 6)
      ) {
        errors.push('星期几必须是0-6之间的数字');
      }
    }

    // 执行动作检查
    if (task.action) {
      if (
        typeof task.action.seasonNumber !== 'number' ||
        task.action.seasonNumber < 1
      ) {
        errors.push('季数必须是大于1的数字');
      }
    }

    // 时间戳检查
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
      warnings,
    };
  }

  /**
   * 尝试修复单个任务的关联- 增强版
   */
  private static async attemptToFixTaskAssociation(
    task: ScheduledTask,
    items: unknown[],
  ): Promise<{
    success: boolean;
    newItemId?: string;
    newItemTitle?: string;
    newItemTmdbId?: string;
    reason?: string;
    confidence?: number;
  }> {
    // console.log(
    //   `[TaskAssociationManager] 尝试修复任务关联: ${task.name} (ID: ${task.id})`,
    // );

    // 数据验证
    const validation = this.validateTaskData(task);
    if (!validation.isValid) {
      return {
        success: false,
        reason: `数据验证失败: ${validation.errors.join(', ')}`,
      };
    }

    if (items.length === 0) {
      return { success: false, reason: '系统中没有可用项目' };
    }

    // 使用智能匹配算法
    const matchResult = this.findBestItemMatch(task, items);
    if (matchResult.item && matchResult.confidence > 0.5) {
      console.log(
        `[TaskAssociationManager] 找到高置信度匹配: ${matchResult.item.title} (置信度 ${Math.round(matchResult.confidence * 100)}%)`,
      );
      return {
        success: true,
        newItemId: matchResult.item.id,
        newItemTitle: matchResult.item.title,
        newItemTmdbId: matchResult.item.tmdbId,
        reason: matchResult.reason,
        confidence: matchResult.confidence,
      };
    } else if (matchResult.item && matchResult.confidence > 0.2) {
      console.log(
        `[TaskAssociationManager] 找到低置信度匹配: ${matchResult.item.title} (置信度 ${Math.round(matchResult.confidence * 100)}%)`,
      );
      return {
        success: true,
        newItemId: matchResult.item.id,
        newItemTitle: matchResult.item.title,
        newItemTmdbId: matchResult.item.tmdbId,
        reason: `${matchResult.reason} (低置信度匹配)`,
        confidence: matchResult.confidence,
      };
    }

    return {
      success: false,
      reason: matchResult.reason || '无法找到合适的关联项目',
      confidence: 0,
    };
  }

  /**
   * 修复定时任务的项目关联（保留原有的修复逻辑）
   */
  static async fixScheduledTaskAssociations(): Promise<ScheduledTask[]> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      return [];
    }

    try {
      // 获取所有任务和项目
      const tasks = await this.getScheduledTasks();
      const items = await this.getItemsWithRetry();

      // 修复所有任务
      let changed = false;
      const fixedTasks = tasks.map((task) => {
        // 检查任务是否已关联到有效项目
        const relatedItem = items.find((item) => item.id === task.itemId);

        if (relatedItem) {
          // 如果已关联到有效项目，确保项目属性是最新的
          if (
            task.itemTitle !== relatedItem.title ||
            task.itemTmdbId !== relatedItem.tmdbId
          ) {
            changed = true;
            return {
              ...task,
              itemTitle: relatedItem.title,
              itemTmdbId: relatedItem.tmdbId,
              updatedAt: new Date().toISOString(),
            };
          }
          return task;
        }

        // 如果没有关联到有效项目，尝试通过项目标题、TMDB ID或项目名称匹配
        console.log(
          `[TaskAssociationManager] 任务 ${task.id} (${task.name}) 关联的项目ID ${task.itemId} 无效，尝试修复`,
        );

        // 1. 尝试通过TMDB ID匹配
        if (task.itemTmdbId) {
          const matchByTmdbId = items.find(
            (item) => item.tmdbId === task.itemTmdbId,
          );
          if (matchByTmdbId) {
            changed = true;
            return {
              ...task,
              itemId: matchByTmdbId.id,
              itemTitle: matchByTmdbId.title,
              updatedAt: new Date().toISOString(),
            };
          }
        }

        // 2. 尝试通过项目标题匹配
        if (task.itemTitle) {
          const matchByTitle = items.find(
            (item) =>
              item.title === task.itemTitle ||
              (item.title.includes(task.itemTitle) &&
                item.title.length - task.itemTitle.length < 5) ||
              (task.itemTitle.includes(item.title) &&
                task.itemTitle.length - item.title.length < 5),
          );

          if (matchByTitle) {
            changed = true;
            return {
              ...task,
              itemId: matchByTitle.id,
              itemTitle: matchByTitle.title,
              itemTmdbId: matchByTitle.tmdbId,
              updatedAt: new Date().toISOString(),
            };
          }
        }

        // 3. 尝试通过任务名称匹配（去除"定时任务"后缀）
        const taskTitle = task.name.replace(/\s*定时任务$/, '');
        const matchByTaskName = items.find(
          (item) =>
            item.title === taskTitle ||
            (item.title.includes(taskTitle) &&
              item.title.length - taskTitle.length < 5) ||
            (taskTitle.includes(item.title) &&
              taskTitle.length - item.title.length < 5),
        );

        if (matchByTaskName) {
          changed = true;
          return {
            ...task,
            itemId: matchByTaskName.id,
            itemTitle: matchByTaskName.title,
            itemTmdbId: matchByTaskName.tmdbId,
            updatedAt: new Date().toISOString(),
          };
        }

        // 如果无法修复，保留原始任务
        console.warn(
          `[TaskAssociationManager] 无法为任务${task.id} (${task.name}) 找到匹配项目`,
        );
        return task;
      });

      // 如果有任务被修改，通过API更新任务
      if (changed) {
        for (const task of fixedTasks) {
          try {
            await this.updateScheduledTask(task);
          } catch (error) {
            console.error(
              `[TaskAssociationManager] 更新修复后的任务失败: ${task.id}`,
              error,
            );
          }
        }
      }

      return fixedTasks;
    } catch (error) {
      console.error('[TaskAssociationManager] 修复定时任务关联失败:', error);
      return [];
    }
  }

  /**
   * 获取所有定时任务
   */
  private static async getScheduledTasks(): Promise<ScheduledTask[]> {
    try {
      const response = await fetch('/api/tasks/scheduled-tasks');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '获取定时任务失败');
      }

      return result.tasks || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 更新定时任务
   */
  private static async updateScheduledTask(
    task: ScheduledTask,
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/tasks/scheduled-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '更新定时任务失败');
      }

      return true;
    } catch (error) {
      console.error('[TaskAssociationManager] 更新定时任务失败:', error);
      return false;
    }
  }

  /**
   * 删除定时任务
   */
  private static async deleteScheduledTask(id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `/api/tasks/scheduled-tasks?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '删除定时任务失败');
      }

      return true;
    } catch (error) {
      console.error('[TaskAssociationManager] 删除定时任务失败:', error);
      return false;
    }
  }
}
