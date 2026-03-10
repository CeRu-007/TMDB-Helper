/**
 * 基础 Repository 类
 * 提供通用的 CRUD 操作
 */

import { getDatabase } from '../connection';
import type { DatabaseResult } from '../types';

export abstract class BaseRepository<T, R = T> {
  protected abstract tableName: string;

  /**
   * 查询所有记录
   */
  findAll(options?: { orderBy?: string; limit?: number }): R[] {
    const db = getDatabase();
    let sql = `SELECT * FROM ${this.tableName}`;

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    return db.prepare(sql).all() as R[];
  }

  /**
   * 根据ID查询
   */
  findById(id: string): R | undefined {
    const db = getDatabase();
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return db.prepare(sql).get(id) as R | undefined;
  }

  /**
   * 根据条件查询
   */
  findBy(conditions: Record<string, unknown>): R[] {
    const db = getDatabase();
    const keys = Object.keys(conditions);
    const whereClause = keys.map((k) => `${k} = ?`).join(' AND ');
    const values = Object.values(conditions);

    const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`;
    return db.prepare(sql).all(...values) as R[];
  }

  /**
   * 根据条件查询单条记录
   */
  findOneBy(conditions: Record<string, unknown>): R | undefined {
    const results = this.findBy(conditions);
    return results[0];
  }

  /**
   * 统计记录数
   */
  count(conditions?: Record<string, unknown>): number {
    const db = getDatabase();
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;

    if (conditions && Object.keys(conditions).length > 0) {
      const keys = Object.keys(conditions);
      const whereClause = keys.map((k) => `${k} = ?`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
      const values = Object.values(conditions);
      return (db.prepare(sql).get(...values) as { count: number }).count;
    }

    return (db.prepare(sql).get() as { count: number }).count;
  }

  /**
   * 判断记录是否存在
   */
  exists(conditions: Record<string, unknown>): boolean {
    return this.count(conditions) > 0;
  }

  /**
   * 删除记录
   */
  deleteById(id: string): DatabaseResult {
    const db = getDatabase();
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = db.prepare(sql).run(id);

      return {
        success: result.changes > 0,
        error: result.changes === 0 ? '记录不存在' : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  /**
   * 根据条件删除
   */
  deleteBy(conditions: Record<string, unknown>): DatabaseResult<number> {
    const db = getDatabase();
    try {
      const keys = Object.keys(conditions);
      const whereClause = keys.map((k) => `${k} = ?`).join(' AND ');
      const values = Object.values(conditions);

      const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
      const result = db.prepare(sql).run(...values);

      return {
        success: true,
        data: result.changes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  /**
   * 清空表
   */
  clear(): void {
    const db = getDatabase();
    db.exec(`DELETE FROM ${this.tableName}`);
  }
}
