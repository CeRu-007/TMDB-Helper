const { spawn } = require('child_process');
const { createServer } = require('http');
const path = require('path');

const port = 3000;
let nextProcess = null;
let electronProcess = null;

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
  console.log('🧹 清理进程...');
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
    console.error('❌ 端口 3000 已被占用，请先关闭占用该端口的进程');
    process.exit(1);
  } else {
    console.log('✅ 端口 3000 可用');

    // 启动 Next.js 开发服务器
    console.log('🚀 启动 Next.js 开发服务器...');
    nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    nextProcess.on('error', (error) => {
      console.error('❌ Next.js 启动失败:', error);
      process.exit(1);
    });

    // 等待服务器启动
    try {
      console.log('⏳ 等待 Next.js 服务器启动...');
      await waitForServer(`http://localhost:${port}`);
      console.log('✅ Next.js 服务器已启动');
    } catch (error) {
      console.error('❌ Next.js 服务器启动超时:', error);
      process.exit(1);
    }
  }

  // 启动 Electron
  console.log('🚀 启动 Electron 应用...');
  electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_IS_DEV: '1'
    }
  });

  electronProcess.on('error', (error) => {
    console.error('❌ Electron 启动失败:', error);
    process.exit(1);
  });

  electronProcess.on('close', (code) => {
    console.log(`🚪 Electron 已退出，退出码: ${code}`);
    cleanup();
    process.exit(code);
  });
}

// 错误处理
process.on('SIGINT', () => {
  console.log('\n👋 收到 SIGINT 信号，正在退出...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 收到 SIGTERM 信号，正在退出...');
  cleanup();
  process.exit(0);
});

// 启动
startElectronDev().catch((error) => {
  console.error('❌ 启动失败:', error);
  cleanup();
  process.exit(1);
});
