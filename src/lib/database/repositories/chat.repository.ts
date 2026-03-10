/**
 * AI 聊天 Repository
 */

import { getDatabase } from '../connection';
import { BaseRepository } from './base.repository';
import type { ChatHistoryRow, MessageRow, DatabaseResult } from '../types';
import type { ChatHistory, Message } from '@/types/ai-chat';
import { logger } from '@/lib/utils/logger';

export class ChatRepository extends BaseRepository<ChatHistory, ChatHistoryRow> {
  protected tableName = 'chat_histories';

  /**
   * 获取所有聊天历史
   */
  findAllHistories(): ChatHistory[] {
    const db = getDatabase();
    const histories = db
      .prepare('SELECT * FROM chat_histories ORDER BY updated_at DESC')
      .all() as ChatHistoryRow[];

    return histories.map((row) => this.rowToChatHistory(row));
  }

  /**
   * 根据ID获取聊天历史（带消息）
   */
  findHistoryById(id: string): ChatHistory | undefined {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM chat_histories WHERE id = ?').get(id) as ChatHistoryRow | undefined;

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
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * 获取消息
   */
  getMessages(chatId: string): Message[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp')
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
      fileName: row.file_name ?? undefined,
      fileContent: row.file_content ?? undefined,
      isStreaming: row.is_streaming === 1,
      suggestions: row.suggestions ? JSON.parse(row.suggestions) : undefined,
      rating: row.rating as 'like' | 'dislike' | null | undefined,
      isEdited: row.is_edited === 1,
      canContinue: row.can_continue === 1,
    };
  }

  /**
   * 创建聊天历史
   */
  createHistory(history: ChatHistory): DatabaseResult<ChatHistory> {
    const db = getDatabase();

    try {
      db.prepare(`
        INSERT INTO chat_histories (id, title, created_at, updated_at)
        VALUES (@id, @title, @created_at, @updated_at)
      `).run({
        id: history.id,
        title: history.title,
        created_at: history.createdAt.toISOString(),
        updated_at: history.updatedAt.toISOString(),
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
        UPDATE chat_histories SET title = @title, updated_at = @updated_at WHERE id = @id
      `).run({
        id: history.id,
        title: history.title,
        updated_at: history.updatedAt.toISOString(),
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
      db.prepare(`
        INSERT INTO messages (
          id, chat_id, role, content, timestamp, type, file_name, file_content,
          is_streaming, suggestions, rating, is_edited, can_continue
        ) VALUES (
          @id, @chat_id, @role, @content, @timestamp, @type, @file_name, @file_content,
          @is_streaming, @suggestions, @rating, @is_edited, @can_continue
        )
      `).run({
        id: message.id,
        chat_id: chatId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        type: message.type ?? 'text',
        file_name: message.fileName ?? null,
        file_content: message.fileContent ?? null,
        is_streaming: message.isStreaming ? 1 : 0,
        suggestions: message.suggestions ? JSON.stringify(message.suggestions) : null,
        rating: message.rating ?? null,
        is_edited: message.isEdited ? 1 : 0,
        can_continue: message.canContinue ? 1 : 0,
      });

      // 更新聊天历史的 updated_at
      db.prepare('UPDATE chat_histories SET updated_at = ? WHERE id = ?').run(
        new Date().toISOString(),
        chatId,
      );

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
          is_streaming = @is_streaming,
          suggestions = @suggestions,
          rating = @rating,
          is_edited = @is_edited,
          can_continue = @can_continue
        WHERE id = @id
      `).run({
        id: message.id,
        content: message.content,
        is_streaming: message.isStreaming ? 1 : 0,
        suggestions: message.suggestions ? JSON.stringify(message.suggestions) : null,
        rating: message.rating ?? null,
        is_edited: message.isEdited ? 1 : 0,
        can_continue: message.canContinue ? 1 : 0,
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
   * 删除聊天历史（级联删除消息）
   */
  deleteHistory(id: string): DatabaseResult {
    const db = getDatabase();

    try {
      // 删除消息
      db.prepare('DELETE FROM messages WHERE chat_id = ?').run(id);
      // 删除聊天历史
      db.prepare('DELETE FROM chat_histories WHERE id = ?').run(id);

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
    db.exec('DELETE FROM chat_histories');
  }

  /**
   * 获取聊天历史数量
   */
  getHistoryCount(): number {
    return this.count();
  }

  /**
   * 获取消息数量
   */
  getMessageCount(chatId?: string): number {
    const db = getDatabase();
    if (chatId) {
      return (db.prepare('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?').get(chatId) as { count: number }).count;
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
          UPDATE chat_histories SET title = @title, updated_at = @updated_at WHERE id = @id
        `).run({
          id: history.id,
          title: history.title,
          updated_at: history.updatedAt.toISOString(),
        });

        // 删除旧消息，插入新消息
        db.prepare('DELETE FROM messages WHERE chat_id = ?').run(history.id);

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
    const db = getDatabase();
    let saved = 0;

    const transaction = db.transaction(() => {
      for (const history of histories) {
        const result = this.saveHistory(history);
        if (result.success) {
          saved++;
        }
      }
    });

    transaction();

    return { success: true, data: { saved } };
  }
}

// 导出单例
export const chatRepository = new ChatRepository();
