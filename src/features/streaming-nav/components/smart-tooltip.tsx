'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Platform } from '@/features/image-processing/lib/platform-data';

interface SmartTooltipProps {
  platform: Platform;
  children: React.ReactNode;
  disabled?: boolean;
}

const SmartTooltip: React.FC<SmartTooltipProps> = ({ platform, children, disabled = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // 检查上方空间
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    // 优先显示在上方，如果空间不足则显示在下方
    if (spaceAbove >= 200) {
      setPosition('top');
    } else if (spaceBelow >= 200) {
      setPosition('bottom');
    } else if (spaceRight >= 300) {
      setPosition('right');
    } else if (spaceLeft >= 300) {
      setPosition('left');
    } else {
      // 默认显示在空间最大的一侧
      const maxSpace = Math.max(spaceAbove, spaceBelow, spaceLeft, spaceRight);
      if (maxSpace === spaceAbove) setPosition('top');
      else if (maxSpace === spaceBelow) setPosition('bottom');
      else if (maxSpace === spaceRight) setPosition('right');
      else setPosition('left');
    }
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsVisible(true);
    // 延迟计算位置，确保tooltip已渲染
    setTimeout(calculatePosition, 10);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const getTooltipClasses = () => {
    const baseClasses = "absolute px-4 py-3 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm text-white text-sm rounded-xl shadow-2xl transition-all duration-300 pointer-events-none w-80 whitespace-normal border border-gray-700/50 dark:border-gray-600/50 z-50";
    
    const positionClasses = {
      top: "bottom-full left-1/2 transform -translate-x-1/2 mb-3",
      bottom: "top-full left-1/2 transform -translate-x-1/2 mt-3",
      left: "right-full top-1/2 transform -translate-y-1/2 mr-3",
      right: "left-full top-1/2 transform -translate-y-1/2 ml-3"
    };

    const visibilityClasses = isVisible ? "opacity-100 visible" : "opacity-0 invisible";

    return cn(baseClasses, positionClasses[position], visibilityClasses);
  };

  const getArrowClasses = () => {
    const arrowPositions = {
      top: "absolute top-full left-1/2 transform -translate-x-1/2",
      bottom: "absolute bottom-full left-1/2 transform -translate-x-1/2",
      left: "absolute left-full top-1/2 transform -translate-y-1/2",
      right: "absolute right-full top-1/2 transform -translate-y-1/2"
    };

    const arrowStyles = {
      top: "w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-gray-900/95 dark:border-t-gray-800/95",
      bottom: "w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-transparent border-b-gray-900/95 dark:border-b-gray-800/95",
      left: "w-0 h-0 border-t-[8px] border-b-[8px] border-l-[8px] border-transparent border-l-gray-900/95 dark:border-l-gray-800/95",
      right: "w-0 h-0 border-t-[8px] border-b-[8px] border-r-[8px] border-transparent border-r-gray-900/95 dark:border-r-gray-800/95"
    };

    return cn(arrowPositions[position], arrowStyles[position]);
  };

  return (
    <div 
      ref={triggerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {/* 智能定位的tooltip */}
      <div 
        ref={tooltipRef}
        className={getTooltipClasses()}
      >
        {/* 平台名称 */}
        <div className="font-semibold text-white mb-2 flex items-center justify-between">
          <span>{platform.name}</span>
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-yellow-400">{platform.rating}</span>
          </div>
        </div>
        
        {/* 平台描述 */}
        <div className="text-gray-300 dark:text-gray-400 text-xs leading-relaxed mb-3">
          {platform.description}
        </div>
        
        {/* 平台信息 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-400">地区: <span className="text-gray-300">{platform.region}</span></span>
            <span className="text-gray-400">分类: <span className="text-gray-300">{platform.category}</span></span>
          </div>
          {platform.popular && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full">
              <span className="text-xs text-orange-400 font-medium">热门</span>
            </div>
          )}
        </div>
        
        {/* 箭头 */}
        <div className={getArrowClasses()}></div>
      </div>
    </div>
  );
};

export default SmartTooltip;