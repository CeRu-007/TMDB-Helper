"use client"

import { useState, useEffect } from 'react'
import { imageCache } from '@/lib/imageCache'

interface ImageOptimizerProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  placeholder?: string
  loading?: 'eager' | 'lazy'
}

export function ImageOptimizer({ 
  src, 
  alt, 
  className = '', 
  width, 
  height, 
  placeholder = '/placeholder.svg',
  loading = 'lazy'
}: ImageOptimizerProps) {
  const [imageSrc, setImageSrc] = useState(placeholder)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!src || src === placeholder) {
      setImageSrc(placeholder)
      setIsLoaded(true)
      return
    }

    // 检查内存缓存
    const cachedImage = imageCache.get(src)
    if (cachedImage && cachedImage.complete) {
      setImageSrc(src)
      setIsLoaded(true)
      return
    }

    // 对于非延迟加载的图片，立即加载
    if (loading === 'eager') {
      const img = new Image()
      img.onload = () => {
        imageCache.set(src, img)
        setImageSrc(src)
        setIsLoaded(true)
      }
      img.onerror = () => {
        setImageSrc(placeholder)
        setIsLoaded(true)
      }
      img.src = src
      return
    }

    // 延迟加载：使用 IntersectionObserver
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image()
          img.onload = () => {
            imageCache.set(src, img)
            setImageSrc(src)
            setIsLoaded(true)
          }
          img.onerror = () => {
            setImageSrc(placeholder)
            setIsLoaded(true)
          }
          img.src = src
          observer.disconnect()
        }
      },
      { threshold: 0.01, rootMargin: '200px' } // 提前200px加载
    )

    const tempElement = document.createElement('div')
    document.body.appendChild(tempElement)
    observer.observe(tempElement)

    return () => {
      observer.disconnect()
      if (tempElement.parentNode) {
        tempElement.parentNode.removeChild(tempElement)
      }
    }
  }, [src, loading, placeholder])

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      width={width}
      height={height}
      loading={loading}
      onLoad={() => setIsLoaded(true)}
    />
  )
}

// 海报图片专用组件（保持立即加载）
export function PosterImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <ImageOptimizer
      src={src || '/placeholder.svg'}
      alt={alt}
      className={className}
      loading="eager"
    />
  )
}
