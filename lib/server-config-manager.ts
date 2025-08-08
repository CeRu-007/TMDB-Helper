import fs from 'fs'
import path from 'path'

/**
 * 服务端配置接口
 */
export interface ServerConfig {
  // TMDB相关配置
  tmdbApiKey?: string
  tmdbImportPath?: string
  
  // 硅基流动API配置
  siliconFlowApiKey?: string
  siliconFlowThumbnailModel?: string
  
  // 魔搭社区API配置
  modelScopeApiKey?: string
  modelScopeEpisodeModel?: string
  
  // 通用设置
  generalSettings?: any
  appearanceSettings?: any
  videoThumbnailSettings?: any
  taskSchedulerConfig?: any
  
  // 元数据
  lastUpdated?: number
  version?: string
}

/**
 * 服务端配置管理器
 * 负责在服务端存储和管理所有配置信息
 */
export class ServerConfigManager {
  private static readonly CONFIG_FILE = 'server-config.json'
  private static readonly CONFIG_VERSION = '1.0.0'
  
  /**
   * 获取配置文件路径
   */
  private static getConfigPath(): string {
    // 检查是否在Docker环境中
    const isDocker = process.env.DOCKER_CONTAINER === 'true'

    // Docker环境和开发环境都使用data文件夹
    // Docker环境中，data文件夹会被挂载到宿主机
    const dataDir = path.join(process.cwd(), 'data')

    // 确保data目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
      console.log(`📁 创建配置目录: ${dataDir} ${isDocker ? '(Docker环境)' : '(开发环境)'}`)
    }

    const configPath = path.join(dataDir, this.CONFIG_FILE)
    console.log(`📍 配置文件路径: ${configPath} ${isDocker ? '(Docker环境)' : '(开发环境)'}`)

    return configPath
  }
  
  /**
   * 获取默认配置
   */
  private static getDefaultConfig(): ServerConfig {
    return {
      version: this.CONFIG_VERSION,
      lastUpdated: Date.now(),
      siliconFlowThumbnailModel: 'Qwen/Qwen2.5-VL-32B-Instruct',
      modelScopeEpisodeModel: 'Qwen/Qwen3-32B'
    }
  }

  /**
   * 键名映射：将下划线命名转换为驼峰命名
   */
  private static mapKeys(rawConfig: any): ServerConfig {
    const keyMapping: Record<string, string> = {
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

    const mappedConfig: any = {}

    // 复制所有原始键
    Object.keys(rawConfig).forEach(key => {
      const mappedKey = keyMapping[key] || key
      mappedConfig[mappedKey] = rawConfig[key]
    })

    return mappedConfig as ServerConfig
  }

  /**
   * 读取配置
   */
  static getConfig(): ServerConfig {
    try {
      const configPath = this.getConfigPath()

      if (!fs.existsSync(configPath)) {
        // 如果配置文件不存在，创建默认配置
        const defaultConfig = this.getDefaultConfig()
        this.saveConfig(defaultConfig)
        return defaultConfig
      }

      const configData = fs.readFileSync(configPath, 'utf8')
      const rawConfig = JSON.parse(configData)

      // 映射键名
      const config = this.mapKeys(rawConfig)

      // 检查版本兼容性
      if (config.version !== this.CONFIG_VERSION) {
        console.log(`配置版本不匹配，从 ${config.version} 升级到 ${this.CONFIG_VERSION}`)
        const upgradedConfig = { ...this.getDefaultConfig(), ...config, version: this.CONFIG_VERSION }
        this.saveConfig(upgradedConfig)
        return upgradedConfig
      }

      return config
    } catch (error) {
      console.error('读取服务端配置失败:', error)
      const defaultConfig = this.getDefaultConfig()
      this.saveConfig(defaultConfig)
      return defaultConfig
    }
  }
  
  /**
   * 保存配置
   */
  static saveConfig(config: ServerConfig): void {
    try {
      const configPath = this.getConfigPath()
      
      // 备份现有配置
      if (fs.existsSync(configPath)) {
        const backupPath = `${configPath}.backup`
        fs.copyFileSync(configPath, backupPath)
      }
      
      // 更新时间戳和版本
      const configToSave = {
        ...config,
        version: this.CONFIG_VERSION,
        lastUpdated: Date.now()
      }
      
      // 保存配置
      fs.writeFileSync(configPath, JSON.stringify(configToSave, null, 2), 'utf8')
      console.log('服务端配置已保存:', configPath)
    } catch (error) {
      console.error('保存服务端配置失败:', error)
      throw new Error('保存配置失败')
    }
  }
  
  /**
   * 更新配置
   */
  static updateConfig(updates: Partial<ServerConfig>): ServerConfig {
    const currentConfig = this.getConfig()
    const newConfig = { ...currentConfig, ...updates }
    this.saveConfig(newConfig)
    return newConfig
  }
  
  /**
   * 获取特定配置项
   */
  static getConfigItem(key: keyof ServerConfig): any {
    const config = this.getConfig()
    return config[key]
  }
  
  /**
   * 设置特定配置项
   */
  static setConfigItem(key: keyof ServerConfig, value: any): void {
    const updates = { [key]: value } as Partial<ServerConfig>
    this.updateConfig(updates)
  }
  
  /**
   * 删除配置项
   */
  static removeConfigItem(key: keyof ServerConfig): void {
    const config = this.getConfig()
    delete config[key]
    this.saveConfig(config)
  }
  
  /**
   * 重置为默认配置
   */
  static resetToDefault(): ServerConfig {
    const defaultConfig = this.getDefaultConfig()
    this.saveConfig(defaultConfig)
    return defaultConfig
  }
  
  /**
   * 导出配置
   */
  static exportConfig(): string {
    const config = this.getConfig()
    return JSON.stringify(config, null, 2)
  }
  
  /**
   * 导入配置
   */
  static importConfig(configJson: string): ServerConfig {
    try {
      const importedConfig = JSON.parse(configJson) as ServerConfig
      
      // 验证配置格式
      if (typeof importedConfig !== 'object' || importedConfig === null) {
        throw new Error('无效的配置格式')
      }
      
      // 保存导入的配置
      this.saveConfig(importedConfig)
      return importedConfig
    } catch (error) {
      console.error('导入配置失败:', error)
      throw new Error('导入配置失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }
  
  /**
   * 检查配置文件是否存在
   */
  static configExists(): boolean {
    const configPath = this.getConfigPath()
    return fs.existsSync(configPath)
  }
  
  /**
   * 获取配置文件信息
   */
  static getConfigInfo(): { path: string; exists: boolean; size?: number; lastModified?: Date } {
    const configPath = this.getConfigPath()
    const exists = fs.existsSync(configPath)
    
    if (exists) {
      const stats = fs.statSync(configPath)
      return {
        path: configPath,
        exists: true,
        size: stats.size,
        lastModified: stats.mtime
      }
    }
    
    return {
      path: configPath,
      exists: false
    }
  }
}
