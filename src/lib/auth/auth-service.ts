import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logger';
import { userRepository } from '@/lib/database/repositories/auth.repository';
import { validatePassword, validateUsername } from './password-validator';

const DEFAULT_SESSION_EXPIRY_DAYS = 15;
const BCRYPT_ROUNDS = 12;
const DEFAULT_DEV_SECRET = 'tmdb-helper-dev-secret-change-in-production';
const DEFAULT_PROD_SECRET = 'tmdb-helper-default-secret-change-in-production';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | undefined;
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

export class AuthService {
  private static _jwtSecret: string | null = null;

  private static getJwtSecret(): string {
    if (this._jwtSecret !== null) {
      return this._jwtSecret;
    }

    const secret = process.env.JWT_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';
    const isElectron = process.env.ELECTRON_BUILD === 'true';

    if (!secret) {
      if (isProduction && !isElectron) {
        throw new Error(
          'JWT_SECRET environment variable is required in production. ' +
          'Please set a strong, random secret key.'
        );
      }
      logger.warn(
        'WARNING: Using default JWT_SECRET for %s only. ' +
        'Set JWT_SECRET environment variable for production use.',
        isElectron ? 'Electron desktop' : 'development'
      );
      this._jwtSecret = DEFAULT_DEV_SECRET;
      return this._jwtSecret;
    }

    if (secret === DEFAULT_PROD_SECRET) {
      if (isProduction && !isElectron) {
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

  static async register(username: string, password: string): Promise<{ success: boolean; user?: Omit<User, 'passwordHash'>; error?: string }> {
    if (userRepository.hasAdmin()) {
      return { success: false, error: '管理员账户已存在' };
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return { success: false, error: usernameValidation.error! };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.error! };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const now = new Date().toISOString();
    const user: User = {
      id: uuidv4(),
      username,
      passwordHash,
      createdAt: now,
      updatedAt: now,
      sessionExpiryDays: this.getSessionExpiryDays(),
    };

    const result = userRepository.createUser(user as import('@/lib/database/repositories/auth.repository').User);
    if (!result.success) {
      return { success: false, error: result.error || '注册失败' };
    }

    const { passwordHash: _, ...userInfo } = user;
    return { success: true, user: userInfo };
  }

  static async validateLogin(username: string, password: string): Promise<User | null> {
    const user = userRepository.getAdmin();

    if (!user || user.username !== username) {
      return null;
    }

    try {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (isValid) {
        const lastLoginAt = new Date().toISOString();
        userRepository.updateLastLogin(user.id, lastLoginAt);
        return { ...user, lastLoginAt };
      }
    } catch {
    }

    return null;
  }

  static generateToken(user: User | Omit<User, 'passwordHash'>, rememberMe: boolean = false): string {
    const expiryDays = rememberMe ? user.sessionExpiryDays * 2 : user.sessionExpiryDays;

    const payload: object = {
      userId: user.id,
      username: user.username
    };

    const secret: jwt.Secret = this.getJwtSecret();

    return jwt.sign(payload, secret, { expiresIn: expiryDays * 24 * 60 * 60 });
  }

  static verifyToken(token: string): AuthToken | null {
    try {
      return jwt.verify(token, this.getJwtSecret()) as AuthToken;
    } catch {
      return null;
    }
  }

  static hasAdmin(): boolean {
    return userRepository.hasAdmin();
  }

  static getUser(): Omit<User, 'passwordHash'> | null {
    const user = userRepository.getAdmin();
    if (!user) {
      return null;
    }

    const { passwordHash: _, ...userInfo } = user;
    return userInfo as Omit<User, 'passwordHash'>;
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const user = userRepository.getAdmin();
    if (!user) return false;

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) return false;

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) return false;

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    return userRepository.updatePassword(user.id, newPasswordHash).success;
  }

  static getSystemUserId(): string {
    return 'user_admin_system';
  }

  static async getUserIdFromRequest(request: import('next/server').NextRequest): Promise<string | null> {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;
    const decoded = this.verifyToken(token);
    if (!decoded) return null;
    const user = await userRepository.getAdminAsync();
    if (!user) return null;
    return decoded.userId;
  }
}
