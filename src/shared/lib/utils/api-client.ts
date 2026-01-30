/**
 * 统一API客户端
 * 提供请求拦截、响应处理、缓存管理等功能
 */

import { log } from '@/lib/utils/logger'
import { handleError, retryOperation } from '@/lib/utils/error-handler'
import { INTERVAL_5MIN } from '@/lib/constants/constants'

export interface ApiConfig {
  baseURL?: string
  timeout?: number
  retries?: number
  cache?: boolean
}

export interface ApiResponse<T = unknown> {
  data: T
  success: boolean
  message?: string
  error?: string
}

class ApiClient {
  private static instance: ApiClient
  private config: ApiConfig
  private cache: Map<string, { data: unknown; timestamp: number; ttl: number }> = new Map()

  private constructor(config: ApiConfig = {}) {
    this.config = {
      timeout: 30000,
      retries: 3,
      cache: true,
      ...config
    }
  }

  static getInstance(config?: ApiConfig): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(config)
    }
    return ApiClient.instance
  }

  private getCacheKey(url: string, params?: Record<string, any>): string {
    return `${url}${params ? '?' + new URLSearchParams(params).toString() : ''}`
  }

  private getFromCache(key: string): unknown | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      log.debug('ApiClient', `缓存命中: ${key}`)
      return cached.data
    }
    if (cached) {
      this.cache.delete(key)
    }
    return null
  }

  private setCache(key: string, data: unknown, ttl: number = INTERVAL_5MIN): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  async request<T = any>(
    url: string,
    options: RequestInit & { 
      params?: Record<string, any>
      cache?: boolean
      cacheTTL?: number
    } = {}
  ): Promise<ApiResponse<T>> {
    const { params, cache = this.config.cache, cacheTTL, ...fetchOptions } = options
    
    // 构建完整URL
    let fullUrl = url
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      fullUrl += `?${searchParams.toString()}`
    }

    const cacheKey = this.getCacheKey(url, params)

    // 检查缓存（仅GET请求）
    if (cache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      const response = await retryOperation(
        () => fetch(fullUrl, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers
          }
        }),
        this.config.retries,
        1000,
        true
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const result: ApiResponse<T> = {
        data: data.data || data,
        success: data.success !== false,
        message: data.message,
        error: data.error
      }

      // 缓存成功的GET请求
      if (cache && (!fetchOptions.method || fetchOptions.method === 'GET') && result.success) {
        this.setCache(cacheKey, result, cacheTTL)
      }

      log.debug('ApiClient', `请求成功: ${url}`, { status: response.status })
      return result

    } catch (error) {
      const appError = handleError(error, { url, params })
      log.error('ApiClient', `请求失败: ${url}`, appError)
      
      return {
        data: null as T,
        success: false,
        error: appError.userMessage
      }
    }
  }

  // 便捷方法
  async get<T = any>(url: string, params?: Record<string, any>, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET', params })
  }

  async post<T = unknown>(url: string, data?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      cache: false
    })
  }

  async put<T = unknown>(url: string, data?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      cache: false
    })
  }

  async delete<T = any>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE', cache: false })
  }

  // 清除缓存
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern)
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
    log.info('ApiClient', `缓存已清除${pattern ? ` (模式: ${pattern})` : ''}`)
  }
}

// 导出单例实例
export const apiClient = ApiClient.getInstance()

// TMDB API 专用客户端
export class TMDBApiClient {
  private client: ApiClient

  constructor() {
    this.client = ApiClient.getInstance()
  }

  async getUpcoming(region: string = 'CN'): Promise<ApiResponse<any[]>> {
    return this.client.get('/api/tmdb/upcoming', {
      region
    })
  }

  async getRecent(region: string = 'CN'): Promise<ApiResponse<any[]>> {
    return this.client.get('/api/tmdb/recent', {
      region
    })
  }

  async searchMovie(query: string): Promise<ApiResponse<any[]>> {
    return this.client.get('/api/tmdb/search/movie', {
      query
    })
  }

  async searchTV(query: string): Promise<ApiResponse<any[]>> {
    return this.client.get('/api/tmdb/search/tv', {
      query
    })
  }
}

export const tmdbApi = new TMDBApiClient()