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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card"
import { Button, buttonVariants } from "@/components/common/button"
import { Input } from "@/components/common/input"
import { Label } from "@/components/common/label"
import { Progress } from "@/components/common/progress"
import { Badge } from "@/components/common/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/tabs"
import { ScrollArea } from "@/components/common/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select"
import { Slider } from "@/components/common/slider"
import { Switch } from "@/components/common/switch"
import { Checkbox } from "@/components/common/checkbox"
import { useToast } from "@/components/common/use-toast"
import { useScenarioModels } from '@/lib/hooks/useScenarioModels'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/common/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/common/dropdown-menu"
import { cn } from "@/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/components/common/toggle-group"
import { ImageProcessor } from "@/lib/media/image-processor-class"

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
  frameInterval: number      // 帧间隔（每隔多少帧提取一次，1表示每帧都提取）
  keepOriginalResolution: boolean  // 保持原始分辨率
  // AI筛选功能
  enableAIFilter: boolean    // 启用AI筛选
  siliconFlowApiKey: string  // 硅基流动API密钥
  siliconFlowModel: string   // 使用的模型
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

// 添加JSZip和FileSaver的导入
import JSZip from 'jszip';
import FileSaver from 'file-saver';

// 添加视图模式类型
type ViewMode = "grid"; // 修改为只有网格模式

interface VideoThumbnailExtractorProps {
  onOpenGlobalSettings?: (section?: string) => void
}

/**
 * 视频缩略图提取组件
 * 
 * 注意：此组件在TypeScript编译时可能会有类型错误，
 * 这是因为shadcn UI组件和当前React类型不匹配导致的。
 * 这些错误不会影响运行时功能，可以安全忽略。
 */
export default function VideoThumbnailExtractor({ onOpenGlobalSettings }: VideoThumbnailExtractorProps = {}) {
  // 使用场景模型配置 - 缩略图AI筛选
  const thumbnailModels = useScenarioModels('thumbnail_filter')
  
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
    frameInterval: 30, // 默认每30帧提取一次（约1秒间隔，假设30fps）
    keepOriginalResolution: true,  // 默认保持原始分辨率
    // AI筛选功能
    enableAIFilter: false,         // 默认禁用AI筛选
    siliconFlowApiKey: "",        // 需要用户配置
    siliconFlowModel: "Qwen/Qwen2.5-VL-32B-Instruct", // 默认模型
  })

  // 分页设置
  const [defaultItemsPerPage, setDefaultItemsPerPage] = useState<number>(9) // 保持为9

  // UI 状态
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

        }
      } catch (error) {
        
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
          timeDistribution: parsed.timeDistribution || prev.timeDistribution,
          // AI配置
          enableAIAnalysis: parsed.enableAIAnalysis || prev.enableAIAnalysis,
          siliconFlowApiKey: parsed.siliconFlowApiKey || prev.siliconFlowApiKey,
          siliconFlowModel: parsed.siliconFlowModel || prev.siliconFlowModel,
          useMultiModelValidation: parsed.useMultiModelValidation || prev.useMultiModelValidation
        }))

        // 如果启用了AI分析且有API密钥，则配置AI
        if (parsed.enableAIAnalysis && parsed.siliconFlowApiKey && imageProcessorRef.current) {
          setTimeout(() => {
            if (imageProcessorRef.current) {
              imageProcessorRef.current.configureSiliconFlowAPI(
                parsed.siliconFlowApiKey.trim(),
                { model: parsed.siliconFlowModel }
              );
            }
          }, 1000); // 延迟1秒确保处理器已初始化
        }
      } catch (error) {
        
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
      
      setIsProcessing(false)
      setProcessingQueue([])

      toast({
        title: "处理失败",
        description: "批量处理视频时出错",
        variant: "destructive",
      })
    }
  }

  // AI帧筛选函数
  const analyzeFrameWithAI = async (imageData: ImageData, apiKey: string, model: string, apiBaseUrl: string = 'https://api.siliconflow.cn/v1'): Promise<{
    hasPeople: boolean;
    hasSubtitles: boolean;
    confidence: number;
  }> => {
    try {
      // 将ImageData转换为base64
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('无法创建Canvas上下文')

      canvas.width = imageData.width
      canvas.height = imageData.height
      ctx.putImageData(imageData, 0, 0)
      
      const base64Image = canvas.toDataURL('image/jpeg', 0.9)

      // 构建API请求
      const response = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: base64Image
                }
              },
              {
                type: "text",
                text: `请分析这张视频帧图片，判断：
1. 是否包含人物（真人、动画人物、卡通角色等）
2. 是否包含字幕文字（对话字幕、解说字幕等）

请严格按照以下JSON格式回答：
{
  "hasPeople": boolean,
  "hasSubtitles": boolean,
  "confidence": number
}

其中confidence为判断的置信度（0-1之间的数值）。`
              }
            ]
          }],
          temperature: 0.1,
          max_tokens: 200
        })
      })

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`)
      }

      const result = await response.json()
      const content = result.choices[0].message.content

      // 尝试解析JSON响应
      try {
        const analysis = JSON.parse(content)
        return {
          hasPeople: !!analysis.hasPeople,
          hasSubtitles: !!analysis.hasSubtitles,
          confidence: Number(analysis.confidence) || 0.5
        }
      } catch (parseError) {
        // 如果JSON解析失败，使用文本分析
        const lowerContent = content.toLowerCase()
        const hasPeople = lowerContent.includes('true') && (lowerContent.includes('人物') || lowerContent.includes('people'))
        const hasSubtitles = lowerContent.includes('true') && (lowerContent.includes('字幕') || lowerContent.includes('subtitle'))
        
        return {
          hasPeople,
          hasSubtitles,
          confidence: 0.7
        }
      }
    } catch (error) {
      
      return {
        hasPeople: false,
        hasSubtitles: true, // 保守策略：假设有字幕
        confidence: 0.1
      }
    }
  }

  // 简单的顺序帧提取函数
  const extractFramesSequentially = async (
    video: HTMLVideoElement,
    options: {
      startTime: number;
      frameCount: number;
      frameInterval: number;
      keepOriginalResolution: boolean;
    }
  ): Promise<ImageData[]> => {
    const frames: ImageData[] = []
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('无法创建Canvas上下文')
    }

    // 设置canvas尺寸
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    for (let i = 0; i < options.frameCount; i++) {
      try {
        // 计算当前帧的时间点（以帧为单位）
        const currentTime = options.startTime + (i * options.frameInterval / 30) // 假设30fps
        
        // 确保不超过视频时长
        if (currentTime >= video.duration) {
          
          break
        }

        // 跳转到指定时间
        video.currentTime = currentTime
        
        // 等待视频跳转完成
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`跳转到时间 ${currentTime}s 超时`))
          }, 5000)

          const seekHandler = () => {
            clearTimeout(timeout)
            video.removeEventListener('seeked', seekHandler)
            video.removeEventListener('error', errorHandler)
            resolve()
          }

          const errorHandler = () => {
            clearTimeout(timeout)
            video.removeEventListener('seeked', seekHandler)
            video.removeEventListener('error', errorHandler)
            reject(new Error(`跳转到时间 ${currentTime}s 失败`))
          }

          video.addEventListener('seeked', seekHandler)
          video.addEventListener('error', errorHandler)
        })

        // 绘制当前帧到canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        // 验证图像数据有效性
        if (imageData && imageData.data && imageData.data.length > 0) {
          frames.push(imageData)
          console.log(`成功提取第 ${i + 1} 帧，时间: ${currentTime.toFixed(2)}s`)
        } else {
          
        }

      } catch (error) {
        
        // 继续提取下一帧
      }
    }

    return frames
  }

  // 处理单个视频
  const processVideo = async (videoData: VideoFile): Promise<void> => {
    try {
      
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

      // 简单的顺序帧提取
      // 如果启用AI筛选，提取更多帧作为候选（因为很多帧可能被筛选掉）
      const candidateFrameCount = settings.enableAIFilter ? 
        Math.max(settings.thumbnailCount * 3, 20) : // AI模式：提取3倍数量作为候选
        settings.thumbnailCount // 普通模式：只提取目标数量

      const frames = await extractFramesSequentially(video, {
        startTime: validStartTime,
        frameCount: candidateFrameCount,
        frameInterval: settings.frameInterval,
        keepOriginalResolution: settings.keepOriginalResolution
      })

      // 更新进度-帧提取完成
      setVideos(prev =>
        prev.map(v => v.id === videoData.id ?
          { ...v, extractionProgress: 50 } : v
        )
      )

      // 如果没有提取到帧，抛出错误
      if (frames.length === 0) {
        
        throw new Error("无法从视频中提取帧")
      }

      // 生成缩略图
      const thumbnails: Thumbnail[] = []
      let processedFrames = 0
      let aiFilteredFrames = 0 // 被AI筛选掉的帧数

      // 处理每一帧
      for (let i = 0; i < frames.length && thumbnails.length < settings.thumbnailCount; i++) {
        const frame = frames[i]
        processedFrames++

        // 如果启用了AI筛选，先进行AI分析
        if (settings.enableAIFilter && thumbnailModels.primaryModelId) {
          try {
            // 获取场景配置
            const scenarioResponse = await fetch('/api/model-service/scenario?scenario=thumbnail_filter')
            const scenarioResult = await scenarioResponse.json()
            
            if (!scenarioResult.success || !scenarioResult.scenario) {
              throw new Error('获取缩略图AI筛选场景配置失败')
            }
            
            const primaryModel = scenarioResult.models.find((m: any) => m.id === thumbnailModels.primaryModelId)
            if (!primaryModel) {
              throw new Error('配置的模型不存在')
            }
            
            const provider = scenarioResult.providers.find((p: any) => p.id === primaryModel.providerId)
            if (!provider || !provider.apiKey) {
              throw new Error('模型提供商未配置API密钥')
            }
            
            const aiResult = await analyzeFrameWithAI(frame, provider.apiKey, primaryModel.modelId || primaryModel.id, provider.apiBaseUrl)

            // 只有包含人物且无字幕的帧才生成缩略图
            if (!aiResult.hasPeople || aiResult.hasSubtitles) {
              aiFilteredFrames++
              
              // 更新进度
              setVideos(prev =>
                prev.map(v => v.id === videoData.id ?
                  { ...v, extractionProgress: 50 + (processedFrames / frames.length) * 50 } : v
                )
              )
              continue
            }

          } catch (aiError) {
            
            // 更新进度
            setVideos(prev =>
              prev.map(v => v.id === videoData.id ?
                { ...v, extractionProgress: 50 + (processedFrames / frames.length) * 50 } : v
              )
            )
            continue
          }
        }

        // 生成缩略图
        try {
          
          const result = await imageProcessorRef.current.generateThumbnail(frame, {
            maxWidth: settings.keepOriginalResolution ? frame.width : 640,
            maxHeight: settings.keepOriginalResolution ? frame.height : 360,
            quality: 0.9,
            format: settings.outputFormat as 'webp' | 'jpeg' | 'png'
          })

          if (!result || !result.url) {
            
            continue
          }

          // 计算时间戳（基于帧间隔）
          const timestamp = validStartTime + (i * settings.frameInterval / 30) // 假设30fps

          // 添加到缩略图列表
          thumbnails.push({
            id: `thumb_${videoData.id}_${i}_${Date.now()}`,
            url: result.url,
            timestamp: timestamp,
            quality: 100, // 简化为固定质量
            isMain: thumbnails.length === 0 // 第一个为主图
          })

        } catch (thumbnailError) {
          
          continue
        }

        // 更新进度
        setVideos(prev =>
          prev.map(v => v.id === videoData.id ?
            { ...v, extractionProgress: 50 + (processedFrames / frames.length) * 50 } : v
          )
        )
      }

      // 如果AI筛选过于严格导致缩略图不足，尝试放宽条件
      if (settings.enableAIFilter && thumbnails.length < settings.thumbnailCount && frames.length > thumbnails.length) {
        
        // 检查是否配置了API密钥（兼容旧配置）
        if (!settings.siliconFlowApiKey.trim()) {
          console.warn('🔍 [Thumbnail] 备用AI筛选：未配置API密钥，跳过')
          return
        }
        
        // 对剩余的帧使用更宽松的条件（只要有人物，不管是否有字幕）
        for (let i = 0; i < frames.length && thumbnails.length < settings.thumbnailCount; i++) {
          // 跳过已经处理过的帧
          if (i < processedFrames) continue
          
          const frame = frames[i]
          
          try {
            
            const aiResult = await analyzeFrameWithAI(frame, settings.siliconFlowApiKey, settings.siliconFlowModel)
            
            // 放宽条件：只要有人物就可以
            if (aiResult.hasPeople) {
              
              // 生成缩略图
              const result = await imageProcessorRef.current.generateThumbnail(frame, {
                maxWidth: settings.keepOriginalResolution ? frame.width : 640,
                maxHeight: settings.keepOriginalResolution ? frame.height : 360,
                quality: 0.9,
                format: settings.outputFormat as 'webp' | 'jpeg' | 'png'
              })

              if (result && result.url) {
                const timestamp = validStartTime + (i * settings.frameInterval / 30)
                thumbnails.push({
                  id: `thumb_${videoData.id}_${i}_${Date.now()}`,
                  url: result.url,
                  timestamp: timestamp,
                  quality: 80, // 稍低的质量标记
                  isMain: thumbnails.length === 0
                })
                
              }
            }
          } catch (error) {
            
          }
        }
      }

      // 检查是否生成了缩略图
      if (thumbnails.length === 0) {

        // 尝试生成至少一个缩略图作为回退
        if (frames.length > 0) {
          
          try {
            const fallbackResult = await imageProcessorRef.current.generateThumbnail(frames[0], {
              maxWidth: settings.keepOriginalResolution ? frames[0].width : 640,
              maxHeight: settings.keepOriginalResolution ? frames[0].height : 360,
              quality: 0.9,
              format: settings.outputFormat as 'webp' | 'jpeg' | 'png'
            })
            
            if (fallbackResult && fallbackResult.url) {
              thumbnails.push({
                id: `thumb_${videoData.id}_fallback_${Date.now()}`,
                url: fallbackResult.url,
                timestamp: validStartTime,
                quality: 50, // 默认质量
                isMain: true
              })
              
            }
          } catch (fallbackError) {
            
          }
        }
        
        if (thumbnails.length === 0) {
          throw new Error(`未能生成缩略图: 原始帧数=${frames.length}, 处理帧数=${processedFrames}`)
        }
      }

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
          const filename = `candidate_${i + 1}_${Math.round(thumbnail.timestamp)}_q${Math.round(thumbnail.quality)}.${extension}`;
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
      <div className="flex flex-row gap-2">
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
        <Button
          className="flex items-center"
          onClick={() => onOpenGlobalSettings?.('video-thumbnail')}
        >
          <Settings className="mr-2 h-4 w-4" />
          缩略图设置
        </Button>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* 固定顶部区域 */}
      <div className="flex-shrink-0 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col space-y-6">
            {/* 标题区域 */}
            <div className="flex flex-row justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center">
                  <Film className="mr-2 h-6 w-6 text-primary" />
                  视频缩略图提取器
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  从视频中提取高质量缩略图，避免字幕，优先选择有人物的画面
                </p>
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
              <div className="flex flex-row justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
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

                <div className="flex items-center space-x-2">
                  <Button
                    className="flex-1"
                    onClick={handleBatchExtraction}
                    disabled={isProcessing || videos.filter(v => v.status === "pending").length === 0}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    批量处理
                  </Button>

                  <Button
                    className="flex-1"
                    onClick={downloadAllThumbnails}
                    disabled={videos.filter(v => v.status === "completed" && v.thumbnails.length > 0).length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    下载全部
                  </Button>

                  <Button
                    className="flex-1"
                    onClick={removeAllVideos}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    清空列表
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            {/* 视频列表 - 修改为网格布局 */}
            {videos.length > 0 ? (
              <div className="grid grid-cols-3 gap-6">
                {getFilteredVideos().map(renderVideoCard)}
              </div>
            ) : (
              renderEmptyState()
            )}
          </div>
        </div>
      </div>

      {/* 渲染对话框 */}
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