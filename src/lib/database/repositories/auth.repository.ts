/**
 * 认证 Repository
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
  lastLoginAt?: string;
  sessionExpiryDays: number;
}

export class AuthRepository extends BaseRepository<AdminUser, AdminUserRow> {
  protected tableName = 'admin_users';

  /**
   * 根据用户名查找
   */
  findByUsername(username: string): AdminUser | undefined {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as AdminUserRow | undefined;

    if (!row) return undefined;

    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at ?? undefined,
      sessionExpiryDays: row.session_expiry_days,
    };
  }

  /**
   * 创建管理员
   */
  createAdmin(admin: AdminUser): DatabaseResult<AdminUser> {
    const db = getDatabase();

    try {
      db.prepare(`
        INSERT INTO admin_users (id, username, password_hash, created_at, last_login_at, session_expiry_days)
        VALUES (@id, @username, @password_hash, @created_at, @last_login_at, @session_expiry_days)
      `).run({
        id: admin.id,
        username: admin.username,
        password_hash: admin.passwordHash,
        created_at: admin.createdAt,
        last_login_at: admin.lastLoginAt ?? null,
        session_expiry_days: admin.sessionExpiryDays,
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
      db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?').run(lastLoginAt, id);
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
      db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
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
    return this.count() > 0;
  }

  /**
   * 获取管理员数量
   */
  getAdminCount(): number {
    return this.count();
  }

  /**
   * 获取管理员（单例模式，只有一个管理员）
   */
  getAdmin(): AdminUser | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM admin_users LIMIT 1').get() as AdminUserRow | undefined;

    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at ?? undefined,
      sessionExpiryDays: row.session_expiry_days,
    };
  }

  /**
   * 创建或更新管理员（upsert）
   */
  upsertAdmin(admin: AdminUser): DatabaseResult<AdminUser> {
    const db = getDatabase();

    try {
      db.prepare(`
        INSERT INTO admin_users (id, username, password_hash, created_at, last_login_at, session_expiry_days)
        VALUES (@id, @username, @password_hash, @created_at, @last_login_at, @session_expiry_days)
        ON CONFLICT(id) DO UPDATE SET
          username = @username,
          password_hash = @password_hash,
          last_login_at = @last_login_at,
          session_expiry_days = @session_expiry_days
      `).run({
        id: admin.id,
        username: admin.username,
        password_hash: admin.passwordHash,
        created_at: admin.createdAt,
        last_login_at: admin.lastLoginAt ?? null,
        session_expiry_days: admin.sessionExpiryDays,
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
