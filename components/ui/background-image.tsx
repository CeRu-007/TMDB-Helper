"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

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
  const [isLoading, setIsLoading] = useState(true)

  // 根据设备屏幕宽度选择合适的图片尺寸
  useEffect(() => {
    setIsLoading(true)
    setLoaded(false)
    
    if (!src) {
      setImageSrc(fallbackSrc)
      return
    }

    // 检查是否是TMDB图片URL
    if (src.includes('image.tmdb.org')) {
      const baseUrl = src.split('/w1280').shift() || 'https://image.tmdb.org/t/p'
      let path = src.split('/w1280').pop() || ''
      
      // 如果强制刷新，添加时间戳参数
      if (forceRefresh && !path.includes('?t=')) {
        path = `${path}?t=${Date.now()}`
      } else if (refreshKey && !path.includes('?t=')) {
        // 使用refreshKey作为时间戳参数
        path = `${path}?t=${refreshKey}`
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
    } else {
      // 如果强制刷新非TMDB图片，添加时间戳参数
      if (forceRefresh && !src.includes('?t=')) {
        setImageSrc(`${src}?t=${Date.now()}`)
      } else if (refreshKey && !src.includes('?t=')) {
        setImageSrc(`${src}?t=${refreshKey}`)
      } else {
        setImageSrc(src)
      }
    }
  }, [src, fallbackSrc, forceRefresh, refreshKey])

  // 预加载低质量图片
  useEffect(() => {
    if (!imageSrc) return
    
    // 如果是TMDB图片，先加载低质量版本
    if (imageSrc.includes('image.tmdb.org') && !imageSrc.includes('w300')) {
      const lowQualitySrc = imageSrc.replace(/w780|w1280|original/, 'w300')
      const lowQualityImg = new Image()
      lowQualityImg.src = lowQualitySrc
      
      // 低质量图片加载完成后，显示加载中状态
      lowQualityImg.onload = () => {
        setIsLoading(true)
      }
    }
  }, [imageSrc])

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
              "w-full h-full object-cover transition-opacity duration-500",
              loaded ? "opacity-100" : "opacity-0"
            )}
            style={{ objectPosition }}
            onLoad={() => {
              setLoaded(true)
              setIsLoading(false)
            }}
            onError={() => {
              setError(true)
              setIsLoading(false)
            }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/30">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
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