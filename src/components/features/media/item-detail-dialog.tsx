"use client"

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react"
import { useData } from "@/components/features/auth/client-data-provider"
import { RealtimeStatusIndicator } from "@/components/common/realtime-status-indicator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/dialog"
import { Button } from "@/components/common/button"
import { Badge } from "@/components/common/badge"
import { Progress } from "@/components/common/progress"
import { Checkbox, EpisodeCheckbox } from "@/components/common/checkbox"
import { Input } from "@/components/common/input"
import { Label } from "@/components/common/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card"
import { ScrollArea } from "@/components/common/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogNoOverlay,
  AlertDialogNoOverlayContent,
} from "@/components/common/alert-dialog"
import {
  Copy,
  ExternalLink,
  Edit,
  Save,
  X,
  Trash2,
  Film,
  Tv,
  CheckCircle2,
  PlayCircle,
  Link,
  Plus,
  Minus,
  AlertTriangle,
  Info,
  CheckSquare,
  Square,
  RotateCcw,
  Terminal,
  Download,
  Sparkles,
  Clapperboard,
  Baby,
  Popcorn,
  Ticket,
  LayoutGrid,
  FileText,
  Wrench,
  Loader2,
  RefreshCw,
  AlarmClock,
  Settings,
  Zap,
  FileCode,
  Table,
  XCircle,
  Pencil,
  Lock,
  Clock,
  Filter,
  Send,
  Trash,
  Check,
  ClipboardList,
  BookOpen,
  ArrowRightCircle,
  Bug,
  Calendar,
  ImageIcon,
  BarChart,
  Languages,
  CalendarDays,
  PlusCircle,
  AlertCircle,
  Heart,
  Share2,
  StickyNote,
  BookMarked,
  ListTodo,
  Activity,
  Link2,
  FrameIcon,
  Code,
  CalendarPlus,
  CalendarClock,
  Network,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleX,
  PackageCheck,
  Play,
} from "lucide-react"
import type { TMDBItem, Season, Episode } from "@/lib/data/storage"
import TMDBImportIntegrationDialog from "@/components/features/tmdb/tmdb-import-integration-dialog"
import ScheduledTaskDialog from "@/components/features/scheduled-tasks/scheduled-task-dialog"
import type { TMDBSeasonData, BackdropSize } from "@/lib/tmdb/tmdb-types"
import FixTMDBImportBugDialog from "@/components/features/dialogs/fix-tmdb-import-bug-dialog"
import { toast } from "@/components/common/use-toast"
import { StorageManager } from "@/lib/data/storage"

import { getPlatformInfo } from "@/lib/utils"
import { PlatformLogo } from "@/components/common/platform-icon"
import { Skeleton } from "./ui/skeleton"
import { cn } from "@/lib/utils"
import { safeJsonParse } from "@/lib/utils"
import { BackgroundImage } from "@/components/common/background-image"
import { CachedImage } from "@/components/common/cached-image"
import { useItemImagesPreloader } from "@/lib/hooks/useItemImagesPreloader"

import { ClientConfigManager } from "@/lib/utils/client-config-manager"

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

// 定义分类列表
const CATEGORIES = [
  { id: "anime", name: "动漫", icon: <Sparkles className="h-4 w-4 mr-2" strokeWidth={2} /> },
  { id: "tv", name: "电视剧", icon: <Tv className="h-4 w-4 mr-2" strokeWidth={2} /> },
  { id: "kids", name: "少儿", icon: <Baby className="h-4 w-4 mr-2" strokeWidth={2} /> },
  { id: "variety", name: "综艺", icon: <Popcorn className="h-4 w-4 mr-2" strokeWidth={2} /> },
  { id: "short", name: "短剧", icon: <Ticket className="h-4 w-4 mr-2" strokeWidth={2} /> },

]

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

export default function ItemDetailDialog({ item, open, onOpenChange, onUpdate, onDelete, onOpenScheduledTask, displayMode = "dialog" }: ItemDetailDialogProps) {
  const [pythonCmd, setPythonCmd] = useState<string>(process.platform === 'win32' ? 'python' : 'python3')
  useEffect(() => {
    (async () => {
      try {
        const v = await ClientConfigManager.getItem('python_command')
        if (v && v.trim()) setPythonCmd(v)
      } catch {}
    })()
  }, [])
  const { updateItem, isConnected, pendingOperations } = useData()
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState(item)
  const [localItem, setLocalItem] = useState<TMDBItem>(item)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [lastClickedEpisode, setLastClickedEpisode] = useState<number | null>(null)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined)
  const [showEpisodeChangeDialog, setShowEpisodeChangeDialog] = useState(false)
  const [episodeChangeData, setEpisodeChangeData] = useState<{
    oldCount: number
    newCount: number
    action: "increase" | "decrease"
  } | null>(null)
  const [showDeleteSeasonDialog, setShowDeleteSeasonDialog] = useState(false)
  const [seasonToDelete, setSeasonToDelete] = useState<number | null>(null)
  const [isRefreshingTMDBData, setIsRefreshingTMDBData] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [customSeasonNumber, setCustomSeasonNumber] = useState(1)
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showFixBugDialog, setShowFixBugDialog] = useState(false)
  const [scheduledTaskDialogOpen, setScheduledTaskDialogOpen] = useState(false)
  const [tmdbCommands, setTmdbCommands] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("episodes")
  const [detailTab, setDetailTab] = useState("details")
  const [scrollPosition, setScrollPosition] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isMarkingEpisode, setIsMarkingEpisode] = useState(false)
  const [highlightedEpisode, setHighlightedEpisode] = useState<number | null>(null)
  // 全局外观设置（仅取本页需要的字段）
  const [appearanceSettings, setAppearanceSettings] = useState<{
    detailBackdropBlurEnabled?: boolean
    detailBackdropBlurIntensity?: 'light' | 'medium' | 'heavy'
    detailBackdropOverlayOpacity?: number
  } | null>(null);

  // 使用新的图片预加载hook
  useItemImagesPreloader(item);
  
  // Helper: 获取内联模式下应作为 portal 容器的元素
  // 使用 document.body 作为容器避免 aria-hidden 的 containment 问题
  // 然后通过 CSS 和绝对定位来控制显示位置
  const getInlineContainer = useCallback((): HTMLElement | null => {
    if (typeof document === 'undefined') return null
    return document.body
  }, [])

  // 直接保存项目到文件系统，绕过API调用
  const saveItemDirectly = useCallback(async (updatedItem: TMDBItem): Promise<boolean> => {
    try {
      // 首先获取所有当前项目数据
      const response = await fetch('/api/storage/file-operations', {
        method: 'GET',
        headers: {
          'x-user-id': 'user_admin_system'
        }
      })

      if (!response.ok) {
        console.error('获取现有数据失败:', response.statusText)
        return false
      }

      const data = await response.json()
      const items: TMDBItem[] = data.items || []

      // 查找并更新目标项目
      const index = items.findIndex(i => i.id === updatedItem.id)
      if (index !== -1) {
        items[index] = updatedItem
      } else {
        items.push(updatedItem)
      }

      // 将更新后的数据写回文件
      const writeResponse = await fetch('/api/storage/file-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_admin_system'
        },
        body: JSON.stringify({
          items: items,
          backup: true
        })
      })

      if (!writeResponse.ok) {
        console.error('保存数据失败:', writeResponse.statusText)
        return false
      }

      console.log(`[DirectSave] 成功保存项目: ${updatedItem.title} (ID: ${updatedItem.id})`)
      return true
    } catch (error) {
      console.error('直接保存项目失败:', error)
      return false
    }
  }, [])
  
  useEffect(() => {
    // 确保所有属性都被正确初始化，包括isDailyUpdate
    const initialEditData = {
      ...item,
      isDailyUpdate: item.isDailyUpdate || false
    }
    setEditData(initialEditData)
    setLocalItem(item)

    // 每次item变化时强制选择季数，确保始终有默认选中的季节
    if (item.seasons && item.seasons.length > 0) {
      try {
        // 找到季数最大的季
        const maxSeasonNumber = Math.max(...item.seasons.map((s) => s.seasonNumber || 1))
        setSelectedSeason(maxSeasonNumber)
        setCustomSeasonNumber(maxSeasonNumber)
      } catch (error) {
        // 如果出错，默认设置为1
        
        setSelectedSeason(1)
        setCustomSeasonNumber(1)
      }
    } else if (item.mediaType === "tv") {
      // 如果是电视剧但没有seasons属性（单季剧），默认设置为1
      setSelectedSeason(1)
      setCustomSeasonNumber(1)
    }

    // 优化图片预加载策略 - 只预加载当前视图需要的图片
    // 优先预加载背景图（对用户体验最重要）
    if (item.backdropUrl) {
      const img = new Image();
      img.src = item.backdropUrl;
    }

    // 读取全局外观设置
    (async () => {
      try {
        const savedAppearanceSettings = await ClientConfigManager.getItem("appearance_settings")
        if (savedAppearanceSettings) {
          const saved = safeJsonParse<any>(savedAppearanceSettings)
          if (saved) {
            setAppearanceSettings({
              detailBackdropBlurEnabled: saved.detailBackdropBlurEnabled ?? true,
              detailBackdropBlurIntensity: saved.detailBackdropBlurIntensity ?? 'medium',
              detailBackdropOverlayOpacity: saved.detailBackdropOverlayOpacity ?? 0.25,
            })
          } else {
            setAppearanceSettings({
              detailBackdropBlurEnabled: true,
              detailBackdropBlurIntensity: 'medium',
              detailBackdropOverlayOpacity: 0.25,
            })
          }
        } else {
          setAppearanceSettings({
            detailBackdropBlurEnabled: true,
            detailBackdropBlurIntensity: 'medium',
            detailBackdropOverlayOpacity: 0.25,
          })
        }
      } catch (e) {
        
        setAppearanceSettings({
          detailBackdropBlurEnabled: true,
          detailBackdropBlurIntensity: 'medium',
          detailBackdropOverlayOpacity: 0.25,
        })
      }
    })()
  }, [item])

  // 监听季数变化，更新TMDB命令
  useEffect(() => {
    setTmdbCommands(generateTmdbImportCommands())
  }, [customSeasonNumber])

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(true)

        // 为body添加类，防止文本选择
        document.body.classList.add('shift-select-mode')
      }
    }

    const handleKeyUp = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false)

        // 移除防止文本选择的类
        document.body.classList.remove('shift-select-mode')
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)

      // 确保在组件卸载时移除类
      document.body.classList.remove('shift-select-mode')
    }
  }, [])

  useEffect(() => {
    if (displayMode !== 'inline') return
    const container = getInlineContainer()
    if (!container) return
    if (open) {
      // 获取主内容容器的位置信息
      const mainContent = document.getElementById('main-content-container')
      if (mainContent) {
        const rect = mainContent.getBoundingClientRect()
        // 设置 CSS 变量来定位 Dialog
        container.style.setProperty('--dialog-left', `${rect.left}px`)
        container.style.setProperty('--dialog-top', `${rect.top}px`)
        container.style.setProperty('--dialog-width', `${rect.width}px`)
        container.style.setProperty('--dialog-height', `${rect.height}px`)
      }

      // 保存 container 原始样式和属性到 dataset，以便在 cleanup 或异常卸载时恢复（更健壮）
      try {
        container.dataset.tmhPrevOverflow = container.style.overflow || ''
        container.dataset.tmhManaged = '1'
      } catch {}

      // 应用必须的样式，阻止 body 滚动
      container.style.overflow = 'hidden'

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

      const getScrollableAncestor = (start: Node, within: HTMLElement): HTMLElement | null => {
        let el: HTMLElement | null = (start as HTMLElement)?.closest('*') as HTMLElement
        while (el && within.contains(el)) {
          const style = window.getComputedStyle(el)
          const overflowY = style.overflowY
          if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
            return el
          }
          el = el.parentElement
        }
        return within
      }

      const canScroll = (el: HTMLElement | null, deltaY: number) => {
        if (!el) return false
        if (deltaY < 0) return el.scrollTop > 0
        if (deltaY > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1
        return false
      }

      const wheelHandler = (e: WheelEvent) => {
        // 总是阻止默认行为
        e.preventDefault()

        if (!contentRef.current) return

        const target = e.target as Element

        // 检查是否在可滚动的元素内
        let scrollableElement: HTMLElement | null = null
        let current = target as HTMLElement | null

        // 向上遍历查找可滚动元素
        while (current && current !== contentRef.current) {
          const style = window.getComputedStyle(current)
          const overflowY = style.overflowY

          // 检查是否是可滚动元素
          if ((overflowY === 'auto' || overflowY === 'scroll') &&
              current.scrollHeight > current.clientHeight) {
            scrollableElement = current
            break
          }

          // 检查是否是 ScrollArea 的视口
          if (current.hasAttribute('data-radix-scroll-area-viewport')) {
            scrollableElement = current
            break
          }

          current = current.parentElement
        }

        if (scrollableElement && contentRef.current.contains(scrollableElement)) {
          // 在可滚动元素内，手动处理滚动
          const deltaY = e.deltaY
          const scrollTop = scrollableElement.scrollTop
          const scrollHeight = scrollableElement.scrollHeight
          const clientHeight = scrollableElement.clientHeight

          // 检查是否可以滚动
          if ((deltaY < 0 && scrollTop > 0) ||
              (deltaY > 0 && scrollTop < scrollHeight - clientHeight)) {
            // 可以滚动，更新滚动位置
            scrollableElement.scrollTop += deltaY
          }
        }

        // 总是阻止冒泡
        e.stopPropagation()
        e.stopImmediatePropagation()
      }

      const touchStartYRef = { current: 0 }
      const touchStartHandler = (e: TouchEvent) => {
        const t = e.touches[0]
        if (t) touchStartYRef.current = t.clientY
      }
      const touchMoveHandler = (e: TouchEvent) => {
        // 总是阻止默认行为
        e.preventDefault()

        if (!contentRef.current) return

        const target = e.target as Element
        const deltaY = touchStartYRef.current - (e.touches[0]?.clientY || 0)

        // 检查是否在可滚动的元素内
        let scrollableElement: HTMLElement | null = null
        let current = target as HTMLElement | null

        // 向上遍历查找可滚动元素
        while (current && current !== contentRef.current) {
          const style = window.getComputedStyle(current)
          const overflowY = style.overflowY

          // 检查是否是可滚动元素
          if ((overflowY === 'auto' || overflowY === 'scroll') &&
              current.scrollHeight > current.clientHeight) {
            scrollableElement = current
            break
          }

          // 检查是否是 ScrollArea 的视口
          if (current.hasAttribute('data-radix-scroll-area-viewport')) {
            scrollableElement = current
            break
          }

          current = current.parentElement
        }

        if (scrollableElement && contentRef.current.contains(scrollableElement)) {
          // 在可滚动元素内，手动处理滚动
          const scrollTop = scrollableElement.scrollTop
          const scrollHeight = scrollableElement.scrollHeight
          const clientHeight = scrollableElement.clientHeight

          // 检查是否可以滚动
          if ((deltaY < 0 && scrollTop > 0) ||
              (deltaY > 0 && scrollTop < scrollHeight - clientHeight)) {
            // 可以滚动，更新滚动位置
            scrollableElement.scrollTop += deltaY
            touchStartYRef.current = e.touches[0]?.clientY || 0
          }
        }

        // 总是阻止冒泡
        e.stopPropagation()
        e.stopImmediatePropagation()
      }

      window.addEventListener('wheel', wheelHandler, { passive: false, capture: true })
      window.addEventListener('touchstart', touchStartHandler, { passive: true, capture: true })
      window.addEventListener('touchmove', touchMoveHandler, { passive: false, capture: true })
      return () => {
        // 恢复 container 的原始样式（优先从 dataset 读取以防闭包丢失）
        try {
          const prevOverflow = container.dataset.tmhPrevOverflow ?? ''
          const prevHeight = container.dataset.tmhPrevHeight ?? ''
          const prevPosition = container.dataset.tmhPrevPosition ?? ''
          container.style.overflow = prevOverflow
          container.style.height = prevHeight
          if (prevPosition !== undefined) container.style.position = prevPosition
          // 清理 dataset 标记
          delete container.dataset.tmhPrevOverflow
          delete container.dataset.tmhPrevHeight
          delete container.dataset.tmhPrevPosition
          delete container.dataset.tmhManaged
        } catch {}

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
      // 如果不是 open 状态，确保我们没有留下样式（只在本组件曾管理过时清理）
      try {
        if (container.dataset.tmhManaged) {
          const prevOverflow = container.dataset.tmhPrevOverflow ?? ''
          container.style.overflow = prevOverflow
          // 清理 CSS 变量
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
  }, [open, displayMode])

  // 防御性修复：组件挂载时如果发现之前遗留的样式标记（例如热重载或异常卸载导致）且当前 dialog 未打开，尝试清理
  useEffect(() => {
    if (typeof document === 'undefined') return
    try {
      const container = getInlineContainer()
      if (!container) return
      if (container.dataset.tmhManaged && !open) {
        const prevOverflow = container.dataset.tmhPrevOverflow ?? ''
        container.style.overflow = prevOverflow
        // 清理 CSS 变量
        container.style.removeProperty('--dialog-left')
        container.style.removeProperty('--dialog-top')
        container.style.removeProperty('--dialog-width')
        container.style.removeProperty('--dialog-height')
        delete container.dataset.tmhPrevOverflow
        delete container.dataset.tmhManaged
      }
    } catch {}
  }, [])

  // 监听滚动事件，实现视差效果
  useEffect(() => {
    if (!open || !contentRef.current) return

    let ticking = false
    const handleScroll = () => {
      if (!contentRef.current) return
      const top = contentRef.current.scrollTop
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollPosition(top)
          ticking = false
        })
        ticking = true
      }
    }

    const contentElement = contentRef.current
    contentElement?.addEventListener('scroll', handleScroll)

    return () => {
      contentElement?.removeEventListener('scroll', handleScroll)
    }
  }, [open, contentRef.current])

  // 添加额外的滚动阻止
  useEffect(() => {
    if (!open || displayMode !== 'inline') return

    // 阻止整个页面的滚动
    const preventScroll = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
    }

    // 在内容容器上添加滚动监听
    const contentElement = contentRef.current
    if (contentElement) {
      contentElement.addEventListener('wheel', preventScroll, { passive: false, capture: true })
      contentElement.addEventListener('touchmove', preventScroll, { passive: false, capture: true })
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('wheel', preventScroll, true)
        contentElement.removeEventListener('touchmove', preventScroll, true)
      }
    }
  }, [open, displayMode])

  useEffect(() => {
    if (!contentRef.current) return
    const el = contentRef.current
    const updateOverflow = () => {
      const needsScroll = el.scrollHeight > el.clientHeight + 1
      el.style.overflowY = needsScroll ? 'auto' : 'hidden'
    }
    updateOverflow()
    const ro = new ResizeObserver(updateOverflow)
    ro.observe(el)
    window.addEventListener('resize', updateOverflow)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateOverflow)
    }
  }, [open, displayMode])

  const handleEpisodeToggle = async (episodeNumber: number, completed: boolean, seasonNumber: number) => {
    // 计算要操作的集数范围
    let episodeNumbers: number[] = []
    let rangeInfo = ''
    
    // Shift多选逻辑：按住Shift时进行范围选择
    if (isShiftPressed) {
      if (lastClickedEpisode === null) {
        // 第一次点击，只记录起点，不执行更新
        setLastClickedEpisode(episodeNumber)
        setCopyFeedback(`已选择起点：第${episodeNumber}集`)
        setTimeout(() => setCopyFeedback(null), 1000)
        return
      } else {
        // 第二次点击，执行范围选择
        const start = Math.min(lastClickedEpisode, episodeNumber)
        const end = Math.max(lastClickedEpisode, episodeNumber)
        
        for (let i = start; i <= end; i++) {
          episodeNumbers.push(i)
        }
        rangeInfo = `第${start}-${end}集`
        setLastClickedEpisode(null) // 重置
      }
    } else {
      // 普通点击，立即更新当前集数
      episodeNumbers = [episodeNumber]
      rangeInfo = `第${episodeNumber}集`
    }

    // 添加视觉反馈
    if (completed) {
      setCopyFeedback(`${rangeInfo}已标记为完成`)
    } else {
      setCopyFeedback(`${rangeInfo}已标记为未完成`)
    }
    setTimeout(() => setCopyFeedback(null), 1500)

    // 立即更新本地状态，实现即时UI反馈
    let updatedItem = { ...localItem } // 使用本地状态作为基础

    if (updatedItem.seasons && seasonNumber) {
      // 多季模式
      const updatedSeasons = updatedItem.seasons.map((season) => {
        if (season.seasonNumber === seasonNumber) {
          let updatedEpisodes = [...season.episodes]

          // 对每个要操作的集数进行更新
          episodeNumbers.forEach(epNum => {
            updatedEpisodes = updatedEpisodes.map((ep) => 
              ep.number === epNum ? { ...ep, completed } : ep
            )
          })

          return { ...season, episodes: updatedEpisodes }
        }
        return season
      })

      // 更新扁平化的episodes数组
      const allEpisodes = updatedSeasons.flatMap((season) =>
        season.episodes.map((ep) => ({
          ...ep,
          seasonNumber: season.seasonNumber,
        })),
      )

      updatedItem = {
        ...updatedItem,
        seasons: updatedSeasons,
        episodes: allEpisodes,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // 单季模式
      let updatedEpisodes = [...(updatedItem.episodes || [])]

      if (isShiftPressed && lastClickedEpisode !== null && lastClickedEpisode !== episodeNumber) {
        const start = Math.min(lastClickedEpisode, episodeNumber)
        const end = Math.max(lastClickedEpisode, episodeNumber)

        updatedEpisodes = updatedEpisodes.map((ep) => {
          if (ep.number >= start && ep.number <= end) {
            return { ...ep, completed }
          }
          return ep
        })
      } else {
        updatedEpisodes = updatedEpisodes.map((ep) => (ep.number === episodeNumber ? { ...ep, completed } : ep))
      }

      updatedItem = {
        ...updatedItem,
        episodes: updatedEpisodes,
        updatedAt: new Date().toISOString(),
      }
    }

    // 检查是否所有集数都已完成
    const allCompleted = updatedItem.episodes?.every((ep) => ep.completed) && updatedItem.episodes.length > 0
    if (allCompleted && updatedItem.status === "ongoing") {
      updatedItem.status = "completed"
      updatedItem.completed = true
    } else if (!allCompleted && updatedItem.status === "completed") {
      updatedItem.status = "ongoing"
      updatedItem.completed = false
    }

    // 先更新本地状态，实现即时UI反馈
    setLocalItem(updatedItem)
    
    // 只有在非Shift多选时才更新最后点击的集数
    if (!(isShiftPressed && lastClickedEpisode !== null && lastClickedEpisode !== episodeNumber)) {
      setLastClickedEpisode(episodeNumber)
    }

    // 为单集操作添加短暂的高亮效果
    if (episodeNumbers.length === 1) {
      setHighlightedEpisode(episodeNumbers[0])
      setTimeout(() => setHighlightedEpisode(null), 500) // 500ms后清除高亮
    }

    try {
      // 直接操作文件系统保存更新
      const success = await saveItemDirectly(updatedItem)
      
      if (!success) {
        throw new Error('保存失败')
      }

      // 保存成功后，通知父组件更新全局状态
      onUpdate(updatedItem)
      
      // 显示成功反馈
      setCopyFeedback(`已标记 ${episodeNumbers.length} 个集数为${completed ? '已完成' : '未完成'}`)
      setTimeout(() => setCopyFeedback(null), 2000)

    } catch (error) {
      
      // 如果保存失败，回滚本地状态
      setLocalItem(localItem)
      setCopyFeedback('更新失败，请重试')
      setTimeout(() => setCopyFeedback(null), 2000)
    }
  }

  // 处理批量切换
  const handleBatchToggle = (seasonNumber: number, completed: boolean) => {
    let updatedItem = { ...localItem }

    if (localItem.seasons) {
      // 多季模式
      const updatedSeasons = localItem.seasons.map((season) => {
        if (season.seasonNumber === seasonNumber) {
          const updatedEpisodes = season.episodes.map((ep) => ({
            ...ep,
            completed,
          }))
          return { ...season, episodes: updatedEpisodes }
        }
        return season
      })

      // 更新扁平化的episodes数组
      const allEpisodes = updatedSeasons.flatMap((season) =>
        season.episodes.map((ep) => ({
          ...ep,
          seasonNumber: season.seasonNumber,
        })),
      )

      updatedItem = {
        ...updatedItem,
        seasons: updatedSeasons,
        episodes: allEpisodes,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // 单季模式
      const updatedEpisodes = (localItem.episodes || []).map((ep) => ({
        ...ep,
        completed,
      }))

      updatedItem = {
        ...updatedItem,
        episodes: updatedEpisodes,
        updatedAt: new Date().toISOString(),
      }
    }

    // 检查是否所有集数都已完成
    const allCompleted = updatedItem.episodes?.every((ep) => ep.completed) && updatedItem.episodes.length > 0
    if (allCompleted && localItem.status === "ongoing") {
      updatedItem.status = "completed"
      updatedItem.completed = true
    } else if (!allCompleted && localItem.status === "completed") {
      updatedItem.status = "ongoing"
      updatedItem.completed = false
    }

    // 先更新本地状态
    setLocalItem(updatedItem)

    // 再通知父组件
    onUpdate(updatedItem)
  }

  

  const handleMovieToggle = (completed: boolean) => {
    const updatedItem = {
      ...localItem,
      completed,
      status: completed ? ("completed" as const) : ("ongoing" as const),
      updatedAt: new Date().toISOString(),
    }

    // 先更新本地状态
    setLocalItem(updatedItem)

    // 再通知父组件
    onUpdate(updatedItem)
  }

  // 处理季数切换
  const handleSeasonClick = (seasonNumber: number) => {
    setSelectedSeason(seasonNumber)
    setCustomSeasonNumber(seasonNumber)
    // 重置最后点击的集数，避免跨季批量选择
    setLastClickedEpisode(null)
  }

  // 处理总集数调整
  const handleTotalEpisodesChange = (newTotal: number) => {
    const currentTotal = editData.totalEpisodes || 0

    if (newTotal === currentTotal) return

    // 检查是否有已完成的集数会被删除
    if (newTotal < currentTotal && editData.episodes) {
      const episodesToRemove = editData.episodes.filter((ep) => ep.number > newTotal && ep.completed)

      if (episodesToRemove.length > 0) {
        setEpisodeChangeData({
          oldCount: currentTotal,
          newCount: newTotal,
          action: "decrease",
        })
        setShowEpisodeChangeDialog(true)
        return
      }
    }

    // 直接更新集数
    updateEpisodeCount(newTotal)
  }

  const updateEpisodeCount = (newTotal: number) => {
    const updatedEditData = { ...editData }

    // 检查是否有多季数据
    if (updatedEditData.seasons && selectedSeason) {
      // 更新指定季的集数
      const updatedSeasons = updatedEditData.seasons.map((season) => {
        if (season.seasonNumber === selectedSeason) {
          // 添加安全检查
          const seasonEpisodes = season.episodes || [];
          const episodesToRemove = seasonEpisodes.filter((ep) => ep.number > newTotal && ep.completed);

          // 如果有已完成的集数将被删除，弹出确认对话框
          if (episodesToRemove.length > 0) {
            setEpisodeChangeData({
              oldCount: season.totalEpisodes,
              newCount: newTotal,
              action: "decrease",
            })
            setShowEpisodeChangeDialog(true)
            return season // 不立即更新，等待用户确认
          }

          // 创建新的集数数组
          const newEpisodes =
            newTotal > seasonEpisodes.length
              ? [
                  // 保留现有的集数
                  ...seasonEpisodes,
                  // 添加新的集数
                  ...Array.from({ length: newTotal - seasonEpisodes.length }, (_, i) => ({
                    number: seasonEpisodes.length + i + 1,
                    completed: false,
                    seasonNumber: season.seasonNumber,
                  })),
                ]
              : // 减少集数
                seasonEpisodes.filter((ep) => ep.number <= newTotal)

          return {
            ...season,
            totalEpisodes: newTotal,
            episodes: newEpisodes,
          }
        }
        return season
      })

      setEditData({
        ...updatedEditData,
        seasons: updatedSeasons,
      })
    } else {
      // 单季模式
      // 添加安全检查
      const currentEpisodes = updatedEditData.episodes || [];
      const episodesToRemove = currentEpisodes.filter((ep) => ep.number > newTotal && ep.completed);

      // 如果有已完成的集数将被删除，弹出确认对话框
      if (episodesToRemove.length > 0) {
        setEpisodeChangeData({
          oldCount: updatedEditData.totalEpisodes || 0,
          newCount: newTotal,
          action: "decrease",
        })
        setShowEpisodeChangeDialog(true)
        return
      }

      // 创建新的集数数组
      const newEpisodes =
        newTotal > currentEpisodes.length
          ? [
              // 保留现有的集数
              ...currentEpisodes,
              // 添加新的集数
              ...Array.from({ length: newTotal - currentEpisodes.length }, (_, i) => ({
                number: currentEpisodes.length + i + 1,
                completed: false,
              })),
            ]
          : // 减少集数
            currentEpisodes.filter((ep) => ep.number <= newTotal)

      setEditData({
        ...updatedEditData,
        totalEpisodes: newTotal,
        episodes: newEpisodes,
      })
    }
  }

  const confirmEpisodeChange = () => {
    if (episodeChangeData) {
      updateEpisodeCount(episodeChangeData.newCount)
    }
    setShowEpisodeChangeDialog(false)
    setEpisodeChangeData(null)
  }

  const cancelEpisodeChange = () => {
    setShowEpisodeChangeDialog(false)
    setEpisodeChangeData(null)
  }

  const [isSaving, setIsSaving] = useState(false)
  
  const handleSaveEdit = async () => {
    // 防止重复点击
    if (isSaving) return
    
    setIsSaving(true)
    
    const updatedItem = {
      ...editData,
      updatedAt: new Date().toISOString(),
      // 设置手动集数标记
      manuallySetEpisodes: editData.mediaType === "tv" && editData.totalEpisodes !== item.totalEpisodes,
      // 确保每日更新设置被保存
      isDailyUpdate: editData.isDailyUpdate
    }

    try {
      // 使用增强数据提供者进行乐观更新
      await updateItem(updatedItem)
      // 同时通知父组件（保持兼容性）
      onUpdate(updatedItem)
      setEditing(false)
    } catch (error) {
      
      // 错误处理已在增强数据提供者中完成
      // 保持编辑状态，让用户可以重新尝试保存
    } finally {
      // 确保在操作完成后重置保存状态
      setIsSaving(false)
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(`${type}已复制`)
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch (error) {
      
    }
  }

  const getProgress = () => {
    if (item.mediaType === "movie") {
      return { completed: item.completed ? 1 : 0, total: 1 };
    }

    // 多季电视剧
    if (item.seasons && item.seasons.length > 0) {
      const total = item.seasons.reduce((sum, season) => sum + season.totalEpisodes, 0);
      const completed = item.seasons.reduce(
        (sum, season) => {
          // 添加安全检查确保episodes存在
          return sum + (season.episodes && season.episodes.length > 0
            ? season.episodes.filter(ep => ep.completed).length
            : 0);
        },
        0
      );
      return { completed, total };
    }

    // 单季电视剧
    const completed = item.episodes?.filter((ep) => ep.completed).length || 0;
    const total = item.totalEpisodes || 0;
    return { completed, total };
  }

  // 生成TMDB-Import命令
  const generateTmdbImportCommands = () => {
    const commands = []

    // 播出平台抓取命令
    if (item.platformUrl) {
      const platformCommand = `${pythonCmd} -m tmdb-import "${item.platformUrl}"`
      commands.push({
        type: "platform",
        title: "播出平台抓取",
        command: platformCommand,
        description: "从播出平台抓取剧集元数据",
        icon: <Link className="h-4 w-4" />,
      })
    }

    // TMDB抓取命令
    if (item.tmdbId) {
      const language = "zh-CN"
      if (item.mediaType === "tv") {
        const tmdbCommand = `${pythonCmd} -m tmdb-import "https://www.themoviedb.org/tv/${item.tmdbId}/season/${customSeasonNumber}?language=${language}"`
        commands.push({
          type: "tmdb",
          title: `上传至TMDB第${customSeasonNumber}季`,
          command: tmdbCommand,
          description: `上传数据至TMDB第${customSeasonNumber}季`,
          icon: <Terminal className="h-4 w-4" />,
        })
      } else if (item.mediaType === "movie") {
        const tmdbCommand = `${pythonCmd} -m tmdb-import "https://www.themoviedb.org/movie/${item.tmdbId}?language=${language}"`
        commands.push({
          type: "tmdb",
          title: `上传至TMDB电影`,
          command: tmdbCommand,
          description: `上传数据至TMDB电影页面`,
          icon: <Terminal className="h-4 w-4" />,
        })
      }
    }

    return commands
  }

  // 添加新季函数
  const handleAddSeason = (seasonNumber: number, episodeCount: number) => {
    if (seasonNumber < 1 || episodeCount < 1) return

    // 检查季是否已存在
    const seasonExists = localItem.seasons?.some(season =>
      season.seasonNumber === seasonNumber
    )

    if (seasonExists) {
      setCopyFeedback(`第${seasonNumber}季已存在`)
      setTimeout(() => setCopyFeedback(null), 2000)
      return
    }

    // 创建新季数据
    const newSeason = {
      seasonNumber,
      name: `第${seasonNumber}季`,
      totalEpisodes: episodeCount,
      episodes: Array.from({ length: episodeCount }, (_, i) => ({
        number: i + 1,
        completed: false,
        seasonNumber
      }))
    }

    // 更新seasons和episodes
    const updatedSeasons = [
      ...(localItem.seasons || []),
      newSeason
    ]

    // 创建所有扁平化的集数
    const updatedEpisodes = [
      ...(localItem.episodes || []),
      ...newSeason.episodes
    ]

    // 更新总集数
    const updatedTotalEpisodes = (localItem.totalEpisodes || 0) + episodeCount

    // 创建更新后的对象
    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedEpisodes,
      totalEpisodes: updatedTotalEpisodes,
      updatedAt: new Date().toISOString()
    }

    // 更新状态
    setLocalItem(updatedItem)

    // 如果在编辑模式，同时更新editData
    if (editing) {
      setEditData({
        ...editData,
        seasons: updatedSeasons,
        episodes: updatedEpisodes,
        totalEpisodes: updatedTotalEpisodes
      })
    }

    // 通知父组件
    onUpdate(updatedItem)

    // 选中新添加的季
    setSelectedSeason(seasonNumber)
    setCustomSeasonNumber(seasonNumber)

    // 显示反馈
    setCopyFeedback(`已添加第${seasonNumber}季，共${episodeCount}集`)
    setTimeout(() => setCopyFeedback(null), 2000)
  }

  const completedEpisodes = item.episodes?.filter((ep) => ep.completed).length || 0
  const progress = getProgress()

  // 获取当前季节数据
  const getCurrentSeason = () => {
    if (!localItem.seasons || !selectedSeason) return null

    return localItem.seasons.find((s) => s.seasonNumber === selectedSeason) || null
  }

  const currentSeason = getCurrentSeason()

  // 检查当前季是否全部完成
  const isSeasonCompleted = currentSeason && currentSeason.episodes && currentSeason.episodes.length > 0
    ? currentSeason.episodes.every((ep) => ep.completed)
    : false
  // 检查当前季是否有任何已完成的集数
  const hasCompletedEpisodes = currentSeason && currentSeason.episodes && currentSeason.episodes.length > 0
    ? currentSeason.episodes.some((ep) => ep.completed)
    : false

  // 处理一键全选/取消全选
  const handleBatchToggleForSeason = () => {
    if (selectedSeason) {
      // 如果全部完成，则取消全选；否则全选
      handleBatchToggle(selectedSeason, !isSeasonCompleted)
    }
  }

  // 处理重置当前季
  const handleResetSeason = () => {
    if (selectedSeason) {
      handleBatchToggle(selectedSeason, false)
    }
  }

  // 添加handleDeleteSeason函数
  const handleDeleteSeason = (seasonNumber: number) => {
    // 设置要删除的季数并显示确认对话框
    setSeasonToDelete(seasonNumber);
    setShowDeleteSeasonDialog(true);
  };

  // 添加确认删除季数的函数
  const confirmDeleteSeason = () => {
    if (seasonToDelete === null || !localItem.seasons) return;

    // 过滤掉要删除的季
    const updatedSeasons = localItem.seasons.filter(season => season.seasonNumber !== seasonToDelete);

    // 更新扁平化的episodes数组，移除该季的所有集数
    const updatedEpisodes = localItem.episodes?.filter(
      episode => !episode.seasonNumber || episode.seasonNumber !== seasonToDelete
    ) || [];

    // 重新计算总集数
    const newTotalEpisodes = updatedEpisodes.length;

    // 创建更新后的item对象
    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedEpisodes,
      totalEpisodes: newTotalEpisodes,
      updatedAt: new Date().toISOString()
    };

    // 更新localItem状态
    setLocalItem(updatedItem);

    // 同时更新editData (如果在编辑模式)
    if (editing) {
      setEditData({
        ...editData,
        seasons: updatedSeasons,
        episodes: updatedEpisodes,
        totalEpisodes: newTotalEpisodes
      });
    }

    // 通知父组件更新
    onUpdate(updatedItem);

    // 重置状态
    setSeasonToDelete(null);
    setShowDeleteSeasonDialog(false);

    // 如果删除的是当前选中的季，则重置选中的季
    if (selectedSeason === seasonToDelete) {
      // 找出新的可用季节，如果没有则设置为undefined
      const newSelectedSeason = updatedSeasons.length > 0 ? updatedSeasons[0].seasonNumber : undefined;
      setSelectedSeason(newSelectedSeason);
      setCustomSeasonNumber(newSelectedSeason || 1);
    }

    // 显示删除成功提示
    setCopyFeedback(`第${seasonToDelete}季已删除`);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // 添加从TMDB刷新季数据的函数
  const refreshSeasonFromTMDB = async () => {
    if (!editData.tmdbId) {
      setRefreshError("该词条没有关联TMDB ID");
      return;
    }

    setIsRefreshingTMDBData(true);
    setRefreshError(null);

    try {
      // 构建TMDB URL
      const tmdbUrl = `https://www.themoviedb.org/${editData.mediaType}/${editData.tmdbId}`;

      // 使用API获取最新数据，强制刷新标志
      const response = await fetch(`/api/tmdb?action=getItemFromUrl&url=${encodeURIComponent(tmdbUrl)}&forceRefresh=true`)
      const result = await response.json()
      const tmdbData = result.success ? result.data : null

      if (!tmdbData) {
        throw new Error("未能从TMDB获取到有效数据");
      }

      // 调试日志：检查刷新获取到的数据
      
      // 更新背景图
      let updatedData = { ...editData };
      let hasNewBackdrop = false;

      // 如果有背景图数据，更新背景图URL
      if (tmdbData.backdropUrl && tmdbData.backdropUrl !== updatedData.backdropUrl) {
        hasNewBackdrop = true;
        updatedData = {
          ...updatedData,
          backdropUrl: tmdbData.backdropUrl,
          backdropPath: tmdbData.backdropPath || undefined
        };

        // 预加载背景图，提高加载速度
        preloadBackdrop(tmdbData.backdropPath);
      }

      // 更新TMDB简介

      if (tmdbData.overview !== undefined) {
        updatedData = {
          ...updatedData,
          overview: tmdbData.overview === null ? undefined : tmdbData.overview
        };
      }

      // 更新TMDB标志
      let hasNewLogo = false;
      if (tmdbData.logoUrl && tmdbData.logoUrl !== updatedData.logoUrl) {
        hasNewLogo = true;
        updatedData = {
          ...updatedData,
          logoUrl: tmdbData.logoUrl
        };
      }

      // 更新网络相关信息 - 第一处添加
      if (editData.mediaType === "tv") {
        // 检查是否有网络信息
        if (tmdbData.networkId || tmdbData.networkName || tmdbData.networkLogoUrl) {
          
          updatedData = {
            ...updatedData,
            networkId: tmdbData.networkId,
            networkName: tmdbData.networkName,
            networkLogoUrl: tmdbData.networkLogoUrl,
          };
        }
      }

      // 对于电视剧，更新季数据
      if (editData.mediaType === "tv" && tmdbData.seasons) {
        // 将TMDB的季数据与现有数据合并
        const updatedSeasons = tmdbData.seasons.map((newSeason: TMDBSeasonData) => {
          // 查找是否有匹配的现有季数据
          const existingSeason = editData.seasons?.find(
            s => s.seasonNumber === newSeason.seasonNumber
          );

          if (existingSeason) {
            // 如果存在，保留完成状态，更新总集数
            return {
              ...existingSeason,
              totalEpisodes: newSeason.totalEpisodes,
              // 确保episodes数组长度匹配新的totalEpisodes
              episodes: Array.from({ length: newSeason.totalEpisodes }, (_, i) => {
                const episodeNumber = i + 1;
                // 查找现有的集数据
                const existingEpisode = existingSeason.episodes.find(ep => ep.number === episodeNumber);
                // 如果存在返回现有数据，否则创建新的
                return existingEpisode || {
                  number: episodeNumber,
                  completed: false,
                  seasonNumber: newSeason.seasonNumber
                };
              })
            };
          } else {
            // 如果是新季，创建新的季数据
            return {
              seasonNumber: newSeason.seasonNumber,
              name: newSeason.name,
              totalEpisodes: newSeason.totalEpisodes,
              episodes: Array.from({ length: newSeason.totalEpisodes }, (_, i) => ({
                number: i + 1,
                completed: false,
                seasonNumber: newSeason.seasonNumber
              }))
            };
          }
        });

        // 更新扁平化的episodes数组
        const allEpisodes = updatedSeasons.flatMap((season: Season) =>
          season.episodes.map((ep: Episode) => ({
            ...ep,
            seasonNumber: season.seasonNumber
          }))
        );

        // 更新总集数
        const newTotalEpisodes = allEpisodes.length;

        // 更新editData状态
        updatedData = {
          ...updatedData,
          seasons: updatedSeasons,
          episodes: allEpisodes,
          totalEpisodes: newTotalEpisodes
        };
      }

      // 将更新的数据应用到localItem，使背景图和其他数据立即生效
      const timestamp = Date.now(); // 添加时间戳强制重新加载图片

      // 首先确保editData中保存的是原始URL（不带时间戳）
      updatedData = {
        ...updatedData,
        backdropUrl: tmdbData.backdropUrl || updatedData.backdropUrl,
        backdropPath: tmdbData.backdropPath || updatedData.backdropPath,
        logoUrl: tmdbData.logoUrl || updatedData.logoUrl,
        networkLogoUrl: tmdbData.networkLogoUrl || updatedData.networkLogoUrl,
        networkId: tmdbData.networkId !== undefined ? tmdbData.networkId : updatedData.networkId,
        networkName: tmdbData.networkName || updatedData.networkName,
        overview: tmdbData.overview !== undefined ? (tmdbData.overview === null ? undefined : tmdbData.overview) : updatedData.overview
      };

      // 更新状态 - 现在updatedData包含了完整的更新数据
      setEditData(updatedData);

      // 然后在localItem中使用带时间戳的URL用于立即显示
      const newLocalItem = {
        ...localItem,
        backdropUrl: tmdbData.backdropUrl ? `${tmdbData.backdropUrl}?t=${timestamp}` : localItem.backdropUrl,
        backdropPath: tmdbData.backdropPath || localItem.backdropPath,
        logoUrl: tmdbData.logoUrl ? `${tmdbData.logoUrl}?t=${timestamp}` : localItem.logoUrl,
        networkLogoUrl: tmdbData.networkLogoUrl ? `${tmdbData.networkLogoUrl}?t=${timestamp}` : localItem.networkLogoUrl,
        networkId: tmdbData.networkId !== undefined ? tmdbData.networkId : localItem.networkId,
        networkName: tmdbData.networkName || localItem.networkName,
        overview: tmdbData.overview !== undefined ? (tmdbData.overview === null ? undefined : tmdbData.overview) : localItem.overview
      };

      // 如果是电视剧且有季数据更新，也更新这部分
      if (editData.mediaType === "tv" && updatedData.seasons) {
        newLocalItem.seasons = updatedData.seasons;
        newLocalItem.episodes = updatedData.episodes;
        newLocalItem.totalEpisodes = updatedData.totalEpisodes;
      }

      setLocalItem(newLocalItem);

      // 通知父组件更新 - 使用updatedData确保保存的是原始URL（不带时间戳）
      onUpdate(updatedData);

      // 显示成功信息
      if (hasNewBackdrop) {
        if (editData.mediaType === "tv") {
          setCopyFeedback("TMDB数据、背景图、标志、网络logo和简介已成功刷新");
        } else {
          setCopyFeedback("TMDB数据、背景图、标志和简介已成功刷新");
        }
      } else {
        if (editData.mediaType === "tv") {
          setCopyFeedback("TMDB数据、标志、网络logo和简介已成功刷新");
        } else {
          setCopyFeedback("TMDB数据、标志和简介已成功刷新");
        }
      }

      setTimeout(() => setCopyFeedback(null), 2000);

    } catch (error) {
      
      setRefreshError(error instanceof Error ? error.message : "刷新TMDB数据失败，请稍后再试");
    } finally {
      setIsRefreshingTMDBData(false);
    }
  };

  // 处理季数调整
  const handleSeasonAdjust = (newSeason: number) => {
    // 确保季数在有效范围内
    const adjustedSeason = Math.max(1, Math.min(20, newSeason))
    setCustomSeasonNumber(adjustedSeason)
    // 显示反馈信息
    setCopyFeedback(`已切换到第 ${adjustedSeason} 季`)
    setTimeout(() => setCopyFeedback(null), 1500)
  }

  // 获取播出时间 - 添加与词条卡片一致的转换逻辑
  const getAirTime = (weekday: number) => {
    const airTime = item.airTime || "18:00"
    // 将原始weekday（0-6，0是周日）转换为我们的数组索引（0-6，0是周一，6是周日）
    const adjustedWeekday = weekday === 0 ? 6 : weekday - 1
    return `${WEEKDAYS[adjustedWeekday]} ${airTime}`
  }

  // 添加新函数：将数组索引转回原始weekday格式
  const getOriginalWeekday = (arrayIndex: number) => {
    // 将数组索引（0-6，0是周一）转换回原始weekday格式（0-6，0是周日）
    return arrayIndex === 6 ? 0 : arrayIndex + 1
  }

  // 判断是否每日更新
  const isDailyUpdate = localItem.isDailyUpdate === true ||
    (localItem.isDailyUpdate === undefined && (localItem.category === "tv" || localItem.category === "short"));

  // 优化预加载背景图的函数 - 只预加载最需要的尺寸
  const preloadBackdrop = (backdropPath: string | null | undefined) => {
    if (!backdropPath) return;

    // 只预加载当前设备最可能需要的尺寸
    // 根据屏幕尺寸选择合适的图片大小
    const isHighDensity = window.devicePixelRatio > 1;
    const screenWidth = window.screen.width;
    let optimalSize = 'w780'; // 默认尺寸

    if (screenWidth > 1920 || isHighDensity) {
      optimalSize = 'w1280';
    }

    const img = new Image();
    img.src = `https://image.tmdb.org/t/p/${optimalSize}${backdropPath}`;
  };

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
          container={displayMode === 'inline' ? (getInlineContainer() ?? undefined) : undefined}
          position={displayMode === 'inline' ? 'absolute' : 'fixed'}
        >

          {/* 背景图 - 使用BackgroundImage组件，支持缓存避免重复加载 */}
          {(() => {
            const backgroundImageUrl = localItem.backdropUrl || localItem.posterUrl;
            const isUsingPoster = !localItem.backdropUrl && localItem.posterUrl;

            // 调试日志：显示背景图使用情况（只在首次加载时输出）
            if (backgroundImageUrl && typeof window !== 'undefined') {
              // 使用localItem.id作为唯一标识符
              const logKey = `bg-image-logged-${localItem.id}`
              if (!sessionStorage.getItem(logKey)) {
                console.log("🖼️ [词条详情] 背景图信息:", {
                  title: localItem.title,
                  hasBackdrop: !!localItem.backdropUrl,
                  hasPoster: !!localItem.posterUrl,
                  isUsingPoster,
                  backgroundImageUrl: backgroundImageUrl.substring(0, 50) + "..."
                });
                sessionStorage.setItem(logKey, 'true')
              }
            }

            return backgroundImageUrl ? (
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
                overlayClassName={cn(
                  isUsingPoster
                    ? "bg-gradient-to-b from-background/50 via-background/45 to-background/55" // 海报背景使用更强遮罩
                    : "bg-gradient-to-b from-background/30 via-background/25 to-background/35"  // 正常背景图遮罩
                )}
              />
            ) : null;
          })()}

          {/* 内容层 - 添加相对定位和z-index确保内容在背景图上方 */}
          <div className="relative z-10 h-full flex flex-col overflow-hidden overscroll-none" ref={contentRef}>
          <DialogHeader className="p-6 pb-2 flex flex-row items-start justify-between">
            <div className="flex-1 pr-4">

              <DialogTitle className="text-xl flex items-center">
                {isMarkingEpisode && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {localItem.mediaType === "movie" ? (
                  <Film className="mr-2 h-5 w-5" />
                ) : (
                  <Tv className="mr-2 h-5 w-5" />
                )}
                {/* 使用TMDB标志替代文字标题 */}
                {localItem.logoUrl ? (
                  <div className="h-10 max-w-[200px] flex items-center">
                    <CachedImage
                      src={localItem.logoUrl}
                      alt={localItem.title}
                      className="max-h-full object-contain"
                      loading="eager"
                      decoding="async"
                      onError={(e) => {
                        // 如果标志加载失败，显示文字标题
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
                {/* 添加第二播出日标签 */}
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

          {/* 新的网格布局 */}
          <div className="p-6 pt-0 grid grid-cols-4 gap-6 flex-1 overflow-hidden min-h-0">
            {/* 左侧：海报区域 */}
            <div className="col-span-1 max-w-full overflow-hidden flex flex-col min-h-0">
              {/* 使用统一的容器结构避免切换时的闪烁 */}
              <div className="flex-1 flex flex-col pr-2 min-h-0">
                {/* 海报区域 - 使用固定高度比例 */}
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

                {/* 条目信息区域 - 根据编辑状态显示不同内容 */}
                {editing ? (
                  // 编辑模式下的表单区域 - 添加圆角和固定容器
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

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <Label htmlFor="edit-category" className="text-xs text-muted-foreground">分类</Label>
                            <Select
                              value={editData.category || "none"}
                              onValueChange={(value) => setEditData({...editData, category: value === "none" ? undefined : value as CategoryType})}
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
                              value={editData.status || "ongoing"}
                              onValueChange={(value) => setEditData({...editData, status: value as "ongoing" | "completed"})}
                            >
                              <SelectTrigger className="w-full h-8">
                                <SelectValue placeholder="选择状态" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ongoing">连载中</SelectItem>
                                <SelectItem value="completed">已完结</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-0.5 mt-0.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="edit-daily-update" className="flex items-center cursor-pointer text-xs text-muted-foreground">
                              <Zap className="h-3.5 w-3.5 mr-1" />
                              每日更新
                            </Label>
                            <Checkbox
                              id="edit-daily-update"
                              checked={editData.isDailyUpdate === true}
                              onCheckedChange={(checked) =>
                                setEditData({...editData, isDailyUpdate: checked === true})
                              }
                            />
                          </div>
                        </div>

                        {/* 添加播出平台URL输入字段 */}
                        <div className="space-y-0.5 mt-1">
                          <Label htmlFor="edit-platform-url" className="flex items-center text-xs text-muted-foreground">
                            <Link2 className="h-3.5 w-3.5 mr-1" />
                            播出平台URL
                          </Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="edit-platform-url"
                              value={editData.platformUrl || ""}
                              onChange={(e) => setEditData({...editData, platformUrl: e.target.value})}
                              placeholder="https://www.example.com/watch/..."
                              className="flex-1 h-8"
                            />
                            {editData.platformUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(editData.platformUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {editData.platformUrl && (
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center">
                              <div className="w-4 h-4 mr-1 flex-shrink-0">
                                {(() => {
                                  const platformInfo = getPlatformInfo(editData.platformUrl);
                                  return platformInfo ?
                                    <PlatformLogo platform={platformInfo.name} size={16} /> :
                                    <FrameIcon className="w-4 h-4" />;
                                })()}
                              </div>
                              {(() => {
                                const platformInfo = getPlatformInfo(editData.platformUrl);
                                return platformInfo?.name || '识别为外部链接';
                              })()}
                            </div>
                          )}
                        </div>

                        {/* 添加简介编辑区域 */}
                        <div className="space-y-0.5 flex-grow mt-1">
                          <Label htmlFor="edit-overview" className="flex items-center text-xs text-muted-foreground">
                            <Info className="h-3.5 w-3.5 mr-1" />
                            简介
                          </Label>
                          <div className="bg-background/20 rounded-lg overflow-hidden flex-grow h-full min-h-[120px] shadow-sm">
                            <ScrollArea className="h-full">
                              <div className="p-1">
                                <textarea
                                  id="edit-overview"
                                  value={editData.overview || ""}
                                  onChange={(e) => setEditData({...editData, overview: e.target.value})}
                                  placeholder="输入简介内容..."
                                  className="w-full h-full min-h-[110px] resize-none bg-transparent border-0 text-sm focus:ring-0 focus:outline-none p-1.5"
                                />
                              </div>
                            </ScrollArea>
                          </div>
                        </div>

                        {/* 添加剧集设置区域 */}
                        <div className="space-y-1 mt-4 pt-1 border-t border-border/30">
                          <h3 className="text-xs font-medium flex items-center pb-1 text-muted-foreground">
                            <Tv className="h-3.5 w-3.5 mr-1" />
                            剧集设置
                          </h3>

                          {/* 播出时间设置 */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <Label htmlFor="edit-weekday" className="flex items-center text-xs text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                播出日
                              </Label>
                              <Select
                                  value={editData.weekday?.toString() || "1"}
                                  onValueChange={(value) => setEditData({...editData, weekday: parseInt(value)})}
                                >
                                  <SelectTrigger className="w-full h-7 text-xs">
                                    <SelectValue placeholder="选择播出日" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">周日</SelectItem>
                                    <SelectItem value="1">周一</SelectItem>
                                    <SelectItem value="2">周二</SelectItem>
                                    <SelectItem value="3">周三</SelectItem>
                                    <SelectItem value="4">周四</SelectItem>
                                    <SelectItem value="5">周五</SelectItem>
                                    <SelectItem value="6">周六</SelectItem>
                                  </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-0.5">
                              <Label htmlFor="edit-air-time" className="flex items-center text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                播出时间
                              </Label>
                              <Input
                                id="edit-air-time"
                                value={editData.airTime || ""}
                                onChange={(e) => setEditData({...editData, airTime: e.target.value})}
                                placeholder="例如: 23:00"
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>

                          {/* 第二播出日设置 */}
                          <div className="space-y-0.5 mt-2">
                            <Label htmlFor="edit-second-weekday" className="flex items-center text-xs text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5 mr-1" />
                              第二播出日 <span className="text-xs text-muted-foreground ml-1">(可选)</span>
                            </Label>
                            <Select
                              value={editData.secondWeekday !== undefined ?
                                editData.secondWeekday.toString() :
                                "none"
                              }
                              onValueChange={(value) => setEditData({
                                ...editData,
                                secondWeekday: value === "none" ? undefined : parseInt(value)
                              })}
                            >
                              <SelectTrigger className="w-full h-7 text-xs">
                                <SelectValue placeholder="选择第二播出日" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">无第二播出日</SelectItem>
                                <SelectItem value="0">周日</SelectItem>
                                <SelectItem value="1">周一</SelectItem>
                                <SelectItem value="2">周二</SelectItem>
                                <SelectItem value="3">周三</SelectItem>
                                <SelectItem value="4">周四</SelectItem>
                                <SelectItem value="5">周五</SelectItem>
                                <SelectItem value="6">周六</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* TMDB URL设置 */}
                          <div className="space-y-1">
                            <Label htmlFor="edit-tmdb-url" className="flex items-center text-xs text-muted-foreground">
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              TMDB URL
                            </Label>
                            <Input
                              id="edit-tmdb-url"
                              value={editData.tmdbUrl || ""}
                              onChange={(e) => setEditData({...editData, tmdbUrl: e.target.value})}
                              placeholder="TMDB链接"
                              className="h-7 text-xs"
                            />
                          </div>

                          {/* 刷新TMDB数据按钮 */}
                          {editData.tmdbId && (
                            <div className="mt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-7 text-xs"
                                onClick={refreshSeasonFromTMDB}
                                disabled={isRefreshingTMDBData || !editData.tmdbId}
                              >
                                {isRefreshingTMDBData ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                )}
                                刷新TMDB数据
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* 仅显示创建和更新时间信息 */}
                        <div className="mt-3 pt-1 border-t border-border/30">
                          {/* 创建和更新时间 */}
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="space-y-1">
                              <Label className="flex items-center text-xs text-muted-foreground">
                                <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                                创建时间
                              </Label>
                              <div className="h-8 text-xs flex items-center px-3 bg-background/20 rounded-md">
                                {new Date(editData.createdAt).toLocaleString()}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="flex items-center text-xs text-muted-foreground">
                                <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                                更新时间
                              </Label>
                              <div className="h-8 text-xs flex items-center px-3 bg-background/20 rounded-md">
                                {new Date(editData.updatedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  // 查看模式下的功能区 - 保持相同的容器高度避免闪烁
                  <div className="w-full rounded-lg backdrop-blur-md bg-background/30 p-3 flex-1 overflow-hidden transition-all duration-300 hover:shadow-lg">
                    <ScrollArea className="h-full">
                      <div className="space-y-1 pr-2">
                        {/* 播出平台区域 - 优先使用TMDB网络logo */}
                        <div className="pb-0.5 mb-0.5">
                          <h3 className="text-sm font-medium flex items-center">
                            <Link2 className="h-3.5 w-3.5 mr-1.5" />
                            播出平台
                          </h3>
                        </div>
                        <div className="flex items-center justify-start mb-1">
                          {/* 平台Logo区域 - 优先使用TMDB网络logo */}
                          <div className="flex items-center justify-start w-full">
                            {(() => {
                              // 调试日志：检查网络logo数据
                              
                              return localItem.networkLogoUrl;
                            })() ? (
                              // 显示TMDB官方网络logo
                              <div
                                className="w-full h-12 flex items-center justify-start cursor-pointer"
                                onClick={() => localItem.platformUrl && window.open(localItem.platformUrl, '_blank')}
                                title={localItem.networkName || '播出网络'}
                              >
                                <CachedImage
                                  src={localItem.networkLogoUrl}
                                  alt={localItem.networkName || '播出网络'}
                                  className="max-w-full max-h-full object-contain hover:scale-110 transition-all duration-300"
                                  loading="eager"
                                  decoding="async"
                                  onError={(e) => {
                                    // 如果官方logo加载失败，隐藏图片元素
                                    e.currentTarget.style.display = 'none';
                                    // 显示备用元素
                                    const container = e.currentTarget.parentElement;
                                    if (container) {
                                      const networkIcon = document.createElement('div');
                                      networkIcon.innerHTML = `<div class="flex items-center justify-center w-full h-full"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" class="text-foreground/70"><path d="M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z"></path><path d="M3.6 8.25h16.8M3.6 15.75h16.8M12 3.6v16.8"></path></svg></div>`;
                                      container.appendChild(networkIcon);
                                    }
                                  }}
                                />
                              </div>
                            ) : localItem.platformUrl ? (
                              // 回退到基于URL的平台识别
                              (() => {
                                const platformInfo = getPlatformInfo(localItem.platformUrl);
                                return (
                                  <div
                                    className="w-full h-12 flex items-center justify-start cursor-pointer"
                                    onClick={() => platformInfo && window.open(platformInfo.url, '_blank')}
                                    title={platformInfo?.name || '播出平台'}
                                  >
                                    {platformInfo ? (
                                      <PlatformLogo
                                        platform={platformInfo.name}
                                        size={32}
                                        className="hover:scale-110 transition-transform duration-300"
                                      />
                                    ) : (
                                      <ExternalLink className="h-9 w-9 text-foreground/70" />
                                    )}
                                  </div>
                                )
                              })()
                            ) : (
                              // 未设置平台URL时的显示
                              <div className="w-full h-12 flex items-center justify-start">
                                <FrameIcon className="h-8 w-8 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* TMDB简介区域 */}
                        <div className="pb-0.5 mb-1 mt-3">
                          <h3 className="text-sm font-medium flex items-center">
                            <Info className="h-3.5 w-3.5 mr-1.5" />
                            简介
                          </h3>
                        </div>
                        <div className="bg-background/20 rounded-lg overflow-hidden h-[110px] mb-2 shadow-sm transition-all duration-300 hover:shadow-md">
                          <ScrollArea className="h-full">
                            <div className="p-3 text-sm">
                              {localItem.overview ? (
                                <p className="text-sm break-words">{localItem.overview}</p>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">暂无简介信息</span>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
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
                  <ScrollArea className="h-full">
                    <div className="space-y-6 pr-2">
                      {/* 剧集内容 */}
                      {localItem.mediaType === "movie" ? (
                        <>
                          <Card variant="frosted">
                            <CardHeader>
                              <CardTitle className="text-base flex items-center">
                                <Clapperboard className="h-4 w-4 mr-2" />
                                观看状态
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Button
                                variant={localItem.completed ? "default" : "outline"}
                                className="w-full"
                                onClick={() => handleMovieToggle(!localItem.completed)}
                              >
                                {localItem.completed ? (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    已观看
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    标记为已观看
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>

                          {/* 为电影添加TMDB刷新按钮 */}
                          <Card variant="frosted">
                            <CardHeader>
                              <CardTitle className="text-base flex items-center">
                                <Settings className="h-4 w-4 mr-2" />
                                TMDB数据
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={refreshSeasonFromTMDB}
                                  disabled={isRefreshingTMDBData || !editData.tmdbId}
                                  title="刷新TMDB数据、背景图、标志、网络logo和简介"
                                  className="w-full"
                                >
                                  {isRefreshingTMDBData ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                  )}
                                  刷新TMDB数据、标志、网络logo和简介
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      ) : (
                        <>
                          {/* 季数选择器 */}
                          {localItem.seasons && localItem.seasons.length > 0 && (
                            <Card variant="frosted">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center">
                                  <Tv className="h-4 w-4 mr-2" />
                                  选择季
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {localItem.seasons && localItem.seasons.length > 0 && localItem.seasons.map((season) => (
                                      <Button
                                        key={season.seasonNumber}
                                        variant={selectedSeason === season.seasonNumber ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleSeasonClick(season.seasonNumber)}
                                      >
                                          第{season.seasonNumber}季
                                          {season.episodes && (
                                            <span className="ml-1 text-xs">
                                          ({season.episodes.filter(ep => ep.completed).length}/{season.episodes.length})
                                            </span>
                                          )}
                                      </Button>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* 季数操作 */}
                          {selectedSeason !== undefined && (
                            <Card variant="frosted">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center">
                                  <Settings className="h-4 w-4 mr-2" />
                                  季操作
                                  {currentSeason && (
                                    <Badge variant="outline" className="ml-2">
                                      进度: {currentSeason.episodes && currentSeason.episodes.length > 0
  ? currentSeason.episodes.filter(ep => ep.completed).length
  : 0}/{currentSeason.episodes && currentSeason.episodes.length || 0}
                                    </Badge>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleBatchToggleForSeason}
                                    title="全选/全不选"
                                  >
                                    <CheckSquare className="h-4 w-4 mr-2" />
                                    全选/全不选
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResetSeason}
                                    title="重置季"
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    重置
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteSeason(selectedSeason)}
                                    title="删除季"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    删除季
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={refreshSeasonFromTMDB}
                                    disabled={isRefreshingTMDBData || !editData.tmdbId}
                                    title="刷新TMDB数据、背景图、标志、网络logo和简介"
                                    className="w-full"
                                  >
                                    {isRefreshingTMDBData ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                    )}
                                    刷新TMDB数据、标志、网络logo和简介
                                  </Button>

                                  {/* 只在编辑模式下显示添加新季区域 */}
                                  {editing && (
                                    <div className="w-full mt-3 border-t pt-3 border-border/30">
                                      <div className="text-sm mb-2 flex items-center">
                                        <PlusCircle className="h-4 w-4 mr-1.5" />
                                        添加新季
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center space-x-2">
                                          <div className="text-xs text-muted-foreground">季数:</div>
                                          <Input
                                            type="number"
                                            min="1"
                                            className="h-7 w-16 text-xs px-2"
                                            value={customSeasonNumber}
                                            onChange={(e) => setCustomSeasonNumber(parseInt(e.target.value, 10) || 1)}
                                          />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <div className="text-xs text-muted-foreground">集数:</div>
                                          <Input
                                            type="number"
                                            min="1"
                                            className="h-7 w-16 text-xs px-2"
                                            defaultValue="20"
                                            id="new-season-episodes"
                                          />
                                        </div>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => {
                                            const episodeInput = document.getElementById("new-season-episodes") as HTMLInputElement;
                                            const episodeCount = parseInt(episodeInput.value, 10) || 20;
                                            handleAddSeason(customSeasonNumber, episodeCount);
                                          }}
                                          className="h-7"
                                        >
                                          <Plus className="h-4 w-4 mr-1" />
                                          添加
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* 显示刷新错误 */}
                          {refreshError && (
                            <div className="bg-red-500/20 backdrop-blur-md text-red-200 p-3 rounded-md mb-4 flex items-center border-none shadow-sm">
                              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{refreshError}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto h-6 px-2 text-red-200 hover:text-red-100 hover:bg-red-500/30"
                                onClick={() => setRefreshError(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {/* 剧集列表 */}
                          {localItem.mediaType === "tv" && (
                            <Card variant="frosted">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center justify-between">
                                  <div className="flex items-center">
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    剧集列表
                                    {!selectedSeason && <span className="text-xs text-muted-foreground ml-2">(请先选择或添加季)</span>}
                                  </div>
                                  {/* 只在编辑模式下显示自定义集数编辑功能，且必须有选中的季 */}
                                  {editing && currentSeason && (
                                    <div className="flex items-center space-x-2">
                                      <div className="text-xs text-muted-foreground mr-1">集数:</div>
                                      <Input
                                        type="number"
                                        min="1"
                                        className="h-6 w-16 text-xs px-2"
                                        value={currentSeason?.totalEpisodes || 0}
                                        onChange={(e) => handleTotalEpisodesChange(parseInt(e.target.value, 10) || 0)}
                                        title="自定义集数数量"
                                      />
                                    </div>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {selectedSeason ? (
                                  <>
                                    {/* 批量操作说明 */}
                                    <div className="mb-2 text-xs text-muted-foreground">
                                      提示: 按住Shift键点击首尾集数可批量选择
                                    </div>

                                    

                                    {/* 剧集网格 */}
                                    {currentSeason && currentSeason.episodes && currentSeason.episodes.length > 0 ? (
                                      <div className="grid grid-cols-10 gap-2">
                                        {currentSeason.episodes.map((episode) => (
                                          <EpisodeCheckbox
                                            key={episode.number}
                                            id={`episode-${episode.number}-${selectedSeason}`}
                                            checked={episode.completed}
                                            disabled={false} // 不再禁用，因为操作很快
                                            onCheckedChange={(checked) => {
                                              // 确保checked是布尔值
                                              const isChecked = checked === true;
                                              handleEpisodeToggle(episode.number, isChecked, selectedSeason);
                                            }}
                                            onClick={() => setLastClickedEpisode(episode.number)}
                                            label={`${episode.number}`}
                                            className={[
                                              highlightedEpisode === episode.number ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                                            ].join(" ").trim()}
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center p-4 text-muted-foreground">
                                        <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                        <p>该季暂无集数数据</p>
                                        <p className="text-xs mt-1">请在编辑模式下添加集数</p>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-center p-6 text-muted-foreground">
                                    <Tv className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                    <p className="text-lg font-medium">请选择或添加季</p>
                                    <p className="text-sm mt-1 max-w-md mx-auto">使用上方"选择季"面板选择一个季，或在编辑模式下添加新的季</p>
                                    {editing && (
                                      <div className="flex flex-col items-center space-y-3 mt-4">
                                        <div className="flex items-center space-x-3">
                                          <div className="flex items-center">
                                            <div className="text-xs text-muted-foreground mr-1">季数:</div>
                                            <Input
                                              type="number"
                                              min="1"
                                              className="h-7 w-16 text-xs px-2"
                                              value={customSeasonNumber}
                                              onChange={(e) => setCustomSeasonNumber(parseInt(e.target.value, 10) || 1)}
                                            />
                                          </div>
                                          <div className="flex items-center">
                                            <div className="text-xs text-muted-foreground mr-1">集数:</div>
                                            <Input
                                              type="number"
                                              min="1"
                                              className="h-7 w-16 text-xs px-2"
                                              defaultValue="20"
                                              id="new-season-episodes"
                                            />
                                          </div>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const episodeInput = document.getElementById("new-season-episodes") as HTMLInputElement;
                                            const episodeCount = parseInt(episodeInput.value, 10) || 20;
                                            handleAddSeason(customSeasonNumber, episodeCount);
                                          }}
                                        >
                                          <PlusCircle className="h-4 w-4 mr-1" />
                                          添加季
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </>
                      )}

                      {/* 状态信息卡片已移除 */}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* 集成工具标签内容 */}
                <TabsContent value="integration" className="transition-opacity duration-300 ease-in-out flex-1 min-h-0">
                  <div className="pr-2 w-full h-full overflow-hidden min-w-0 max-w-full">
                    <TMDBImportIntegrationDialog
                      open={true}
                      onOpenChange={() => {}}
                      item={localItem}
                      onItemUpdate={(updatedItem) => {
                        setLocalItem(updatedItem)
                        onUpdate(updatedItem)
                      }}
                      inTab={true}
                    />
                  </div>
                </TabsContent>
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
          <AlertDialog open={showEpisodeChangeDialog} onOpenChange={setShowEpisodeChangeDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                    <AlertDialogTitle>确认修改集数</AlertDialogTitle>
                    <AlertDialogDescription>
                      {episodeChangeData?.action === "increase"
                        ? `确定要将集数从 ${episodeChangeData?.oldCount} 增加到 ${episodeChangeData?.newCount} 吗？`
                        : `确定要将集数从 ${episodeChangeData?.oldCount} 减少到 ${episodeChangeData?.newCount} 吗？`}
                      {episodeChangeData?.action === "decrease" && (
                        <div className="mt-2 text-red-500">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          警告：这将删除多余的集数及其完成状态！
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={cancelEpisodeChange}>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmEpisodeChange}>确认</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialogNoOverlay open={showDeleteSeasonDialog} onOpenChange={setShowDeleteSeasonDialog}>
            <AlertDialogNoOverlayContent>
              <AlertDialogHeader>
                    <AlertDialogTitle>确认删除季</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定要删除第 {seasonToDelete} 季吗？此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowDeleteSeasonDialog(false)}>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteSeason}>确认</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogNoOverlayContent>
          </AlertDialogNoOverlay>

          <AlertDialogNoOverlay open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogNoOverlayContent>
              <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定要删除 "{localItem.title}" 吗？此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>取消</AlertDialogCancel>
                <AlertDialogAction
                      onClick={() => {
                        setShowDeleteDialog(false)
                        onOpenChange(false)
                        onDelete(localItem.id)
                      }}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogNoOverlayContent>
          </AlertDialogNoOverlay>

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
