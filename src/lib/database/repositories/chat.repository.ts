/**
 * AI 聊天 Repository
 * 使用 camelCase 字段名，与数据库 Schema 保持一致
 */

import { getDatabase } from '../connection';
import { BaseRepository } from './base.repository';
import type { ChatHistoryRow, MessageRow, DatabaseResult } from '../types';
import type { ChatHistory, Message } from '@/types/ai-chat';
import { logger } from '@/lib/utils/logger';

export class ChatRepository extends BaseRepository<ChatHistory, ChatHistoryRow> {
  protected tableName = 'chatHistories';

  /**
   * 获取所有聊天历史，排除软删除
   */
  findAllHistories(): ChatHistory[] {
    const db = getDatabase();
    const histories = db
      .prepare('SELECT * FROM chatHistories WHERE deletedAt IS NULL ORDER BY updatedAt DESC')
      .all() as ChatHistoryRow[];

    return histories.map((row) => this.rowToChatHistory(row));
  }

  /**
   * 根据ID获取聊天历史（带消息）
   */
  findHistoryById(id: string): ChatHistory | undefined {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM chatHistories WHERE id = ? AND deletedAt IS NULL')
      .get(id) as ChatHistoryRow | undefined;

    if (!row) return undefined;

    const history = this.rowToChatHistory(row);
    history.messages = this.getMessages(id);
    return history;
  }

  /**
   * 将数据库行转换为 ChatHistory
   */
  private rowToChatHistory(row: ChatHistoryRow): ChatHistory {
    return {
      id: row.id,
      title: row.title,
      messages: [],
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * 获取消息
   */
  getMessages(chatId: string): Message[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp')
      .all(chatId) as MessageRow[];

    return rows.map((row) => this.rowToMessage(row));
  }

  /**
   * 将数据库行转换为 Message
   */
  private rowToMessage(row: MessageRow): Message {
    return {
      id: row.id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      timestamp: new Date(row.timestamp),
      type: row.type as 'text' | 'file' | 'episode-summary' | undefined,
      fileName: row.fileName ?? undefined,
      fileContent: row.fileContent ?? undefined,
      isStreaming: row.isStreaming === 1,
      suggestions: row.suggestions ? JSON.parse(row.suggestions) : undefined,
      rating: row.rating as 'like' | 'dislike' | null | undefined,
      isEdited: row.isEdited === 1,
      canContinue: row.canContinue === 1,
    };
  }

  /**
   * 创建聊天历史
   */
  createHistory(history: ChatHistory): DatabaseResult<ChatHistory> {
    const db = getDatabase();

    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO chatHistories (id, title, createdAt, updatedAt, deletedAt)
        VALUES (@id, @title, @createdAt, @updatedAt, @deletedAt)
      `).run({
        id: history.id,
        title: history.title,
        createdAt: history.createdAt.toISOString(),
        updatedAt: history.updatedAt.toISOString(),
        deletedAt: null,
      });

      // 插入消息
      if (history.messages && history.messages.length > 0) {
        for (const message of history.messages) {
          this.addMessage(history.id, message);
        }
      }

      return { success: true, data: history };
    } catch (error) {
      logger.error('[ChatRepository] 创建聊天历史失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  /**
   * 更新聊天历史
   */
  updateHistory(history: ChatHistory): DatabaseResult<ChatHistory> {
    const db = getDatabase();

    try {
      db.prepare(`
        UPDATE chatHistories SET title = @title, updatedAt = @updatedAt WHERE id = @id AND deletedAt IS NULL
      `).run({
        id: history.id,
        title: history.title,
        updatedAt: history.updatedAt.toISOString(),
      });

      return { success: true, data: history };
    } catch (error) {
      logger.error('[ChatRepository] 更新聊天历史失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  /**
   * 添加消息
   */
  addMessage(chatId: string, message: Message): DatabaseResult<Message> {
    const db = getDatabase();

    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO messages (
          id, chatId, role, content, timestamp, type, fileName, fileContent,
          isStreaming, suggestions, rating, isEdited, canContinue, createdAt, updatedAt
        ) VALUES (
          @id, @chatId, @role, @content, @timestamp, @type, @fileName, @fileContent,
          @isStreaming, @suggestions, @rating, @isEdited, @canContinue, @createdAt, @updatedAt
        )
      `).run({
        id: message.id,
        chatId: chatId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        type: message.type ?? 'text',
        fileName: message.fileName ?? null,
        fileContent: message.fileContent ?? null,
        isStreaming: message.isStreaming ? 1 : 0,
        suggestions: message.suggestions ? JSON.stringify(message.suggestions) : null,
        rating: message.rating ?? null,
        isEdited: message.isEdited ? 1 : 0,
        canContinue: message.canContinue ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      });

      // 更新聊天历史的 updatedAt
      db.prepare('UPDATE chatHistories SET updatedAt = ? WHERE id = ?').run(now, chatId);

      return { success: true, data: message };
    } catch (error) {
      logger.error('[ChatRepository] 添加消息失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '添加失败',
      };
    }
  }

  /**
   * 更新消息
   */
  updateMessage(message: Message): DatabaseResult<Message> {
    const db = getDatabase();

    try {
      db.prepare(`
        UPDATE messages SET
          content = @content,
          isStreaming = @isStreaming,
          suggestions = @suggestions,
          rating = @rating,
          isEdited = @isEdited,
          canContinue = @canContinue,
          updatedAt = @updatedAt
        WHERE id = @id
      `).run({
        id: message.id,
        content: message.content,
        isStreaming: message.isStreaming ? 1 : 0,
        suggestions: message.suggestions ? JSON.stringify(message.suggestions) : null,
        rating: message.rating ?? null,
        isEdited: message.isEdited ? 1 : 0,
        canContinue: message.canContinue ? 1 : 0,
        updatedAt: new Date().toISOString(),
      });

      return { success: true, data: message };
    } catch (error) {
      logger.error('[ChatRepository] 更新消息失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  /**
   * 删除消息
   */
  deleteMessage(messageId: string): DatabaseResult {
    const db = getDatabase();

    try {
      db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  /**
   * 软删除聊天历史
   */
  softDeleteHistory(id: string): DatabaseResult {
    const db = getDatabase();

    try {
      const now = new Date().toISOString();
      const result = db
        .prepare('UPDATE chatHistories SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL')
        .run(now, now, id);

      return {
        success: result.changes > 0,
        error: result.changes === 0 ? '聊天历史不存在或已删除' : undefined,
      };
    } catch (error) {
      logger.error('[ChatRepository] 删除聊天历史失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  /**
   * 恢复软删除的聊天历史
   */
  restoreHistory(id: string): DatabaseResult {
    const db = getDatabase();

    try {
      const result = db
        .prepare('UPDATE chatHistories SET deletedAt = NULL, updatedAt = ? WHERE id = ?')
        .run(new Date().toISOString(), id);

      return {
        success: result.changes > 0,
        error: result.changes === 0 ? '聊天历史不存在' : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '恢复失败',
      };
    }
  }

  /**
   * 物理删除聊天历史（级联删除消息）
   */
  deleteHistory(id: string): DatabaseResult {
    const db = getDatabase();

    try {
      // 删除消息
      db.prepare('DELETE FROM messages WHERE chatId = ?').run(id);
      // 删除聊天历史
      db.prepare('DELETE FROM chatHistories WHERE id = ?').run(id);

      return { success: true };
    } catch (error) {
      logger.error('[ChatRepository] 删除聊天历史失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  /**
   * 清空所有聊天历史
   */
  clearAll(): void {
    const db = getDatabase();
    db.exec('DELETE FROM messages');
    db.exec('DELETE FROM chatHistories');
  }

  /**
   * 获取聊天历史数量
   */
  getHistoryCount(): number {
    const db = getDatabase();
    return (db.prepare('SELECT COUNT(*) as count FROM chatHistories WHERE deletedAt IS NULL').get() as { count: number }).count;
  }

  /**
   * 获取消息数量
   */
  getMessageCount(chatId?: string): number {
    const db = getDatabase();
    if (chatId) {
      return (db.prepare('SELECT COUNT(*) as count FROM messages WHERE chatId = ?').get(chatId) as { count: number }).count;
    }
    return (db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }).count;
  }

  /**
   * 保存或更新聊天历史（带消息）
   * 用于 API 同步
   */
  saveHistory(history: ChatHistory): DatabaseResult<ChatHistory> {
    const db = getDatabase();

    try {
      const existing = this.findHistoryById(history.id);

      if (existing) {
        // 更新现有历史
        db.prepare(`
          UPDATE chatHistories SET title = @title, updatedAt = @updatedAt WHERE id = @id
        `).run({
          id: history.id,
          title: history.title,
          updatedAt: history.updatedAt.toISOString(),
        });

        // 删除旧消息，插入新消息
        db.prepare('DELETE FROM messages WHERE chatId = ?').run(history.id);

        if (history.messages && history.messages.length > 0) {
          for (const message of history.messages) {
            this.addMessage(history.id, message);
          }
        }
      } else {
        // 创建新历史
        this.createHistory(history);
      }

      return { success: true, data: history };
    } catch (error) {
      logger.error('[ChatRepository] 保存聊天历史失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存失败',
      };
    }
  }

  /**
   * 批量保存聊天历史
   */
  saveHistories(histories: ChatHistory[]): DatabaseResult<{ saved: number }> {
    let saved = 0;

    for (const history of histories) {
      const result = this.saveHistory(history);
      if (result.success) {
        saved++;
      }
    }

    return { success: true, data: { saved } };
  }
}

// 导出单例
export const chatRepository = new ChatRepository();