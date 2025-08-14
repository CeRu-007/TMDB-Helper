"use client"

import { useState, useEffect, useRef } from 'react'
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

// 图片缓存管理 - 基于图片路径而不是完整URL
const imageCache = new Map<string, boolean>();

// 从URL中提取缓存键
function getCacheKey(src: string): string {
  if (src.includes('/api/tmdb-image')) {
    // 对于代理URL，使用路径作为缓存键
    const urlParams = new URLSearchParams(src.split('?')[1] || '');
    const path = urlParams.get('path') || '';
    return `tmdb:${path}`;
  } else if (src.includes('image.tmdb.org')) {
    // 对于直接TMDB URL，提取路径
    const pathMatch = src.match(/\/t\/p\/[^/]+(.+)$/);
    return pathMatch ? `tmdb:${pathMatch[1]}` : src;
  }
  return src;
}

/**
 * 缓存图片组件，避免重复加载已缓存的图片
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
  const [loaded, setLoaded] = useState(false)
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

  // 处理图片源变化
  useEffect(() => {
    if (!src) {
      setImageSrc(undefined)
      return
    }

    // 使用缓存键检查图片是否已经在缓存中
    const cacheKey = getCacheKey(src);
    if (imageCache.has(cacheKey)) {
      setImageSrc(src);
      setLoaded(true);
      return;
    }

    setImageSrc(src);
    setLoaded(false);
    setError(false);
  }, [src])

  // 预加载图片
  useEffect(() => {
    if (!imageSrc) return;

    const cacheKey = getCacheKey(imageSrc);

    // 检查图片是否已在缓存中
    if (imageCache.has(cacheKey)) {
      setLoaded(true);
      return;
    }

    const img = new Image();

    img.onload = () => {
      if (isMounted.current) {
        setLoaded(true);
        imageCache.set(cacheKey, true);
      }
    };

    img.onerror = () => {
      if (isMounted.current) {
        setError(true);
      }
    };

    img.src = imageSrc;
  }, [imageSrc]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setLoaded(true);
    const cacheKey = getCacheKey(imageSrc || '');
    imageCache.set(cacheKey, true);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setError(true);
    onError?.(e);
  };

  if (error && fallbackElement) {
    return <>{fallbackElement}</>;
  }

  if (!imageSrc) {
    return null;
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn(
        "transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className
      )}
      style={style}
      loading={loading}
      decoding={decoding}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
