"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Upload,
  Play,
  Download,
  Film,
  RefreshCw,
  Trash2,
  Star,
  Clock,
  FileVideo,
  Grid3X3,
  Filter,
  ArrowUpDown,
  Settings,
  HelpCircle,
  Search,
  Eye,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertTriangle,
  User,
  Image as ImageIcon,
  TerminalSquare,
  Sliders,
  Save,
  PackageOpen,
  Cog,
  ChevronsRight,
  ArrowDown,
  Check,
  BarChart4,
  Layers,
  Cpu,
  Loader2,
  LayoutGrid,
  LayoutList
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// 视频文件接口
interface VideoFile {
  id: string
  file: File
  name: string
  duration: number
  resolution: string
  size: number
  url: string
  thumbnails: Thumbnail[]
  selectedThumbnail: number
  extractionProgress: number
  status: "pending" | "processing" | "completed" | "error" | "cancelled" | "no-frames"
  thumbnailPagination?: {
    currentPage: number
    itemsPerPage: number
  }
}

// 缩略图接口
interface Thumbnail {
  id: string
  url: string
  timestamp: number
  quality: number
  isMain: boolean  // 是否为主图
}

// 提取设置接口
interface ExtractionSettings {
  startTime: number          // 开始提取时间（秒）
  threadCount: number        // 线程数（并发处理数）
  outputFormat: "jpg" | "png" // 输出格式
  thumbnailCount: number     // 每个视频提取的缩略图数量
  prioritizeStatic: boolean  // 优先静态帧
  avoidSubtitles: boolean    // 避免字幕
  preferPeople: boolean      // 优先人物
  preferFaces: boolean       // 优先人物正脸
  subtitleDetectionStrength: number // 字幕检测强度 (0-1)
  staticFrameThreshold: number     // 静态帧阈值
  keepOriginalResolution: boolean  // 保持原始分辨率
  enhancedFrameDiversity: boolean  // 增强帧多样性
  frameSimilarityThreshold: number // 帧相似度阈值 (0-1)
  timeDistribution: "uniform" | "random" // 时间分布策略
}

// 可用AI模型配置
const availableModels = {
  subtitleDetection: [
    { id: "enhanced", name: "增强检测", description: "使用增强型图像处理算法检测字幕区域，综合了多种检测技术" },
  ],
  peopleDetection: [
    { id: "basic", name: "基础检测", description: "使用基本图像处理算法检测人物轮廓" },
    { id: "yolo-tiny", name: "YOLO-Tiny", description: "轻量级目标检测模型，速度快" },
    { id: "face-detect", name: "人脸检测", description: "专注于检测人脸的模型" },
    { id: "human-pose", name: "人体姿态", description: "检测完整人体姿态的高级模型" },
  ],
}

// 添加图像处理器导入
import { ImageProcessor } from "@/utils/image-processor-class"

// 添加JSZip和FileSaver的导入
import JSZip from 'jszip';
import FileSaver from 'file-saver';

// 添加视图模式类型
type ViewMode = "grid"; // 修改为只有网格模式

/**
 * 视频缩略图提取组件
 * 
 * 注意：此组件在TypeScript编译时可能会有类型错误，
 * 这是因为shadcn UI组件和当前React类型不匹配导致的。
 * 这些错误不会影响运行时功能，可以安全忽略。
 */
export default function VideoThumbnailExtractor() {
  // 视频列表状态
  const [videos, setVideos] = useState<VideoFile[]>([])
  
  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false)
  const [totalProgress, setTotalProgress] = useState(0)
  const [processingQueue, setProcessingQueue] = useState<string[]>([])
  
  // 排序和过滤状态
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name")
  const [filterBy, setFilterBy] = useState<"all" | "completed" | "processing" | "pending">("all")
  const [thumbnailSortBy, setThumbnailSortBy] = useState<"quality" | "timestamp">("timestamp")
  
  // 提取设置
  const [settings, setSettings] = useState<ExtractionSettings>({
    startTime: 0,
    threadCount: 2,
    outputFormat: "jpg",
    thumbnailCount: 9, // 修改默认为9，以便于3x3网格布局
    prioritizeStatic: true,
    avoidSubtitles: true,
    preferPeople: true,
    preferFaces: true,
    subtitleDetectionStrength: 0.8,
    staticFrameThreshold: 0.7,
    keepOriginalResolution: true,  // 默认保持原始分辨率
    enhancedFrameDiversity: true,  // 默认启用增强帧多样性
    frameSimilarityThreshold: 0.85, // 新增：帧相似度阈值，超过此阈值的帧被视为相似
    timeDistribution: "uniform"      // 新增：时间分布策略，默认均匀分布
  })
  
  // 分页设置
  const [defaultItemsPerPage, setDefaultItemsPerPage] = useState<number>(9) // 保持为9
  
  // UI 状态
  const [showSettings, setShowSettings] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [selectedSubtitleModel, setSelectedSubtitleModel] = useState("enhanced")
  const [selectedPeopleModel, setSelectedPeopleModel] = useState("yolo-tiny")
  const [showSubtitleMarkers, setShowSubtitleMarkers] = useState(true)
  const [modelStatus, setModelStatus] = useState({
    subtitle: "loading", // loading, ready, error
    person: "loading"   // loading, ready, error
  })
  
  // 预览状态
  const [previewData, setPreviewData] = useState<{
    url: string
    filename: string
    videoId: string
    thumbnailId: string
  } | null>(null)
  
  // 反馈状态
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  
  // 处理器状态
  const [processorReady, setProcessorReady] = useState<boolean>(false)
  const [processorInitialized, setProcessorInitialized] = useState(false)
  const [processorError, setProcessorError] = useState<string | null>(null)
  
  // 引用
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropAreaRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()
  const { toast } = useToast()

  // 图像处理器
  const imageProcessorRef = useRef<ImageProcessor | null>(null)
    
  // 视图模式固定为网格模式
  const viewMode: ViewMode = "grid";
  
  // 加载处理器和设置
  useEffect(() => {
    const initProcessor = async () => {
      // 模拟加载过程
      setModelStatus({
        subtitle: "loading",
        person: "loading"
      })
      
      try {
        if (typeof window !== 'undefined') {
          // 初始化图像处理器
          const processor = ImageProcessor.getInstance()
          await processor.initialize()
          imageProcessorRef.current = processor
          
          // 更新模型状态
          setModelStatus({
            subtitle: "ready",
            person: "ready"
          })
          
          setProcessorInitialized(true)
          setProcessorReady(true)
          
          console.log("图像处理器初始化成功")
        }
      } catch (error) {
        console.error("初始化图像处理器失败:", error)
        setModelStatus({
          subtitle: "error",
          person: "error"
        })
        setProcessorError("初始化图像处理器失败，请刷新页面重试")
        
          toast({
          title: "模型加载失败",
          description: "无法初始化图像处理器，请刷新页面重试",
            variant: "destructive",
        })
      }
    }
    
    initProcessor()
    
    // 加载保存的设置
    const savedSettings = localStorage.getItem("video_thumbnail_settings")
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({
          ...prev,
          ...parsed,
          // 确保数值正确
          startTime: Number(parsed.startTime || prev.startTime),
          threadCount: Number(parsed.threadCount || prev.threadCount),
          thumbnailCount: Number(parsed.thumbnailCount || prev.thumbnailCount),
          subtitleDetectionStrength: Number(parsed.subtitleDetectionStrength || prev.subtitleDetectionStrength),
          staticFrameThreshold: Number(parsed.staticFrameThreshold || prev.staticFrameThreshold),
          keepOriginalResolution: parsed.keepOriginalResolution || prev.keepOriginalResolution,
          enhancedFrameDiversity: parsed.enhancedFrameDiversity || prev.enhancedFrameDiversity,
          frameSimilarityThreshold: Number(parsed.frameSimilarityThreshold || prev.frameSimilarityThreshold),
          timeDistribution: parsed.timeDistribution || prev.timeDistribution
        }))
        } catch (error) {
        console.error("加载设置失败:", error)
        }
      }
  }, [toast])

  useEffect(() => {
    // 监听处理器错误
    if (processorError) {
      toast({
        title: "处理器错误",
        description: processorError,
        variant: "destructive",
      })
    }
  }, [processorError, toast])

  // 当模型状态变化时显示提示
  useEffect(() => {
    if (modelStatus.subtitle === "ready" && modelStatus.person === "ready") {
      // 当模型加载完成时
      toast({
        title: "模型加载完成",
        description: "可以开始处理视频",
        variant: "default",
      })
    } else if (modelStatus.subtitle === "error" || modelStatus.person === "error") {
      // 当模型加载失败时
      toast({
        title: "模型加载失败",
        description: "请刷新页面重试",
        variant: "destructive",
      })
    }
  }, [modelStatus, toast])
  
  // 文件处理函数
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFiles(Array.from(event.target.files))
    }
  }
  
  // 处理文件拖放
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files))
    }
    
    // 重置拖放区域样式
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove("border-primary", "bg-primary/5")
    }
  }, [])
  
  // 拖放区域进入事件
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 添加高亮样式
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.add("border-primary", "bg-primary/5")
    }
  }, [])
  
  // 拖放区域离开事件
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 移除高亮样式
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove("border-primary", "bg-primary/5")
    }
  }, [])
  
  // 处理文件列表
  const processFiles = (files: File[]) => {
    // 过滤出视频文件
    const videoFiles = files.filter(file => file.type.startsWith('video/'))
    
    if (videoFiles.length === 0) {
      toast({
        title: "没有视频文件",
        description: "请上传视频文件 (MP4, WebM, AVI 等)",
        variant: "destructive",
      })
      return
    }
    
    // 添加到视频列表
    const newVideos = videoFiles.map(file => {
      const videoId = `video-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      
      return {
        id: videoId,
            file,
            name: file.name,
            size: file.size,
        duration: 0, // 将在加载视频后更新
        resolution: "", // 将在加载视频后更新
        url: URL.createObjectURL(file),
            thumbnails: [],
            selectedThumbnail: 0,
            extractionProgress: 0,
        status: "pending" as const,
            thumbnailPagination: {
              currentPage: 0,
          itemsPerPage: defaultItemsPerPage
        }
      }
    })
    
    // 更新视频列表
    setVideos(prev => [...prev, ...newVideos])
    
    // 自动开始处理
    if (!isProcessing && processorReady) {
      setTimeout(() => handleBatchExtraction(), 500)
    }
  }
  
  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }
  
  // 格式化时长
  const formatDuration = (seconds: number) => {
    if (!isFinite(seconds) || seconds <= 0) return "未知"
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }
  
  // 保存高级设置
  const saveAdvancedSettings = () => {
    try {
      localStorage.setItem("video_thumbnail_settings", JSON.stringify(settings))
      toast({
        title: "设置已保存",
        description: "你的提取设置已保存到本地",
        variant: "default",
      })
      setShowSettings(false)
        } catch (error) {
      console.error("保存设置失败:", error)
      toast({
        title: "保存设置失败",
        description: "无法保存设置到本地存储",
        variant: "destructive",
      })
    }
  }
  
  // 批量处理视频
  const handleBatchExtraction = async () => {
    if (isProcessing) return
    
    // 检查模型是否已加载
    if (!processorInitialized) {
      toast({
        title: "模型尚未准备好",
        description: "请等待模型加载完成后再试",
        variant: "destructive",
      })
      return
    }
    
    setIsProcessing(true)
    
    try {
      // 过滤出待处理的视频
      const pendingVideos = videos.filter(v => v.status === "pending")
    
    if (pendingVideos.length === 0) {
        toast({
          title: "没有待处理的视频",
          description: "请上传视频后再试",
          variant: "default",
        })
        setIsProcessing(false)
        return
      }
      
      // 使用队列处理视频，避免同时处理太多导致浏览器崩溃
      const processQueue = async (videos: VideoFile[]) => {
        // 创建一个队列
        const queue = [...videos.map(v => v.id)]
        setProcessingQueue(queue)
        
        // 同时处理的视频数量
        const concurrentLimit = Math.max(1, Math.min(settings.threadCount, 8))
        
        // 当前正在处理的视频数量
        let activeCount = 0
        let completedCount = 0
        
        // 处理下一个视频
        const processNext = async () => {
          if (queue.length === 0) {
            // 更新总进度为100%
            if (completedCount === pendingVideos.length) {
              setTotalProgress(100)
            }
            return
          }
          
          // 如果达到并发限制，等待
          if (activeCount >= concurrentLimit) return
          
          activeCount++
          const videoId = queue.shift()!
          const video = videos.find(v => v.id === videoId)
          
          if (!video || video.status !== "pending") {
            activeCount--
            processNext()
            return
          }
          
          // 更新视频状态为处理中
          setVideos(prev => 
            prev.map(v => v.id === videoId ? { ...v, status: "processing", extractionProgress: 0 } : v)
          )
          
          try {
            // 处理视频
            await processVideo(video)
            
            // 更新完成计数
            completedCount++
            
            // 更新总进度
            setTotalProgress(Math.floor((completedCount / pendingVideos.length) * 100))
          } catch (error) {
            console.error(`处理视频 ${video.name} 失败:`, error)
            
            // 视频状态已在processVideo内部更新为错误
            
            // 更新完成计数
            completedCount++
            
            // 更新总进度
            setTotalProgress(Math.floor((completedCount / pendingVideos.length) * 100))
          } finally {
            activeCount--
            
            // 继续处理队列
            processNext()
            
            // 检查是否所有视频都已处理完成
            if (activeCount === 0 && queue.length === 0) {
              setIsProcessing(false)
              setProcessingQueue([])
            }
          }
        }
        
        // 启动初始的并发处理
        const initialBatch = Math.min(concurrentLimit, queue.length)
        for (let i = 0; i < initialBatch; i++) {
          processNext()
        }
      }
      
      // 开始处理队列
      await processQueue(pendingVideos)
    } catch (error) {
      console.error("批量处理视频时出错:", error)
      setIsProcessing(false)
      setProcessingQueue([])
      
      toast({
        title: "处理失败",
        description: "批量处理视频时出错",
        variant: "destructive",
      })
    }
  }
  
  // 处理单个视频
  const processVideo = async (videoData: VideoFile): Promise<void> => {
    try {
      console.log(`开始处理视频: ${videoData.name}`)
      
      // 创建视频元素
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = videoData.url
      
      // 等待视频元数据加载
      await new Promise<void>((resolve, reject) => {
        // 设置超时
        const timeout = setTimeout(() => {
          reject(new Error("视频元数据加载超时"))
        }, 10000)
        
        // 加载处理
        const loadHandler = () => {
          clearTimeout(timeout)
          video.removeEventListener('loadedmetadata', loadHandler)
          video.removeEventListener('error', errorHandler)
          resolve()
        }
        
        // 错误处理
        const errorHandler = () => {
          clearTimeout(timeout)
          video.removeEventListener('loadedmetadata', loadHandler)
          video.removeEventListener('error', errorHandler)
          reject(new Error("视频加载失败"))
        }
        
        // 添加事件监听
        video.addEventListener('loadedmetadata', loadHandler)
        video.addEventListener('error', errorHandler)
        
        // 如果已经加载完成，直接解析
        if (video.readyState >= 2) {
          clearTimeout(timeout)
          video.removeEventListener('loadedmetadata', loadHandler)
          video.removeEventListener('error', errorHandler)
          resolve()
        }
      })
    
      console.log(`视频元数据加载完成: ${videoData.name}`)
      
      // 更新视频信息
      const duration = video.duration || 0
      const resolution = video.videoWidth && video.videoHeight ? 
        `${video.videoWidth}x${video.videoHeight}` : "未知"
      
      setVideos(prev => 
        prev.map(v => v.id === videoData.id ? 
          { ...v, duration, resolution } : v
        )
      )
      
      // 确保处理器已初始化
      if (!imageProcessorRef.current || !processorInitialized) {
        throw new Error("图像处理器未初始化")
      }
      
      // 更新进度-开始提取帧
      setVideos(prev => 
        prev.map(v => v.id === videoData.id ? 
          { ...v, extractionProgress: 10 } : v
        )
      )
      
      // 确保开始时间有效
      const validStartTime = Math.min(
        Math.max(0, settings.startTime), 
        Math.max(0, duration - 1)
      )
      
      console.log(`开始提取帧: ${videoData.name}, 起始时间: ${validStartTime}秒`)
      
      // 从视频中提取帧 - 增加提取的帧数，确保有更多选择
      const frames = await imageProcessorRef.current.extractFramesFromVideo(video, {
        startTime: validStartTime,
        frameCount: settings.thumbnailCount * 5, // 提取5倍数量，从中选择最佳的且差异大的帧
        interval: settings.timeDistribution, // 使用设置的时间分布策略
        keepOriginalResolution: settings.keepOriginalResolution, // 保持原始分辨率
        enhancedFrameDiversity: settings.enhancedFrameDiversity  // 增强帧多样性
      })
      
      console.log(`成功提取 ${frames.length} 帧: ${videoData.name}`)
      
      // 更新进度-帧提取完成
      setVideos(prev => 
        prev.map(v => v.id === videoData.id ? 
          { ...v, extractionProgress: 30 } : v
        )
      )
      
      // 如果没有足够的帧，抛出错误
      if (frames.length < 2) {
        console.error(`提取的帧数不足: ${videoData.name}`)
        throw new Error("无法从视频中提取足够的帧")
      }
      
      console.log(`开始分析帧质量: ${videoData.name}`)
      
      // 分析帧并找到最佳帧
      const { frames: bestFrames } = await imageProcessorRef.current.findOptimalFrames(
        frames, 
        Math.min(settings.thumbnailCount, frames.length),
        {
          prioritizeStatic: settings.prioritizeStatic,
          avoidSubtitles: settings.avoidSubtitles,
          preferPeople: settings.preferPeople,
          preferFaces: settings.preferFaces,
          avoidEmptyFrames: true
        },
        {
          subtitleDetectionStrength: settings.subtitleDetectionStrength,
          staticFrameThreshold: settings.staticFrameThreshold,
          sampleRate: 2
        }
      )
      
      console.log(`完成帧分析，找到 ${bestFrames.length} 个最佳帧: ${videoData.name}`)
      
      // 更新进度-帧分析完成
      setVideos(prev => 
        prev.map(v => v.id === videoData.id ? 
          { ...v, extractionProgress: 70 } : v
        )
      )
      
      // 生成缩略图
      const thumbnails: Thumbnail[] = []
      
      // 确保我们有足够多的不同帧
      const uniqueFrameIndices = new Set<number>()
      
      // 先按质量排序
      const sortedBestFrames = [...bestFrames].sort((a, b) => {
        // 计算质量综合得分
        const scoreA = (a.scores.staticScore * 0.5 + (1 - a.scores.subtitleScore) * 0.3 + a.scores.peopleScore * 0.2);
        const scoreB = (b.scores.staticScore * 0.5 + (1 - b.scores.subtitleScore) * 0.3 + b.scores.peopleScore * 0.2);
        return scoreB - scoreA; // 降序排列
      });
      
      // 生成缩略图
      for (let i = 0; i < sortedBestFrames.length && thumbnails.length < settings.thumbnailCount; i++) {
        const frameIndex = sortedBestFrames[i].index
        
        // 确保不重复使用同一帧
        if (uniqueFrameIndices.has(frameIndex)) continue;
        uniqueFrameIndices.add(frameIndex);
        
        if (frameIndex >= 0 && frameIndex < frames.length) {
          const frame = frames[frameIndex]
          const scores = sortedBestFrames[i].scores
          
          console.log(`生成缩略图 ${thumbnails.length+1}/${settings.thumbnailCount}: ${videoData.name}, 帧索引: ${frameIndex}`)
          
          // 生成缩略图 - 保持原始分辨率
          const { url } = await imageProcessorRef.current.generateThumbnail(frame, {
            maxWidth: settings.keepOriginalResolution ? frame.width : 640,
            maxHeight: settings.keepOriginalResolution ? frame.height : 360,
            quality: 0.9, // 提高质量
            format: settings.outputFormat as 'webp' | 'jpeg' | 'png'
          })
                
          // 添加到缩略图列表 - 第一个（最高质量）为主图
          thumbnails.push({
            id: `thumb_${videoData.id}_${i}_${Date.now()}`,
            url,
            timestamp: validStartTime + (frameIndex / frames.length) * (duration - validStartTime),
            quality: (scores.staticScore * 0.5 + (1 - scores.subtitleScore) * 0.3 + scores.peopleScore * 0.2) * 100,
            isMain: thumbnails.length === 0 // 第一个添加的帧（质量最高的）设为主图
          })
        }
              
        // 更新进度
        setVideos(prev => 
          prev.map(v => v.id === videoData.id ? 
            { ...v, extractionProgress: 70 + ((thumbnails.length) / settings.thumbnailCount) * 30 } : v
          )
        )
      }
        
      // 检查是否生成了缩略图
      if (thumbnails.length === 0) {
        console.error(`未能生成缩略图: ${videoData.name}`)
        throw new Error("未能生成缩略图")
      }
      
      console.log(`处理完成，生成了 ${thumbnails.length} 个缩略图: ${videoData.name}`)
      
      // 更新视频状态为完成
      setVideos(prev => 
        prev.map(v => v.id === videoData.id ? 
          { 
            ...v,
            status: "completed",
            extractionProgress: 100,
            thumbnails: thumbnails,
            selectedThumbnail: 0
          } : v
        )
      )
    } catch (error) {
      console.error("处理视频失败:", error)
      
      // 更新视频状态为错误
      setVideos(prev => 
        prev.map(v => v.id === videoData.id ? 
          { ...v, status: "error", extractionProgress: 0 } : v
        )
      )
      
      // 重新抛出错误供上层处理
      throw error;
    }
  }
  
  // 下载缩略图
  const downloadThumbnail = (videoId: string, thumbnailId: string) => {
    const video = videos.find(v => v.id === videoId)
    if (!video) return
    
    const thumbnail = video.thumbnails.find(t => t.id === thumbnailId)
    if (!thumbnail) return
    
    const link = document.createElement('a')
    link.href = thumbnail.url
    
    // 创建一个合理的文件名
    const baseFilename = video.name.replace(/\.[^.]+$/, '') // 去除扩展名
    const timestamp = formatDuration(thumbnail.timestamp)
    const outputExt = settings.outputFormat
    
    link.download = `${baseFilename}_${timestamp}.${outputExt}`
    link.click()
    
    toast({
      title: "下载已开始",
      description: `正在下载 ${link.download}`,
      variant: "default",
    })
  }
  
  // 将候选帧设为主图
  const setAsMainThumbnail = (videoId: string, thumbnailId: string) => {
    setVideos(prev => 
      prev.map(v => {
        if (v.id === videoId) {
          // 找到当前缩略图的索引
          const thumbnailIndex = v.thumbnails.findIndex(t => t.id === thumbnailId);
          if (thumbnailIndex === -1) return v;
          
          // 更新所有缩略图的isMain状态
          const updatedThumbnails = v.thumbnails.map((t, idx) => ({
            ...t,
            isMain: t.id === thumbnailId
          }));
          
          // 更新选中的缩略图
          return {
            ...v,
            thumbnails: updatedThumbnails,
            selectedThumbnail: thumbnailIndex
          };
        }
        return v;
      })
    );
    
    toast({
      title: "已设为主图",
      description: "此缩略图将作为下载全部时的主要图片",
      variant: "default",
    });
  };
  
  // 下载所有缩略图
  const downloadAllThumbnails = async () => {
    const completedVideos = videos.filter(v => v.status === "completed" && v.thumbnails.length > 0)
    
    if (completedVideos.length === 0) {
      toast({
        title: "没有可下载的缩略图",
        description: "请先处理视频",
        variant: "destructive",
      })
      return
    }
    
    // 对于单个视频的单个缩略图，直接下载
    if (completedVideos.length === 1 && completedVideos[0].thumbnails.length === 1) {
      const video = completedVideos[0]
      const thumbnail = video.thumbnails[0]
      downloadThumbnail(video.id, thumbnail.id)
      return
    }
    
    // 对于多个缩略图，使用JSZip打包下载
    toast({
      title: "正在准备下载",
      description: "正在打包所有缩略图...",
      variant: "default",
    })
    
    try {
      // 创建一个新的ZIP文件实例
      const zip = new JSZip();
      const imgFolder = zip.folder("thumbnails");
      
      if (!imgFolder) {
        throw new Error("创建ZIP文件夹失败");
      }
      
      // 将URL转换为Blob的辅助函数
      const urlToBlob = async (url: string): Promise<Blob> => {
        const response = await fetch(url);
        return await response.blob();
      };
      
      // 将所有缩略图添加到ZIP文件
      for (const video of completedVideos) {
        // 为每个视频创建一个文件夹
        const videoFolder = imgFolder.folder(video.name.replace(/[\\/:*?"<>|]/g, "_"));
        
        if (!videoFolder) {
          console.warn(`无法为视频 ${video.name} 创建文件夹，跳过`);
          continue;
        }
        
        // 获取主图和候选帧
        const mainThumbnail = video.thumbnails.find(t => t.isMain);
        const candidateThumbnails = video.thumbnails.filter(t => !t.isMain);
        
        // 添加主图（如果有）
        if (mainThumbnail) {
          const blob = await urlToBlob(mainThumbnail.url);
          const extension = settings.outputFormat === "jpg" ? "jpg" : settings.outputFormat;
          const filename = `main_${Math.round(mainThumbnail.timestamp)}_q${Math.round(mainThumbnail.quality)}.${extension}`;
          videoFolder.file(filename, blob);
        }
        
        // 添加候选帧
        for (let i = 0; i < candidateThumbnails.length; i++) {
          const thumbnail = candidateThumbnails[i];
          const blob = await urlToBlob(thumbnail.url);
          const extension = settings.outputFormat === "jpg" ? "jpg" : settings.outputFormat;
          const filename = `candidate_${i+1}_${Math.round(thumbnail.timestamp)}_q${Math.round(thumbnail.quality)}.${extension}`;
          videoFolder.file(filename, blob);
        }
      }
      
      // 生成ZIP文件并下载
      const content = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      }, (metadata) => {
        // 更新进度
        const progress = Math.round(metadata.percent);
        if (progress % 10 === 0) { // 每10%更新一次
          toast({
            title: "打包进度",
            description: `${progress}%`,
            variant: "default",
          });
        }
      });
      
      // 下载ZIP文件
      FileSaver.saveAs(content, `thumbnails_${new Date().toISOString().slice(0, 10)}.zip`);
      
      toast({
        title: "下载完成",
        description: "所有缩略图已打包下载",
        variant: "default",
      });
          } catch (error) {
      console.error("下载缩略图失败:", error);
      toast({
        title: "下载失败",
        description: "打包缩略图时出错",
        variant: "destructive",
      });
    }
  }
  
  // 移除视频
  const removeVideo = (videoId: string) => {
    setVideos(prev => {
      const videoToRemove = prev.find(v => v.id === videoId)
      
      if (videoToRemove) {
        // 释放URL对象
        URL.revokeObjectURL(videoToRemove.url)
      }
      
      return prev.filter(v => v.id !== videoId)
    })
    
    toast({
      title: "已移除视频",
      description: "视频已从列表中移除",
      variant: "default",
    })
  }
  
  // 移除所有视频
  const removeAllVideos = () => {
    setVideos(prev => {
      // 释放所有URL对象
      prev.forEach(v => URL.revokeObjectURL(v.url))
      return []
    })
    
    setTotalProgress(0)
    setIsProcessing(false)
    setProcessingQueue([])
    
      toast({
      title: "已清空列表",
      description: "所有视频已从列表中移除",
      variant: "default",
    })
  }
  
  // 重试处理视频
  const retryProcessVideo = (videoId: string) => {
    setVideos(prev => 
      prev.map(v => v.id === videoId ? 
        { ...v, status: "pending", extractionProgress: 0 } : v
      )
    )
    
    // 如果当前没有处理中的视频，立即开始处理
    if (!isProcessing) {
      handleBatchExtraction()
    }
  }
  
  // 取消处理视频
  const cancelProcessVideo = (videoId: string) => {
    // 更新视频状态为已取消
    setVideos(prev => 
      prev.map(v => v.id === videoId ? 
        { ...v, status: "cancelled", extractionProgress: 0 } : v
      )
    )
    
    // 从处理队列中移除
    setProcessingQueue(prev => prev.filter(id => id !== videoId))
  }
  
  // 分页控制
  const handlePageChange = (videoId: string, newPage: number) => {
    setVideos(prev => 
      prev.map(v => v.id === videoId ? 
        { 
                    ...v,
            thumbnailPagination: {
            ...v.thumbnailPagination!, 
            currentPage: newPage 
          } 
        } : v
      )
    )
  }

  // 选择缩略图
  const selectThumbnail = (videoId: string, index: number) => {
    setVideos(prev => 
      prev.map(v => v.id === videoId ? 
        { ...v, selectedThumbnail: index } : v
      )
    )
  }
  
  // 打开预览
  const openPreview = (videoId: string, thumbnailId: string) => {
    const video = videos.find(v => v.id === videoId)
    if (!video) return
    
    const thumbnail = video.thumbnails.find(t => t.id === thumbnailId)
    if (!thumbnail) return
    
    setPreviewData({
      url: thumbnail.url,
      filename: video.name,
      videoId,
      thumbnailId
    })
    
    setShowPreviewDialog(true)
  }
  
  // 复制缩略图URL
  const copyThumbnailURL = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopyFeedback("已复制!")
        setTimeout(() => setCopyFeedback(null), 2000)
      })
      .catch(() => {
        setCopyFeedback("复制失败")
        setTimeout(() => setCopyFeedback(null), 2000)
      })
  }
  
  // 获取已过滤的视频列表
  const getFilteredVideos = (): VideoFile[] => {
    // 首先过滤
    let filteredList = [...videos];
    
    if (filterBy !== "all") {
      filteredList = filteredList.filter(v => v.status === filterBy);
    }
    
    // 然后排序
    switch (sortBy) {
      case "name":
        filteredList.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "date":
        // 这里使用ID来模拟按日期排序，因为ID包含时间戳
        filteredList.sort((a, b) => a.id.localeCompare(b.id));
        break;
      case "size":
        filteredList.sort((a, b) => b.size - a.size);
        break;
    }
    
    return filteredList;
  }
  
  // 获取视频的缩略图分页数据
  const getPaginatedThumbnails = (video: VideoFile) => {
    if (!video.thumbnailPagination || video.thumbnails.length === 0) {
      return [];
    }
    
    const { currentPage, itemsPerPage } = video.thumbnailPagination;
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    
    // 排序缩略图
    let sortedThumbnails = [...video.thumbnails];
    
    if (thumbnailSortBy === "quality") {
      sortedThumbnails.sort((a, b) => b.quality - a.quality);
    } else {
      sortedThumbnails.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    return sortedThumbnails.slice(start, end);
  }
  
  // 获取视频的总页数
  const getTotalPages = (video: VideoFile) => {
    if (!video.thumbnailPagination || video.thumbnails.length === 0) {
      return 1;
    }
    
    return Math.ceil(video.thumbnails.length / video.thumbnailPagination.itemsPerPage);
  }
  
  // 渲染预览对话框
  const renderPreviewDialog = () => (
    <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>缩略图预览</DialogTitle>
        </DialogHeader>
        
        {previewData && (
          <div className="flex flex-col space-y-4">
            <div className="relative w-full aspect-video bg-neutral-950/50 rounded-lg overflow-hidden">
              <img 
                src={previewData.url} 
                alt="预览" 
                className="w-full h-full object-contain"
              />
                  </div>
                  
            <div className="flex flex-wrap justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">文件名: </span> 
                {previewData.filename}
                  </div>
                  
              <div className="flex gap-2">
                      <Button
                  className="text-xs h-8"
                  onClick={() => copyThumbnailURL(previewData.url)}
                      >
                  {copyFeedback ? copyFeedback : "复制链接"}
                      </Button>
                
                            <Button
                  className="text-xs h-8"
                  onClick={() => downloadThumbnail(previewData.videoId, previewData.thumbnailId)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  下载
                            </Button>
                            </div>
                          </div>
                            </div>
                          )}
      </DialogContent>
    </Dialog>
  )
  
  // 渲染设置对话框
  const renderSettingsDialog = () => (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="max-h-[90vh]"> {/* 添加最大高度限制 */}
        <DialogHeader>
          <DialogTitle>缩略图提取设置</DialogTitle>
          <DialogDescription>
            自定义视频缩略图提取的参数
          </DialogDescription>
        </DialogHeader>
        
        {/* 添加滚动区域组件 */}
        <ScrollArea className="h-[calc(70vh-120px)] pr-4">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">开始提取时间 (秒)</Label>
              <Input
                id="startTime"
                type="number"
                min="0"
                value={settings.startTime}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, startTime: Number(e.target.value) }))
                }
              />
              <p className="text-xs text-muted-foreground">
                从视频的哪个时间点开始提取缩略图
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="threadCount">同时处理视频数量</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[settings.threadCount]}
                  min={1}
                  max={8}
                  step={1}
                  onValueChange={([value]) => 
                    setSettings(prev => ({ ...prev, threadCount: value }))
                  }
                />
                <span className="font-medium w-8 text-center">{settings.threadCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                同时处理的视频数量，较高的值可能会影响性能
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnailCount">每个视频的缩略图数量</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[settings.thumbnailCount]}
                  min={1}
                  max={12}
                  step={1}
                  onValueChange={([value]) => 
                    setSettings(prev => ({ ...prev, thumbnailCount: value }))
                  }
                />
                <span className="font-medium w-8 text-center">{settings.thumbnailCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                为每个视频提取的缩略图数量
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outputFormat">输出格式</Label>
              <Select
                value={settings.outputFormat}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, outputFormat: value as "jpg" | "png" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择输出格式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                缩略图输出格式，PNG有更好的质量但文件更大
              </p>
            </div>
            
            {/* 时间分布策略 */}
            <div className="space-y-2">
              <Label htmlFor="timeDistribution">时间分布策略</Label>
              <Select
                value={settings.timeDistribution}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, timeDistribution: value as "uniform" | "random" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择时间分布策略" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uniform">均匀分布</SelectItem>
                  <SelectItem value="random">随机分布</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                控制从视频中提取缩略图的时间间隔方式
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enhancedFrameDiversity"
                  checked={settings.enhancedFrameDiversity}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enhancedFrameDiversity: !!checked }))
                  }
                />
                <Label htmlFor="enhancedFrameDiversity" className="cursor-pointer">
                  增强帧多样性
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                提高提取帧之间的差异性，避免相似帧（推荐启用）
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-advanced" className="cursor-pointer">显示高级设置</Label>
              <Switch
                id="show-advanced"
                checked={showAdvancedSettings}
                onCheckedChange={setShowAdvancedSettings}
              />
            </div>
            
            {showAdvancedSettings && (
              <div className="space-y-4 border-t pt-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="avoidSubtitles"
                      checked={settings.avoidSubtitles}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, avoidSubtitles: !!checked }))
                      }
                    />
                    <Label htmlFor="avoidSubtitles" className="cursor-pointer">
                      避免包含字幕的帧
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    尽量避免选择包含字幕的视频帧
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preferPeople"
                      checked={settings.preferPeople}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, preferPeople: !!checked }))
                      }
                    />
                    <Label htmlFor="preferPeople" className="cursor-pointer">
                      优先选择包含人物的帧
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    优先选择包含人物的视频帧
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preferFaces"
                      checked={settings.preferFaces}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, preferFaces: !!checked }))
                      }
                    />
                    <Label htmlFor="preferFaces" className="cursor-pointer">
                      优先选择包含人物正脸的帧
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    优先选择包含人物正脸的视频帧
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subtitleDetectionStrength">字幕检测灵敏度</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[settings.subtitleDetectionStrength * 10]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={([value]) => 
                        setSettings(prev => ({ ...prev, subtitleDetectionStrength: value / 10 }))
                      }
                    />
                    <span className="font-medium w-8 text-center">
                      {Math.round(settings.subtitleDetectionStrength * 10)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    字幕检测的灵敏度，值越高检测越严格
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frameSimilarityThreshold">帧相似度阈值</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[settings.frameSimilarityThreshold * 100]}
                      min={50}
                      max={95}
                      step={5}
                      onValueChange={([value]) => 
                        setSettings(prev => ({ ...prev, frameSimilarityThreshold: value / 100 }))
                      }
                    />
                    <span className="font-medium w-8 text-center">
                      {Math.round(settings.frameSimilarityThreshold * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    控制缩略图差异度，值越低可提取的帧差异越大
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <Button 
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80" 
            onClick={() => setShowSettings(false)}
          >
            取消
          </Button>
          <Button onClick={saveAdvancedSettings}>
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
  
  // 渲染帮助对话框
  const renderHelpDialog = () => (
    <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>使用帮助</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
                            <div>
            <h3 className="text-base font-semibold mb-2">如何使用</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>上传视频文件（支持 MP4、WebM、AVI 等格式）</li>
              <li>设置提取参数（可选）</li>
              <li>等待模型加载完成（指示灯变绿）</li>
              <li>系统会自动开始处理视频</li>
              <li>处理完成后可以查看、下载缩略图</li>
            </ol>
                          </div>
                      
                            <div>
            <h3 className="text-base font-semibold mb-2">高级功能</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>支持批量处理多个视频</li>
              <li>可调整字幕检测和人物检测灵敏度</li>
              <li>支持一键下载所有缩略图</li>
              <li>可对缩略图按质量或时间排序</li>
            </ul>
                              </div>
                          
                            <div>
            <h3 className="text-base font-semibold mb-2">注意事项</h3>
            <p className="text-sm">
              本工具完全在浏览器中运行，不会上传您的视频文件到任何服务器。处理大型视频文件可能需要较长时间，请耐心等待。
                              </p>
                            </div>
                          </div>
      </DialogContent>
    </Dialog>
  )
  
  // 渲染视频卡片
  const renderVideoCard = (video: VideoFile) => {
    // 因为固定使用3x3网格，不需要分页，直接取前9个缩略图
    const thumbnails = video.thumbnails.slice(0, 9);
    
    // 获取主图和候选帧
    const mainThumbnail = video.thumbnails.find(t => t.isMain);
    const candidateThumbnails = mainThumbnail 
      ? video.thumbnails.filter(t => !t.isMain).slice(0, 8) 
      : video.thumbnails.slice(0, 8);
    const hasMainThumbnail = !!mainThumbnail;
    
    return (
      <Card className="w-full overflow-hidden" key={video.id}>
        <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium truncate max-w-[300px] flex items-center">
                <FileVideo className="mr-2 h-4 w-4 text-primary" />
                {video.name}
              </CardTitle>
              <div className="flex items-center text-xs text-muted-foreground space-x-3">
                <div className="flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  <span>{formatDuration(video.duration)}</span>
                </div>
                <div className="flex items-center">
                  <FileVideo className="mr-1 h-3 w-3" />
                  <span>{formatFileSize(video.size)}</span>
                </div>
                {video.resolution && (
                  <div className="flex items-center">
                    <Grid3X3 className="mr-1 h-3 w-3" />
                    <span>{video.resolution}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {video.status === "pending" && (
                <Badge className="bg-yellow-50 text-yellow-600 hover:bg-yellow-50 border border-yellow-200">
                  等待处理
                </Badge>
              )}
              {video.status === "processing" && (
                <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 border border-blue-200">
                  处理中
                </Badge>
              )}
              {video.status === "completed" && (
                <Badge className="bg-green-50 text-green-600 hover:bg-green-50 border border-green-200">
                  已完成
                </Badge>
              )}
              {video.status === "error" && (
                <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border border-red-200">
                  处理失败
                </Badge>
              )}
              {video.status === "cancelled" && (
                <Badge className="bg-gray-50 text-gray-600 hover:bg-gray-50 border border-gray-200">
                  已取消
                </Badge>
              )}
              {video.status === "no-frames" && (
                <Badge className="bg-orange-50 text-orange-600 hover:bg-orange-50 border border-orange-200">
                  未找到合适帧
                </Badge>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-7 w-7 p-0">
                    <ArrowUpDown className="h-4 w-4" />
                    <span className="sr-only">操作菜单</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {video.status === "pending" && (
                    <DropdownMenuItem onClick={() => cancelProcessVideo(video.id)}>
                      <X className="mr-2 h-4 w-4" />
                      <span>取消</span>
                    </DropdownMenuItem>
                  )}
                  {(video.status === "error" || video.status === "no-frames" || video.status === "cancelled") && (
                    <DropdownMenuItem onClick={() => retryProcessVideo(video.id)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      <span>重试</span>
                    </DropdownMenuItem>
                  )}
                  {video.status === "completed" && video.thumbnails.length > 0 && (
                    <DropdownMenuItem onClick={() => downloadThumbnail(video.id, video.thumbnails[video.selectedThumbnail].id)}>
                      <Download className="mr-2 h-4 w-4" />
                      <span>下载缩略图</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => removeVideo(video.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>移除</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-3 pb-4">
          {/* 处理进度 */}
          {video.status === "processing" && (
            <div className="mb-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">处理进度</span>
                <span className="text-muted-foreground font-medium">{video.extractionProgress}%</span>
              </div>
              <Progress value={video.extractionProgress} className="h-2" />
            </div>
          )}
          
          {/* 缩略图展示 - 主图优先，更大的尺寸 */}
          {video.status === "completed" && video.thumbnails.length > 0 ? (
            <div className="space-y-3">
              {/* 混合式布局：主图区域 + 候选帧区域（3x3） */}
              <div className="space-y-2">
                {/* 标题和提示 */}
                <div className="flex justify-between items-center border-b pb-1 mb-1">
                  <h4 className="text-sm font-medium flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    视频缩略图
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    点击候选帧可设为主图
                  </span>
                </div>
                
                {/* 主图和候选帧混合布局 */}
                <div className="grid grid-cols-1 gap-3">
                  {/* 主图区域 */}
                  {hasMainThumbnail && (
                    <div className="mb-2">
                      <div className="text-xs font-medium mb-1 text-muted-foreground flex items-center">
                        <Star className="h-3.5 w-3.5 mr-1 text-yellow-500" />
                        主图（时间：{formatDuration(mainThumbnail!.timestamp)}）
                      </div>
                      <div className="relative aspect-video rounded-md overflow-hidden border-2 border-yellow-400 shadow-md hover:shadow-lg transition-shadow">
                        <img 
                          src={mainThumbnail!.url} 
                          alt="主图"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex justify-between items-center text-xs text-white">
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3 opacity-80" />
                            {formatDuration(mainThumbnail!.timestamp)}
                          </span>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 mr-1 text-yellow-400" />
                            <span>{Math.round(mainThumbnail!.quality)}</span>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 flex space-x-2">
                          <button
                            className="bg-black/60 text-white rounded-full p-1.5 opacity-80 hover:opacity-100 transition-opacity hover:bg-black/70"
                            onClick={() => openPreview(video.id, mainThumbnail!.id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="bg-black/60 text-white rounded-full p-1.5 opacity-80 hover:opacity-100 transition-opacity hover:bg-black/70"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadThumbnail(video.id, mainThumbnail!.id);
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="absolute top-2 left-2">
                          <span className="bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-sm font-medium">
                            主图
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 候选帧区域标题 */}
                  {candidateThumbnails.length > 0 && (
                    <div className="text-xs font-medium mb-1 text-muted-foreground flex items-center">
                      <Layers className="h-3.5 w-3.5 mr-1 text-blue-500" />
                      候选帧（点击设为主图）
                    </div>
                  )}
                  
                  {/* 候选帧区域 - 3x3或3x2网格，根据是否有主图调整 */}
                  <div className="grid grid-cols-3 gap-2">
                    {candidateThumbnails.map((thumbnail, idx) => (
                      <div 
                        key={thumbnail.id}
                        className="relative aspect-video rounded-md overflow-hidden cursor-pointer border hover:border-primary transition-all hover:shadow-md"
                        onClick={() => setAsMainThumbnail(video.id, thumbnail.id)}
                      >
                        <img 
                          src={thumbnail.url} 
                          alt={`缩略图 ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 flex justify-between items-center text-[10px] text-white">
                          <span className="flex items-center">
                            <Clock className="mr-0.5 h-2.5 w-2.5 opacity-80" />
                            {formatDuration(thumbnail.timestamp)}
                          </span>
                          <div className="flex items-center">
                            <Star className="h-2.5 w-2.5 mr-0.5 text-yellow-400" />
                            <span>{Math.round(thumbnail.quality)}</span>
                          </div>
                        </div>
                        
                        {/* 移除候选帧的悬停按钮 */}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : video.status === "error" ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 bg-red-50/50 rounded-lg border border-red-100">
              <AlertTriangle className="h-7 w-7 text-red-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium">处理失败</p>
                <p className="text-xs text-muted-foreground">
                  视频处理过程中发生错误，请重试
                </p>
              </div>
              <Button
                className="mt-2 text-xs h-7 px-3"
                onClick={() => retryProcessVideo(video.id)}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                重试
              </Button>
            </div>
          ) : video.status === "no-frames" ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 bg-orange-50/50 rounded-lg border border-orange-100">
              <AlertTriangle className="h-7 w-7 text-orange-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium">未找到合适帧</p>
                <p className="text-xs text-muted-foreground">
                  未能找到符合条件的视频帧，请调整设置后重试
                </p>
              </div>
              <Button
                className="mt-2 text-xs h-7 px-3"
                onClick={() => retryProcessVideo(video.id)}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                重试
              </Button>
            </div>
          ) : video.status === "cancelled" ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 bg-gray-50/50 rounded-lg border border-gray-100">
              <X className="h-7 w-7 text-gray-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium">已取消</p>
                <p className="text-xs text-muted-foreground">
                  视频处理已取消
                </p>
              </div>
              <Button 
                className="mt-2 text-xs h-7 px-3"
                onClick={() => retryProcessVideo(video.id)}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                重试
              </Button>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 bg-blue-50/30 rounded-lg border border-blue-100/50">
              <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-medium">等待处理</p>
                <p className="text-xs text-muted-foreground">
                  视频已加入处理队列，请等待
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
  
  // 渲染空状态
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-[400px] text-center p-8 bg-gray-50/50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <FileVideo className="h-8 w-8 text-primary" />
                                          </div>
      <h3 className="text-lg font-medium mb-2">没有视频</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        上传视频文件以提取缩略图，支持 MP4、WebM、AVI、MOV 等常见视频格式
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          className="flex items-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          上传视频
        </Button>
        <Button
          className="flex items-center"
          onClick={() => setShowHelpDialog(true)}
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          使用帮助
        </Button>
                                          </div>
                                        </div>
  )
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col space-y-6">
        {/* 标题区域 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center">
              <Film className="mr-2 h-6 w-6 text-primary" />
              视频缩略图提取器
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              从视频中提取高质量缩略图，避免字幕，优先选择有人物的画面
            </p>
                                            </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0 w-full sm:w-auto">
            <Button
              className="flex items-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              上传视频
            </Button>
            
            <Button
              className="flex items-center"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              设置
            </Button>
                                                          </div>
        </div>
        
        {/* 隐藏文件输入 */}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="video/*"
          multiple
          className="hidden"
        />
        
        {/* 批量操作工具栏 */}
        {videos.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {videos.length} 个视频
              </span>
              {videos.filter(v => v.status === "completed").length > 0 && (
                <Badge className="bg-green-50 text-green-600 hover:bg-green-50 border border-green-200">
                  {videos.filter(v => v.status === "completed").length} 已完成
                </Badge>
              )}
              {videos.filter(v => v.status === "pending" || v.status === "processing").length > 0 && (
                <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 border border-blue-200">
                  {videos.filter(v => v.status === "pending" || v.status === "processing").length} 处理中
                </Badge>
              )}
            </div>
                                        
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Button
                className="flex-1 sm:flex-none"
                onClick={handleBatchExtraction}
                disabled={isProcessing || videos.filter(v => v.status === "pending").length === 0}
              >
                <Play className="mr-2 h-4 w-4" />
                批量处理
              </Button>
                                            
              <Button
                className="flex-1 sm:flex-none"
                onClick={downloadAllThumbnails}
                disabled={videos.filter(v => v.status === "completed" && v.thumbnails.length > 0).length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                下载全部
              </Button>
              
              <Button
                className="flex-1 sm:flex-none"
                onClick={removeAllVideos}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                清空列表
              </Button>
            </div>
          </div>
        )}
        
        {/* 视频列表 - 修改为网格布局 */}
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredVideos().map(renderVideoCard)}
          </div>
        ) : (
          renderEmptyState()
        )}
    </div>
      
      {/* 渲染对话框 */}
      {renderSettingsDialog()}
      {renderHelpDialog()}
      {renderPreviewDialog()}
      
      {/* 添加样式 */}
      <style jsx global>{`
        .compact-card .thumbnail-grid {
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        }
      `}</style>
    </div>
  )
} 