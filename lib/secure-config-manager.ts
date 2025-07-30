/**
 * 安全配置管理器
 * 用于管理敏感配置信息，如API密钥等
 */

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
   * 保存配置到安全存储
   */
  static saveConfig(config: SecureConfig): void {
    try {
      const configData: EncryptedData = {
        data: this.encrypt(JSON.stringify(config)),
        timestamp: Date.now(),
        version: this.VERSION
      };
      
      // 优先使用sessionStorage，其次localStorage
      const storage = typeof window !== 'undefined' ? 
        (window.sessionStorage || window.localStorage) : null;
      
      if (storage) {
        storage.setItem(this.STORAGE_KEY, JSON.stringify(configData));
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      throw new Error('配置保存失败');
    }
  }
  
  /**
   * 从安全存储读取配置
   */
  static getConfig(): SecureConfig {
    try {
      if (typeof window === 'undefined') {
        return this.getServerConfig();
      }
      
      const storage = window.sessionStorage || window.localStorage;
      const storedData = storage.getItem(this.STORAGE_KEY);
      
      if (!storedData) {
        return {};
      }
      
      const encryptedData: EncryptedData = JSON.parse(storedData);
      
      // 检查数据是否过期
      if (Date.now() - encryptedData.timestamp > this.CACHE_EXPIRY) {
        this.clearConfig();
        return {};
      }
      
      const decryptedData = this.decrypt(encryptedData.data);
      return JSON.parse(decryptedData) as SecureConfig;
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
        parseInt(process.env.SESSION_EXPIRY_DAYS) : 7
    };
  }
  
  /**
   * 获取TMDB API密钥
   */
  static getTmdbApiKey(): string {
    const config = this.getConfig();
    
    // 优先使用配置中的密钥，其次使用环境变量
    const apiKey = config.tmdbApiKey || process.env.TMDB_API_KEY;
    
    if (!apiKey) {
      throw new Error('TMDB API密钥未配置，请在设置中配置或设置环境变量TMDB_API_KEY');
    }
    
    return apiKey;
  }
  
  /**
   * 设置TMDB API密钥
   */
  static setTmdbApiKey(apiKey: string): void {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API密钥不能为空');
    }
    
    const config = this.getConfig();
    config.tmdbApiKey = apiKey.trim();
    this.saveConfig(config);
  }
  
  /**
   * 验证API密钥格式
   */
  static validateApiKey(apiKey: string): boolean {
    // TMDB API密钥通常是32位十六进制字符串
    const tmdbKeyPattern = /^[a-f0-9]{32}$/i;
    return tmdbKeyPattern.test(apiKey);
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
  static hasConfig(): boolean {
    const config = this.getConfig();
    return !!config.tmdbApiKey;
  }
  
  /**
   * 迁移旧的API密钥存储
   */
  static migrateOldApiKey(): void {
    try {
      if (typeof window === 'undefined') return;
      
      const oldApiKey = localStorage.getItem('tmdb_api_key');
      if (oldApiKey && !this.hasConfig()) {
        this.setTmdbApiKey(oldApiKey);
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