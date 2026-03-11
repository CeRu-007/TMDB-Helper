"use client"

import React, { useState, useEffect, useCallback } from "react"
import { LayoutPreferencesManager } from "@/lib/utils/layout-preferences"
import {
  AppHeader,
  SidebarContainer,
  MainContentArea,
  ContentRenderers
} from "./sidebar/components"

// 从 stores 获取状态
import {
  useUIStore,
  useMediaStore,
  useTaskStore,
  useMediaNewsStore,
} from "@/stores"

// 类型导入
import type { TMDBItem } from "@/types/tmdb-item"
import type { Task } from "@/types/tasks"

/**
 * SidebarLayout - 简化版
 * 
 * 使用 Zustand stores 管理状态，不再需要大量 props
 * 
 * 主要变化：
 * 1. 移除对话框相关的 props → 使用 UI Store
 * 2. 移除选中项相关的 props → 使用 UI Store
 * 3. 移除过滤状态相关的 props → 使用 UI Store
 * 4. 移除影视资讯相关的 props → 使用 MediaNews Store
 * 5. 移除组件引用 → 内部导入
 */
export interface SidebarLayoutProps {
  children: React.ReactNode
  // 保留必要的回调函数（操作类）
  onUpdateItem: (item: TMDBItem) => void
  onDeleteItem: (id: string) => void
  onOpenScheduledTask?: (item: TMDBItem) => void
  // 影视资讯获取函数（需要 API 调用）
  fetchUpcomingItems: (silent?: boolean, retryCount?: number, region?: string) => void
  fetchRecentItems: (silent?: boolean, retryCount?: number, region?: string) => void
}

export function SidebarLayout({
  children,
  onUpdateItem,
  onDeleteItem,
  onOpenScheduledTask,
  fetchUpcomingItems,
  fetchRecentItems,
}: SidebarLayoutProps) {
  // 从 UI Store 获取状态
  const selectedItem = useUIStore((s) => s.selectedItem)
  const setSelectedItem = useUIStore((s) => s.setSelectedItem)
  const setSelectedCategory = useUIStore((s) => s.setSelectedCategory)
  const openAddDialog = useUIStore((s) => s.openAddDialog)
  const openSettingsDialog = useUIStore((s) => s.openSettingsDialog)
  const openTasksDialog = useUIStore((s) => s.openTasksDialog)
  const openExecutionLogs = useUIStore((s) => s.openExecutionLogs)
  const openImportDialog = useUIStore((s) => s.openImportDialog)
  const openExportDialog = useUIStore((s) => s.openExportDialog)

  // 从 Media Store 获取状态
  const items = useMediaStore((s) => s.items)

  // 从 Task Store 获取状态
  // 注意：这里需要类型转换，因为 ScheduledTask 和 Task 类型不完全匹配
  const runningTasks = useTaskStore((s) => s.runningTasks) as unknown as Task[]

  // 从 MediaNews Store 获取状态
  // 注意：这里需要类型转换，因为 MediaItem 和 TMDBItem 类型不完全匹配
  const upcomingItems = useMediaNewsStore((s) => s.upcomingItems) as unknown as TMDBItem[]
  const recentItems = useMediaNewsStore((s) => s.recentItems) as unknown as TMDBItem[]
  const loadingUpcoming = useMediaNewsStore((s) => s.loadingUpcoming)
  const loadingRecent = useMediaNewsStore((s) => s.loadingRecent)
  const upcomingError = useMediaNewsStore((s) => s.upcomingError)
  const recentError = useMediaNewsStore((s) => s.recentError)
  const upcomingLastUpdated = useMediaNewsStore((s) => s.upcomingLastUpdated)
  const recentLastUpdated = useMediaNewsStore((s) => s.recentLastUpdated)
  const selectedRegion = useMediaNewsStore((s) => s.selectedRegion)
  const mediaNewsType = useMediaNewsStore((s) => s.mediaNewsType)
  const isMissingApiKey = useMediaNewsStore((s) => s.isMissingApiKey)
  const upcomingItemsByRegion = useMediaNewsStore((s) => s.upcomingItemsByRegion) as unknown as Record<string, TMDBItem[]>
  const recentItemsByRegion = useMediaNewsStore((s) => s.recentItemsByRegion) as unknown as Record<string, TMDBItem[]>
  const setSelectedRegion = useMediaNewsStore((s) => s.setSelectedRegion)
  const setMediaNewsType = useMediaNewsStore((s) => s.setMediaNewsType)

  // 处理区域选择 - 设置区域并加载数据
  const handleRegionSelect = useCallback((region: string) => {
    setSelectedRegion(region)
    // 根据当前媒体类型加载对应数据
    if (mediaNewsType === 'upcoming') {
      fetchUpcomingItems(false, 0, region)
    } else {
      fetchRecentItems(false, 0, region)
    }
  }, [setSelectedRegion, mediaNewsType, fetchUpcomingItems, fetchRecentItems])

  // 本地 UI 状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
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
  const [activeSubmenu, setActiveSubmenu] = useState<string>('list')
  const [contentKey, setContentKey] = useState<string>('maintenance-list')

  // 加载侧边栏折叠状态
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await LayoutPreferencesManager.getPreferences()
        setSidebarCollapsed(preferences.sidebarCollapsed || false)
      } catch (error) {
        setSidebarCollapsed(false)
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
      setSidebarCollapsed(sidebarCollapsed)
    }
  }

  // 处理菜单选择
  const handleMenuSelect = useCallback((menuId: string, submenuId?: string) => {
    if (menuId === 'maintenance') {
      setSelectedItem(null)
    }

    setActiveMenu(menuId)
    setActiveSubmenu(submenuId || '')

    const key = submenuId ? `${menuId}-${submenuId}` : menuId
    setContentKey(key)

    if (menuId === 'news' && (submenuId === 'upcoming' || submenuId === 'recent')) {
      setMediaNewsType(submenuId)
    }
  }, [setSelectedItem, setMediaNewsType])

  // 处理返回列表
  const handleBackToList = useCallback(() => {
    setSelectedItem(null)
    const previousKey = activeSubmenu ? `${activeMenu}-${activeSubmenu}` : activeMenu
    setContentKey(previousKey || 'maintenance-list')
  }, [setSelectedItem, activeMenu, activeSubmenu])

  // 动态控制 body 的 overflow 属性
  useEffect(() => {
    const isThumbnailPage = ['image-extract', 'image-crop', 'item-detail'].includes(contentKey)
    document.body.style.overflow = isThumbnailPage ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [contentKey])

  // 分类筛选现在由页面内的下拉菜单独立控制，不再与侧边栏子菜单同步

  // 监听从硬字幕提取页面跳转到 AI 生成页面的事件
  useEffect(() => {
    const handleNavigateToEpisodeGenerator = () => {
      setActiveMenu('content')
      setActiveSubmenu('episode-generator')
      setContentKey('content-episode-generator')
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
      setContentKey(previousKey || 'maintenance-list')
    }
  }, [selectedItem, activeMenu, activeSubmenu, contentKey])

  // 向后兼容的回调包装
  const handleShowAddDialog = useCallback(() => openAddDialog(), [openAddDialog])
  const handleShowSettingsDialog = useCallback((section?: string) => openSettingsDialog(section), [openSettingsDialog])
  const handleShowTasksDialog = useCallback(() => openTasksDialog(), [openTasksDialog])
  const handleShowExecutionLogs = useCallback(() => openExecutionLogs(), [openExecutionLogs])
  const handleShowImportDialog = useCallback(() => openImportDialog(), [openImportDialog])
  const handleShowExportDialog = useCallback(() => openExportDialog(), [openExportDialog])

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <AppHeader
        sidebarCollapsed={sidebarCollapsed}
        onSidebarToggle={handleSidebarToggle}
        runningTasks={runningTasks}
        onShowExecutionLogs={handleShowExecutionLogs}
        onShowTasksDialog={handleShowTasksDialog}
        onShowSettingsDialog={handleShowSettingsDialog}
        onShowImportDialog={handleShowImportDialog}
        onShowExportDialog={handleShowExportDialog}
        onShowAddDialog={handleShowAddDialog}
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
            onOpenGlobalSettings={handleShowSettingsDialog}
            onShowAddDialog={handleShowAddDialog}
            children={children}

            // Media news props（从 store 获取）
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
            setSelectedRegion={handleRegionSelect}

            // Maintenance props
            activeMenu={activeMenu}

            // Components - 内部导入
            // 注意：ContentRenderers 内部直接使用了 SidebarRegionNavigation，这里传入的是备用方案
            RegionNavigation={SidebarRegionNavigation as React.ComponentType}
            ApiKeySetupGuide={TMDBGuide as React.ComponentType}
            VideoThumbnailExtractor={HardSubtitleExtractor as React.ComponentType}
            ImageCropper={ImageCropper as React.ComponentType}
          />
        </MainContentArea>
      </div>
    </div>
  )
}

// 内部导入组件
import { SidebarRegionNavigation } from "./sidebar/components/sidebar-region-navigation"
import { TMDBGuide } from "@/features/tmdb-import/components/tmdb-guide"
import { HardSubtitleExtractor } from "@/features/image-processing/components/hard-subtitle-extractor"
import { ImageCropper } from "@/features/image-processing/components/image-cropper"
