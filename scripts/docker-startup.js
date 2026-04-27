#!/usr/bin/env node

/**
 * Docker环境启动脚本
 * 确保在Docker容器中正确初始化所有优化功能
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

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
      // 确保目录权限为 777
      fs.chmodSync(dir, 0o777);
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

      // 尝试自动修复权限
      try {
        const { execSync } = require('child_process');
        // 检查当前用户
        const currentUser = execSync('whoami', { encoding: 'utf8' }).trim();
        log(`当前用户: ${currentUser}`);

        if (currentUser === 'root') {
          // root 用户，尝试修复权限
          execSync(`chmod -R 777 ${testPath}`, { stdio: 'ignore' });
          log(`已修复权限: ${testPath}`);

          // 重新检查
          try {
            const testFile = path.join(testPath, '.write_test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            results[testPath] = true;
            log(`权限修复成功: ${testPath}`);
          } catch (e2) {
            logError(`权限修复后仍失败: ${testPath}`, e2);
          }
        } else {
          log(`非 root 用户 (${currentUser})，无法自动修复权限`);
        }
      } catch (e) {
        logError(`自动修复权限失败`, e);
      }
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

      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

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

      CREATE INDEX IF NOT EXISTS idx_users_deletedAt ON users(deletedAt);
      CREATE INDEX IF NOT EXISTS idx_schedule_tasks_itemId ON schedule_tasks(itemId);
      CREATE INDEX IF NOT EXISTS idx_schedule_tasks_enabled ON schedule_tasks(enabled);
      CREATE INDEX IF NOT EXISTS idx_schedule_logs_taskId ON schedule_logs(taskId);
    `);

    const oldAdminUsersExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='adminUsers'").get();
    if (oldAdminUsersExists) {
      const adminCount = (db.prepare('SELECT COUNT(*) as count FROM adminUsers').get() || {}).count || 0;
      if (adminCount > 0) {
        const existingUserCount = (db.prepare('SELECT COUNT(*) as count FROM users WHERE deletedAt IS NULL').get() || {}).count || 0;
        if (existingUserCount === 0) {
          db.exec(`
            INSERT INTO users (id, username, passwordHash, createdAt, updatedAt, lastLoginAt, sessionExpiryDays, avatarUrl, deletedAt)
            SELECT id, username, passwordHash, createdAt, updatedAt, NULL, sessionExpiryDays, NULL, deletedAt FROM adminUsers
          `);
          log(`已迁移 ${adminCount} 条 adminUsers 数据到 users 表`);
        }
      }
      db.exec('DROP TABLE IF EXISTS adminUsers');
      log('已删除旧 adminUsers 表');
    }

    const oldAppConfigExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_config'").get();
    if (oldAppConfigExists) {
      const configCount = (db.prepare('SELECT COUNT(*) as count FROM app_config').get() || {}).count || 0;
      if (configCount > 0) {
        const existingConfigCount = (db.prepare('SELECT COUNT(*) as count FROM config').get() || {}).count || 0;
        if (existingConfigCount === 0) {
          db.exec('INSERT INTO config (key, value, createdAt, updatedAt) SELECT key, value, updatedAt, updatedAt FROM app_config');
          log(`已迁移 ${configCount} 条 app_config 数据到 config 表`);
        }
      }
      db.exec('DROP TABLE IF EXISTS app_config');
      log('已删除旧 app_config 表');
    }

    const oldUserSessionsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions'").get();
    if (oldUserSessionsExists) {
      db.exec('DROP TABLE IF EXISTS user_sessions');
      log('已删除旧 user_sessions 表');
    }

    const currentVersion = (db.prepare('PRAGMA user_version').get() || {}).user_version || 0;
    if (currentVersion < 11) {
      db.exec('PRAGMA user_version = 11');
      log('已设置数据库 Schema 版本为 11');
    }

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
    const existingAdmin = db.prepare('SELECT id FROM users WHERE deletedAt IS NULL LIMIT 1').get();
    if (existingAdmin) {
      log('管理员账户已存在，跳过创建');
      if (envUsername && envPassword) {
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(password, 12);
        db.prepare('UPDATE users SET username = ?, passwordHash = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL').run(username, passwordHash, new Date().toISOString(), existingAdmin.id);
        log('已更新管理员账户凭据');
      }
      return true;
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO users (id, username, passwordHash, createdAt, updatedAt, lastLoginAt, sessionExpiryDays, avatarUrl, deletedAt)
      VALUES (?, ?, ?, ?, ?, NULL, 15, NULL, NULL)
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

function setupPlaywrightChromium() {
  log('配置 Python Playwright 浏览器...');

  const systemChromiumPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/lib/chromium/chromium'
  ];

  let systemChromium = null;
  for (const p of systemChromiumPaths) {
    if (fs.existsSync(p)) {
      systemChromium = p;
      break;
    }
  }

  if (!systemChromium) {
    log('未找到系统 Chromium，跳过 Playwright 配置');
    return;
  }

  try {
    const browsersPath = execSync('python3 -c "import os; print(os.environ.get(\'PLAYWRIGHT_BROWSERS_PATH\', os.path.expanduser(\'~/.cache/ms-playwright\')))"', { encoding: 'utf8' }).trim();
    log(`Playwright 浏览器路径: ${browsersPath}`);

    if (!fs.existsSync(browsersPath)) {
      fs.mkdirSync(browsersPath, { recursive: true });
    }

    const entries = fs.readdirSync(browsersPath).filter(e => e.startsWith('chromium-'));
    let chromiumDir;

    if (entries.length > 0) {
      chromiumDir = path.join(browsersPath, entries[0]);
      log(`找到现有 Chromium 目录: ${chromiumDir}`);
    } else {
      try {
        const revision = execSync('python3 -c "from playwright._impl._api_structures import BrowserRevision; print(BrowserRevision.CHROMIUM)"', { encoding: 'utf8' }).trim();
        chromiumDir = path.join(browsersPath, `chromium-${revision}`);
      } catch {
        chromiumDir = path.join(browsersPath, 'chromium-1097');
      }
      fs.mkdirSync(path.join(chromiumDir, 'chrome-linux'), { recursive: true });
      log(`创建 Chromium 目录: ${chromiumDir}`);
    }

    const chromeLinuxDir = path.join(chromiumDir, 'chrome-linux');
    if (!fs.existsSync(chromeLinuxDir)) {
      fs.mkdirSync(chromeLinuxDir, { recursive: true });
    }

    const chromeLink = path.join(chromeLinuxDir, 'chrome');
    const chromiumLink = path.join(chromeLinuxDir, 'chromium');

    try {
      if (fs.existsSync(chromeLink) || fs.lstatSync(chromeLink).isSymbolicLink()) {
        fs.unlinkSync(chromeLink);
      }
    } catch {}
    try {
      if (fs.existsSync(chromiumLink) || fs.lstatSync(chromiumLink).isSymbolicLink()) {
        fs.unlinkSync(chromiumLink);
      }
    } catch {}

    fs.symlinkSync(systemChromium, chromeLink);
    fs.symlinkSync(systemChromium, chromiumLink);

    log(`已链接系统 Chromium (${systemChromium}) -> ${chromeLink}`);

    try {
      execSync(`chmod -R 777 ${browsersPath}`, { stdio: 'ignore' });
    } catch {}

    log('Python Playwright 浏览器配置完成');
  } catch (error) {
    logError('配置 Python Playwright 浏览器失败', error);
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

    setupPlaywrightChromium();

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
  setupPlaywrightChromium,
  main
};