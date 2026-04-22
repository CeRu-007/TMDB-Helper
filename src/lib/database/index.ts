/**
 * 数据库模块统一导出
 */

// 连接管理
export { 
  getDatabase, 
  getDatabaseAsync, 
  initDatabaseModule,
  closeDatabase, 
  isDatabaseInitialized, 
  isDatabaseInitializedAsync,
  getDatabasePath, 
  transaction, 
  batchInsert, 
  checkDatabaseHealth,
  checkDatabaseHealthAsync
} from './connection';

// Schema
export { initializeSchema, getDatabaseStats, clearAllData, SCHEMA_VERSION } from './schema';

// 类型
export type {
  ItemRow,
  SeasonRow,
  EpisodeRow,
  ChatHistoryRow,
  MessageRow,
  AdminUserRow,
  ItemWithRelations,
  DatabaseResult,
  ExportData,
  MigrationStatus,
} from './types';
export { tmdbItemToRow, rowToTMDBItem } from './types';

// Repositories
export { BaseRepository } from './repositories/base.repository';
export { ItemsRepository, itemsRepository } from './repositories/items.repository';
export { ChatRepository, chatRepository } from './repositories/chat.repository';
export { AuthRepository, authRepository, type AdminUser } from './repositories/auth.repository';
export { ConfigRepository, configRepository } from './repositories/config.repository';

// Services (推荐使用)
export { cacheManager, CacheKeys, CacheManager } from './services/cache.service';
export { itemsService, ItemsService } from './services/items.service';

// 初始化数据库（应用启动时调用）
export async function initializeDatabase(): Promise<void> {
  const { initializeSchema } = await import('./schema');
  await initializeSchema();
}
