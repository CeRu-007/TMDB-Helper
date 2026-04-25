import { describe, it, expect } from 'vitest'
import { validatePassword, validateUsername } from '../password-validator'

describe('validatePassword', () => {
  describe('weak passwords', () => {
    it('rejects password that is too short', () => {
      const result = validatePassword('Ab1')
      expect(result.valid).toBe(false)
      expect(result.strength).toBe('medium')
      expect(result.error).toBe('密码长度至少为8位')
      expect(result.checks.minLength).toBe(false)
    })

    it('rejects password with no uppercase letter', () => {
      const result = validatePassword('abcdefgh1')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('密码需包含大写字母')
      expect(result.checks.hasUppercase).toBe(false)
    })

    it('rejects password with no lowercase letter', () => {
      const result = validatePassword('ABCDEFGH1')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('密码需包含小写字母')
      expect(result.checks.hasLowercase).toBe(false)
    })

    it('rejects password with no number', () => {
      const result = validatePassword('Abcdefgh')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('密码需包含数字')
      expect(result.checks.hasNumber).toBe(false)
    })

    it('rejects password with only lowercase', () => {
      const result = validatePassword('abcdefgh')
      expect(result.valid).toBe(false)
      expect(result.strength).toBe('weak')
    })
  })

  describe('medium passwords', () => {
    it('accepts password meeting minimum criteria without special chars', () => {
      const result = validatePassword('Abcdefg1')
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('strong')
      expect(result.checks.hasSpecial).toBe(false)
      expect(result.error).toBeUndefined()
    })

    it('classifies 4 checks met as strong', () => {
      const result = validatePassword('Abcdefg1!')
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('strong')
      expect(result.checks.hasSpecial).toBe(true)
    })
  })

  describe('strong passwords', () => {
    it('accepts password meeting all criteria', () => {
      const result = validatePassword('Abcdefg1!')
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('strong')
      expect(result.checks.minLength).toBe(true)
      expect(result.checks.hasUppercase).toBe(true)
      expect(result.checks.hasLowercase).toBe(true)
      expect(result.checks.hasNumber).toBe(true)
      expect(result.checks.hasSpecial).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('accepts complex password with various special chars', () => {
      const result = validatePassword('MyP@ssw0rd!')
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('strong')
    })
  })

  describe('boundary values', () => {
    it('accepts password with exactly 8 characters meeting all criteria', () => {
      const result = validatePassword('Abcd1234')
      expect(result.valid).toBe(true)
      expect(result.checks.minLength).toBe(true)
    })

    it('rejects password with exactly 7 characters', () => {
      const result = validatePassword('Abcd123')
      expect(result.valid).toBe(false)
      expect(result.checks.minLength).toBe(false)
    })

    it('rejects empty password', () => {
      const result = validatePassword('')
      expect(result.valid).toBe(false)
      expect(result.strength).toBe('weak')
      expect(result.checks.minLength).toBe(false)
    })
  })

  describe('check details', () => {
    it('reports correct check results for mixed input', () => {
      const result = validatePassword('aB1')
      expect(result.checks.minLength).toBe(false)
      expect(result.checks.hasUppercase).toBe(true)
      expect(result.checks.hasLowercase).toBe(true)
      expect(result.checks.hasNumber).toBe(true)
      expect(result.checks.hasSpecial).toBe(false)
    })
  })
})

describe('validateUsername', () => {
  describe('valid usernames', () => {
    it('accepts valid alphanumeric username', () => {
      const result = validateUsername('admin')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('accepts username with underscores', () => {
      const result = validateUsername('admin_user')
      expect(result.valid).toBe(true)
    })

    it('accepts username with numbers', () => {
      const result = validateUsername('admin123')
      expect(result.valid).toBe(true)
    })

    it('accepts username at minimum length (3 chars)', () => {
      const result = validateUsername('abc')
      expect(result.valid).toBe(true)
    })

    it('accepts username at maximum length (20 chars)', () => {
      const result = validateUsername('a'.repeat(20))
      expect(result.valid).toBe(true)
    })
  })

  describe('invalid usernames', () => {
    it('rejects empty username', () => {
      const result = validateUsername('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('用户名不能为空')
    })

    it('rejects whitespace-only username', () => {
      const result = validateUsername('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('用户名不能为空')
    })

    it('rejects username that is too short (2 chars)', () => {
      const result = validateUsername('ab')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('用户名长度至少为3个字符')
    })

    it('rejects username that is too long (21 chars)', () => {
      const result = validateUsername('a'.repeat(21))
      expect(result.valid).toBe(false)
      expect(result.error).toBe('用户名长度不能超过20个字符')
    })

    it('rejects username with special characters', () => {
      const result = validateUsername('admin@user')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('用户名只能包含字母、数字和下划线')
    })

    it('rejects username with spaces', () => {
      const result = validateUsername('admin user')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('用户名只能包含字母、数字和下划线')
    })

    it('rejects username with hyphens', () => {
      const result = validateUsername('admin-user')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('用户名只能包含字母、数字和下划线')
    })

    it('rejects username with angle brackets (XSS)', () => {
      const result = validateUsername('admin<script>')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('用户名只能包含字母、数字和下划线')
    })
  })
})
