const { spawn } = require('child_process');
const { createServer } = require('http');
const path = require('path');

const port = 3000;

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

async function startElectronDev() {
  
  // 检查端口
  const isPortAvailable = await checkPort(port);
  if (!isPortAvailable) {
    
  } else {
    
    // 启动 Next.js 开发服务器
    const nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });
    
    nextProcess.on('error', (error) => {
      
      process.exit(1);
    });
    
    // 等待服务器启动
    try {
      await waitForServer(`http://localhost:${port}`);
      
    } catch (error) {
      
      process.exit(1);
    }
  }

  // 启动 Electron
  const electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_IS_DEV: '1'
    }
  });
  
  electronProcess.on('error', (error) => {
    
    process.exit(1);
  });
  
  electronProcess.on('close', (code) => {
    
    process.exit(code);
  });
}

// 错误处理
process.on('SIGINT', () => {
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  
  process.exit(0);
});

// 启动
startElectronDev().catch((error) => {
  
  process.exit(1);
});
