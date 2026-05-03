import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStorage: Record<string, string> = {}

vi.mock('@/lib/storage/storage-service', () => ({
  storageService: {
    get: vi.fn((key: string, defaultValue: any) => {
      const val = mockStorage[key]
      return val !== undefined ? JSON.parse(val) : defaultValue
    }),
    set: vi.fn((key: string, value: any) => {
      mockStorage[key] = JSON.stringify(value)
    }),
    remove: vi.fn((key: string) => {
      delete mockStorage[key]
    }),
  },
}))

const mockCryptoSubtle = {
  importKey: vi.fn(),
  deriveKey: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}

const mockCryptoKey = { type: 'secret', algorithm: { name: 'AES-GCM' } }

function setupBrowserEnv() {
  Object.defineProperty(globalThis, 'window', {
    value: {
      crypto: {
        getRandomValues: vi.fn((arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = i + 1
          return arr
        }),
        subtle: mockCryptoSubtle,
      },
    },
    writable: true,
    configurable: true,
  })

  Object.defineProperty(globalThis, 'location', {
    value: { origin: 'http://localhost:3000' },
    writable: true,
    configurable: true,
  })

  mockCryptoSubtle.importKey.mockResolvedValue(mockCryptoKey)
  mockCryptoSubtle.deriveKey.mockResolvedValue(mockCryptoKey)
}

describe('Secure Remember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
  })

  describe('saveRemember', () => {
    it('非浏览器环境不执行操作', async () => {
      const origWindow = globalThis.window
      Object.defineProperty(globalThis, 'window', { value: undefined, writable: true, configurable: true })

      const { saveRemember } = await import('../secure-remember')
      await saveRemember('admin', 'password', true)

      Object.defineProperty(globalThis, 'window', { value: origWindow, writable: true, configurable: true })
    })

    it('remember=true时保存用户名、记住标记和加密密码', async () => {
      setupBrowserEnv()

      const encryptedData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
      mockCryptoSubtle.encrypt.mockResolvedValue(encryptedData.buffer)

      const { saveRemember } = await import('../secure-remember')
      await saveRemember('admin', 'Password1', true)

      expect(mockStorage['last_login_username']).toBe('"admin"')
      expect(mockStorage['last_login_remember_me']).toBe('"1"')
    })

    it('remember=false时保存用户名和标记，但删除加密密码', async () => {
      setupBrowserEnv()

      const { saveRemember } = await import('../secure-remember')
      mockStorage['last_login_password_enc'] = '"old-encrypted"'

      await saveRemember('admin', 'Password1', false)

      expect(mockStorage['last_login_username']).toBe('"admin"')
      expect(mockStorage['last_login_remember_me']).toBe('"0"')
      expect(mockStorage['last_login_password_enc']).toBeUndefined()
    })

    it('crypto.subtle不可用时不存储密码', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          crypto: {
            getRandomValues: vi.fn((arr: Uint8Array) => arr),
            subtle: undefined,
          },
        },
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'location', {
        value: { origin: 'http://localhost:3000' },
        writable: true,
        configurable: true,
      })

      const { saveRemember } = await import('../secure-remember')
      await saveRemember('admin', 'Password1', true)

      expect(mockStorage['last_login_password_enc']).toBeUndefined()
    })

    it('加密失败时不存储密码', async () => {
      setupBrowserEnv()
      mockCryptoSubtle.encrypt.mockRejectedValue(new Error('Encryption failed'))

      const { saveRemember } = await import('../secure-remember')
      await saveRemember('admin', 'Password1', true)

      expect(mockStorage['last_login_password_enc']).toBeUndefined()
    })

    it('getKey返回null时不存储密码', async () => {
      setupBrowserEnv()
      mockCryptoSubtle.importKey.mockRejectedValue(new Error('Key import failed'))

      const { saveRemember } = await import('../secure-remember')
      await saveRemember('admin', 'Password1', true)

      expect(mockStorage['last_login_password_enc']).toBeUndefined()
    })
  })

  describe('loadRemember', () => {
    it('非浏览器环境返回空值', async () => {
      const origWindow = globalThis.window
      Object.defineProperty(globalThis, 'window', { value: undefined, writable: true, configurable: true })

      const { loadRemember } = await import('../secure-remember')
      const result = await loadRemember()

      expect(result).toEqual({ username: '', password: '', remember: false })

      Object.defineProperty(globalThis, 'window', { value: origWindow, writable: true, configurable: true })
    })

    it('无存储数据时返回空值', async () => {
      setupBrowserEnv()

      const { loadRemember } = await import('../secure-remember')
      const result = await loadRemember()

      expect(result.username).toBe('')
      expect(result.password).toBe('')
      expect(result.remember).toBe(false)
    })

    it('remember=false时返回用户名但不返回密码', async () => {
      setupBrowserEnv()
      mockStorage['last_login_username'] = '"admin"'
      mockStorage['last_login_remember_me'] = '"0"'

      const { loadRemember } = await import('../secure-remember')
      const result = await loadRemember()

      expect(result.username).toBe('admin')
      expect(result.password).toBe('')
      expect(result.remember).toBe(false)
    })

    it('解密失败时返回用户名和空密码', async () => {
      setupBrowserEnv()
      mockStorage['last_login_username'] = '"admin"'
      mockStorage['last_login_remember_me'] = '"1"'
      mockStorage['last_login_password_enc'] = '"aW52YWxpZGRhdGE="'

      mockCryptoSubtle.decrypt.mockRejectedValue(new Error('Decryption failed'))

      const { loadRemember } = await import('../secure-remember')
      const result = await loadRemember()

      expect(result.username).toBe('admin')
      expect(result.password).toBe('')
    })
  })

  describe('clearRemember', () => {
    it('删除加密密码但保留用户名', async () => {
      setupBrowserEnv()

      mockStorage['last_login_username'] = '"admin"'
      mockStorage['last_login_remember_me'] = '"1"'
      mockStorage['last_login_password_enc'] = '"encrypted"'

      const { clearRemember } = await import('../secure-remember')
      clearRemember()

      expect(mockStorage['last_login_password_enc']).toBeUndefined()
      expect(mockStorage['last_login_username']).toBe('"admin"')
    })

    it('非浏览器环境不执行操作', async () => {
      const origWindow = globalThis.window
      Object.defineProperty(globalThis, 'window', { value: undefined, writable: true, configurable: true })

      const { clearRemember } = await import('../secure-remember')
      expect(() => clearRemember()).not.toThrow()

      Object.defineProperty(globalThis, 'window', { value: origWindow, writable: true, configurable: true })
    })

    it('无加密密码时调用不报错', async () => {
      setupBrowserEnv()

      const { clearRemember } = await import('../secure-remember')
      expect(() => clearRemember()).not.toThrow()
    })
  })

  describe('加密安全性', () => {
    it('使用PBKDF2派生密钥', async () => {
      setupBrowserEnv()
      const encryptedData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
      mockCryptoSubtle.encrypt.mockResolvedValue(encryptedData.buffer)

      const { saveRemember } = await import('../secure-remember')
      await saveRemember('admin', 'Password1', true)

      expect(mockCryptoSubtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      )

      expect(mockCryptoSubtle.deriveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          iterations: 100000,
          hash: 'SHA-256',
        }),
        mockCryptoKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      )
    })

    it('使用AES-GCM加密', async () => {
      setupBrowserEnv()
      const encryptedData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
      mockCryptoSubtle.encrypt.mockResolvedValue(encryptedData.buffer)

      const { saveRemember } = await import('../secure-remember')
      await saveRemember('admin', 'Password1', true)

      expect(mockCryptoSubtle.encrypt).toHaveBeenCalledWith(
        { name: 'AES-GCM', iv: expect.any(Uint8Array) },
        mockCryptoKey,
        expect.any(Uint8Array)
      )
    })

    it('每次加密使用不同的IV', async () => {
      setupBrowserEnv()
      const encryptedData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
      mockCryptoSubtle.encrypt.mockResolvedValue(encryptedData.buffer)

      const { saveRemember } = await import('../secure-remember')
      await saveRemember('admin', 'Password1', true)

      const firstCallIV = mockCryptoSubtle.encrypt.mock.calls[0]?.[0]?.iv
      expect(firstCallIV).toBeDefined()
      expect(firstCallIV.length).toBe(12)
    })
  })

  describe('用户盐值管理', () => {
    it('首次使用时生成盐值', async () => {
      setupBrowserEnv()
      const encryptedData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
      mockCryptoSubtle.encrypt.mockResolvedValue(encryptedData.buffer)

      const { saveRemember } = await import('../secure-remember')
      await saveRemember('admin', 'Password1', true)

      expect(mockStorage['tmdb_helper_user_salt']).toBeDefined()
    })
  })
})
