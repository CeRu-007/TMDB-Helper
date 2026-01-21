// Common utility types used throughout the application

export type ID = string
export type Timestamp = number
export type ISOString = string

export interface BaseEntity {
  id: ID
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PaginationParams {
  page: number
  limit: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: Timestamp
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  timestamp: Timestamp
}

export interface SearchParams {
  query?: string
  filters?: Record<string, unknown>
  sort?: {
    field: string
    order: 'asc' | 'desc'
  }
  pagination?: PaginationParams
}

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
  metadata?: Record<string, unknown>
}

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
}

export type SortDirection = 'asc' | 'desc'
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  loading: LoadingState
  error: string | null
}

// Event types
export interface BaseEvent {
  type: string
  timestamp: Timestamp
  payload?: Record<string, unknown>
}

// Configuration types
export interface ConfigEntry {
  key: string
  value: unknown
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  readonly?: boolean
}

// File types
export interface FileInfo {
  name: string
  size: number
  type: string
  lastModified: Timestamp
  path?: string
}

// Status types
export type Status = 'active' | 'inactive' | 'pending' | 'error' | 'completed'

// Theme types
export type Theme = 'light' | 'dark' | 'system'

// Language types
export type Language = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR'

// Platform types
export type Platform = 'windows' | 'macos' | 'linux' | 'docker' | 'web'