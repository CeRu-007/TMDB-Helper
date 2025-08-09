"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface SmartAvatarProps {
  src?: string
  alt: string
  className?: string
  fallbackClassName?: string
  fallbackText?: string
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  loading?: 'eager' | 'lazy'
  decoding?: 'async' | 'sync' | 'auto'
}

/**
 * 智能头像组件
 * 自动检测是否需要使用代理，并立即显示图片
 */
export function SmartAvatar({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackText,
  onError,
  loading = 'eager',
  decoding = 'async',
  ...props
}: SmartAvatarProps) {
  // 检测是否需要使用代理
  const needsProxy = (url: string): boolean => {
    if (!url) return false
    
    // 检测TMDB图片URL
    if (url.includes('image.tmdb.org')) {
      return true
    }
    
    // 检测其他可能需要代理的域名
    const proxyDomains = [
      'image.tmdb.org',
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

  const finalSrc = src ? getFinalImageUrl(src) : undefined

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // 如果图片加载失败，显示默认头像
    const target = e.target as HTMLImageElement
    target.style.display = 'none'
    const fallback = target.nextElementSibling as HTMLElement
    if (fallback) {
      fallback.style.display = 'flex'
    }
    
    // 调用外部错误处理函数
    if (onError) {
      onError(e)
    }
  }

  return (
    <>
      {finalSrc && (
        <img
          src={finalSrc}
          alt={alt}
          className={className}
          loading={loading}
          decoding={decoding}
          onError={handleError}
          {...props}
        />
      )}
      <div
        className={cn(
          "bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium",
          finalSrc ? 'hidden' : '',
          fallbackClassName
        )}
      >
        {fallbackText || alt.charAt(0).toUpperCase()}
      </div>
    </>
  )
}

/**
 * 用户头像组件的专用版本
 */
export function UserAvatarImage({
  src,
  displayName,
  className = "w-8 h-8 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-gray-800",
  fallbackClassName,
  onError,
  ...props
}: {
  src?: string
  displayName: string
  className?: string
  fallbackClassName?: string
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onError'>) {
  return (
    <SmartAvatar
      src={src}
      alt={displayName}
      className={className}
      fallbackClassName={cn(className, fallbackClassName)}
      fallbackText={displayName.charAt(0).toUpperCase()}
      onError={onError}
      loading="eager"
      decoding="async"
      {...props}
    />
  )
}
