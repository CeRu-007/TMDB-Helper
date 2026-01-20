"use client"

import { useState, useEffect } from "react"
import { cn } from '@/lib/utils'

interface BackgroundImageProps {
  src: string | undefined
  alt?: string
  className?: string
  overlayClassName?: string
  fallbackSrc?: string
  objectPosition?: string
  blur?: boolean
  blurIntensity?: 'light' | 'medium' | 'heavy'
  children?: React.ReactNode
  forceRefresh?: boolean
  refreshKey?: string | number
}

/**
 * 简化的背景图组件，移除缓存功能
 */
export function BackgroundImage({
  src,
  alt = "背景图",
  className,
  overlayClassName,
  fallbackSrc = "/placeholder.jpg",
  objectPosition = "center 20%",
  blur = true,
  blurIntensity = 'medium',
  children,
  forceRefresh = false,
  refreshKey
}: BackgroundImageProps) {
  const [error, setError] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined)

  // 根据设备屏幕宽度选择合适的图片尺寸
  useEffect(() => {
    if (!src) {
      setImageSrc(fallbackSrc)
      return
    }

    // 检查refreshKey是否包含时间戳信息（用于判断是否需要强制刷新）
    const shouldForceRefresh = forceRefresh || (refreshKey && String(refreshKey).includes('_') && String(refreshKey).split('_')[1]?.length > 8)

    // 处理TMDB图片URL
    if (src.includes('image.tmdb.org')) {
      // 分解URL提取基础路径和文件路径
      const match = src.match(/(.+\/t\/p\/)[^/]+(.+)/);
      if (match) {
        const baseUrl = match[1]; // 例如 https://image.tmdb.org/t/p/
        let path = match[2];    // 例如 /abc123.jpg
        
        // 根据屏幕宽度选择合适的尺寸
        const width = window.innerWidth
        let size = 'w1280'

        if (width <= 640) {
          size = 'w780'
        } else if (width <= 1600) {
          size = 'w1280'
        } else {
          size = 'original'
        }

        // 只有在强制刷新时才添加时间戳参数
        if (shouldForceRefresh && !path.includes('?t=')) {
          path = `${path}?t=${Date.now()}`
        }

        const fullSrc = `${baseUrl}${size}${path}`;
        setImageSrc(fullSrc);
        return;
      }
    } else {
      // 如果强制刷新非TMDB图片，添加时间戳参数
      let finalSrc = src;
      if (shouldForceRefresh && !src.includes('?t=')) {
        finalSrc = `${src}?t=${Date.now()}`;
      }
      setImageSrc(finalSrc);
    }
  }, [src, fallbackSrc, forceRefresh, refreshKey])

  // 根据模糊强度设置不同的模糊值和透明度
  const getBlurSettings = () => {
    switch(blurIntensity) {
      case 'light':
        return 'backdrop-blur-sm';
      case 'heavy':
        return 'backdrop-blur-xl';
      case 'medium':
      default:
        return 'backdrop-blur-md';
    }
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {imageSrc && !error ? (
        <>
          <img
            src={imageSrc}
            alt={alt}
            className={cn(
              "w-full h-full object-cover",
              "absolute inset-0"
            )}
            style={{
              objectPosition,
              width: '100%',
              height: '100%'
            }}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={() => {
              setError(true);
            }}
          />
          
          <div
            className={cn(
              "absolute inset-0",
              blur ? cn(
                getBlurSettings(),
                "bg-gradient-to-b from-background/30 via-background/25 to-background/35"
              ) : "",
              overlayClassName
            )}
          />
        </>
      ) : (
        <div className="w-full h-full bg-muted/30" />
      )}
      {children}
    </div>
  )
}