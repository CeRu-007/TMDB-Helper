"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from '@/lib/utils'
import { enhancedImageCache } from '@/lib/enhanced-image-cache'

// 添加版本标识，帮助追踪更新
const TMDB_IMAGE_DIRECT_VERSION = '1.0.0';

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

// 使用增强的图片缓存管理器
const imageCache = enhancedImageCache;

// 从原始URL中提取缓存键
function getCacheKey(src: string): string {
  if (src.includes('image.tmdb.org')) {
    // 对于直接TMDB URL，提取路径
    const pathMatch = src.match(/\/t\/p\/[^/]+(.+)$/);
    return pathMatch ? `tmdb:${pathMatch[1]}` : src;
  }
  return src;
}

/**
 * 背景图组件，优化加载体验，实现立即显示效果
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
  
  // 使用ref跟踪组件挂载状态，避免内存泄漏
  const isMounted = useRef(true);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 根据设备屏幕宽度选择合适的图片尺寸
  useEffect(() => {
    if (!src) {
      setImageSrc(fallbackSrc)
      return
    }

    // 检查refreshKey是否包含时间戳信息（用于判断是否需要强制刷新）
    const shouldForceRefresh = forceRefresh || (refreshKey && String(refreshKey).includes('_') && String(refreshKey).split('_')[1]?.length > 8)

    // 使用缓存键检查图片是否已经在缓存中
    const cacheKey = getCacheKey(src);
    if (imageCache.has(cacheKey) && !shouldForceRefresh) {
      setImageSrc(src);
      return;
    }

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

  // 预加载图片
  useEffect(() => {
    if (!imageSrc) return;

    const cacheKey = getCacheKey(imageSrc);

    // 检查图片是否已在缓存中
    if (imageCache.has(cacheKey)) {
      return;
    }

    const img = new Image();

    img.onload = () => {
      if (isMounted.current) {
        imageCache.set(cacheKey, img);
      }
    };

    img.onerror = () => {
      if (isMounted.current) {
        setError(true);
      }
    };

    img.src = imageSrc;
  }, [imageSrc]);

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
          {/* 高质量图片 - 立即显示，移除渐进式加载 */}
          <img
            src={imageSrc}
            alt={alt}
            className={cn(
              "w-full h-full object-cover opacity-100", // 立即显示，移除过渡效果
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
            onLoad={() => {
              const cacheKey = getCacheKey(imageSrc);
              const img = new window.Image();
              img.src = imageSrc;
              imageCache.set(cacheKey, img);
            }}
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