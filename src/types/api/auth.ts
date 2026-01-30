import { BaseEntity } from "../common"

// Authentication types
export interface User extends BaseEntity {
  username: string
  email: string
  password: string // hashed
  role: UserRole
  profile: UserProfile
  preferences: UserPreferences
  isActive: boolean
  lastLoginAt?: number
  loginAttempts: number
  lockedUntil?: number
}

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  VIEWER = "viewer",
}

export interface UserProfile {
  firstName?: string
  lastName?: string
  avatar?: string
  timezone: string
  language: string
  bio?: string
}

export interface UserPreferences {
  theme: "light" | "dark" | "system"
  language: string
  notifications: NotificationPreferences
  privacy: PrivacyPreferences
  ui: UIPreferences
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  taskCompletion: boolean
  systemAlerts: boolean
  securityAlerts: boolean
}

export interface PrivacyPreferences {
  profileVisibility: "public" | "private"
  activityVisibility: boolean
  dataCollection: boolean
  analytics: boolean
}

export interface UIPreferences {
  layout: "sidebar" | "topbar"
  pageSize: number
  showHiddenFiles: boolean
  compactMode: boolean
}

export interface LoginRequest {
  username: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  user: User
  tokens: AuthTokens
  expiresIn: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresAt: number
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  confirmPassword: string
  profile: Partial<UserProfile>
}

export interface PasswordChangeRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface AuthSession {
  id: string
  userId: string
  token: string
  expiresAt: number
  isActive: boolean
  ipAddress: string
  userAgent: string
  createdAt: number
  lastAccessAt: number
}