// 图片预加载服务
class ImagePreloaderService {
  private static instance: ImagePreloaderService
  private preloadQueue: Map<string, Promise<boolean>>
  private preloadCache: Map<string, boolean>

  private constructor() {
    this.preloadQueue = new Map()
    this.preloadCache = new Map()
  }

  static getInstance(): ImagePreloaderService {
    if (!ImagePreloaderService.instance) {
      ImagePreloaderService.instance = new ImagePreloaderService()
    }
    return ImagePreloaderService.instance
  }

  // 预加载单个图片
  async preloadImage(url: string): Promise<boolean> {
    // 如果已经在缓存中，直接返回
    if (this.preloadCache.has(url)) {
      return Promise.resolve(this.preloadCache.get(url)!)
    }

    // 如果已经在预加载队列中，返回该Promise
    if (this.preloadQueue.has(url)) {
      return this.preloadQueue.get(url)!
    }

    // 创建新的预加载Promise
    const preloadPromise = new Promise<boolean>((resolve) => {
      const img = new Image()
      
      img.onload = () => {
        this.preloadCache.set(url, true)
        this.preloadQueue.delete(url)
        resolve(true)
      }
      
      img.onerror = () => {
        this.preloadCache.set(url, false)
        this.preloadQueue.delete(url)
        resolve(false)
      }
      
      img.src = url
    })

    // 将Promise添加到队列中
    this.preloadQueue.set(url, preloadPromise)
    
    return preloadPromise
  }

  // 批量预加载图片
  async preloadImages(urls: string[]): Promise<{ success: number; total: number }> {
    if (urls.length === 0) {
      return { success: 0, total: 0 }
    }

    // 过滤掉空URL和已经缓存的URL
    const validUrls = urls.filter(url => url && !this.preloadCache.has(url))
    
    if (validUrls.length === 0) {
      // 计算成功数量
      const successCount = urls.filter(url => this.preloadCache.get(url)).length
      return { success: successCount, total: urls.length }
    }

    // 并行预加载所有图片
    const promises = validUrls.map(url => this.preloadImage(url))
    const results = await Promise.all(promises)
    
    // 计算成功数量
    const successCount = results.filter(result => result).length
    
    // 加上已经缓存的成功数量
    const cachedSuccessCount = urls.filter(url => 
      url && this.preloadCache.has(url) && this.preloadCache.get(url)
    ).length
    
    return { 
      success: successCount + cachedSuccessCount, 
      total: urls.length 
    }
  }

  // 预加载重要图片（高优先级）
  async preloadCriticalImages(urls: string[]): Promise<void> {
    // 对于关键图片，我们使用更高的优先级
    for (const url of urls) {
      if (url) {
        // 创建高优先级的图片预加载
        const img = new window.Image()
        img.loading = 'eager'
        img.fetchPriority = 'high'
        img.src = url
        
        // 等待图片开始加载
        await new Promise(resolve => {
          if (img.complete) {
            resolve(null)
          } else {
            img.onload = () => resolve(null)
            img.onerror = () => resolve(null)
          }
        })
      }
    }
  }

  // 清除缓存
  clearCache(): void {
    this.preloadQueue.clear()
    this.preloadCache.clear()
  }

  // 获取缓存统计信息
  getStats(): { queueSize: number; cacheSize: number } {
    return {
      queueSize: this.preloadQueue.size,
      cacheSize: this.preloadCache.size
    }
  }
}

// 全局单例实例
export const imagePreloaderService = ImagePreloaderService.getInstance()