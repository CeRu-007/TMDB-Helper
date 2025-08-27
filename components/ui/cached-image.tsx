"use client"

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { enhancedImageCache } from '@/lib/enhanced-image-cache'

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

// 使用增强的图片缓存管理器
const imageCache = enhancedImageCache;

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
 * 缓存图片组件，优化加载体验，实现立即显示效果
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
  const [loaded, setLoaded] = useState(true) // 默认为true，立即显示
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
    setLoaded(true); // 立即设置为已加载状态
    setError(false);
  }, [src])

  // 预加载图片
  useEffect(() => {
    if (!imageSrc) return;

    const cacheKey = getCacheKey(imageSrc);

    // 检查图片是否已在缓存中
    if (imageCache.has(cacheKey)) {
      return;
    }

    const img = new Image();

    img.onload = () => {
      if (isMounted.current) {
        imageCache.set(cacheKey, img);
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
    const cacheKey = getCacheKey(imageSrc || '');
    const img = e.target as HTMLImageElement;
    imageCache.set(cacheKey, img);
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
        "opacity-100", // 始终显示，移除过渡效果
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