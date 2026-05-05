import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '../auth-service'
import type { User } from '../auth-service'

vi.mock('@/lib/database/repositories/auth.repository', () => ({
  userRepository: {
    hasAdmin: vi.fn(),
    getAdmin: vi.fn(),
    getAdminAsync: vi.fn(),
    createUser: vi.fn(),
    updatePassword: vi.fn(),
    updateLastLogin: vi.fn(),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { userRepository } from '@/lib/database/repositories/auth.repository'

const mockUser: User = {
  id: 'test-user-id',
  username: 'admin',
  passwordHash: '$2a$12$mockhashmockhashmockhashmockhashmockhashmockhash',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  sessionExpiryDays: 15,
  loginCount: 1,
  totalUsageTime: 0,
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AuthService['_jwtSecret'] = null
    delete process.env.JWT_SECRET
    vi.stubEnv('NODE_ENV', 'test')
  })

  describe('register', () => {
    it('succeeds when no admin exists', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)
      vi.mocked(userRepository.createUser).mockReturnValue({ success: true, data: mockUser })

      const result = await AuthService.register('admin', 'StrongP@ss1')

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user!.username).toBe('admin')
      expect((result.user as any)?.passwordHash).toBeUndefined()
      expect(userRepository.createUser).toHaveBeenCalled()
    })

    it('fails when admin already exists', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(true)

      const result = await AuthService.register('admin', 'StrongP@ss1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('管理员账户已存在')
      expect(userRepository.createUser).not.toHaveBeenCalled()
    })

    it('fails with invalid username', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)

      const result = await AuthService.register('ab', 'StrongP@ss1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('用户名长度至少为3个字符')
    })

    it('fails with weak password', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)

      const result = await AuthService.register('admin', 'weak')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('fails when createUser returns failure', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)
      vi.mocked(userRepository.createUser).mockReturnValue({ success: false, error: '创建失败' })

      const result = await AuthService.register('admin', 'StrongP@ss1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('创建失败')
    })
  })

  describe('validateLogin', () => {
    it('succeeds with correct credentials', async () => {
      const hash = await import('bcryptjs').then(b => b.hash('Password1', 4))
      const userWithHash = { ...mockUser, passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)
      vi.mocked(userRepository.updateLastLogin).mockReturnValue({ success: true })

      const result = await AuthService.validateLogin('admin', 'Password1')

      expect(result).not.toBeNull()
      expect(result!.username).toBe('admin')
      expect(result!.lastLoginAt).toBeDefined()
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith(userWithHash.id, expect.any(String))
    })

    it('returns user with passwordHash for internal use', async () => {
      const hash = await import('bcryptjs').then(b => b.hash('Password1', 4))
      const userWithHash = { ...mockUser, passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)
      vi.mocked(userRepository.updateLastLogin).mockReturnValue({ success: true })

      const user = await AuthService.validateLogin('admin', 'Password1')

      expect(user).not.toBeNull()
      expect(user!.passwordHash).toBeDefined()
    })

    it('fails with wrong username', async () => {
      vi.mocked(userRepository.getAdmin).mockReturnValue(mockUser)

      const result = await AuthService.validateLogin('wronguser', 'Password1')

      expect(result).toBeNull()
    })

    it('fails with wrong password', async () => {
      const hash = await import('bcryptjs').then(b => b.hash('Password1', 4))
      const userWithHash = { ...mockUser, passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)

      const result = await AuthService.validateLogin('admin', 'WrongPassword1')

      expect(result).toBeNull()
    })

    it('fails when no admin user exists', async () => {
      vi.mocked(userRepository.getAdmin).mockReturnValue(null)

      const result = await AuthService.validateLogin('admin', 'Password1')

      expect(result).toBeNull()
    })
  })

  describe('generateToken', () => {
    it('generates a valid JWT', () => {
      const token = AuthService.generateToken(mockUser)

      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })

    it('generates token with correct payload', () => {
      const token = AuthService.generateToken(mockUser)
      const decoded = AuthService.verifyToken(token)

      expect(decoded).not.toBeNull()
      expect(decoded!.userId).toBe(mockUser.id)
      expect(decoded!.username).toBe(mockUser.username)
    })

    it('generates longer expiry with rememberMe', () => {
      const normalToken = AuthService.generateToken(mockUser, false)
      const rememberToken = AuthService.generateToken(mockUser, true)

      const normalDecoded = AuthService.verifyToken(normalToken)
      const rememberDecoded = AuthService.verifyToken(rememberToken)

      expect(rememberDecoded!.exp - rememberDecoded!.iat).toBeGreaterThan(
        normalDecoded!.exp - normalDecoded!.iat
      )
    })

    it('does not include passwordHash in token payload', () => {
      const token = AuthService.generateToken(mockUser)
      const parts = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString())

      expect(payload.passwordHash).toBeUndefined()
      expect(payload.userId).toBe(mockUser.id)
      expect(payload.username).toBe(mockUser.username)
    })
  })

  describe('verifyToken', () => {
    it('validates a correct token', () => {
      const token = AuthService.generateToken(mockUser)
      const decoded = AuthService.verifyToken(token)

      expect(decoded).not.toBeNull()
      expect(decoded!.userId).toBe(mockUser.id)
      expect(decoded!.username).toBe(mockUser.username)
      expect(decoded!.iat).toBeDefined()
      expect(decoded!.exp).toBeDefined()
    })

    it('returns null for invalid token', () => {
      const decoded = AuthService.verifyToken('invalid.token.string')

      expect(decoded).toBeNull()
    })

    it('returns null for empty token', () => {
      const decoded = AuthService.verifyToken('')

      expect(decoded).toBeNull()
    })

    it('returns null for expired token', async () => {
      process.env.JWT_SECRET = 'test-secret'
      AuthService['_jwtSecret'] = 'test-secret'
      const jwt = await import('jsonwebtoken')
      const expiredToken = jwt.sign(
        { userId: mockUser.id, username: mockUser.username },
        'test-secret',
        { expiresIn: -1 }
      )

      const decoded = AuthService.verifyToken(expiredToken)

      expect(decoded).toBeNull()
    })

    it('returns null when verified with wrong secret', () => {
      process.env.JWT_SECRET = 'secret-a'
      AuthService['_jwtSecret'] = 'secret-a'

      const token = AuthService.generateToken(mockUser)

      process.env.JWT_SECRET = 'secret-b'
      AuthService['_jwtSecret'] = 'secret-b'

      const decoded = AuthService.verifyToken(token)

      expect(decoded).toBeNull()
    })
  })

  describe('changePassword', () => {
    it('succeeds with correct current password', async () => {
      const hash = await import('bcryptjs').then(b => b.hash('OldPass1', 4))
      const userWithHash = { ...mockUser, passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)
      vi.mocked(userRepository.updatePassword).mockReturnValue({ success: true })

      const result = await AuthService.changePassword('OldPass1', 'NewPass1!')

      expect(result).toBe(true)
      expect(userRepository.updatePassword).toHaveBeenCalledWith(
        userWithHash.id,
        expect.any(String)
      )
    })

    it('fails with wrong current password', async () => {
      const hash = await import('bcryptjs').then(b => b.hash('OldPass1', 4))
      const userWithHash = { ...mockUser, passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)

      const result = await AuthService.changePassword('WrongPass1', 'NewPass1!')

      expect(result).toBe(false)
      expect(userRepository.updatePassword).not.toHaveBeenCalled()
    })

    it('fails with weak new password', async () => {
      const hash = await import('bcryptjs').then(b => b.hash('OldPass1', 4))
      const userWithHash = { ...mockUser, passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)

      const result = await AuthService.changePassword('OldPass1', 'weak')

      expect(result).toBe(false)
      expect(userRepository.updatePassword).not.toHaveBeenCalled()
    })

    it('fails when no admin exists', async () => {
      vi.mocked(userRepository.getAdmin).mockReturnValue(null)

      const result = await AuthService.changePassword('OldPass1', 'NewPass1!')

      expect(result).toBe(false)
    })
  })

  describe('hasAdmin', () => {
    it('returns true when admin exists', () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(true)

      expect(AuthService.hasAdmin()).toBe(true)
    })

    it('returns false when no admin exists', () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)

      expect(AuthService.hasAdmin()).toBe(false)
    })

    it('delegates to userRepository', () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(true)
      AuthService.hasAdmin()

      expect(userRepository.hasAdmin).toHaveBeenCalled()
    })
  })

  describe('getUser', () => {
    it('returns user without passwordHash', () => {
      vi.mocked(userRepository.getAdmin).mockReturnValue(mockUser)

      const user = AuthService.getUser()

      expect(user).not.toBeNull()
      expect(user!.id).toBe(mockUser.id)
      expect(user!.username).toBe(mockUser.username)
      expect((user as any)?.passwordHash).toBeUndefined()
    })

    it('returns null when no admin exists', () => {
      vi.mocked(userRepository.getAdmin).mockReturnValue(null)

      const user = AuthService.getUser()

      expect(user).toBeNull()
    })
  })

  describe('getSystemUserId', () => {
    it('returns the system user id', () => {
      expect(AuthService.getSystemUserId()).toBe('user_admin_system')
    })
  })

  describe('getUserIdFromRequest', () => {
    it('returns userId from valid request', async () => {
      const token = AuthService.generateToken(mockUser)
      vi.mocked(userRepository.getAdminAsync).mockResolvedValue(mockUser)

      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: token }),
        },
      } as any

      const userId = await AuthService.getUserIdFromRequest(mockRequest)

      expect(userId).toBe(mockUser.id)
    })

    it('returns null when no token in cookies', async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
        },
      } as any

      const userId = await AuthService.getUserIdFromRequest(mockRequest)

      expect(userId).toBeNull()
    })

    it('returns null for invalid token', async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: 'invalid-token' }),
        },
      } as any

      const userId = await AuthService.getUserIdFromRequest(mockRequest)

      expect(userId).toBeNull()
    })

    it('returns null when user does not exist', async () => {
      const token = AuthService.generateToken(mockUser)
      vi.mocked(userRepository.getAdminAsync).mockResolvedValue(null)

      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: token }),
        },
      } as any

      const userId = await AuthService.getUserIdFromRequest(mockRequest)

      expect(userId).toBeNull()
    })
  })

  describe('JWT密钥管理', () => {
    it('开发环境无JWT_SECRET时使用默认密钥', () => {
      vi.stubEnv('NODE_ENV', 'development')
      AuthService['_jwtSecret'] = null
      delete process.env.JWT_SECRET

      const token = AuthService.generateToken(mockUser)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    it('生产环境无JWT_SECRET时抛出错误', () => {
      vi.stubEnv('NODE_ENV', 'production')
      delete process.env.ELECTRON_BUILD
      AuthService['_jwtSecret'] = null
      delete process.env.JWT_SECRET

      expect(() => AuthService.generateToken(mockUser)).toThrow('JWT_SECRET environment variable is required')
    })

    it('Electron构建环境无JWT_SECRET时不抛出错误', () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('ELECTRON_BUILD', 'true')
      AuthService['_jwtSecret'] = null
      delete process.env.JWT_SECRET

      const token = AuthService.generateToken(mockUser)
      expect(token).toBeDefined()
    })

    it('密钥缓存后不重新读取环境变量', () => {
      process.env.JWT_SECRET = 'cached-secret'
      AuthService['_jwtSecret'] = null

      const token1 = AuthService.generateToken(mockUser)

      process.env.JWT_SECRET = 'new-secret'

      const decoded = AuthService.verifyToken(token1)
      expect(decoded).not.toBeNull()
    })
  })

  describe('Token安全测试', () => {
    it('篡改Token签名后验证失败', () => {
      const token = AuthService.generateToken(mockUser)
      const parts = token.split('.')
      const tamperedToken = parts[0] + '.' + parts[1] + '.tamoredsignature'

      const decoded = AuthService.verifyToken(tamperedToken)
      expect(decoded).toBeNull()
    })

    it('篡改Token载荷后验证失败', () => {
      const token = AuthService.generateToken(mockUser)
      const parts = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString())
      payload.userId = 'hacked-user-id'
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const tamperedToken = parts[0] + '.' + tamperedPayload + '.' + parts[2]

      const decoded = AuthService.verifyToken(tamperedToken)
      expect(decoded).toBeNull()
    })

    it('Token不包含敏感信息', () => {
      const token = AuthService.generateToken(mockUser)
      const parts = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString())

      expect(payload.passwordHash).toBeUndefined()
      expect(payload.userId).toBe(mockUser.id)
      expect(payload.username).toBe(mockUser.username)
    })

    it('Token包含iat和exp', () => {
      const token = AuthService.generateToken(mockUser)
      const decoded = AuthService.verifyToken(token)

      expect(decoded!.iat).toBeDefined()
      expect(decoded!.exp).toBeDefined()
      expect(decoded!.exp).toBeGreaterThan(decoded!.iat)
    })
  })

  describe('validateLogin边界条件', () => {
    it('用户名大小写敏感', async () => {
      const hash = await import('bcryptjs').then(b => b.hash('Password1', 4))
      const userWithHash = { ...mockUser, username: 'Admin', passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)
      vi.mocked(userRepository.updateLastLogin).mockReturnValue({ success: true })

      const result = await AuthService.validateLogin('admin', 'Password1')
      expect(result).toBeNull()
    })

    it('用户名前后空格不自动trim', async () => {
      const hash = await import('bcryptjs').then(b => b.hash('Password1', 4))
      const userWithHash = { ...mockUser, passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)

      const result = await AuthService.validateLogin(' admin ', 'Password1')
      expect(result).toBeNull()
    })

    it('密码包含特殊字符时正确验证', async () => {
      const specialPassword = 'P@$$w0rd!<>"\'&'
      const hash = await import('bcryptjs').then(b => b.hash(specialPassword, 4))
      const userWithHash = { ...mockUser, passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)
      vi.mocked(userRepository.updateLastLogin).mockReturnValue({ success: true })

      const result = await AuthService.validateLogin('admin', specialPassword)
      expect(result).not.toBeNull()
    })

    it('bcrypt比较异常时返回null', async () => {
      vi.mocked(userRepository.getAdmin).mockReturnValue({
        ...mockUser,
        passwordHash: 'invalid-hash-format',
      })

      const result = await AuthService.validateLogin('admin', 'Password1')
      expect(result).toBeNull()
    })

    it('登录成功后更新lastLoginAt', async () => {
      const hash = await import('bcryptjs').then(b => b.hash('Password1', 4))
      const userWithHash = { ...mockUser, passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)
      vi.mocked(userRepository.updateLastLogin).mockReturnValue({ success: true })

      const result = await AuthService.validateLogin('admin', 'Password1')

      expect(userRepository.updateLastLogin).toHaveBeenCalledWith(
        userWithHash.id,
        expect.any(String)
      )
      const lastLoginAt = result!.lastLoginAt
      expect(lastLoginAt).toBeDefined()
      expect(new Date(lastLoginAt!).getTime()).not.toBeNaN()
    })
  })

  describe('register边界条件', () => {
    it('用户名恰好3个字符时注册成功', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)
      vi.mocked(userRepository.createUser).mockReturnValue({ success: true, data: mockUser })

      const result = await AuthService.register('abc', 'StrongP@ss1')
      expect(result.success).toBe(true)
    })

    it('用户名恰好20个字符时注册成功', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)
      vi.mocked(userRepository.createUser).mockReturnValue({ success: true, data: mockUser })

      const result = await AuthService.register('a'.repeat(20), 'StrongP@ss1')
      expect(result.success).toBe(true)
    })

    it('密码恰好6个字符时注册成功', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)
      vi.mocked(userRepository.createUser).mockReturnValue({ success: true, data: mockUser })

      const result = await AuthService.register('admin', 'abcdef')
      expect(result.success).toBe(true)
    })

    it('用户名包含下划线时注册成功', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)
      vi.mocked(userRepository.createUser).mockReturnValue({ success: true, data: mockUser })

      const result = await AuthService.register('admin_user', 'StrongP@ss1')
      expect(result.success).toBe(true)
    })

    it('用户名包含数字时注册成功', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)
      vi.mocked(userRepository.createUser).mockReturnValue({ success: true, data: mockUser })

      const result = await AuthService.register('admin123', 'StrongP@ss1')
      expect(result.success).toBe(true)
    })

    it('注册返回的用户不包含passwordHash', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)
      vi.mocked(userRepository.createUser).mockReturnValue({ success: true, data: mockUser })

      const result = await AuthService.register('admin', 'StrongP@ss1')
      expect((result.user as any)?.passwordHash).toBeUndefined()
    })

    it('createUser返回无error时使用默认错误消息', async () => {
      vi.mocked(userRepository.hasAdmin).mockReturnValue(false)
      vi.mocked(userRepository.createUser).mockReturnValue({ success: false })

      const result = await AuthService.register('admin', 'StrongP@ss1')
      expect(result.error).toBe('注册失败')
    })
  })

  describe('changePassword边界条件', () => {
    it('updatePassword返回失败时返回false', async () => {
      const hash = await import('bcryptjs').then(b => b.hash('OldPass1', 4))
      const userWithHash = { ...mockUser, passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)
      vi.mocked(userRepository.updatePassword).mockReturnValue({ success: false })

      const result = await AuthService.changePassword('OldPass1', 'NewPass1!')
      expect(result).toBe(false)
    })

    it('新密码与旧密码相同时仍允许修改', async () => {
      const hash = await import('bcryptjs').then(b => b.hash('SamePass1', 4))
      const userWithHash = { ...mockUser, passwordHash: hash }
      vi.mocked(userRepository.getAdmin).mockReturnValue(userWithHash)
      vi.mocked(userRepository.updatePassword).mockReturnValue({ success: true })

      const result = await AuthService.changePassword('SamePass1', 'SamePass1')
      expect(result).toBe(true)
    })
  })

  describe('generateToken边界条件', () => {
    it('rememberMe=true时Token过期时间是rememberMe=false的两倍', () => {
      const normalToken = AuthService.generateToken(mockUser, false)
      const rememberToken = AuthService.generateToken(mockUser, true)

      const normalDecoded = AuthService.verifyToken(normalToken)!
      const rememberDecoded = AuthService.verifyToken(rememberToken)!

      const normalDuration = normalDecoded.exp - normalDecoded.iat
      const rememberDuration = rememberDecoded.exp - rememberDecoded.iat

      expect(rememberDuration).toBe(normalDuration * 2)
    })

    it('自定义sessionExpiryDays的Token过期时间正确', () => {
      const customUser = { ...mockUser, sessionExpiryDays: 30 }
      const token = AuthService.generateToken(customUser, false)
      const decoded = AuthService.verifyToken(token)!

      const durationSeconds = decoded.exp - decoded.iat
      expect(durationSeconds).toBe(30 * 24 * 60 * 60)
    })
  })

  describe('verifyToken边界条件', () => {
    it('null token返回null', () => {
      const decoded = AuthService.verifyToken(null as any)
      expect(decoded).toBeNull()
    })

    it('undefined token返回null', () => {
      const decoded = AuthService.verifyToken(undefined as any)
      expect(decoded).toBeNull()
    })

    it('纯数字token返回null', () => {
      const decoded = AuthService.verifyToken('12345')
      expect(decoded).toBeNull()
    })

    it('仅两个部分的token返回null', () => {
      const decoded = AuthService.verifyToken('part1.part2')
      expect(decoded).toBeNull()
    })

    it('包含四个部分的token返回null', () => {
      const decoded = AuthService.verifyToken('a.b.c.d')
      expect(decoded).toBeNull()
    })
  })
})
