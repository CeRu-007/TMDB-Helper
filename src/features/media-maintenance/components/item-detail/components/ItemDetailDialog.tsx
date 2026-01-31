"use client"

import React, { useState, useEffect, useRef, memo } from "react"
import { logger } from '@/lib/utils/logger'
import { DELAY_1S, DELAY_2S } from "@/lib/constants/constants"
import {
  Sparkles,
  Tv,
  Baby,
  Popcorn,
  Ticket,
  Film,
  ExternalLink,
  Edit,
  Save,
  X,
  Trash2,
  Loader2,
  AlarmClock,
  Zap,
  Info,
  Terminal,
  ArrowRightCircle,
  RefreshCw,
} from "lucide-react"
import type { TMDBItem, Episode, Season } from "@/types/tmdb-item"
import { cn } from "@/lib/utils"
import { ClientConfigManager } from "@/lib/utils/client-config-manager"

// UI 组件
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Badge } from "@/shared/components/ui/badge"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Button } from "@/shared/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { BackgroundImage } from "@/shared/components/ui/background-image"
import { CachedImage } from "@/shared/components/ui/cached-image"

// 导入重构后的组件
import {
  MediaInfoCard,
  DetailsTab,
  TMDBIntegrationTab,
  EpisodeChangeDialog,
  DeleteSeasonDialog,
  DeleteItemDialog
} from "./index"

// 导入自定义 Hooks
import {
  useItemDetailState,
  useTMDBIntegration
} from "../hooks"
import { useItemImagesPreloader } from "@/lib/hooks/useItemImagesPreloader"

// 导入对话框组件
import ScheduledTaskDialog from "@/features/scheduled-tasks/components/scheduled-task-dialog"
import FixTMDBImportBugDialog from "@/features/tmdb-import/components/fix-tmdb-import-bug-dialog"

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

type CategoryType = "anime" | "tv" | "kids" | "variety" | "short";

interface ItemDetailDialogProps {
  item: TMDBItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (item: TMDBItem) => void
  onDelete: (id: string) => void
  onOpenScheduledTask?: (item: TMDBItem) => void
  displayMode?: "dialog" | "inline"
}

const ItemDetailDialogComponent = memo(function ItemDetailDialog({ item, open, onOpenChange, onUpdate, onDelete, onOpenScheduledTask, displayMode = "dialog" }: ItemDetailDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [pythonCmd, setPythonCmd] = useState<string>(process.platform === 'win32' ? 'python' : 'python3')

  const CATEGORIES = [
    { id: "anime", name: "动漫", icon: <Sparkles className="h-4 w-4 mr-2" strokeWidth={2} /> },
    { id: "tv", name: "电视剧", icon: <Tv className="h-4 w-4 mr-2" strokeWidth={2} /> },
    { id: "kids", name: "少儿", icon: <Baby className="h-4 w-4 mr-2" strokeWidth={2} /> },
    { id: "variety", name: "综艺", icon: <Popcorn className="h-4 w-4 mr-2" strokeWidth={2} /> },
    { id: "short", name: "短剧", icon: <Ticket className="h-4 w-4 mr-2" strokeWidth={2} /> },
  ]

  // 核心状态管理
  const {
    editing,
    setEditing,
    editData,
    setEditData,
    localItem,
    setLocalItem,
    copyFeedback,
    detailTab,
    setDetailTab,
    scrollPosition,
    showEpisodeChangeDialog,
    setShowEpisodeChangeDialog,
    episodeChangeData,
    setEpisodeChangeData,
    showDeleteSeasonDialog,
    setShowDeleteSeasonDialog,
    seasonToDelete,
    setSeasonToDelete,
    showDeleteDialog,
    setShowDeleteDialog,
    showFixBugDialog,
    setShowFixBugDialog,
    scheduledTaskDialogOpen,
    setScheduledTaskDialogOpen,
    isRefreshingTMDBData,
    setIsRefreshingTMDBData,
    refreshError,
    setRefreshError,
    isSaving,
    setIsSaving,
    appearanceSettings,
    setAppearanceSettings,
    updateLocalItem,
    showFeedback,
  } = useItemDetailState({ item, onUpdate })

  // 清除刷新错误
  const onClearRefreshError = () => {
    setRefreshError(null)
  }

  // 本地状态
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined)
  const [customSeasonNumber, setCustomSeasonNumber] = useState(1)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("zh-CN")

  // 使用图片预加载hook
  useItemImagesPreloader(item)

  // TMDB集成相关逻辑
  const { commands: tmdbCommands } = useTMDBIntegration({
    item: localItem,
    customSeasonNumber,
    selectedLanguage,
    pythonCmd
  })

  // 获取当前季节数据
  const currentSeason = localItem.seasons?.find(s => s.seasonNumber === selectedSeason) || null

  // 获取内联模式容器
  function getInlineContainer(): HTMLElement | null {
    if (typeof document === 'undefined') return null
    return document.body
  }

  // 直接保存项目到文件系统
  async function saveItemDirectly(updatedItem: TMDBItem): Promise<boolean> {
    try {
      // 获取现有数据
      const response = await fetch('/api/storage/file-operations', {
        method: 'GET',
        headers: { 'x-user-id': 'user_admin_system' }
      })

      if (!response.ok) {
        logger.error('获取现有数据失败:', response.statusText)
        return false
      }

      const { items = [] } = await response.json()

      // 更新或添加项目
      const index = items.findIndex(i => i.id === updatedItem.id)
      if (index !== -1) {
        items[index] = updatedItem
      } else {
        items.push(updatedItem)
      }

      // 保存数据
      const writeResponse = await fetch('/api/storage/file-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_admin_system'
        },
        body: JSON.stringify({ items })
      })

      return writeResponse.ok
    } catch (error) {
      logger.error('保存项目时出错:', error)
      return false
    }
  }

  // 同步本地状态与传入的item
  useEffect(() => {
    setLocalItem(item)
    setEditData(item)
  }, [item])

  // 初始化设置
  useEffect(() => {
    const initializeSettings = async () => {
      // 初始化python命令
      try {
        const pythonCommand = await ClientConfigManager.getItem('python_command')
        if (pythonCommand?.trim()) {
          setPythonCmd(pythonCommand)
        }
      } catch {}

      // 加载外观设置
      try {
        const savedSettings = await ClientConfigManager.getItem("appearance_settings")
        const parsed = savedSettings ? JSON.parse(savedSettings) : null

        setAppearanceSettings({
          detailBackdropBlurEnabled: parsed?.detailBackdropBlurEnabled ?? true,
          detailBackdropBlurIntensity: parsed?.detailBackdropBlurIntensity ?? 'medium',
          detailBackdropOverlayOpacity: parsed?.detailBackdropOverlayOpacity ?? 0.25,
        })
      } catch {
        setAppearanceSettings({
          detailBackdropBlurEnabled: true,
          detailBackdropBlurIntensity: 'medium',
          detailBackdropOverlayOpacity: 0.25,
        })
      }
    }

    initializeSettings()
  }, [])

  // 监听季数变化，初始化选中季数
  useEffect(() => {
    const seasons = localItem.seasons || []

    if (seasons.length > 0) {
      const maxSeasonNumber = Math.max(...seasons.map(s => s.seasonNumber || 1))
      setSelectedSeason(maxSeasonNumber)
      setCustomSeasonNumber(maxSeasonNumber)
    } else if (localItem.mediaType === "tv") {
      setSelectedSeason(1)
      setCustomSeasonNumber(1)
    }
  }, [localItem])

  // 处理季数切换
  function handleSeasonClick(seasonNumber: number) {
    setSelectedSeason(seasonNumber)
    setCustomSeasonNumber(seasonNumber)
    showFeedback(`已切换到第${seasonNumber}季`, 1000)
  }

  // 处理删除季数
  function handleDeleteSeason() {
    if (!selectedSeason) return
    setSeasonToDelete(selectedSeason)
    setShowDeleteSeasonDialog(true)
  }

  // 确认删除季数
  function confirmDeleteSeason() {
    if (!seasonToDelete || !localItem.seasons) return

    const updatedSeasons = localItem.seasons.filter(s => s.seasonNumber !== seasonToDelete)
    const updatedTotalEpisodes = updatedSeasons.reduce((sum, season) => sum + (season.currentEpisode || 0), 0)

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      totalEpisodes: updatedTotalEpisodes,
      updatedAt: new Date().toISOString()
    }

    updateLocalItem(updatedItem)
    showFeedback(`第${seasonToDelete}季已删除`, DELAY_2S)
    setShowDeleteSeasonDialog(false)
    setSeasonToDelete(null)

    // 更新选中的季
    if (updatedSeasons.length > 0) {
      const maxSeason = Math.max(...updatedSeasons.map(s => s.seasonNumber))
      setSelectedSeason(maxSeason)
      setCustomSeasonNumber(maxSeason)
    } else {
      setSelectedSeason(undefined)
    }
  }

  // 处理重置季数
  function handleResetSeason() {
    if (!selectedSeason || !currentSeason) return

    const updatedSeasons = localItem.seasons?.map(season => {
      if (season.seasonNumber === selectedSeason) {
        return {
          ...season,
          episodes: season.episodes?.map(ep => ({ ...ep, completed: false })) || []
        }
      }
      return season
    }) || []

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedSeasons.flatMap(s =>
        s.episodes?.map(ep => ({ ...ep, seasonNumber: s.seasonNumber })) || []
      ),
      updatedAt: new Date().toISOString()
    }

    updateLocalItem(updatedItem)
    showFeedback(`第${selectedSeason}季已重置`, DELAY_2S)
  }

  // 处理总集数变更
  function handleTotalEpisodesChange(newCount: number) {
    if (!selectedSeason || !localItem.seasons) return

    const currentSeason = localItem.seasons.find(function(s: Season) { return s.seasonNumber === selectedSeason })
    if (!currentSeason) return

    const oldCount = currentSeason.totalEpisodes
    if (newCount === oldCount) return

    setShowEpisodeChangeDialog(true)
    setEpisodeChangeData({
      oldCount,
      newCount,
      action: newCount > oldCount ? "increase" : "decrease"
    })
  }

  // 确认集数变更
  function confirmEpisodeChange() {
    if (!episodeChangeData || !selectedSeason || !localItem.seasons) return

    const { oldCount, newCount } = episodeChangeData

    const updatedSeasons = localItem.seasons.map(season => {
      if (season.seasonNumber === selectedSeason) {
        let updatedEpisodes = [...(season.episodes || [])]

        if (newCount > oldCount) {
          // 添加新剧集
          const newEpisodes = Array.from({ length: newCount - oldCount }, (_, i) => ({
            number: oldCount + i + 1,
            completed: false,
          }))
          updatedEpisodes = [...updatedEpisodes, ...newEpisodes]
        } else {
          // 减少剧集
          updatedEpisodes = updatedEpisodes.slice(0, newCount)
        }

        return {
          ...season,
          totalEpisodes: newCount,
          episodes: updatedEpisodes,
        }
      }
      return season
    })

    const updatedEpisodes = updatedSeasons.flatMap(season =>
      season.episodes?.map(ep => ({
        ...ep,
        seasonNumber: season.seasonNumber,
      })) || []
    )

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedEpisodes,
      totalEpisodes: updatedEpisodes.length,
      updatedAt: new Date().toISOString(),
    }

    updateLocalItem(updatedItem)
    showFeedback(`第${selectedSeason}季集数已更新为${newCount}集`, DELAY_2S)
    setShowEpisodeChangeDialog(false)
    setEpisodeChangeData(null)
  }

  // 取消集数变更
  function cancelEpisodeChange() {
    setShowEpisodeChangeDialog(false)
    setEpisodeChangeData(null)
  }

  // 添加新季
  function handleAddSeason(seasonNumber: number, episodeCount: number) {
    if (seasonNumber < 1 || episodeCount < 1) return

    // 检查季是否已存在
    const seasonExists = localItem.seasons?.some(s => s.seasonNumber === seasonNumber)
    if (seasonExists) {
      showFeedback(`第${seasonNumber}季已存在`)
      return
    }

    // 创建新季
    const newSeason = {
      seasonNumber,
      totalEpisodes: episodeCount,
      episodes: Array.from({ length: episodeCount }, (_, i) => ({
        number: i + 1,
        completed: false,
      })),
    }

    // 更新季列表
    const updatedSeasons = [...(localItem.seasons || []), newSeason]
      .sort((a, b) => a.seasonNumber - b.seasonNumber)

    // 更新剧集列表
    const updatedEpisodes = [
      ...(localItem.episodes || []),
      ...newSeason.episodes.map(ep => ({
        ...ep,
        seasonNumber: newSeason.seasonNumber,
      })),
    ]

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedEpisodes,
      totalEpisodes: (localItem.totalEpisodes || 0) + episodeCount,
      updatedAt: new Date().toISOString()
    }

    updateLocalItem(updatedItem)

    // 更新编辑状态
    if (editing) {
      setEditData({
        ...editData,
        seasons: updatedSeasons,
        episodes: updatedEpisodes,
        totalEpisodes: updatedItem.totalEpisodes
      })
    }

    // 选中新添加的季
    setSelectedSeason(seasonNumber)
    setCustomSeasonNumber(seasonNumber)

    showFeedback(`已添加第${seasonNumber}季，共${episodeCount}集`, DELAY_2S)
  }

  // 处理词条状态切换
  function handleMovieToggle(completed: boolean) {
    const updatedItem = {
      ...localItem,
      completed,
      status: completed ? ("completed" as const) : ("ongoing" as const),
      updatedAt: new Date().toISOString(),
    }

    updateLocalItem(updatedItem)
  }

  // 刷新TMDB数据
  async function refreshSeasonFromTMDB() {
    if (!editData.tmdbId) {
      showFeedback("没有TMDB ID，无法刷新数据")
      return
    }

    setIsRefreshingTMDBData(true)
    setRefreshError(null)

    try {
      const response = await fetch('/api/tmdb/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_admin_system'
        },
        body: JSON.stringify({
          tmdbId: editData.tmdbId,
          mediaType: editData.mediaType,
          seasonNumber: selectedSeason,
          language: selectedLanguage
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const updatedItem = {
        ...localItem,
        ...data,
        updatedAt: new Date().toISOString()
      }

      setLocalItem(updatedItem)
      onUpdate(updatedItem)

      let feedbackText
      if (data.hasNewBackdrop) {
        feedbackText = editData.mediaType === "tv" 
          ? "TMDB数据、背景图、标志、网络logo和简介已成功刷新" 
          : "TMDB数据、背景图、标志和简介已成功刷新"
      } else {
        feedbackText = editData.mediaType === "tv" 
          ? "TMDB数据、标志、网络logo和简介已成功刷新" 
          : "TMDB数据、标志和简介已成功刷新"
      }

      showFeedback(feedbackText)

    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "刷新TMDB数据失败，请稍后再试")
    } finally {
      setIsRefreshingTMDBData(false)
    }
  }

  // 处理语言变化
  function handleLanguageChange(languageCode: string) {
    setSelectedLanguage(languageCode)
  }

  // 获取进度信息
  const progress = localItem.seasons?.length
    ? {
        completed: localItem.seasons.reduce((sum, season) => sum + (season.currentEpisode || 0), 0),
        total: localItem.seasons.reduce((sum, season) => sum + season.totalEpisodes, 0)
      }
    : {
        completed: localItem.seasons?.[0]?.currentEpisode || 0,
        total: localItem.seasons?.[0]?.totalEpisodes || 0
      }

  const isDailyUpdate = localItem.isDailyUpdate

  // 辅助函数：检查元素是否在弹出组件或对话框内
  function isInPopover(element: HTMLElement | null): boolean {
    let current = element
    while (current) {
      if (current.hasAttribute('data-radix-select-content') ||
          current.hasAttribute('data-radix-popover-content') ||
          current.getAttribute('role') === 'dialog' ||
          current.hasAttribute('data-radix-scroll-area-viewport') ||
          current.closest('[data-radix-select-content]') ||
          current.closest('[data-radix-popover-content]') ||
          current.closest('[role="dialog"]') ||
          current.closest('[data-radix-scroll-area-viewport]')) {
        return true
      }
      current = current.parentElement
    }
    return false
  }

  // 辅助函数：查找可滚动元素
  function findScrollableElement(start: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = start
    while (current && current !== contentRef.current) {
      const style = window.getComputedStyle(current)
      const overflowY = style.overflowY
      if ((overflowY === 'auto' || overflowY === 'scroll') &&
          current.scrollHeight > current.clientHeight) {
        return current
      }
      if (current.hasAttribute('data-radix-scroll-area-viewport')) {
        return current
      }
      current = current.parentElement
    }
    return null
  }

  // 辅助函数：处理滚动
  function handleScroll(deltaY: number, target: Element) {
    if (!contentRef.current) return

    if (isInPopover(target as HTMLElement)) {
      return
    }

    const scrollableElement = findScrollableElement(target as HTMLElement)

    if (scrollableElement && contentRef.current.contains(scrollableElement)) {
      const scrollTop = scrollableElement.scrollTop
      const scrollHeight = scrollableElement.scrollHeight
      const clientHeight = scrollableElement.clientHeight

      const canScroll = (deltaY < 0 && scrollTop > 0) ||
                       (deltaY > 0 && scrollTop < scrollHeight - clientHeight)

      if (canScroll) {
        scrollableElement.scrollTop += deltaY
      }
    }
  }

  // 辅助函数：清理容器样式
  function cleanupContainerStyles(container: HTMLElement) {
    try {
      if (container.dataset.tmhManaged) {
        const prevOverflow = container.dataset.tmhPrevOverflow ?? ''
        container.style.overflow = prevOverflow
        container.style.removeProperty('--dialog-left')
        container.style.removeProperty('--dialog-top')
        container.style.removeProperty('--dialog-width')
        container.style.removeProperty('--dialog-height')
        delete container.dataset.tmhPrevOverflow
        delete container.dataset.tmhManaged
      } else {
        container.style.overflow = ''
      }
    } catch {
      container.style.overflow = ''
    }
  }

  // 辅助函数：设置容器样式
  function setupContainerStyles(container: HTMLElement): void {
    try {
      container.dataset.tmhPrevOverflow = container.style.overflow || ''
      container.dataset.tmhManaged = '1'
    } catch {}
    container.style.overflow = 'hidden'
  }

  useEffect(function() {
    if (displayMode !== 'inline') return undefined
    const container = getInlineContainer()
    if (!container) return undefined
    if (open) {
      const mainContent = document.getElementById('main-content-container')
      if (mainContent) {
        const rect = mainContent.getBoundingClientRect()
        container.style.setProperty('--dialog-left', `${rect.left}px`)
        container.style.setProperty('--dialog-top', `${rect.top}px`)
        container.style.setProperty('--dialog-width', `${rect.width}px`)
        container.style.setProperty('--dialog-height', `${rect.height}px`)
      }

      setupContainerStyles(container)

      const root = document.documentElement
      const body = document.body
      const savedScrollY = window.scrollY || window.pageYOffset || 0
      const prevRootOverflow = root.style.overflow
      const prevBodyOverflow = body.style.overflow
      const prevBodyPosition = body.style.position
      const prevBodyTop = body.style.top
      const prevBodyWidth = body.style.width
      const prevRootOverscroll = root.style.overscrollBehavior
      const prevBodyOverscroll = body.style.overscrollBehavior

      root.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      root.style.overscrollBehavior = 'none'
      body.style.overscrollBehavior = 'none'
      body.style.position = 'fixed'
      body.style.top = `-${savedScrollY}px`
      body.style.width = '100%'

      const wheelHandler = function(e: WheelEvent) {
        if (isInPopover(e.target as HTMLElement)) {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        handleScroll(e.deltaY, e.target as Element)
      }

      const touchStartYRef = { current: 0 }
      const touchStartHandler = function(e: TouchEvent) {
        const t = e.touches[0]
        if (t) touchStartYRef.current = t.clientY
      }
      const touchMoveHandler = function(e: TouchEvent) {
        if (isInPopover(e.target as HTMLElement)) {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        const deltaY = touchStartYRef.current - (e.touches[0]?.clientY || 0)
        handleScroll(deltaY, e.target as Element)
        touchStartYRef.current = e.touches[0]?.clientY || 0
      }

      window.addEventListener('wheel', wheelHandler, { passive: false, capture: true })
      window.addEventListener('touchstart', touchStartHandler, { passive: true, capture: true })
      window.addEventListener('touchmove', touchMoveHandler, { passive: false, capture: true })

      return function() {
        cleanupContainerStyles(container)

        root.style.overflow = prevRootOverflow
        body.style.overflow = prevBodyOverflow
        body.style.position = prevBodyPosition
        body.style.top = prevBodyTop
        body.style.width = prevBodyWidth
        root.style.overscrollBehavior = prevRootOverscroll
        body.style.overscrollBehavior = prevBodyOverscroll

        try {
          const y = parseInt((prevBodyTop || '0').replace(/[^-\d]/g, ''))
          if (!isNaN(y) && y !== 0) {
            window.scrollTo({ top: -y, behavior: 'auto' })
          }
        } catch {}

        window.removeEventListener('wheel', wheelHandler as any, true)
        window.removeEventListener('touchstart', touchStartHandler as any, true)
        window.removeEventListener('touchmove', touchMoveHandler as any, true)
      }
    } else {
      cleanupContainerStyles(container)
    }
    return undefined
  }, [open, displayMode])

  // 防御性修复：组件挂载时如果发现之前遗留的样式标记（例如热重载或异常卸载导致）且当前 dialog 未打开，尝试清理
  useEffect(() => {
    if (typeof document === 'undefined') return
    try {
      const container = getInlineContainer()
      if (!container) return
      if (container.dataset.tmhManaged && !open) {
        cleanupContainerStyles(container)
      }
    } catch {}
  }, [open, displayMode])

  // 处理剧集进度更新
  function handleEpisodeProgressUpdate(currentEpisode: number, seasonNumber: number) {
    if (!localItem.seasons) return

    const updatedSeasons = localItem.seasons.map(season =>
      season.seasonNumber === seasonNumber
        ? { ...season, currentEpisode }
        : season
    )

    const season = updatedSeasons.find(s => s.seasonNumber === seasonNumber)
    const isCompleted = season?.currentEpisode === season?.totalEpisodes

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      status: isCompleted ? "completed" : "ongoing",
      completed: isCompleted,
      updatedAt: new Date().toISOString(),
    }

    updateLocalItem(updatedItem)
  }

  // 处理保存编辑
  async function handleSaveEdit() {
    if (isSaving) return

    setIsSaving(true)

    const updatedItem = {
      ...editData,
      updatedAt: new Date().toISOString(),
    }

    try {
      const success = await saveItemDirectly(updatedItem)
      if (!success) {
        throw new Error('保存失败')
      }

      setLocalItem(updatedItem)
      onUpdate(updatedItem)
      setEditing(false)
      showFeedback('保存成功')
    } catch {
      showFeedback('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  // Helper function to get air time display
  const getAirTime = (weekday?: number): string => {
    if (weekday === undefined) return ""
    const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    return days[weekday] || ""
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            displayMode === 'inline'
              ? "absolute rounded-none max-w-none h-[100vh] bg-transparent border-none overscroll-none touch-none"
              : "max-w-7xl h-[85vh] overflow-hidden p-0 bg-transparent border-none"
          )}
          style={displayMode === 'inline' ? {
            left: 'var(--dialog-left, 0px)',
            top: 'var(--dialog-top, 0px)',
            width: 'var(--dialog-width, 100vw)',
            height: 'var(--dialog-height, 100vh)',
            transform: 'translate(0, 0)'
          } : undefined}
          ref={contentRef}
          showCloseButton={false}
          showOverlay={displayMode !== 'inline'}
          container={displayMode === 'inline' ? getInlineContainer() : undefined}
          position={displayMode === 'inline' ? 'absolute' : 'fixed'}
        >
          {/* 背景图 - 使用BackgroundImage组件，支持缓存避免重复加载 */}
          {(() => {
            const backgroundImageUrl = localItem.backdropUrl || localItem.posterUrl
            if (!backgroundImageUrl) return null

            const isUsingPoster = !localItem.backdropUrl && localItem.posterUrl
            const overlayClass = isUsingPoster
              ? "bg-gradient-to-b from-background/50 via-background/45 to-background/55"
              : "bg-gradient-to-b from-background/30 via-background/25 to-background/35"

            return (
              <BackgroundImage
                src={backgroundImageUrl}
                alt={localItem.title + (isUsingPoster ? " 海报背景" : " 背景图")}
                className={cn(
                  "absolute inset-0 z-0",
                  displayMode === 'inline' ? "w-screen h-screen" : "w-full h-full"
                )}
                objectPosition={`center ${20 + scrollPosition * 0.05}%`}
                blur={appearanceSettings?.detailBackdropBlurEnabled ?? true}
                blurIntensity={appearanceSettings?.detailBackdropBlurIntensity || 'medium'}
                overlayClassName={overlayClass}
              />
            )
          })()}

          {/* 内容层 */}
          <div className="relative z-10 h-full flex flex-col overflow-hidden overscroll-none" ref={contentRef}>
            <DialogHeader className="p-6 pb-2 flex flex-row items-start justify-between">
              <div className="flex-1 pr-4">
                <DialogTitle className="text-xl flex items-center">
                  <Tv className="mr-2 h-5 w-5" />
                  {localItem.logoUrl ? (
                    <div className="h-10 max-w-[200px] flex items-center">
                      <CachedImage
                        src={localItem.logoUrl}
                        alt={localItem.title}
                        className="max-h-full object-contain"
                        loading="eager"
                        decoding="async"
                        onError={function handleImageError(e) {
                          e.currentTarget.style.display = 'none';
                          const titleElement = e.currentTarget.parentElement?.nextElementSibling;
                          if (titleElement) {
                            titleElement.classList.remove('hidden');
                          }
                        }}
                      />
                    </div>
                  ) : null}
                  <span className={localItem.logoUrl ? "hidden ml-1" : ""}>
                    {localItem.title}
                  </span>
                  {localItem.category && (
                    <Badge variant="outline" className="ml-2">
                      {CATEGORIES.find((cat) => cat.id === localItem.category)?.name || localItem.category}
                    </Badge>
                  )}
                  {!editing && (
                    <Badge variant={localItem.status === "ongoing" ? "outline" : "default"} className="ml-2">
                      {localItem.status === "ongoing" ? "连载中" : "已完结"}
                    </Badge>
                  )}
                </DialogTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  {isDailyUpdate ? (
                    <Badge className="bg-blue-500 text-white">
                      <Zap className="h-3 w-3 mr-1 animate-pulse" />
                      每日更新 {localItem.airTime || ""}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {getAirTime(localItem.weekday)}
                    </Badge>
                  )}
                  {typeof localItem.secondWeekday === 'number' &&
                   localItem.secondWeekday >= 0 &&
                   !isDailyUpdate && (
                    <Badge className="bg-blue-500 text-white">
                      {getAirTime(localItem.secondWeekday)}
                    </Badge>
                  )}
                  {localItem.mediaType === "tv" && (
                    <Badge variant="outline">
                      {progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}% 已完成
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 pr-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 transition-transform hover:scale-110"
                  title="刷新TMDB数据"
                  onClick={refreshSeasonFromTMDB}
                  disabled={isRefreshingTMDBData}
                >
                  {isRefreshingTMDBData ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                {localItem.tmdbUrl && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 transition-transform hover:scale-110"
                    title="在TMDB中查看"
                    onClick={() => window.open(localItem.tmdbUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                {!editing ? (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 transition-transform hover:scale-110"
                    title="编辑"
                    onClick={() => setEditing(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 transition-transform hover:scale-110"
                    title="保存"
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {editing && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive transition-transform hover:scale-110"
                    title="删除"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 transition-transform hover:scale-110"
                  title={displayMode === 'inline' ? "返回" : "关闭"}
                  onClick={() => onOpenChange(false)}
                >
                  {displayMode === 'inline' ? <ArrowRightCircle className="h-4 w-4 rotate-180" /> : <X className="h-4 w-4" />}
                </Button>
              </div>
            </DialogHeader>

            {/* 网格布局 */}
            <div className="p-4 pt-0 grid grid-cols-4 gap-6 flex-1 overflow-hidden min-h-0">
              {/* 左侧：海报区域 */}
              <div className="col-span-1 max-w-full overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 flex flex-col pr-2 min-h-0">
                  {/* 海报区域 */}
                  <div className="rounded-lg overflow-hidden aspect-[2/3] backdrop-blur-md bg-background/30 flex items-center justify-center w-full flex-shrink-0 mb-2 transition-all duration-300 hover:shadow-lg">
                    {localItem.posterUrl ? (
                      <CachedImage
                        src={localItem.posterUrl}
                        alt={localItem.title}
                        className="w-full h-full object-cover"
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Tv className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">海报</p>
                      </div>
                    )}
                  </div>

                  {/* 条目信息区域 */}
                  {editing ? (
                    <div className="w-full rounded-lg backdrop-blur-md bg-background/30 p-2 flex-1 overflow-hidden transition-all duration-300 hover:shadow-lg">
                      <ScrollArea className="h-full">
                        <div className="space-y-1.5 pr-2">
                          <div className="pb-0.5 mb-0.5 flex items-center justify-between border-b border-border/20">
                            <h3 className="text-sm font-medium flex items-center">
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              词条编辑
                            </h3>
                          </div>

                          <div className="space-y-0.5">
                            <Label htmlFor="edit-title" className="text-xs text-muted-foreground">标题</Label>
                            <Input
                              id="edit-title"
                              value={editData.title}
                              onChange={function handleTitleChange(e) {
                              setEditData({...editData, title: e.target.value})
                            }}
                              className="h-8"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="space-y-0.5">
                              <Label htmlFor="edit-category" className="text-xs text-muted-foreground">分类</Label>
                              <Select
                                value={editData.category || "none"}
                                onValueChange={(value) => setEditData({...editData, category: value as CategoryType})}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="选择分类" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">未分类</SelectItem>
                                  {CATEGORIES.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      <div className="flex items-center">
                                        {cat.icon}
                                        {cat.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-0.5">
                              <Label htmlFor="edit-status" className="text-xs text-muted-foreground">状态</Label>
                              <Select
                                value={editData.status}
                                onValueChange={(value) => setEditData({...editData, status: value as "ongoing" | "completed"})}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ongoing">连载中</SelectItem>
                                  <SelectItem value="completed">已完结</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <Label htmlFor="edit-airtime" className="text-xs text-muted-foreground">播出时间</Label>
                            <Input
                              id="edit-airtime"
                              value={editData.airTime || ""}
                              onChange={function handleAirTimeChange(e) {
                              setEditData({...editData, airTime: e.target.value})
                            }}
                              placeholder="例如：周一 22:00"
                              className="h-8"
                            />
                          </div>

                          <div className="space-y-0.5">
                            <Label htmlFor="edit-weekday" className="text-xs text-muted-foreground">播出日</Label>
                            <Select
                              value={editData.weekday?.toString() || "none"}
                              onValueChange={(value) => setEditData({...editData, weekday: value === "none" ? undefined : parseInt(value)})}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="选择播出日" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">无</SelectItem>
                                {WEEKDAYS.map((day, index) => (
                                  <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">每日更新</Label>
                              <input
                                type="checkbox"
                                checked={editData.isDailyUpdate || false}
                                onChange={function handleDailyUpdateChange(e) {
                                setEditData({...editData, isDailyUpdate: e.target.checked})
                              }}
                                className="h-4 w-4"
                              />
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="w-full rounded-lg backdrop-blur-md bg-background/30 p-3 flex-1 overflow-hidden transition-all duration-300 hover:shadow-lg">
                      <ScrollArea className="h-full">
                        <div className="space-y-1 pr-2">
                          <MediaInfoCard item={localItem} />
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧：内容区域 */}
              <div className="col-span-3 flex flex-col min-h-0 overflow-hidden">
                {/* 操作按钮 */}
                <div className="flex flex-wrap gap-2 mb-3 items-center">
                  <Button
                    variant="outline"
                    className="flex items-center transition-all duration-300 hover:scale-105"
                    onClick={() => {
                      if (onOpenScheduledTask) {
                        onOpenScheduledTask(localItem);
                      } else {
                        setScheduledTaskDialogOpen(true);
                      }
                    }}
                  >
                    <AlarmClock className="h-4 w-4 mr-2" />
                    定时任务
                  </Button>
                </div>

                {/* 标签页切换 */}
                <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col min-h-0">
                  <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="details" className="flex items-center transition-all duration-300">
                      <Info className="h-4 w-4 mr-2" />
                      详情
                    </TabsTrigger>
                    <TabsTrigger value="integration" className="flex items-center transition-all duration-300">
                      <Terminal className="h-4 w-4 mr-2" />
                      集成工具
                    </TabsTrigger>
                  </TabsList>

                  {/* 详情标签内容 */}
                  <TabsContent value="details" className="flex-1 min-h-0 mt-0">
                    <DetailsTab
                      item={localItem}
                      selectedSeason={selectedSeason}
                      currentSeason={currentSeason}
                      editing={editing}
                      isRefreshingTMDBData={isRefreshingTMDBData}
                      refreshError={refreshError}
                      customSeasonNumber={customSeasonNumber}
                      selectedLanguage={selectedLanguage}
                      CATEGORIES={CATEGORIES}
                      WEEKDAYS={WEEKDAYS}
                      onSeasonClick={handleSeasonClick}
                      onResetSeason={handleResetSeason}
                      onDeleteSeason={handleDeleteSeason}
                      onRefreshTMDB={refreshSeasonFromTMDB}
                      onAddSeason={handleAddSeason}
                      onEpisodeProgressUpdate={handleEpisodeProgressUpdate}
                      onTotalEpisodesChange={handleTotalEpisodesChange}
                      onCustomSeasonNumberChange={setCustomSeasonNumber}
                      onClearRefreshError={onClearRefreshError}
                    />
                  </TabsContent>

                  {/* 集成工具标签内容 */}
                  <TMDBIntegrationTab
                    item={localItem}
                    commands={tmdbCommands}
                    onUpdate={(updatedItem) => {
                      setLocalItem(updatedItem)
                      onUpdate(updatedItem)
                    }}
                  />
                </Tabs>
              </div>
            </div>
          </div>

          {/* 复制反馈 */}
          {copyFeedback && (
            <div className="fixed bottom-4 right-4 backdrop-blur-md bg-primary/70 text-primary-foreground px-4 py-2 rounded-md shadow-lg text-sm z-50 border-none animate-in slide-in-from-bottom-5 duration-300">
              {copyFeedback}
            </div>
          )}

          {/* 对话框 */}
          <EpisodeChangeDialog
            open={showEpisodeChangeDialog}
            onOpenChange={setShowEpisodeChangeDialog}
            episodeChangeData={episodeChangeData}
            onCancel={cancelEpisodeChange}
            onConfirm={confirmEpisodeChange}
          />

          <DeleteSeasonDialog
            open={showDeleteSeasonDialog}
            onOpenChange={setShowDeleteSeasonDialog}
            seasonToDelete={seasonToDelete}
            onCancel={() => setShowDeleteSeasonDialog(false)}
            onConfirm={confirmDeleteSeason}
          />

          <DeleteItemDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            item={localItem}
            onCancel={() => setShowDeleteDialog(false)}
            onConfirm={() => {
              setShowDeleteDialog(false)
              onOpenChange(false)
              onDelete(localItem.id)
            }}
          />

          {/* 修复TMDB导入Bug对话框 */}
          <FixTMDBImportBugDialog
            open={showFixBugDialog}
            onOpenChange={setShowFixBugDialog}
            onCopyFix={() => {}}
          />
        </DialogContent>
      </Dialog>

      {/* 定时任务对话框 */}
      <ScheduledTaskDialog
        item={localItem}
        open={scheduledTaskDialogOpen}
        onOpenChange={setScheduledTaskDialogOpen}
        onUpdate={onUpdate}
      />
    </>
  )
})

// 导出组件
export const ItemDetailDialog = ItemDetailDialogComponent