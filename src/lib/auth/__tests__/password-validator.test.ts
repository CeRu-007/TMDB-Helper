import { describe, it, expect } from 'vitest'
import { validatePassword, validateUsername } from '../password-validator'

describe('validatePassword', () => {
  describe('weak passwords', () => {
    it('rejects password that is too short', () => {
      const result = validatePassword('Ab1')
      expect(result.valid).toBe(false)
      expect(result.strength).toBe('medium')
      expect(result.error).toBe('密码长度至少为6位')
      expect(result.checks.minLength).toBe(false)
    })

    it('rejects password with exactly 5 characters', () => {
      const result = validatePassword('abcde')
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

  describe('valid passwords', () => {
    it('accepts password with exactly 6 characters', () => {
      const result = validatePassword('abcdef')
      expect(result.valid).toBe(true)
      expect(result.checks.minLength).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('accepts password with only lowercase letters', () => {
      const result = validatePassword('abcdefgh')
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('weak')
      expect(result.error).toBeUndefined()
    })

    it('accepts password with only uppercase letters', () => {
      const result = validatePassword('ABCDEFGH')
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('weak')
      expect(result.error).toBeUndefined()
    })

    it('accepts password with only numbers', () => {
      const result = validatePassword('12345678')
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('weak')
      expect(result.error).toBeUndefined()
    })

    it('accepts password with mixed case and numbers', () => {
      const result = validatePassword('Abcdefg1')
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('strong')
      expect(result.error).toBeUndefined()
    })

    it('accepts password with special characters', () => {
      const result = validatePassword('MyP@ssw0rd!')
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('strong')
    })
  })

  describe('strength levels', () => {
    it('classifies only minLength met as weak', () => {
      const result = validatePassword('abcdefgh')
      expect(result.strength).toBe('weak')
    })

    it('classifies 2-3 checks met as medium', () => {
      const result = validatePassword('Abcdefgh')
      expect(result.strength).toBe('medium')
    })

    it('classifies 4+ checks met as strong', () => {
      const result = validatePassword('Abcdefg1!')
      expect(result.strength).toBe('strong')
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
