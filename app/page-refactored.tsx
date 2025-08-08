"use client"

import React, { useState, useEffect } from "react"
import { ErrorBoundary } from '@/components/error-boundary'
import { log } from '@/lib/logger'
import { perf } from '@/lib/performance-manager'
import { useMediaNews } from '@/hooks/use-media-news'
import { useScheduledTasks } from '@/hooks/use-scheduled-tasks'
import { WeekdayNavigation } from '@/components/home/weekday-navigation'
import { MediaNewsSection } from '@/components/home/media-news-section'
import { HomeHeader } from '@/components/home/home-header'
import { HomeContent } from '@/components/home/home-content'
import { HomeMobileMenu } from '@/components/home/home-mobile-menu'
import { HomeDialogs } from '@/components/home/home-dialogs'
import { useHomeState } from '@/hooks/use-home-state'
import { SidebarLayout } from "@/components/sidebar-layout"
import { LayoutPreferencesManager, type LayoutType } from "@/lib/layout-preferences"
import { useIsClient } from "@/hooks/use-is-client"

export default function HomePage() {
  const isClient = useIsClient()
  const [currentLayout, setCurrentLayout] = useState<LayoutType>(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('tmdb_helper_layout_preferences')
        if (cached) {
          const pref = JSON.parse(cached)
          if (pref?.layoutType === 'sidebar' || pref?.layoutType === 'original') {
            return pref.layoutType as LayoutType
          }
        }
      }
    } catch {}
    return 'original'
  })
  
  // 使用自定义Hook管理主页状态
  const homeState = useHomeState()
  
  // 使用媒体资讯Hook
  const mediaNews = useMediaNews(homeState.selectedRegion)
  
  // 使用定时任务Hook
  const scheduledTasks = useScheduledTasks()

  // 初始化布局偏好
  useEffect(() => {
    if (isClient) {
      const loadPreferences = async () => {
        try {
          const preferences = await LayoutPreferencesManager.getPreferences()
          setCurrentLayout(preferences.layoutType)
          log.info('HomePage', '布局偏好已加载', { layout: preferences.layoutType })
          try {
            localStorage.setItem('tmdb_helper_layout_preferences', JSON.stringify(preferences))
          } catch {}
        } catch (error) {
          console.error('Failed to load layout preferences:', error)
          // 失败时保持当前状态，避免闪烁
        }
      }
      loadPreferences()
    }
  }, [isClient])

  // 处理布局切换
  const handleLayoutChange = (newLayout: LayoutType) => {
    setCurrentLayout(newLayout)
    log.info('HomePage', '布局已切换', { from: currentLayout, to: newLayout })
  }

  // 性能监控
  useEffect(() => {
    perf.startTiming('HomePage_Mount')
    
    return () => {
      perf.endTiming('HomePage_Mount')
      perf.checkMemory()
    }
  }, [])

  // 记录组件渲染性能
  useEffect(() => {
    perf.recordMetrics({
      componentMountTime: performance.now(),
      renderTime: performance.now()
    })
  })

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const content = (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* 头部 */}
        <HomeHeader
          currentLayout={currentLayout}
          onLayoutChange={handleLayoutChange}
          runningTasksCount={scheduledTasks.getRunningTasksCount()}
          onShowSettings={() => homeState.setShowSettingsDialog(true)}
          onShowTasks={() => homeState.setShowTasksDialog(true)}
          onShowExecutionLogs={() => homeState.setShowExecutionLogs(true)}
          onShowImport={() => homeState.setShowImportDialog(true)}
          onShowExport={() => homeState.setShowExportDialog(true)}
        />

        {/* 主要内容 */}
        <HomeContent
          homeState={homeState}
          mediaNews={mediaNews}
          currentLayout={currentLayout}
        />

        {/* 移动端菜单 */}
        <HomeMobileMenu
          homeState={homeState}
          runningTasksCount={scheduledTasks.getRunningTasksCount()}
        />

        {/* 对话框 */}
        <HomeDialogs homeState={homeState} />
      </div>
    </ErrorBoundary>
  )

  // 根据布局类型渲染
  if (currentLayout === 'sidebar') {
    return <SidebarLayout>{content}</SidebarLayout>
  }

  return content
}