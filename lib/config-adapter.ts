/**
 * 配置适配器
 * 为现有的配置管理器提供Docker环境适配
 */

import { DockerConfigManager } from './docker-config-manager';

export class ConfigAdapter {
  /**
   * 获取配置项
   * 在Docker环境中从文件系统读取，否则从localStorage读取
   */
  static getItem(key: string): string | null {
    if (DockerConfigManager.isDockerEnvironment()) {
      return this.getFromDockerConfig(key);
    }
    
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
    
    return null;
  }

  /**
   * 设置配置项
   * 在Docker环境中保存到文件系统，否则保存到localStorage
   */
  static setItem(key: string, value: string): void {
    if (DockerConfigManager.isDockerEnvironment()) {
      this.setToDockerConfig(key, value);
      return;
    }
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  }

  /**
   * 删除配置项
   */
  static removeItem(key: string): void {
    if (DockerConfigManager.isDockerEnvironment()) {
      this.removeFromDockerConfig(key);
      return;
    }
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  }

  /**
   * 从Docker配置中获取值
   */
  private static getFromDockerConfig(key: string): string | null {
    const config = DockerConfigManager.getConfig();
    
    // 映射常见的localStorage键到Docker配置
    switch (key) {
      case 'tmdb_api_key':
        return config.tmdbApiKey || null;
      case 'tmdb_import_path':
        return config.tmdbImportPath || null;
      case 'siliconflow_api_key':
        return config.siliconFlowApiKey || null;
      case 'siliconflow_api_settings':
        return config.siliconFlowApiKey ? JSON.stringify({
          apiKey: config.siliconFlowApiKey,
          thumbnailFilterModel: config.siliconFlowThumbnailModel || 'Qwen/Qwen2.5-VL-32B-Instruct'
        }) : null;
      case 'modelscope_api_key':
        return config.modelScopeApiKey || null;
      case 'modelscope_api_settings':
        return config.modelScopeApiKey ? JSON.stringify({
          apiKey: config.modelScopeApiKey,
          episodeGenerationModel: config.modelScopeEpisodeModel || 'qwen-plus'
        }) : null;
      case 'general_settings':
        return config.generalSettings ? JSON.stringify(config.generalSettings) : null;
      case 'appearance_settings':
        return config.appearanceSettings ? JSON.stringify(config.appearanceSettings) : null;
      case 'video_thumbnail_settings':
        return config.videoThumbnailSettings ? JSON.stringify(config.videoThumbnailSettings) : null;
      case 'task_scheduler_config':
        return config.taskSchedulerConfig ? JSON.stringify(config.taskSchedulerConfig) : null;
      default:
        // 对于其他键，尝试从appConfig中获取
        return config.appConfig?.[key] || null;
    }
  }

  /**
   * 设置值到Docker配置
   */
  private static setToDockerConfig(key: string, value: string): void {
    switch (key) {
      case 'tmdb_api_key':
        DockerConfigManager.setTmdbApiKey(value);
        break;
      case 'tmdb_import_path':
        DockerConfigManager.setTmdbImportPath(value);
        break;
      case 'siliconflow_api_key':
        DockerConfigManager.setSiliconFlowApiKey(value);
        break;
      case 'siliconflow_api_settings':
        try {
          const settings = JSON.parse(value);
          if (settings.apiKey) {
            DockerConfigManager.setSiliconFlowApiKey(settings.apiKey);
          }
          if (settings.thumbnailFilterModel) {
            const config = DockerConfigManager.getConfig();
            config.siliconFlowThumbnailModel = settings.thumbnailFilterModel;
            DockerConfigManager.saveConfig(config);
          }
        } catch (e) {
          console.warn('解析硅基流动API设置失败:', e);
        }
        break;
      case 'general_settings':
        try {
          DockerConfigManager.setGeneralSettings(JSON.parse(value));
        } catch (e) {
          console.warn('解析通用设置失败:', e);
        }
        break;
      case 'appearance_settings':
        try {
          DockerConfigManager.setAppearanceSettings(JSON.parse(value));
        } catch (e) {
          console.warn('解析外观设置失败:', e);
        }
        break;
      case 'video_thumbnail_settings':
        try {
          DockerConfigManager.setVideoThumbnailSettings(JSON.parse(value));
        } catch (e) {
          console.warn('解析视频缩略图设置失败:', e);
        }
        break;
      case 'task_scheduler_config':
        try {
          DockerConfigManager.setTaskSchedulerConfig(JSON.parse(value));
        } catch (e) {
          console.warn('解析任务调度器配置失败:', e);
        }
        break;
      default:
        // 对于其他键，保存到appConfig中
        const appConfig = DockerConfigManager.getAppConfig();
        appConfig[key] = value;
        DockerConfigManager.setAppConfig(appConfig);
        break;
    }
  }

  /**
   * 从Docker配置中删除值
   */
  private static removeFromDockerConfig(key: string): void {
    const config = DockerConfigManager.getConfig();
    
    switch (key) {
      case 'tmdb_api_key':
        delete config.tmdbApiKey;
        break;
      case 'tmdb_import_path':
        delete config.tmdbImportPath;
        break;
      case 'siliconflow_api_key':
        delete config.siliconFlowApiKey;
        break;
      case 'siliconflow_api_settings':
        delete config.siliconFlowApiKey;
        delete config.siliconFlowThumbnailModel;
        break;
      case 'general_settings':
        delete config.generalSettings;
        break;
      case 'appearance_settings':
        delete config.appearanceSettings;
        break;
      case 'video_thumbnail_settings':
        delete config.videoThumbnailSettings;
        break;
      case 'task_scheduler_config':
        delete config.taskSchedulerConfig;
        break;
      default:
        if (config.appConfig) {
          delete config.appConfig[key];
        }
        break;
    }
    
    DockerConfigManager.saveConfig(config);
  }

  /**
   * 检查是否支持存储
   */
  static isStorageAvailable(): boolean {
    if (DockerConfigManager.isDockerEnvironment()) {
      return true; // Docker环境总是支持文件系统存储
    }
    
    try {
      if (typeof window === 'undefined') return false;
      const testKey = "__storage_test__";
      localStorage.setItem(testKey, testKey);
      const result = localStorage.getItem(testKey) === testKey;
      localStorage.removeItem(testKey);
      return result;
    } catch (e) {
      return false;
    }
  }

  /**
   * 迁移现有localStorage数据到Docker配置
   */
  static async migrateExistingData(): Promise<void> {
    if (!DockerConfigManager.isDockerEnvironment() || typeof window === 'undefined') {
      return;
    }

    try {
      const localStorageData: { [key: string]: string } = {};
      
      // 收集所有localStorage数据
      const keysToMigrate = [
        'tmdb_api_key',
        'tmdb_import_path',
        'siliconflow_api_key',
        'siliconflow_api_settings',
        'general_settings',
        'appearance_settings',
        'video_thumbnail_settings',
        'task_scheduler_config'
      ];

      keysToMigrate.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          localStorageData[key] = value;
        }
      });

      if (Object.keys(localStorageData).length > 0) {
        // 调用API进行迁移
        const response = await fetch('/api/docker-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'migrate',
            localStorageData
          })
        });

        if (response.ok) {
          console.log('配置迁移成功');
          // 清除已迁移的localStorage数据
          keysToMigrate.forEach(key => {
            if (localStorageData[key]) {
              localStorage.removeItem(key);
            }
          });
        }
      }
    } catch (error) {
      console.error('配置迁移失败:', error);
    }
  }
}