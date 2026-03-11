/**
 * 增强的图片组件
 * 支持懒加载、骨架屏、错误回退和手动刷新
 *
 * 注意：图片缓存已迁移到数据库层（image_cache 表）
 * 此组件专注于 UI 层面的加载状态和刷新交互
 */

'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw, ImageOff } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface CachedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'sync' | 'auto';
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  fallbackElement?: React.ReactNode;

  // 新增：刷新相关属性
  tmdbId?: string;
  imageType?: 'poster' | 'backdrop' | 'logo';
  mediaType?: 'movie' | 'tv';
  enableRefresh?: boolean;
  onRefresh?: () => Promise<void>;

  // 新增：加载状态控制
  showSkeleton?: boolean;
  skeletonClassName?: string;
}

/**
 * 增强的图片组件
 *
 * 特性：
 * - 懒加载支持
 * - 骨架屏加载状态
 * - 错误回退显示
 * - 右键刷新菜单（当 enableRefresh=true 时）
 * - 点击刷新按钮（当 enableRefresh=true 时）
 */
export function CachedImage({
  src,
  alt,
  className,
  style,
  loading = 'lazy',
  decoding = 'async',
  onError,
  onLoad,
  fallbackElement,
  tmdbId,
  imageType,
  mediaType,
  enableRefresh = false,
  onRefresh,
  showSkeleton = true,
  skeletonClassName,
}: CachedImageProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  // 处理图片加载成功
  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setImageState('loaded');
      onLoad?.(e);
    },
    [onLoad]
  );

  // 处理图片加载失败
  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setImageState('error');
      onError?.(e);
    },
    [onError]
  );

  // 处理刷新
  const handleRefresh = useCallback(async () => {
    if (!enableRefresh || isRefreshing) return;

    setIsRefreshing(true);
    setImageState('loading');

    try {
      // 优先使用外部传入的刷新函数
      if (onRefresh) {
        await onRefresh();
      }

      // 添加时间戳强制刷新
      const separator = currentSrc.includes('?') ? '&' : '?';
      const newSrc = `${currentSrc}${separator}t=${Date.now()}`;
      setCurrentSrc(newSrc);
    } catch (error) {
      // 刷新失败，保持原图
      setImageState('loaded');
    } finally {
      setIsRefreshing(false);
    }
  }, [enableRefresh, isRefreshing, onRefresh, currentSrc]);

  // 错误回退显示
  if (imageState === 'error' && fallbackElement) {
    return <>{fallbackElement}</>;
  }

  return (
    <div className="relative h-full w-full" style={style}>
      {/* 骨架屏 */}
      {showSkeleton && imageState === 'loading' && (
        <div
          className={cn(
            'absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-800',
            skeletonClassName
          )}
        />
      )}

      {/* 错误状态 */}
      {imageState === 'error' && !fallbackElement && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">加载失败</span>
          </div>
        </div>
      )}

      {/* 图片 */}
      <img
        src={currentSrc}
        alt={alt}
        className={cn(
          'h-full w-full transition-opacity duration-300',
          imageState === 'loaded' ? 'opacity-100' : 'opacity-0',
          className
        )}
        loading={loading}
        decoding={decoding}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* 刷新按钮（悬停时显示） */}
      {enableRefresh && imageState === 'loaded' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity hover:bg-white/90 group-hover:opacity-100 data-[state=open]:opacity-100"
              style={{ opacity: isRefreshing ? 1 : undefined }}
              disabled={isRefreshing}
              onClick={(e) => e.stopPropagation()}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
              {isRefreshing ? '刷新中...' : '刷新图片'}
            </DropdownMenuItem>
            {tmdbId && imageType && (
              <DropdownMenuItem disabled>
                <span className="text-xs text-muted-foreground">
                  TMDB ID: {tmdbId} ({imageType})
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/**
 * 简化的图片组件（无刷新功能）
 * 用于不需要手动刷新的场景
 */
export function SimpleImage({
  src,
  alt,
  className,
  style,
  loading = 'lazy',
  onError,
  onLoad,
  fallbackElement,
  showSkeleton = true,
}: Omit<CachedImageProps, 'enableRefresh' | 'onRefresh' | 'tmdbId' | 'imageType' | 'mediaType'>) {
  return (
    <CachedImage
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      onError={onError}
      onLoad={onLoad}
      fallbackElement={fallbackElement}
      showSkeleton={showSkeleton}
      enableRefresh={false}
    />
  );
}
