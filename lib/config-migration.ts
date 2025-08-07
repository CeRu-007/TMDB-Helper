/**
 * 配置迁移工具
 * 帮助用户从localStorage迁移到服务端配置
 */

import { ClientConfigManager } from './client-config-manager'

export interface MigrationResult {
  success: boolean
  migratedKeys: string[]
  errors: string[]
  message: string
}

export class ConfigMigration {
  private static readonly MIGRATION_KEYS = [
    'tmdb_api_key',
    'tmdb_import_path',
    'siliconflow_api_key',
    'siliconflow_api_settings',
    'modelscope_api_key',
    'modelscope_api_settings',
    'general_settings',
    'appearance_settings',
    'video_thumbnail_settings',
    'task_scheduler_config',
    'episode_generator_api_provider'
  ]

  private static readonly MIGRATION_FLAG = 'config_migrated_to_server'

  /**
   * 检查是否需要迁移
   */
  static needsMigration(): boolean {
    if (typeof window === 'undefined') return false
    
    // 检查是否已经迁移过
    const migrated = localStorage.getItem(this.MIGRATION_FLAG)
    if (migrated === 'true') return false
    
    // 检查是否有需要迁移的数据
    return this.MIGRATION_KEYS.some(key => {
      const value = localStorage.getItem(key)
      return value !== null && value.trim() !== ''
    })
  }

  /**
   * 执行迁移
   */
  static async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedKeys: [],
      errors: [],
      message: ''
    }

    if (typeof window === 'undefined') {
      result.message = '迁移只能在浏览器环境中执行'
      return result
    }

    try {
      console.log('🔄 开始配置迁移...')
      
      // 收集需要迁移的数据
      const dataToMigrate: Record<string, string> = {}
      
      for (const key of this.MIGRATION_KEYS) {
        const value = localStorage.getItem(key)
        if (value !== null && value.trim() !== '') {
          dataToMigrate[key] = value
          console.log(`📦 发现需要迁移的配置: ${key}`)
        }
      }

      if (Object.keys(dataToMigrate).length === 0) {
        result.success = true
        result.message = '没有需要迁移的配置数据'
        this.markMigrationComplete()
        return result
      }

      // 批量迁移到服务端
      const migrationPromises = Object.entries(dataToMigrate).map(async ([key, value]) => {
        try {
          const success = await ClientConfigManager.setItem(key, value)
          if (success) {
            result.migratedKeys.push(key)
            console.log(`✅ 成功迁移配置: ${key}`)
          } else {
            result.errors.push(`迁移配置失败: ${key}`)
            console.error(`❌ 迁移配置失败: ${key}`)
          }
        } catch (error) {
          const errorMsg = `迁移配置 ${key} 时出错: ${error instanceof Error ? error.message : '未知错误'}`
          result.errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      })

      await Promise.all(migrationPromises)

      // 验证迁移结果
      const verificationPromises = result.migratedKeys.map(async (key) => {
        try {
          const serverValue = await ClientConfigManager.getItem(key)
          const localValue = dataToMigrate[key]
          
          if (serverValue !== localValue) {
            result.errors.push(`配置验证失败: ${key}`)
            console.error(`❌ 配置验证失败: ${key}`)
          } else {
            console.log(`✅ 配置验证成功: ${key}`)
          }
        } catch (error) {
          result.errors.push(`验证配置 ${key} 时出错`)
          console.error(`❌ 验证配置 ${key} 时出错:`, error)
        }
      })

      await Promise.all(verificationPromises)

      // 如果迁移成功，清理localStorage并标记迁移完成
      if (result.errors.length === 0) {
        this.cleanupLocalStorage()
        this.markMigrationComplete()
        result.success = true
        result.message = `成功迁移 ${result.migratedKeys.length} 个配置项到服务端`
        console.log('🎉 配置迁移完成！')
      } else {
        result.success = false
        result.message = `迁移过程中出现 ${result.errors.length} 个错误`
        console.error('❌ 配置迁移部分失败')
      }

    } catch (error) {
      result.success = false
      result.message = `迁移失败: ${error instanceof Error ? error.message : '未知错误'}`
      result.errors.push(result.message)
      console.error('❌ 配置迁移失败:', error)
    }

    return result
  }

  /**
   * 清理localStorage中的配置数据
   */
  private static cleanupLocalStorage(): void {
    console.log('🧹 清理localStorage中的配置数据...')
    
    for (const key of this.MIGRATION_KEYS) {
      try {
        localStorage.removeItem(key)
        console.log(`🗑️ 已清理localStorage配置: ${key}`)
      } catch (error) {
        console.warn(`⚠️ 清理localStorage配置失败: ${key}`, error)
      }
    }
  }

  /**
   * 标记迁移完成
   */
  private static markMigrationComplete(): void {
    try {
      localStorage.setItem(this.MIGRATION_FLAG, 'true')
      console.log('✅ 已标记迁移完成')
    } catch (error) {
      console.warn('⚠️ 标记迁移完成失败:', error)
    }
  }

  /**
   * 重置迁移状态（用于测试）
   */
  static resetMigrationFlag(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.MIGRATION_FLAG)
      console.log('🔄 已重置迁移状态')
    }
  }

  /**
   * 获取迁移状态
   */
  static getMigrationStatus(): {
    needsMigration: boolean
    hasLocalData: boolean
    migrationComplete: boolean
    localDataKeys: string[]
  } {
    if (typeof window === 'undefined') {
      return {
        needsMigration: false,
        hasLocalData: false,
        migrationComplete: true,
        localDataKeys: []
      }
    }

    const migrationComplete = localStorage.getItem(this.MIGRATION_FLAG) === 'true'
    const localDataKeys = this.MIGRATION_KEYS.filter(key => {
      const value = localStorage.getItem(key)
      return value !== null && value.trim() !== ''
    })
    
    const hasLocalData = localDataKeys.length > 0
    const needsMigration = hasLocalData && !migrationComplete

    return {
      needsMigration,
      hasLocalData,
      migrationComplete,
      localDataKeys
    }
  }

  /**
   * 自动迁移（在应用启动时调用）
   */
  static async autoMigrate(): Promise<void> {
    if (this.needsMigration()) {
      console.log('🔄 检测到需要迁移的配置，开始自动迁移...')
      const result = await this.migrate()
      
      if (result.success) {
        console.log('🎉 自动迁移成功:', result.message)
      } else {
        console.error('❌ 自动迁移失败:', result.message)
        console.error('错误详情:', result.errors)
      }
    }
  }
}
