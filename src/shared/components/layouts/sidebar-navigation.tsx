"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
  Film,
  Calendar,
  Image,
  LayoutGrid,
  Sparkles,
  Clock,
  Play,
  Download,
  Scissors,
  Wand2,
  FileText,
  Search,
  BookOpen,
  Type,
  CalendarDays,
  Clapperboard,
  Settings
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"

export interface SidebarNavigationProps {
  onMenuSelect: (menuId: string, submenuId?: string) => void
  activeMenu?: string
  activeSubmenu?: string
  collapsed?: boolean
}

interface MenuItem {
  id: string
  labelKey: string
  ns: string
  icon: React.ReactNode
  groupId: string
}

interface MenuGroup {
  id: string
  titleKey: string
  ns: string
  icon: React.ReactNode
  items: MenuItem[]
}

export function SidebarNavigation({
  onMenuSelect,
  activeMenu,
  activeSubmenu,
  collapsed = false
}: SidebarNavigationProps) {
  const { t } = useTranslation()
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null)
  const [submenuHovered, setSubmenuHovered] = useState<boolean>(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const menuGroups: MenuGroup[] = [
    {
      id: "maintenance",
      titleKey: "title",
      ns: "nav.maintenance",
      icon: <LayoutGrid className="h-4 w-4" />,
      items: [
        { id: "list", labelKey: "list", ns: "nav.maintenance", icon: <LayoutGrid className="h-4 w-4" />, groupId: "maintenance" },
        { id: "independent", labelKey: "independent", ns: "nav.maintenance", icon: <Wand2 className="h-4 w-4" />, groupId: "maintenance" },
      ]
    },
    {
      id: "news",
      titleKey: "title",
      ns: "nav.news",
      icon: <Calendar className="h-4 w-4" />,
      items: [
        { id: "upcoming", labelKey: "upcoming", ns: "nav.news", icon: <Clock className="h-4 w-4" />, groupId: "news" },
        { id: "recent", labelKey: "recent", ns: "nav.news", icon: <Play className="h-4 w-4" />, groupId: "news" },
        { id: "streaming-nav", labelKey: "streamingNav", ns: "nav.news", icon: <Film className="h-4 w-4" />, groupId: "news" },
        { id: "schedule", labelKey: "schedule", ns: "nav.news", icon: <CalendarDays className="h-4 w-4" />, groupId: "news" },
      ]
    },
    {
      id: "content",
      titleKey: "title",
      ns: "nav.content",
      icon: <FileText className="h-4 w-4" />,
      items: [
        { id: "episode-generator", labelKey: "episodeGenerator", ns: "nav.content", icon: <Wand2 className="h-4 w-4" />, groupId: "content" },
        { id: "ai-chat", labelKey: "aiChat", ns: "nav.content", icon: <Sparkles className="h-4 w-4" />, groupId: "content" },
        { id: "hard-subtitle-extract", labelKey: "hardSubtitleExtract", ns: "nav.content", icon: <Type className="h-4 w-4" />, groupId: "content" },
      ]
    },
    {
      id: "image",
      titleKey: "title",
      ns: "nav.image",
      icon: <Image className="h-4 w-4" />,
      items: [
        { id: "extract", labelKey: "extract", ns: "nav.image", icon: <Download className="h-4 w-4" />, groupId: "image" },
        { id: "crop", labelKey: "crop", ns: "nav.image", icon: <Scissors className="h-4 w-4" />, groupId: "image" },
      ]
    },
    {
      id: "tools",
      titleKey: "title",
      ns: "nav.tools",
      icon: <Settings className="h-4 w-4" />,
      items: [
        { id: "tmdb-guide", labelKey: "tmdbGuide", ns: "nav.tools", icon: <BookOpen className="h-4 w-4" />, groupId: "tools" },
        { id: "image-recognition", labelKey: "imageRecognition", ns: "nav.tools", icon: <Search className="h-4 w-4" />, groupId: "tools" },
      ]
    },
  ]

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  const handleGroupMouseEnter = useCallback((groupId: string) => {
    if (collapsed) {
      clearHideTimeout()
      setHoveredGroup(groupId)
    }
  }, [collapsed, clearHideTimeout])

  const handleGroupMouseLeave = useCallback(() => {
    if (collapsed) {
      hideTimeoutRef.current = setTimeout(() => {
        if (!submenuHovered) {
          setHoveredGroup(null)
        }
      }, 150)
    }
  }, [collapsed, submenuHovered])

  const handleSubmenuMouseEnter = useCallback(() => {
    clearHideTimeout()
    setSubmenuHovered(true)
  }, [clearHideTimeout])

  const handleSubmenuMouseLeave = useCallback(() => {
    setSubmenuHovered(false)
    setHoveredGroup(null)
  }, [])

  const handleMenuClick = (groupId: string, itemId: string) => {
    onMenuSelect(groupId, itemId)
    if (collapsed) {
      setHoveredGroup(null)
    }
  }

  const getSubmenuPosition = useCallback((groupIndex: number) => {
    const buttonHeight = 56
    const sidebarWidth = 64
    const headerHeight = 64

    const topPosition = headerHeight + (groupIndex * buttonHeight) + 8

    return {
      top: `${topPosition}px`,
      left: `${sidebarWidth}px`
    }
  }, [])

  return (
    <div
      className={cn(
        "h-full transition-all duration-300 ease-in-out relative",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className={collapsed ? "p-2" : "p-4"}>
        <nav className="space-y-4">
          {menuGroups.map((group, groupIndex) => (
            <div key={group.id} className="relative">
              {collapsed ? (
                <div
                  onMouseEnter={() => handleGroupMouseEnter(group.id)}
                  onMouseLeave={handleGroupMouseLeave}
                  className="relative"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-12 h-12 relative transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {group.icon}
                  </Button>

                  {hoveredGroup === group.id && (
                    <>
                      <div
                        className="fixed w-1 bg-blue-500 z-[99]"
                        style={{
                          top: `${64 + (groupIndex * 56) + 8}px`,
                          left: '63px',
                          height: `${group.items.length * 36}px`
                        }}
                      />
                      <div
                        className="fixed w-40 bg-white dark:bg-gray-800 border-l-4 border-l-blue-500 border-r border-t border-b border-gray-200 dark:border-gray-600 shadow-2xl z-[100] rounded-r-lg overflow-hidden"
                        style={{
                          ...getSubmenuPosition(groupIndex),
                          transform: 'translateX(-1px)',
                        }}
                        onMouseEnter={handleSubmenuMouseEnter}
                        onMouseLeave={handleSubmenuMouseLeave}
                      >
                        <div className="py-2">
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t(group.titleKey, { ns: group.ns })}
                          </div>
                          {group.items.map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                "relative cursor-pointer transition-all duration-200 px-3 py-2",
                                activeMenu === group.id && activeSubmenu === item.id
                                  ? "bg-blue-500 text-white"
                                  : "hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-700 dark:text-gray-300"
                              )}
                              onClick={() => handleMenuClick(group.id, item.id)}
                            >
                              <div className="flex items-center space-x-2">
                                {item.icon && React.cloneElement(item.icon as React.ReactElement, {
                                  className: "h-4 w-4"
                                })}
                                <span className="text-sm font-medium truncate">
                                  {t(item.labelKey, { ns: item.ns })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center space-x-2">
                    {group.icon}
                    <span>{t(group.titleKey, { ns: group.ns })}</span>
                  </div>

                  <div className="space-y-0.5 pl-2">
                    {group.items.map((item) => (
                      <Button
                        key={item.id}
                        variant={
                          activeMenu === group.id && activeSubmenu === item.id
                            ? "secondary"
                            : "ghost"
                        }
                        size="sm"
                        className={cn(
                          "w-full justify-start h-9",
                          activeMenu === group.id && activeSubmenu === item.id
                            ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-r-blue-500"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        onClick={() => handleMenuClick(group.id, item.id)}
                      >
                        <div className="flex items-center space-x-2">
                          {item.icon}
                          <span className="text-sm">{t(item.labelKey, { ns: item.ns })}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}