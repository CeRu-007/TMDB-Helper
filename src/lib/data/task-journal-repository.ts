import { getDatabase } from '../database/connection'
import { BaseRepository } from '../database/repositories/base.repository'
import type { DatabaseResult } from '../database/types'
import type { TaskJournal, TaskJournalRow, CreateTaskJournalInput } from '@/types/task-journal'
import { taskJournalRowToTaskJournal } from '@/types/task-journal'
import { logger } from '@/lib/utils/logger'
import { v4 as uuidv4 } from 'uuid'

export class TaskJournalRepository extends BaseRepository<TaskJournal, TaskJournalRow> {
  protected tableName = 'task_journal'

  findAllOrdered(limit: number = 50, offset: number = 0): TaskJournal[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM task_journal ORDER BY createdAt DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as TaskJournalRow[]
    return rows.map(taskJournalRowToTaskJournal)
  }

  findByItemId(itemId: string, limit: number = 20): TaskJournal[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM task_journal WHERE itemId = ? ORDER BY createdAt DESC LIMIT ?')
      .all(itemId, limit) as TaskJournalRow[]
    return rows.map(taskJournalRowToTaskJournal)
  }

  findByStatus(status: 'success' | 'failed', limit: number = 50): TaskJournal[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM task_journal WHERE status = ? ORDER BY createdAt DESC LIMIT ?')
      .all(status, limit) as TaskJournalRow[]
    return rows.map(taskJournalRowToTaskJournal)
  }

  getUnreadCount(): number {
    const db = getDatabase()
    const result = db
      .prepare('SELECT COUNT(*) as count FROM task_journal WHERE read = 0')
      .get() as { count: number }
    return result.count
  }

  markAsRead(id: string): DatabaseResult {
    const db = getDatabase()
    try {
      db.prepare('UPDATE task_journal SET read = 1 WHERE id = ?').run(id)
      return { success: true }
    } catch (error) {
      logger.error('[TaskJournalRepository] 标记已读失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '更新失败' }
    }
  }

  markAllAsRead(): DatabaseResult {
    const db = getDatabase()
    try {
      db.prepare('UPDATE task_journal SET read = 1 WHERE read = 0').run()
      return { success: true }
    } catch (error) {
      logger.error('[TaskJournalRepository] 全部标记已读失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '更新失败' }
    }
  }

  create(input: CreateTaskJournalInput): DatabaseResult<TaskJournal> {
    const db = getDatabase()
    const now = new Date().toISOString()

    const journal: TaskJournal = {
      id: uuidv4(),
      itemId: input.itemId,
      itemTitle: input.itemTitle,
      status: input.status,
      title: input.title,
      content: input.content,
      dataPreview: input.dataPreview || null,
      errorMessage: input.errorMessage || null,
      startAt: input.startAt,
      endAt: input.endAt || null,
      read: false,
      createdAt: now,
    }

    try {
      db.prepare(`
        INSERT INTO task_journal (
          id, itemId, itemTitle, status, title, content, dataPreview, errorMessage, startAt, endAt, read, createdAt
        ) VALUES (
          @id, @itemId, @itemTitle, @status, @title, @content, @dataPreview, @errorMessage, @startAt, @endAt, @read, @createdAt
        )
      `).run({
        id: journal.id,
        itemId: journal.itemId,
        itemTitle: journal.itemTitle,
        status: journal.status,
        title: journal.title,
        content: journal.content,
        dataPreview: journal.dataPreview,
        errorMessage: journal.errorMessage,
        startAt: journal.startAt,
        endAt: journal.endAt,
        read: journal.read ? 1 : 0,
        createdAt: journal.createdAt,
      })

      return { success: true, data: journal }
    } catch (error) {
      logger.error('[TaskJournalRepository] 创建日志失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '创建失败' }
    }
  }

  deleteOldEntries(keepCount: number = 200): DatabaseResult {
    const db = getDatabase()
    try {
      db.prepare(`
        DELETE FROM task_journal
        WHERE id NOT IN (
          SELECT id FROM task_journal ORDER BY createdAt DESC LIMIT ?
        )
      `).run(keepCount)
      return { success: true }
    } catch (error) {
      logger.error('[TaskJournalRepository] 清理旧记录失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '清理失败' }
    }
  }

  deleteByItemId(itemId: string): DatabaseResult {
    const db = getDatabase()
    try {
      db.prepare('DELETE FROM task_journal WHERE itemId = ?').run(itemId)
      return { success: true }
    } catch (error) {
      logger.error('[TaskJournalRepository] 按词条删除失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '删除失败' }
    }
  }

  deleteAll(): DatabaseResult {
    const db = getDatabase()
    try {
      db.prepare('DELETE FROM task_journal').run()
      return { success: true }
    } catch (error) {
      logger.error('[TaskJournalRepository] 清空所有记录失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '清空失败' }
    }
  }

  getTotalCount(): number {
    const db = getDatabase()
    const result = db
      .prepare('SELECT COUNT(*) as count FROM task_journal')
      .get() as { count: number }
    return result.count
  }
}

export const taskJournalRepository = new TaskJournalRepository()
