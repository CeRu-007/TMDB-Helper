// Authentication types
// Extracted to avoid circular dependencies between auth-provider and hooks

export interface AuthUser {
  id: string
  username: string
  lastLoginAt?: string
}