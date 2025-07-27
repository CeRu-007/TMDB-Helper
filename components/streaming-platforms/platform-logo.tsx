'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface PlatformLogoProps {
  name: string;
  logoUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// 默认Logo映射 - 使用emoji作为fallback
const defaultLogos: Record<string, string> = {
  'Netflix': '🎬',
  'Disney+': '🏰',
  'Amazon Prime Video': '📺',
  'HBO Max': '🎭',
  'YouTube': '📹',
  'Hulu': '🟢',
  'Apple TV+': '🍎',
  'Paramount+': '⭐',
  'Peacock': '🦚',
  'Crunchyroll': '🍥',
  '爱奇艺': '🐨',
  '腾讯视频': '🐧',
  '优酷': '📱',
  'Bilibili': '📺',
  '芒果TV': '🥭',
  '咪咕视频': '📱',
  'U-NEXT': '🎌',
  'AbemaTV': '📺',
  'TVer': '📺',
  'FOD Premium': '🦊',
  'dTV': '📱',
  'dアニメストア': '🎌',
  'Niconico': '😊',
  'Wavve': '🌊',
  'Tving': '📺',
  'Coupang Play': '📦',
  'LINE TV': '💚',
  'LiTV': '📺',
  'friDay影音': '📱',
  'myVideo': '📹',
  'KKTV': '📺',
  'Viu': '💛',
  'myTV SUPER': '📺',
  'Now E': '📺',
  'Toggle': '🔄',
  'Starhub TV+': '⭐',
  'mewatch': '👁️'
};

const PlatformLogo: React.FC<PlatformLogoProps> = ({ 
  name, 
  logoUrl, 
  className, 
  size = 'md' 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl'
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // 如果有自定义Logo URL且未出错，显示图片
  if (logoUrl && !imageError) {
    return (
      <div className={cn(
        'relative flex items-center justify-center rounded-lg overflow-hidden bg-white/10',
        sizeClasses[size],
        className
      )}>
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5 animate-pulse">
            <div className="w-4 h-4 bg-white/20 rounded-full animate-bounce" />
          </div>
        )}
        <img
          src={logoUrl}
          alt={`${name} Logo`}
          className={cn(
            'w-full h-full object-contain transition-opacity duration-300',
            imageLoading ? 'opacity-0' : 'opacity-100'
          )}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      </div>
    );
  }

  // 使用默认emoji logo
  const defaultLogo = defaultLogos[name] || '📺';
  
  return (
    <div className={cn(
      'flex items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10',
      sizeClasses[size],
      className
    )}>
      <span className="select-none">{defaultLogo}</span>
    </div>
  );
};

export default PlatformLogo;