"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
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
} from "lucide-react"
import type { TMDBItem, Episode, Season } from "@/types/tmdb-item"
import { cn } from "@/lib/utils"
import { ClientConfigManager } from "@/shared/lib/utils/client-config-manager"

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

function ItemDetailDialogComponent({ item, open, onOpenChange, onUpdate, onDelete, onOpenScheduledTask, displayMode = "dialog" }: ItemDetailDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [pythonCmd, setPythonCmd] = useState<string>(process.platform === 'win32' ? 'python' : 'python3')
  
  // 定义分类列表（必须在组件内部，因为包含 JSX）
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

  // 本地状态
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined)
  const [customSeasonNumber, setCustomSeasonNumber] = useState(1)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("zh-CN")
  const [lastClickedEpisode, setLastClickedEpisode] = useState<number | null>(null)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [highlightedEpisode, setHighlightedEpisode] = useState<number | null>(null)

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
  function getCurrentSeason(): Season | null {
    if (!localItem.seasons || !selectedSeason) return null
    return localItem.seasons.find(function(s: Season) { return s.seasonNumber === selectedSeason }) || null
  }

  const currentSeason = getCurrentSeason()

  // 获取内联模式容器
  const getInlineContainer = useCallback((): HTMLElement | null => {
    if (typeof document === 'undefined') return null
    return document.body
  }, [])

  // 直接保存项目到文件系统
  const saveItemDirectly = useCallback(async function(updatedItem: TMDBItem): Promise<boolean> {
    try {
      const response = await fetch('/api/storage/file-operations', {
        method: 'GET',
        headers: { 'x-user-id': 'user_admin_system' }
      })

      if (!response.ok) {
        console.error('获取现有数据失败:', response.statusText)
        return false
      }

      const data = await response.json()
      const items: TMDBItem[] = data.items || []

      const index = items.findIndex(function(i: TMDBItem) { return i.id === updatedItem.id })
      if (index !== -1) {
        items[index] = updatedItem
      } else {
        items.push(updatedItem)
      }

      const writeResponse = await fetch('/api/storage/file-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_admin_system'
        },
        body: JSON.stringify({ items })
      })

      if (!writeResponse.ok) {
        console.error('保存数据失败:', writeResponse.statusText)
        return false
      }

      return true
    } catch (error) {
      console.error('保存项目时出错:', error)
      return false
    }
  }, [])

  // 同步本地状态与传入的item
  useEffect(() => {
    setLocalItem(item)
    setEditData(item)
  }, [item])

  // 初始化python命令
  useEffect(() => {
    (async () => {
      try {
        const v = await ClientConfigManager.getItem('python_command')
        if (v && v.trim()) setPythonCmd(v)
      } catch {}
    })()
  }, [])

  // 加载外观设置
  useEffect(() => {
    (async () => {
      try {
        const savedAppearanceSettings = await ClientConfigManager.getItem("appearance_settings")
        if (savedAppearanceSettings) {
          const saved = JSON.parse(savedAppearanceSettings)
          if (saved) {
            setAppearanceSettings({
              detailBackdropBlurEnabled: saved.detailBackdropBlurEnabled ?? true,
              detailBackdropBlurIntensity: saved.detailBackdropBlurIntensity ?? 'medium',
              detailBackdropOverlayOpacity: saved.detailBackdropOverlayOpacity ?? 0.25,
            })
          }
        }
      } catch (e) {
        setAppearanceSettings({
          detailBackdropBlurEnabled: true,
          detailBackdropBlurIntensity: 'medium',
          detailBackdropOverlayOpacity: 0.25,
        })
      }
    })()
  }, [])

  // 监听季数变化，初始化选中季数
  useEffect(() => {
    if (localItem.seasons && localItem.seasons.length > 0) {
      const maxSeasonNumber = Math.max(...localItem.seasons.map(function(s: Season) { return s.seasonNumber || 1 }))
      setSelectedSeason(maxSeasonNumber)
      setCustomSeasonNumber(maxSeasonNumber)
    } else if (localItem.mediaType === "tv") {
      setSelectedSeason(1)
      setCustomSeasonNumber(1)
    }
  }, [localItem])

  // 处理季数切换
  const handleSeasonClick = (seasonNumber: number) => {
    setSelectedSeason(seasonNumber)
    setCustomSeasonNumber(seasonNumber)
    setLastClickedEpisode(null)
    showFeedback(`已切换到第${seasonNumber}季`, 1000)
  }

  // 处理批量切换
  function handleBatchToggleForSeason() {
    if (!selectedSeason || !localItem.seasons) return

    const season = localItem.seasons.find(function(s: Season) { return s.seasonNumber === selectedSeason })
    if (!season) return

    const allCompleted = season.episodes.every(function(ep: Episode) { return ep.completed })
    const newCompleted = !allCompleted

    season.episodes.forEach(function(episode: Episode) {
      handleEpisodeToggle(episode.number, newCompleted, selectedSeason)
    })
  }

  // 处理标记下一集
  function handleMarkNextEpisode() {
    if (!selectedSeason || !currentSeason || !currentSeason.episodes) {
      showFeedback('当前季没有集数')
      return
    }

    const nextEpisode = currentSeason.episodes.find(function(ep: Episode) { return !ep.completed })
    if (!nextEpisode) {
      showFeedback('所有集数都已完成')
      return
    }

    handleEpisodeToggle(nextEpisode.number, true, selectedSeason)
    showFeedback(`已标记第${nextEpisode.number}集为已完成`)
  }

  // 处理删除季数
  function handleDeleteSeason(seasonNumber: number) {
    setSeasonToDelete(seasonNumber)
    setShowDeleteSeasonDialog(true)
  }

  // 确认删除季数
  function confirmDeleteSeason() {
    if (!seasonToDelete || !localItem.seasons) return

    const updatedSeasons = localItem.seasons.filter(function(s: Season) { return s.seasonNumber !== seasonToDelete })
    const updatedEpisodes = localItem.episodes?.filter(function(ep: Episode) { return ep.seasonNumber !== seasonToDelete }) || []
    const updatedTotalEpisodes = updatedEpisodes.length

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedEpisodes,
      totalEpisodes: updatedTotalEpisodes,
      updatedAt: new Date().toISOString()
    }

    updateLocalItem(updatedItem)
    showFeedback(`第${seasonToDelete}季已删除`, 2000)
    setShowDeleteSeasonDialog(false)
    setSeasonToDelete(null)

    if (updatedSeasons.length > 0) {
      const maxSeason = Math.max(...updatedSeasons.map(function(s: Season) { return s.seasonNumber }))
      setSelectedSeason(maxSeason)
      setCustomSeasonNumber(maxSeason)
    } else {
      setSelectedSeason(undefined)
    }
  }

  // 处理重置季数
  function handleResetSeason() {
    if (!selectedSeason || !currentSeason) return

    const updatedSeasons = localItem.seasons?.map(function(season: Season) {
      if (season.seasonNumber === selectedSeason) {
        return {
          ...season,
          episodes: season.episodes.map(function(ep: Episode) { return { ...ep, completed: false } })
        }
      }
      return season
    }) || []

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedSeasons.flatMap(function(s: Season) {
        return s.episodes.map(function(ep: Episode) { return { ...ep, seasonNumber: s.seasonNumber } })
      }),
      updatedAt: new Date().toISOString()
    }

    updateLocalItem(updatedItem)
    showFeedback(`第${selectedSeason}季已重置`, 2000)
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

    const updatedSeasons = localItem.seasons.map(function(season: Season) {
      if (season.seasonNumber === selectedSeason) {
        let updatedEpisodes = [...season.episodes]

        if (newCount > oldCount) {
          const newEpisodes = Array.from({ length: newCount - oldCount }, function(_: unknown, i: number) {
            return {
              number: oldCount + i + 1,
              completed: false,
            }
          })
          updatedEpisodes = [...season.episodes, ...newEpisodes]
        } else {
          updatedEpisodes = season.episodes.slice(0, newCount)
        }

        return {
          ...season,
          totalEpisodes: newCount,
          episodes: updatedEpisodes,
        }
      }
      return season
    })

    const updatedEpisodes = updatedSeasons.flatMap(function(season: Season) {
      return season.episodes.map(function(ep: Episode) {
        return {
          ...ep,
          seasonNumber: season.seasonNumber,
        }
      })
    })

    const newTotalEpisodes = updatedEpisodes.length

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedEpisodes,
      totalEpisodes: newTotalEpisodes,
      updatedAt: new Date().toISOString(),
    }

    updateLocalItem(updatedItem)
    showFeedback(`第${selectedSeason}季集数已更新为${newCount}集`, 2000)
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

    const seasonExists = localItem.seasons?.some(function(season: Season) {
      return season.seasonNumber === seasonNumber
    })

    if (seasonExists) {
      showFeedback(`第${seasonNumber}季已存在`)
      return
    }

    const newSeason = {
      seasonNumber,
      totalEpisodes: episodeCount,
      episodes: Array.from({ length: episodeCount }, function(_: unknown, i: number) {
        return {
          number: i + 1,
          completed: false,
        }
      }),
    }

    const updatedSeasons = [...(localItem.seasons || []), newSeason].sort(function(a: Season, b: Season) { return a.seasonNumber - b.seasonNumber })
    const updatedEpisodes = [
      ...(localItem.episodes || []),
      ...newSeason.episodes.map(function(ep: Episode) {
        return {
          ...ep,
          seasonNumber: newSeason.seasonNumber,
        }
      }),
    ]

    const updatedTotalEpisodes = (localItem.totalEpisodes || 0) + episodeCount

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedEpisodes,
      totalEpisodes: updatedTotalEpisodes,
      updatedAt: new Date().toISOString()
    }

    updateLocalItem(updatedItem)

    if (editing) {
      setEditData({
        ...editData,
        seasons: updatedSeasons,
        episodes: updatedEpisodes,
        totalEpisodes: updatedTotalEpisodes
      })
    }

    setSelectedSeason(seasonNumber)
    setCustomSeasonNumber(seasonNumber)

    showFeedback(`已添加第${seasonNumber}季，共${episodeCount}集`, 2000)
  }

  // 处理电影状态切换
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

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(true)
        document.body.classList.add('shift-select-mode')
      }
    }

    const handleKeyUp = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false)
        document.body.classList.remove('shift-select-mode')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.body.classList.remove('shift-select-mode')
    }
  }, [])

  // 获取进度信息
  function getProgress() {
    if (localItem.mediaType === "movie") {
      return { completed: localItem.completed ? 1 : 0, total: 1 };
    }

    // 多季电视剧
    if (localItem.seasons && localItem.seasons.length > 0) {
      const total = localItem.seasons.reduce(function(sum: number, season: Season) { return sum + season.totalEpisodes }, 0);
      const completed = localItem.seasons.reduce(
        function(sum: number, season: Season) {
          // 添加安全检查确保episodes存在
          return sum + (season.episodes && season.episodes.length > 0
            ? season.episodes.filter(function(ep: Episode) { return ep.completed }).length
            : 0);
        },
        0
      );
      return { completed, total };
    }

    // 单季电视剧
    const completed = localItem.episodes?.filter(function(ep: Episode) { return ep.completed }).length || 0;
    const total = localItem.totalEpisodes || 0;
    return { completed, total };
  }

  const progress = getProgress()
  const isDailyUpdate = localItem.isDailyUpdate

  // 辅助函数：检查元素是否在弹出组件内
  function isInPopover(element: HTMLElement | null): boolean {
    let current = element
    while (current) {
      if (current.hasAttribute('data-radix-select-content') ||
          current.hasAttribute('data-radix-popover-content') ||
          current.closest('[data-radix-select-content]') ||
          current.closest('[data-radix-popover-content]')) {
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

  // 处理剧集切换
  async function handleEpisodeToggle(episodeNumber: number, completed: boolean, seasonNumber: number) {
    let episodeNumbers: number[] = []
    let rangeInfo = ''

    if (isShiftPressed) {
      if (lastClickedEpisode === null) {
        setLastClickedEpisode(episodeNumber)
        showFeedback(`已选择起点：第${episodeNumber}集`, 1000)
        return
      } else {
        const start = Math.min(lastClickedEpisode, episodeNumber)
        const end = Math.max(lastClickedEpisode, episodeNumber)
        episodeNumbers = Array.from({ length: end - start + 1 }, function(_: unknown, i: number) { return start + i })
        rangeInfo = `第${start}-${end}集`
        setLastClickedEpisode(null)
      }
    } else {
      episodeNumbers = [episodeNumber]
      rangeInfo = `第${episodeNumber}集`
    }

    let updatedItem = { ...localItem }

    if (updatedItem.seasons && seasonNumber) {
      const updatedSeasons = updatedItem.seasons.map(function(season: Season) {
        if (season.seasonNumber === seasonNumber) {
          const updatedEpisodes = season.episodes.map(function(ep: Episode) {
            return episodeNumbers.includes(ep.number) ? { ...ep, completed } : ep
          })
          return { ...season, episodes: updatedEpisodes }
        }
        return season
      })

      const allEpisodes = updatedSeasons.flatMap(function(season: Season) {
        return season.episodes.map(function(ep: Episode) {
          return {
            ...ep,
            seasonNumber: season.seasonNumber,
          }
        })
      })

      updatedItem = {
        ...updatedItem,
        seasons: updatedSeasons,
        episodes: allEpisodes,
        updatedAt: new Date().toISOString(),
      }
    } else {
      const updatedEpisodes = (updatedItem.episodes || []).map(function(ep: Episode) {
        return episodeNumbers.includes(ep.number) ? { ...ep, completed } : ep
      })

      updatedItem = {
        ...updatedItem,
        episodes: updatedEpisodes,
        updatedAt: new Date().toISOString(),
      }
    }

    const allCompleted = updatedItem.episodes?.every(function(ep: Episode) { return ep.completed }) && updatedItem.episodes.length > 0
    if (allCompleted && updatedItem.status === "ongoing") {
      updatedItem.status = "completed"
      updatedItem.completed = true
    } else if (!allCompleted && updatedItem.status === "completed") {
      updatedItem.status = "ongoing"
      updatedItem.completed = false
    }

    setLocalItem(updatedItem)

    if (!(isShiftPressed && lastClickedEpisode !== null && lastClickedEpisode !== episodeNumber)) {
      setLastClickedEpisode(episodeNumber)
    }

    if (episodeNumbers.length === 1) {
      setHighlightedEpisode(episodeNumbers[0] ?? null)
      setTimeout(function() { setHighlightedEpisode(null) }, 500)
    }

    try {
      const success = await saveItemDirectly(updatedItem)
      if (!success) {
        throw new Error('保存失败')
      }

      onUpdate(updatedItem)
      showFeedback(`已标记 ${episodeNumbers.length} 个集数为${completed ? '已完成' : '未完成'}`)
    } catch (error) {
      setLocalItem(localItem)
      showFeedback('更新失败，请重试')
    }
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
    } catch (error) {
      showFeedback('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  // Helper function to get air time display
  function getAirTime(weekday?: number): string {
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
                  {localItem.mediaType === "movie" ? (
                    <Film className="mr-2 h-5 w-5" />
                  ) : (
                    <Tv className="mr-2 h-5 w-5" />
                  )}
                  {localItem.logoUrl ? (
                    <div className="h-10 max-w-[200px] flex items-center">
                      <CachedImage
                        src={localItem.logoUrl}
                        alt={localItem.title}
                        className="max-h-full object-contain"
                        loading="eager"
                        decoding="async"
                        onError={(e) => {
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
                  {localItem.mediaType === "movie" && (
                    <Badge variant={localItem.completed ? "default" : "outline"}>
                      {localItem.completed ? "已观看" : "未观看"}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 pr-2">
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
            <div className="p-6 pt-0 grid grid-cols-4 gap-6 flex-1 overflow-hidden min-h-0">
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
                              onChange={(e) => setEditData({...editData, title: e.target.value})}
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
                              onChange={(e) => setEditData({...editData, airTime: e.target.value})}
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
                                onChange={(e) => setEditData({...editData, isDailyUpdate: e.target.checked})}
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
                <div className="flex flex-wrap gap-2 mb-4 items-center min-h-[40px]">
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
                  <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
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
                  <TabsContent value="details" className="transition-opacity duration-300 ease-in-out flex-1 min-h-0">
                    <DetailsTab
                      item={localItem}
                      selectedSeason={selectedSeason}
                      currentSeason={currentSeason}
                      editing={editing}
                      isRefreshingTMDBData={isRefreshingTMDBData}
                      refreshError={refreshError}
                      customSeasonNumber={customSeasonNumber}
                      selectedLanguage={selectedLanguage}
                      highlightedEpisode={highlightedEpisode}
                      CATEGORIES={CATEGORIES}
                      WEEKDAYS={WEEKDAYS}
                      onMovieToggle={handleMovieToggle}
                      onSeasonClick={handleSeasonClick}
                      onBatchToggle={handleBatchToggleForSeason}
                      onMarkNextEpisode={handleMarkNextEpisode}
                      onResetSeason={handleResetSeason}
                      onDeleteSeason={handleDeleteSeason}
                      onRefreshTMDB={refreshSeasonFromTMDB}
                      onAddSeason={handleAddSeason}
                      onEpisodeToggle={handleEpisodeToggle}
                      onEpisodeClick={function(episodeNumber: number) { setLastClickedEpisode(episodeNumber) }}
                      onTotalEpisodesChange={handleTotalEpisodesChange}
                      onCustomSeasonNumberChange={setCustomSeasonNumber}
                      onLanguageChange={handleLanguageChange}
                      onClearRefreshError={() => setRefreshError(null)}
                      onEditDataChange={setEditData}
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
}

// 导出优化后的组件
export const ItemDetailDialog = memo(ItemDetailDialogComponent)
export default ItemDetailDialog