export interface AuthUser {
  id: string
  username: string
  lastLoginAt?: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export type PasswordStrength = 'weak' | 'medium' | 'strong'

export interface PasswordValidationResult {
  valid: boolean
  error?: string
  strength: PasswordStrength
  checks: {
    minLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
    hasSpecial: boolean
  }
}
