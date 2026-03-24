/**
 * 定时任务日志 Repository
 */

import { getDatabase } from '../database/connection';
import { BaseRepository } from '../database/repositories/base.repository';
import type { DatabaseResult } from '../database/types';
import type { ScheduleLog, ScheduleLogRow } from '@/types/schedule';
import { scheduleLogRowToScheduleLog } from '@/types/schedule';
import { logger } from '@/lib/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class ScheduleLogRepository extends BaseRepository<ScheduleLog, ScheduleLogRow> {
  protected tableName = 'schedule_logs';

  findByTaskId(taskId: string, limit: number = 10): ScheduleLog[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM schedule_logs WHERE taskId = ? ORDER BY startAt DESC LIMIT ?')
      .all(taskId, limit) as ScheduleLogRow[];

    return rows.map(scheduleLogRowToScheduleLog);
  }

  findLatestByTaskId(taskId: string): ScheduleLog | undefined {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM schedule_logs WHERE taskId = ? ORDER BY startAt DESC LIMIT 1')
      .get(taskId) as ScheduleLogRow | undefined;

    if (!row) return undefined;
    return scheduleLogRowToScheduleLog(row);
  }

  create(log: Omit<ScheduleLog, 'id'>): DatabaseResult<ScheduleLog> {
    const db = getDatabase();

    const newLog: ScheduleLog = {
      id: uuidv4(),
      ...log,
    };

    try {
      db.prepare(`
        INSERT INTO schedule_logs (
          id, taskId, status, startAt, endAt, message, details
        ) VALUES (
          @id, @taskId, @status, @startAt, @endAt, @message, @details
        )
      `).run({
        id: newLog.id,
        taskId: newLog.taskId,
        status: newLog.status,
        startAt: newLog.startAt,
        endAt: newLog.endAt,
        message: newLog.message,
        details: newLog.details,
      });

      return { success: true, data: newLog };
    } catch (error) {
      logger.error('[ScheduleLogRepository] 创建日志失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  updateStatus(id: string, status: ScheduleLog['status'], message?: string, details?: string): DatabaseResult {
    const db = getDatabase();

    try {
      const endAt = status !== 'running' ? new Date().toISOString() : null;

      db.prepare(`
        UPDATE schedule_logs SET
          status = @status,
          endAt = @endAt,
          message = @message,
          details = @details
        WHERE id = @id
      `).run({
        id,
        status,
        endAt,
        message: message || '',
        details: details || null,
      });

      return { success: true };
    } catch (error) {
      logger.error('[ScheduleLogRepository] 更新日志状态失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  deleteOldLogs(keepCount: number = 100): DatabaseResult {
    const db = getDatabase();

    try {
      db.prepare(`
        DELETE FROM schedule_logs
        WHERE id NOT IN (
          SELECT id FROM schedule_logs ORDER BY startAt DESC LIMIT ?
        )
      `).run(keepCount);

      return { success: true };
    } catch (error) {
      logger.error('[ScheduleLogRepository] 清理旧日志失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '清理失败',
      };
    }
  }
}

export const scheduleLogRepository = new ScheduleLogRepository();
