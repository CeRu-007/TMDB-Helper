/**
 * 开发环境和 Electron 环境初始化逻辑
 * 只在 Node.js runtime 中执行
 */

import path from 'path';

export async function initializeDev() {
  const isElectron = process.env.ELECTRON_BUILD === 'true';
  const envName = isElectron ? 'Electron' : '开发';
  console.log(`[Instrumentation] ${envName}环境初始化开始...`);

  try {
    const dataDir = process.env.TMDB_DATA_DIR || path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'tmdb-helper.db');
    console.log('[Instrumentation] 数据库路径:', dbPath);

    const { initializeSchema } = await import('./lib/database/schema');
    initializeSchema();
    console.log('[Instrumentation] Schema 初始化完成');

    const { checkAndMigrate } = await import('./lib/database/migrations/json-to-sqlite');
    await checkAndMigrate();
    console.log('[Instrumentation] 数据迁移完成');

    const { AuthManager } = await import('./lib/auth/auth-manager');
    await AuthManager.initializeFromEnv();
    console.log('[Instrumentation] 认证系统初始化完成');

    const { scheduler } = await import('./lib/scheduler/scheduler');
    scheduler.initialize();
    console.log('[Instrumentation] 定时任务调度器初始化完成');

    console.log(`[Instrumentation] ${envName}环境所有初始化任务完成`);
  } catch (error) {
    console.error('[Instrumentation] 初始化失败:', error);
  }
}
