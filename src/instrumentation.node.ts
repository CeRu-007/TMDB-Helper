import path from 'path';

export async function initializeDev() {
  const isElectron = process.env.ELECTRON_BUILD === 'true';
  const isDocker = process.env.DOCKER_CONTAINER === 'true';
  const envName = isElectron ? 'Electron' : isDocker ? 'Docker' : '开发';
  console.log(`[Instrumentation] ${envName}环境初始化开始...`);

  try {
    const dataDir = process.env.TMDB_DATA_DIR || path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'tmdb-helper.db');
    console.log('[Instrumentation] 数据库路径:', dbPath);

    const { getDatabaseAsync } = await import('./lib/database/connection');
    await getDatabaseAsync();
    console.log('[Instrumentation] 数据库连接已建立');

    const { initializeSchema } = await import('./lib/database/schema');
    await initializeSchema();
    console.log('[Instrumentation] Schema 初始化完成');

    const { checkAndMigrate } = await import('./lib/database/migrations/json-to-sqlite');
    await checkAndMigrate();
    console.log('[Instrumentation] 数据迁移完成');

    const { AuthService } = await import('./lib/auth/auth-service');
    if (!AuthService.hasAdmin()) {
      console.log('[Instrumentation] 认证系统未初始化，等待用户注册');
    } else {
      console.log('[Instrumentation] 认证系统已初始化');
    }

    const { scheduler } = await import('./lib/scheduler/scheduler');
    scheduler.initialize();
    console.log('[Instrumentation] 定时任务调度器初始化完成');

    console.log(`[Instrumentation] ${envName}环境所有初始化任务完成`);
  } catch (error) {
    console.error('[Instrumentation] 初始化失败:', error);
  }
}
