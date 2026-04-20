#!/usr/bin/env node

/**
 * Docker环境启动脚本
 * 确保在Docker容器中正确初始化所有优化功能
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

  const isDocker = Object.values(indicators).some(Boolean);

  return isDocker;
}

function ensureDirectories() {
  const directories = [
    DATA_DIR,
    '/app/logs',
    '/tmp'
  ];

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
}

function checkPermissions() {
  const testPaths = [DATA_DIR, '/app/logs'];

  const results = {};

  testPaths.forEach(testPath => {
    try {
      const testFile = path.join(testPath, '.write_test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      results[testPath] = true;
    } catch (error) {
      results[testPath] = false;
      logError(`权限检查失败: ${testPath}`, error);
    }
  });

  return results;
}

function setupEnvironment() {
  const dockerEnvVars = {
    DOCKER_CONTAINER: 'true',
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=1024',
    NEXT_TELEMETRY_DISABLED: '1'
  };

  Object.entries(dockerEnvVars).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
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

    db.exec(`
      CREATE TABLE IF NOT EXISTS adminUsers (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        sessionExpiryDays INTEGER DEFAULT 15,
        deletedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        adminUserId TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        FOREIGN KEY (adminUserId) REFERENCES adminUsers(id)
      );

      CREATE INDEX IF NOT EXISTS idx_admin_users_username ON adminUsers(username);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
    `);

    log('数据库 Schema 初始化完成');
    return db;
  } catch (error) {
    logError('数据库初始化失败', error);
    return false;
  }
}

async function initializeAdminUser(db) {
  log('开始初始化管理员账户...');

  const envUsername = process.env.ADMIN_USERNAME;
  const envPassword = process.env.ADMIN_PASSWORD;

  let username = envUsername || 'admin';
  let password = envPassword || 'admin';

  try {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.prepare('DELETE FROM adminUsers').run();
    log('已清除旧的管理员账户');

    db.prepare(`
      INSERT INTO adminUsers (id, username, passwordHash, createdAt, updatedAt, sessionExpiryDays, deletedAt)
      VALUES (?, ?, ?, ?, ?, 15, NULL)
    `).run(id, username, passwordHash, now, now);

    log('========================================');
    log('🚀 TMDB Helper 管理员账户已创建!');
    log('📋 管理员账号信息:');
    log(`   用户名: ${username}`);
    log(`   密码: ${password}`);
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

    setupEnvironment();
    ensureDirectories();

    const db = await initializeDatabase();
    if (db) {
      await initializeAdminUser(db);
      db.close();
      log('数据库初始化完成');
    }

    checkPermissions();

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
  checkPermissions,
  setupEnvironment,
  initializeDatabase,
  initializeAdminUser,
  main
};