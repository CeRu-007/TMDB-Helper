/**
 * 用户 Repository
 * 使用 camelCase 字段名，与数据库 Schema 保持一致
 */

import { getDatabase, getDatabaseAsync } from '../connection';
import { BaseRepository } from './base.repository';
import type { UserRow, DatabaseResult } from '../types';
import { logger } from '@/lib/utils/logger';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | undefined;
  sessionExpiryDays: number;
  avatarUrl?: string | undefined;
}

function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt ?? undefined,
    sessionExpiryDays: row.sessionExpiryDays,
    avatarUrl: row.avatarUrl ?? undefined,
  };
}

export class UserRepository extends BaseRepository<User, UserRow> {
  protected tableName = 'users';

  override findById(id: string): UserRow | undefined {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM users WHERE id = ? AND deletedAt IS NULL')
      .get(id) as UserRow | undefined;

    if (!row) return undefined;

    return row;
  }

  findByUsername(username: string): User | undefined {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM users WHERE username = ? AND deletedAt IS NULL')
      .get(username) as UserRow | undefined;

    if (!row) return undefined;

    return mapRowToUser(row);
  }

  createUser(user: User): DatabaseResult<User> {
    const db = getDatabase();

    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO users (id, username, passwordHash, createdAt, updatedAt, lastLoginAt, sessionExpiryDays, avatarUrl, deletedAt)
        VALUES (@id, @username, @passwordHash, @createdAt, @updatedAt, @lastLoginAt, @sessionExpiryDays, @avatarUrl, @deletedAt)
      `).run({
        id: user.id,
        username: user.username,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt || now,
        updatedAt: user.updatedAt || now,
        lastLoginAt: user.lastLoginAt ?? null,
        sessionExpiryDays: user.sessionExpiryDays,
        avatarUrl: user.avatarUrl ?? null,
        deletedAt: null,
      });

      return { success: true, data: user };
    } catch (error) {
      logger.error('[UserRepository] 创建用户失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  createAdmin = this.createUser;

  updateLastLogin(id: string, lastLoginAt: string): DatabaseResult {
    const db = getDatabase();

    try {
      db.prepare('UPDATE users SET lastLoginAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL').run(lastLoginAt, lastLoginAt, id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  updatePassword(id: string, passwordHash: string): DatabaseResult {
    const db = getDatabase();

    try {
      db.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL').run(passwordHash, new Date().toISOString(), id);
      return { success: true };
    } catch (error) {
      logger.error('[UserRepository] 更新密码失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  updateAvatar(id: string, avatarUrl: string): DatabaseResult {
    const db = getDatabase();

    try {
      db.prepare('UPDATE users SET avatarUrl = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL').run(avatarUrl || null, new Date().toISOString(), id);
      return { success: true };
    } catch (error) {
      logger.error('[UserRepository] 更新头像失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  hasAdmin(): boolean {
    const db = getDatabase();
    const count = (db.prepare('SELECT COUNT(*) as count FROM users WHERE deletedAt IS NULL').get() as { count: number }).count;
    return count > 0;
  }

  getAdminCount(): number {
    const db = getDatabase();
    return (db.prepare('SELECT COUNT(*) as count FROM users WHERE deletedAt IS NULL').get() as { count: number }).count;
  }

  getAdmin(): User | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM users WHERE deletedAt IS NULL LIMIT 1')
      .get() as UserRow | undefined;

    if (!row) return null;

    return mapRowToUser(row);
  }

  async getAdminAsync(): Promise<User | null> {
    const db = await getDatabaseAsync();
    const row = db
      .prepare('SELECT * FROM users WHERE deletedAt IS NULL LIMIT 1')
      .get() as UserRow | undefined;

    if (!row) return null;

    return mapRowToUser(row);
  }

  upsertAdmin(user: User): DatabaseResult<User> {
    const db = getDatabase();

    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO users (id, username, passwordHash, createdAt, updatedAt, lastLoginAt, sessionExpiryDays, avatarUrl, deletedAt)
        VALUES (@id, @username, @passwordHash, @createdAt, @updatedAt, @lastLoginAt, @sessionExpiryDays, @avatarUrl, @deletedAt)
        ON CONFLICT(id) DO UPDATE SET
          username = @username,
          passwordHash = @passwordHash,
          lastLoginAt = @lastLoginAt,
          sessionExpiryDays = @sessionExpiryDays,
          avatarUrl = @avatarUrl,
          updatedAt = @updatedAt
      `).run({
        id: user.id,
        username: user.username,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt || now,
        updatedAt: now,
        lastLoginAt: user.lastLoginAt ?? null,
        sessionExpiryDays: user.sessionExpiryDays,
        avatarUrl: user.avatarUrl ?? null,
        deletedAt: null,
      });

      return { success: true, data: user };
    } catch (error) {
      logger.error('[UserRepository] Upsert用户失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '操作失败',
      };
    }
  }
}

export const userRepository = new UserRepository();
