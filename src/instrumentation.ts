/**
 * Next.js Instrumentation Hook
 * 在应用启动时执行，用于初始化数据库
 * 
 * 注意：Docker 环境下的初始化由 docker-startup.js 处理
 * 这里只处理开发环境
 */

export function register() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  if (process.env.DOCKER_CONTAINER === 'true') {
    return;
  }

  // 动态加载 Node.js 初始化模块
  // 使用 require 而不是 import，避免 Edge Runtime 静态分析
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initializeDev } = require('./instrumentation.node');
  return initializeDev();
}
