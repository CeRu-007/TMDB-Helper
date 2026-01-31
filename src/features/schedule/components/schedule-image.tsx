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

const BILIBILI_IMAGE_DOMAINS = ['hdslb.com', 'biliimg.com', 'bilibili.com']

export function ScheduleImage({ src, alt, className, fallbackClassName }: ScheduleImageProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  const processedSrc = useMemo(() => {
    if (!src) return ''

    let processed = src

    if (src.startsWith('//')) {
      processed = 'https:' + src
    } else if (src.startsWith('http:')) {
      processed = src.replace('http:', 'https:')
    }

    const isBilibiliImage = BILIBILI_IMAGE_DOMAINS.some(domain =>
      processed.toLowerCase().includes(domain)
    )

    if (isBilibiliImage && !processed.includes('/api/schedule/image-proxy')) {
      processed = `/api/schedule/image-proxy?url=${encodeURIComponent(processed)}`
    }

    return processed
  }, [src])

  useEffect(() => {
    if (!src) {
      setError(true)
      setLoading(false)
      return
    }

    setError(false)
    setLoading(true)
  }, [src])

  function handleError() {
    setError(true)
    setLoading(false)
  }

  function handleLoad() {
    setLoading(false)
  }

  if (error || !processedSrc) {
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
    <>
      {loading && (
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
          loading ? "opacity-0" : "opacity-100",
          className
        )}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
      />
    </>
  )
}
