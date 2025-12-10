import React from 'react';
import { ExternalLink } from 'lucide-react';

export type PlatformIconType = 
  | 'netflix' 
  | 'primevideo' 
  | 'disneyplus' 
  | 'hbomax' 
  | 'bilibili'
  | 'iqiyi'
  | 'youku'
  | 'tencent'
  | 'appletv'
  | 'hulu'
  | 'peacock'
  | 'generic';

// 创建一个运行时可访问的平台类型数组
export const PLATFORM_TYPES = [
  'netflix',
  'primevideo',
  'disneyplus',
  'hbomax',
  'bilibili',
  'iqiyi',
  'youku',
  'tencent',
  'appletv',
  'hulu',
  'peacock',
  'generic'
] as const;

interface PlatformIconProps {
  platform: PlatformIconType;
  size?: number;
  className?: string;
}

export function PlatformIcon({ platform, size = 24, className = '' }: PlatformIconProps) {
  // 图标填充颜色，默认为currentColor以继承父元素颜色
  const fillColor = 'currentColor';
  
  // 通用样式
  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className
  };

  // 根据平台返回对应的图标
  switch (platform) {
    case 'netflix':
      return (
        <svg {...svgProps} viewBox="0 0 24 24">
          <path 
            d="M5 2V22L12.3182 20.5L19.5 22V2H5Z" 
            fill={fillColor} 
            fillOpacity="0.1"
          />
          <path 
            d="M15 2V18.5L12 17.5L9 18.5V2H15Z" 
            fill={fillColor} 
          />
        </svg>
      );
      
    case 'primevideo':
      return (
        <svg {...svgProps} viewBox="0 0 24 24">
          <path 
            d="M20 5H4C3.44772 5 3 5.44772 3 6V18C3 18.5523 3.44772 19 4 19H20C20.5523 19 21 18.5523 21 18V6C21 5.44772 20.5523 5 20 5Z" 
            fill={fillColor} 
            fillOpacity="0.1"
          />
          <path 
            d="M15 9.5L10.5 7V12L15 14.5V9.5Z" 
            fill={fillColor} 
          />
        </svg>
      );
      
    case 'disneyplus':
      return (
        <svg {...svgProps} viewBox="0 0 24 24">
          <path 
            d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
            fill={fillColor} 
            fillOpacity="0.1"
          />
          <path 
            d="M15.5 10.5H14L12 13L10 10.5H8.5V15H10V12.5L11.5 14.5H12.5L14 12.5V15H15.5V10.5Z" 
            fill={fillColor} 
          />
        </svg>
      );
      
    case 'bilibili':
      return (
        <svg {...svgProps} viewBox="0 0 24 24">
          <rect 
            x="3" 
            y="6" 
            width="18" 
            height="14" 
            rx="2" 
            fill={fillColor} 
            fillOpacity="0.1"
          />
          <circle cx="8" cy="12" r="1.5" fill={fillColor} />
          <circle cx="16" cy="12" r="1.5" fill={fillColor} />
          <path 
            d="M3 9H21" 
            stroke={fillColor} 
            strokeWidth="1.5" 
          />
        </svg>
      );
      
    case 'iqiyi':
      return (
        <svg {...svgProps} viewBox="0 0 24 24">
          <path 
            d="M19.7782 5H4.22183C3.54658 5 3 5.55964 3 6.25V17.75C3 18.4404 3.54658 19 4.22183 19H19.7782C20.4534 19 21 18.4404 21 17.75V6.25C21 5.55964 20.4534 5 19.7782 5Z" 
            fill={fillColor} 
            fillOpacity="0.1"
          />
          <path 
            d="M12 8.5V15.5M8 9L8 15M16 9V15" 
            stroke={fillColor} 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </svg>
      );
      
    // 通用图标作为默认
    default:
      return (
        <svg {...svgProps} viewBox="0 0 24 24">
          <rect 
            x="3" 
            y="5" 
            width="18" 
            height="14" 
            rx="2" 
            fill={fillColor} 
            fillOpacity="0.1"
          />
          <ExternalLink className={className} size={size * 0.7} />
        </svg>
      );
  }
}

interface PlatformLogoProps {
  platform: string;
  url?: string;
  size?: number;
  onClick?: () => void;
  className?: string;
}

export function PlatformLogo({ platform, url, size = 24, onClick, className = '' }: PlatformLogoProps) {
  // 确定图标类型
  const iconType = platform.toLowerCase().replace(/[^a-z]/g, '') as PlatformIconType;
  
  // 使用通用平台图标作为后备
  // 修改: 使用 PLATFORM_TYPES 数组而不是 Object.values(PlatformIconType)
  const platformType = PLATFORM_TYPES.includes(iconType as any) 
    ? iconType 
    : 'generic';
  
  return (
    <div 
      className={`flex items-center justify-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      title={url ? `在${platform}上观看` : platform}
    >
      <PlatformIcon platform={platformType} size={size} />
    </div>
  );
} 