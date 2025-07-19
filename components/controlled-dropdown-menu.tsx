'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ControlledDropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  className?: string;
  contentClassName?: string;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  zIndex?: number;
}

/**
 * 受控的下拉菜单组件
 * 解决下拉菜单状态管理问题，确保稳定的交互行为
 */
export function ControlledDropdownMenu({
  children,
  trigger,
  align = 'end',
  side = 'bottom',
  sideOffset = 5,
  className,
  contentClassName,
  onOpenChange,
  disabled = false,
  zIndex = 9999
}: ControlledDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 处理菜单开关状态
  const handleOpenChange = useCallback((open: boolean) => {
    if (disabled) return;
    
    setIsOpen(open);
    onOpenChange?.(open);
    
    console.log(`[ControlledDropdownMenu] 状态变更: ${open ? '打开' : '关闭'}`);
  }, [disabled, onOpenChange]);

  // 处理菜单项点击
  const handleMenuItemClick = useCallback((callback?: () => void) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      
      // 执行回调
      callback?.();
      
      // 关闭菜单
      handleOpenChange(false);
    };
  }, [handleOpenChange]);

  // 处理触发器点击
  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (disabled) return;
    
    // 切换菜单状态
    handleOpenChange(!isOpen);
  }, [disabled, isOpen, handleOpenChange]);

  // 处理外部点击关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      
      const target = event.target as Node;
      
      // 如果点击的是触发器或内容区域，不关闭菜单
      if (triggerRef.current?.contains(target) || 
          contentRef.current?.contains(target)) {
        return;
      }
      
      // 关闭菜单
      handleOpenChange(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, handleOpenChange]);

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        handleOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleOpenChange]);

  // 克隆触发器，添加事件处理
  const clonedTrigger = React.cloneElement(trigger as React.ReactElement, {
    ref: triggerRef,
    onClick: handleTriggerClick,
    'data-state': isOpen ? 'open' : 'closed',
    'aria-expanded': isOpen,
    disabled
  });

  // 递归处理子元素，为 DropdownMenuItem 添加点击处理
  const processChildren = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) {
        return child;
      }

      // 如果是 DropdownMenuItem，添加点击处理
      if (child.type === DropdownMenuItem) {
        const originalOnClick = child.props.onClick;
        
        return React.cloneElement(child, {
          ...child.props,
          onClick: handleMenuItemClick(originalOnClick)
        });
      }

      // 如果有子元素，递归处理
      if (child.props.children) {
        return React.cloneElement(child, {
          ...child.props,
          children: processChildren(child.props.children)
        });
      }

      return child;
    });
  };

  return (
    <DropdownMenu 
      open={isOpen} 
      onOpenChange={handleOpenChange}
    >
      <DropdownMenuTrigger asChild>
        {clonedTrigger}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        ref={contentRef}
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={contentClassName}
        style={{ zIndex }}
        onCloseAutoFocus={(e) => {
          // 防止自动聚焦导致的问题
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // 确保 Escape 键能正确关闭菜单
          handleOpenChange(false);
        }}
        onPointerDownOutside={(e) => {
          // 处理外部点击
          const target = e.target as Node;
          if (triggerRef.current?.contains(target)) {
            e.preventDefault();
          }
        }}
      >
        {processChildren(children)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 导出便捷的菜单项组件
export { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

// 使用示例的类型定义
export interface MenuItemProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * 便捷的菜单项组件
 */
export function MenuItem({ onClick, disabled, className, children }: MenuItemProps) {
  return (
    <DropdownMenuItem 
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </DropdownMenuItem>
  );
}

/**
 * 便捷的菜单分隔符组件
 */
export function MenuSeparator() {
  return <DropdownMenuSeparator />;
}

// Hook：用于管理多个下拉菜单的状态
export function useDropdownMenuManager() {
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  const handleMenuOpenChange = useCallback((menuId: string, open: boolean) => {
    setOpenMenus(prev => {
      const newSet = new Set(prev);
      if (open) {
        // 关闭其他所有菜单，只保持当前菜单打开
        newSet.clear();
        newSet.add(menuId);
      } else {
        newSet.delete(menuId);
      }
      return newSet;
    });
  }, []);

  const closeAllMenus = useCallback(() => {
    setOpenMenus(new Set());
  }, []);

  const isMenuOpen = useCallback((menuId: string) => {
    return openMenus.has(menuId);
  }, [openMenus]);

  return {
    openMenus,
    handleMenuOpenChange,
    closeAllMenus,
    isMenuOpen
  };
}
