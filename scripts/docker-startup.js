#!/usr/bin/env node

/**
 * Docker环境启动脚本
 * 职责（仅）:
 * 1. 检测是否为 Docker 环境
 * 2. 确保 /app/data, /app/logs 等目录存在
 * 3. 确保数据库文件存在（空文件，schema 由 schema.ts 管理）
 * 
 * 注意: 数据库表创建/迁移统一由 src/lib/database/schema.ts 管理
 *       管理员账户创建由 src/instrumentation.node.ts 在 schema 初始化后处理
 */

const fs = require('fs');
const path = require('path');

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

/**
 * 确保数据库文件存在（schema 初始化由 schema.ts 处理）
 * 仅创建空文件，不创建任何表
 */
function ensureDatabaseFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '');
    log(`创建数据库文件: ${DB_PATH}`);
  } else {
    log(`数据库文件已存在: ${DB_PATH}`);
  }

  // 验证文件可写
  try {
    fs.accessSync(DB_PATH, fs.constants.R_OK | fs.constants.W_OK);
    log('数据库文件读写权限正常');
  } catch (error) {
    logError('数据库文件权限异常', error);
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
    ensureDatabaseFile();

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
  ensureDatabaseFile,
  main
};
