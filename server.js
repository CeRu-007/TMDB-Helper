const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

// 环境配置
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

// 桌面应用数据目录
const appDataDir = process.env.TMDB_DATA_DIR || path.join(process.cwd(), 'data');

// 确保数据目录存在
if (!fs.existsSync(appDataDir)) {
  fs.mkdirSync(appDataDir, { recursive: true });
}

// 设置环境变量，让应用知道数据目录位置
process.env.TMDB_DATA_DIR = appDataDir;

console.log(`🚀 启动 TMDB Helper 服务器`);
console.log(`📁 数据目录: ${appDataDir}`);
console.log(`🌐 环境: ${dev ? '开发' : '生产'}`);
console.log(`🔗 端口: ${port}`);

// 创建 Next.js 应用
const app = next({ 
  dev, 
  hostname, 
  port,
  // 桌面应用模式下的特殊配置
  conf: {
    // 禁用遥测
    telemetry: false,
    // 优化构建
    experimental: {
      outputStandalone: true
    }
  }
});

const handle = app.getRequestHandler();

// 启动服务器
app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      // 处理静态文件
      if (pathname.startsWith('/_next/static/') || pathname.startsWith('/static/')) {
        await handle(req, res, parsedUrl);
        return;
      }

      // 处理 API 路由
      if (pathname.startsWith('/api/')) {
        await handle(req, res, parsedUrl);
        return;
      }

      // 处理页面路由
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('服务器错误:', err.stack);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  })
  .once('error', (err) => {
    console.error('服务器启动失败:', err);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`✅ TMDB Helper 服务器已启动`);
    console.log(`🔗 访问地址: http://${hostname}:${port}`);
    console.log('ready'); // Electron 主进程会监听这个输出
  });
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  console.error('Promise:', promise);
});
