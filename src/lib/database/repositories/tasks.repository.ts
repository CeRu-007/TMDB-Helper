/**
 * 定时任务 Repository
 * 使用 camelCase 字段名，与数据库 Schema 保持一致
 */

import { getDatabase } from '../connection';
import { BaseRepository } from './base.repository';
import type { ScheduledTaskRow, ExecutionLogRow, DatabaseResult } from '../types';
import { rowToScheduledTask } from '../types';
import type { ScheduledTask, ExecutionLog } from '@/lib/data/storage/types';
import { logger } from '@/lib/utils/logger';

export class TasksRepository extends BaseRepository<ScheduledTask, ScheduledTaskRow> {
  protected tableName = 'scheduledTasks';

  /**
   * 获取所有任务，排除软删除
   */
  findAllTasks(): ScheduledTask[] {
    const db = getDatabase();
    const tasks = db
      .prepare('SELECT * FROM scheduledTasks WHERE deletedAt IS NULL ORDER BY createdAt DESC')
      .all() as ScheduledTaskRow[];

    return tasks.map((row) => rowToScheduledTask(row));
  }

  /**
   * 根据ID获取任务
   */
  findTaskById(id: string): ScheduledTask | undefined {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM scheduledTasks WHERE id = ? AND deletedAt IS NULL')
      .get(id) as ScheduledTaskRow | undefined;

    if (!row) return undefined;
    return rowToScheduledTask(row);
  }

  /**
   * 创建任务
   */
  createTask(task: ScheduledTask): DatabaseResult<ScheduledTask> {
    const db = getDatabase();

    try {
      const now = new Date().toISOString();
      const sql = `
        INSERT INTO scheduledTasks (
          id, itemId, itemTitle, itemTmdbId, name, type,
          scheduleType, dayOfWeek, secondDayOfWeek, hour, minute,
          actionConfig, enabled, lastRun, nextRun, lastRunStatus, lastRunError,
          currentStep, executionProgress, isRunning, createdAt, updatedAt, deletedAt
        ) VALUES (
          @id, @itemId, @itemTitle, @itemTmdbId, @name, @type,
          @scheduleType, @dayOfWeek, @secondDayOfWeek, @hour, @minute,
          @actionConfig, @enabled, @lastRun, @nextRun, @lastRunStatus, @lastRunError,
          @currentStep, @executionProgress, @isRunning, @createdAt, @updatedAt, @deletedAt
        )
      `;

      db.prepare(sql).run({
        id: task.id,
        itemId: task.itemId,
        itemTitle: task.itemTitle,
        itemTmdbId: task.itemTmdbId ?? null,
        name: task.name,
        type: task.type,
        scheduleType: task.schedule.type,
        dayOfWeek: task.schedule.dayOfWeek ?? null,
        secondDayOfWeek: task.schedule.secondDayOfWeek ?? null,
        hour: task.schedule.hour,
        minute: task.schedule.minute,
        actionConfig: JSON.stringify(task.action),
        enabled: task.enabled ? 1 : 0,
        lastRun: task.lastRun ?? null,
        nextRun: task.nextRun ?? null,
        lastRunStatus: task.lastRunStatus ?? null,
        lastRunError: task.lastRunError ?? null,
        currentStep: task.currentStep ?? null,
        executionProgress: task.executionProgress ?? null,
        isRunning: task.isRunning ? 1 : 0,
        createdAt: task.createdAt || now,
        updatedAt: task.updatedAt || now,
        deletedAt: null,
      });

      return { success: true, data: task };
    } catch (error) {
      logger.error('[TasksRepository] 创建任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  /**
   * 更新任务
   */
  updateTask(task: ScheduledTask): DatabaseResult<ScheduledTask> {
    const db = getDatabase();

    try {
      const sql = `
        UPDATE scheduledTasks SET
          itemId = @itemId,
          itemTitle = @itemTitle,
          itemTmdbId = @itemTmdbId,
          name = @name,
          type = @type,
          scheduleType = @scheduleType,
          dayOfWeek = @dayOfWeek,
          secondDayOfWeek = @secondDayOfWeek,
          hour = @hour,
          minute = @minute,
          actionConfig = @actionConfig,
          enabled = @enabled,
          lastRun = @lastRun,
          nextRun = @nextRun,
          lastRunStatus = @lastRunStatus,
          lastRunError = @lastRunError,
          currentStep = @currentStep,
          executionProgress = @executionProgress,
          isRunning = @isRunning,
          updatedAt = @updatedAt
        WHERE id = @id AND deletedAt IS NULL
      `;

      db.prepare(sql).run({
        id: task.id,
        itemId: task.itemId,
        itemTitle: task.itemTitle,
        itemTmdbId: task.itemTmdbId ?? null,
        name: task.name,
        type: task.type,
        scheduleType: task.schedule.type,
        dayOfWeek: task.schedule.dayOfWeek ?? null,
        secondDayOfWeek: task.schedule.secondDayOfWeek ?? null,
        hour: task.schedule.hour,
        minute: task.schedule.minute,
        actionConfig: JSON.stringify(task.action),
        enabled: task.enabled ? 1 : 0,
        lastRun: task.lastRun ?? null,
        nextRun: task.nextRun ?? null,
        lastRunStatus: task.lastRunStatus ?? null,
        lastRunError: task.lastRunError ?? null,
        currentStep: task.currentStep ?? null,
        executionProgress: task.executionProgress ?? null,
        isRunning: task.isRunning ? 1 : 0,
        updatedAt: new Date().toISOString(),
      });

      return { success: true, data: task };
    } catch (error) {
      logger.error('[TasksRepository] 更新任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  /**
   * 软删除任务
   */
  softDelete(id: string): DatabaseResult {
    const db = getDatabase();
    try {
      const now = new Date().toISOString();
      const result = db
        .prepare('UPDATE scheduledTasks SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL')
        .run(now, now, id);

      return {
        success: result.changes > 0,
        error: result.changes === 0 ? '任务不存在或已删除' : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  /**
   * 恢复软删除的任务
   */
  restore(id: string): DatabaseResult {
    const db = getDatabase();
    try {
      const result = db
        .prepare('UPDATE scheduledTasks SET deletedAt = NULL, updatedAt = ? WHERE id = ?')
        .run(new Date().toISOString(), id);

      return {
        success: result.changes > 0,
        error: result.changes === 0 ? '任务不存在' : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '恢复失败',
      };
    }
  }

  /**
   * 保存任务（创建或更新）
   */
  saveTask(task: ScheduledTask): DatabaseResult<ScheduledTask> {
    const existing = this.findTaskById(task.id);
    if (existing) {
      return this.updateTask(task);
    }
    return this.createTask(task);
  }

  /**
   * 根据项目ID查找任务
   */
  findByItemId(itemId: string): ScheduledTask[] {
    const db = getDatabase();
    const tasks = db
      .prepare('SELECT * FROM scheduledTasks WHERE itemId = ? AND deletedAt IS NULL')
      .all(itemId) as ScheduledTaskRow[];

    return tasks.map((row) => rowToScheduledTask(row));
  }

  /**
   * 获取启用的任务
   */
  findEnabledTasks(): ScheduledTask[] {
    const db = getDatabase();
    const tasks = db
      .prepare('SELECT * FROM scheduledTasks WHERE enabled = 1 AND deletedAt IS NULL')
      .all() as ScheduledTaskRow[];

    return tasks.map((row) => rowToScheduledTask(row));
  }

  /**
   * 更新任务执行状态
   */
  updateExecutionStatus(
    id: string,
    status: Partial<{
      lastRun: string;
      nextRun: string;
      lastRunStatus: 'success' | 'failed' | 'user_interrupted';
      lastRunError: string | null;
      currentStep: string;
      executionProgress: number;
      isRunning: boolean;
    }>,
  ): DatabaseResult {
    const db = getDatabase();

    try {
      const updates: string[] = [];
      const values: Record<string, unknown> = { id };

      if (status.lastRun !== undefined) {
        updates.push('lastRun = @lastRun');
        values.lastRun = status.lastRun;
      }
      if (status.nextRun !== undefined) {
        updates.push('nextRun = @nextRun');
        values.nextRun = status.nextRun;
      }
      if (status.lastRunStatus !== undefined) {
        updates.push('lastRunStatus = @lastRunStatus');
        values.lastRunStatus = status.lastRunStatus;
      }
      if (status.lastRunError !== undefined) {
        updates.push('lastRunError = @lastRunError');
        values.lastRunError = status.lastRunError;
      }
      if (status.currentStep !== undefined) {
        updates.push('currentStep = @currentStep');
        values.currentStep = status.currentStep;
      }
      if (status.executionProgress !== undefined) {
        updates.push('executionProgress = @executionProgress');
        values.executionProgress = status.executionProgress;
      }
      if (status.isRunning !== undefined) {
        updates.push('isRunning = @isRunning');
        values.isRunning = status.isRunning ? 1 : 0;
      }

      updates.push('updatedAt = @updatedAt');
      values.updatedAt = new Date().toISOString();

      const sql = `UPDATE scheduledTasks SET ${updates.join(', ')} WHERE id = @id`;
      db.prepare(sql).run(values);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  /**
   * 添加执行日志
   */
  addExecutionLog(taskId: string, log: ExecutionLog): DatabaseResult {
    const db = getDatabase();

    try {
      db.prepare(`
        INSERT INTO executionLogs (id, taskId, timestamp, step, message, level, details)
        VALUES (@id, @taskId, @timestamp, @step, @message, @level, @details)
      `).run({
        id: log.id,
        taskId: taskId,
        timestamp: log.timestamp,
        step: log.step ?? null,
        message: log.message ?? null,
        level: log.level,
        details: log.details ? JSON.stringify(log.details) : null,
      });

      return { success: true };
    } catch (error) {
      logger.error('[TasksRepository] 添加执行日志失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '添加失败',
      };
    }
  }

  /**
   * 获取任务的执行日志
   */
  getExecutionLogs(taskId: string, limit: number = 100): ExecutionLog[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        'SELECT * FROM executionLogs WHERE taskId = ? ORDER BY timestamp DESC LIMIT ?',
      )
      .all(taskId, limit) as ExecutionLogRow[];

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      step: row.step ?? undefined,
      message: row.message ?? '',
      level: row.level as 'info' | 'success' | 'warning' | 'error',
      details: row.details ? JSON.parse(row.details) : undefined,
    }));
  }

  /**
   * 清除任务的执行日志
   */
  clearExecutionLogs(taskId: string): DatabaseResult<number> {
    const db = getDatabase();

    try {
      const result = db.prepare('DELETE FROM executionLogs WHERE taskId = ?').run(taskId);
      return { success: true, data: result.changes };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '清除失败',
      };
    }
  }

  /**
   * 批量导入任务
   */
  importTasks(tasks: ScheduledTask[]): DatabaseResult<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const task of tasks) {
      try {
        const existing = this.findTaskById(task.id);
        if (existing) {
          skipped++;
          continue;
        }

        const result = this.createTask(task);
        if (result.success) {
          imported++;
        } else {
          skipped++;
        }
      } catch (error) {
        logger.error(`[TasksRepository] 导入任务失败: ${task.name}`, error);
        skipped++;
      }
    }

    logger.info(`[TasksRepository] 导入完成: ${imported} 个任务，跳过 ${skipped} 个`);

    return { success: true, data: { imported, skipped } };
  }

  /**
   * 删除项目关联的任务（软删除）
   */
  deleteByItemId(itemId: string): DatabaseResult<number> {
    const db = getDatabase();
    try {
      const now = new Date().toISOString();
      const result = db
        .prepare('UPDATE scheduledTasks SET deletedAt = ?, updatedAt = ? WHERE itemId = ? AND deletedAt IS NULL')
        .run(now, now, itemId);

      return { success: true, data: result.changes };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }
}

// 导出单例
export const tasksRepository = new TasksRepository();