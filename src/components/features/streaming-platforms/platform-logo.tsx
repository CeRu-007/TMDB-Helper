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

  // 如果没有logoUrl或logoUrl为空，显示首字母占位符
  if (!logoUrl || logoUrl.trim() === '' || imageError) {
    const firstLetter = name.charAt(0).toUpperCase();
    return (
      <div className={cn(
        'flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold',
        sizeClasses[size],
        className
      )}>
        {firstLetter}
      </div>
    );
  }

  // 如果有logoUrl且未出错，直接显示图片
  return (
    <img
      src={logoUrl}
      alt={`${name} Logo`}
      className={cn('object-contain rounded-lg', sizeClasses[size], className)}
      loading="lazy"
      decoding="async"
      onError={() => setImageError(true)}
    />
  );
};

export default PlatformLogo;