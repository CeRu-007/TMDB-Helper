/**
 * 定时任务 Repository
 */

import { getDatabase } from '../connection';
import { BaseRepository } from './base.repository';
import type {
  ScheduledTaskRow,
  ExecutionLogRow,
  DatabaseResult,
  scheduledTaskToRow,
  rowToScheduledTask,
} from '../types';
import type { ScheduledTask, ExecutionLog } from '@/lib/data/storage/types';
import { logger } from '@/lib/utils/logger';

export class TasksRepository extends BaseRepository<ScheduledTask, ScheduledTaskRow> {
  protected tableName = 'scheduled_tasks';

  /**
   * 获取所有任务
   */
  findAllTasks(): ScheduledTask[] {
    const db = getDatabase();
    const tasks = db
      .prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC')
      .all() as ScheduledTaskRow[];

    return tasks.map((row) => this.rowToTask(row));
  }

  /**
   * 根据ID获取任务
   */
  findTaskById(id: string): ScheduledTask | undefined {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as ScheduledTaskRow | undefined;

    if (!row) return undefined;
    return this.rowToTask(row);
  }

  /**
   * 将数据库行转换为 ScheduledTask
   */
  private rowToTask(row: ScheduledTaskRow): ScheduledTask {
    return {
      id: row.id,
      itemId: row.item_id,
      itemTitle: row.item_title,
      itemTmdbId: row.item_tmdb_id ?? undefined,
      name: row.name,
      type: row.type as 'tmdb-import',
      schedule: {
        type: row.schedule_type as 'weekly' | 'daily',
        dayOfWeek: row.day_of_week ?? undefined,
        secondDayOfWeek: row.second_day_of_week ?? undefined,
        hour: row.hour,
        minute: row.minute,
      },
      action: JSON.parse(row.action_config),
      enabled: row.enabled === 1,
      lastRun: row.last_run ?? undefined,
      nextRun: row.next_run ?? undefined,
      lastRunStatus: row.last_run_status as 'success' | 'failed' | 'user_interrupted' | undefined,
      lastRunError: row.last_run_error,
      currentStep: row.current_step ?? undefined,
      executionProgress: row.execution_progress ?? undefined,
      isRunning: row.is_running === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 创建任务
   */
  createTask(task: ScheduledTask): DatabaseResult<ScheduledTask> {
    const db = getDatabase();

    try {
      const sql = `
        INSERT INTO scheduled_tasks (
          id, item_id, item_title, item_tmdb_id, name, type,
          schedule_type, day_of_week, second_day_of_week, hour, minute,
          action_config, enabled, last_run, next_run, last_run_status, last_run_error,
          current_step, execution_progress, is_running, created_at, updated_at
        ) VALUES (
          @id, @item_id, @item_title, @item_tmdb_id, @name, @type,
          @schedule_type, @day_of_week, @second_day_of_week, @hour, @minute,
          @action_config, @enabled, @last_run, @next_run, @last_run_status, @last_run_error,
          @current_step, @execution_progress, @is_running, @created_at, @updated_at
        )
      `;

      db.prepare(sql).run({
        id: task.id,
        item_id: task.itemId,
        item_title: task.itemTitle,
        item_tmdb_id: task.itemTmdbId ?? null,
        name: task.name,
        type: task.type,
        schedule_type: task.schedule.type,
        day_of_week: task.schedule.dayOfWeek ?? null,
        second_day_of_week: task.schedule.secondDayOfWeek ?? null,
        hour: task.schedule.hour,
        minute: task.schedule.minute,
        action_config: JSON.stringify(task.action),
        enabled: task.enabled ? 1 : 0,
        last_run: task.lastRun ?? null,
        next_run: task.nextRun ?? null,
        last_run_status: task.lastRunStatus ?? null,
        last_run_error: task.lastRunError ?? null,
        current_step: task.currentStep ?? null,
        execution_progress: task.executionProgress ?? null,
        is_running: task.isRunning ? 1 : 0,
        created_at: task.createdAt,
        updated_at: task.updatedAt,
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
        UPDATE scheduled_tasks SET
          item_id = @item_id,
          item_title = @item_title,
          item_tmdb_id = @item_tmdb_id,
          name = @name,
          type = @type,
          schedule_type = @schedule_type,
          day_of_week = @day_of_week,
          second_day_of_week = @second_day_of_week,
          hour = @hour,
          minute = @minute,
          action_config = @action_config,
          enabled = @enabled,
          last_run = @last_run,
          next_run = @next_run,
          last_run_status = @last_run_status,
          last_run_error = @last_run_error,
          current_step = @current_step,
          execution_progress = @execution_progress,
          is_running = @is_running,
          updated_at = @updated_at
        WHERE id = @id
      `;

      db.prepare(sql).run({
        id: task.id,
        item_id: task.itemId,
        item_title: task.itemTitle,
        item_tmdb_id: task.itemTmdbId ?? null,
        name: task.name,
        type: task.type,
        schedule_type: task.schedule.type,
        day_of_week: task.schedule.dayOfWeek ?? null,
        second_day_of_week: task.schedule.secondDayOfWeek ?? null,
        hour: task.schedule.hour,
        minute: task.schedule.minute,
        action_config: JSON.stringify(task.action),
        enabled: task.enabled ? 1 : 0,
        last_run: task.lastRun ?? null,
        next_run: task.nextRun ?? null,
        last_run_status: task.lastRunStatus ?? null,
        last_run_error: task.lastRunError ?? null,
        current_step: task.currentStep ?? null,
        execution_progress: task.executionProgress ?? null,
        is_running: task.isRunning ? 1 : 0,
        updated_at: task.updatedAt,
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
      .prepare('SELECT * FROM scheduled_tasks WHERE item_id = ?')
      .all(itemId) as ScheduledTaskRow[];

    return tasks.map((row) => this.rowToTask(row));
  }

  /**
   * 获取启用的任务
   */
  findEnabledTasks(): ScheduledTask[] {
    const db = getDatabase();
    const tasks = db
      .prepare('SELECT * FROM scheduled_tasks WHERE enabled = 1')
      .all() as ScheduledTaskRow[];

    return tasks.map((row) => this.rowToTask(row));
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
        updates.push('last_run = @last_run');
        values.last_run = status.lastRun;
      }
      if (status.nextRun !== undefined) {
        updates.push('next_run = @next_run');
        values.next_run = status.nextRun;
      }
      if (status.lastRunStatus !== undefined) {
        updates.push('last_run_status = @last_run_status');
        values.last_run_status = status.lastRunStatus;
      }
      if (status.lastRunError !== undefined) {
        updates.push('last_run_error = @last_run_error');
        values.last_run_error = status.lastRunError;
      }
      if (status.currentStep !== undefined) {
        updates.push('current_step = @current_step');
        values.current_step = status.currentStep;
      }
      if (status.executionProgress !== undefined) {
        updates.push('execution_progress = @execution_progress');
        values.execution_progress = status.executionProgress;
      }
      if (status.isRunning !== undefined) {
        updates.push('is_running = @is_running');
        values.is_running = status.isRunning ? 1 : 0;
      }

      updates.push('updated_at = @updated_at');
      values.updated_at = new Date().toISOString();

      const sql = `UPDATE scheduled_tasks SET ${updates.join(', ')} WHERE id = @id`;
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
        INSERT INTO execution_logs (id, task_id, timestamp, step, message, level, details)
        VALUES (@id, @task_id, @timestamp, @step, @message, @level, @details)
      `).run({
        id: log.id,
        task_id: taskId,
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
        'SELECT * FROM execution_logs WHERE task_id = ? ORDER BY timestamp DESC LIMIT ?',
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
      const result = db.prepare('DELETE FROM execution_logs WHERE task_id = ?').run(taskId);
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
    const db = getDatabase();
    let imported = 0;
    let skipped = 0;

    const importTransaction = db.transaction(() => {
      for (const task of tasks) {
        try {
          const existing = this.findTaskById(task.id);
          if (existing) {
            skipped++;
            continue;
          }

          this.createTask(task);
          imported++;
        } catch (error) {
          logger.error(`[TasksRepository] 导入任务失败: ${task.name}`, error);
          skipped++;
        }
      }
    });

    importTransaction();

    logger.info(`[TasksRepository] 导入完成: ${imported} 个任务，跳过 ${skipped} 个`);

    return { success: true, data: { imported, skipped } };
  }

  /**
   * 删除项目关联的任务
   */
  deleteByItemId(itemId: string): DatabaseResult<number> {
    return this.deleteBy({ item_id: itemId });
  }
}

// 导出单例
export const tasksRepository = new TasksRepository();
