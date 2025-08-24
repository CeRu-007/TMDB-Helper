"use client"

import { useState, useEffect } from 'react'

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
  const [imageSrc, setImageSrc] = useState(placeholder)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!src || src === placeholder) {
      setImageSrc(placeholder)
      setIsLoaded(true)
      return
    }

    // 立即加载图片
    const img = new Image()
    
    img.onload = () => {
      setImageSrc(src)
      setIsLoaded(true)
      onLoad?.()
    }
    
    img.onerror = () => {
      setImageSrc(placeholder)
      setIsLoaded(true)
      onError?.()
    }
    
    img.src = src
  }, [src, placeholder, onLoad, onError])

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
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
        img.src = url
      }
    })
  }, [urls])
}