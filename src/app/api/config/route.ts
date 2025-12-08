import { NextRequest, NextResponse } from 'next/server'
import { ServerConfigManager, ServerConfig } from '@/lib/server-config-manager'

// 配置缓存机制
let configCache: ServerConfig | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30000 // 30秒缓存时间

/**
 * 键名映射：将前端使用的下划线命名转换为服务端的驼峰命名
 */
function mapKeyName(key: string): keyof ServerConfig {
  const keyMapping: Record<string, keyof ServerConfig> = {
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
    'task_scheduler_config': 'taskSchedulerConfig'
  }

  return keyMapping[key] || key as keyof ServerConfig
}

/**
 * GET /api/config - 获取配置（管理员单用户）
 * 支持查询参数:
 * - key: 获取特定配置项
 * - info: 获取配置文件信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const info = searchParams.get('info')

    if (info === 'true') {
      // 返回配置文件信息
      const configInfo = ServerConfigManager.getConfigInfo()
      return NextResponse.json({
        success: true,
        info: configInfo
      })
    }

    if (key) {
      // 获取映射后的键名
      const mappedKey = mapKeyName(key)

      // 获取特定配置项
      const value = ServerConfigManager.getConfigItem(mappedKey)
      return NextResponse.json({
        success: true,
        key,
        value
      })
    }

    // 获取完整配置（使用缓存机制）
    let config: ServerConfig
    const now = Date.now()
    
    if (configCache && now - cacheTimestamp < CACHE_TTL) {
      // 使用缓存
      config = configCache
    } else {
      // 重新获取并更新缓存
      config = ServerConfigManager.getConfig()
      configCache = config
      cacheTimestamp = now
    }

    // 移除敏感信息的显示（但保留功能）
    const safeConfig = {
      ...config,
      // 不完全隐藏，但显示部分信息用于验证
      tmdbApiKey: config.tmdbApiKey ? `${config.tmdbApiKey.substring(0, 8)}...` : undefined,
      siliconFlowApiKey: config.siliconFlowApiKey ? `${config.siliconFlowApiKey.substring(0, 8)}...` : undefined,
      modelScopeApiKey: config.modelScopeApiKey ? `${config.modelScopeApiKey.substring(0, 8)}...` : undefined
    }

    return NextResponse.json({
      success: true,
      config: safeConfig,
      fullConfig: config // 完整配置用于前端使用
    })
  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: '获取配置失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 })
  }
}

/**
 * POST /api/config - 更新配置（管理员单用户）
 * 支持操作:
 * - update: 更新配置项
 * - reset: 重置为默认配置
 * - import: 导入配置
 * - export: 导出配置
 * - set: 设置单个配置项
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'update': {
        // 更新配置
        const { updates } = data
        if (!updates || typeof updates !== 'object') {
          return NextResponse.json({
            success: false,
            error: '缺少更新数据'
          }, { status: 400 })
        }

        const newConfig = ServerConfigManager.updateConfig(updates)

        // 清除配置缓存
        configCache = null
        cacheTimestamp = 0

        return NextResponse.json({
          success: true,
          message: '配置更新成功',
          config: newConfig
        })
      }

      case 'set': {
        // 设置单个配置项
        const { key, value } = data
        
        // 🔧 修复：只在开发模式下输出详细日志
        if (process.env.NODE_ENV === 'development') {
          
        }
        
        if (!key) {
          
          return NextResponse.json({
            success: false,
            error: '缺少配置键名'
          }, { status: 400 })
        }

        // 获取映射后的键名
        const mappedKey = mapKeyName(key)
        
        if (process.env.NODE_ENV === 'development') {
          
        }
        
        try {
          ServerConfigManager.setConfigItem(mappedKey, value)
          
          // 🔧 修复：只在开发模式下输出成功日志
          if (process.env.NODE_ENV === 'development') {
            
          }
        } catch (error) {
          
          throw error
        }

        // 清除配置缓存
        configCache = null
        cacheTimestamp = 0

        return NextResponse.json({
          success: true,
          message: `配置项 ${key} 设置成功`
        })
      }
      
      case 'remove': {
        // 删除配置项
        const { key } = data
        if (!key) {
          return NextResponse.json({
            success: false,
            error: '缺少配置键名'
          }, { status: 400 })
        }

        // 获取映射后的键名
        const mappedKey = mapKeyName(key)
        ServerConfigManager.removeConfigItem(mappedKey)

        // 清除配置缓存
        configCache = null
        cacheTimestamp = 0

        return NextResponse.json({
          success: true,
          message: `配置项 ${key} 删除成功`
        })
      }

      case 'reset': {
        // 重置为默认配置
        const defaultConfig = ServerConfigManager.resetToDefault()

        // 清除配置缓存
        configCache = null
        cacheTimestamp = 0

        return NextResponse.json({
          success: true,
          message: '配置已重置为默认值',
          config: defaultConfig
        })
      }
      
      case 'import': {
        // 导入配置
        const { configJson } = data
        if (!configJson) {
          return NextResponse.json({
            success: false,
            error: '缺少配置数据'
          }, { status: 400 })
        }

        const importedConfig = ServerConfigManager.importConfig(configJson)

        // 清除配置缓存
        configCache = null
        cacheTimestamp = 0

        return NextResponse.json({
          success: true,
          message: '配置导入成功',
          config: importedConfig
        })
      }

      case 'export': {
        // 导出配置
        const configJson = ServerConfigManager.exportConfig()

        return NextResponse.json({
          success: true,
          configJson
        })
      }

      case 'migrate_from_localStorage': {
        // 手动迁移测试（仅用于演示）
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
 * PUT /api/config - 完全替换配置
 */
export async function PUT(request: NextRequest) {
  try {
    const config = await request.json() as ServerConfig

    if (!config || typeof config !== 'object') {
      return NextResponse.json({
        success: false,
        error: '无效的配置数据'
      }, { status: 400 })
    }

    ServerConfigManager.saveConfig(config)

    // 清除配置缓存
    configCache = null
    cacheTimestamp = 0

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

/**
 * DELETE /api/config - 删除配置文件
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key) {
      // 删除特定配置项
      ServerConfigManager.removeConfigItem(key as keyof ServerConfig)
      return NextResponse.json({
        success: true,
        message: `配置项 ${key} 删除成功`
      })
    }

    // 重置为默认配置（相当于删除自定义配置）
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
