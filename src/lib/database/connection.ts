/**
 * 数据库连接管理
 * 单例模式，确保整个应用只有一个数据库连接
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '@/lib/utils/logger';

let db: Database.Database | null = null;

/**
 * 获取数据库文件路径
 */
export function getDatabasePath(): string {
  const dataDir = path.join(process.cwd(), 'data');
  return path.join(dataDir, 'tmdb-helper.db');
}

/**
 * 初始化数据库连接
 */
export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  const dataDir = path.dirname(dbPath);

  // 确保数据目录存在
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 创建数据库连接
  db = new Database(dbPath);

  // 启用外键约束
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  logger.info(`[Database] 数据库连接已建立: ${dbPath}`);

  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('[Database] 数据库连接已关闭');
  }
}

/**
 * 检查数据库是否已初始化（表是否存在）
 */
export function isDatabaseInitialized(): boolean {
  const database = getDatabase();
  const result = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='items'",
    )
    .get();
  return !!result;
}

/**
 * 执行事务
 */
export function transaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}

/**
 * 批量插入事务包装器
 */
export function batchInsert<T>(
  items: T[],
  insertFn: (item: T) => void,
): number {
  const database = getDatabase();
  const insert = database.transaction(() => {
    let count = 0;
    for (const item of items) {
      try {
        insertFn(item);
        count++;
      } catch (error) {
        logger.error('[Database] 批量插入失败:', error);
      }
    }
    return count;
  });
  return insert();
}

/**
 * 检查数据库健康状态
 */
export function checkDatabaseHealth(): {
  healthy: boolean;
  path: string;
  size?: number;
  error?: string;
} {
  try {
    const database = getDatabase();
    const dbPath = getDatabasePath();
    const stats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;

    // 简单查询测试连接
    database.prepare('SELECT 1').get();

    return {
      healthy: true,
      path: dbPath,
      size: stats?.size,
    };
  } catch (error) {
    return {
      healthy: false,
      path: getDatabasePath(),
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
