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
  private static _jwtSecret: string | null = null;
  private static readonly DEFAULT_SESSION_EXPIRY_DAYS = 15;
  private static readonly ADMIN_USER_ID = 'admin';

  /**
   * 获取 JWT Secret，强制要求在生产环境中配置
   */
  private static getJwtSecret(): string {
    // 使用缓存避免重复计算
    if (AuthManager._jwtSecret !== null) {
      return AuthManager._jwtSecret;
    }

    const secret = process.env.JWT_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!secret) {
      if (isProduction) {
        throw new Error(
          'JWT_SECRET environment variable is required in production. ' +
          'Please set a strong, random secret key.'
        );
      }
      // 开发环境使用警告但允许运行（仅用于开发）
      console.warn(
        'WARNING: Using default JWT_SECRET for development only. ' +
        'Set JWT_SECRET environment variable for production use.'
      );
      AuthManager._jwtSecret = 'tmdb-helper-dev-secret-change-in-production';
      return AuthManager._jwtSecret;
    }

    // 检查是否使用了默认的弱密钥
    if (secret === 'tmdb-helper-default-secret-change-in-production') {
      if (isProduction) {
        throw new Error(
          'JWT_SECRET must be changed from the default value in production. ' +
          'Please set a strong, random secret key.'
        );
      }
      console.warn(
        'WARNING: Using default JWT_SECRET. This is insecure for production.'
      );
    }

    AuthManager._jwtSecret = secret;
    return AuthManager._jwtSecret;
  }

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
      const user = JSON.parse(data) as Partial<AdminUser>;
      // 兼容旧数据：补全或修正 sessionExpiryDays
      if (!user.sessionExpiryDays || isNaN(Number(user.sessionExpiryDays)) || Number(user.sessionExpiryDays) <= 0) {
        // 使用默认会话天数
        const fixed: AdminUser = {
          id: (user.id as string) || AuthManager.ADMIN_USER_ID,
          username: (user.username as string) || 'admin',
          passwordHash: (user.passwordHash as string) || '',
          createdAt: (user.createdAt as string) || new Date().toISOString(),
          lastLoginAt: user.lastLoginAt,
          sessionExpiryDays: AuthManager.getSessionExpiryDays(),
        }
        // 立即回写修复后的用户数据
        AuthManager.saveAdminUser(fixed)
        return fixed
      }
      return user as AdminUser;
    } catch (error) {
      
      return null;
    }
  }

  /**
   * 保存管理员用户信息（同步）
   */
  private static saveAdminUser(user: AdminUser): boolean {
    AuthManager.ensureAuthDir();
    try {
      fs.writeFileSync(AuthManager.AUTH_FILE, JSON.stringify(user, null, 2), 'utf-8');
      return true;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * 保存管理员用户信息（异步，非阻塞）
   */
  private static async saveAdminUserAsync(user: AdminUser): Promise<boolean> {
    AuthManager.ensureAuthDir();
    try {
      await fs.promises.writeFile(AuthManager.AUTH_FILE, JSON.stringify(user, null, 2), 'utf-8')
      return true;
    } catch (error) {
      
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
        // 更新最后登录时间（异步写盘，避免阻塞）
        adminUser.lastLoginAt = new Date().toISOString();
        void AuthManager.saveAdminUserAsync(adminUser);
        return adminUser;
      }
    } catch (error) {
      
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

    return jwt.sign(payload, AuthManager.getJwtSecret(), { expiresIn });
  }

  /**
   * 验证JWT Token
   */
  static verifyToken(token: string): AuthToken | null {
    try {
      const decoded = jwt.verify(token, AuthManager.getJwtSecret()) as AuthToken;
      return decoded;
    } catch (error) {

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
   * 行为：
   * - 若不存在管理员用户：
   *   - 生产环境：必须使用环境变量创建
   *   - 开发环境：优先使用环境变量，否则使用默认 admin/admin
   * - 若已存在管理员用户且提供了环境变量：
   *   - 如 ADMIN_FORCE_OVERRIDE=true，或用户名不同，或密码不同，则用环境变量覆盖并保存
   */
  static async initializeFromEnv(): Promise<boolean> {
    const envUsername = process.env.ADMIN_USERNAME;
    const envPassword = process.env.ADMIN_PASSWORD;
    const forceOverride = (process.env.ADMIN_FORCE_OVERRIDE || '').toLowerCase() === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
  
    // 已存在用户时，根据环境变量决定是否覆盖
    if (AuthManager.hasAdminUser()) {
      if (envUsername || envPassword) {
        const current = AuthManager.readAdminUser()
        if (current) {
          let needOverride = forceOverride
          let nextUsername = current.username
          let nextPasswordHash = current.passwordHash
  
          if (!needOverride) {
            try {
              const usernameDiffers = !!envUsername && current.username !== envUsername
              const passwordDiffers = !!envPassword && !(await bcrypt.compare(envPassword, current.passwordHash))
              needOverride = usernameDiffers || passwordDiffers
            } catch {
              needOverride = true
            }
          }
  
          if (needOverride) {
  
            if (envUsername) nextUsername = envUsername
            if (envPassword) nextPasswordHash = await bcrypt.hash(envPassword, 12)
  
            const updated: AdminUser = {
              ...current,
              id: AuthManager.ADMIN_USER_ID,
              username: nextUsername,
              passwordHash: nextPasswordHash,
              sessionExpiryDays: current.sessionExpiryDays && current.sessionExpiryDays > 0
                ? current.sessionExpiryDays
                : AuthManager.getSessionExpiryDays(),
            }
            void AuthManager.saveAdminUserAsync(updated)
          }
        }
      }
      return true
    }
  
    // 不存在用户：根据环境决定创建方式
    if (!envUsername || !envPassword) {
      if (isProduction) {
        // 生产环境必须配置环境变量
        throw new Error(
          'ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required in production. ' +
          'Please set these variables to initialize the admin user.'
        );
      }
  
      // 开发环境使用默认凭据
      console.warn(
        'WARNING: Creating default admin user (admin/admin) for development. ' +
        'Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables for production use.'
      );
      return await AuthManager.createAdminUser('admin', 'admin');
    }
  
    // 使用环境变量创建
    return await AuthManager.createAdminUser(envUsername, envPassword);
  }  /**
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
