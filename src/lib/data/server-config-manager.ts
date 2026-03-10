import { logger } from '@/lib/utils/logger';
import { configRepository } from '@/lib/database/repositories/config.repository';

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
  // TMDB相关配置
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
 * 基于 SQLite 数据库的配置存储
 */
export class ServerConfigManager {
  private static readonly CONFIG_KEY = 'server_config';
  private static readonly CONFIG_VERSION = '1.0.0';

  /**
   * 获取默认配置
   */
  private static getDefaultConfig(): ServerConfig {
    return {
      version: this.CONFIG_VERSION,
      lastUpdated: Date.now(),
      siliconFlowThumbnailModel: 'Qwen/Qwen2.5-VL-32B-Instruct',
      modelScopeEpisodeModel: 'qwen-plus',
      tmdbImportPath: '',
      siliconFlowApiKey: '',
      siliconFlowApiSettings: '',
      modelScopeApiKey: '',
      modelScopeApiSettings: '',
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
      generalSettings: '',
      taskSchedulerConfig: undefined,
    };
  }

  /**
   * 验证配置完整性
   */
  private static validateConfig(config: ServerConfig): ServerConfig {
    const validatedConfig = { ...config };

    if (!validatedConfig.version) {
      validatedConfig.version = this.CONFIG_VERSION;
    }
    if (!validatedConfig.lastUpdated) {
      validatedConfig.lastUpdated = Date.now();
    }
    if (!validatedConfig.siliconFlowThumbnailModel) {
      validatedConfig.siliconFlowThumbnailModel = 'Qwen/Qwen2.5-VL-32B-Instruct';
    }
    if (!validatedConfig.modelScopeEpisodeModel) {
      validatedConfig.modelScopeEpisodeModel = 'qwen-plus';
    }

    const preserveFields = [
      'tmdbImportPath',
      'siliconFlowApiKey',
      'siliconFlowApiSettings',
      'modelScopeApiKey',
      'modelScopeApiSettings',
    ];

    preserveFields.forEach((field) => {
      if (!(field in validatedConfig)) {
        validatedConfig[field as keyof ServerConfig] = '' as any;
      } else if (
        validatedConfig[field as keyof ServerConfig] === undefined ||
        validatedConfig[field as keyof ServerConfig] === null
      ) {
        validatedConfig[field as keyof ServerConfig] = '' as any;
      }
    });

    return validatedConfig;
  }

  /**
   * 读取配置
   */
  static getConfig(): ServerConfig {
    try {
      const config = configRepository.get<ServerConfig>(this.CONFIG_KEY);
      
      if (!config) {
        const defaultConfig = this.getDefaultConfig();
        this.saveConfig(defaultConfig);
        return defaultConfig;
      }

      if (config.version !== this.CONFIG_VERSION) {
        const defaultConfig = this.getDefaultConfig();
        const upgradedConfig = this.validateConfig({
          ...defaultConfig,
          ...config,
          version: this.CONFIG_VERSION,
          lastUpdated: Date.now(),
        });
        this.saveConfig(upgradedConfig);
        return upgradedConfig;
      }

      return config;
    } catch (error) {
      logger.error('[ServerConfigManager] 读取配置失败', error);
      const defaultConfig = this.getDefaultConfig();
      this.saveConfig(defaultConfig);
      return defaultConfig;
    }
  }

  /**
   * 保存配置
   */
  static saveConfig(config: ServerConfig): void {
    try {
      const validatedConfig = this.validateConfig(config);
      const configToSave = {
        ...validatedConfig,
        version: this.CONFIG_VERSION,
        lastUpdated: Date.now(),
      };

      configRepository.set(this.CONFIG_KEY, configToSave);
    } catch (error) {
      logger.error('[ServerConfigManager] 保存配置失败', error);
      throw new Error('保存配置失败');
    }
  }

  /**
   * 更新配置
   */
  static updateConfig(updates: Partial<ServerConfig>): ServerConfig {
    const currentConfig = this.getConfig();
    const newConfig = { ...currentConfig, ...updates };
    this.saveConfig(newConfig);
    return newConfig;
  }

  /**
   * 获取特定配置项
   */
  static getConfigItem<T extends keyof ServerConfig>(key: T): ServerConfig[T] | undefined {
    const config = this.getConfig();
    const value = config[key];

    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value);
      } catch {
        return value;
      }
    }

    return value;
  }

  /**
   * 设置特定配置项
   */
  static setConfigItem<T extends keyof ServerConfig>(key: T, value: ServerConfig[T]): void {
    const updates = { [key]: value } as Partial<ServerConfig>;
    this.updateConfig(updates);
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

      if (typeof importedConfig !== 'object' || importedConfig === null) {
        throw new Error('无效的配置格式');
      }

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
   * 检查配置是否存在
   */
  static configExists(): boolean {
    return configRepository.has(this.CONFIG_KEY);
  }

  /**
   * 获取配置信息
   */
  static getConfigInfo(): {
    exists: boolean;
    lastUpdated?: number;
  } {
    const exists = this.configExists();
    if (exists) {
      const config = this.getConfig();
      return {
        exists: true,
        lastUpdated: config.lastUpdated,
      };
    }
    return { exists: false };
  }
}