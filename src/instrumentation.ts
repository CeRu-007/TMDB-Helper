/**
 * Next.js Instrumentation Hook
 * 在应用启动时执行，用于初始化数据库
 */

export async function register() {
  // 只在服务器端执行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('@/lib/utils/logger');
    
    try {
      logger.info('[Instrumentation] 应用启动，初始化数据库...');
      
      // 初始化数据库 Schema
      const { initializeSchema } = await import('@/lib/database/schema');
      initializeSchema();
      
      // 执行 JSON 到 SQLite 的迁移（如果需要）
      const { checkAndMigrate } = await import('@/lib/database/migrations/json-to-sqlite');
      await checkAndMigrate();
      
      // 初始化认证系统（从环境变量创建默认管理员）
      const { AuthManager } = await import('@/lib/auth/auth-manager');
      await AuthManager.initializeFromEnv();
      
      logger.info('[Instrumentation] 数据库初始化完成');
    } catch (error) {
      logger.error('[Instrumentation] 数据库初始化失败:', error);
      // 不抛出错误，让应用继续启动
    }
  }
}
