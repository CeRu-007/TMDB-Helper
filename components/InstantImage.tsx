"use client"

import { useState, useEffect } from 'react'
import { enhancedImageCache } from '@/lib/enhanced-image-cache'

interface InstantImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

export function InstantImage({ 
  src, 
  alt, 
  className = '', 
  width, 
  height, 
  placeholder = '/placeholder.svg',
  onLoad,
  onError
}: InstantImageProps) {
  const [imageSrc, setImageSrc] = useState(src || placeholder)

  useEffect(() => {
    if (!src || src === placeholder) {
      setImageSrc(placeholder)
      return
    }

    // 立即显示图片，不使用渐进式加载
    setImageSrc(src)
    
    // 预加载图片到缓存
    const img = new Image()
    
    img.onload = () => {
      // 添加到增强的缓存管理器
      enhancedImageCache.set(src, img);
      onLoad?.()
    }
    
    img.onerror = () => {
      onError?.()
    }
    
    img.src = src
  }, [src, placeholder, onLoad, onError])

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} opacity-100`} // 立即显示，移除过渡效果
      width={width}
      height={height}
      loading="eager"
    />
  )
}

// 服务器端预加载工具函数
export async function preloadImagesServerSide(urls: string[]): Promise<void> {
  try {
    const response = await fetch('/api/image-preload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls, priority: 'high' })
    })

    if (!response.ok) {
      throw new Error(`Preload failed: ${response.status}`)
    }

    const result = await response.json()
    console.log('Server-side preload result:', result)
  } catch (error) {
    console.warn('Server-side preload failed:', error)
  }
}

// 客户端预加载钩子
export function useInstantImagePreloader(urls: string[]) {
  useEffect(() => {
    if (urls.length === 0) return

    // 立即开始预加载所有图片
    urls.forEach(url => {
      if (url && url !== '/placeholder.svg') {
        const img = new Image()
        img.onload = () => {
          // 添加到增强的缓存管理器
          enhancedImageCache.set(url, img);
        }
        img.src = url
      }
    })
  }, [urls])
}