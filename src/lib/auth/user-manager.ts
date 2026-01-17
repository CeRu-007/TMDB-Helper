"use client"

import { v4 as uuidv4 } from "uuid";
import { storageService } from "../storage/storage-service";

/**
 * 用户管理器 - 处理用户身份识别和会话管理
 */

export interface UserInfo {
  userId: string;
  displayName: string;
  avatarUrl?: string; // 用户头像URL（网络地址）
  createdAt: string;
  lastActiveAt: string;
  fingerprint: string;
  stats?: {
    loginCount: number;
    totalUsageTime: number; // 总使用时间（分钟）
    lastSessionStart: string;
    featuresUsed: string[];
  };
}

export class UserManager {
  private static readonly USER_ID_KEY = "tmdb_helper_user_id";
  private static readonly USER_INFO_KEY = "tmdb_helper_user_info";
  private static readonly SESSION_COOKIE_NAME = "tmdb_helper_session";
  
  /**
   * 检查当前环境是否为客户端
   */
  static isClient(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /**
   * 生成浏览器指纹
   */
  private static generateFingerprint(): string {
    if (!this.isClient()) {
      return 'server-' + Date.now();
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Browser fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0,
    ].join('|');
    
    // 生成简短的哈希
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * 设置管理员用户ID（用于认证系统）
   */
  static setAdminUserId(): void {
    if (!this.isClient()) {
      return;
    }

    const adminUserId = 'user_admin_system';
    storageService.set(this.USER_ID_KEY, adminUserId);
    this.setCookie(this.SESSION_COOKIE_NAME, adminUserId, 365);
  }

  /**
   * 获取或创建用户ID
   */
  static getUserId(): string {
    if (!this.isClient()) {
      return 'anonymous';
    }

    // 首先尝试从 localStorage 获取
    let userId = localStorage.getItem(this.USER_ID_KEY);

    if (!userId) {
      // 尝试从 cookie 获取
      userId = this.getCookie(this.SESSION_COOKIE_NAME);
    }

    if (!userId) {
      // 生成新的用户ID
      userId = 'user_' + uuidv4().replace(/-/g, '').substring(0, 16);

      // 保存到 localStorage 和 cookie
      storageService.set(this.USER_ID_KEY, userId);
      this.setCookie(this.SESSION_COOKIE_NAME, userId, 365); // 保存1年
    }

    return userId;
  }

  /**
   * 获取用户信息
   */
  static getUserInfo(): UserInfo {
    if (!this.isClient()) {
      return {
        userId: 'anonymous',
        displayName: '匿名用户',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        fingerprint: 'server'
      };
    }

    const userId = this.getUserId();
    const fingerprint = this.generateFingerprint();
    
    // 尝试从 localStorage 获取用户信息
    const storedInfo = localStorage.getItem(this.USER_INFO_KEY);
    
    if (storedInfo) {
      try {
        const userInfo = JSON.parse(storedInfo) as UserInfo;
        // 更新最后活跃时间
        userInfo.lastActiveAt = new Date().toISOString();
        userInfo.fingerprint = fingerprint;
        localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
        return userInfo;
      } catch (error) {
        
      }
    }

    // 创建新的用户信息
    const newUserInfo: UserInfo = {
      userId,
      displayName: `用户${userId.substring(5, 11)}`,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      fingerprint,
      stats: {
        loginCount: 1,
        totalUsageTime: 0,
        lastSessionStart: new Date().toISOString(),
        featuresUsed: []
      }
    };

    localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(newUserInfo));
    return newUserInfo;
  }

  /**
   * 更新用户显示名称
   */
  static updateDisplayName(displayName: string): boolean {
    if (!this.isClient()) {
      return false;
    }

    try {
      const userInfo = this.getUserInfo();
      userInfo.displayName = displayName;
      userInfo.lastActiveAt = new Date().toISOString();
      localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
      return true;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * 更新用户头像URL
   */
  static updateAvatarUrl(avatarUrl: string): boolean {
    if (!this.isClient()) {
      return false;
    }

    try {
      const userInfo = this.getUserInfo();
      userInfo.avatarUrl = avatarUrl;
      userInfo.lastActiveAt = new Date().toISOString();
      localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
      return true;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * 清除用户数据（重置用户）
   */
  static clearUserData(): void {
    if (!this.isClient()) {
      return;
    }

    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.USER_INFO_KEY);
    this.deleteCookie(this.SESSION_COOKIE_NAME);
  }

  /**
   * 设置 Cookie
   */
  private static setCookie(name: string, value: string, days: number): void {
    if (!this.isClient()) {
      return;
    }

    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  /**
   * 获取 Cookie
   */
  private static getCookie(name: string): string | null {
    if (!this.isClient()) {
      return null;
    }

    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    
    return null;
  }

  /**
   * 删除 Cookie
   */
  private static deleteCookie(name: string): void {
    if (!this.isClient()) {
      return;
    }

    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  /**
   * 验证用户会话
   */
  static validateSession(): boolean {
    if (!this.isClient()) {
      return false;
    }

    const userId = this.getUserId();
    const userInfo = this.getUserInfo();
    
    // 检查用户ID是否有效
    if (!userId || userId === 'anonymous') {
      return false;
    }

    // 检查指纹是否匹配（简单的安全检查）
    const currentFingerprint = this.generateFingerprint();
    if (userInfo.fingerprint !== currentFingerprint) {
      
      // 更新指纹而不是拒绝会话
      userInfo.fingerprint = currentFingerprint;
      localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
    }

    return true;
  }

  /**
   * 获取用户数据文件名
   */
  static getUserDataFileName(): string {
    const userId = this.getUserId();
    return `tmdb_items_${userId}.json`;
  }

  /**
   * 获取用户任务文件名
   */
  static getUserTaskFileName(): string {
    const userId = this.getUserId();
    return `tmdb_tasks_${userId}.json`;
  }

  /**
   * 记录功能使用
   */
  static recordFeatureUsage(feature: string): void {
    if (!this.isClient()) return;

    try {
      const userInfo = this.getUserInfo();
      if (!userInfo.stats) {
        userInfo.stats = {
          loginCount: 1,
          totalUsageTime: 0,
          lastSessionStart: new Date().toISOString(),
          featuresUsed: []
        };
      }

      // 添加功能到使用记录（避免重复）
      if (!userInfo.stats.featuresUsed.includes(feature)) {
        userInfo.stats.featuresUsed.push(feature);
      }

      // 更新最后活跃时间
      userInfo.lastActiveAt = new Date().toISOString();

      localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
    } catch (error) {
      
    }
  }

  /**
   * 更新使用时长
   */
  static updateUsageTime(): void {
    if (!this.isClient()) return;

    try {
      const userInfo = this.getUserInfo();
      if (!userInfo.stats) return;

      const sessionStart = new Date(userInfo.stats.lastSessionStart).getTime();
      const now = new Date().getTime();
      const sessionTime = Math.floor((now - sessionStart) / (1000 * 60)); // 分钟

      userInfo.stats.totalUsageTime += sessionTime;
      userInfo.stats.lastSessionStart = new Date().toISOString();
      userInfo.lastActiveAt = new Date().toISOString();

      localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
    } catch (error) {
      
    }
  }
}
