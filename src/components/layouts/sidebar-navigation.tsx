"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  ChevronDown,
  ChevronRight,
  Film,
  Calendar,
  Image,
  Activity,
  LayoutGrid,
  Sparkles,
  Tv,
  Baby,
  Popcorn,
  Ticket,
  Clapperboard,
  Clock,
  Play,
  Download,
  Scissors,
  Wand2,
  FileText,
  Search,
  BookOpen
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/common/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/common/collapsible"

export interface SidebarNavigationProps {
  onMenuSelect: (menuId: string, submenuId?: string) => void
  activeMenu?: string
  activeSubmenu?: string
  collapsed?: boolean
}

interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  submenu?: {
    id: string
    label: string
    icon?: React.ReactNode
  }[]
}

const menuItems: MenuItem[] = [
  {
    id: "maintenance",
    label: "词条维护",
    icon: <LayoutGrid className="h-4 w-4" />,
    submenu: [
      { id: "all", label: "全部", icon: <LayoutGrid className="h-3 w-3" /> },
      { id: "anime", label: "动漫", icon: <Sparkles className="h-3 w-3" /> },
      { id: "tv", label: "电视剧", icon: <Tv className="h-3 w-3" /> },
      { id: "kids", label: "少儿", icon: <Baby className="h-3 w-3" /> },
      { id: "variety", label: "综艺", icon: <Popcorn className="h-3 w-3" /> },
      { id: "short", label: "短剧", icon: <Ticket className="h-3 w-3" /> },
      { id: "independent", label: "独立维护", icon: <Wand2 className="h-3 w-3" /> },
    ]
  },
  {
    id: "news",
    label: "影视资讯",
    icon: <Calendar className="h-4 w-4" />,
    submenu: [
      { id: "upcoming", label: "即将上线", icon: <Clock className="h-3 w-3" /> },
      { id: "recent", label: "近期开播", icon: <Play className="h-3 w-3" /> },
      { id: "streaming-nav", label: "平台导航", icon: <Film className="h-3 w-3" /> }
    ]
  },
  {
    id: "tmdb-guide",
    label: "编辑指南",
    icon: <BookOpen className="h-4 w-4" />
  },
  {
    id: "image-recognition",
    label: "影视识别",
    icon: <Search className="h-4 w-4" />
  },
  {
    id: "content-generation",
    label: "分集简介",
    icon: <FileText className="h-4 w-4" />,
    submenu: [
      { id: "episode-generator", label: "AI生成", icon: <Wand2 className="h-3 w-3" /> },
      { id: "ai-chat", label: "AI对话", icon: <Sparkles className="h-3 w-3" /> }
    ]
  },
  {
    id: "thumbnails",
    label: "缩略图",
    icon: <Image className="h-4 w-4" />,
    submenu: [
      { id: "extract", label: "分集图片提取", icon: <Download className="h-3 w-3" /> },
      { id: "crop", label: "分集图片裁切", icon: <Scissors className="h-3 w-3" /> }
    ]
  }
]

export function SidebarNavigation({
  onMenuSelect,
  activeMenu,
  activeSubmenu,
  collapsed = false
}: SidebarNavigationProps) {
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null)
  const [submenuHovered, setSubmenuHovered] = useState<boolean>(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 初始化时展开包含活动项的菜单
  useEffect(() => {
    if (activeMenu) {
      setExpandedMenus(prev => new Set([...prev, activeMenu]))
    }
  }, [activeMenu])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  // 清除隐藏定时器
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  // 菜单项悬停逻辑
  const handleMenuItemMouseEnter = useCallback((itemId: string) => {
    if (collapsed) {
      clearHideTimeout()
      setHoveredMenuItem(itemId)
    }
  }, [collapsed, clearHideTimeout])

  const handleMenuItemMouseLeave = useCallback(() => {
    if (collapsed) {
      // 延迟隐藏，给用户时间移动到子菜单
      hideTimeoutRef.current = setTimeout(() => {
        if (!submenuHovered) {
          setHoveredMenuItem(null)
        }
      }, 150)
    }
  }, [collapsed, submenuHovered])

  // 子菜单悬停逻辑
  const handleSubmenuMouseEnter = useCallback(() => {
    clearHideTimeout()
    setSubmenuHovered(true)
  }, [clearHideTimeout])

  const handleSubmenuMouseLeave = useCallback(() => {
    setSubmenuHovered(false)
    setHoveredMenuItem(null)
  }, [])

  // 计算子菜单位置，紧贴侧边栏边缘
  const getSubmenuPosition = useCallback((index: number) => {
    const buttonHeight = 56 // 按钮高度 (h-12 + margin)
    const submenuHeight = 250 // 估算的子菜单高度
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    const headerHeight = 64 // header高度
    const sidebarWidth = 64 // 收起状态下的侧边栏宽度

    // 计算理想位置 - 与按钮垂直对齐
    let topPosition = headerHeight + (index * buttonHeight) + 8 // 8px微调对齐

    // 检查是否会超出底部边界
    const availableSpace = viewportHeight - topPosition - 20 // 留20px缓冲
    if (availableSpace < submenuHeight) {
      // 如果空间不足，向上调整位置
      topPosition = Math.max(headerHeight + 8, topPosition - (submenuHeight - availableSpace))
    }

    return {
      top: `${topPosition}px`,
      left: `${sidebarWidth}px` // 紧贴侧边栏右边缘
    }
  }, [])

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev)
      if (newSet.has(menuId)) {
        newSet.delete(menuId)
      } else {
        newSet.add(menuId)
      }
      return newSet
    })
  }

  const handleMenuClick = (menuId: string, submenuId?: string) => {
    if (submenuId) {
      onMenuSelect(menuId, submenuId)
      // 点击子菜单项后，如果是收起状态，自动收起悬停菜单
      if (collapsed) {
        setHoveredMenuItem(null)
      }
    } else {
      // 检查是否有子菜单
      const menuItem = menuItems.find(item => item.id === menuId)
      if (menuItem?.submenu && menuItem.submenu.length > 0) {
        // 如果有子菜单，切换展开状态
        toggleMenu(menuId)
      } else {
        // 如果没有子菜单，直接导航到该菜单
        onMenuSelect(menuId)
      }
    }
  }

  return (
    <div
      className={cn(
        "h-full transition-all duration-300 ease-in-out relative",
        collapsed ? "w-16" : "w-64"
      )}
    >

      {/* 主侧边栏内容 */}
      <div className={collapsed ? "p-2" : "p-4"}>
        <nav className="space-y-2">
          {menuItems.map((item, index) => (
            <div key={item.id} className="relative">
              {collapsed ? (
                // 收起状态：只显示图标，带悬停展开子菜单
                <div
                  onMouseEnter={() => handleMenuItemMouseEnter(item.id)}
                  onMouseLeave={handleMenuItemMouseLeave}
                  className="relative"
                >
                  <Button
                    variant={activeMenu === item.id ? "secondary" : "ghost"}
                    size="icon"
                    className={`w-12 h-12 relative transition-all duration-200 ${activeMenu === item.id
                      ? "bg-blue-100 dark:bg-blue-900/50 border-r-2 border-r-blue-500"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    onClick={() => {
                      const menuItem = menuItems.find(m => m.id === item.id)
                      if (menuItem?.submenu && menuItem.submenu.length > 0) {
                        handleMenuClick(item.id, item.submenu[0].id)
                      } else {
                        handleMenuClick(item.id)
                      }
                    }}
                  >
                    {item.icon}
                    {/* 激活状态指示器 */}
                    {activeMenu === item.id && (
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-l-full"></div>
                    )}
                  </Button>

                  {/* 悬停展开的子菜单 - 紧凑现代设计 */}
                  {hoveredMenuItem === item.id && item.submenu && (
                    <>
                      {/* 连接指示器 - 从按钮到子菜单的视觉桥梁 */}
                      <div
                        className="fixed w-1 h-12 bg-blue-500 z-[99] transition-all duration-300 ease-out"
                        style={{
                          top: `${64 + (index * 56) + 8}px`, // 与按钮对齐
                          left: '63px', // 侧边栏右边缘
                        }}
                      />

                      <div
                        className="fixed w-36 bg-white dark:bg-gray-800 border-l-4 border-l-blue-500 border-r border-t border-b border-gray-200 dark:border-gray-600 shadow-2xl z-[100] transition-all duration-300 ease-out"
                        style={{
                          ...getSubmenuPosition(index),
                          transform: 'translateX(-1px)',
                          boxShadow: '4px 0 20px -2px rgba(0, 0, 0, 0.1), 0 8px 25px -5px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseEnter={handleSubmenuMouseEnter}
                        onMouseLeave={handleSubmenuMouseLeave}
                      >
                        <div className="py-1">
                          {/* 移除标题，直接显示菜单项 */}
                          <div className="space-y-0">
                            {item.submenu.map((subitem, subIndex) => (
                              <div
                                key={subitem.id}
                                className={`relative cursor-pointer transition-all duration-200 ${activeMenu === item.id && activeSubmenu === subitem.id
                                  ? "bg-blue-500 text-white"
                                  : "hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-700 dark:text-gray-300"
                                  }`}
                                onClick={() => handleMenuClick(item.id, subitem.id)}
                              >
                                {/* 左侧蓝色指示条 */}
                                {activeMenu === item.id && activeSubmenu === subitem.id && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                                )}

                                <div className="flex items-center px-3 py-2.5">
                                  <div className="flex items-center space-x-2 w-full">
                                    <div className="flex-shrink-0">
                                      {subitem.icon && React.cloneElement(subitem.icon as React.ReactElement, {
                                        className: "h-3.5 w-3.5"
                                      })}
                                    </div>
                                    <span className="text-xs font-medium truncate flex-1">
                                      {subitem.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                // 展开状态：显示完整菜单
                item.submenu ? (
                  <Collapsible
                    open={expandedMenus.has(item.id)}
                    onOpenChange={() => toggleMenu(item.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant={activeMenu === item.id ? "secondary" : "ghost"}
                        className="w-full justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                        {expandedMenus.has(item.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      {item.submenu.map((subitem) => (
                        <Button
                          key={subitem.id}
                          variant={
                            activeMenu === item.id && activeSubmenu === subitem.id
                              ? "default"
                              : "ghost"
                          }
                          size="sm"
                          className="w-full justify-start pl-8"
                          onClick={() => handleMenuClick(item.id, subitem.id)}
                        >
                          <div className="flex items-center space-x-2">
                            {subitem.icon}
                            <span>{subitem.label}</span>
                          </div>
                        </Button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <Button
                    variant={activeMenu === item.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleMenuClick(item.id)}
                  >
                    <div className="flex items-center space-x-2">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  </Button>
                )
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
