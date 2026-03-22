"use client"

import React, { useState, useEffect } from "react"
import { TMDBItem } from "@/types/tmdb-item"
import { LayoutPreferencesManager } from "@/lib/utils/layout-preferences"
import {
  AppHeader,
  SidebarContainer,
  MainContentArea,
  ContentRenderers
} from "./sidebar/components"

export interface SidebarLayoutProps {
  children: React.ReactNode
  totalItems: number
  onShowAddDialog: () => void
  onShowSettingsDialog: (section?: string) => void
  onShowImportDialog: () => void
  onShowExportDialog: () => void
  selectedItem: TMDBItem | null
  onSelectedItemChange: (item: TMDBItem | null) => void
  onUpdateItem: (item: TMDBItem) => void
  onDeleteItem: (id: string) => void
  onItemClick?: (item: TMDBItem) => void
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
  RegionNavigation: React.ComponentType
  ApiKeySetupGuide: React.ComponentType
  VideoThumbnailExtractor: React.ComponentType
  ImageCropper: React.ComponentType
  WeekdayNavigation: React.ComponentType
}

export function SidebarLayout({
  children,
  onShowAddDialog,
  onShowSettingsDialog,
  onShowImportDialog,
  onShowExportDialog,
  selectedItem,
  onSelectedItemChange,
  onUpdateItem,
  onDeleteItem,
  onItemClick,
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
  RegionNavigation,
  ApiKeySetupGuide,
  VideoThumbnailExtractor,
  ImageCropper,
  WeekdayNavigation
}: SidebarLayoutProps) {
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

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await LayoutPreferencesManager.getPreferences()
        setSidebarCollapsed(preferences.sidebarCollapsed || false)
      } catch {
        setSidebarCollapsed(false)
      }
    }
    loadPreferences()
  }, [])

  const handleSidebarToggle = async () => {
    const newCollapsed = !sidebarCollapsed
    setSidebarCollapsed(newCollapsed)

    try {
      await LayoutPreferencesManager.setSidebarCollapsed(newCollapsed)
    } catch {
      setSidebarCollapsed(sidebarCollapsed)
    }
  }

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

  const handleItemClick = (item: TMDBItem) => {
    if (onItemClick) {
      onItemClick(item)
    }
    onSelectedItemChange(item)
    setContentKey('item-detail')
  }

  const handleBackToList = () => {
    onSelectedItemChange(null)
    const previousKey = activeSubmenu ? `${activeMenu}-${activeSubmenu}` : activeMenu
    setContentKey(previousKey || 'maintenance-list')
  }

  useEffect(() => {
    const isThumbnailPage = ['image-extract', 'image-crop', 'item-detail'].includes(contentKey)

    document.body.style.overflow = isThumbnailPage ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [contentKey])

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

  useEffect(() => {
    if (selectedItem) {
      setContentKey('item-detail')
    } else if (contentKey === 'item-detail') {
      const previousKey = activeSubmenu ? `${activeMenu}-${activeSubmenu}` : activeMenu
      setContentKey(previousKey || 'maintenance-list')
    }
  }, [selectedItem, activeMenu, activeSubmenu, contentKey])

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <AppHeader
        sidebarCollapsed={sidebarCollapsed}
        onSidebarToggle={handleSidebarToggle}
        onShowSettingsDialog={onShowSettingsDialog}
        onShowImportDialog={onShowImportDialog}
        onShowExportDialog={onShowExportDialog}
        onShowAddDialog={onShowAddDialog}
      />

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <SidebarContainer
          collapsed={sidebarCollapsed}
          onMenuSelect={handleMenuSelect}
          activeMenu={activeMenu}
          activeSubmenu={activeSubmenu}
        />

        <MainContentArea contentKey={contentKey}>
          <ContentRenderers
            contentKey={contentKey}
            selectedItem={selectedItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onBackToList={handleBackToList}
            onOpenGlobalSettings={onShowSettingsDialog}
            onShowAddDialog={onShowAddDialog}
            children={children}
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
            activeMenu={activeMenu}
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
