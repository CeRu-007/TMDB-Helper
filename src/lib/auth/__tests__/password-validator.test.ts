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

  describe('安全场景', () => {
    it('拒绝SQL注入用户名', () => {
      const result = validateUsername("admin'; DROP TABLE users;--")
      expect(result.valid).toBe(false)
    })

    it('拒绝包含路径遍历的用户名', () => {
      const result = validateUsername('../etc/passwd')
      expect(result.valid).toBe(false)
    })

    it('拒绝包含Unicode字符的用户名', () => {
      const result = validateUsername('用户名')
      expect(result.valid).toBe(false)
    })

    it('拒绝包含emoji的用户名', () => {
      const result = validateUsername('admin🎉')
      expect(result.valid).toBe(false)
    })

    it('拒绝包含null字符的用户名', () => {
      const result = validateUsername('admin\x00user')
      expect(result.valid).toBe(false)
    })

    it('拒绝包含换行符的用户名', () => {
      const result = validateUsername('admin\nuser')
      expect(result.valid).toBe(false)
    })

    it('拒绝包含制表符的用户名', () => {
      const result = validateUsername('admin\tuser')
      expect(result.valid).toBe(false)
    })

    it('拒绝以数字开头的用户名', () => {
      const result = validateUsername('1admin')
      expect(result.valid).toBe(true)
    })

    it('接受纯数字用户名', () => {
      const result = validateUsername('12345')
      expect(result.valid).toBe(true)
    })

    it('接受纯下划线用户名', () => {
      const result = validateUsername('___')
      expect(result.valid).toBe(true)
    })
  })

  describe('边界长度', () => {
    it('2个字符的用户名被拒绝', () => {
      const result = validateUsername('ab')
      expect(result.valid).toBe(false)
    })

    it('3个字符的用户名被接受', () => {
      const result = validateUsername('abc')
      expect(result.valid).toBe(true)
    })

    it('20个字符的用户名被接受', () => {
      const result = validateUsername('a'.repeat(20))
      expect(result.valid).toBe(true)
    })

    it('21个字符的用户名被拒绝', () => {
      const result = validateUsername('a'.repeat(21))
      expect(result.valid).toBe(false)
    })

    it('超长用户名被拒绝', () => {
      const result = validateUsername('a'.repeat(1000))
      expect(result.valid).toBe(false)
    })
  })
})

describe('validatePassword安全场景', () => {
  it('包含null字符的密码通过长度检查', () => {
    const result = validatePassword('a\x00b\x00c\x00d\x00e\x00f')
    expect(result.checks.minLength).toBe(true)
  })

  it('仅包含特殊字符的长密码有效', () => {
    const result = validatePassword('!@#$%^')
    expect(result.valid).toBe(true)
    expect(result.checks.hasSpecial).toBe(true)
    expect(result.checks.hasUppercase).toBe(false)
    expect(result.checks.hasLowercase).toBe(false)
    expect(result.checks.hasNumber).toBe(false)
  })

  it('包含所有字符类型的密码强度为strong', () => {
    const result = validatePassword('Abc123!')
    expect(result.valid).toBe(true)
    expect(result.strength).toBe('strong')
    expect(result.checks.minLength).toBe(true)
    expect(result.checks.hasUppercase).toBe(true)
    expect(result.checks.hasLowercase).toBe(true)
    expect(result.checks.hasNumber).toBe(true)
    expect(result.checks.hasSpecial).toBe(true)
  })

  it('密码强度计算：仅minLength和hasLowercase为weak', () => {
    const result = validatePassword('abcdef')
    expect(result.strength).toBe('weak')
    expect(result.checks.minLength).toBe(true)
    expect(result.checks.hasLowercase).toBe(true)
  })

  it('密码强度计算：3项通过为medium', () => {
    const result = validatePassword('Abcdef')
    expect(result.strength).toBe('medium')
    expect(result.checks.minLength).toBe(true)
    expect(result.checks.hasUppercase).toBe(true)
    expect(result.checks.hasLowercase).toBe(true)
  })

  it('超长密码有效', () => {
    const result = validatePassword('A'.repeat(1000) + 'a1!')
    expect(result.valid).toBe(true)
    expect(result.strength).toBe('strong')
  })

  it('常见弱密码有效但强度低', () => {
    const result = validatePassword('password')
    expect(result.valid).toBe(true)
    expect(result.strength).toBe('weak')
  })

  it('常见数字密码有效但强度低', () => {
    const result = validatePassword('123456')
    expect(result.valid).toBe(true)
    expect(result.strength).toBe('weak')
  })

  it('特殊字符完整覆盖测试', () => {
    const specialChars = '!@#$%^&*()_+-=[]{};\':"\\|,.<>/?'
    const result = validatePassword('Aa1' + specialChars)
    expect(result.checks.hasSpecial).toBe(true)
  })

  it('空格不算特殊字符', () => {
    const result = validatePassword('Aa1   ')
    expect(result.checks.hasSpecial).toBe(false)
  })

  it('恰好5个字符的密码无效', () => {
    const result = validatePassword('Aa1! ')
    expect(result.valid).toBe(false)
  })

  it('恰好6个字符的密码有效', () => {
    const result = validatePassword('abcdef')
    expect(result.valid).toBe(true)
  })
})
