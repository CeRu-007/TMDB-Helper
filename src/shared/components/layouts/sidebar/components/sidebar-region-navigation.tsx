import React from "react"
import { Button } from "@/shared/components/ui/button"
import { RefreshCw, ChevronDown } from "lucide-react"
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
  return (
    <div className="mb-4 border-b border-blue-100/70 dark:border-blue-900/30 pb-3">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between">
          {/* Current region selector */}
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">区域:</span>
            <div className="relative group">
              <button className="flex items-center bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-md border border-blue-100 dark:border-blue-800/30 shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-all text-sm">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-inner mr-2">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {REGIONS.find(r => r.id === selectedRegion)?.icon || '🌍'}
                  </span>
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {REGIONS.find(r => r.id === selectedRegion)?.name || '未知区域'}
                </span>
                <ChevronDown className="ml-2 h-3 w-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </button>

              {/* Dropdown menu */}
              <div className="absolute left-0 mt-1 w-52 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-lg border border-blue-100/70 dark:border-blue-800/30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 transform group-hover:translate-y-0 translate-y-1 z-50 overflow-hidden">
                <div className="p-2">
                  {REGION_GROUPS.map(group => (
                    <div key={group.name} className="mb-2 last:mb-0">
                      <div className="flex items-center px-2 py-0.5">
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
                              onClick={() => onRegionSelect(regionId)}
                              className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-md transition-all duration-150 ${
                                isActive
                                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 shadow-sm"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <div className="flex items-center">
                                <div className={`w-5 h-5 flex items-center justify-center rounded-full ${
                                  isActive
                                    ? "bg-white dark:bg-gray-800 shadow-inner"
                                    : "bg-gray-100 dark:bg-gray-700/50"
                                }`}>
                                  <span className="text-sm">{region.icon}</span>
                                </div>
                                <span className="ml-2 text-xs">{region.name}</span>
                              </div>
                              {validItems.length > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
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