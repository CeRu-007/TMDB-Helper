import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/utils/logger';
import { authRepository } from '@/lib/database/repositories/auth.repository';

// Constants
const DEFAULT_SESSION_EXPIRY_DAYS = 15;
const ADMIN_USER_ID = 'admin';
const BCRYPT_ROUNDS = 12;
const DEFAULT_DEV_SECRET = 'tmdb-helper-dev-secret-change-in-production';
const DEFAULT_PROD_SECRET = 'tmdb-helper-default-secret-change-in-production';

// Types
export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
  sessionExpiryDays: number;
}

export interface AuthToken {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

// Auth Manager Class
export class AuthManager {
  private static _jwtSecret: string | null = null;

  private static getJwtSecret(): string {
    if (this._jwtSecret !== null) {
      return this._jwtSecret;
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
      logger.warn(
        'WARNING: Using default JWT_SECRET for development only. ' +
        'Set JWT_SECRET environment variable for production use.'
      );
      this._jwtSecret = DEFAULT_DEV_SECRET;
      return this._jwtSecret;
    }

    if (secret === DEFAULT_PROD_SECRET) {
      if (isProduction) {
        throw new Error(
          'JWT_SECRET must be changed from the default value in production. ' +
          'Please set a strong, random secret key.'
        );
      }
      logger.warn('WARNING: Using default JWT_SECRET. This is insecure for production.');
    }

    this._jwtSecret = secret;
    return this._jwtSecret;
  }

  private static getSessionExpiryDays(): number {
    const envValue = process.env.SESSION_EXPIRY_DAYS;
    if (envValue) {
      const parsed = parseInt(envValue, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return DEFAULT_SESSION_EXPIRY_DAYS;
  }

  private static readAdminUser(): AdminUser | null {
    return authRepository.getAdmin();
  }

  private static saveAdminUser(user: AdminUser): boolean {
    const result = authRepository.upsertAdmin(user);
    return result.success;
  }

  private static async saveAdminUserAsync(user: AdminUser): Promise<boolean> {
    return this.saveAdminUser(user);
  }

  static async createAdminUser(username: string, password: string): Promise<boolean> {
    try {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const adminUser: AdminUser = {
        id: ADMIN_USER_ID,
        username,
        passwordHash,
        createdAt: new Date().toISOString(),
        sessionExpiryDays: this.getSessionExpiryDays()
      };

      return this.saveAdminUser(adminUser);
    } catch {
      return false;
    }
  }

  static async validateLogin(username: string, password: string): Promise<AdminUser | null> {
    const adminUser = this.readAdminUser();

    if (!adminUser || adminUser.username !== username) {
      return null;
    }

    try {
      const isValid = await bcrypt.compare(password, adminUser.passwordHash);
      if (isValid) {
        adminUser.lastLoginAt = new Date().toISOString();
        void this.saveAdminUserAsync(adminUser);
        return adminUser;
      }
    } catch {
      // Silently handle errors
    }

    return null;
  }

  static generateToken(user: AdminUser, rememberMe: boolean = false): string {
    const expiryDays = rememberMe ? user.sessionExpiryDays * 2 : user.sessionExpiryDays;
    const expiresIn = `${expiryDays}d`;

    const payload: Omit<AuthToken, 'iat' | 'exp'> = {
      userId: user.id,
      username: user.username
    };

    return jwt.sign(payload, this.getJwtSecret(), { expiresIn });
  }

  static verifyToken(token: string): AuthToken | null {
    try {
      return jwt.verify(token, this.getJwtSecret()) as AuthToken;
    } catch {
      return null;
    }
  }

  static hasAdminUser(): boolean {
    return this.readAdminUser() !== null;
  }

  static getAdminUser(): Omit<AdminUser, 'passwordHash'> | null {
    const adminUser = this.readAdminUser();
    if (!adminUser) {
      return null;
    }

    const { passwordHash, ...userInfo } = adminUser;
    return userInfo;
  }

  static async initializeFromEnv(): Promise<boolean> {
    const envUsername = process.env.ADMIN_USERNAME;
    const envPassword = process.env.ADMIN_PASSWORD;
    const forceOverride = (process.env.ADMIN_FORCE_OVERRIDE || '').toLowerCase() === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    // Handle existing user
    if (this.hasAdminUser()) {
      if (!envUsername && !envPassword) {
        return true;
      }

      const current = this.readAdminUser();
      if (!current) {
        return false;
      }

      let needOverride = forceOverride;
      let nextUsername = current.username;
      let nextPasswordHash = current.passwordHash;

      if (!needOverride) {
        try {
          const usernameDiffers = !!envUsername && current.username !== envUsername;
          const passwordDiffers = !!envPassword && !(await bcrypt.compare(envPassword, current.passwordHash));
          needOverride = usernameDiffers || passwordDiffers;
        } catch {
          needOverride = true;
        }
      }

      if (needOverride) {
        if (envUsername) nextUsername = envUsername;
        if (envPassword) nextPasswordHash = await bcrypt.hash(envPassword, BCRYPT_ROUNDS);

        const updated: AdminUser = {
          ...current,
          id: ADMIN_USER_ID,
          username: nextUsername,
          passwordHash: nextPasswordHash,
          sessionExpiryDays: current.sessionExpiryDays && current.sessionExpiryDays > 0
            ? current.sessionExpiryDays
            : this.getSessionExpiryDays(),
        };
        void this.saveAdminUserAsync(updated);
      }
      return true;
    }

    // Create new user
    if (!envUsername || !envPassword) {
      if (isProduction) {
        const isDocker = process.env.DOCKER_CONTAINER === 'true';
        if (isDocker) {
          const isFirstTime = !this.hasAdminUser();
          if (isFirstTime) {
            logger.info('========================================');
            logger.info('🚀 TMDB Helper Docker 首次部署成功!');
            logger.info('📋 默认管理员账号信息:');
            logger.info('   用户名: admin');
            logger.info('   密码: admin');
            logger.info('⚠️  请首次登录后立即修改密码!');
            logger.info('========================================');
          }
          return await this.createAdminUser('admin', 'admin');
        }

        throw new Error(
          'ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required in production. ' +
          'Please set these variables to initialize the admin user.'
        );
      }

      logger.warn(
        'WARNING: Creating default admin user (admin/admin) for development. ' +
        'Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables for production use.'
      );
      return await this.createAdminUser('admin', 'admin');
    }

    return await this.createAdminUser(envUsername, envPassword);
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const adminUser = this.readAdminUser();
    if (!adminUser) {
      return false;
    }

    try {
      const isCurrentValid = await bcrypt.compare(currentPassword, adminUser.passwordHash);
      if (!isCurrentValid) {
        return false;
      }

      adminUser.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      return this.saveAdminUser(adminUser);
    } catch {
      return false;
    }
  }

  static getSystemUserId(): string {
    return 'user_admin_system';
  }
}