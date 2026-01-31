"use client"

import React, { useState, useEffect } from "react"
import { TMDBItem } from "@/types/tmdb-item"
import { Task } from "@/types/tasks"
import { LayoutPreferencesManager } from "@/lib/utils/layout-preferences"
import {
  AppHeader,
  SidebarContainer,
  MainContentArea,
  ContentRenderers
} from "./sidebar/components"

export interface SidebarLayoutProps {
  children: React.ReactNode
  // 从原始页面传递的状态和处理函数
  totalItems: number
  runningTasks: Task[]
  onShowAddDialog: () => void
  onShowSettingsDialog: (section?: string) => void
  onShowTasksDialog: () => void
  onShowExecutionLogs: () => void
  onShowImportDialog: () => void
  onShowExportDialog: () => void
  // 词条详情相关
  selectedItem: TMDBItem | null
  onSelectedItemChange: (item: TMDBItem | null) => void
  onUpdateItem: (item: TMDBItem) => void
  onDeleteItem: (id: string) => void
  onOpenScheduledTask?: (item: TMDBItem) => void
  onItemClick?: (item: TMDBItem) => void
  // 影视资讯相关状态和函数
  upcomingItems: TMDBItem[]
  recentItems: TMDBItem[]
  loadingUpcoming: boolean
  loadingRecent: boolean
  upcomingError: string | null
  recentError: string | null
  upcomingLastUpdated: string | null
  recentLastUpdated: string | null
  selectedRegion: string
  mediaNewsType: 'upcoming' | 'recent'
  isMissingApiKey: boolean
  upcomingItemsByRegion: Record<string, TMDBItem[]>
  recentItemsByRegion: Record<string, TMDBItem[]>
  fetchUpcomingItems: (silent?: boolean, retryCount?: number, region?: string) => void
  fetchRecentItems: (silent?: boolean, retryCount?: number, region?: string) => void
  setMediaNewsType: React.Dispatch<React.SetStateAction<'upcoming' | 'recent'>>
  setSelectedRegion: (region: string) => void
  // 词条维护相关状态和函数
  items: TMDBItem[]
  activeTab: string
  selectedDayFilter: "recent" | number
  selectedCategory: string
  categories: string[]
  filteredOngoingItems: TMDBItem[]
  filteredCompletedItems: TMDBItem[]
  getFilteredItems: (items: TMDBItem[]) => TMDBItem[]
  setActiveTab: (tab: string) => void
  setSelectedDayFilter: (filter: "recent" | number) => void
  setSelectedCategory: (category: string) => void
  onItemClick?: (item: TMDBItem) => void
  // 组件引用
  RegionNavigation: React.ComponentType
  ApiKeySetupGuide: React.ComponentType
  VideoThumbnailExtractor: React.ComponentType
  ImageCropper: React.ComponentType
  WeekdayNavigation: React.ComponentType
}

export function SidebarLayout({
  children,
  runningTasks,
  onShowAddDialog,
  onShowSettingsDialog,
  onShowTasksDialog,
  onShowExecutionLogs,
  onShowImportDialog,
  onShowExportDialog,
  // 词条详情相关
  selectedItem,
  onSelectedItemChange,
  onUpdateItem,
  onDeleteItem,
  onOpenScheduledTask,
  onItemClick,
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
  // 组件
  RegionNavigation,
  ApiKeySetupGuide,
  VideoThumbnailExtractor,
  ImageCropper,
  WeekdayNavigation
}: SidebarLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // 从 localStorage 同步读取初始状态，避免闪烁
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tmdb_helper_layout_preferences')
        if (cached) {
          const pref = JSON.parse(cached)
          if (pref?.lastUpdated && pref?.sidebarCollapsed !== undefined) {
            return pref.sidebarCollapsed
          }
        }
      } catch {}
    }
    return false
  })
  const [activeMenu, setActiveMenu] = useState<string>('maintenance')
  const [activeSubmenu, setActiveSubmenu] = useState<string>('all')
  const [contentKey, setContentKey] = useState<string>('maintenance-all')

  // 加载侧边栏折叠状态
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await LayoutPreferencesManager.getPreferences()
        setSidebarCollapsed(preferences.sidebarCollapsed || false)
      } catch (error) {
        setSidebarCollapsed(false) // 使用默认状态
      }
    }
    loadPreferences()
  }, [])

  // 处理侧边栏折叠切换
  const handleSidebarToggle = async () => {
    const newCollapsed = !sidebarCollapsed
    setSidebarCollapsed(newCollapsed)

    try {
      await LayoutPreferencesManager.setSidebarCollapsed(newCollapsed)
    } catch (error) {
      // 如果保存失败，恢复原状态
      setSidebarCollapsed(sidebarCollapsed)
    }
  }

  // 处理菜单选择
  const handleMenuSelect = (menuId: string, submenuId?: string) => {
    if (menuId === 'maintenance') {
      onSelectedItemChange(null)
    }

    setActiveMenu(menuId)
    setActiveSubmenu(submenuId || '')

    const key = submenuId ? `${menuId}-${submenuId}` : menuId
    setContentKey(key)

    if (menuId === 'news' && (submenuId === 'upcoming' || submenuId === 'recent')) {
      setMediaNewsType(submenuId)
    }
  }

  // 处理词条点击，显示详情页面
  const handleItemClick = (item: TMDBItem) => {
    // 调用父组件传递的 onItemClick 回调
    if (onItemClick) {
      onItemClick(item)
    }
    onSelectedItemChange(item)
    // 可以设置一个特殊的内容键来标识这是详情页面
    setContentKey('item-detail')
  }

  // 处理返回列表
  const handleBackToList = () => {
    onSelectedItemChange(null)
    const previousKey = activeSubmenu ? `${activeMenu}-${activeSubmenu}` : activeMenu
    setContentKey(previousKey || 'maintenance-all')
  }

  // 动态控制body的overflow属性，防止缩略图页面出现额外滚动条
  useEffect(() => {
    const isThumbnailPage = ['thumbnails-extract', 'thumbnails-crop', 'item-detail'].includes(contentKey)

    document.body.style.overflow = isThumbnailPage ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [contentKey])

  // 当菜单选择改变时，更新分类
  useEffect(() => {
    if (activeMenu === 'maintenance' && activeSubmenu) {
      setSelectedCategory(activeSubmenu)
    }
  }, [activeMenu, activeSubmenu, setSelectedCategory])

  // 监听从硬字幕提取页面跳转到AI生成页面的事件
  useEffect(() => {
    const handleNavigateToEpisodeGenerator = () => {
      setActiveMenu('content-generation')
      setActiveSubmenu('episode-generator')
      setContentKey('content-generation-episode-generator')
    }

    window.addEventListener('navigate-to-episode-generator', handleNavigateToEpisodeGenerator)

    return () => {
      window.removeEventListener('navigate-to-episode-generator', handleNavigateToEpisodeGenerator)
    }
  }, [])

  // 监听 selectedItem 变化，自动设置 contentKey
  useEffect(() => {
    if (selectedItem) {
      setContentKey('item-detail')
    } else if (contentKey === 'item-detail') {
      const previousKey = activeSubmenu ? `${activeMenu}-${activeSubmenu}` : activeMenu
      setContentKey(previousKey || 'maintenance-all')
    }
  }, [selectedItem, activeMenu, activeSubmenu, contentKey])

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <AppHeader
        sidebarCollapsed={sidebarCollapsed}
        onSidebarToggle={handleSidebarToggle}
        runningTasks={runningTasks}
        onShowExecutionLogs={onShowExecutionLogs}
        onShowTasksDialog={onShowTasksDialog}
        onShowSettingsDialog={onShowSettingsDialog}
        onShowImportDialog={onShowImportDialog}
        onShowExportDialog={onShowExportDialog}
        onShowAddDialog={onShowAddDialog}
      />

      {/* 主体内容 */}
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* 侧边栏 */}
        <SidebarContainer
          collapsed={sidebarCollapsed}
          onMenuSelect={handleMenuSelect}
          activeMenu={activeMenu}
          activeSubmenu={activeSubmenu}
        />

        {/* 主内容区域 */}
        <MainContentArea contentKey={contentKey}>
          <ContentRenderers
            contentKey={contentKey}
            selectedItem={selectedItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onOpenScheduledTask={onOpenScheduledTask}
            onBackToList={handleBackToList}
            onOpenGlobalSettings={onShowSettingsDialog}
            onShowAddDialog={onShowAddDialog}
            children={children}

            // Media news props
            upcomingItems={upcomingItems}
            recentItems={recentItems}
            loadingUpcoming={loadingUpcoming}
            loadingRecent={loadingRecent}
            upcomingError={upcomingError}
            recentError={recentError}
            upcomingLastUpdated={upcomingLastUpdated}
            recentLastUpdated={recentLastUpdated}
            selectedRegion={selectedRegion}
            mediaNewsType={mediaNewsType}
            isMissingApiKey={isMissingApiKey}
            upcomingItemsByRegion={upcomingItemsByRegion}
            recentItemsByRegion={recentItemsByRegion}
            existingItems={items}
            fetchUpcomingItems={fetchUpcomingItems}
            fetchRecentItems={fetchRecentItems}
            setSelectedRegion={setSelectedRegion}

            // Maintenance props
            activeMenu={activeMenu}

            // Components
            RegionNavigation={RegionNavigation}
            ApiKeySetupGuide={ApiKeySetupGuide}
            VideoThumbnailExtractor={VideoThumbnailExtractor}
            ImageCropper={ImageCropper}
          />
        </MainContentArea>
      </div>
    </div>
  )
}
