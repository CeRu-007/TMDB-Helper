"use client"

import React, { useState, useEffect } from "react"
import { SidebarNavigation } from "@/components/sidebar-navigation"
import { LayoutSwitcher } from "@/components/layout-switcher"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Settings,
  Plus,
  Sun,
  Moon,
  Download,
  Upload,
  AlarmClock,
  BarChart2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Calendar,
  PlayCircle,
  Film,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronDown
} from "lucide-react"
import { useTheme } from "next-themes"
import { useMobile } from "@/hooks/use-mobile"
import { LayoutPreferencesManager, type LayoutType } from "@/lib/layout-preferences"
import Image from "next/image"

export interface SidebarLayoutProps {
  children: React.ReactNode
  onLayoutChange: (layoutType: LayoutType) => void
  currentLayout: LayoutType
  // 从原始页面传递的状态和处理函数
  totalItems: number
  runningTasks: any[]
  onShowAddDialog: () => void
  onShowSettingsDialog: () => void
  onShowTasksDialog: () => void
  onShowExecutionLogs: () => void
  onShowImportDialog: () => void
  onShowExportDialog: () => void
  // 影视资讯相关状态和函数
  upcomingItems: any[]
  recentItems: any[]
  loadingUpcoming: boolean
  loadingRecent: boolean
  upcomingError: string | null
  recentError: string | null
  upcomingLastUpdated: string | null
  recentLastUpdated: string | null
  selectedRegion: string
  mediaNewsType: string
  isMissingApiKey: boolean
  upcomingItemsByRegion: Record<string, any[]>
  recentItemsByRegion: Record<string, any[]>
  fetchUpcomingItems: (silent?: boolean, retryCount?: number, region?: string) => void
  fetchRecentItems: (silent?: boolean, retryCount?: number, region?: string) => void
  setMediaNewsType: (type: string) => void
  setSelectedRegion: (region: string) => void
  // 词条维护相关状态和函数
  items: any[]
  activeTab: string
  selectedDayFilter: "recent" | number
  selectedCategory: string
  categories: any[]
  filteredOngoingItems: any[]
  filteredCompletedItems: any[]
  getFilteredItems: (items: any[]) => any[]
  setActiveTab: (tab: string) => void
  setSelectedDayFilter: (filter: "recent" | number) => void
  setSelectedCategory: (category: string) => void
  onItemClick?: (item: any) => void
  // 组件引用
  RegionNavigation: React.ComponentType
  ApiKeySetupGuide: React.ComponentType
  VideoThumbnailExtractor: React.ComponentType
  ImageCropper: React.ComponentType
  WeekdayNavigation: React.ComponentType
}

export function SidebarLayout({
  children,
  onLayoutChange,
  currentLayout,
  totalItems,
  runningTasks,
  onShowAddDialog,
  onShowSettingsDialog,
  onShowTasksDialog,
  onShowExecutionLogs,
  onShowImportDialog,
  onShowExportDialog,
  // 影视资讯相关
  upcomingItems,
  recentItems,
  loadingUpcoming,
  loadingRecent,
  upcomingError,
  recentError,
  upcomingLastUpdated,
  recentLastUpdated,
  selectedRegion,
  mediaNewsType,
  isMissingApiKey,
  upcomingItemsByRegion,
  recentItemsByRegion,
  fetchUpcomingItems,
  fetchRecentItems,
  setMediaNewsType,
  setSelectedRegion,
  // 词条维护相关
  items,
  activeTab,
  selectedDayFilter,
  selectedCategory,
  categories,
  filteredOngoingItems,
  filteredCompletedItems,
  getFilteredItems,
  setActiveTab,
  setSelectedDayFilter,
  setSelectedCategory,
  onItemClick,
  // 组件
  RegionNavigation,
  ApiKeySetupGuide,
  VideoThumbnailExtractor,
  ImageCropper,
  WeekdayNavigation
}: SidebarLayoutProps) {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string>('maintenance')
  const [activeSubmenu, setActiveSubmenu] = useState<string>('all')
  const [contentKey, setContentKey] = useState<string>('maintenance-all')

  // 加载侧边栏折叠状态
  useEffect(() => {
    const preferences = LayoutPreferencesManager.getPreferences()
    setSidebarCollapsed(preferences.sidebarCollapsed || false)
  }, [])

  // 处理侧边栏折叠切换
  const handleSidebarToggle = () => {
    const newCollapsed = !sidebarCollapsed
    setSidebarCollapsed(newCollapsed)
    LayoutPreferencesManager.setSidebarCollapsed(newCollapsed)
  }

  // 定义与原始布局完全一致的区域常量
  const REGIONS = [
    { id: "CN", name: "中国大陆", icon: "🇨🇳" },
    { id: "HK", name: "香港", icon: "🇭🇰" },
    { id: "TW", name: "台湾", icon: "🇹🇼" },
    { id: "JP", name: "日本", icon: "🇯🇵" },
    { id: "KR", name: "韩国", icon: "🇰🇷" },
    { id: "US", name: "美国", icon: "🇺🇸" },
    { id: "GB", name: "英国", icon: "🇬🇧" },
  ]

  // 区域分组
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

  // 侧边栏专用的区域导航组件（与原始布局完全一致，添加刷新按钮）
  const SidebarRegionNavigation = ({
    onRefresh,
    isLoading,
    refreshText = "刷新"
  }: {
    onRefresh: () => void;
    isLoading: boolean;
    refreshText?: string;
  }) => (
    <div className="mb-4 border-b border-blue-100/70 dark:border-blue-900/30 pb-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* 当前选中区域显示和切换按钮集成 - 与原始布局完全一致 */}
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

              {/* 下拉菜单 - 与原始布局完全一致 */}
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
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  isActive
                                    ? "bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-300"
                                    : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
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

          {/* 刷新按钮 - 移动到区域导航右侧 */}
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

  // 处理菜单选择
  const handleMenuSelect = (menuId: string, submenuId?: string) => {
    setActiveMenu(menuId)
    setActiveSubmenu(submenuId || '')

    // 生成内容键用于区分不同的内容区域
    const key = submenuId ? `${menuId}-${submenuId}` : menuId
    setContentKey(key)

    // 处理影视资讯菜单的切换
    if (menuId === 'news' && submenuId) {
      setMediaNewsType(submenuId)
    }
  }

  // 当菜单选择改变时，更新分类
  useEffect(() => {
    if (activeMenu === 'maintenance' && activeSubmenu) {
      setSelectedCategory(activeSubmenu)
    }
  }, [activeMenu, activeSubmenu, setSelectedCategory])

  // 渲染词条维护内容
  const renderMaintenanceContent = (categoryId: string) => {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* 内容展示区域 - 保持与原始布局一致的容器样式 */}
        <div>
          {/* 这里直接渲染原始的children内容，保持完整的功能 */}
          {/* children中已经包含了完整的空状态处理逻辑，无需重复渲染 */}
          {children}
        </div>
      </div>
    )
  }

  // 渲染内容区域
  const renderContent = () => {
    // 根据选中的菜单项显示不同内容
    switch (contentKey) {
      case 'maintenance-all':
        return renderMaintenanceContent('all')
      case 'maintenance-anime':
        return renderMaintenanceContent('anime')
      case 'maintenance-tv':
        return renderMaintenanceContent('tv')
      case 'maintenance-kids':
        return renderMaintenanceContent('kids')
      case 'maintenance-variety':
        return renderMaintenanceContent('variety')
      case 'maintenance-short':
        return renderMaintenanceContent('short')
      case 'maintenance-movie':
        return renderMaintenanceContent('movie')

      case 'news-upcoming':
        // 显示即将上线内容
        return (
          <div className="container mx-auto p-4 max-w-7xl">
            {/* 简化的内容头部 - 移除刷新按钮 */}
            <div className="flex items-center mb-6">
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 rounded-full"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full text-white">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <div>
                <div className="flex items-center">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    即将上线
                  </h2>
                  {upcomingItems.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                      {upcomingItems.filter(upcomingItem =>
                        !items.some(item =>
                          item.tmdbId === upcomingItem.id.toString() &&
                          item.mediaType === upcomingItem.mediaType
                        )
                      ).length}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {upcomingLastUpdated ? `最后更新: ${upcomingLastUpdated}` : '未来30天将要上线的内容'}
                </p>
              </div>
            </div>

            {/* 区域导航 - 包含刷新按钮 */}
            <SidebarRegionNavigation
              onRefresh={() => fetchUpcomingItems(false, 0, selectedRegion)}
              isLoading={loadingUpcoming}
              refreshText="刷新"
            />

            {/* 影视资讯内容主体 */}
            <div>
              {/* 显示API密钥配置指南 */}
              {isMissingApiKey && <ApiKeySetupGuide />}

              {loadingUpcoming ? (
                <div className="flex justify-center items-center h-48">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">加载中，请稍候...</p>
                  </div>
                </div>
              ) : upcomingError ? (
                <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex flex-col items-center text-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                    <p className="text-red-600 dark:text-red-300 font-medium mb-1">
                      {upcomingError}
                    </p>
                    <p className="text-red-500 dark:text-red-400 text-sm mb-4">
                      {isMissingApiKey
                        ? '请按照上方指南配置TMDB API密钥'
                        : '请检查网络连接或稍后重试'}
                    </p>
                    <Button
                      onClick={() => fetchUpcomingItems(false, 0, selectedRegion)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重试
                    </Button>
                  </div>
                </div>
              ) : upcomingItems.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400 mb-1">
                    暂无即将上线的内容
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    未找到未来30天内上线的影视动态
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                  {upcomingItems
                    .filter(upcomingItem =>
                      !items.some(item =>
                        item.tmdbId === upcomingItem.id.toString() &&
                        item.mediaType === upcomingItem.mediaType
                      )
                    )
                    .map((item) => (
                      <div
                        key={`${item.mediaType}-${item.id}`}
                        className="group"
                      >
                        {/* 显示上映日期标签 */}
                        <div className="mb-2">
                          <Badge
                            className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full"
                          >
                            {new Date(item.releaseDate).toLocaleDateString('zh-CN')}
                          </Badge>
                        </div>

                        {/* 海报容器 */}
                        <div
                          className="block cursor-pointer"
                          title={item.title}
                        >
                          <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-md transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-xl dark:group-hover:shadow-blue-900/40">
                            <img
                              src={item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : "/placeholder.svg"}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                              {/* 悬停时显示两个按钮 */}
                              <div className="flex items-center gap-3 transform transition-transform duration-300 group-hover:scale-105">
                                {/* 添加按钮 */}
                                <button
                                  className="flex items-center justify-center h-11 w-11 rounded-full bg-blue-500/90 hover:bg-blue-600 text-white transition-all shadow-lg hover:shadow-blue-500/50 group-hover:rotate-3"
                                  title="添加到我的列表"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    // 预填充更多详细信息到localStorage
                                    const detailData = {
                                      id: item.id,
                                      title: item.title,
                                      media_type: item.mediaType,
                                      poster_path: item.posterPath,
                                      release_date: item.releaseDate,
                                      overview: item.overview || "",
                                      vote_average: item.voteAverage || 0
                                    };

                                    // 保存到localStorage
                                    localStorage.setItem('tmdb_prefilled_data', JSON.stringify(detailData));

                                    // 打开对话框
                                    onShowAddDialog();
                                  }}
                                >
                                  <Plus className="h-5 w-5" />
                                </button>

                                {/* 链接到TMDB */}
                                <a
                                  href={`https://www.themoviedb.org/${item.mediaType}/${item.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center h-11 w-11 rounded-full bg-gray-800/80 hover:bg-gray-900 text-white transition-all shadow-lg hover:shadow-gray-800/50 group-hover:-rotate-3"
                                  title="在TMDB查看详情"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-5 w-5" />
                                </a>
                              </div>

                              {/* 提示文字 */}
                              <div className="absolute bottom-4 left-0 right-0 text-center">
                                <span className="text-xs font-medium text-white/95 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                                  {item.mediaType === "movie" ? "电影" : "剧集"}
                                  <span className="mx-1">·</span>
                                  {(() => {
                                    const daysUntilRelease = Math.ceil((new Date(item.releaseDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                    if (daysUntilRelease <= 0) {
                                      return "今天上线";
                                    } else if (daysUntilRelease === 1) {
                                      return "明天上线";
                                    } else {
                                      return `${daysUntilRelease}天后`;
                                    }
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 space-y-1 relative z-0">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h3>
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center">
                                {item.mediaType === "movie" ? "电影" : "剧集"}
                              </span>
                              <span className="mx-1">·</span>
                              <span className="flex items-center">
                                {(() => {
                                  const daysUntilRelease = Math.ceil((new Date(item.releaseDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                  if (daysUntilRelease <= 0) {
                                    return "今天上线";
                                  } else if (daysUntilRelease === 1) {
                                    return "明天上线";
                                  } else {
                                    return `${daysUntilRelease} 天后上线`;
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      case 'news-recent':
        // 显示近期开播内容
        return (
          <div className="container mx-auto p-4 max-w-7xl">
            {/* 简化的内容头部 - 移除刷新按钮 */}
            <div className="flex items-center mb-6">
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 rounded-full"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full text-white">
                  <PlayCircle className="h-5 w-5" />
                </div>
              </div>
              <div>
                <div className="flex items-center">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    近期开播
                  </h2>
                  {recentItems.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                      {recentItems.filter(recentItem =>
                        !items.some(item =>
                          item.tmdbId === recentItem.id.toString() &&
                          item.mediaType === recentItem.mediaType
                        )
                      ).length}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {recentLastUpdated ? `最后更新: ${recentLastUpdated}` : '过去30天刚刚开播的内容'}
                </p>
              </div>
            </div>

            {/* 区域导航 - 包含刷新按钮 */}
            <SidebarRegionNavigation
              onRefresh={() => fetchRecentItems(false, 0, selectedRegion)}
              isLoading={loadingRecent}
              refreshText="刷新"
            />

            {/* 影视资讯内容主体 */}
            <div>
              {/* 显示API密钥配置指南 */}
              {isMissingApiKey && <ApiKeySetupGuide />}

              {loadingRecent ? (
                <div className="flex justify-center items-center h-48">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">加载中，请稍候...</p>
                  </div>
                </div>
              ) : recentError ? (
                <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex flex-col items-center text-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                    <p className="text-red-600 dark:text-red-300 font-medium mb-1">
                      {recentError}
                    </p>
                    <p className="text-red-500 dark:text-red-400 text-sm mb-4">
                      {isMissingApiKey
                        ? '请按照上方指南配置TMDB API密钥'
                        : '无法连接到TMDB服务，请检查网络连接或稍后重试'}
                    </p>
                    <Button
                      onClick={() => fetchRecentItems(false, 0, selectedRegion)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重试
                    </Button>
                  </div>
                </div>
              ) : recentItems.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400 mb-1">
                    暂无近期开播的内容
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    未找到过去30天内开播的影视动态
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                  {recentItems
                    .filter(recentItem =>
                      !items.some(item =>
                        item.tmdbId === recentItem.id.toString() &&
                        item.mediaType === recentItem.mediaType
                      )
                    )
                    .map((item) => (
                      <div
                        key={`${item.mediaType}-${item.id}`}
                        className="group"
                      >
                        {/* 显示上映日期标签 */}
                        <div className="mb-2">
                          <Badge
                            className="bg-green-500 text-white text-xs px-2 py-1 rounded-full"
                          >
                            {new Date(item.releaseDate).toLocaleDateString('zh-CN')}
                          </Badge>
                        </div>

                        {/* 海报容器 */}
                        <div
                          className="block cursor-pointer"
                          title={item.title}
                        >
                          <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-md transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-xl dark:group-hover:shadow-blue-900/40">
                            <img
                              src={item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : "/placeholder.svg"}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                              {/* 悬停时显示两个按钮 */}
                              <div className="flex items-center gap-3 transform transition-transform duration-300 group-hover:scale-105">
                                {/* 添加按钮 */}
                                <button
                                  className="flex items-center justify-center h-11 w-11 rounded-full bg-blue-500/90 hover:bg-blue-600 text-white transition-all shadow-lg hover:shadow-blue-500/50 group-hover:rotate-3"
                                  title="添加到我的列表"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    // 预填充更多详细信息到localStorage
                                    const detailData = {
                                      id: item.id,
                                      title: item.title,
                                      media_type: item.mediaType,
                                      poster_path: item.posterPath,
                                      release_date: item.releaseDate,
                                      overview: item.overview || "",
                                      vote_average: item.voteAverage || 0
                                    };

                                    // 保存到localStorage
                                    localStorage.setItem('tmdb_prefilled_data', JSON.stringify(detailData));

                                    // 打开对话框
                                    onShowAddDialog();
                                  }}
                                >
                                  <Plus className="h-5 w-5" />
                                </button>

                                {/* 链接到TMDB */}
                                <a
                                  href={`https://www.themoviedb.org/${item.mediaType}/${item.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center h-11 w-11 rounded-full bg-gray-800/80 hover:bg-gray-900 text-white transition-all shadow-lg hover:shadow-gray-800/50 group-hover:-rotate-3"
                                  title="在TMDB查看详情"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-5 w-5" />
                                </a>
                              </div>

                              {/* 提示文字 */}
                              <div className="absolute bottom-4 left-0 right-0 text-center">
                                <span className="text-xs font-medium text-white/95 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                                  {item.mediaType === "movie" ? "电影" : "剧集"}
                                  <span className="mx-1">·</span>
                                  {(() => {
                                    const daysSinceRelease = Math.ceil((new Date().getTime() - new Date(item.releaseDate).getTime()) / (1000 * 60 * 60 * 24));
                                    if (daysSinceRelease <= 0) {
                                      return "今天开播";
                                    } else if (daysSinceRelease === 1) {
                                      return "昨天开播";
                                    } else {
                                      return `${daysSinceRelease}天前`;
                                    }
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 space-y-1 relative z-0">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h3>
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center">
                                {item.mediaType === "movie" ? "电影" : "剧集"}
                              </span>
                              <span className="mx-1">·</span>
                              <span className="flex items-center">
                                {(() => {
                                  const daysSinceRelease = Math.ceil((new Date().getTime() - new Date(item.releaseDate).getTime()) / (1000 * 60 * 60 * 24));
                                  if (daysSinceRelease <= 0) {
                                    return "今天开播";
                                  } else if (daysSinceRelease === 1) {
                                    return "昨天开播";
                                  } else {
                                    return `${daysSinceRelease} 天前开播`;
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      case 'thumbnails-extract':
        // 显示缩略图提取内容
        return (
          <div className="container mx-auto p-4 max-w-7xl">
            <VideoThumbnailExtractor />
          </div>
        )

      case 'thumbnails-crop':
        // 显示图片裁切内容
        return (
          <div className="container mx-auto p-4 max-w-7xl">
            <ImageCropper />
          </div>
        )

      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
            <div className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-lg border border-gray-200 dark:border-gray-700 max-w-md text-center">
              <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                请选择左侧菜单
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                选择左侧导航菜单中的选项来查看相应内容
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm border-b dark:border-gray-700 sticky top-0 z-40">
        <div className="flex items-center h-16">
          {/* 左侧：侧边栏切换按钮和Logo */}
          <div className="flex items-center pl-4">
            {/* 侧边栏切换按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSidebarToggle}
              className="mr-3"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>

            {/* Logo */}
            <div className="group">
              <Image
                src="/tmdb-helper-logo.png"
                alt="TMDB维护助手"
                width={160}
                height={60}
                className="h-14 w-auto object-contain transform group-hover:scale-105 transition duration-300"
                priority
              />
            </div>
          </div>

          {/* 右侧操作按钮 - 与主内容区域对齐 */}
          <div className="flex-1 flex justify-end">
            <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-end space-x-2">
            {/* 布局切换器 */}
            <LayoutSwitcher 
              onLayoutChange={onLayoutChange}
              currentLayout={currentLayout}
            />
            
            {/* 桌面版操作按钮 */}
            <div className="hidden md:flex md:items-center md:space-x-2">
              <Button variant="outline" size="sm" onClick={onShowTasksDialog}>
                <AlarmClock className="h-4 w-4 mr-2" />
                定时任务
              </Button>
              {runningTasks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowExecutionLogs}
                  className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                >
                  <BarChart2 className="h-4 w-4 mr-2" />
                  执行日志 ({runningTasks.length})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onShowImportDialog}>
                <Upload className="h-4 w-4 mr-2" />
                导入
              </Button>
              <Button variant="outline" size="sm" onClick={onShowExportDialog}>
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
              <Button variant="outline" size="sm" onClick={onShowSettingsDialog}>
                <Settings className="h-4 w-4 mr-2" />
                设置
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
            
                <Button
                  onClick={onShowAddDialog}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size={isMobile ? "sm" : "default"}
                >
                  <Plus className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">添加词条</span>
                  <span className="sm:hidden">添加</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* 侧边栏 */}
        <SidebarNavigation
          onMenuSelect={handleMenuSelect}
          activeMenu={activeMenu}
          activeSubmenu={activeSubmenu}
          collapsed={sidebarCollapsed}
        />

        {/* 主内容区域 */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}
