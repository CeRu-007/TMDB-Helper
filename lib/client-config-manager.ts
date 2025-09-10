/**
 * 客户端配置管理器
 * 替代localStorage，所有配置都存储在服务端
 */
export class ClientConfigManager {
  private static cache: Map<string, any> = new Map()
  private static cacheExpiry: Map<string, number> = new Map()
  private static readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

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
      const response = await fetch(`/api/config?key=${encodeURIComponent(key)}`)
      const data = await response.json()

      if (data.success) {
        let valueToReturn = data.value
        
        // 如果从服务端获取的是对象，需要将其转换为 JSON 字符串
        if (typeof valueToReturn === 'object' && valueToReturn !== null) {
          try {
            valueToReturn = JSON.stringify(valueToReturn)
            
          } catch (error) {
            
            return null
          }
        }
        
        // 更新缓存
        this.updateCache(key, valueToReturn)
        return valueToReturn !== undefined ? String(valueToReturn) : null
      }

      return null
    } catch (error) {
      
      return null
    }
  }

  /**
   * 设置配置项
   */
  static async setItem(key: string, value: string): Promise<boolean> {
    try {
      console.log('🔧 [ClientConfigManager] 开始设置配置项:', { key, valueLength: value?.length, valuePreview: value ? `${value.substring(0, 8)}...` : '空' })
      
      const requestBody = {
        action: 'set',
        key,
        value
      }
      
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        
        return false
      }
      
      const data = await response.json()
      
      if (data.success) {
        // 更新缓存
        this.updateCache(key, value)
        
        return true
      }

      return false
    } catch (error) {
      
      if (error instanceof Error) {
        
      }
      return false
    }
  }

  /**
   * 删除配置项
   */
  static async removeItem(key: string): Promise<boolean> {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          key
        })
      })

      const data = await response.json()

      if (data.success) {
        // 清除缓存
        this.cache.delete(key)
        this.cacheExpiry.delete(key)
        return true
      }

      return false
    } catch (error) {
      
      return false
    }
  }

  /**
   * 获取完整配置
   */
  static async getConfig(): Promise<any> {
    try {
      const response = await fetch('/api/config')
      const data = await response.json()

      if (data.success) {
        return data.fullConfig || data.config
      }

      return {}
    } catch (error) {
      
      return {}
    }
  }

  /**
   * 更新多个配置项
   */
  static async updateConfig(updates: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          updates
        })
      })

      const data = await response.json()

      if (data.success) {
        // 更新缓存
        Object.entries(updates).forEach(([key, value]) => {
          this.updateCache(key, value)
        })
        return true
      }

      return false
    } catch (error) {
      
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
      const response = await fetch('/api/config?info=true')
      const data = await response.json()

      if (data.success) {
        return data.info
      }

      return null
    } catch (error) {
      
      return null
    }
  }

  /**
   * 导出配置
   */
  static async exportConfig(): Promise<string | null> {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'export'
        })
      })

      const data = await response.json()

      if (data.success) {
        return data.configJson
      }

      return null
    } catch (error) {
      
      return null
    }
  }

  /**
   * 导入配置
   */
  static async importConfig(configJson: string): Promise<boolean> {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'import',
          configJson
        })
      })

      const data = await response.json()

      if (data.success) {
        // 清除缓存，强制重新获取
        this.clearCache()
        return true
      }

      return false
    } catch (error) {
      
      return false
    }
  }

  /**
   * 重置配置为默认值
   */
  static async resetToDefault(): Promise<boolean> {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset'
        })
      })

      const data = await response.json()

      if (data.success) {
        // 清除缓存
        this.clearCache()
        return true
      }

      return false
    } catch (error) {
      
      return false
    }
  }
}
