import { ApiResponse, AsyncState, PaginatedResponse } from '../common'
export * from './auth'

// API Request/Response types
export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  data?: unknown
  params?: Record<string, string | number>
  headers?: Record<string, string>
  timeout?: number
}

export interface ApiClient {
  request<T>(config: ApiRequestConfig): Promise<ApiResponse<T>>
  get<T>(url: string, params?: Record<string, string | number>): Promise<ApiResponse<T>>
  post<T>(url: string, data?: unknown): Promise<ApiResponse<T>>
  put<T>(url: string, data?: unknown): Promise<ApiResponse<T>>
  delete<T>(url: string): Promise<ApiResponse<T>>
}

// HTTP Status codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503
}

// API Error types
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: ValidationError[]
    timestamp: number
  }
}

// Streaming API types
export interface StreamChunk {
  type: 'data' | 'error' | 'done'
  content?: string
  error?: string
}

export interface StreamingResponse {
  stream: ReadableStream<StreamChunk>
  controller: AbortController
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

// Authentication types
export interface AuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

export interface AuthUser {
  id: string
  username: string
  email?: string
  role: string
  permissions: string[]
  lastLogin: number
}

// Request middleware types
export interface RequestMiddleware {
  onRequest?: (config: ApiRequestConfig) => ApiRequestConfig
  onResponse?: <T>(response: ApiResponse<T>) => ApiResponse<T>
  onError?: (error: unknown) => unknown
}

// Cache types
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

export interface CacheConfig {
  ttl: number
  maxSize: number
  strategy: 'lru' | 'fifo' | 'lfu'
}

// WebSocket types
export interface WebSocketMessage {
  type: string
  payload: unknown
  id?: string
  timestamp: number
}

export interface WebSocketClient {
  connect(): Promise<void>
  disconnect(): void
  send(message: WebSocketMessage): void
  subscribe(event: string, handler: (message: WebSocketMessage) => void): () => void
  isConnected: boolean
}

// File upload types
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number
  timeRemaining: number
}

export interface UploadConfig {
  file: File
  url: string
  field?: string
  metadata?: Record<string, unknown>
  onProgress?: (progress: UploadProgress) => void
  chunkSize?: number
  retries?: number
}

// Batch request types
export interface BatchRequest {
  id: string
  config: ApiRequestConfig
  dependencies?: string[]
}

export interface BatchResponse<T = unknown> {
  id: string
  success: boolean
  data?: T
  error?: string
  duration: number
}

export interface BatchResult {
  total: number
  successful: number
  failed: number
  duration: number
  responses: BatchResponse[]
}