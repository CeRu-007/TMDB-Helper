/**
 * 客户端配置管理器
 * 替代localStorage，所有配置都存储在服务端
 */
export class ClientConfigManager {
  private static cache: Map<string, any> = new Map()
  private static cacheExpiry: Map<string, number> = new Map()
  private static readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存
  private static readonly API_ENDPOINT = '/api/system/config'

  /**
   * 获取配置项
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      // 检查缓存
      if (this.isCacheValid(key)) {
        const cachedValue = this.cache.get(key)
        return cachedValue !== undefined ? String(cachedValue) : null
      }

      // 从服务端获取
      const response = await fetch(`${this.API_ENDPOINT}?key=${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store' // 确保不使用浏览器缓存
      })

      if (!response.ok) {
        console.warn(`获取配置失败: ${response.status} ${response.statusText}`)
        // 尝试从localStorage fallback
        return this.getFromLocalStorage(key)
      }

      const data = await response.json()

      if (!data.success) {
        console.warn('服务端返回错误:', data.error)
        // 尝试从localStorage fallback
        return this.getFromLocalStorage(key)
      }

      let valueToReturn = data.value

      // 如果从服务端获取的是对象，需要将其转换为 JSON 字符串
      if (typeof valueToReturn === 'object' && valueToReturn !== null) {
        try {
          valueToReturn = JSON.stringify(valueToReturn)
        } catch (error) {
          console.error('JSON序列化失败:', error)
          return this.getFromLocalStorage(key)
        }
      }

      // 更新缓存
      this.updateCache(key, valueToReturn)
      return valueToReturn !== undefined ? String(valueToReturn) : null
    } catch (error) {
      console.error('获取配置项失败，可能是服务不可用:', error)
      // 当API不可用时，尝试从localStorage fallback
      return this.getFromLocalStorage(key)
    }
  }

  /**
   * 设置配置项
   */
  static async setItem(key: string, value: string): Promise<boolean> {
    try {
      const requestBody = {
        action: 'set',
        key,
        value
      }

      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        console.warn(`设置配置失败: ${response.status} ${response.statusText}`)
        // 尝试保存到localStorage作为fallback
        this.setToLocalStorage(key, value)
        return false
      }

      const data = await response.json()

      if (data.success) {
        // 更新缓存，确保后续读取到最新值
        this.updateCache(key, value)
        // 同时保存到localStorage作为备份
        this.setToLocalStorage(key, value)
        return true
      }

      console.warn('设置配置失败:', data.error)
      // 尝试保存到localStorage作为fallback
      this.setToLocalStorage(key, value)
      return false
    } catch (error) {
      console.error('设置配置项失败，可能是服务不可用:', error)
      // 当API不可用时，保存到localStorage
      this.setToLocalStorage(key, value)
      return false
    }
  }

  /**
   * 删除配置项
   */
  static async removeItem(key: string): Promise<boolean> {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          key
        })
      })

      if (!response.ok) {
        console.warn(`删除配置失败: ${response.status} ${response.statusText}`)
        return false
      }

      const data = await response.json()

      if (data.success) {
        // 清除缓存
        this.cache.delete(key)
        this.cacheExpiry.delete(key)
        return true
      }

      console.warn('删除配置失败:', data.error)
      return false
    } catch (error) {
      console.error('删除配置项失败:', error)
      return false
    }
  }

  /**
   * 获取完整配置
   */
  static async getConfig(): Promise<any> {
    try {
      const response = await fetch(this.API_ENDPOINT)

      if (!response.ok) {
        console.warn(`获取配置失败: ${response.status} ${response.statusText}`)
        return {}
      }

      const data = await response.json()

      if (data.success) {
        return data.fullConfig || data.config
      }

      console.warn('获取配置失败:', data.error)
      return {}
    } catch (error) {
      console.error('获取完整配置失败:', error)
      return {}
    }
  }

  /**
   * 更新多个配置项
   */
  static async updateConfig(updates: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          updates
        })
      })

      if (!response.ok) {
        console.warn(`更新配置失败: ${response.status} ${response.statusText}`)
        return false
      }

      const data = await response.json()

      if (data.success) {
        // 更新缓存
        Object.entries(updates).forEach(([key, value]) => {
          this.updateCache(key, value)
        })
        return true
      }

      console.warn('更新配置失败:', data.error)
      return false
    } catch (error) {
      console.error('更新配置项失败:', error)
      return false
    }
  }

  /**
   * 清除所有缓存
   */
  static clearCache(): void {
    this.cache.clear()
    this.cacheExpiry.clear()
  }

  /**
   * 从localStorage获取配置项（fallback机制）
   */
  private static getFromLocalStorage(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const value = localStorage.getItem(key)
        if (value !== null) {
          console.log(`🔄 [ClientConfigManager] 从localStorage恢复配置: ${key}`)
          // 同时更新内存缓存
          this.updateCache(key, value)
          return value
        }
      }
    } catch (error) {
      console.warn('从localStorage读取配置失败:', error)
    }
    return null
  }

  /**
   * 保存配置项到localStorage（fallback机制）
   */
  private static setToLocalStorage(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value)
        console.log(`💾 [ClientConfigManager] 已保存配置到localStorage: ${key}`)
      }
    } catch (error) {
      console.warn('保存配置到localStorage失败:', error)
    }
  }

  /**
   * 检查缓存是否有效
   */
  private static isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key)
    if (!expiry) return false

    return Date.now() < expiry
  }

  /**
   * 更新缓存
   */
  private static updateCache(key: string, value: any): void {
    this.cache.set(key, value)
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION)
  }

  /**
   * 检查服务端是否可用
   */
  static async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000) // 5秒超时
      })
      return response.ok
    } catch (error) {
      console.log('🔍 [ClientConfigManager] 服务端不可用:', error instanceof Error ? error.message : '网络错误')
      return false
    }
  }

  /**
   * 兼容localStorage的接口
   * 为了方便迁移现有代码
   */
  static createLocalStorageAdapter() {
    return {
      getItem: (key: string) => this.getItem(key),
      setItem: (key: string, value: string) => this.setItem(key, value),
      removeItem: (key: string) => this.removeItem(key),
      clear: () => this.clearCache()
    }
  }

  /**
   * 批量获取配置项
   */
  static async getItems(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {}
    
    // 并行获取所有配置项
    const promises = keys.map(async (key) => {
      const value = await this.getItem(key)
      return { key, value }
    })

    const results = await Promise.all(promises)
    
    results.forEach(({ key, value }) => {
      result[key] = value
    })

    return result
  }

  /**
   * 批量设置配置项
   */
  static async setItems(items: Record<string, string>): Promise<boolean> {
    return this.updateConfig(items)
  }

  /**
   * 获取配置文件信息
   */
  static async getConfigInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}?info=true`)

      if (!response.ok) {
        console.warn(`获取配置信息失败: ${response.status} ${response.statusText}`)
        return null
      }

      const data = await response.json()

      if (data.success) {
        return data.info
      }

      console.warn('获取配置信息失败:', data.error)
      return null
    } catch (error) {
      console.error('获取配置文件信息失败:', error)
      return null
    }
  }

  /**
   * 导出配置
   */
  static async exportConfig(): Promise<string | null> {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'export'
        })
      })

      if (!response.ok) {
        console.warn(`导出配置失败: ${response.status} ${response.statusText}`)
        return null
      }

      const data = await response.json()

      if (data.success) {
        return data.configJson
      }

      console.warn('导出配置失败:', data.error)
      return null
    } catch (error) {
      console.error('导出配置失败:', error)
      return null
    }
  }

  /**
   * 导入配置
   */
  static async importConfig(configJson: string): Promise<boolean> {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'import',
          configJson
        })
      })

      if (!response.ok) {
        console.warn(`导入配置失败: ${response.status} ${response.statusText}`)
        return false
      }

      const data = await response.json()

      if (data.success) {
        // 清除缓存，强制重新获取
        this.clearCache()
        return true
      }

      console.warn('导入配置失败:', data.error)
      return false
    } catch (error) {
      console.error('导入配置失败:', error)
      return false
    }
  }

  /**
   * 重置配置为默认值
   */
  static async resetToDefault(): Promise<boolean> {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset'
        })
      })

      if (!response.ok) {
        console.warn(`重置配置失败: ${response.status} ${response.statusText}`)
        return false
      }

      const data = await response.json()

      if (data.success) {
        // 清除缓存
        this.clearCache()
        return true
      }

      console.warn('重置配置失败:', data.error)
      return false
    } catch (error) {
      console.error('重置配置失败:', error)
      return false
    }
  }
}
