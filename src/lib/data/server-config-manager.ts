import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/utils/logger';

// 通用设置类型定义
interface GeneralSettings {
  language?: string;
  timezone?: string;
  autoSave?: boolean;
  debugMode?: boolean;
}

interface AppearanceSettings {
  theme?: 'light' | 'dark' | 'auto';
  fontSize?: 'small' | 'medium' | 'large';
  compactMode?: boolean;
  sidebarCollapsed?: boolean;
}

interface VideoThumbnailSettings {
  quality?: 'low' | 'medium' | 'high';
  format?: 'jpg' | 'png' | 'webp';
  interval?: number;
  maxThumbnails?: number;
}

interface TaskSchedulerConfig {
  enabled?: boolean;
  maxConcurrentTasks?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

interface SyncStatus {
  lastSync?: number;
  inProgress?: boolean;
  errors?: string[];
  pending?: number;
}

interface LayoutPreferences {
  sidebarWidth?: number;
  panelSizes?: number[];
  hiddenSections?: string[];
}

interface EpisodeGeneratorConfig {
  model?: string;
  provider?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * 服务端配置接口
 */
export interface ServerConfig {
  // TMDB相关配置（API Key 已内置，不再支持用户配置）
  // tmdbApiKey?: string; // 已移除，使用内置官方 API
  tmdbImportPath?: string;

  // 硅基流动API配置
  siliconFlowApiKey?: string;
  siliconFlowThumbnailModel?: string;
  siliconFlowApiSettings?: string;

  // 魔搭社区API配置
  modelScopeApiKey?: string;
  modelScopeEpisodeModel?: string;
  modelScopeApiSettings?: string;

  // 通用设置
  generalSettings?: GeneralSettings;
  appearanceSettings?: AppearanceSettings;
  videoThumbnailSettings?: VideoThumbnailSettings;
  taskSchedulerConfig?: TaskSchedulerConfig;
  episodeGeneratorApiProvider?: string;
  sync_status?: SyncStatus;
  layout_preferences?: LayoutPreferences;
  episode_generator_config?: EpisodeGeneratorConfig;
  last_login_username?: string;
  last_login_remember_me?: boolean;

  // 元数据
  lastUpdated?: number;
  version?: string;
}

/**
 * 服务端配置管理器
 * 负责在服务端存储和管理所有配置信息
 */
export class ServerConfigManager {
  private static readonly CONFIG_FILE = 'server-config.json';
  private static readonly CONFIG_VERSION = '1.0.0';
  private static lastValidationTime: number = 0;
  private static lastConfigLogTime: number = 0;
  private static lastSaveLogTime: number = 0;
  private static lastUpdateLogTime: number = 0;

  /**
   * 获取配置文件路径
   */
  private static getConfigPath(): string {
    // 检查是否在Docker环境中
    const isDocker = process.env.DOCKER_CONTAINER === 'true';

    // Docker环境和开发环境都使用data文件夹
    // Docker环境中，data文件夹会被挂载到宿主机
    const dataDir = path.join(process.cwd(), 'data');

    // 确保data目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.debug('ServerConfigManager', `创建配置目录: ${dataDir}`, { isDocker });
    }

    const configPath = path.join(dataDir, this.CONFIG_FILE);
    logger.debug('ServerConfigManager', `配置文件路径: ${configPath}`, { isDocker });

    return configPath;
  }

  /**
   * 验证配置完整性
   * 确保所有关键配置字段都存在，智能处理undefined字段
   */
  private static validateConfig(config: ServerConfig): ServerConfig {
    const validatedConfig = { ...config };

    // 确保必须字段存在
    if (!validatedConfig.version) {
      validatedConfig.version = this.CONFIG_VERSION;
    }
    if (!validatedConfig.lastUpdated) {
      validatedConfig.lastUpdated = Date.now();
    }
    if (!validatedConfig.siliconFlowThumbnailModel) {
      validatedConfig.siliconFlowThumbnailModel =
        'Qwen/Qwen2.5-VL-32B-Instruct';
    }
    if (!validatedConfig.modelScopeEpisodeModel) {
      validatedConfig.modelScopeEpisodeModel = 'qwen-plus';
    }

    // 定义需要保留结构的字段（即使是undefined也要保留，等用户配置）
    const preserveFields = [
      'tmdbApiKey',
      'tmdbImportPath',
      'siliconFlowApiKey',
      'siliconFlowApiSettings',
      'modelScopeApiKey',
      'modelScopeApiSettings',
    ];

    // ⚠️ 关键修复：确保API密钥字段始终存在于配置中，设为空字符串而不是null
    preserveFields.forEach((field) => {
      if (!(field in validatedConfig)) {
        // 字段不存在，设为空字符串
        validatedConfig[field as keyof ServerConfig] = '' as any;
      } else if (
        validatedConfig[field as keyof ServerConfig] === undefined ||
        validatedConfig[field as keyof ServerConfig] === null
      ) {
        // 字段存在但值为undefined或null，设为空字符串
        validatedConfig[field as keyof ServerConfig] = '' as any;
      }
      // 如果字段存在且有值，则保持不变
    });

    // 只删除不需要保留的undefined字段
    Object.keys(validatedConfig).forEach((key) => {
      const value = validatedConfig[key as keyof ServerConfig];
      if (value === undefined && !preserveFields.includes(key)) {
        delete validatedConfig[key as keyof ServerConfig];
      }
    });

    // 减少日志输出 - 只在调试模式或首次创建时输出
    // 只在首次验证或配置有变化时输出日志
    const shouldLog =
      process.env.NODE_ENV === 'development' &&
      (!this.lastValidationTime || Date.now() - this.lastValidationTime > 5000);

    if (shouldLog) {
      preserveFields.forEach((field) => {});
      this.lastValidationTime = Date.now();
    }

    return validatedConfig;
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
      // tmdbApiKey: '', // 已移除，使用内置官方 API
      tmdbImportPath: '',
      siliconFlowApiKey: '',
      siliconFlowApiSettings: '',
      modelScopeApiKey: '',
      modelScopeApiSettings: '',

      // 应用设置 - 提供合理的默认值
      videoThumbnailSettings: JSON.stringify({
        startTime: 300,
        threadCount: 4,
        outputFormat: 'jpg',
        thumbnailCount: 5,
        frameInterval: 30,
        keepOriginalResolution: true,
        enableAIFilter: true,
        siliconFlowApiKey: '',
        siliconFlowModel: 'Qwen/Qwen2.5-VL-32B-Instruct',
      }),

      episodeGeneratorApiProvider: 'modelscope',

      sync_status: JSON.stringify({
        lastSyncTime: new Date().toISOString(),
        clientVersion: 0,
        serverVersion: Date.now(),
        conflictCount: 0,
        syncInProgress: false,
      }),

      layout_preferences: JSON.stringify({
        layoutType: 'sidebar',
        sidebarCollapsed: false,
        lastUpdated: new Date().toISOString(),
      }),

      last_login_username: undefined,
      last_login_remember_me: undefined,

      appearanceSettings: JSON.stringify({
        theme: 'system',
        primaryColor: 'blue',
        compactMode: false,
        fontSize: 'medium',
        showAnimations: true,
        showTooltips: true,
        detailBackdropBlurEnabled: true,
        detailBackdropBlurIntensity: 'medium',
        detailBackdropOverlayOpacity: 0.25,
        detailBackgroundOpacity: 0.25,
        detailBackgroundImageOpacity: 0.2,
      }),

      episode_generator_config: JSON.stringify({
        summaryLength: [180, 205],
        selectedStyles: ['ai_free'],
        selectedTitleStyle: 'location_skill',
        temperature: 0.7,
        includeOriginalTitle: true,
        speechRecognitionModel: 'FunAudioLLM/SenseVoiceSmall',
        enableVideoAnalysis: false,
      }),

      // 其他配置字段设为undefined，等用户配置时再填入
      generalSettings: undefined,
      taskSchedulerConfig: undefined,
    };
  }

  /**
   * 键名映射：将下划线命名转换为驼峰命名
   */
  private static mapKeys(rawConfig: Record<string, unknown>): ServerConfig {
    const keyMapping: Record<string, string> = {
      // tmdb_api_key: 'tmdbApiKey', // 已移除，使用内置官方 API
      tmdb_import_path: 'tmdbImportPath',
      siliconflow_api_key: 'siliconFlowApiKey',
      siliconflow_thumbnail_model: 'siliconFlowThumbnailModel',
      modelscope_api_key: 'modelScopeApiKey',
      modelscope_episode_model: 'modelScopeEpisodeModel',
      general_settings: 'generalSettings',
      appearance_settings: 'appearanceSettings',
      video_thumbnail_settings: 'videoThumbnailSettings',
      siliconflow_api_settings: 'siliconFlowApiSettings',
      modelscope_api_settings: 'modelScopeApiSettings',
      episode_generator_api_provider: 'episodeGeneratorApiProvider',
      task_scheduler_config: 'taskSchedulerConfig',
    };

    const mappedConfig: Partial<ServerConfig> = {};

    // 复制所有原始键
    Object.keys(rawConfig).forEach((key) => {
      const mappedKey = keyMapping[key] || key;
      mappedConfig[mappedKey] = rawConfig[key];
    });

    return mappedConfig as ServerConfig;
  }

  private static configCache: ServerConfig | null = null;
  private static cacheExpiry: number = 0;
  private static readonly CONFIG_CACHE_DURATION = 30 * 60 * 1000; // 30分钟配置缓存（大幅延长缓存时间）
  private static isLoading: boolean = false; // 防止并发加载

  /**
   * 读取配置 (带缓存优化)
   */
  static getConfig(): ServerConfig {
    try {
      // 检查缓存是否有效
      const now = Date.now();
      if (this.configCache && now < this.cacheExpiry) {
        // 减少缓存命中日志输出，避免频繁打印
        return this.configCache;
      }

      if (this.isLoading) {
        if (this.configCache) {
          return this.configCache;
        }
        logger.warn('[ServerConfigManager] 配置正在加载中，返回默认配置');
        return this.getDefaultConfig();
      }

      this.isLoading = true;

      const configPath = this.getConfigPath();

      if (!fs.existsSync(configPath)) {
        const defaultConfig = this.getDefaultConfig();
        this.saveConfig(defaultConfig);
        this.configCache = defaultConfig;
        this.cacheExpiry = now + this.CONFIG_CACHE_DURATION;
        this.isLoading = false;
        return defaultConfig;
      }

      const configData = fs.readFileSync(configPath, 'utf8');
      const rawConfig = JSON.parse(configData);
      const shouldLogConfig =
        process.env.NODE_ENV === 'development' &&
        (!this.lastConfigLogTime ||
          Date.now() - this.lastConfigLogTime > 10000);

      if (shouldLogConfig) {
        this.lastConfigLogTime = Date.now();
      }

      const config = this.mapKeys(rawConfig);

      if (config.version !== this.CONFIG_VERSION) {
        const defaultConfig = this.getDefaultConfig();
        const upgradedConfig = this.validateConfig({
          ...defaultConfig,
          ...config,
          version: this.CONFIG_VERSION,
          lastUpdated: Date.now(),
        });

        this.saveConfig(upgradedConfig);
        this.configCache = upgradedConfig;
        this.cacheExpiry = now + this.CONFIG_CACHE_DURATION;
        return upgradedConfig;
      }

      this.configCache = config;
      this.cacheExpiry = now + this.CONFIG_CACHE_DURATION;
      this.isLoading = false;
      return config;
    } catch (error) {
      this.isLoading = false;

      const configPath = this.getConfigPath();
      const backupPath = `${configPath}.backup`;

      if (fs.existsSync(backupPath)) {
        try {
          const backupData = fs.readFileSync(backupPath, 'utf8');
          const backupConfig = JSON.parse(backupData);
          this.configCache = backupConfig;
          this.cacheExpiry = Date.now() + this.CONFIG_CACHE_DURATION;
          return backupConfig;
        } catch (backupError) {}
      }

      const defaultConfig = this.getDefaultConfig();
      this.saveConfig(defaultConfig);
      this.configCache = defaultConfig;
      this.cacheExpiry = Date.now() + this.CONFIG_CACHE_DURATION;
      return defaultConfig;
    }
  }

  /**
   * 优化配置格式 - 将长JSON字符串转换为对象以提高可读性
   */
  private static optimizeConfigFormat(config: ServerConfig): ServerConfig {
    const optimizedConfig = { ...config };

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
      'modelScopeApiSettings',
    ];

    jsonStringFields.forEach((field) => {
      const value = optimizedConfig[field];
      if (typeof value === 'string' && value.trim() !== '') {
        try {
          // 尝试解析JSON字符串为对象
          const parsedValue = JSON.parse(value);
          if (typeof parsedValue === 'object' && parsedValue !== null) {
            optimizedConfig[field] = parsedValue as any;
            if (process.env.NODE_ENV === 'development') {
            }
          }
        } catch (error) {
          // 保留原始字符串值
        }
      } else if (typeof value === 'object' && value !== null) {
        // 如果已经是对象，确保可以正确序列化
        try {
          // 测试序列化，确保对象可以正确转换
          JSON.stringify(value);
          // 如果成功，保留对象格式
        } catch (error) {
          // 如果序列化失败，设为 undefined 避免损坏配置
          optimizedConfig[field] = undefined as any;
        }
      }
    });

    return optimizedConfig;
  }

  /**
   * 保存配置 (减少日志输出)
   */
  static saveConfig(config: ServerConfig): void {
    try {
      const configPath = this.getConfigPath();

      // ⚠️ 优化：只在必要时进行完整验证（配置升级或结构不完整时）
      let validatedConfig = config;

      // 检查是否需要完整验证（配置版本不匹配或缺少关键字段）
      const needsFullValidation =
        config.version !== this.CONFIG_VERSION ||
        !config.siliconFlowApiKey ||
        !config.modelScopeApiKey;

      if (needsFullValidation) {
        const defaultConfig = this.getDefaultConfig();
        const mergedConfig = {
          ...defaultConfig, // 先设置完整结构
          ...config, // 再用用户配置覆盖（保留用户数据优先）
        };
        validatedConfig = this.validateConfig(mergedConfig);
      }

      // 备份现有配置
      if (fs.existsSync(configPath)) {
        const backupPath = `${configPath}.backup`;
        fs.copyFileSync(configPath, backupPath);
        if (process.env.NODE_ENV === 'development') {
        }
      }

      // 更新时间戳和版本
      const configToSave = {
        ...validatedConfig,
        version: this.CONFIG_VERSION,
        lastUpdated: Date.now(),
      };

      // 🎨 新增：优化配置格式，将长JSON字符串转换为对象
      const optimizedConfig = this.optimizeConfigFormat(configToSave);

      // 保存配置，使用缩进格式以提高可读性
      const configJson = JSON.stringify(optimizedConfig, null, 2);

      fs.writeFileSync(configPath, configJson, 'utf8');

      // 更新缓存
      this.configCache = optimizedConfig;
      this.cacheExpiry = Date.now() + this.CONFIG_CACHE_DURATION;

      // 验证保存结果 (简化日志)
      if (fs.existsSync(configPath)) {
        const savedContent = fs.readFileSync(configPath, 'utf8');
        const savedConfig = JSON.parse(savedContent);

        // 只在调试模式下输出详细日志，且限制频率
        const shouldLogSave =
          process.env.NODE_ENV === 'development' &&
          (!this.lastSaveLogTime || Date.now() - this.lastSaveLogTime > 5000);

        if (shouldLogSave) {
          this.lastSaveLogTime = Date.now();
        }
      } else {
        throw new Error('文件保存失败');
      }
    } catch (error) {
      if (error instanceof Error) {
      }
      throw new Error('保存配置失败');
    }
  }

  /**
   * 更新配置 (减少日志输出)
   */
  static updateConfig(updates: Partial<ServerConfig>): ServerConfig {
    if (process.env.NODE_ENV === 'development') {
    }

    const currentConfig = this.getConfig();
    const newConfig = { ...currentConfig, ...updates };

    try {
      this.saveConfig(newConfig);
      // 限制更新日志频率
      const shouldLogUpdate =
        process.env.NODE_ENV === 'development' &&
        (!this.lastUpdateLogTime || Date.now() - this.lastUpdateLogTime > 5000);

      if (shouldLogUpdate) {
        this.lastUpdateLogTime = Date.now();
      }
    } catch (error) {
      throw error;
    }

    return newConfig;
  }

  /**
   * 获取特定配置项
   */
  static getConfigItem<T extends keyof ServerConfig>(key: T): ServerConfig[T] | undefined {
    const config = this.getConfig();
    const value = config[key];

    // 如果是对象，返回 JSON 字符串（保持 API 一致性）
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return value;
      }
    }

    return value;
  }

  /**
   * 设置特定配置项 (减少日志输出)
   */
  static setConfigItem<T extends keyof ServerConfig>(key: T, value: ServerConfig[T]): void {
    if (process.env.NODE_ENV === 'development') {
    }

    const updates = { [key]: value } as Partial<ServerConfig>;

    try {
      this.updateConfig(updates);
      if (process.env.NODE_ENV === 'development') {
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 删除配置项
   */
  static removeConfigItem(key: keyof ServerConfig): void {
    const config = this.getConfig();
    delete config[key];
    this.saveConfig(config);
  }

  /**
   * 重置为默认配置
   */
  static resetToDefault(): ServerConfig {
    const defaultConfig = this.getDefaultConfig();
    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  /**
   * 导出配置
   */
  static exportConfig(): string {
    const config = this.getConfig();
    return JSON.stringify(config, null, 2);
  }

  /**
   * 导入配置
   */
  static importConfig(configJson: string): ServerConfig {
    try {
      const importedConfig = JSON.parse(configJson) as ServerConfig;

      // 验证配置格式
      if (typeof importedConfig !== 'object' || importedConfig === null) {
        throw new Error('无效的配置格式');
      }

      // 保存导入的配置
      this.saveConfig(importedConfig);
      return importedConfig;
    } catch (error) {
      throw new Error(
        '导入配置失败: ' +
          (error instanceof Error ? error.message : '未知错误'),
      );
    }
  }

  /**
   * 检查配置文件是否存在
   */
  static configExists(): boolean {
    const configPath = this.getConfigPath();
    return fs.existsSync(configPath);
  }

  /**
   * 获取配置文件信息
   */
  static getConfigInfo(): {
    path: string;
    exists: boolean;
    size?: number;
    lastModified?: Date;
  } {
    const configPath = this.getConfigPath();
    const exists = fs.existsSync(configPath);

    if (exists) {
      const stats = fs.statSync(configPath);
      return {
        path: configPath,
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
      };
    }

    return {
      path: configPath,
      exists: false,
    };
  }
}
