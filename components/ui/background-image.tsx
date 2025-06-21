"use client"

import { useState, useEffect } from "react"
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

  // 根据设备屏幕宽度选择合适的图片尺寸
  useEffect(() => {
    if (!src) {
      setImageSrc(fallbackSrc)
      return
    }

    // 检查refreshKey是否包含时间戳信息（用于判断是否需要强制刷新）
    const shouldForceRefresh = forceRefresh || (refreshKey && String(refreshKey).includes('_') && String(refreshKey).split('_')[1]?.length > 8)

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
      } else if (width <= 1024) {
        size = 'w1280'
      } else {
        size = 'original'
      }
      
      setImageSrc(`${baseUrl}/${size}${path}`)
      
      // 同时设置低质量图像源，用于快速加载预览
      setLowQualityImageSrc(`${baseUrl}/w300${path}`)
    } else {
      // 如果强制刷新非TMDB图片，添加时间戳参数
      if (shouldForceRefresh && !src.includes('?t=')) {
        setImageSrc(`${src}?t=${Date.now()}`)
      } else {
        setImageSrc(src)
      }
      // 对于非TMDB图片，低质量图像与原图相同
      setLowQualityImageSrc(src)
    }
  }, [src, fallbackSrc, forceRefresh, refreshKey])

  // 预加载低质量图片
  useEffect(() => {
    if (!lowQualityImageSrc) return
    
    const lowQualityImg = new Image()
    lowQualityImg.src = lowQualityImageSrc
    
    // 低质量图片加载完成后，显示低质量图片作为预览
    lowQualityImg.onload = () => {
      setLowQualityLoaded(true)
      setError(false)
    }
    
    lowQualityImg.onerror = () => {
      setError(true)
    }
  }, [lowQualityImageSrc])

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
          {lowQualityLoaded && (
            <img 
              src={lowQualityImageSrc} 
              alt={`${alt} 预览`}
              className={cn(
                "w-full h-full object-cover absolute inset-0 transition-all duration-500",
                loaded ? "opacity-0 scale-105" : "opacity-100 scale-100"
              )}
              style={{ objectPosition, filter: 'blur(10px)' }}
            />
          )}
          
          {/* 高质量图片 */}
          <img 
            src={imageSrc} 
            alt={alt} 
            className={cn(
              "w-full h-full object-cover transition-all duration-500",
              loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
            )}
            style={{ objectPosition }}
            onLoad={() => {
              setLoaded(true)
            }}
            onError={() => {
              setError(true)
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