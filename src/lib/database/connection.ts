/**
 * 数据库连接管理
 * 单例模式，确保整个应用只有一个数据库连接
 * 优先使用 better-sqlite3（兼容 Web 和 Electron 环境）
 */

import path from 'path';
import fs from 'fs';
import { logger } from '@/lib/utils/logger';

// 类型定义
export type SQLiteDatabase = any;
export type SQLiteStatement = any;

let db: SQLiteDatabase | null = null;
let DatabaseSync: any = null;
let moduleLoaded = false;
let loadError: Error | null = null;

/**
 * 动态加载数据库模块（同步）
 * 只在第一次调用时执行
 */
function loadDatabaseModule(): void {
  if (moduleLoaded) {
    return;
  }

  // 检测是否在 Electron 环境
  const isElectron = process.env.ELECTRON_BUILD === 'true' || 
                     process.versions?.electron !== undefined;

  // 首先尝试 better-sqlite3
  try {
    DatabaseSync = require('better-sqlite3');
    logger.info('[Database] 使用 better-sqlite3');
    moduleLoaded = true;
    return;
  } catch (e) {
    // better-sqlite3 不可用，尝试 node:sqlite
  }

  // Web 环境尝试 node:sqlite
  if (!isElectron) {
    try {
      // 使用 require 而不是动态 import，保持同步
      const sqlite = require('node:sqlite');
      DatabaseSync = sqlite.DatabaseSync;
      logger.info('[Database] 使用 node:sqlite');
      moduleLoaded = true;
      return;
    } catch (e) {
      // node:sqlite 也不可用
    }
  }

  loadError = new Error('无法加载 SQLite 模块，请安装 better-sqlite3: pnpm add -D better-sqlite3');
  moduleLoaded = true;
}

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
export function getDatabase(): SQLiteDatabase {
  // 检查加载错误
  if (loadError) {
    throw loadError;
  }

  if (db) {
    return db;
  }

  // 动态加载数据库模块
  loadDatabaseModule();

  if (loadError) {
    throw loadError;
  }

  if (!DatabaseSync) {
    throw new Error('数据库模块未初始化');
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
