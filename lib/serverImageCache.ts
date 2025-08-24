// 服务器端图片缓存管理器
import fs from 'fs/promises'
import path from 'path'
import { createHash } from 'crypto'

interface CachedImage {
  buffer: Buffer
  contentType: string
  timestamp: number
  size: number
}

class ServerImageCache {
  private cacheDir: string
  private memoryCache: Map<string, CachedImage>
  private maxMemoryCacheSize: number = 100 // 最大内存缓存图片数量
  private cacheTTL: number = 24 * 60 * 60 * 1000 // 24小时缓存时间

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.image-cache')
    this.memoryCache = new Map()
    this.ensureCacheDir()
  }

  private async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true })
    } catch (error) {
      console.warn('Failed to create cache directory:', error)
    }
  }

  private getCacheKey(url: string): string {
    return createHash('md5').update(url).digest('hex')
  }

  private getCacheFilePath(url: string): string {
    const key = this.getCacheKey(url)
    return path.join(this.cacheDir, `${key}.cache`)
  }

  // 检查图片是否在缓存中
  async has(url: string): Promise<boolean> {
    // 先检查内存缓存
    if (this.memoryCache.has(url)) {
      const cached = this.memoryCache.get(url)!
      // 检查是否过期
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return true
      }
      this.memoryCache.delete(url)
    }

    // 检查文件缓存
    try {
      const cachePath = this.getCacheFilePath(url)
      const stats = await fs.stat(cachePath)
      // 检查是否过期
      if (Date.now() - stats.mtimeMs < this.cacheTTL) {
        return true
      }
      // 过期则删除
      await fs.unlink(cachePath)
    } catch (error) {
      // 文件不存在或其他错误
      return false
    }

    return false
  }

  // 获取缓存的图片
  async get(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    // 先检查内存缓存
    if (this.memoryCache.has(url)) {
      const cached = this.memoryCache.get(url)!
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return { buffer: cached.buffer, contentType: cached.contentType }
      }
      this.memoryCache.delete(url)
    }

    // 检查文件缓存
    try {
      const cachePath = this.getCacheFilePath(url)
      const data = await fs.readFile(cachePath, 'utf8')
      const cached: CachedImage = JSON.parse(data)
      
      // 检查是否过期
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        // 添加到内存缓存
        if (this.memoryCache.size < this.maxMemoryCacheSize) {
          this.memoryCache.set(url, cached)
        }
        return { buffer: Buffer.from(cached.buffer), contentType: cached.contentType }
      }
      
      // 过期则删除
      await fs.unlink(cachePath)
    } catch (error) {
      // 文件不存在或解析错误
    }

    return null
  }

  // 缓存图片
  async set(url: string, buffer: Buffer, contentType: string): Promise<void> {
    const cachedImage: CachedImage = {
      buffer: buffer.toString('base64'),
      contentType,
      timestamp: Date.now(),
      size: buffer.length
    }

    // 添加到内存缓存
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      // 简单的LRU策略：删除第一个条目
      const firstKey = this.memoryCache.keys().next().value
      if (firstKey) {
        this.memoryCache.delete(firstKey)
      }
    }
    this.memoryCache.set(url, cachedImage)

    // 保存到文件缓存
    try {
      const cachePath = this.getCacheFilePath(url)
      await fs.writeFile(cachePath, JSON.stringify(cachedImage))
    } catch (error) {
      console.warn('Failed to save image to file cache:', error)
    }
  }

  // 预加载图片
  async preload(url: string): Promise<boolean> {
    if (await this.has(url)) {
      return true
    }

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      const contentType = response.headers.get('content-type') || 'image/jpeg'

      await this.set(url, buffer, contentType)
      return true
    } catch (error) {
      console.warn(`Failed to preload image: ${url}`, error)
      return false
    }
  }

  // 批量预加载
  async preloadBatch(urls: string[]): Promise<{ success: number; total: number }> {
    let success = 0
    const results = await Promise.allSettled(
      urls.map(url => this.preload(url))
    )

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        success++
      }
    })

    return { success, total: urls.length }
  }

  // 清理过期缓存
  async cleanup(): Promise<number> {
    let deletedCount = 0
    const now = Date.now()

    // 清理内存缓存
    for (const [url, cached] of this.memoryCache.entries()) {
      if (now - cached.timestamp >= this.cacheTTL) {
        this.memoryCache.delete(url)
      }
    }

    // 清理文件缓存
    try {
      const files = await fs.readdir(this.cacheDir)
      for (const file of files) {
        if (file.endsWith('.cache')) {
          const filePath = path.join(this.cacheDir, file)
          const stats = await fs.stat(filePath)
          if (now - stats.mtimeMs >= this.cacheTTL) {
            await fs.unlink(filePath)
            deletedCount++
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup cache:', error)
    }

    return deletedCount
  }
}

// 全局单例实例
export const serverImageCache = new ServerImageCache()