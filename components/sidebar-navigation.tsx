"use client"

import React, { useState, useEffect } from "react"
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
  Scissors
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
      { id: "movie", label: "电影", icon: <Clapperboard className="h-3 w-3" /> }
    ]
  },
  {
    id: "news",
    label: "影视资讯",
    icon: <Calendar className="h-4 w-4" />,
    submenu: [
      { id: "upcoming", label: "即将上线", icon: <Clock className="h-3 w-3" /> },
      { id: "recent", label: "近期开播", icon: <Play className="h-3 w-3" /> }
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

  // 初始化时展开包含活动项的菜单
  useEffect(() => {
    if (activeMenu) {
      setExpandedMenus(prev => new Set([...prev, activeMenu]))
    }
  }, [activeMenu])

  // 菜单项悬停逻辑
  const handleMenuItemMouseEnter = (itemId: string) => {
    if (collapsed) {
      setHoveredMenuItem(itemId)
    }
  }

  const handleMenuItemMouseLeave = () => {
    if (collapsed) {
      setHoveredMenuItem(null)
    }
  }

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
      // 如果没有子菜单，切换展开状态
      toggleMenu(menuId)
    }
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "bg-white dark:bg-gray-900 border-r dark:border-gray-700 h-full transition-all duration-300 ease-in-out relative",
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={activeMenu === item.id ? "secondary" : "ghost"}
                          size="icon"
                          className="w-12 h-12"
                          onClick={() => handleMenuClick(item.id, item.submenu?.[0]?.id)}
                        >
                          {item.icon}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* 悬停展开的子菜单 */}
                    {hoveredMenuItem === item.id && item.submenu && (
                      <div
                        className="absolute left-16 top-0 w-48 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-md shadow-lg z-50"
                        style={{ top: `${index * 56}px` }}
                      >
                        <div className="p-2">
                          <div className="mb-2 px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
                            {item.label}
                          </div>
                          <div className="space-y-1">
                            {item.submenu.map((subitem) => (
                              <Button
                                key={subitem.id}
                                variant={
                                  activeMenu === item.id && activeSubmenu === subitem.id
                                    ? "default"
                                    : "ghost"
                                }
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => handleMenuClick(item.id, subitem.id)}
                              >
                                <div className="flex items-center space-x-2">
                                  {subitem.icon}
                                  <span>{subitem.label}</span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
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
    </TooltipProvider>
  )
}
