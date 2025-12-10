import { useEffect } from 'react'
import { imageCache } from '@/lib/media/imageCache'

interface UseImagePreloaderOptions {
  urls: string[]
  priority?: number // 优先级，数字越小优先级越高
  onProgress?: (loaded: number, total: number) => void
}

export function useImagePreloader({ urls, priority = 1, onProgress }: UseImagePreloaderOptions) {
  useEffect(() => {
    if (!urls.length) return

    let loaded = 0
    const total = urls.length

    const preloadImages = async () => {
      // 根据优先级延迟执行
      const delay = (priority - 1) * 1000
      
      setTimeout(async () => {
        for (const url of urls) {
          if (!imageCache.has(url)) {
            try {
              await imageCache.preload(url)
              loaded++
              onProgress?.(loaded, total)
            } catch (error) {
              
              loaded++
              onProgress?.(loaded, total)
            }
          } else {
            loaded++
            onProgress?.(loaded, total)
          }
        }
      }, delay)
    }

    preloadImages()
  }, [urls, priority, onProgress])
}

// 批量预加载工具函数
export async function preloadImages(urls: string[]): Promise<number> {
  let successCount = 0
  
  for (const url of urls) {
    if (await imageCache.preload(url)) {
      successCount++
    }
  }
  
  return successCount
}

// 获取页面中所有图片URL（用于预加载）
export function getImageUrlsFromPage(): string[] {
  if (typeof window === 'undefined') return []
  
  const images: string[] = []
  const imgElements = document.querySelectorAll('img')
  
  imgElements.forEach(img => {
    const src = img.src
    if (src && !src.startsWith('data:') && !images.includes(src)) {
      images.push(src)
    }
  })
  
  return images
}