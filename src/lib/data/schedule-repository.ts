/**
 * 定时任务配置 Repository
 */

import { getDatabase } from '../database/connection';
import { BaseRepository } from '../database/repositories/base.repository';
import type { DatabaseResult } from '../database/types';
import type {
  ScheduleTask,
  ScheduleTaskRow,
  CreateScheduleTaskInput,
  UpdateScheduleTaskInput,
  FieldCleanup,
} from '@/types/schedule';
import { scheduleTaskRowToScheduleTask, scheduleTaskToRow } from '@/types/schedule';
import { logger } from '@/lib/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class ScheduleRepository extends BaseRepository<ScheduleTask, ScheduleTaskRow> {
  protected tableName = 'schedule_tasks';

  findById(id: string): ScheduleTask | undefined {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM schedule_tasks WHERE id = ?')
      .get(id) as ScheduleTaskRow | undefined;

    if (!row) return undefined;
    return scheduleTaskRowToScheduleTask(row);
  }

  findByItemId(itemId: string): ScheduleTask | undefined {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM schedule_tasks WHERE itemId = ?')
      .get(itemId) as ScheduleTaskRow | undefined;

    if (!row) return undefined;
    return scheduleTaskRowToScheduleTask(row);
  }

  findAllEnabled(): ScheduleTask[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM schedule_tasks WHERE enabled = 1')
      .all() as ScheduleTaskRow[];

    return rows.map(scheduleTaskRowToScheduleTask);
  }

  create(input: CreateScheduleTaskInput): DatabaseResult<ScheduleTask> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const defaultFieldCleanup: FieldCleanup = {
      name: false,
      air_date: false,
      runtime: false,
      overview: false,
      backdrop: false,
    };

    const task: ScheduleTask = {
      id: uuidv4(),
      itemId: input.itemId,
      cron: input.cron,
      enabled: input.enabled ?? true,
      headless: input.headless ?? true,
      incremental: input.incremental ?? true,
      autoImport: input.autoImport ?? false,
      tmdbSeason: input.tmdbSeason ?? 1,
      tmdbLanguage: input.tmdbLanguage ?? 'zh-CN',
      tmdbAutoResponse: input.tmdbAutoResponse ?? 'w',
      fieldCleanup: input.fieldCleanup ?? defaultFieldCleanup,
      lastRunAt: null,
      nextRunAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const row = scheduleTaskToRow(task);

    try {
      db.prepare(`
        INSERT INTO schedule_tasks (
          id, itemId, cron, enabled, headless, incremental, autoImport, tmdbSeason, tmdbLanguage, tmdbAutoResponse, fieldCleanup,
          lastRunAt, nextRunAt, createdAt, updatedAt
        ) VALUES (
          @id, @itemId, @cron, @enabled, @headless, @incremental, @autoImport, @tmdbSeason, @tmdbLanguage, @tmdbAutoResponse, @fieldCleanup,
          @lastRunAt, @nextRunAt, @createdAt, @updatedAt
        )
      `).run(row);

      return { success: true, data: task };
    } catch (error) {
      logger.error('[ScheduleRepository] 创建任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  update(input: UpdateScheduleTaskInput): DatabaseResult<ScheduleTask> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = this.findById(input.id);
    if (!existing) {
      return { success: false, error: '任务不存在' };
    }

    const updated: ScheduleTask = {
      ...existing,
      cron: input.cron ?? existing.cron,
      enabled: input.enabled ?? existing.enabled,
      headless: input.headless ?? existing.headless,
      incremental: input.incremental ?? existing.incremental,
      autoImport: input.autoImport ?? existing.autoImport,
      tmdbSeason: input.tmdbSeason ?? existing.tmdbSeason,
      tmdbLanguage: input.tmdbLanguage ?? existing.tmdbLanguage,
      tmdbAutoResponse: input.tmdbAutoResponse ?? existing.tmdbAutoResponse,
      fieldCleanup: input.fieldCleanup ?? existing.fieldCleanup,
      updatedAt: now,
    };

    const row = scheduleTaskToRow(updated);

    try {
      db.prepare(`
        UPDATE schedule_tasks SET
          cron = @cron,
          enabled = @enabled,
          headless = @headless,
          incremental = @incremental,
          autoImport = @autoImport,
          tmdbSeason = @tmdbSeason,
          tmdbLanguage = @tmdbLanguage,
          tmdbAutoResponse = @tmdbAutoResponse,
          fieldCleanup = @fieldCleanup,
          updatedAt = @updatedAt
        WHERE id = @id
      `).run({
        id: row.id,
        cron: row.cron,
        enabled: row.enabled,
        headless: row.headless,
        incremental: row.incremental,
        autoImport: row.autoImport,
        tmdbSeason: row.tmdbSeason,
        tmdbLanguage: row.tmdbLanguage,
        tmdbAutoResponse: row.tmdbAutoResponse,
        fieldCleanup: row.fieldCleanup,
        updatedAt: row.updatedAt,
      });

      return { success: true, data: updated };
    } catch (error) {
      logger.error('[ScheduleRepository] 更新任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  updateLastRunAt(id: string, lastRunAt: string, nextRunAt: string): DatabaseResult {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      db.prepare(`
        UPDATE schedule_tasks SET
          lastRunAt = @lastRunAt,
          nextRunAt = @nextRunAt,
          updatedAt = @updatedAt
        WHERE id = @id
      `).run({ id, lastRunAt, nextRunAt, updatedAt: now });

      return { success: true };
    } catch (error) {
      logger.error('[ScheduleRepository] 更新上次运行时间失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  deleteByItemId(itemId: string): DatabaseResult {
    const db = getDatabase();

    try {
      db.prepare('DELETE FROM schedule_tasks WHERE itemId = ?').run(itemId);
      return { success: true };
    } catch (error) {
      logger.error('[ScheduleRepository] 删除任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }
}

export const scheduleRepository = new ScheduleRepository();
