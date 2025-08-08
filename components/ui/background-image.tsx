"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

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

// 图片缓存管理
const imageCache = new Map<string, boolean>();

/**
 * 背景图组件，支持懒加载、渐变效果和错误处理
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
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined)
  // 添加低质量图像源状态
  const [lowQualityImageSrc, setLowQualityImageSrc] = useState<string | undefined>(undefined)
  const [lowQualityLoaded, setLowQualityLoaded] = useState(false)
  
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
    
    // 如果图片已经在缓存中且不需要强制刷新，直接使用缓存的图片
    if (imageCache.has(src) && !shouldForceRefresh) {
      setImageSrc(src);
      setLoaded(true);
      return;
    }

    // 检查是否是TMDB图片URL
    if (src.includes('image.tmdb.org')) {
      const baseUrl = src.split('/w1280').shift() || 'https://image.tmdb.org/t/p'
      let path = src.split('/w1280').pop() || ''
      
      // 只有在强制刷新时才添加时间戳参数
      if (shouldForceRefresh && !path.includes('?t=')) {
        path = `${path}?t=${Date.now()}`
      }
      
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
      
      const fullSrc = `${baseUrl}/${size}${path}`;
      setImageSrc(fullSrc);
      
      // 同时设置低质量图像源，用于快速加载预览
      setLowQualityImageSrc(`${baseUrl}/w300${path}`);
    } else {
      // 如果强制刷新非TMDB图片，添加时间戳参数
      let finalSrc = src;
      if (shouldForceRefresh && !src.includes('?t=')) {
        finalSrc = `${src}?t=${Date.now()}`;
      }
      setImageSrc(finalSrc);
      // 对于非TMDB图片，低质量图像与原图相同
      setLowQualityImageSrc(finalSrc);
    }
  }, [src, fallbackSrc, forceRefresh, refreshKey])

  // 预加载低质量图片
  useEffect(() => {
    if (!lowQualityImageSrc) return
    
    // 检查图片是否已在缓存中
    const img = new Image();
    
    // 如果图片已在缓存中，complete属性会立即为true
    if (img.complete) {
      setLowQualityLoaded(true);
      setError(false);
    } else {
      img.onload = () => {
        if (isMounted.current) {
          setLowQualityLoaded(true);
          setError(false);
        }
      };
      
      img.onerror = () => {
        if (isMounted.current) {
          setError(true);
        }
      };
    }
    
    img.src = lowQualityImageSrc;
  }, [lowQualityImageSrc])

  // 预加载高质量图片
  useEffect(() => {
    if (!imageSrc) return;
    
    // 检查图片是否已在缓存中
    const img = new Image();
    
    // 如果图片已在缓存中，complete属性会立即为true
    if (img.complete) {
      setLoaded(true);
      imageCache.set(imageSrc, true);
    } else {
      img.onload = () => {
        if (isMounted.current) {
          setLoaded(true);
          imageCache.set(imageSrc, true);
        }
      };
      
      img.onerror = () => {
        if (isMounted.current) {
          setError(true);
        }
      };
    }
    
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
          {/* 低质量图片作为预加载 */}
          {lowQualityLoaded && !loaded && (
            <img
              src={lowQualityImageSrc}
              alt={`${alt} 预览`}
              className={cn(
                "w-full h-full object-cover absolute inset-0 transition-all duration-300",
                loaded ? "opacity-0 scale-105" : "opacity-100 scale-100"
              )}
              style={{ objectPosition, filter: 'blur(10px)' }}
              decoding="async"
            />
          )}
          
          {/* 高质量图片 */}
          <img
            src={imageSrc}
            alt={alt}
            className={cn(
              "w-full h-full object-cover transition-all duration-300",
              loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
            )}
            style={{ objectPosition }}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onLoad={() => {
              setLoaded(true);
              imageCache.set(imageSrc, true);
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