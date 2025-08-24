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
  siliconFlowApiSettings?: string
  
  // 魔搭社区API配置
  modelScopeApiKey?: string
  modelScopeEpisodeModel?: string
  modelScopeApiSettings?: string
  
  // 通用设置
  generalSettings?: any
  appearanceSettings?: any
  videoThumbnailSettings?: any
  taskSchedulerConfig?: any
  episodeGeneratorApiProvider?: string
  sync_status?: any
  layout_preferences?: any
  episode_generator_config?: any
  last_login_username?: any
  last_login_remember_me?: any
  
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
   * 验证配置完整性
   * 确保所有关键配置字段都存在，智能处理undefined字段
   */
  private static validateConfig(config: ServerConfig): ServerConfig {
    const validatedConfig = { ...config }
    
    // 确保必须字段存在
    if (!validatedConfig.version) {
      validatedConfig.version = this.CONFIG_VERSION
    }
    if (!validatedConfig.lastUpdated) {
      validatedConfig.lastUpdated = Date.now()
    }
    if (!validatedConfig.siliconFlowThumbnailModel) {
      validatedConfig.siliconFlowThumbnailModel = 'Qwen/Qwen2.5-VL-32B-Instruct'
    }
    if (!validatedConfig.modelScopeEpisodeModel) {
      validatedConfig.modelScopeEpisodeModel = 'qwen-plus'
    }
    
    // 定义需要保留结构的字段（即使是undefined也要保留，等用户配置）
    const preserveFields = [
      'tmdbApiKey', 'tmdbImportPath', 'siliconFlowApiKey', 
      'siliconFlowApiSettings', 'modelScopeApiKey', 'modelScopeApiSettings'
    ]
    
    // ⚠️ 关键修复：确保API密钥字段始终存在于配置中，设为空字符串而不是null
    preserveFields.forEach(field => {
      if (!(field in validatedConfig)) {
        // 字段不存在，设为空字符串
        validatedConfig[field as keyof ServerConfig] = "" as any
        console.log(`🔧 [ServerConfigManager] 添加缺失的API密钥字段: ${field} = ""`)
      } else if (validatedConfig[field as keyof ServerConfig] === undefined || validatedConfig[field as keyof ServerConfig] === null) {
        // 字段存在但值为undefined或null，设为空字符串
        validatedConfig[field as keyof ServerConfig] = "" as any
        console.log(`🔧 [ServerConfigManager] 转换${validatedConfig[field as keyof ServerConfig]}为空字符串: ${field} = ""`)
      }
      // 如果字段存在且有值，则保持不变
    })
    
    // 只删除不需要保留的undefined字段
    Object.keys(validatedConfig).forEach(key => {
      const value = validatedConfig[key as keyof ServerConfig]
      if (value === undefined && !preserveFields.includes(key)) {
        delete validatedConfig[key as keyof ServerConfig]
      }
    })
    
    console.log('✓ [ServerConfigManager] 配置验证完成:', validatedConfig)
    console.log('✓ [ServerConfigManager] API密钥字段检查:')
    preserveFields.forEach(field => {
      console.log(`  - ${field}:`, field in validatedConfig ? '存在' : '缺失')
    })
    
    return validatedConfig
  }

  /**
   * 获取默认配置
   * 包含完整的字段结构，确保首次生成的配置文件包含所有必要字段
   */
  private static getDefaultConfig(): ServerConfig {
    return {
      // 基础元数据
      version: this.CONFIG_VERSION,
      lastUpdated: Date.now(),
      
      // API配置 - 硅基流动和魔搭社区的模型设置需要默认值
      siliconFlowThumbnailModel: 'Qwen/Qwen2.5-VL-32B-Instruct',
      modelScopeEpisodeModel: 'qwen-plus',
      
      // 以下字段在首次创建时包含，设为空字符串而不是null
      // 这样配置文件结构完整，但不会覆盖用户后续的设置
      tmdbApiKey: "",
      tmdbImportPath: "",
      siliconFlowApiKey: "",
      siliconFlowApiSettings: "",
      modelScopeApiKey: "",
      modelScopeApiSettings: "",
      
      // 应用设置 - 提供合理的默认值
      videoThumbnailSettings: JSON.stringify({
        startTime: 300,
        threadCount: 4,
        outputFormat: "jpg",
        thumbnailCount: 5,
        frameInterval: 30,
        keepOriginalResolution: true,
        enableAIFilter: true,
        siliconFlowApiKey: "",
        siliconFlowModel: "Qwen/Qwen2.5-VL-32B-Instruct",
        prioritizeStatic: true,
        avoidSubtitles: true,
        preferPeople: true,
        preferFaces: true,
        subtitleDetectionStrength: 0.8,
        staticFrameThreshold: 0.6,
        enhancedFrameDiversity: true,
        frameSimilarityThreshold: 0.7,
        timeDistribution: "uniform",
        aiAnalysisInterval: 5,
        enableAIAnalysis: true,
        enableOCRAnalysis: true,
        ocrModel: "Qwen/Qwen2.5-VL-72B-Instruct",
        useMultiModelValidation: false
      }),
      
      episodeGeneratorApiProvider: "modelscope",
      
      sync_status: JSON.stringify({
        lastSyncTime: new Date().toISOString(),
        clientVersion: 0,
        serverVersion: Date.now(),
        conflictCount: 0,
        syncInProgress: false
      }),
      
      layout_preferences: JSON.stringify({
        layoutType: "sidebar",
        sidebarCollapsed: false,
        lastUpdated: new Date().toISOString()
      }),
      
      last_login_username: undefined,
      last_login_remember_me: undefined,
      
      appearanceSettings: JSON.stringify({
        theme: "system",
        primaryColor: "blue",
        compactMode: false,
        fontSize: "medium",
        showAnimations: true,
        showTooltips: true,
        detailBackdropBlurEnabled: true,
        detailBackdropBlurIntensity: "medium",
        detailBackdropOverlayOpacity: 0.25,
        detailBackgroundOpacity: 0.25,
        detailBackgroundImageOpacity: 0.2
      }),
      
      episode_generator_config: JSON.stringify({
        summaryLength: [180, 205],
        selectedStyles: ["ai_free"],
        selectedTitleStyle: "location_skill",
        temperature: 0.7,
        includeOriginalTitle: true,
        speechRecognitionModel: "FunAudioLLM/SenseVoiceSmall",
        enableVideoAnalysis: false
      }),
      
      // 其他配置字段设为undefined，等用户配置时再填入
      generalSettings: undefined,
      taskSchedulerConfig: undefined
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
        console.log('📁 [ServerConfigManager] 配置文件不存在，创建默认配置')
        const defaultConfig = this.getDefaultConfig()
        this.saveConfig(defaultConfig)
        return defaultConfig
      }

      const configData = fs.readFileSync(configPath, 'utf8')
      const rawConfig = JSON.parse(configData)
      console.log('📖 [ServerConfigManager] 读取原始配置:', rawConfig)

      // 映射键名
      const config = this.mapKeys(rawConfig)
      console.log('🔄 [ServerConfigManager] 键名映射后配置:', config)

      // 检查版本兼容性
      if (config.version !== this.CONFIG_VERSION) {
        console.log(`🔄 [ServerConfigManager] 配置版本升级：${config.version} → ${this.CONFIG_VERSION}`)
        
        // ⚠️ 关键修复：保留用户现有配置，只添加缺失的默认字段
        const defaultConfig = this.getDefaultConfig()
        const upgradedConfig = this.validateConfig({
          ...defaultConfig,  // 先设置默认值
          ...config,         // 然后用用户配置覆盖（保留用户数据优先）
          version: this.CONFIG_VERSION,  // 更新版本号
          lastUpdated: Date.now()       // 更新时间戳
        })
        
        console.log('✅ [ServerConfigManager] 升级后配置:', upgradedConfig)
        this.saveConfig(upgradedConfig)
        return upgradedConfig
      }

      console.log('✅ [ServerConfigManager] 配置读取成功，无需升级')
      return config
    } catch (error) {
      console.error('❌ [ServerConfigManager] 读取服务端配置失败:', error)
      
      // ⚠️ 关键修复：出错时不要直接覆盖，先尝试恢复备份
      const configPath = this.getConfigPath()
      const backupPath = `${configPath}.backup`
      
      if (fs.existsSync(backupPath)) {
        try {
          console.log('🔄 [ServerConfigManager] 尝试从备份恢复配置')
          const backupData = fs.readFileSync(backupPath, 'utf8')
          const backupConfig = JSON.parse(backupData)
          console.log('✅ [ServerConfigManager] 备份恢复成功:', backupConfig)
          return backupConfig
        } catch (backupError) {
          console.error('❌ [ServerConfigManager] 备份恢复失败:', backupError)
        }
      }
      
      // 最后的备选方案：创建默认配置（但记录警告）
      console.warn('⚠️ [ServerConfigManager] 无法恢复配置，创建新的默认配置（用户数据可能丢失）')
      const defaultConfig = this.getDefaultConfig()
      this.saveConfig(defaultConfig)
      return defaultConfig
    }
  }
  
  /**
   * 优化配置格式 - 将长JSON字符串转换为对象以提高可读性
   */
  private static optimizeConfigFormat(config: ServerConfig): ServerConfig {
    const optimizedConfig = { ...config }
    
    // 需要优化的JSON字符串字段
    const jsonStringFields: (keyof ServerConfig)[] = [
      'videoThumbnailSettings',
      'sync_status',
      'layout_preferences',
      'appearanceSettings',
      'episode_generator_config',
      'generalSettings',
      'taskSchedulerConfig',
      'siliconFlowApiSettings',
      'modelScopeApiSettings'
    ]
    
    jsonStringFields.forEach(field => {
      const value = optimizedConfig[field]
      if (typeof value === 'string' && value.trim() !== '') {
        try {
          // 尝试解析JSON字符串为对象
          const parsedValue = JSON.parse(value)
          if (typeof parsedValue === 'object' && parsedValue !== null) {
            optimizedConfig[field] = parsedValue as any
            console.log(`🎨 [ServerConfigManager] 优化字段格式: ${field}`)
          }
        } catch (error) {
          console.warn(`⚠️ [ServerConfigManager] 无法优化字段 ${field}:`, error)
          // 保留原始字符串值
        }
      } else if (typeof value === 'object' && value !== null) {
        // 如果已经是对象，确保可以正确序列化
        try {
          // 测试序列化，确保对象可以正确转换
          JSON.stringify(value)
          // 如果成功，保留对象格式
        } catch (error) {
          console.error(`❌ [ServerConfigManager] 对象序列化失败 ${field}:`, error)
          // 如果序列化失败，设为 undefined 避免损坏配置
          optimizedConfig[field] = undefined as any
        }
      }
    })
    
    return optimizedConfig
  }
  
  /**
   * 保存配置
   */
  static saveConfig(config: ServerConfig): void {
    try {
      const configPath = this.getConfigPath()
      console.log('📋 [ServerConfigManager] 开始保存配置到:', configPath)
      console.log('🗂️ [ServerConfigManager] 将保存的原始配置:', config)
      
      // ⚠️ 关键修复：先确保API密钥字段结构完整，再进行验证
      const defaultConfig = this.getDefaultConfig()
      const mergedConfig = {
        ...defaultConfig,  // 先设置完整结构
        ...config          // 再用用户配置覆盖（保留用户数据优先）
      }
      
      // 验证配置完整性
      const validatedConfig = this.validateConfig(mergedConfig)
      
      // 备份现有配置
      if (fs.existsSync(configPath)) {
        const backupPath = `${configPath}.backup`
        fs.copyFileSync(configPath, backupPath)
        console.log('📦 [ServerConfigManager] 已备份现有配置到:', backupPath)
      }
      
      // 更新时间戳和版本
      const configToSave = {
        ...validatedConfig,
        version: this.CONFIG_VERSION,
        lastUpdated: Date.now()
      }
      
      // 🎨 新增：优化配置格式，将长JSON字符串转换为对象
      const optimizedConfig = this.optimizeConfigFormat(configToSave)
      
      console.log('🗄️ [ServerConfigManager] 最终保存的配置:', optimizedConfig)
      
      // 保存配置，使用缩进格式以提高可读性
      const configJson = JSON.stringify(optimizedConfig, null, 2)
      console.log('📏 [ServerConfigManager] JSON字符串长度:', configJson.length)
      
      fs.writeFileSync(configPath, configJson, 'utf8')
      console.log('✅ [ServerConfigManager] 服务端配置已保存:', configPath)
      
      // 验证保存结果
      if (fs.existsSync(configPath)) {
        const savedContent = fs.readFileSync(configPath, 'utf8')
        const savedConfig = JSON.parse(savedContent)
        console.log('✓ [ServerConfigManager] 保存验证成功，文件大小:', savedContent.length)
        console.log('✓ [ServerConfigManager] 验证保存的配置:', savedConfig)
        
        // ⚠️ 关键验证：检查用户配置是否保存成功
        if (config.tmdbApiKey && !savedConfig.tmdbApiKey) {
          console.error('❌ [ServerConfigManager] 警告：API密钥未成功保存!')
          throw new Error('API密钥保存失败')
        }
        if (config.tmdbApiKey) {
          console.log('✅ [ServerConfigManager] API密钥保存验证成功')
        }
      } else {
        console.error('❌ [ServerConfigManager] 保存后文件不存在!')
        throw new Error('文件保存失败')
      }
      
    } catch (error) {
      console.error('❌ [ServerConfigManager] 保存服务端配置失败:', error)
      if (error instanceof Error) {
        console.error('❌ [ServerConfigManager] 错误详情:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      }
      throw new Error('保存配置失败')
    }
  }
  
  /**
   * 更新配置
   */
  static updateConfig(updates: Partial<ServerConfig>): ServerConfig {
    console.log('🔄 [ServerConfigManager] 开始更新配置:', updates)
    
    const currentConfig = this.getConfig()
    console.log('📋 [ServerConfigManager] 当前配置:', currentConfig)
    
    const newConfig = { ...currentConfig, ...updates }
    console.log('🆕 [ServerConfigManager] 新配置:', newConfig)
    
    try {
      this.saveConfig(newConfig)
      console.log('✅ [ServerConfigManager] 配置更新成功')
    } catch (error) {
      console.error('❌ [ServerConfigManager] 配置更新失败:', error)
      throw error
    }
    
    return newConfig
  }
  
  /**
   * 获取特定配置项
   */
  static getConfigItem(key: keyof ServerConfig): any {
    const config = this.getConfig()
    const value = config[key]
    
    // 如果是对象，返回 JSON 字符串（保持 API 一致性）
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value)
      } catch (error) {
        console.error('❌ [ServerConfigManager] 对象序列化失败:', error)
        return value
      }
    }
    
    return value
  }
  
  /**
   * 设置特定配置项
   */
  static setConfigItem(key: keyof ServerConfig, value: any): void {
    console.log('🔧 [ServerConfigManager] 开始设置配置项:', { key, valueType: typeof value, valueLength: value?.length })
    
    const updates = { [key]: value } as Partial<ServerConfig>
    console.log('📋 [ServerConfigManager] 准备更新:', updates)
    
    try {
      this.updateConfig(updates)
      console.log('✅ [ServerConfigManager] 配置项设置成功:', key)
    } catch (error) {
      console.error('❌ [ServerConfigManager] 配置项设置失败:', error)
      throw error
    }
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