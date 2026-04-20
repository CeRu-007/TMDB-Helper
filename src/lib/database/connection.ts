/**
 * 数据库连接管理
 * 单例模式，确保整个应用只有一个数据库连接
 * 优先使用 Node.js 内置的 SQLite 模块 (node:sqlite)
 * Electron 环境下回退到 better-sqlite3
 */

import path from 'path';
import fs from 'fs';
import { logger } from '@/lib/utils/logger';

// 动态加载数据库模块
function loadDatabaseModule() {
  try {
    // 优先尝试 node:sqlite（Node.js 22.5+）
    const { DatabaseSync } = require('node:sqlite');
    logger.info('[Database] 使用 node:sqlite');
    return DatabaseSync;
  } catch (e) {
    // 回退到 better-sqlite3（Electron 使用 Node.js 20）
    try {
      const Database = require('better-sqlite3');
      logger.info('[Database] 使用 better-sqlite3');
      return Database;
    } catch (e2) {
      throw new Error('无法加载 SQLite 模块，请安装 better-sqlite3');
    }
  }
}

const DatabaseSync = loadDatabaseModule();

// 类型定义
export type SQLiteDatabase = InstanceType<typeof DatabaseSync>;
export type SQLiteStatement = ReturnType<SQLiteDatabase['prepare']>;

let db: SQLiteDatabase | null = null;

/**
 * 获取数据库文件路径
 */
export function getDatabasePath(): string {
  const dataDir = process.env.TMDB_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dataDir, 'tmdb-helper.db');
}

/**
 * 初始化数据库连接
 */
export function getDatabase(): DatabaseSync {
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
  db = new DatabaseSync(dbPath);

  // 启用外键约束
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

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
    .get() as { name: string } | undefined;
  return !!result;
}

/**
 * 执行事务
 * node:sqlite 使用手动的 BEGIN/COMMIT/ROLLBACK
 */
export function transaction<T>(fn: () => T): T {
  const database = getDatabase();
  database.exec('BEGIN');
  try {
    const result = fn();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

/**
 * 批量插入事务包装器
 */
export function batchInsert<T>(
  items: T[],
  insertFn: (item: T) => void,
): number {
  const database = getDatabase();
  database.exec('BEGIN');
  try {
    let count = 0;
    for (const item of items) {
      try {
        insertFn(item);
        count++;
      } catch (error) {
        logger.error('[Database] 批量插入失败:', error);
      }
    }
    database.exec('COMMIT');
    return count;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
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