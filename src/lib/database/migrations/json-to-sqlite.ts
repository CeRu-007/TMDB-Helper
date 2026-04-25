/**
 * JSON 数据到 SQLite 的自动迁移脚本
 * 在首次启动时自动检测并迁移旧数据
 */

import fs from 'fs';
import path from 'path';
import { getDatabase, isDatabaseInitialized, getDatabasePath } from '../connection';
import { initializeSchema, getDatabaseStats } from '../schema';
import { itemsRepository } from '../repositories/items.repository';
import { chatRepository } from '../repositories/chat.repository';
import { userRepository } from '../repositories/auth.repository';
import { configRepository } from '../repositories/config.repository';
import type { MigrationStatus, DatabaseResult } from '../types';
import { logger } from '@/lib/utils/logger';

// 旧数据文件路径
const OLD_DATA_PATHS = {
  items: [
    'users/user_admin_system/tmdb_items.json',
    'tmdb_items.json', // 旧版兼容
  ],
  tasks: [], // 任务迁移已移除
  chat: ['ai-chat/chat-histories.json'],
  auth: ['auth/admin.json'],
  config: ['server-config.json', 'model-service.json'],
};

/**
 * 检查是否需要迁移
 */
export function needsMigration(): boolean {
  // 数据库未初始化
  if (!isDatabaseInitialized()) {
    return hasOldDataFiles();
  }

  // 数据库已初始化但无数据
  const stats = getDatabaseStats();
  if (stats.items === 0 && hasOldDataFiles()) {
    return true;
  }

  return false;
}

/**
 * 获取数据目录路径
 */
function getDataDir(): string {
  return process.env.TMDB_DATA_DIR || path.join(process.cwd(), 'data');
}

/**
 * 检查是否存在旧数据文件
 */
function hasOldDataFiles(): boolean {
  const dataDir = getDataDir();

  for (const files of Object.values(OLD_DATA_PATHS)) {
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      if (fs.existsSync(filePath)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 执行迁移
 */
export async function migrateFromJson(): Promise<MigrationStatus> {
  const dataDir = getDataDir();
  let itemCount = 0;

  try {
    // 初始化 Schema
    initializeSchema();

    // 迁移项目数据
    const itemsResult = await migrateItems(dataDir);
    if (itemsResult.success) {
      itemCount = itemsResult.data?.imported ?? 0;
    }

    // 迁移聊天历史
    await migrateChatHistories(dataDir);

    // 迁移认证数据
    await migrateAuth(dataDir);

    // 迁移配置数据
    await migrateConfig(dataDir);

    // 重命名旧文件为备份
    backupOldFiles(dataDir);

    logger.info(`[Migration] 迁移完成: ${itemCount} 个项目`);

    return {
      migrated: true,
      itemCount,
    };
  } catch (error) {
    logger.error('[Migration] 迁移失败:', error);
    return {
      migrated: false,
      itemCount: 0,
      error: error instanceof Error ? error.message : '迁移失败',
    };
  }
}

/**
 * 迁移项目数据
 */
async function migrateItems(dataDir: string): Promise<DatabaseResult<{ imported: number; skipped: number }>> {
  for (const filePath of OLD_DATA_PATHS.items) {
    const fullPath = path.join(dataDir, filePath);

    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const items = JSON.parse(content);

        if (Array.isArray(items) && items.length > 0) {
          logger.info(`[Migration] 发现 ${items.length} 个项目待迁移: ${filePath}`);

          // 验证和清理数据
          const validItems = items.filter((item) => {
            return item && item.id && item.title && item.mediaType;
          });

          // 补充缺失字段
          for (const item of validItems) {
            if (!item.createdAt) {
              item.createdAt = new Date().toISOString();
            }
            if (!item.updatedAt) {
              item.updatedAt = new Date().toISOString();
            }
          }

          return itemsRepository.importItems(validItems);
        }
      } catch (error) {
        logger.error(`[Migration] 读取项目数据失败: ${filePath}`, error);
      }
    }
  }

  return { success: true, data: { imported: 0, skipped: 0 } };
}

/**
 * 迁移任务数据
 */
/**
 * 迁移聊天历史
 */
async function migrateChatHistories(dataDir: string): Promise<void> {
  for (const filePath of OLD_DATA_PATHS.chat) {
    const fullPath = path.join(dataDir, filePath);

    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const histories = JSON.parse(content);

        if (Array.isArray(histories) && histories.length > 0) {
          logger.info(`[Migration] 发现 ${histories.length} 个聊天历史待迁移: ${filePath}`);

          for (const history of histories) {
            if (history && history.id && history.title) {
              // 转换日期格式
              if (typeof history.createdAt === 'string') {
                history.createdAt = new Date(history.createdAt);
              }
              if (typeof history.updatedAt === 'string') {
                history.updatedAt = new Date(history.updatedAt);
              }
              if (history.messages) {
                for (const msg of history.messages) {
                  if (typeof msg.timestamp === 'string') {
                    msg.timestamp = new Date(msg.timestamp);
                  }
                }
              }

              chatRepository.createHistory(history);
            }
          }
        }
      } catch (error) {
        logger.error(`[Migration] 读取聊天历史失败: ${filePath}`, error);
      }
    }
  }
}

/**
 * 迁移认证数据
 */
async function migrateAuth(dataDir: string): Promise<void> {
  for (const filePath of OLD_DATA_PATHS.auth) {
    const fullPath = path.join(dataDir, filePath);

    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const admin = JSON.parse(content);

        if (admin && admin.id && admin.username) {
          logger.info(`[Migration] 迁移管理员数据: ${filePath}`);
          userRepository.upsertAdmin({
            id: admin.id,
            username: admin.username,
            passwordHash: admin.passwordHash,
            createdAt: admin.createdAt,
            lastLoginAt: admin.lastLoginAt,
            sessionExpiryDays: admin.sessionExpiryDays ?? 7,
          });
        }
      } catch (error) {
        logger.error(`[Migration] 读取认证数据失败: ${filePath}`, error);
      }
    }
  }
}

/**
 * 迁移配置数据
 */
async function migrateConfig(dataDir: string): Promise<void> {
  const configFiles: Record<string, string> = {
    'server-config.json': 'server_config',
    'model-service.json': 'model_service_config',
  };

  for (const [filePath, configKey] of Object.entries(configFiles)) {
    const fullPath = path.join(dataDir, filePath);

    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const config = JSON.parse(content);

        logger.info(`[Migration] 迁移配置数据: ${filePath}`);
        await configRepository.set(configKey, config);
      } catch (error) {
        logger.error(`[Migration] 读取配置数据失败: ${filePath}`, error);
      }
    }
  }
}

/**
 * 备份旧文件
 */
function backupOldFiles(dataDir: string): void {
  const timestamp = Date.now();

  for (const files of Object.values(OLD_DATA_PATHS)) {
    for (const file of files) {
      const fullPath = path.join(dataDir, file);

      if (fs.existsSync(fullPath)) {
        const backupPath = `${fullPath}.migrated.${timestamp}`;
        try {
          fs.renameSync(fullPath, backupPath);
          logger.info(`[Migration] 已备份: ${file} -> ${path.basename(backupPath)}`);
        } catch (error) {
          // 如果重命名失败，尝试复制
          try {
            fs.copyFileSync(fullPath, backupPath);
            logger.info(`[Migration] 已复制备份: ${file} -> ${path.basename(backupPath)}`);
          } catch {
            logger.error(`[Migration] 备份失败: ${file}`);
          }
        }
      }
    }
  }
}

/**
 * 检查并执行迁移（应用启动时调用）
 */
export async function checkAndMigrate(): Promise<MigrationStatus> {
  if (!needsMigration()) {
    return {
      migrated: false,
      itemCount: getDatabaseStats().items,
    };
  }

  logger.info('[Migration] 检测到旧数据，开始迁移...');
  return migrateFromJson();
}
