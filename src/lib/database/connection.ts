/**
 * 数据库连接管理
 * 单例模式，确保整个应用只有一个数据库连接
 * Electron 生产环境使用 better-sqlite3，Web/开发环境使用 node:sqlite
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
let moduleLoadingPromise: Promise<void> | null = null;

/**
 * 检测是否在真正的 Electron 运行时（打包后的应用）
 * process.versions.electron 只在 Electron 环境中存在
 */
function isElectronRuntime(): boolean {
  return process.versions?.electron !== undefined;
}

/**
 * 异步加载数据库模块
 */
async function loadDatabaseModuleAsync(): Promise<void> {
  if (moduleLoaded) {
    return;
  }

  if (loadError) {
    throw loadError;
  }

  const isElectron = isElectronRuntime();

  // Electron 生产环境使用 better-sqlite3
  if (isElectron) {
    try {
      DatabaseSync = require('better-sqlite3');
      logger.info('[Database] Electron 生产环境使用 better-sqlite3');
      moduleLoaded = true;
      return;
    } catch (e) {
      logger.warn('[Database] better-sqlite3 加载失败:', e instanceof Error ? e.message : String(e));
    }
  }

  // Web/Node.js 环境使用 node:sqlite
  try {
    const sqlite = await import('node:sqlite');
    DatabaseSync = sqlite.DatabaseSync;
    logger.info('[Database] 使用 node:sqlite');
    moduleLoaded = true;
    return;
  } catch (e) {
    logger.warn('[Database] node:sqlite 加载失败:', e instanceof Error ? e.message : String(e));
  }

  const errorMsg = isElectron
    ? 'Electron 环境无法加载 better-sqlite3，请检查是否正确打包'
    : '无法加载 SQLite 模块，请安装 better-sqlite3 或确保 Node.js 版本支持 node:sqlite';
  loadError = new Error(errorMsg);
  logger.error('[Database]', errorMsg);
  moduleLoaded = true;
  throw loadError;
}

/**
 * 确保数据库模块已加载（同步回退）
 */
function ensureModuleLoaded(): void {
  if (moduleLoaded && DatabaseSync) {
    return;
  }
  
  if (loadError) {
    throw loadError;
  }

  // 如果异步加载正在进行，抛出错误提示使用异步版本
  if (moduleLoadingPromise) {
    throw new Error('数据库模块正在加载中，请使用 getDatabaseAsync()');
  }

  // 尝试同步加载（仅 Electron 生产环境）
  const isElectron = isElectronRuntime();
  if (isElectron) {
    try {
      DatabaseSync = require('better-sqlite3');
      logger.info('[Database] 同步加载 better-sqlite3');
      moduleLoaded = true;
      return;
    } catch (e) {
      logger.warn('[Database] 同步加载失败:', e instanceof Error ? e.message : String(e));
    }
  }

  // 无法同步加载，需要异步加载
  throw new Error('需要使用 initDatabaseModule() 异步初始化数据库模块');
}

/**
 * 初始化数据库模块（异步）
 */
export async function initDatabaseModule(): Promise<void> {
  if (moduleLoaded && DatabaseSync) {
    return;
  }

  if (moduleLoadingPromise) {
    return moduleLoadingPromise;
  }

  moduleLoadingPromise = loadDatabaseModuleAsync();
  return moduleLoadingPromise;
}

/**
 * 获取数据库文件路径
 */
export function getDatabasePath(): string {
  const dataDir = process.env.TMDB_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dataDir, 'tmdb-helper.db');
}

/**
 * 异步初始化数据库连接
 */
export async function getDatabaseAsync(): Promise<SQLiteDatabase> {
  // 检查加载错误
  if (loadError) {
    throw loadError;
  }

  if (db) {
    return db;
  }

  // 确保模块已加载
  await initDatabaseModule();

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
 * 同步获取数据库连接（仅用于已初始化后的场景）
 */
export function getDatabase(): SQLiteDatabase {
  if (db) {
    return db;
  }

  ensureModuleLoaded();

  if (!DatabaseSync) {
    throw new Error('数据库模块未初始化，请先调用 initDatabaseModule()');
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
export async function isDatabaseInitializedAsync(): Promise<boolean> {
  const database = await getDatabaseAsync();
  const result = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='items'",
    )
    .get() as { name: string } | undefined;
  return !!result;
}

/**
 * 同步版本：检查数据库是否已初始化
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
export async function checkDatabaseHealthAsync(): Promise<{
  healthy: boolean;
  path: string;
  size?: number;
  error?: string;
}> {
  try {
    const database = await getDatabaseAsync();
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

/**
 * 同步版本：检查数据库健康状态
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
