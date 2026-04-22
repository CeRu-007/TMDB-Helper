/**
 * 配置 Repository
 * 使用 camelCase 字段名，与数据库 Schema 保持一致
 */

import { getDatabaseAsync } from '../connection';
import { BaseRepository } from './base.repository';
import type { ConfigRow, DatabaseResult } from '../types';
import { logger } from '@/lib/utils/logger';

export class ConfigRepository extends BaseRepository<Record<string, unknown>, ConfigRow> {
  protected tableName = 'config';

  /**
   * 获取配置值
   */
  async get<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined> {
    const db = await getDatabaseAsync();
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as ConfigRow | undefined;

    if (!row) return defaultValue;

    try {
      return JSON.parse(row.value) as T;
    } catch {
      return row.value as unknown as T;
    }
  }

  /**
   * 设置配置值
   */
  async set<T>(key: string, value: T): Promise<DatabaseResult> {
    const db = await getDatabaseAsync();

    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO config (key, value, createdAt, updatedAt) VALUES (@key, @value, @createdAt, @updatedAt)
        ON CONFLICT(key) DO UPDATE SET value = @value, updatedAt = @updatedAt
      `).run({
        key,
        value: serializedValue,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true };
    } catch (error) {
      logger.error(`[ConfigRepository] 设置配置失败: ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置失败',
      };
    }
  }

  /**
   * 删除配置
   */
  async delete(key: string): Promise<DatabaseResult> {
    const db = await getDatabaseAsync();

    try {
      db.prepare('DELETE FROM config WHERE key = ?').run(key);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  /**
   * 检查配置是否存在
   */
  async has(key: string): Promise<boolean> {
    const db = await getDatabaseAsync();
    const result = db.prepare('SELECT 1 FROM config WHERE key = ?').get(key);
    return !!result;
  }

  /**
   * 获取所有配置
   */
  async getAll(): Promise<Record<string, unknown>> {
    const db = await getDatabaseAsync();
    const rows = db.prepare('SELECT key, value FROM config').all() as ConfigRow[];

    const config: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch {
        config[row.key] = row.value;
      }
    }

    return config;
  }

  /**
   * 批量设置配置
   */
  async setMany(config: Record<string, unknown>): Promise<DatabaseResult<number>> {
    let count = 0;

    for (const [key, value] of Object.entries(config)) {
      const result = await this.set(key, value);
      if (result.success) {
        count++;
      }
    }

    return { success: true, data: count };
  }

  /**
   * 获取配置数量
   */
  async getConfigCount(): Promise<number> {
    return this.count();
  }
}

// 导出单例
export const configRepository = new ConfigRepository();
