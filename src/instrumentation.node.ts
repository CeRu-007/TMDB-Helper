import path from 'path';
import { LogLevel, getLogDir, setFileTransport, logger as rootLogger } from '@/lib/utils/logger';
import { FileTransport } from '@/lib/utils/file-transport';

function initFileTransport(): void {
  const logDir = getLogDir();
  const transport = new FileTransport({
    logDir,
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
    level: LogLevel.DEBUG,
  });
  setFileTransport(transport);
  rootLogger.info('FileTransport', `文件日志已初始化: ${logDir}`);
}

export async function initializeDev() {
  const isElectron = process.env.ELECTRON_BUILD === 'true';
  const isDocker = process.env.DOCKER_CONTAINER === 'true';
  const envName = isElectron ? 'Electron' : isDocker ? 'Docker' : '开发';
  rootLogger.info(`[Instrumentation] ${envName}环境初始化开始...`);

  try {
    const dataDir = process.env.TMDB_DATA_DIR || path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'tmdb-helper.db');
    rootLogger.info('[Instrumentation] 数据库路径:', dbPath);
    initFileTransport();

    const { getDatabaseAsync } = await import('./lib/database/connection');
    await getDatabaseAsync();
    rootLogger.info('[Instrumentation] 数据库连接已建立');

    const { initializeSchema } = await import('./lib/database/schema');
    await initializeSchema();
    rootLogger.info('[Instrumentation] Schema 初始化完成');

    const { checkAndMigrate } = await import('./lib/database/migrations/json-to-sqlite');
    await checkAndMigrate();
    rootLogger.info('[Instrumentation] 数据迁移完成');

    const { AuthService } = await import('./lib/auth/auth-service');
    if (!AuthService.hasAdmin()) {
      rootLogger.info('[Instrumentation] 认证系统未初始化，等待用户在登录页注册管理员');
    } else {
      rootLogger.info('[Instrumentation] 认证系统已初始化');
    }

    const { scheduler } = await import('./lib/scheduler/scheduler');
    scheduler.initialize();
    rootLogger.info('[Instrumentation] 定时任务调度器初始化完成');

    rootLogger.info(`[Instrumentation] ${envName}环境所有初始化任务完成`);
  } catch (error) {
    rootLogger.error('[Instrumentation] 初始化失败:', error);
  }
}
