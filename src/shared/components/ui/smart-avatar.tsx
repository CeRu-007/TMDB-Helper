"use client"

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface SmartAvatarProps {
  src?: string
  alt: string
  className?: string
  fallbackClassName?: string
  fallbackText?: string
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  loading?: 'eager' | 'lazy'
  decoding?: 'async' | 'sync' | 'auto'
}

// 头像缓存管理
const avatarCache = new Map<string, boolean>();

// 从URL中提取缓存键
function getAvatarCacheKey(src: string): string {
  if (src.includes('/api/avatar-proxy')) {
    // 对于代理URL，使用原始URL作为缓存键
    const urlParams = new URLSearchParams(src.split('?')[1] || '');
    const originalUrl = urlParams.get('url') || '';
    return `avatar:${originalUrl}`;
  }
  return `avatar:${src}`;
}

/**
 * 智能头像组件
 * 自动检测是否需要使用代理，支持缓存和加载状态
 */
export function SmartAvatar({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackText,
  onError,
  onLoad,
  loading = 'eager',
  decoding = 'async',
  ...props
}: SmartAvatarProps) {
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

  // 检测是否需要使用代理
  const needsProxy = (url: string): boolean => {
    if (!url) return false

    // 直接使用TMDB图片URL，不需要代理
    if (url.includes('image.tmdb.org')) {
      return false
    }

    // 检测其他可能需要代理的域名
    const proxyDomains = [
      'image.tmdb.org',
      'githubusercontent.com',
      'gravatar.com',
      'avatars.githubusercontent.com',
      'secure.gravatar.com',
      'cdn.discordapp.com',
      'images.unsplash.com',
      'picsum.photos',
      // 可以在这里添加其他需要代理的域名
    ]

    return proxyDomains.some(domain => url.includes(domain))
  }

  // 构建最终的图片URL
  const getFinalImageUrl = (originalUrl: string): string => {
    if (!originalUrl) return ''

    if (needsProxy(originalUrl)) {
      // 使用代理URL
      return `/api/avatar-proxy?url=${encodeURIComponent(originalUrl)}`
    }

    // 直接使用原始URL
    return originalUrl
  }

  // 处理图片源变化
  useEffect(() => {
    if (!src) {
      setImageSrc(undefined)
      setLoaded(false)
      setError(false)
      return
    }

    const finalUrl = getFinalImageUrl(src)

    // 使用缓存键检查图片是否已经在缓存中
    const cacheKey = getAvatarCacheKey(finalUrl);
    if (avatarCache.has(cacheKey)) {
      setImageSrc(finalUrl);
      setLoaded(true);
      setError(false);
      return;
    }

    setImageSrc(finalUrl);
    setLoaded(false);
    setError(false);
  }, [src])

  // 预加载图片
  useEffect(() => {
    if (!imageSrc) return;

    const cacheKey = getAvatarCacheKey(imageSrc);

    // 检查图片是否已在缓存中
    if (avatarCache.has(cacheKey)) {
      // 使用setTimeout避免同步更新导致的渲染问题
      const timeoutId = setTimeout(() => {
        if (isMounted.current) {
          setLoaded(true);
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const img = new Image();

    img.onload = () => {
      if (isMounted.current) {
        setLoaded(true);
        avatarCache.set(cacheKey, true);
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
    const cacheKey = getAvatarCacheKey(imageSrc || '');
    avatarCache.set(cacheKey, true);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setError(true);
    onError?.(e);
  };

  return (
    <div className={cn("relative", className)}>
      {/* 骨架加载层 */}
      {imageSrc && !loaded && !error && (
        <div className={cn(
          "absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full",
          className
        )} />
      )}

      {/* 头像图片 */}
      {imageSrc && !error && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            "transition-opacity duration-300 object-cover",
            loaded ? "opacity-100" : "opacity-0",
            className
          )}
          loading={loading}
          decoding={decoding}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {/* 默认头像 */}
      {(!imageSrc || error) && (
        <div
          className={cn(
            "bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium",
            className,
            fallbackClassName
          )}
        >
          {fallbackText || alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}

/**
 * 用户头像组件的专用版本
 * 支持加载状态和缓存优化
 */
export function UserAvatarImage({
  src,
  displayName,
  className = "w-8 h-8 rounded-full shadow-sm ring-2 ring-white dark:ring-gray-800",
  fallbackClassName,
  onError,
  onLoad,
  ...props
}: {
  src?: string
  displayName: string
  className?: string
  fallbackClassName?: string
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onError' | 'onLoad'>) {
  return (
    <SmartAvatar
      src={src}
      alt={displayName}
      className={className}
      fallbackClassName={fallbackClassName}
      fallbackText={displayName.charAt(0).toUpperCase()}
      onError={onError}
      onLoad={onLoad}
      loading="eager"
      decoding="async"
      {...props}
    />
  )
}
