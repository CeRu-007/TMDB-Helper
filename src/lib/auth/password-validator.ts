export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  strength: PasswordStrength;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
}

const MIN_PASSWORD_LENGTH = 6;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function validatePassword(password: string): PasswordValidationResult {
  const checks = {
    minLength: password.length >= MIN_PASSWORD_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const metCount = Object.values(checks).filter(Boolean).length;
  let strength: PasswordStrength;
  if (metCount <= 2) strength = 'weak';
  else if (metCount <= 3) strength = 'medium';
  else strength = 'strong';

  const valid = checks.minLength;
  let error: string | undefined;
  if (!checks.minLength) error = '密码长度至少为6位';

  return error
    ? { valid, error, strength, checks }
    : { valid, strength, checks };
}

export function validateUsername(username: string): UsernameValidationResult {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: '用户名不能为空' };
  }
  if (username.length < MIN_USERNAME_LENGTH) {
    return { valid: false, error: `用户名长度至少为${MIN_USERNAME_LENGTH}个字符` };
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    return { valid: false, error: `用户名长度不能超过${MAX_USERNAME_LENGTH}个字符` };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { valid: false, error: '用户名只能包含字母、数字和下划线' };
  }
  return { valid: true };
}
