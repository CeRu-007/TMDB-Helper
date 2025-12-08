// 增强的图片缓存管理器
class EnhancedImageCache {
  private static instance: EnhancedImageCache
  private memoryCache: Map<string, { img: HTMLImageElement; timestamp: number }>
  private localStorageKey = 'enhanced_image_cache'
  private readonly CACHE_EXPIRY = 30 * 60 * 1000 // 30分钟缓存过期时间
  private readonly MAX_CACHE_SIZE = 200 // 最大缓存图片数量

  private constructor() {
    this.memoryCache = new Map()
    this.loadFromLocalStorage()
  }

  static getInstance(): EnhancedImageCache {
    if (!EnhancedImageCache.instance) {
      EnhancedImageCache.instance = new EnhancedImageCache()
    }
    return EnhancedImageCache.instance
  }

  // 检查图片是否在内存缓存中且未过期
  has(url: string): boolean {
    const cached = this.memoryCache.get(url)
    if (!cached) return false
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY) {
      this.memoryCache.delete(url)
      return false
    }
    
    // 检查图片是否仍然有效
    return cached.img.complete && cached.img.naturalWidth !== 0
  }

  // 获取缓存的图片
  get(url: string): HTMLImageElement | undefined {
    const cached = this.memoryCache.get(url)
    if (!cached) return undefined
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY) {
      this.memoryCache.delete(url)
      return undefined
    }
    
    // 检查图片是否仍然有效
    if (cached.img.complete && cached.img.naturalWidth !== 0) {
      return cached.img
    }
    
    // 图片无效，删除缓存
    this.memoryCache.delete(url)
    return undefined
  }

  // 添加图片到缓存
  set(url: string, img: HTMLImageElement): void {
    // 如果缓存已满，删除最旧的条目
    if (this.memoryCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.getOldestEntryKey()
      if (oldestKey) {
        this.memoryCache.delete(oldestKey)
      }
    }
    
    this.memoryCache.set(url, {
      img,
      timestamp: Date.now()
    })
    
    this.saveToLocalStorage()
  }

  // 获取最旧的条目键
  private getOldestEntryKey(): string | null {
    let oldestKey: string | null = null
    let oldestTimestamp = Infinity
    
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp
        oldestKey = key
      }
    }
    
    return oldestKey
  }

  // 从本地存储加载缓存
  private loadFromLocalStorage(): void {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
      
      const cached = localStorage.getItem(this.localStorageKey)
      if (cached) {
        const data = JSON.parse(cached)
        const now = Date.now()
        
        // 只加载未过期的缓存
        Object.entries(data).forEach(([url, entry]: [string, any]) => {
          if (typeof entry === 'object' && entry.timestamp && now - entry.timestamp < this.CACHE_EXPIRY) {
            const img = new Image()
            img.src = entry.src
            this.memoryCache.set(url, {
              img,
              timestamp: entry.timestamp
            })
          }
        })
      }
    } catch (error) {
      
    }
  }

  // 保存缓存到本地存储
  private saveToLocalStorage(): void {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
      
      const data: Record<string, { src: string; timestamp: number }> = {}
      let count = 0
      
      // 只保存最近的缓存项，限制数量
      for (const [url, value] of this.memoryCache.entries()) {
        if (count >= 50) break // 限制本地存储的缓存数量
        
        if (value.img.complete && value.img.src.startsWith('http')) {
          data[url] = {
            src: value.img.src,
            timestamp: value.timestamp
          }
          count++
        }
      }
      
      localStorage.setItem(this.localStorageKey, JSON.stringify(data))
    } catch (error) {
      
    }
  }

  // 清除缓存
  clear(): void {
    this.memoryCache.clear()
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.localStorageKey)
      }
    } catch (error) {
      
    }
  }

  // 预加载图片
  async preload(url: string): Promise<boolean> {
    if (this.has(url)) return true

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        this.set(url, img)
        resolve(true)
      }
      img.onerror = () => resolve(false)
      img.src = url
    })
  }

  // 批量预加载图片
  async preloadBatch(urls: string[]): Promise<{ success: number; total: number }> {
    if (urls.length === 0) {
      return { success: 0, total: 0 }
    }

    // 过滤掉已经缓存的URL
    const uncachedUrls = urls.filter(url => !this.has(url))
    
    if (uncachedUrls.length === 0) {
      return { success: urls.length, total: urls.length }
    }

    let successCount = 0
    const promises = uncachedUrls.map(url => 
      this.preload(url).then(success => {
        if (success) successCount++
        return success
      })
    )

    await Promise.allSettled(promises)
    
    return { 
      success: successCount + (urls.length - uncachedUrls.length), 
      total: urls.length 
    }
  }

  // 获取缓存统计信息
  getStats(): { size: number; maxAge: number } {
    let maxAge = 0
    const now = Date.now()
    
    for (const value of this.memoryCache.values()) {
      const age = now - value.timestamp
      if (age > maxAge) {
        maxAge = age
      }
    }
    
    return {
      size: this.memoryCache.size,
      maxAge
    }
  }
}

// 全局单例实例
export const enhancedImageCache = EnhancedImageCache.getInstance()