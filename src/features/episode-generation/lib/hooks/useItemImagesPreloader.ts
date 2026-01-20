import { useEffect } from 'react'
import { imagePreloaderService } from '@/lib/media/image-preloader-service'

interface ItemImages {
  backdropUrl?: string
  posterUrl?: string
  logoUrl?: string
  networkLogoUrl?: string
}

/**
 * 优化的词条图片预加载hook
 * 立即预加载所有相关图片以确保立即显示
 */
export function useItemImagesPreloader(item: ItemImages) {
  useEffect(() => {
    // 收集所有需要预加载的图片URL
    const imageUrls: string[] = []
    
    if (item.backdropUrl) {
      imageUrls.push(item.backdropUrl)
    }
    
    if (item.posterUrl) {
      imageUrls.push(item.posterUrl)
    }
    
    if (item.logoUrl) {
      imageUrls.push(item.logoUrl)
    }
    
    if (item.networkLogoUrl) {
      imageUrls.push(item.networkLogoUrl)
    }
    
    // 使用图片预加载服务进行预加载
    if (imageUrls.length > 0) {
      // 对于词条详情页面的关键图片，使用高优先级预加载
      imagePreloaderService.preloadCriticalImages(imageUrls).catch(error => {
        
      })
    }
  }, [item.backdropUrl, item.posterUrl, item.logoUrl, item.networkLogoUrl])
}