import path from 'path';
import crypto from 'crypto';
import { LogLevel } from '@/lib/utils/logger';
import { FileTransport } from '@/lib/utils/file-transport';
import { setFileTransport, logger as rootLogger } from '@/lib/utils/logger';

function initFileTransport(dataDir: string): void {
  const logDir = path.join(dataDir, 'logs');
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
    initFileTransport(dataDir);

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
      rootLogger.info('[Instrumentation] 认证系统未初始化，等待用户注册');

      // Docker 环境：从环境变量创建管理员（在 schema 初始化之后执行，确保表结构完整）
      if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
        try {
          const bcrypt = await import('bcryptjs');
          const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
          const now = new Date().toISOString();
          const id = crypto.randomUUID();

          const { userRepository } = await import('./lib/database/repositories/auth.repository');
          const result = userRepository.createUser({
            id,
            username: process.env.ADMIN_USERNAME,
            passwordHash,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: undefined,
            sessionExpiryDays: 15,
            avatarUrl: undefined,
            loginCount: 1,
            totalUsageTime: 0,
          });

          if (result.success) {
            rootLogger.info(`[Instrumentation] 管理员账户已从环境变量创建: ${process.env.ADMIN_USERNAME}`);
          } else {
            rootLogger.error('[Instrumentation] 从环境变量创建管理员失败:', result.error);
          }
        } catch (err) {
          rootLogger.error('[Instrumentation] 管理员创建过程异常:', err);
        }
      }
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
