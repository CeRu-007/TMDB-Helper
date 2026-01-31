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
        const response = await fetch('/api/system/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: `secure_${key}`,
            value: this.encrypt(JSON.stringify(value))
          })
        });

        if (!response.ok) {
          throw new Error(`保存配置项 ${key} 失败`);
        }
      }
    } catch (error) {
      
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
      const response = await fetch('/api/system/config');
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
                
              }
            }
          }
        }
      }

      return config;
    } catch (error) {
      
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
  
  static async getTmdbApiKey(): Promise<string> {
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      throw new Error('TMDB API密钥未配置');
    }

    return apiKey;
  }

  static clearConfig(): void {
    try {
      if (typeof window !== 'undefined') {
        const storage = window.sessionStorage || window.localStorage;
        storage.removeItem(this.STORAGE_KEY);
        
        // 同时清除旧的localStorage存储
        localStorage.removeItem('tmdb_api_key');
      }
    } catch (error) {
      
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
      
      return false;
    }
  }
  
  /**
   * 迁移旧的API密钥存储
   */
  // 迁移功能已移除，TMDB API Key 现在使用内置官方 API
}