'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Tv } from 'lucide-react'

interface ScheduleImageProps {
  src: string
  alt: string
  className?: string
  fallbackClassName?: string
}

const PROXY_IMAGE_DOMAINS = ['hdslb.com', 'biliimg.com', 'bilibili.com', 'iqiyipic.com', 'iqiyi.com']

export function ScheduleImage({ src, alt, className, fallbackClassName }: ScheduleImageProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading')

  const processedSrc = useMemo(() => {
    if (!src) return ''

    // Normalize URL protocol
    let normalized = src
    if (src.startsWith('//')) {
      normalized = `https:${src}`
    } else if (src.startsWith('http:')) {
      normalized = src.replace('http:', 'https:')
    }

    // Check if image needs proxy
    const needsProxy = PROXY_IMAGE_DOMAINS.some(domain =>
      normalized.toLowerCase().includes(domain)
    )

    if (needsProxy && !normalized.includes('/api/schedule/image-proxy')) {
      normalized = `/api/schedule/image-proxy?url=${encodeURIComponent(normalized)}`
    }

    return normalized
  }, [src])

  useEffect(() => {
    setImageState(src ? 'loading' : 'error')
  }, [src])

  if (imageState === 'error' || !processedSrc) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-gray-200 dark:bg-gray-700",
        fallbackClassName
      )}>
        <Tv className="h-8 w-8 text-gray-400" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {imageState === 'loading' && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700 animate-pulse",
          className
        )}>
          <Tv className="h-6 w-6 text-gray-400" />
        </div>
      )}
      <img
        src={processedSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          imageState === 'loaded' ? "opacity-100" : "opacity-0",
          className
        )}
        onError={() => setImageState('error')}
        onLoad={() => setImageState('loaded')}
        loading="lazy"
      />
    </div>
  )
}
