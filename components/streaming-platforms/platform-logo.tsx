'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface PlatformLogoProps {
  name: string;
  logoUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PlatformLogo: React.FC<PlatformLogoProps> = ({ 
  name, 
  logoUrl, 
  className, 
  size = 'md' 
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  // 如果没有logoUrl或logoUrl为空，返回空的div
  if (!logoUrl || logoUrl.trim() === '') {
    return <div className={cn(sizeClasses[size], className)} />;
  }

  // 如果有logoUrl且未出错，直接显示图片
  if (!imageError) {
    return (
      <img
        src={logoUrl}
        alt={`${name} Logo`}
        className={cn('object-contain', sizeClasses[size], className)}
        loading="lazy"
        decoding="async"
        onError={() => setImageError(true)}
      />
    );
  }

  // 如果图片加载失败，返回空白
  return <div className={cn(sizeClasses[size], className)} />;
};

export default PlatformLogo;
