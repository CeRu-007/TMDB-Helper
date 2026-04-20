const { spawn } = require('child_process');
const { createServer } = require('http');
const path = require('path');
const os = require('os');
const { logger } = require('./logger');

const port = 3000;
let nextProcess = null;
let electronProcess = null;

// 开发环境：使用项目目录下的 data 文件夹
const appDataDir = path.join(process.cwd(), 'data');

// 检查端口是否可用
function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

// 等待服务器启动
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function check() {
      const http = require('http');
      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(check, 1000);
        }
      });

      req.on('error', () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('服务器启动超时'));
        } else {
          setTimeout(check, 1000);
        }
      });
    }

    check();
  });
}

// 清理进程
function cleanup() {
  logger.info('🧹 清理进程...');
  if (nextProcess) {
    nextProcess.kill('SIGTERM');
    nextProcess = null;
  }
  if (electronProcess) {
    electronProcess.kill('SIGTERM');
    electronProcess = null;
  }
}

async function startElectronDev() {
  // 检查端口
  const isPortAvailable = await checkPort(port);
  if (!isPortAvailable) {
    logger.error('❌ 端口 3000 已被占用，请先关闭占用该端口的进程');
    process.exit(1);
  } else {
    logger.info('✅ 端口 3000 可用');
    logger.info(`📁 数据目录: ${appDataDir}`);

    // 启动 Next.js 开发服务器
    logger.info('🚀 启动 Next.js 开发服务器...');
    nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        ELECTRON_BUILD: 'true',
        TMDB_DATA_DIR: appDataDir
      }
    });

    nextProcess.on('error', (error) => {
      logger.error('❌ Next.js 启动失败:', error);
      process.exit(1);
    });

    // 等待服务器启动
    try {
      logger.info('⏳ 等待 Next.js 服务器启动...');
      await waitForServer(`http://localhost:${port}`);
      logger.info('✅ Next.js 服务器已启动');
    } catch (error) {
      logger.error('❌ Next.js 服务器启动超时:', error);
      process.exit(1);
    }
  }

  // 启动 Electron
  logger.info('🚀 启动 Electron 应用...');
  electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_IS_DEV: '1',
      ELECTRON_BUILD: 'true',
      TMDB_DATA_DIR: appDataDir
    }
  });

  electronProcess.on('error', (error) => {
    logger.error('❌ Electron 启动失败:', error);
    process.exit(1);
  });

  electronProcess.on('close', (code) => {
    logger.info(`🚪 Electron 已退出，退出码: ${code}`);
    cleanup();
    process.exit(code);
  });
}

// 错误处理
process.on('SIGINT', () => {
  logger.info('\n👋 收到 SIGINT 信号，正在退出...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n👋 收到 SIGTERM 信号，正在退出...');
  cleanup();
  process.exit(0);
});

// 启动
startElectronDev().catch((error) => {
  logger.error('❌ 启动失败:', error);
  cleanup();
  process.exit(1);
});
