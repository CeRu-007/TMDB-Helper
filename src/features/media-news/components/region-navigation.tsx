"use client"

import { Calendar, PlayCircle } from "lucide-react"
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
  return (
    <div className="mb-4 border-b border-blue-100/70 dark:border-blue-900/30 pb-3">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          {/* 当前选中区域显示和切换按钮集成 */}
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">区域:</span>
            <div className="relative group">
              <button className="flex items-center bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-md border border-blue-100 dark:border-blue-800/30 shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-all text-sm">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-inner mr-2">
                  <span className="text-base">{REGIONS.find(r => r.id === selectedRegion)?.icon}</span>
                </div>
                <span className="font-medium text-sm text-blue-700 dark:text-blue-300 mr-1.5">
                  {REGIONS.find(r => r.id === selectedRegion)?.name}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 下拉菜单 */}
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
                          const region = REGIONS.find(r => r.id === regionId);
                          if (!region) return null;

                          const isActive = selectedRegion === regionId;
                          const regionItems = mediaNewsType === 'upcoming'
                            ? (upcomingItemsByRegion[regionId] || [])
                            : (recentItemsByRegion[regionId] || []);
                          const validItems = regionItems.filter(item =>
                            !items.some(existingItem =>
                              existingItem.tmdbId === item.id.toString() &&
                              existingItem.mediaType === item.mediaType
                            )
                          );

                          return (
                            <button
                              key={regionId}
                              onClick={() => setSelectedRegion(regionId)}
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
                                <span className={`px-1.5 py-0.5 text-xs rounded-full flex items-center justify-center min-w-[1.25rem] ${
                                  isActive
                                    ? "bg-blue-200/80 dark:bg-blue-700/50 text-blue-800 dark:text-blue-200"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                                }`}>
                                  {validItems.length}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 媒体资讯类型切换按钮 */}
          <div className="inline-flex p-0.5 rounded-md shadow-sm border border-blue-100 dark:border-blue-900/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <button
              onClick={() => setMediaNewsType('upcoming')}
              className={`px-2.5 py-1 rounded-sm text-sm font-medium transition-all duration-200 ${
                mediaNewsType === 'upcoming'
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>即将上线</span>
              </div>
            </button>
            <button
              onClick={() => setMediaNewsType('recent')}
              className={`px-2.5 py-1 rounded-sm text-sm font-medium transition-all duration-200 ${
                mediaNewsType === 'recent'
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <PlayCircle className="h-3.5 w-3.5" />
                <span>近期开播</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}