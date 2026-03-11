import React, { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import { RefreshCw, ChevronDown, Check } from "lucide-react"
import { TMDBItem } from "@/types/tmdb-item"

interface SidebarRegionNavigationProps {
  selectedRegion: string
  mediaNewsType: 'upcoming' | 'recent'
  upcomingItemsByRegion: Record<string, TMDBItem[]>
  recentItemsByRegion: Record<string, TMDBItem[]>
  existingItems: TMDBItem[]
  onRefresh: () => void
  onRegionSelect: (region: string) => void
  isLoading: boolean
  refreshText?: string
}

const REGIONS = [
  { id: "CN", name: "中国大陆", icon: "🇨🇳" },
  { id: "HK", name: "香港", icon: "🇭🇰" },
  { id: "TW", name: "台湾", icon: "🇹🇼" },
  { id: "JP", name: "日本", icon: "🇯🇵" },
  { id: "KR", name: "韩国", icon: "🇰🇷" },
  { id: "US", name: "美国", icon: "🇺🇸" },
  { id: "GB", name: "英国", icon: "🇬🇧" },
]

const REGION_GROUPS = [
  {
    name: "亚洲",
    regions: ["CN", "HK", "TW", "JP", "KR"]
  },
  {
    name: "欧美",
    regions: ["US", "GB"]
  }
]

export function SidebarRegionNavigation({
  selectedRegion,
  mediaNewsType,
  upcomingItemsByRegion,
  recentItemsByRegion,
  existingItems,
  onRefresh,
  onRegionSelect,
  isLoading,
  refreshText = "刷新"
}: SidebarRegionNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    onRegionSelect(regionId)
    setIsOpen(false)
  }, [onRegionSelect])

  // 切换下拉菜单
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const selectedRegionData = REGIONS.find(r => r.id === selectedRegion)

  return (
    <div className="mb-4 border-b border-blue-100/70 dark:border-blue-900/30 pb-3">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between">
          {/* Current region selector */}
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">区域:</span>
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
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {selectedRegionData?.icon || '🌍'}
                  </span>
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {selectedRegionData?.name || '未知区域'}
                </span>
                <ChevronDown className={`ml-2 h-3 w-3 text-gray-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-blue-500' : ''
                }`} />
              </button>

              {/* Dropdown menu */}
              <div className={`absolute left-0 mt-1 w-56 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-blue-100 dark:border-blue-800/50 z-50 overflow-hidden transition-all duration-200 origin-top-left ${
                isOpen
                  ? 'opacity-100 scale-100 translate-y-0 visible'
                  : 'opacity-0 scale-95 -translate-y-1 invisible pointer-events-none'
              }`}>
                <div className="p-2 max-h-[320px] overflow-y-auto scrollbar-thin">
                  {REGION_GROUPS.map(group => (
                    <div key={group.name} className="mb-2 last:mb-0">
                      <div className="flex items-center px-2 py-1">
                        <div className="h-px w-2 bg-blue-200 dark:bg-blue-800/70 mr-1.5"></div>
                        <span className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80 uppercase tracking-wider">
                          {group.name}
                        </span>
                        <div className="h-px flex-grow bg-blue-200 dark:bg-blue-800/70 ml-1.5"></div>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {group.regions.map(regionId => {
                          const region = REGIONS.find(r => r.id === regionId)
                          if (!region) return null

                          const isActive = selectedRegion === regionId
                          const regionItems = mediaNewsType === 'upcoming'
                            ? (upcomingItemsByRegion[regionId] || [])
                            : (recentItemsByRegion[regionId] || [])
                          const validItems = regionItems.filter(item =>
                            !existingItems.some(existingItem =>
                              existingItem.tmdbId === item.id.toString() &&
                              existingItem.mediaType === item.mediaType
                            )
                          )

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
                                <span className="ml-2 text-xs font-medium">{region.name}</span>
                                {isActive && (
                                  <Check className="ml-2 h-3 w-3 text-blue-500" />
                                )}
                              </div>
                              {validItems.length > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium min-w-[1.25rem] text-center ${
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
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-8 px-3 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            {refreshText}
          </Button>
        </div>
      </div>
    </div>
  )
}