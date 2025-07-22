import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

/**
 * 管理员用户接口
 */
export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
  sessionExpiryDays: number;
}

/**
 * JWT Token Payload
 */
export interface AuthToken {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

/**
 * 登录请求接口
 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * 认证管理器 - 处理用户认证和会话管理
 */
export class AuthManager {
  private static readonly AUTH_DIR = path.join(process.cwd(), 'data', 'auth');
  private static readonly AUTH_FILE = path.join(AuthManager.AUTH_DIR, 'admin.json');
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'tmdb-helper-default-secret-change-in-production';
  private static readonly DEFAULT_SESSION_EXPIRY_DAYS = 7;
  private static readonly ADMIN_USER_ID = 'admin';

  /**
   * 确保认证目录存在
   */
  private static ensureAuthDir(): void {
    if (!fs.existsSync(AuthManager.AUTH_DIR)) {
      fs.mkdirSync(AuthManager.AUTH_DIR, { recursive: true });
    }
  }

  /**
   * 获取会话有效期（天）
   */
  private static getSessionExpiryDays(): number {
    const envValue = process.env.SESSION_EXPIRY_DAYS;
    if (envValue) {
      const parsed = parseInt(envValue, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return AuthManager.DEFAULT_SESSION_EXPIRY_DAYS;
  }

  /**
   * 读取管理员用户信息
   */
  private static readAdminUser(): AdminUser | null {
    AuthManager.ensureAuthDir();
    
    if (!fs.existsSync(AuthManager.AUTH_FILE)) {
      return null;
    }

    try {
      const data = fs.readFileSync(AuthManager.AUTH_FILE, 'utf-8');
      return JSON.parse(data) as AdminUser;
    } catch (error) {
      console.error('读取管理员用户信息失败:', error);
      return null;
    }
  }

  /**
   * 保存管理员用户信息
   */
  private static saveAdminUser(user: AdminUser): boolean {
    AuthManager.ensureAuthDir();
    
    try {
      fs.writeFileSync(AuthManager.AUTH_FILE, JSON.stringify(user, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('保存管理员用户信息失败:', error);
      return false;
    }
  }

  /**
   * 创建管理员用户
   */
  static async createAdminUser(username: string, password: string): Promise<boolean> {
    try {
      const passwordHash = await bcrypt.hash(password, 12);
      
      const adminUser: AdminUser = {
        id: AuthManager.ADMIN_USER_ID,
        username,
        passwordHash,
        createdAt: new Date().toISOString(),
        sessionExpiryDays: AuthManager.getSessionExpiryDays()
      };

      return AuthManager.saveAdminUser(adminUser);
    } catch (error) {
      console.error('创建管理员用户失败:', error);
      return false;
    }
  }

  /**
   * 验证用户登录
   */
  static async validateLogin(username: string, password: string): Promise<AdminUser | null> {
    const adminUser = AuthManager.readAdminUser();
    
    if (!adminUser) {
      return null;
    }

    if (adminUser.username !== username) {
      return null;
    }

    try {
      const isValid = await bcrypt.compare(password, adminUser.passwordHash);
      if (isValid) {
        // 更新最后登录时间
        adminUser.lastLoginAt = new Date().toISOString();
        AuthManager.saveAdminUser(adminUser);
        return adminUser;
      }
    } catch (error) {
      console.error('密码验证失败:', error);
    }

    return null;
  }

  /**
   * 生成JWT Token
   */
  static generateToken(user: AdminUser, rememberMe: boolean = false): string {
    const expiryDays = rememberMe ? user.sessionExpiryDays * 2 : user.sessionExpiryDays;
    const expiresIn = `${expiryDays}d`;

    const payload: Omit<AuthToken, 'iat' | 'exp'> = {
      userId: user.id,
      username: user.username
    };

    return jwt.sign(payload, AuthManager.JWT_SECRET, { expiresIn });
  }

  /**
   * 验证JWT Token
   */
  static verifyToken(token: string): AuthToken | null {
    try {
      const decoded = jwt.verify(token, AuthManager.JWT_SECRET) as AuthToken;
      return decoded;
    } catch (error) {
      console.error('Token验证失败:', error);
      return null;
    }
  }

  /**
   * 检查是否存在管理员用户
   */
  static hasAdminUser(): boolean {
    return AuthManager.readAdminUser() !== null;
  }

  /**
   * 获取管理员用户信息（不包含密码）
   */
  static getAdminUser(): Omit<AdminUser, 'passwordHash'> | null {
    const adminUser = AuthManager.readAdminUser();
    if (!adminUser) {
      return null;
    }

    const { passwordHash, ...userInfo } = adminUser;
    return userInfo;
  }

  /**
   * 初始化管理员用户（从环境变量）
   */
  static async initializeFromEnv(): Promise<boolean> {
    // 如果已存在管理员用户，跳过初始化
    if (AuthManager.hasAdminUser()) {
      return true;
    }

    const envUsername = process.env.ADMIN_USERNAME;
    const envPassword = process.env.ADMIN_PASSWORD;

    if (envUsername && envPassword) {
      console.log('从环境变量初始化管理员用户...');
      return await AuthManager.createAdminUser(envUsername, envPassword);
    }

    // 创建默认管理员用户
    console.log('创建默认管理员用户 (admin/admin)...');
    console.warn('⚠️  请在生产环境中修改默认密码！');
    return await AuthManager.createAdminUser('admin', 'admin');
  }

  /**
   * 更改管理员密码
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const adminUser = AuthManager.readAdminUser();
    if (!adminUser) {
      return false;
    }

    try {
      // 验证当前密码
      const isCurrentValid = await bcrypt.compare(currentPassword, adminUser.passwordHash);
      if (!isCurrentValid) {
        return false;
      }

      // 生成新密码哈希
      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      adminUser.passwordHash = newPasswordHash;

      return AuthManager.saveAdminUser(adminUser);
    } catch (error) {
      console.error('更改密码失败:', error);
      return false;
    }
  }

  /**
   * 获取用于现有用户系统的用户ID
   * 将管理员映射到固定的用户ID
   */
  static getSystemUserId(): string {
    return 'user_admin_system';
  }
}
