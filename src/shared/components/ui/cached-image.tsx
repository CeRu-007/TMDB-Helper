"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CachedImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  loading?: 'eager' | 'lazy'
  decoding?: 'async' | 'sync' | 'auto'
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  fallbackElement?: React.ReactNode
}

/**
 * 简化的图片组件，移除缓存功能
 */
export function CachedImage({
  src,
  alt,
  className,
  style,
  loading = 'eager',
  decoding = 'async',
  onError,
  onLoad,
  fallbackElement
}: CachedImageProps) {
  const [error, setError] = useState(false)

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setError(true);
    onError?.(e);
  };

  if (error && fallbackElement) {
    return <>{fallbackElement}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(className)}
      style={style}
      loading={loading}
      decoding={decoding}
      onLoad={onLoad}
      onError={handleError}
    />
  );
}