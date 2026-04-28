#!/usr/bin/env node

/**
 * Docker环境启动脚本
 * 确保在Docker容器中正确初始化数据库和权限
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.TMDB_DATA_DIR || '/app/data';
const DB_PATH = path.join(DATA_DIR, 'tmdb-helper.db');

function log(message) {
  console.log(`[Docker Startup] ${message}`);
}

function logError(message, error) {
  console.error(`[Docker Startup] ${message}`, error?.message || error);
}

function detectDockerEnvironment() {
  const indicators = {
    dockerEnv: fs.existsSync('/.dockerenv'),
    containerEnv: process.env.DOCKER_CONTAINER === 'true',
    hostname: process.env.HOSTNAME && /^[a-f0-9]{12}$/.test(process.env.HOSTNAME),
    cgroup: false
  };

  try {
    if (fs.existsSync('/proc/1/cgroup')) {
      const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
      indicators.cgroup = cgroup.includes('docker') || cgroup.includes('containerd');
    }
  } catch (error) {
  }

  return Object.values(indicators).some(Boolean);
}

function ensureDirectories() {
  const directories = [DATA_DIR, '/app/logs'];

  directories.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log(`创建目录: ${dir}`);
      }
    } catch (error) {
      logError(`创建目录失败: ${dir}`, error);
    }
  });

  // 创建 Playwright 浏览器缓存目录
  const playwrightCacheDir = process.env.PLAYWRIGHT_BROWSERS_PATH || '/app/data/.cache/ms-playwright';
  try {
    if (!fs.existsSync(playwrightCacheDir)) {
      fs.mkdirSync(playwrightCacheDir, { recursive: true });
      log(`创建 Playwright 缓存目录: ${playwrightCacheDir}`);
    }
  } catch (error) {
    logError(`创建 Playwright 缓存目录失败: ${playwrightCacheDir}`, error);
  }
}

async function initializeDatabase() {
  log('开始初始化数据库...');
  log(`数据库路径: ${DB_PATH}`);

  let Database;

  try {
    Database = require('node:sqlite').DatabaseSync;
    log('使用 node:sqlite (DatabaseSync)');
  } catch (e) {
    log('node:sqlite 不可用，尝试 better-sqlite3...');
    try {
      Database = require('better-sqlite3');
      log('使用 better-sqlite3');
    } catch (e2) {
      logError('无法加载 SQLite 模块', e2);
      return false;
    }
  }

  let db;
  try {
    db = new Database(DB_PATH);
    log('数据库连接成功');

    // 创建完整的 Schema（与 src/lib/database/schema.ts 保持一致）
    db.exec(`
      -- 媒体项目表
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
      );

      -- 季表
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
      );

      -- 分集表
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
      );

      -- AI聊天历史表
      CREATE TABLE IF NOT EXISTS chatHistories (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      );

      -- 消息表
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
      );

      -- 管理员用户表
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
      );

      -- 配置表
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      -- 图片缓存表
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
      );

      -- 定时任务表
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
      );

      -- 定时任务日志表
      CREATE TABLE IF NOT EXISTS schedule_logs (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        status TEXT NOT NULL,
        startAt TEXT NOT NULL,
        endAt TEXT,
        message TEXT NOT NULL,
        details TEXT,
        FOREIGN KEY (taskId) REFERENCES schedule_tasks(id) ON DELETE CASCADE
      );

      -- 索引
      CREATE INDEX IF NOT EXISTS idx_items_deletedAt ON items(deletedAt);
      CREATE INDEX IF NOT EXISTS idx_items_tmdbId ON items(tmdbId);
      CREATE INDEX IF NOT EXISTS idx_seasons_itemId ON seasons(itemId);
      CREATE INDEX IF NOT EXISTS idx_episodes_itemId ON episodes(itemId);
      CREATE INDEX IF NOT EXISTS idx_episodes_seasonId ON episodes(seasonId);
      CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId);
      CREATE INDEX IF NOT EXISTS idx_users_deletedAt ON users(deletedAt);
      CREATE INDEX IF NOT EXISTS idx_image_cache_tmdbId ON image_cache(tmdbId);
      CREATE INDEX IF NOT EXISTS idx_schedule_tasks_itemId ON schedule_tasks(itemId);
      CREATE INDEX IF NOT EXISTS idx_schedule_tasks_enabled ON schedule_tasks(enabled);
      CREATE INDEX IF NOT EXISTS idx_schedule_logs_taskId ON schedule_logs(taskId);
    `);

    log('数据库 Schema 初始化完成');
    return db;
  } catch (error) {
    logError('数据库初始化失败', error);
    return false;
  }
}

async function initializeAdminUser(db) {
  const envUsername = process.env.ADMIN_USERNAME;
  const envPassword = process.env.ADMIN_PASSWORD;

  // 如果没有配置环境变量，不自动创建管理员（与项目其他端保持一致，进入注册模式）
  if (!envUsername || !envPassword) {
    log('未配置 ADMIN_USERNAME 和 ADMIN_PASSWORD，跳过管理员自动创建');
    log('首次访问将进入注册模式');
    return true;
  }

  log('检测到管理员环境变量配置，开始初始化管理员账户...');

  try {
    const existingAdmin = db.prepare('SELECT id FROM users WHERE deletedAt IS NULL LIMIT 1').get();
    if (existingAdmin) {
      log('管理员账户已存在，更新凭据...');
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(envPassword, 12);
      db.prepare('UPDATE users SET username = ?, passwordHash = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL')
        .run(envUsername, passwordHash, new Date().toISOString(), existingAdmin.id);
      log('已更新管理员账户凭据');
      return true;
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(envPassword, 12);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO users (id, username, passwordHash, createdAt, updatedAt, lastLoginAt, sessionExpiryDays, avatarUrl, deletedAt)
      VALUES (?, ?, ?, ?, ?, NULL, 15, NULL, NULL)
    `).run(id, envUsername, passwordHash, now, now);

    log('========================================');
    log('🚀 TMDB Helper 管理员账户已创建!');
    log('📋 管理员账号信息:');
    log(`   用户名: ${envUsername}`);
    log(`   密码: ${envPassword}`);
    log('⚠️  请首次登录后立即修改密码!');
    log('========================================');

    return true;
  } catch (error) {
    logError('管理员账户初始化失败', error);
    return false;
  }
}

async function main() {
  try {
    log('Docker 启动脚本开始执行...');

    const isDocker = detectDockerEnvironment();
    if (!isDocker) {
      log('非 Docker 环境，跳过初始化');
      return;
    }

    log('检测到 Docker 环境');

    ensureDirectories();

    const db = await initializeDatabase();
    if (db) {
      await initializeAdminUser(db);
      db.close();
      log('数据库初始化完成');
    }

    log('Docker 启动脚本执行完成');

  } catch (error) {
    logError('启动脚本执行失败', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    logError('未捕获的错误', error);
    process.exit(1);
  });
}

module.exports = {
  detectDockerEnvironment,
  ensureDirectories,
  initializeDatabase,
  initializeAdminUser,
  main
};
