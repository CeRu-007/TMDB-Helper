import { NextRequest, NextResponse } from 'next/server'
import { ServerConfigManager, ServerConfig } from '@/lib/data/server-config-manager'

// Configuration cache
let configCache: ServerConfig | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30000

// Key mapping for underscore to camelCase conversion
const KEY_MAPPING: Record<string, keyof ServerConfig> = {
  'tmdb_api_key': 'tmdbApiKey',
  'tmdb_import_path': 'tmdbImportPath',
  'siliconflow_api_key': 'siliconFlowApiKey',
  'siliconflow_thumbnail_model': 'siliconFlowThumbnailModel',
  'modelscope_api_key': 'modelScopeApiKey',
  'modelscope_episode_model': 'modelScopeEpisodeModel',
  'general_settings': 'generalSettings',
  'appearance_settings': 'appearanceSettings',
  'video_thumbnail_settings': 'videoThumbnailSettings',
  'siliconflow_api_settings': 'siliconFlowApiSettings',
  'modelscope_api_settings': 'modelScopeApiSettings',
  'episode_generator_api_provider': 'episodeGeneratorApiProvider',
  'task_scheduler_config': 'taskSchedulerConfig',
  'last_login_username': 'last_login_username',
  'last_login_remember_me': 'last_login_remember_me'
}

function mapKeyName(key: string): keyof ServerConfig {
  return KEY_MAPPING[key] || key as keyof ServerConfig
}

function clearCache(): void {
  configCache = null
  cacheTimestamp = 0
}

function getCachedConfig(): ServerConfig {
  const now = Date.now()

  if (configCache && now - cacheTimestamp < CACHE_TTL) {
    return configCache
  }

  configCache = ServerConfigManager.getConfig()
  cacheTimestamp = now
  return configCache
}

function maskSensitiveKeys(config: ServerConfig): ServerConfig {
  return {
    ...config,
    tmdbApiKey: undefined,
    siliconFlowApiKey: config.siliconFlowApiKey ? `${config.siliconFlowApiKey.substring(0, 8)}...` : undefined,
    modelScopeApiKey: config.modelScopeApiKey ? `${config.modelScopeApiKey.substring(0, 8)}...` : undefined
  }
}

/**
 * GET /api/system/config - 获取配置（管理员单用户）
 * 支持查询参数:
 * - key: 获取特定配置项
 * - info: 获取配置文件信息
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const info = searchParams.get('info')

    if (info === 'true') {
      const configInfo = ServerConfigManager.getConfigInfo()
      return NextResponse.json({ success: true, info: configInfo })
    }

    if (key) {
      const mappedKey = mapKeyName(key)
      const value = ServerConfigManager.getConfigItem(mappedKey)
      return NextResponse.json({ success: true, key, value })
    }

    const config = getCachedConfig()
    const safeConfig = maskSensitiveKeys(config)

    return NextResponse.json({
      success: true,
      config: safeConfig,
      fullConfig: config
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '获取配置失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 })
  }
}

/**
 * POST /api/system/config - 更新配置（管理员单用户）
 * 支持操作:
 * - update: 更新配置项
 * - reset: 重置为默认配置
 * - import: 导入配置
 * - export: 导出配置
 * - set: 设置单个配置项
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'update': {
        const { updates } = data
        if (!updates || typeof updates !== 'object') {
          return NextResponse.json({
            success: false,
            error: '缺少更新数据'
          }, { status: 400 })
        }

        const newConfig = ServerConfigManager.updateConfig(updates)
        clearCache()

        return NextResponse.json({
          success: true,
          message: '配置更新成功',
          config: newConfig
        })
      }

      case 'set': {
        const { key, value } = data

        if (!key) {
          return NextResponse.json({
            success: false,
            error: '缺少配置键名'
          }, { status: 400 })
        }

        ServerConfigManager.setConfigItem(mapKeyName(key), value)
        clearCache()

        return NextResponse.json({
          success: true,
          message: `配置项 ${key} 设置成功`
        })
      }

      case 'remove': {
        const { key } = data
        if (!key) {
          return NextResponse.json({
            success: false,
            error: '缺少配置键名'
          }, { status: 400 })
        }

        ServerConfigManager.removeConfigItem(mapKeyName(key))
        clearCache()

        return NextResponse.json({
          success: true,
          message: `配置项 ${key} 删除成功`
        })
      }

      case 'reset': {
        const defaultConfig = ServerConfigManager.resetToDefault()
        clearCache()

        return NextResponse.json({
          success: true,
          message: '配置已重置为默认值',
          config: defaultConfig
        })
      }

      case 'import': {
        const { configJson } = data
        if (!configJson) {
          return NextResponse.json({
            success: false,
            error: '缺少配置数据'
          }, { status: 400 })
        }

        const importedConfig = ServerConfigManager.importConfig(configJson)
        clearCache()

        return NextResponse.json({
          success: true,
          message: '配置导入成功',
          config: importedConfig
        })
      }

      case 'export': {
        const configJson = ServerConfigManager.exportConfig()
        return NextResponse.json({ success: true, configJson })
      }

      case 'migrate_from_localStorage': {
        return NextResponse.json({
          success: true,
          message: '迁移功能需要在前端执行，此端点仅用于测试',
          note: '实际迁移请使用前端的ConfigMigration类'
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: '不支持的操作: ' + action
        }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '配置操作失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 })
  }
}

/**
 * PUT /api/system/config - 完全替换配置
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const config = await request.json() as ServerConfig

    if (!config || typeof config !== 'object') {
      return NextResponse.json({
        success: false,
        error: '无效的配置数据'
      }, { status: 400 })
    }

    ServerConfigManager.saveConfig(config)
    clearCache()

    return NextResponse.json({
      success: true,
      message: '配置替换成功',
      config
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '替换配置失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key) {
      ServerConfigManager.removeConfigItem(key as keyof ServerConfig)
      return NextResponse.json({
        success: true,
        message: `配置项 ${key} 删除成功`
      })
    }

    const defaultConfig = ServerConfigManager.resetToDefault()

    return NextResponse.json({
      success: true,
      message: '配置已重置为默认值',
      config: defaultConfig
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '删除配置失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 })
  }
}
