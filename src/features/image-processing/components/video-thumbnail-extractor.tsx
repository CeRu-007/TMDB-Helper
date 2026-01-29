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
  Eye,
  X,
  AlertTriangle,
  Layers,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Progress } from "@/shared/components/ui/progress"
import { Badge } from "@/shared/components/ui/badge"
import { useToast } from "@/shared/components/ui/use-toast"
import { useScenarioModels } from '@/shared/lib/hooks/useScenarioModels'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { ImageProcessor } from "@/lib/media/image-processor-class"
import JSZip from 'jszip'
import FileSaver from 'file-saver'

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
}

// 缩略图接口
interface Thumbnail {
  id: string
  url: string
  timestamp: number
  quality: number
  isMain: boolean
}

// 提取设置接口
interface ExtractionSettings {
  startTime: number
  threadCount: number
  outputFormat: "jpg" | "png"
  thumbnailCount: number
  frameInterval: number
  keepOriginalResolution: boolean
  enableAIFilter: boolean
  siliconFlowApiKey: string
  siliconFlowModel: string
}

// 预览数据接口
interface PreviewData {
  url: string
  filename: string
  videoId: string
  thumbnailId: string
}

// 模型状态接口
interface ModelStatus {
  subtitle: "loading" | "ready" | "error"
  person: "loading" | "ready" | "error"
}

// 默认设置
const DEFAULT_SETTINGS: ExtractionSettings = {
  startTime: 0,
  threadCount: 2,
  outputFormat: "jpg",
  thumbnailCount: 9,
  frameInterval: 30,
  keepOriginalResolution: true,
  enableAIFilter: false,
  siliconFlowApiKey: "",
  siliconFlowModel: "Qwen/Qwen2.5-VL-32B-Instruct"
}

const DEFAULT_ITEMS_PER_PAGE = 9

interface VideoThumbnailExtractorProps {
  onOpenGlobalSettings?: (section?: string) => void
}

export default function VideoThumbnailExtractor({ onOpenGlobalSettings }: VideoThumbnailExtractorProps = {}) {
  const thumbnailModels = useScenarioModels('thumbnail_filter')
  const { toast } = useToast()

  // 视频列表
  const [videos, setVideos] = useState<VideoFile[]>([])

  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false)
  const [totalProgress, setTotalProgress] = useState(0)
  const [processingQueue, setProcessingQueue] = useState<string[]>([])

  // 排序和过滤
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name")
  const [filterBy, setFilterBy] = useState<"all" | "completed" | "processing" | "pending">("all")

  // 设置
  const [settings, setSettings] = useState<ExtractionSettings>(DEFAULT_SETTINGS)

  // UI 状态
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    subtitle: "loading",
    person: "loading"
  })
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  // 处理器状态
  const [processorReady, setProcessorReady] = useState<boolean>(false)
  const [processorInitialized, setProcessorInitialized] = useState(false)
  const [processorError, setProcessorError] = useState<string | null>(null)

  // 引用
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropAreaRef = useRef<HTMLDivElement>(null)
  const imageProcessorRef = useRef<ImageProcessor | null>(null)

  // 加载处理器和设置
  useEffect(() => {
    const initProcessor = async () => {
      setModelStatus({ subtitle: "loading", person: "loading" })

      try {
        if (typeof window !== 'undefined') {
          const processor = ImageProcessor.getInstance()
          await processor.initialize()
          imageProcessorRef.current = processor
          setModelStatus({ subtitle: "ready", person: "ready" })
          setProcessorInitialized(true)
          setProcessorReady(true)
        }
      } catch (error) {
        setModelStatus({ subtitle: "error", person: "error" })
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
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          startTime: Number(parsed.startTime ?? DEFAULT_SETTINGS.startTime),
          threadCount: Number(parsed.threadCount ?? DEFAULT_SETTINGS.threadCount),
          thumbnailCount: Number(parsed.thumbnailCount ?? DEFAULT_SETTINGS.thumbnailCount),
          frameInterval: Number(parsed.frameInterval ?? DEFAULT_SETTINGS.frameInterval),
          keepOriginalResolution: parsed.keepOriginalResolution ?? DEFAULT_SETTINGS.keepOriginalResolution,
          enableAIFilter: parsed.enableAIFilter ?? DEFAULT_SETTINGS.enableAIFilter,
          siliconFlowApiKey: parsed.siliconFlowApiKey ?? DEFAULT_SETTINGS.siliconFlowApiKey,
          siliconFlowModel: parsed.siliconFlowModel ?? DEFAULT_SETTINGS.siliconFlowModel
        })
      } catch (error) {
        console.error('加载设置失败:', error)
      }
    }
  }, [toast])

  // 监听处理器错误
  useEffect(() => {
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
    const isReady = modelStatus.subtitle === "ready" && modelStatus.person === "ready"
    const isError = modelStatus.subtitle === "error" || modelStatus.person === "error"

    if (isReady) {
      toast({
        title: "模型加载完成",
        description: "可以开始处理视频",
        variant: "default",
      })
    } else if (isError) {
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
    const videoFiles = files.filter(file => file.type.startsWith('video/'))

    if (videoFiles.length === 0) {
      toast({
        title: "没有视频文件",
        description: "请上传视频文件 (MP4, WebM, AVI 等)",
        variant: "destructive",
      })
      return
    }

    const newVideos: VideoFile[] = videoFiles.map(file => ({
      id: `video-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      file,
      name: file.name,
      size: file.size,
      duration: 0,
      resolution: "",
      url: URL.createObjectURL(file),
      thumbnails: [],
      selectedThumbnail: 0,
      extractionProgress: 0,
      status: "pending"
    }))

    setVideos(prev => [...prev, ...newVideos])

    if (!isProcessing && processorReady) {
      setTimeout(() => handleBatchExtraction(), 500)
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return "未知"

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // 批量处理视频
  const handleBatchExtraction = async () => {
    if (isProcessing) return

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

  // 队列处理函数
  const processQueue = async (videos: VideoFile[]) => {
    const queue = [...videos.map(v => v.id)]
    setProcessingQueue(queue)

    const concurrentLimit = Math.max(1, Math.min(settings.threadCount, 8))
    let activeCount = 0
    let completedCount = 0

    const processNext = async () => {
      if (queue.length === 0) {
        if (completedCount === videos.length) {
          setTotalProgress(100)
        }
        return
      }

      if (activeCount >= concurrentLimit) return

      activeCount++
      const videoId = queue.shift()!
      const video = videos.find(v => v.id === videoId)

      if (!video || video.status !== "pending") {
        activeCount--
        processNext()
        return
      }

      setVideos(prev =>
        prev.map(v => v.id === videoId ? { ...v, status: "processing", extractionProgress: 0 } : v)
      )

      try {
        await processVideo(video)
        completedCount++
        setTotalProgress(Math.floor((completedCount / videos.length) * 100))
      } catch (error) {
        completedCount++
        setTotalProgress(Math.floor((completedCount / videos.length) * 100))
      } finally {
        activeCount--
        processNext()

        if (activeCount === 0 && queue.length === 0) {
          setIsProcessing(false)
          setProcessingQueue([])
        }
      }
    }

    const initialBatch = Math.min(concurrentLimit, queue.length)
    for (let i = 0; i < initialBatch; i++) {
      processNext()
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

  // 处理单个视频
  const processVideo = async (videoData: VideoFile): Promise<void> => {
    try {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = videoData.url

      await loadVideoMetadata(video)

      const duration = video.duration || 0
      const resolution = video.videoWidth && video.videoHeight ?
        `${video.videoWidth}x${video.videoHeight}` : "未知"

      setVideos(prev =>
        prev.map(v => v.id === videoData.id ?
          { ...v, duration, resolution, extractionProgress: 10 } : v
        )
      )

      if (!imageProcessorRef.current || !processorInitialized) {
        throw new Error("图像处理器未初始化")
      }

      const validStartTime = Math.min(
        Math.max(0, settings.startTime),
        Math.max(0, duration - 1)
      )
      const availableDuration = Math.max(0, duration - validStartTime)

      const candidateFrameCount = settings.enableAIFilter ?
        Math.max(settings.thumbnailCount * 4, 20) :
        Math.max(settings.thumbnailCount * 3, 15)

      const frames = await imageProcessorRef.current.extractFramesFromVideo(video, {
        startTime: validStartTime,
        frameCount: candidateFrameCount,
        interval: 'keyframes',
        keepOriginalResolution: settings.keepOriginalResolution,
        enhancedFrameDiversity: true,
        useAIPrefilter: false
      })

      setVideos(prev =>
        prev.map(v => v.id === videoData.id ?
          { ...v, extractionProgress: 50 } : v
        )
      )

      if (frames.length === 0) {
        throw new Error("无法从视频中提取帧")
      }

      const scenarioData = await validateAIConfig()

      const thumbnails = await generateThumbnails(
        frames,
        videoData.id,
        validStartTime,
        availableDuration,
        scenarioData
      )

      if (thumbnails.length === 0 && frames.length > 0) {
        await generateFallbackThumbnail(frames[0], validStartTime, videoData.id)
      }

      setVideos(prev =>
        prev.map(v => v.id === videoData.id ?
          {
            ...v,
            status: "completed",
            extractionProgress: 100,
            thumbnails,
            selectedThumbnail: 0
          } : v
        )
      )
    } catch (error) {
      setVideos(prev =>
        prev.map(v => v.id === videoData.id ?
          { ...v, status: "error", extractionProgress: 0 } : v
        )
      )
      throw error
    }
  }

  // 加载视频元数据
  const loadVideoMetadata = (video: HTMLVideoElement): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("视频元数据加载超时"))
      }, 10000)

      const loadHandler = () => {
        clearTimeout(timeout)
        video.removeEventListener('loadedmetadata', loadHandler)
        video.removeEventListener('error', errorHandler)
        resolve()
      }

      const errorHandler = () => {
        clearTimeout(timeout)
        video.removeEventListener('loadedmetadata', loadHandler)
        video.removeEventListener('error', errorHandler)
        reject(new Error("视频加载失败"))
      }

      video.addEventListener('loadedmetadata', loadHandler)
      video.addEventListener('error', errorHandler)

      if (video.readyState >= 2) {
        clearTimeout(timeout)
        video.removeEventListener('loadedmetadata', loadHandler)
        video.removeEventListener('error', errorHandler)
        resolve()
      }
    })
  }

  // 验证AI配置
  const validateAIConfig = async () => {
    if (!settings.enableAIFilter) return null

    if (!thumbnailModels.primaryModelId || thumbnailModels.availableModels.length === 0) {
      throw new Error("已启用 AI 筛选，但缩略图筛选场景未配置模型。请在设置 > 模型服务 > 使用场景中配置缩略图筛选模型，或关闭 AI 筛选功能。")
    }

    const scenarioResponse = await fetch('/api/model-service/scenario?scenario=thumbnail_filter')
    const scenarioResult = await scenarioResponse.json()

    if (!scenarioResult.success || !scenarioResult.scenario) {
      throw new Error("获取缩略图筛选场景配置失败")
    }

    return scenarioResult
  }

  // 生成缩略图
  const generateThumbnails = async (
    frames: ImageData[],
    videoId: string,
    validStartTime: number,
    availableDuration: number,
    scenarioData: any
  ): Promise<Thumbnail[]> => {
    const thumbnails: Thumbnail[] = []
    let processedFrames = 0

    for (let i = 0; i < frames.length && thumbnails.length < settings.thumbnailCount; i++) {
      const frame = frames[i]
      processedFrames++

      try {
        if (settings.enableAIFilter && scenarioData) {
          const shouldSkip = await checkShouldSkipFrame(frame, scenarioData)
          if (shouldSkip) {
            updateProgress(videoId, processedFrames, frames.length)
            continue
          }
        }

        const result = await imageProcessorRef.current!.generateThumbnail(frame, {
          maxWidth: settings.keepOriginalResolution ? frame.width : 640,
          maxHeight: settings.keepOriginalResolution ? frame.height : 360,
          quality: 0.9,
          format: settings.outputFormat as 'webp' | 'jpeg' | 'png'
        })

        if (!result || !result.url) continue

        const estimatedTimestamp = validStartTime + (i * availableDuration / frames.length)

        thumbnails.push({
          id: `thumb_${videoId}_${i}_${Date.now()}`,
          url: result.url,
          timestamp: estimatedTimestamp,
          quality: 100,
          isMain: thumbnails.length === 0
        })

        updateProgress(videoId, processedFrames, frames.length)
      } catch (error) {
        console.warn('处理帧失败，跳过此帧:', error)
        continue
      }
    }

    return thumbnails
  }

  // 检查是否应该跳过帧
  const checkShouldSkipFrame = async (frame: ImageData, scenarioData: any): Promise<boolean> => {
    const primaryModelId = scenarioData.scenario.primaryModelId
    const primaryModel = scenarioData.models.find((m: any) => m.id === primaryModelId)
    const provider = scenarioData.providers.find((p: any) => p.id === primaryModel!.providerId)

    if (!provider || !primaryModel) {
      throw new Error("模型配置异常，请重新配置缩略图筛选场景")
    }

    const aiResult = await analyzeFrameWithAI(
      frame,
      provider.apiKey,
      primaryModel.modelId || primaryModel.id,
      provider.apiBaseUrl
    )

    return !aiResult.hasPeople || aiResult.hasSubtitles
  }

  // 更新进度
  const updateProgress = (videoId: string, processedFrames: number, totalFrames: number) => {
    setVideos(prev =>
      prev.map(v => v.id === videoId ?
        { ...v, extractionProgress: 50 + (processedFrames / totalFrames) * 50 } : v
      )
    )
  }

  // 生成回退缩略图
  const generateFallbackThumbnail = async (
    frame: ImageData,
    validStartTime: number,
    videoId: string
  ): Promise<void> => {
    const result = await imageProcessorRef.current!.generateThumbnail(frame, {
      maxWidth: settings.keepOriginalResolution ? frame.width : 640,
      maxHeight: settings.keepOriginalResolution ? frame.height : 360,
      quality: 0.9,
      format: settings.outputFormat as 'webp' | 'jpeg' | 'png'
    })

    if (result && result.url) {
      setVideos(prev =>
        prev.map(v => v.id === videoId ? {
          ...v,
          thumbnails: [{
            id: `thumb_${videoId}_fallback_${Date.now()}`,
            url: result.url,
            timestamp: validStartTime,
            quality: 50,
            isMain: true
          }]
        } : v)
      )
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

    const baseFilename = video.name.replace(/\.[^.]+$/, '')
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
        if (v.id !== videoId) return v

        const thumbnailIndex = v.thumbnails.findIndex(t => t.id === thumbnailId)
        if (thumbnailIndex === -1) return v

        const updatedThumbnails = v.thumbnails.map(t => ({
          ...t,
          isMain: t.id === thumbnailId
        }))

        return {
          ...v,
          thumbnails: updatedThumbnails,
          selectedThumbnail: thumbnailIndex
        }
      })
    )

    toast({
      title: "已设为主图",
      description: "此缩略图将作为下载全部时的主要图片",
      variant: "default",
    })
  }

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

    if (completedVideos.length === 1 && completedVideos[0].thumbnails.length === 1) {
      const video = completedVideos[0]
      downloadThumbnail(video.id, video.thumbnails[0].id)
      return
    }

    toast({
      title: "正在准备下载",
      description: "正在打包所有缩略图...",
      variant: "default",
    })

    try {
      const zip = new JSZip()
      const imgFolder = zip.folder("thumbnails")

      if (!imgFolder) {
        throw new Error("创建ZIP文件夹失败")
      }

      for (const video of completedVideos) {
        const videoFolder = imgFolder.folder(video.name.replace(/[\\/:*?"<>|]/g, "_"))

        if (!videoFolder) continue

        const mainThumbnail = video.thumbnails.find(t => t.isMain)
        const candidateThumbnails = video.thumbnails.filter(t => !t.isMain)

        if (mainThumbnail) {
          const blob = await fetch(mainThumbnail.url).then(r => r.blob())
          const extension = settings.outputFormat === "jpg" ? "jpg" : settings.outputFormat
          videoFolder.file(
            `main_${Math.round(mainThumbnail.timestamp)}_q${Math.round(mainThumbnail.quality)}.${extension}`,
            blob
          )
        }

        for (let i = 0; i < candidateThumbnails.length; i++) {
          const thumbnail = candidateThumbnails[i]
          const blob = await fetch(thumbnail.url).then(r => r.blob())
          const extension = settings.outputFormat === "jpg" ? "jpg" : settings.outputFormat
          videoFolder.file(
            `candidate_${i + 1}_${Math.round(thumbnail.timestamp)}_q${Math.round(thumbnail.quality)}.${extension}`,
            blob
          )
        }
      }

      const content = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      }, (metadata) => {
        const progress = Math.round(metadata.percent)
        if (progress % 10 === 0) {
          toast({
            title: "打包进度",
            description: `${progress}%`,
            variant: "default",
          })
        }
      })

      FileSaver.saveAs(content, `thumbnails_${new Date().toISOString().slice(0, 10)}.zip`)

      toast({
        title: "下载完成",
        description: "所有缩略图已打包下载",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "下载失败",
        description: "打包缩略图时出错",
        variant: "destructive",
      })
    }
  }

  // 移除视频
  const removeVideo = (videoId: string) => {
    setVideos(prev => {
      const videoToRemove = prev.find(v => v.id === videoId)
      if (videoToRemove) {
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

    if (!isProcessing) {
      handleBatchExtraction()
    }
  }

  // 取消处理视频
  const cancelProcessVideo = (videoId: string) => {
    setVideos(prev =>
      prev.map(v => v.id === videoId ?
        { ...v, status: "cancelled", extractionProgress: 0 } : v
      )
    )

    setProcessingQueue(prev => prev.filter(id => id !== videoId))
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
    let filteredList = [...videos]

    if (filterBy !== "all") {
      filteredList = filteredList.filter(v => v.status === filterBy)
    }

    switch (sortBy) {
      case "name":
        filteredList.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "date":
        filteredList.sort((a, b) => a.id.localeCompare(b.id))
        break
      case "size":
        filteredList.sort((a, b) => b.size - a.size)
        break
    }

    return filteredList
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