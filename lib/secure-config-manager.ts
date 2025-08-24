/**
 * 安全配置管理器
 * 用于管理敏感配置信息，如API密钥等
 * 支持Docker环境下的文件系统存储
 */

import { ServerConfigManager } from './server-config-manager';

interface SecureConfig {
  tmdbApiKey?: string;
  jwtSecret?: string;
  sessionExpiryDays?: number;
}

interface EncryptedData {
  data: string;
  timestamp: number;
  version: string;
}

export class SecureConfigManager {
  private static readonly STORAGE_KEY = 'tmdb_secure_config';
  private static readonly VERSION = '1.0.0';
  private static readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时
  
  // 简单的加密/解密（在生产环境中应使用更强的加密）
  private static encrypt(data: string): string {
    // 使用Base64编码作为基础加密（实际项目中应使用AES等强加密）
    return btoa(encodeURIComponent(data));
  }
  
  private static decrypt(encryptedData: string): string {
    try {
      return decodeURIComponent(atob(encryptedData));
    } catch (error) {
      console.error('解密失败:', error);
      return '';
    }
  }
  
  /**
   * 保存配置到安全存储（现在使用服务端存储）
   */
  static async saveConfig(config: SecureConfig): Promise<void> {
    try {
      // 将配置保存到服务端
      for (const [key, value] of Object.entries(config)) {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'set',
            key: `secure_${key}`,
            value: this.encrypt(JSON.stringify(value))
          })
        });

        if (!response.ok) {
          throw new Error(`保存配置项 ${key} 失败`);
        }
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      throw new Error('配置保存失败');
    }
  }
  
  /**
   * 从安全存储读取配置（现在使用服务端存储）
   */
  static async getConfig(): Promise<SecureConfig> {
    try {
      const config: SecureConfig = {};

      // 从服务端获取所有secure_开头的配置
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          for (const [key, value] of Object.entries(data.config)) {
            if (typeof key === 'string' && key.startsWith('secure_')) {
              try {
                const configKey = key.replace('secure_', '');
                const decryptedValue = this.decrypt(value as string);
                config[configKey] = JSON.parse(decryptedValue);
              } catch (decryptError) {
                console.warn(`解密配置项 ${key} 失败:`, decryptError);
              }
            }
          }
        }
      }

      return config;
    } catch (error) {
      console.error('读取配置失败:', error);
      return {};
    }
  }
  
  /**
   * 获取服务器端配置（从环境变量）
   */
  private static getServerConfig(): SecureConfig {
    return {
      tmdbApiKey: process.env.TMDB_API_KEY,
      jwtSecret: process.env.JWT_SECRET,
      sessionExpiryDays: process.env.SESSION_EXPIRY_DAYS ?
        parseInt(process.env.SESSION_EXPIRY_DAYS) : 15
    };
  }
  
  /**
   * 获取TMDB API密钥
   */
  static async getTmdbApiKey(): Promise<string> {
    // 优先从服务端配置获取
    try {
      const config = await this.getConfig();
      if (config.tmdbApiKey) {
        return config.tmdbApiKey;
      }
    } catch (error) {
      console.warn('获取服务端配置失败:', error);
    }

    // 其次使用环境变量
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      throw new Error('TMDB API密钥未配置，请在设置中配置或设置环境变量TMDB_API_KEY');
    }

    return apiKey;
  }
  
  /**
   * 设置TMDB API密钥
   */
  static async setTmdbApiKey(apiKey: string): Promise<void> {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API密钥不能为空');
    }

    // 保存到服务端配置
    await this.saveConfig({ tmdbApiKey: apiKey.trim() });
  }
  
  /**
   * 验证API密钥格式（已移除验证，允许任何输入）
   */
  static validateApiKey(apiKey: string): boolean {
    // 不再验证，允许任何输入
    return true;
  }
  
  /**
   * 清除配置
   */
  static clearConfig(): void {
    try {
      if (typeof window !== 'undefined') {
        const storage = window.sessionStorage || window.localStorage;
        storage.removeItem(this.STORAGE_KEY);
        
        // 同时清除旧的localStorage存储
        localStorage.removeItem('tmdb_api_key');
      }
    } catch (error) {
      console.error('清除配置失败:', error);
    }
  }
  
  /**
   * 检查配置是否存在
   */
  static async hasConfig(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      return !!config.tmdbApiKey;
    } catch (error) {
      console.warn('检查配置失败:', error);
      return false;
    }
  }
  
  /**
   * 迁移旧的API密钥存储
   */
  static async migrateOldApiKey(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      const oldApiKey = localStorage.getItem('tmdb_api_key');
      if (oldApiKey && !(await this.hasConfig())) {
        await this.setTmdbApiKey(oldApiKey);
        localStorage.removeItem('tmdb_api_key');
        console.log('已迁移旧的API密钥到安全存储');
      }
    } catch (error) {
      console.error('迁移API密钥失败:', error);
    }
  }
}

// 自动迁移旧的API密钥
if (typeof window !== 'undefined') {
  SecureConfigManager.migrateOldApiKey();
}