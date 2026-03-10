/**
 * 数据库模块统一导出
 */

// 连接管理
export { getDatabase, closeDatabase, isDatabaseInitialized, getDatabasePath, transaction, batchInsert, checkDatabaseHealth } from './connection';

// Schema
export { initializeSchema, getDatabaseStats, clearAllData } from './schema';

// 类型
export type {
  ItemRow,
  SeasonRow,
  EpisodeRow,
  ScheduledTaskRow,
  ExecutionLogRow,
  ChatHistoryRow,
  MessageRow,
  AdminUserRow,
  ConfigRow,
  ItemWithRelations,
  DatabaseResult,
  ExportData,
  MigrationStatus,
} from './types';
export { tmdbItemToRow, rowToTMDBItem, scheduledTaskToRow, rowToScheduledTask } from './types';

// Repositories
export { BaseRepository } from './repositories/base.repository';
export { ItemsRepository, itemsRepository } from './repositories/items.repository';
export { TasksRepository, tasksRepository } from './repositories/tasks.repository';
export { ChatRepository, chatRepository } from './repositories/chat.repository';
export { AuthRepository, authRepository, type AdminUser } from './repositories/auth.repository';
export { ConfigRepository, configRepository } from './repositories/config.repository';

// 初始化数据库（应用启动时调用）
export function initializeDatabase(): void {
  const { initializeSchema } = require('./schema');
  initializeSchema();
}
