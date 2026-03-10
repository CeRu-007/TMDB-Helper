/**
 * 数据库 Schema 定义和初始化
 */

import { getDatabase, isDatabaseInitialized } from './connection';
import { logger } from '@/lib/utils/logger';

/**
 * 初始化数据库 Schema
 */
export function initializeSchema(): void {
  const db = getDatabase();

  if (isDatabaseInitialized()) {
    logger.debug('[Database] Schema 已存在，跳过初始化');
    return;
  }

  logger.info('[Database] 初始化 Schema...');

  // 媒体项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      tmdb_id TEXT,
      imdb_id TEXT,
      title TEXT NOT NULL,
      original_title TEXT,
      overview TEXT,
      year INTEGER,
      release_date TEXT,
      genres TEXT,
      runtime INTEGER,
      vote_average REAL,
      media_type TEXT DEFAULT 'tv',
      poster_path TEXT,
      poster_url TEXT,
      backdrop_path TEXT,
      backdrop_url TEXT,
      logo_path TEXT,
      logo_url TEXT,
      network_id INTEGER,
      network_name TEXT,
      network_logo_url TEXT,
      status TEXT,
      completed INTEGER DEFAULT 0,
      platform_url TEXT,
      total_episodes INTEGER,
      manually_set_episodes INTEGER DEFAULT 0,
      weekday INTEGER,
      second_weekday INTEGER,
      air_time TEXT,
      category TEXT,
      tmdb_url TEXT,
      notes TEXT,
      is_daily_update INTEGER DEFAULT 0,
      blur_intensity TEXT,
      rating INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 季表
  db.exec(`
    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      season_number INTEGER NOT NULL,
      name TEXT,
      total_episodes INTEGER NOT NULL,
      current_episode INTEGER,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `);

  // 分集表
  db.exec(`
    CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      season_id INTEGER,
      season_number INTEGER,
      number INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
    )
  `);

  // 定时任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_title TEXT NOT NULL,
      item_tmdb_id TEXT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'tmdb-import',
      schedule_type TEXT NOT NULL,
      day_of_week INTEGER,
      second_day_of_week INTEGER,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      action_config TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      last_run TEXT,
      next_run TEXT,
      last_run_status TEXT,
      last_run_error TEXT,
      current_step TEXT,
      execution_progress INTEGER,
      is_running INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
    )
  `);

  // 执行日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS execution_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      step TEXT,
      message TEXT,
      level TEXT DEFAULT 'info',
      details TEXT,
      FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
    )
  `);

  // AI聊天历史表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_histories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 消息表
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      file_name TEXT,
      file_content TEXT,
      is_streaming INTEGER DEFAULT 0,
      suggestions TEXT,
      rating TEXT,
      is_edited INTEGER DEFAULT 0,
      can_continue INTEGER DEFAULT 0,
      FOREIGN KEY (chat_id) REFERENCES chat_histories(id) ON DELETE CASCADE
    )
  `);

  // 管理员用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login_at TEXT,
      session_expiry_days INTEGER DEFAULT 7
    )
  `);

  // 配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 创建索引
  createIndexes(db);

  logger.info('[Database] Schema 初始化完成');
}

/**
 * 创建索引
 */
function createIndexes(db: ReturnType<typeof getDatabase>): void {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_items_tmdb_id ON items(tmdb_id)',
    'CREATE INDEX IF NOT EXISTS idx_items_weekday ON items(weekday)',
    'CREATE INDEX IF NOT EXISTS idx_episodes_item_id ON episodes(item_id)',
    'CREATE INDEX IF NOT EXISTS idx_seasons_item_id ON seasons(item_id)',
    'CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_item_id ON scheduled_tasks(item_id)',
    'CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled ON scheduled_tasks(enabled)',
    'CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)',
    'CREATE INDEX IF NOT EXISTS idx_execution_logs_task_id ON execution_logs(task_id)',
  ];

  for (const sql of indexes) {
    db.exec(sql);
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

  const items = (db.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number }).count;
  const tasks = (db.prepare('SELECT COUNT(*) as count FROM scheduled_tasks').get() as { count: number }).count;
  const chatHistories = (db.prepare('SELECT COUNT(*) as count FROM chat_histories').get() as { count: number }).count;
  const messages = (db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }).count;

  return { items, tasks, chatHistories, messages };
}

/**
 * 清空所有数据（保留表结构）
 */
export function clearAllData(): void {
  const db = getDatabase();

  db.exec('DELETE FROM execution_logs');
  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM chat_histories');
  db.exec('DELETE FROM scheduled_tasks');
  db.exec('DELETE FROM episodes');
  db.exec('DELETE FROM seasons');
  db.exec('DELETE FROM items');
  db.exec('DELETE FROM admin_users');
  db.exec('DELETE FROM config');

  logger.info('[Database] 所有数据已清空');
}
