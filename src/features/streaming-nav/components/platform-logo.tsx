'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface PlatformLogoProps {
  name: string;
  logoUrl?: string;
  fallbackEmoji?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PlatformLogo: React.FC<PlatformLogoProps> = ({
  name,
  logoUrl,
  fallbackEmoji,
  className,
  size = 'md',
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  // Fallback: 显示 emoji 或首字母占位符
  if (!logoUrl || logoUrl.trim() === '' || imageError) {
    const displayContent = fallbackEmoji || name.charAt(0).toUpperCase();
    const isEmoji = !!fallbackEmoji;
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold',
          sizeClasses[size],
          className
        )}
        role="img"
        aria-label={`${name} logo`}
      >
        {isEmoji ? (
          <span role="img" aria-label={name}>
            {displayContent}
          </span>
        ) : (
          displayContent
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {/* 图片加载完成前显示骨架占位 */}
      {!imageLoaded && (
        <div className="absolute inset-0 rounded-lg bg-gray-100 dark:bg-slate-700 animate-pulse" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={cn(
          'object-contain rounded-lg transition-opacity duration-300',
          sizeClasses[size],
          imageLoaded ? 'opacity-100' : 'opacity-0'
        )}
        loading="lazy"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default PlatformLogo;
