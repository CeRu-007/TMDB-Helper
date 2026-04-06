"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Calendar, PlayCircle, ChevronDown, Check } from "lucide-react"
import { REGIONS, REGION_GROUPS } from "@/lib/constants/regions"

interface RegionNavigationProps {
  selectedRegion: string
  setSelectedRegion: (region: string) => void
  mediaNewsType: 'upcoming' | 'recent'
  setMediaNewsType: (type: 'upcoming' | 'recent') => void
  upcomingItemsByRegion: Record<string, any[]>
  recentItemsByRegion: Record<string, any[]>
  items: unknown[]
}

export function RegionNavigation({
  selectedRegion,
  setSelectedRegion,
  mediaNewsType,
  setMediaNewsType,
  upcomingItemsByRegion,
  recentItemsByRegion,
  items
}: RegionNavigationProps) {
  const { t } = useTranslation("nav.news")
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get items for the current media type
  const getItemsByRegion = (regionId: string) => {
    return mediaNewsType === 'upcoming'
      ? (upcomingItemsByRegion[regionId] || [])
      : (recentItemsByRegion[regionId] || [])
  }

  // Filter out items that already exist in the user's list
  const getValidItems = (regionItems: any[]) => {
    return regionItems.filter(item =>
      !items.some(existingItem =>
        existingItem.tmdbId === item.id.toString() &&
        existingItem.mediaType === item.mediaType
      )
    )
  }

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  // ESC 键关闭下拉菜单
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // 处理区域选择
  const handleRegionSelect = useCallback((regionId: string) => {
    setSelectedRegion(regionId)
    setIsOpen(false)
  }, [setSelectedRegion])

  // 切换下拉菜单
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  // Get button classes for media type toggle
  const getMediaTypeButtonClasses = (type: 'upcoming' | 'recent') => {
    const isActive = mediaNewsType === type
    const baseClasses = "px-2.5 py-1 rounded-sm text-sm font-medium transition-all duration-200"

    return isActive
      ? `${baseClasses} bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400 shadow-sm`
      : `${baseClasses} text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50`
  }

  const selectedRegionData = REGIONS.find(r => r.id === selectedRegion)

  return (
    <div className="mb-4 border-b border-blue-100/70 dark:border-blue-900/30 pb-3">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          {/* 当前选中区域显示和切换按钮集成 */}
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">{t("regionLabel")}:</span>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className={`flex items-center bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-md border shadow-sm transition-all text-sm select-none ${
                  isOpen
                    ? 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20'
                    : 'border-blue-100 dark:border-blue-800/30 hover:bg-white dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
              >
                <div className={`flex items-center justify-center w-6 h-6 rounded-full shadow-inner mr-2 transition-colors ${
                  isOpen
                    ? 'bg-blue-100 dark:bg-blue-800/50'
                    : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30'
                }`}>
                  <span className="text-base">{selectedRegionData?.icon}</span>
                </div>
                <span className="font-medium text-sm text-blue-700 dark:text-blue-300 mr-1.5">
                  {selectedRegionData?.name}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-blue-500' : ''
                }`} />
              </button>

              {/* 下拉菜单 */}
              <div className={`absolute left-0 mt-1 w-56 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-blue-100 dark:border-blue-800/50 z-50 overflow-hidden transition-all duration-200 origin-top-left ${
                isOpen
                  ? 'opacity-100 scale-100 translate-y-0 visible'
                  : 'opacity-0 scale-95 -translate-y-1 invisible pointer-events-none'
              }`}>
                <div className="p-2 max-h-[320px] overflow-y-auto scrollbar-thin">
                  {REGION_GROUPS.map(group => {
                    const groupKey = group.name === "亚洲" ? "regionGroup.asia" : "regionGroup.western"
                    return (
                    <div key={group.name} className="mb-2 last:mb-0">
                      <div className="flex items-center px-2 py-1">
                        <div className="h-px w-2 bg-blue-200 dark:bg-blue-800/70 mr-1.5"></div>
                        <span className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80 uppercase tracking-wider">
                          {t(groupKey)}
                        </span>
                        <div className="h-px flex-grow bg-blue-200 dark:bg-blue-800/70 ml-1.5"></div>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {group.regions.map(regionId => {
                          const region = REGIONS.find(r => r.id === regionId)
                          if (!region) return null

                          const isActive = selectedRegion === regionId
                          const regionItems = getItemsByRegion(regionId)
                          const validItems = getValidItems(regionItems)

                          return (
                            <button
                              key={regionId}
                              onClick={() => handleRegionSelect(regionId)}
                              className={`flex items-center justify-between w-full px-2.5 py-2 text-xs rounded-md transition-all duration-150 group/region ${
                                isActive
                                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-700 dark:text-blue-300 shadow-sm"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                              }`}
                              role="option"
                              aria-selected={isActive}
                            >
                              <div className="flex items-center">
                                <div className={`w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
                                  isActive
                                    ? "bg-white dark:bg-gray-800 shadow-inner"
                                    : "bg-gray-100 dark:bg-gray-700/50 group-hover/region:bg-white dark:group-hover/region:bg-gray-700"
                                }`}>
                                  <span className="text-sm">{region.icon}</span>
                                </div>
                                <span className="ml-2 text-xs font-medium">{t(`regions.${regionId}`)}</span>
                                {isActive && (
                                  <Check className="ml-2 h-3 w-3 text-blue-500" />
                                )}
                              </div>
                              {validItems.length > 0 && (
                                <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium min-w-[1.25rem] text-center ${
                                  isActive
                                    ? "bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-300"
                                    : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                                }`}>
                                  {validItems.length}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            </div>
          </div>

          {/* 媒体资讯类型切换按钮 */}
          <div className="inline-flex p-0.5 rounded-md shadow-sm border border-blue-100 dark:border-blue-900/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <button
              onClick={() => setMediaNewsType('upcoming')}
              className={getMediaTypeButtonClasses('upcoming')}
            >
              <div className="flex items-center space-x-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{t("upcoming")}</span>
              </div>
            </button>
            <button
              onClick={() => setMediaNewsType('recent')}
              className={getMediaTypeButtonClasses('recent')}
            >
              <div className="flex items-center space-x-1.5">
                <PlayCircle className="h-3.5 w-3.5" />
                <span>{t("recent")}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}