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
  children
}: BackgroundImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined)

  // 根据设备屏幕宽度选择合适的图片尺寸
  useEffect(() => {
    if (!src) {
      setImageSrc(fallbackSrc)
      return
    }

    // 检查是否是TMDB图片URL
    if (src.includes('image.tmdb.org')) {
      const baseUrl = src.split('/w1280').shift() || 'https://image.tmdb.org/t/p'
      const path = src.split('/w1280').pop()
      
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
      setImageSrc(src)
    }
  }, [src, fallbackSrc])

  // 重置状态
  useEffect(() => {
    setLoaded(false)
    setError(false)
  }, [imageSrc])

  // 预加载低质量图片
  useEffect(() => {
    if (!imageSrc) return
    
    // 如果是TMDB图片，先加载低质量版本
    if (imageSrc.includes('image.tmdb.org') && !imageSrc.includes('w300')) {
      const lowQualitySrc = imageSrc.replace(/w780|w1280|original/, 'w300')
      const lowQualityImg = new Image()
      lowQualityImg.src = lowQualitySrc
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
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
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