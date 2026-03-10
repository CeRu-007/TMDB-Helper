/**
 * 认证 Repository
 * 使用 camelCase 字段名，与数据库 Schema 保持一致
 */

import { getDatabase } from '../connection';
import { BaseRepository } from './base.repository';
import type { AdminUserRow, DatabaseResult } from '../types';
import { logger } from '@/lib/utils/logger';

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  sessionExpiryDays: number;
}

export class AuthRepository extends BaseRepository<AdminUser, AdminUserRow> {
  protected tableName = 'adminUsers';

  /**
   * 根据用户名查找
   */
  findByUsername(username: string): AdminUser | undefined {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM adminUsers WHERE username = ? AND deletedAt IS NULL')
      .get(username) as AdminUserRow | undefined;

    if (!row) return undefined;

    return {
      id: row.id,
      username: row.username,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt ?? undefined,
      sessionExpiryDays: row.sessionExpiryDays,
    };
  }

  /**
   * 创建管理员
   */
  createAdmin(admin: AdminUser): DatabaseResult<AdminUser> {
    const db = getDatabase();

    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO adminUsers (id, username, passwordHash, createdAt, updatedAt, lastLoginAt, sessionExpiryDays, deletedAt)
        VALUES (@id, @username, @passwordHash, @createdAt, @updatedAt, @lastLoginAt, @sessionExpiryDays, @deletedAt)
      `).run({
        id: admin.id,
        username: admin.username,
        passwordHash: admin.passwordHash,
        createdAt: admin.createdAt || now,
        updatedAt: admin.updatedAt || now,
        lastLoginAt: admin.lastLoginAt ?? null,
        sessionExpiryDays: admin.sessionExpiryDays,
        deletedAt: null,
      });

      return { success: true, data: admin };
    } catch (error) {
      logger.error('[AuthRepository] 创建管理员失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  /**
   * 更新最后登录时间
   */
  updateLastLogin(id: string, lastLoginAt: string): DatabaseResult {
    const db = getDatabase();

    try {
      db.prepare('UPDATE adminUsers SET lastLoginAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL').run(lastLoginAt, lastLoginAt, id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  /**
   * 更新密码
   */
  updatePassword(id: string, passwordHash: string): DatabaseResult {
    const db = getDatabase();

    try {
      db.prepare('UPDATE adminUsers SET passwordHash = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL').run(passwordHash, new Date().toISOString(), id);
      return { success: true };
    } catch (error) {
      logger.error('[AuthRepository] 更新密码失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  /**
   * 检查管理员是否存在
   */
  hasAdmin(): boolean {
    const db = getDatabase();
    const count = (db.prepare('SELECT COUNT(*) as count FROM adminUsers WHERE deletedAt IS NULL').get() as { count: number }).count;
    return count > 0;
  }

  /**
   * 获取管理员数量
   */
  getAdminCount(): number {
    const db = getDatabase();
    return (db.prepare('SELECT COUNT(*) as count FROM adminUsers WHERE deletedAt IS NULL').get() as { count: number }).count;
  }

  /**
   * 获取管理员（单例模式，只有一个管理员）
   */
  getAdmin(): AdminUser | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM adminUsers WHERE deletedAt IS NULL LIMIT 1')
      .get() as AdminUserRow | undefined;

    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt ?? undefined,
      sessionExpiryDays: row.sessionExpiryDays,
    };
  }

  /**
   * 创建或更新管理员（upsert）
   */
  upsertAdmin(admin: AdminUser): DatabaseResult<AdminUser> {
    const db = getDatabase();

    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO adminUsers (id, username, passwordHash, createdAt, updatedAt, lastLoginAt, sessionExpiryDays, deletedAt)
        VALUES (@id, @username, @passwordHash, @createdAt, @updatedAt, @lastLoginAt, @sessionExpiryDays, @deletedAt)
        ON CONFLICT(id) DO UPDATE SET
          username = @username,
          passwordHash = @passwordHash,
          lastLoginAt = @lastLoginAt,
          sessionExpiryDays = @sessionExpiryDays,
          updatedAt = @updatedAt
      `).run({
        id: admin.id,
        username: admin.username,
        passwordHash: admin.passwordHash,
        createdAt: admin.createdAt || now,
        updatedAt: now,
        lastLoginAt: admin.lastLoginAt ?? null,
        sessionExpiryDays: admin.sessionExpiryDays,
        deletedAt: null,
      });

      return { success: true, data: admin };
    } catch (error) {
      logger.error('[AuthRepository] Upsert管理员失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '操作失败',
      };
    }
  }
}

// 导出单例
export const authRepository = new AuthRepository();