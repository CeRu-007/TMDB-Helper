/**
 * 数据库 Schema 定义和初始化
 * 所有字段使用 camelCase 命名，与 TypeScript 代码保持一致
 */

import { getDatabase } from './connection';
import { logger } from '@/lib/utils/logger';

// 当前 Schema 版本
export const SCHEMA_VERSION = 3;

/**
 * 初始化数据库 Schema
 */
export function initializeSchema(): void {
  const db = getDatabase();

  // 获取当前版本
  const currentVersion = getUserVersion();

  if (currentVersion === SCHEMA_VERSION) {
    logger.debug('[Database] Schema 已是最新版本，跳过初始化');
    return;
  }

  if (currentVersion === 0) {
    // 全新安装
    logger.info('[Database] 初始化数据库 Schema...');
    createTables(db);
    createIndexes(db);
    setUserVersion(SCHEMA_VERSION);
    logger.info('[Database] Schema 初始化完成');
  } else {
    // 版本不匹配，直接更新版本号（迁移已完成）
    setUserVersion(SCHEMA_VERSION);
    logger.info(`[Database] Schema 版本已更新: ${currentVersion} -> ${SCHEMA_VERSION}`);
  }
}

/**
 * 创建所有表
 */
function createTables(db: ReturnType<typeof getDatabase>): void {
  // 媒体项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      tmdbId TEXT,
      imdbId TEXT,
      title TEXT NOT NULL,
      originalTitle TEXT,
      overview TEXT,
      year INTEGER,
      releaseDate TEXT,
      genres TEXT,
      runtime INTEGER,
      voteAverage REAL,
      mediaType TEXT DEFAULT 'tv',
      posterPath TEXT,
      posterUrl TEXT,
      backdropPath TEXT,
      backdropUrl TEXT,
      logoPath TEXT,
      logoUrl TEXT,
      networkId INTEGER,
      networkName TEXT,
      networkLogoUrl TEXT,
      status TEXT,
      completed INTEGER DEFAULT 0,
      platformUrl TEXT,
      totalEpisodes INTEGER,
      manuallySetEpisodes INTEGER DEFAULT 0,
      weekday INTEGER,
      secondWeekday INTEGER,
      airTime TEXT,
      category TEXT,
      tmdbUrl TEXT,
      notes TEXT,
      isDailyUpdate INTEGER DEFAULT 0,
      blurIntensity TEXT,
      rating INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT
    )
  `);

  // 季表
  db.exec(`
    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      seasonNumber INTEGER NOT NULL,
      name TEXT,
      totalEpisodes INTEGER NOT NULL,
      currentEpisode INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE
    )
  `);

  // 分集表
  db.exec(`
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      seasonId TEXT,
      seasonNumber INTEGER,
      number INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (seasonId) REFERENCES seasons(id) ON DELETE CASCADE
    )
  `);

  // 定时任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduledTasks (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      itemTitle TEXT NOT NULL,
      itemTmdbId TEXT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'tmdb-import',
      scheduleType TEXT NOT NULL,
      dayOfWeek INTEGER,
      secondDayOfWeek INTEGER,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      actionConfig TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      lastRun TEXT,
      nextRun TEXT,
      lastRunStatus TEXT,
      lastRunError TEXT,
      currentStep TEXT,
      executionProgress INTEGER,
      isRunning INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT,
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE SET NULL
    )
  `);

  // 执行日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS executionLogs (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      step TEXT,
      message TEXT,
      level TEXT DEFAULT 'info',
      details TEXT,
      FOREIGN KEY (taskId) REFERENCES scheduledTasks(id) ON DELETE CASCADE
    )
  `);

  // AI聊天历史表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chatHistories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT
    )
  `);

  // 消息表
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      fileName TEXT,
      fileContent TEXT,
      isStreaming INTEGER DEFAULT 0,
      suggestions TEXT,
      rating TEXT,
      isEdited INTEGER DEFAULT 0,
      canContinue INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (chatId) REFERENCES chatHistories(id) ON DELETE CASCADE
    )
  `);

  // 管理员用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS adminUsers (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastLoginAt TEXT,
      sessionExpiryDays INTEGER DEFAULT 7,
      deletedAt TEXT
    )
  `);

  // 配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Schema 版本表
  db.exec(`
    CREATE TABLE IF NOT EXISTS schemaVersion (
      version INTEGER PRIMARY KEY,
      appliedAt TEXT NOT NULL,
      description TEXT
    )
  `);
}

/**
 * 创建索引
 */
function createIndexes(db: ReturnType<typeof getDatabase>): void {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_items_tmdbId ON items(tmdbId)',
    'CREATE INDEX IF NOT EXISTS idx_items_weekday ON items(weekday)',
    'CREATE INDEX IF NOT EXISTS idx_items_deletedAt ON items(deletedAt)',
    'CREATE INDEX IF NOT EXISTS idx_episodes_itemId ON episodes(itemId)',
    'CREATE INDEX IF NOT EXISTS idx_seasons_itemId ON seasons(itemId)',
    'CREATE INDEX IF NOT EXISTS idx_scheduledTasks_itemId ON scheduledTasks(itemId)',
    'CREATE INDEX IF NOT EXISTS idx_scheduledTasks_enabled ON scheduledTasks(enabled)',
    'CREATE INDEX IF NOT EXISTS idx_scheduledTasks_deletedAt ON scheduledTasks(deletedAt)',
    'CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId)',
    'CREATE INDEX IF NOT EXISTS idx_executionLogs_taskId ON executionLogs(taskId)',
    'CREATE INDEX IF NOT EXISTS idx_chatHistories_deletedAt ON chatHistories(deletedAt)',
    'CREATE INDEX IF NOT EXISTS idx_adminUsers_deletedAt ON adminUsers(deletedAt)',
  ];

  for (const sql of indexes) {
    db.exec(sql);
  }
}

/**
 * 获取用户版本
 */
function getUserVersion(): number {
  const db = getDatabase();
  const result = db.prepare('PRAGMA user_version').get() as { user_version: number };
  return result.user_version;
}

/**
 * 设置用户版本
 */
function setUserVersion(version: number): void {
  const db = getDatabase();
  db.exec(`PRAGMA user_version = ${version}`);
}

/**
 * 安全地获取表的记录数
 */
function safeCount(db: ReturnType<typeof getDatabase>, tableName: string, whereClause: string = ''): number {
  try {
    const sql = whereClause 
      ? `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`
      : `SELECT COUNT(*) as count FROM ${tableName}`;
    return (db.prepare(sql).get() as { count: number }).count;
  } catch {
    return 0;
  }
}

/**
 * 获取数据库统计信息
 */
export function getDatabaseStats(): {
  items: number;
  tasks: number;
  chatHistories: number;
  messages: number;
} {
  const db = getDatabase();

  const items = safeCount(db, 'items', 'deletedAt IS NULL');
  const tasks = safeCount(db, 'scheduledTasks', 'deletedAt IS NULL');
  const chatHistories = safeCount(db, 'chatHistories', 'deletedAt IS NULL');
  const messages = safeCount(db, 'messages');

  return { items, tasks, chatHistories, messages };
}

/**
 * 清空所有数据（保留表结构）
 */
export function clearAllData(): void {
  const db = getDatabase();

  db.exec('DELETE FROM executionLogs');
  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM chatHistories');
  db.exec('DELETE FROM scheduledTasks');
  db.exec('DELETE FROM episodes');
  db.exec('DELETE FROM seasons');
  db.exec('DELETE FROM items');
  db.exec('DELETE FROM adminUsers');
  db.exec('DELETE FROM config');

  logger.info('[Database] 所有数据已清空');
}