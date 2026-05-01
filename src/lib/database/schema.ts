/**
 * 数据库 Schema 定义和初始化
 * 所有字段使用 camelCase 命名，与 TypeScript 代码保持一致
 */

import { getDatabaseAsync } from './connection';
import { logger } from '@/lib/utils/logger';

// 当前 Schema 版本
export const SCHEMA_VERSION = 12;

/**
 * 初始化数据库 Schema
 */
export async function initializeSchema(): Promise<void> {
  const db = await getDatabaseAsync();

  // 获取当前版本
  const currentVersion = getUserVersion(db);

  if (currentVersion === SCHEMA_VERSION) {
    logger.debug('[Database] Schema 已是最新版本，跳过初始化');
    return;
  }

  if (currentVersion === 0) {
    // 全新安装
    logger.info('[Database] 初始化数据库 Schema...');
    createTables(db);
    createIndexes(db);
    initializeDefaultConfig(db);
    setUserVersion(db, SCHEMA_VERSION);
    logger.info('[Database] Schema 初始化完成');
  } else {
    // 版本升级：创建新表（IF NOT EXISTS 确保不会重复创建）
    logger.info(`[Database] 升级数据库 Schema: ${currentVersion} -> ${SCHEMA_VERSION}`);
    createTables(db); // 使用 IF NOT EXISTS，安全地创建新表
    createIndexes(db); // 使用 IF NOT EXISTS，安全地创建新索引

    // 版本迁移
    if (currentVersion < 6) {
      migrateToV6(db);
    }
    if (currentVersion < 7) {
      migrateToV7(db);
    }
    if (currentVersion < 8) {
      migrateToV8(db);
    }
    if (currentVersion < 9) {
      migrateToV9(db);
    }
    if (currentVersion < 10) {
      migrateToV10(db);
    }
    if (currentVersion < 11) {
      migrateToV11(db);
    }
    if (currentVersion < 12) {
      migrateToV12(db);
    }

    setUserVersion(db, SCHEMA_VERSION);
    logger.info('[Database] Schema 升级完成');
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
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastLoginAt TEXT,
      sessionExpiryDays INTEGER DEFAULT 15,
      avatarUrl TEXT,
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

  // 图片缓存表
  db.exec(`
    CREATE TABLE IF NOT EXISTS image_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdbId TEXT NOT NULL,
      itemId TEXT,
      imageType TEXT NOT NULL,
      imagePath TEXT,
      imageUrl TEXT,
      sizeType TEXT DEFAULT 'original',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastVerifiedAt TEXT,
      isPermanent INTEGER DEFAULT 1,
      sourceType TEXT DEFAULT 'tmdb',
      UNIQUE(tmdbId, imageType, sizeType)
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

  // 定时任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_tasks (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      cron TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      headless INTEGER DEFAULT 1,
      incremental INTEGER DEFAULT 1,
      autoImport INTEGER DEFAULT 0,
      tmdbSeason INTEGER DEFAULT 1,
      tmdbLanguage TEXT DEFAULT 'zh-CN',
      tmdbAutoResponse TEXT DEFAULT 'w',
      fieldCleanup TEXT DEFAULT '{}',
      lastRunAt TEXT,
      nextRunAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // 定时任务日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_logs (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      status TEXT NOT NULL,
      startAt TEXT NOT NULL,
      endAt TEXT,
      message TEXT NOT NULL,
      details TEXT,
      FOREIGN KEY (taskId) REFERENCES schedule_tasks(id) ON DELETE CASCADE
    )
  `);

  // 任务记事表
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_journal (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      itemTitle TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      dataPreview TEXT,
      errorMessage TEXT,
      startAt TEXT NOT NULL,
      endAt TEXT,
      read INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
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
    'CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId)',
    'CREATE INDEX IF NOT EXISTS idx_chatHistories_deletedAt ON chatHistories(deletedAt)',
    'CREATE INDEX IF NOT EXISTS idx_users_deletedAt ON users(deletedAt)',
    'CREATE INDEX IF NOT EXISTS idx_image_cache_tmdbId ON image_cache(tmdbId)',
    'CREATE INDEX IF NOT EXISTS idx_image_cache_itemId ON image_cache(itemId)',
    'CREATE INDEX IF NOT EXISTS idx_image_cache_type ON image_cache(imageType)',
    'CREATE INDEX IF NOT EXISTS idx_schedule_tasks_itemId ON schedule_tasks(itemId)',
    'CREATE INDEX IF NOT EXISTS idx_schedule_tasks_enabled ON schedule_tasks(enabled)',
    'CREATE INDEX IF NOT EXISTS idx_schedule_logs_taskId ON schedule_logs(taskId)',
    'CREATE INDEX IF NOT EXISTS idx_task_journal_itemId ON task_journal(itemId)',
    'CREATE INDEX IF NOT EXISTS idx_task_journal_status ON task_journal(status)',
    'CREATE INDEX IF NOT EXISTS idx_task_journal_read ON task_journal(read)',
    'CREATE INDEX IF NOT EXISTS idx_task_journal_createdAt ON task_journal(createdAt)',
  ];

  for (const sql of indexes) {
    db.exec(sql);
  }
}

/**
 * 获取用户版本
 */
function getUserVersion(db: any): number {
  const result = db.prepare('PRAGMA user_version').get() as { user_version: number };
  return result.user_version;
}

/**
 * 设置用户版本
 */
function setUserVersion(db: any, version: number): void {
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
 * 迁移到 V6: 为 schedule_tasks 表添加 incremental 字段
 */
function migrateToV6(db: ReturnType<typeof getDatabase>): void {
  logger.info('[Database] 执行 V6 迁移: 为 schedule_tasks 添加 incremental 字段');

  try {
    db.exec(`
      ALTER TABLE schedule_tasks ADD COLUMN incremental INTEGER DEFAULT 1
    `);
    logger.info('[Database] V6 迁移完成');
  } catch (error) {
    logger.error('[Database] V6 迁移失败:', error);
  }
}

/**
 * 迁移到 V7: 为 schedule_tasks 表添加 headless 字段
 */
function migrateToV7(db: ReturnType<typeof getDatabase>): void {
  logger.info('[Database] 执行 V7 迁移: 为 schedule_tasks 添加 headless 字段');

  try {
    db.exec(`
      ALTER TABLE schedule_tasks ADD COLUMN headless INTEGER DEFAULT 1
    `);
    logger.info('[Database] V7 迁移完成');
  } catch (error) {
    logger.error('[Database] V7 迁移失败:', error);
  }
}

/**
 * 迁移到 V8: 为 schedule_tasks 表添加 tmdbSeason 和 tmdbLanguage 字段
 */
function migrateToV8(db: ReturnType<typeof getDatabase>): void {
  logger.info('[Database] 执行 V8 迁移: 为 schedule_tasks 添加 tmdbSeason 和 tmdbLanguage 字段');

  try {
    db.exec(`
      ALTER TABLE schedule_tasks ADD COLUMN tmdbSeason INTEGER DEFAULT 1
    `);
    db.exec(`
      ALTER TABLE schedule_tasks ADD COLUMN tmdbLanguage TEXT DEFAULT 'zh-CN'
    `);
    logger.info('[Database] V8 迁移完成');
  } catch (error) {
    logger.error('[Database] V8 迁移失败:', error);
  }
}

/**
 * 迁移到 V9: 为 schedule_tasks 表添加 tmdbAutoResponse 字段
 */
function migrateToV9(db: ReturnType<typeof getDatabase>): void {
  logger.info('[Database] 执行 V9 迁移: 为 schedule_tasks 添加 tmdbAutoResponse 字段');

  try {
    db.exec(`
      ALTER TABLE schedule_tasks ADD COLUMN tmdbAutoResponse TEXT DEFAULT 'w'
    `);
    logger.info('[Database] V9 迁移完成');
  } catch (error) {
    logger.error('[Database] V9 迁移失败:', error);
  }
}

function migrateToV10(db: ReturnType<typeof getDatabase>): void {
  logger.info('[Database] 执行 V10 迁移: adminUsers 表重命名为 users');

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastLoginAt TEXT,
        sessionExpiryDays INTEGER DEFAULT 15,
        avatarUrl TEXT,
        deletedAt TEXT
      )
    `);

    const adminCount = safeCount(db, 'adminUsers');
    if (adminCount > 0) {
      db.exec(`
        INSERT INTO users (id, username, passwordHash, createdAt, updatedAt, lastLoginAt, sessionExpiryDays, avatarUrl, deletedAt)
        SELECT id, username, passwordHash, createdAt, updatedAt, NULL, sessionExpiryDays, NULL, deletedAt FROM adminUsers
      `);
      logger.info(`[Database] V10 迁移: 已迁移 ${adminCount} 条 adminUsers 数据到 users`);
    }

    db.exec('DROP TABLE IF EXISTS adminUsers');

    db.exec('CREATE INDEX IF NOT EXISTS idx_users_deletedAt ON users(deletedAt)');

    logger.info('[Database] V10 迁移完成');
  } catch (error) {
    logger.error('[Database] V10 迁移失败:', error);
  }
}

function migrateToV11(db: ReturnType<typeof getDatabase>): void {
  logger.info('[Database] 执行 V11 迁移: 为 users 表添加 avatarUrl 字段');

  try {
    db.exec(`
      ALTER TABLE users ADD COLUMN avatarUrl TEXT
    `);
    logger.info('[Database] V11 迁移完成');
  } catch (error) {
    logger.error('[Database] V11 迁移失败:', error);
  }
}

function migrateToV12(db: ReturnType<typeof getDatabase>): void {
  logger.info('[Database] 执行 V12 迁移: 创建 task_journal 表');

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_journal (
        id TEXT PRIMARY KEY,
        itemId TEXT NOT NULL,
        itemTitle TEXT NOT NULL,
        status TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        dataPreview TEXT,
        errorMessage TEXT,
        startAt TEXT NOT NULL,
        endAt TEXT,
        read INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_task_journal_itemId ON task_journal(itemId)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_task_journal_status ON task_journal(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_task_journal_read ON task_journal(read)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_task_journal_createdAt ON task_journal(createdAt)');

    logger.info('[Database] V12 迁移完成');
  } catch (error) {
    logger.error('[Database] V12 迁移失败:', error);
  }
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<{
  items: number;
  chatHistories: number;
  messages: number;
}> {
  const { getDatabaseAsync } = await import('./connection');
  const db = await getDatabaseAsync();

  const items = safeCount(db, 'items', 'deletedAt IS NULL');
  const chatHistories = safeCount(db, 'chatHistories', 'deletedAt IS NULL');
  const messages = safeCount(db, 'messages');

  return { items, chatHistories, messages };
}

/**
 * 清空所有数据（保留表结构）
 */
export async function clearAllData(): Promise<void> {
  const { getDatabaseAsync } = await import('./connection');
  const db = await getDatabaseAsync();

  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM chatHistories');
  db.exec('DELETE FROM episodes');
  db.exec('DELETE FROM seasons');
  db.exec('DELETE FROM items');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM config');

  logger.info('[Database] 所有数据已清空');
}

/**
 * 初始化默认配置
 * 在全新安装时插入设置页面所需的默认配置
 */
function initializeDefaultConfig(db: ReturnType<typeof getDatabase>): void {
  const now = new Date().toISOString();

  // 设置页面所需的默认配置
  const defaultConfigs = [
    // TMDB-Import 工具路径配置
    {
      key: 'server_config',
      value: JSON.stringify({
        version: '1.0.0',
        lastUpdated: Date.now(),
        // TMDB-Import 工具路径（空字符串表示未配置）
        tmdbImportPath: '',
        // 硅基流动 API 配置
        siliconFlowApiKey: '',
        siliconFlowThumbnailModel: 'Qwen/Qwen2.5-VL-32B-Instruct',
        siliconFlowApiSettings: '',
        // 魔搭社区 API 配置
        modelScopeApiKey: '',
        modelScopeEpisodeModel: 'Qwen/Qwen3-32B',
        modelScopeApiSettings: '',
        // 视频缩略图设置
        videoThumbnailSettings: JSON.stringify({
          startTime: 300,
          threadCount: 4,
          outputFormat: 'jpg',
          thumbnailCount: 5,
          frameInterval: 30,
          keepOriginalResolution: true,
        }),
        // 分集生成器 API 提供商
        episodeGeneratorApiProvider: 'modelscope',
        // 分集生成器配置
        episode_generator_config: JSON.stringify({
          summaryLength: [180, 205],
          selectedStyles: ['ai_free'],
          selectedTitleStyle: 'location_skill',
          temperature: 0.7,
          includeOriginalTitle: true,
          speechRecognitionModel: 'FunAudioLLM/SenseVoiceSmall',
          enableVideoAnalysis: false,
        }),
        // 同步状态
        sync_status: JSON.stringify({
          lastSyncTime: new Date().toISOString(),
          clientVersion: 0,
          serverVersion: Date.now(),
          conflictCount: 0,
          syncInProgress: false,
        }),
        // 布局偏好
        layout_preferences: JSON.stringify({
          layoutType: 'sidebar',
          sidebarCollapsed: false,
          lastUpdated: new Date().toISOString(),
        }),
        // 外观设置
        appearanceSettings: JSON.stringify({
          theme: 'system',
          primaryColor: 'blue',
          compactMode: false,
          fontSize: 'medium',
          showAnimations: true,
          showTooltips: true,
          detailBackdropBlurEnabled: true,
          detailBackdropBlurIntensity: 'medium',
        }),
        // 通用设置（空，使用代码中的默认值）
        generalSettings: '',
      }),
    },
    // 通用设置（单独存储，兼容 ClientConfigManager）
    {
      key: 'general_settings',
      value: JSON.stringify({
        useProxy: false,
        proxyUrl: '',
        detailBackdropBlurEnabled: true,
        detailBackdropBlurIntensity: 'medium',
      }),
    },
    // 外观设置（单独存储，兼容 ClientConfigManager）
    {
      key: 'appearance_settings',
      value: JSON.stringify({
        theme: 'system',
        primaryColor: 'blue',
        compactMode: false,
        fontSize: 'medium',
        showAnimations: true,
        showTooltips: true,
        detailBackdropBlurEnabled: true,
        detailBackdropBlurIntensity: 'medium',
      }),
    },
    // 视频缩略图设置（单独存储，兼容 ClientConfigManager）
    {
      key: 'video_thumbnail_settings',
      value: JSON.stringify({
        startTime: 0,
        threadCount: 2,
        outputFormat: 'jpg',
        thumbnailCount: 9,
        frameInterval: 30,
        keepOriginalResolution: true,
      }),
    },
    // TMDB-Import 工具路径（单独存储，兼容 ClientConfigManager）
    {
      key: 'tmdb_import_path',
      value: '',
    },
  ];

  // 插入默认配置
  const stmt = db.prepare(
    'INSERT INTO config (key, value, createdAt, updatedAt) VALUES (@key, @value, @createdAt, @updatedAt) ON CONFLICT(key) DO NOTHING'
  );

  for (const config of defaultConfigs) {
    try {
      stmt.run({
        key: config.key,
        value: config.value,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      logger.warn(`[Database] 初始化配置失败: ${config.key}`, error);
    }
  }

  logger.info(`[Database] 默认配置初始化完成，共 ${defaultConfigs.length} 项`);
}
