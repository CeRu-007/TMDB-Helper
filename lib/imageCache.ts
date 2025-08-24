// 图片内存缓存管理器
class ImageCacheManager {
  private static instance: ImageCacheManager
  private cache: Map<string, HTMLImageElement>
  private localStorageKey = 'image_cache'

  private constructor() {
    this.cache = new Map()
    this.loadFromLocalStorage()
  }

  static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager()
    }
    return ImageCacheManager.instance
  }

  // 检查图片是否在内存缓存中
  has(url: string): boolean {
    return this.cache.has(url)
  }

  // 获取缓存的图片
  get(url: string): HTMLImageElement | undefined {
    return this.cache.get(url)
  }

  // 添加图片到缓存
  set(url: string, img: HTMLImageElement): void {
    this.cache.set(url, img)
    this.saveToLocalStorage()
  }

  // 从本地存储加载缓存
  private loadFromLocalStorage(): void {
    try {
      const cached = localStorage.getItem(this.localStorageKey)
      if (cached) {
        const data = JSON.parse(cached)
        Object.entries(data).forEach(([url, base64]) => {
          if (typeof base64 === 'string') {
            const img = new Image()
            img.src = base64
            this.cache.set(url, img)
          }
        })
      }
    } catch (error) {
      console.warn('Failed to load image cache from localStorage:', error)
    }
  }

  // 保存缓存到本地存储
  private saveToLocalStorage(): void {
    try {
      const data: Record<string, string> = {}
      this.cache.forEach((img, url) => {
        if (img.complete && img.src.startsWith('data:')) {
          data[url] = img.src
        }
      })
      localStorage.setItem(this.localStorageKey, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save image cache to localStorage:', error)
    }
  }

  // 清除缓存
  clear(): void {
    this.cache.clear()
    localStorage.removeItem(this.localStorageKey)
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
}

export const imageCache = ImageCacheManager.getInstance()