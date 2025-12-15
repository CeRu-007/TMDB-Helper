/**
 * 迁移助手
 * 用于帮助用户从旧版本迁移到新版本
 */

import { SecureConfigManager } from './secure-config-manager';

export class MigrationHelper {
  private static readonly MIGRATION_KEY = 'tmdb_migration_status';
  private static readonly CURRENT_VERSION = '1.0.0';

  /**
   * 检查是否需要迁移
   */
  static needsMigration(): boolean {
    if (typeof window === 'undefined') return false;

    const migrationStatus = localStorage.getItem(this.MIGRATION_KEY);
    return !migrationStatus || migrationStatus !== this.CURRENT_VERSION;
  }

  /**
   * 执行迁移
   */
  static async performMigration(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // 1. 迁移API密钥
      await this.migrateApiKey();

      // 2. 清理旧的缓存数据
      await this.cleanupOldCache();

      // 3. 标记迁移完成
      localStorage.setItem(this.MIGRATION_KEY, this.CURRENT_VERSION);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 迁移API密钥
   */
  private static async migrateApiKey(): Promise<void> {
    try {
      // 检查是否存在旧的API密钥
      const oldApiKey = localStorage.getItem('tmdb_api_key');

      if (oldApiKey && !SecureConfigManager.hasConfig()) {
        // 验证API密钥格式
        if (SecureConfigManager.validateApiKey(oldApiKey)) {
          SecureConfigManager.setTmdbApiKey(oldApiKey);
          localStorage.removeItem('tmdb_api_key');
        } else {
        }
      }
    } catch (error) {}
  }

  /**
   * 清理旧的缓存数据
   */
  private static async cleanupOldCache(): Promise<void> {
    try {
      const keysToRemove: string[] = [];

      // 遍历localStorage查找需要清理的旧缓存
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          // 清理旧的TMDB缓存（如果格式已更改）
          if (
            key.startsWith('tmdb_old_') ||
            key.startsWith('deprecated_') ||
            key.includes('_legacy_')
          ) {
            keysToRemove.push(key);
          }
        }
      }

      // 删除标记的键
      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      });

      if (keysToRemove.length > 0) {
      }
    } catch (error) {}
  }

  /**
   * 获取迁移状态
   */
  static getMigrationStatus(): {
    isCompleted: boolean;
    version: string | null;
    needsMigration: boolean;
  } {
    if (typeof window === 'undefined') {
      return {
        isCompleted: true,
        version: this.CURRENT_VERSION,
        needsMigration: false,
      };
    }

    const migrationStatus = localStorage.getItem(this.MIGRATION_KEY);
    const needsMigration = this.needsMigration();

    return {
      isCompleted: !needsMigration,
      version: migrationStatus,
      needsMigration,
    };
  }

  /**
   * 重置迁移状态（用于测试或强制重新迁移）
   */
  static resetMigrationStatus(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.MIGRATION_KEY);
    }
  }

  /**
   * 自动迁移（在应用启动时调用）
   */
  static async autoMigrate(): Promise<void> {
    if (this.needsMigration()) {
      try {
        await this.performMigration();
      } catch (error) {
        // 不抛出错误，避免阻塞应用启动
      }
    }
  }
}

// 在浏览器环境中自动执行迁移
if (typeof window !== 'undefined') {
  // 延迟执行，避免阻塞页面加载
  setTimeout(() => {
    MigrationHelper.autoMigrate().catch((error) => {});
  }, 1000);
}
