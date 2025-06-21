"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox, EpisodeCheckbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
} from "lucide-react"
import type { TMDBItem, Season, Episode } from "@/lib/storage"
import { useMobile } from "@/hooks/use-mobile"
import TMDBImportIntegrationDialog from "@/components/tmdb-import-integration-dialog"
import ScheduledTaskDialog from "@/components/scheduled-task-dialog"
import { TMDBService, TMDBSeasonData } from "@/lib/tmdb"
import FixTMDBImportBugDialog from "@/components/fix-tmdb-import-bug-dialog"
import { toast } from "@/components/ui/use-toast"
import { StorageManager } from "@/lib/storage"

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

// 定义分类列表
const CATEGORIES = [
  { id: "anime", name: "动漫", icon: <Sparkles className="h-4 w-4 mr-2" strokeWidth={2} /> },
  { id: "tv", name: "电视剧", icon: <Tv className="h-4 w-4 mr-2" strokeWidth={2} /> },
  { id: "kids", name: "少儿", icon: <Baby className="h-4 w-4 mr-2" strokeWidth={2} /> },
  { id: "variety", name: "综艺", icon: <Popcorn className="h-4 w-4 mr-2" strokeWidth={2} /> },
  { id: "short", name: "短剧", icon: <Ticket className="h-4 w-4 mr-2" strokeWidth={2} /> },
  { id: "movie", name: "电影", icon: <Clapperboard className="h-4 w-4 mr-2" strokeWidth={2} /> },
]

type CategoryType = "anime" | "tv" | "kids" | "variety" | "short" | "movie";

interface ItemDetailDialogProps {
  item: TMDBItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (item: TMDBItem) => void
  onDelete: (id: string) => void
}

export default function ItemDetailDialog({ item, open, onOpenChange, onUpdate, onDelete }: ItemDetailDialogProps) {
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
  const isMobile = useMobile()
  const [customSeasonNumber, setCustomSeasonNumber] = useState(1)
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [scheduledTaskDialogOpen, setScheduledTaskDialogOpen] = useState(false)
  const [showFixBugDialog, setShowFixBugDialog] = useState(false)
  const [tmdbCommands, setTmdbCommands] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("episodes")
  const [detailTab, setDetailTab] = useState("details")

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
        console.error("获取最大季数失败:", error)
        setSelectedSeason(1)
        setCustomSeasonNumber(1)
      }
    } else if (item.mediaType === "tv") {
      // 如果是电视剧但没有seasons属性（单季剧），默认设置为1
      setSelectedSeason(1)
      setCustomSeasonNumber(1)
    }
  }, [item])

  // 监听季数变化，更新TMDB命令
  useEffect(() => {
    setTmdbCommands(generateTmdbImportCommands())
  }, [customSeasonNumber])

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  const handleEpisodeToggle = (episodeNumber: number, completed: boolean, seasonNumber: number) => {
    // 添加视觉反馈
    if (completed) {
      setCopyFeedback(`第${episodeNumber}集已标记为完成`)
    } else {
      setCopyFeedback(`第${episodeNumber}集已标记为未完成`)
    }
    setTimeout(() => setCopyFeedback(null), 1500)

    // 立即更新状态，不添加延迟
    let updatedItem = { ...localItem } // 使用本地状态作为基础

    if (updatedItem.seasons && seasonNumber) {
      // 多季模式
      const updatedSeasons = updatedItem.seasons.map((season) => {
        if (season.seasonNumber === seasonNumber) {
          let updatedEpisodes = [...season.episodes]

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
    
    // 更新本地状态
    setLastClickedEpisode(episodeNumber)
    
    // 再通知父组件更新
    onUpdate(updatedItem)
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

  const handleSaveEdit = () => {
    const updatedItem = {
      ...editData,
      updatedAt: new Date().toISOString(),
      // 设置手动集数标记
      manuallySetEpisodes: editData.mediaType === "tv" && editData.totalEpisodes !== item.totalEpisodes,
      // 确保每日更新设置被保存
      isDailyUpdate: editData.isDailyUpdate
    }
    onUpdate(updatedItem)
    setEditing(false)
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(`${type}已复制`)
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch (error) {
      console.error("复制失败:", error)
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
      const platformCommand = `python -m tmdb-import "${item.platformUrl}"`
      commands.push({
        type: "platform",
        title: "播出平台抓取",
        command: platformCommand,
        description: "从播出平台抓取剧集元数据",
        icon: <Link className="h-4 w-4" />,
      })
    }

    // TMDB抓取命令
    if (item.tmdbId && item.mediaType === "tv") {
      const language = "zh-CN"
      const tmdbCommand = `python -m tmdb-import "https://www.themoviedb.org/tv/${item.tmdbId}/season/${customSeasonNumber}?language=${language}"`
      commands.push({
        type: "tmdb",
        title: `上传至TMDB第${customSeasonNumber}季`,
        command: tmdbCommand,
        description: `上传数据至TMDB第${customSeasonNumber}季`,
        icon: <Terminal className="h-4 w-4" />,
      })
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
    if (!editData.tmdbId || editData.mediaType !== "tv") {
      setRefreshError("只有电视剧类型的词条可以刷新TMDB数据");
      return;
    }
    
    setIsRefreshingTMDBData(true);
    setRefreshError(null);
    
    try {
      // 构建TMDB URL
      const tmdbUrl = `https://www.themoviedb.org/tv/${editData.tmdbId}`;
      
      // 使用TMDBService获取最新数据
      const tmdbData = await TMDBService.getItemFromUrl(tmdbUrl);
      
      if (!tmdbData || !tmdbData.seasons) {
        throw new Error("未能从TMDB获取到有效的季数据");
      }
      
      // 将TMDB的季数数据与现有数据合并
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
                completed: false
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
              completed: false
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
      setEditData(prev => ({
        ...prev,
        seasons: updatedSeasons,
        episodes: allEpisodes,
        totalEpisodes: newTotalEpisodes
      }));
      
      // 设置成功提示
      setCopyFeedback("TMDB季数据已成功刷新");
      setTimeout(() => setCopyFeedback(null), 2000);
      
    } catch (error) {
      console.error("刷新TMDB数据失败:", error);
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
    const airTime = item.airTime || "19:00"
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
    (localItem.isDailyUpdate === undefined && (localItem.category === "tv" || localItem.category === "short"))

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-2 flex flex-row items-start justify-between">
            <div className="flex-1 pr-4">
              <DialogTitle className="text-xl flex items-center">
                {localItem.mediaType === "movie" ? (
                  <Film className="mr-2 h-5 w-5" />
                ) : (
                  <Tv className="mr-2 h-5 w-5" />
                )}
                {localItem.title}
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
            
            <div className="flex items-center space-x-2 pr-10">
              {localItem.tmdbUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
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
                  className="h-8 w-8"
                  title="编辑"
                  onClick={() => setEditing(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="保存"
                  onClick={handleSaveEdit}
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                title="删除"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* 新的网格布局 */}
          <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* 左侧：海报区域 */}
            <div className="md:col-span-1">
              <div className="border rounded-md overflow-hidden aspect-[2/3] bg-muted flex items-center justify-center w-full">
                {localItem.posterUrl ? (
                  <img 
                    src={localItem.posterUrl} 
                    alt={localItem.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Tv className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">海报</p>
                  </div>
                )}
              </div>
              
              {/* 基本信息 - 移动到海报下方并对齐海报宽度 */}
              <div className="mt-2 w-full">
                <div className="border-b pb-1 mb-2">
                  <h3 className="text-sm font-medium flex items-center">
                    <Info className="h-3.5 w-3.5 mr-1.5" />
                    基本信息
                  </h3>
                </div>
                <div className="space-y-1.5 text-sm">
                  {editing ? (
                    // 编辑模式下的表单
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="edit-title">标题</Label>
                        <Input 
                          id="edit-title" 
                          value={editData.title} 
                          onChange={(e) => setEditData({...editData, title: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label htmlFor="edit-category">分类</Label>
                        <Select 
                          value={editData.category || ""} 
                          onValueChange={(value) => setEditData({...editData, category: value as CategoryType})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择分类" />
                          </SelectTrigger>
                          <SelectContent>
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
                      
                      <div className="space-y-1">
                        <Label htmlFor="edit-weekday">更新时间</Label>
                        <div className="flex gap-2">
                          <Select 
                            value={(editData.weekday === 0 ? 6 : editData.weekday - 1).toString()} 
                            onValueChange={(value) => setEditData({...editData, weekday: getOriginalWeekday(parseInt(value))})}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="选择星期" />
                            </SelectTrigger>
                            <SelectContent>
                              {WEEKDAYS.map((day, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Input 
                            id="edit-airtime"
                            placeholder="时间 (如 20:00)"
                            value={editData.airTime || ""}
                            onChange={(e) => setEditData({...editData, airTime: e.target.value})}
                            className="w-full"
                          />
                        </div>
                      </div>
                      
                      {/* 添加第二播出日设置 */}
                      <div className="space-y-1">
                        <Label htmlFor="edit-second-weekday" className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1.5" />
                          第二播出日 (可选)
                        </Label>
                        <div className="flex gap-2">
                          <Select 
                            value={editData.secondWeekday !== undefined ? 
                              (editData.secondWeekday === 0 ? 6 : editData.secondWeekday - 1).toString() : 
                              "none"}
                            onValueChange={(value) => 
                              setEditData({
                                ...editData, 
                                secondWeekday: value === "none" ? undefined : getOriginalWeekday(parseInt(value))
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="选择星期" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">无</SelectItem>
                              {WEEKDAYS.map((day, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* 添加播出平台地址字段 */}
                      <div className="space-y-1">
                        <Label htmlFor="edit-platform-url" className="flex items-center">
                          <Link className="h-3.5 w-3.5 mr-1.5" />
                          播出平台地址
                        </Label>
                        <Input 
                          id="edit-platform-url"
                          placeholder="https://example.com/show-page"
                          value={editData.platformUrl || ""}
                          onChange={(e) => setEditData({...editData, platformUrl: e.target.value})}
                          className="w-full font-mono text-xs"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          用于TMDB导入工具抓取元数据
                        </p>
                      </div>
                      
                      {/* 添加每日更新选项 - 移除分类限制，允许所有分类设置 */}
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-daily-update"
                            checked={editData.isDailyUpdate === true}
                            onCheckedChange={(checked) => 
                              setEditData({...editData, isDailyUpdate: checked === true})
                            }
                          />
                          <Label 
                            htmlFor="edit-daily-update"
                            className="text-sm flex items-center cursor-pointer"
                          >
                            <Zap className="h-3 w-3 mr-1 animate-pulse" />
                            设为每日更新
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          选中后，卡片上将显示"每日更新"而不是星期几
                        </p>
                      </div>
                      
                      {editData.mediaType === "tv" && (
                        <div className="space-y-1">
                          <Label htmlFor="edit-tmdbid">TMDB ID</Label>
                          <Input 
                            id="edit-tmdbid"
                            value={editData.tmdbId}
                            onChange={(e) => setEditData({...editData, tmdbId: e.target.value})}
                          />
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <Label htmlFor="edit-status">状态</Label>
                        <Select 
                          value={editData.status} 
                          onValueChange={(value: "ongoing" | "completed") => 
                            setEditData({
                              ...editData, 
                              status: value,
                              completed: value === "completed"
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择状态" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ongoing">连载中</SelectItem>
                            <SelectItem value="completed">已完结</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* 笔记编辑功能已移除 */}
                    </div>
                  ) : (
                    // 查看模式下的信息显示
                    <>
                      <div className="flex justify-between py-0.5 text-xs">
                        <span className="text-muted-foreground">类型:</span>
                        <span>{localItem.mediaType === "movie" ? "电影" : "剧集"}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-xs">
                        <span className="text-muted-foreground">分类:</span>
                        <span>{CATEGORIES.find((cat) => cat.id === localItem.category)?.name || localItem.category || "未分类"}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-xs">
                        <span className="text-muted-foreground">更新时间:</span>
                        <span>{getAirTime(localItem.weekday)}</span>
                      </div>
                      {/* 添加第二播出日显示 */}
                      {typeof localItem.secondWeekday === 'number' && localItem.secondWeekday >= 0 && (
                        <div className="flex justify-between py-0.5 text-xs">
                          <span className="text-muted-foreground">第二播出日:</span>
                          <span>{getAirTime(localItem.secondWeekday)}</span>
                        </div>
                      )}
                      {isDailyUpdate && (
                        <div className="flex justify-between py-0.5 text-xs">
                          <span className="text-muted-foreground">更新频率:</span>
                          <span className="flex items-center text-blue-500 font-medium">
                            <Zap className="h-2.5 w-2.5 mr-0.5 animate-pulse" />
                            每日更新
                          </span>
                        </div>
                      )}
                      {localItem.platformUrl && (
                        <div className="flex justify-between py-0.5 text-xs">
                          <span className="text-muted-foreground">播出平台:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-2 py-0 text-xs text-blue-500"
                            title="访问播出平台"
                            onClick={() => window.open(localItem.platformUrl, '_blank')}
                          >
                            <ExternalLink className="h-2.5 w-2.5 mr-1 flex-shrink-0" />
                            访问
                          </Button>
                        </div>
                      )}
                      {localItem.tmdbId && (
                        <div className="flex justify-between py-0.5 text-xs">
                          <span className="text-muted-foreground">TMDB ID:</span>
                          <span>{localItem.tmdbId}</span>
                        </div>
                      )}
                      {localItem.mediaType === "tv" && (
                        <div className="flex justify-between py-0.5 text-xs">
                          <span className="text-muted-foreground">总集数:</span>
                          <span className="flex items-center">
                            {localItem.totalEpisodes || "未知"}
                            {localItem.manuallySetEpisodes && (
                              <Badge variant="outline" className="ml-1 px-1 h-4 bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                                <Pencil className="h-2 w-2 mr-0.5" />
                                手动
                              </Badge>
                            )}
                          </span>
                        </div>
                      )}
                      {localItem.mediaType === "tv" && progress.total > 0 && (
                        <div className="space-y-1 mt-1">
                          <div className="flex justify-between py-0.5 text-xs">
                            <span className="text-muted-foreground">观看进度:</span>
                            <span>{progress.completed}/{progress.total} ({progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%)</span>
                          </div>
                          <div className="relative w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                            <div 
                              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full" 
                              style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* 右侧：内容区域 */}
            <div className="md:col-span-3">
              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2 mb-4 items-center min-h-[40px]">
                <Button
                  variant="outline"
                  className="flex items-center"
                  onClick={() => setScheduledTaskDialogOpen(true)}
                >
                  <AlarmClock className="h-4 w-4 mr-2" />
                  定时任务
                </Button>
              </div>
              
              {/* 标签页切换 */}
              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details" className="flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    详情
                  </TabsTrigger>
                  <TabsTrigger value="integration" className="flex items-center">
                    <Terminal className="h-4 w-4 mr-2" />
                    集成工具
                  </TabsTrigger>
                </TabsList>
                
                {/* 详情标签内容 */}
                <TabsContent value="details">
                  <ScrollArea className="h-[calc(95vh-300px)]">
                    <div className="space-y-6 pr-2">
                      {/* 剧集内容 */}
                      {localItem.mediaType === "movie" ? (
                        <Card>
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
                      ) : (
                        <>
                          {/* 季数选择器 */}
                          {localItem.seasons && localItem.seasons.length > 0 && (
                            <Card>
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
                            <Card>
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
                                    disabled={isRefreshingTMDBData}
                                    title="刷新TMDB数据"
                                  >
                                    {isRefreshingTMDBData ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                    )}
                                    刷新TMDB
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          
                          {/* 显示刷新错误 */}
                          {refreshError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-md mb-4 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{refreshError}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="ml-auto h-6 px-2"
                                onClick={() => setRefreshError(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {/* 剧集列表 */}
                          {getCurrentSeason() && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center">
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  剧集列表
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {/* 批量操作说明 */}
                                <div className="mb-2 text-xs text-muted-foreground">
                                  提示: 按住Shift键可以批量选择剧集
                                </div>
                                
                                {/* 快速批量操作 */}
                                <div className="mb-3 flex flex-wrap gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      if (currentSeason) {
                                        const episodes = currentSeason.episodes;
                                        // 找到第一个未完成的集数
                                        const firstIncomplete = episodes.find(ep => !ep.completed);
                                        if (firstIncomplete) {
                                          handleEpisodeToggle(firstIncomplete.number, true, selectedSeason!);
                                        }
                                      }
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    标记下一集
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      if (currentSeason) {
                                        // 标记前10集为已完成
                                        const episodes = currentSeason.episodes.slice(0, 10);
                                        episodes.forEach(ep => {
                                          if (!ep.completed) {
                                            handleEpisodeToggle(ep.number, true, selectedSeason!);
                                          }
                                        });
                                      }
                                    }}
                                  >
                                    <CheckSquare className="h-3 w-3 mr-1" />
                                    标记前10集
                                  </Button>
                                </div>
                                
                                {/* 剧集网格 */}
                                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                                  {getCurrentSeason() && getCurrentSeason()!.episodes && getCurrentSeason()!.episodes.length > 0 && getCurrentSeason()!.episodes.map((episode) => (
                                      <EpisodeCheckbox
                                      key={episode.number}
                                        id={`episode-${episode.number}-${selectedSeason}`}
                                        checked={episode.completed}
                                        onCheckedChange={(checked) => {
                                          // 确保checked是布尔值
                                          const isChecked = checked === true;
                                          handleEpisodeToggle(episode.number, isChecked, selectedSeason!);
                                        }}
                                        onClick={() => setLastClickedEpisode(episode.number)}
                                        label={`${episode.number}`}
                                    />
                                  ))}
                                </div>
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
                <TabsContent value="integration">
                  <ScrollArea className="h-[calc(95vh-300px)]">
                    <div className="pr-2">
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
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* 复制反馈 */}
          {copyFeedback && (
            <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg text-sm z-50">
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
          
          <AlertDialog open={showDeleteSeasonDialog} onOpenChange={setShowDeleteSeasonDialog}>
            <AlertDialogContent>
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
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
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
            </AlertDialogContent>
          </AlertDialog>

          {/* 定时任务对话框 */}
          <ScheduledTaskDialog
            open={scheduledTaskDialogOpen}
            onOpenChange={setScheduledTaskDialogOpen}
            item={localItem}
            onUpdate={(updatedItem) => {
              setLocalItem(updatedItem)
              onUpdate(updatedItem)
            }}
            onTaskSaved={(task) => {
              // 当任务保存成功后，确保更新本地状态
              console.log("[ItemDetailDialog] 定时任务保存成功:", task);
              
              try {
                // 重新加载最新的项目数据，确保包含最新的定时任务信息
                const updatedItem = {...localItem};
                
                // 如果项目中没有 scheduledTasks 数组，创建一个
                if (!updatedItem.scheduledTasks) {
                  updatedItem.scheduledTasks = [];
                }
                
                // 检查任务是否已存在，如果存在则更新，否则添加
                const taskIndex = updatedItem.scheduledTasks.findIndex(t => t.id === task.id);
                if (taskIndex >= 0) {
                  updatedItem.scheduledTasks[taskIndex] = task;
                } else {
                  updatedItem.scheduledTasks.push(task);
                }
                
                // 验证任务是否已添加到项目中
                const taskAdded = updatedItem.scheduledTasks.some(t => t.id === task.id);
                if (!taskAdded) {
                  console.error("[ItemDetailDialog] 任务未成功添加到项目中:", task.id);
                  throw new Error("任务未成功添加到项目中");
                }
                
                console.log("[ItemDetailDialog] 更新后的项目:", updatedItem);
                
                // 更新本地状态和父组件状态
                setLocalItem(updatedItem);
                onUpdate(updatedItem);
                
                // 显示成功提示
                toast({
                  title: "定时任务已保存",
                  description: `任务 "${task.name}" 已成功保存，请在全局定时任务管理中查看`,
                });
                
                // 验证任务是否已成功保存到 localStorage
                setTimeout(async () => {
                  try {
                    const savedTasks = await StorageManager.forceRefreshScheduledTasks();
                    const taskSaved = savedTasks.some(t => t.id === task.id);
                    
                    if (taskSaved) {
                      console.log("[ItemDetailDialog] 验证成功: 任务已成功保存到 localStorage");
                    } else {
                      console.error("[ItemDetailDialog] 验证失败: 任务未在 localStorage 中找到");
                      toast({
                        title: "警告",
                        description: "任务可能未正确保存，请在全局定时任务管理中检查",
                        variant: "destructive"
                      });
                    }
                  } catch (error) {
                    console.error("[ItemDetailDialog] 验证任务保存状态时出错:", error);
                  }
                }, 1000);
              } catch (error) {
                console.error("[ItemDetailDialog] 更新项目状态失败:", error);
                toast({
                  title: "更新失败",
                  description: "无法更新项目状态，但任务可能已保存",
                  variant: "destructive"
                });
              }
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
    </>
  )
}
