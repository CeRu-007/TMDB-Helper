"use client"

import { useState, useCallback, useRef } from "react"
import { VideoProcessor, type ProcessProgress } from "@/lib/media/video-processor"
import { logger } from '@/lib/utils/logger'

interface BoundingBox {
  id: string
  x: number
  y: number
  width: number
  height: number
}

interface SubtitleEntry {
  id: string
  index: number
  startTime: string
  endTime: string
  text: string
  confidence: number
}

interface ExtractedFrame {
  timestamp: number
  imageUrl: string
  recognizedText: string
  confidence: number
}

interface Config {
  vadThreshold: number
  minSpeechDuration: number
  silenceThreshold: number
  sampleInterval: number
  useVAD: boolean
  ocrModelId: string
}

interface UseHardSubtitleReturn {
  // 状态
  videoFile: File | null
  videoUrl: string
  isPlaying: boolean
  currentTime: number
  duration: number
  subtitleRegions: BoundingBox[]
  config: Config
  subtitles: SubtitleEntry[]
  isProcessing: boolean
  progress: number
  extractedFrames: ExtractedFrame[]
  statusMessage: string

  // 方法
  handleVideoUpload: (file: File) => void
  handleVideoUrlChange: (url: string) => void
  handlePlayPause: () => void
  handleSeek: (time: number) => void
  addSubtitleRegion: (region: Omit<BoundingBox, "id">) => void
  removeSubtitleRegion: (id: string) => void
  updateSubtitleRegion: (id: string, region: Partial<BoundingBox>) => void
  startExtraction: () => void
  cancelExtraction: () => void
  clearResults: () => void
  exportSRT: () => void
}

export function useHardSubtitle(): UseHardSubtitleReturn {
  // 视频文件
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>("")

  // 播放状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // 字幕区域
  const [subtitleRegions, setSubtitleRegions] = useState<BoundingBox[]>([])

  // 配置
  const [config, setConfig] = useState<Config>(() => {
    // 从 localStorage 加载保存的配置
    const savedConfig = localStorage.getItem('hard-subtitle-config')
    const defaultConfig = {
      vadThreshold: 15,
      minSpeechDuration: 0.1,
      silenceThreshold: 1.5,
      sampleInterval: 2.0,
      useVAD: true,
      ocrModelId: ""
    }

    logger.debug('[Config] localStorage保存的配置:', savedConfig)

    if (savedConfig && savedConfig !== 'undefined' && savedConfig !== 'null') {
      try {
        const parsed = JSON.parse(savedConfig)
        logger.debug('[Config] 解析后的配置:', parsed)
        return { ...defaultConfig, ...parsed }
      } catch (e) {
        logger.error('加载保存的配置失败:', e)
        return defaultConfig
      }
    }
    logger.debug('[Config] 使用默认配置')
    return defaultConfig
  })

  // 保存配置到 localStorage
  const saveConfig = useCallback((newConfig: Config | ((prev: Config) => Config)) => {
    const updatedConfig = typeof newConfig === 'function' 
      ? newConfig(config)
      : newConfig
    logger.debug('[Config] 保存配置到 localStorage:', updatedConfig)
    localStorage.setItem('hard-subtitle-config', JSON.stringify(updatedConfig))
    setConfig(updatedConfig)
  }, [config])

  // 字幕结果
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([])
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([])

  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [totalTime, setTotalTime] = useState<number>(0) // 总耗时（秒）

  // 处理器实例
  const processorRef = useRef<VideoProcessor | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // 处理视频上传
  const handleVideoUpload = useCallback((file: File) => {
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setCurrentTime(0)
    setDuration(0)
    setSubtitles([])
    setExtractedFrames([])
    setProgress(0)
    setStatusMessage("")
  }, [])

  // 处理视频URL输入
  const handleVideoUrlChange = useCallback((url: string) => {
    setVideoUrl(url)
    setVideoFile(null)
    setCurrentTime(0)
    setDuration(0)
    setSubtitles([])
    setExtractedFrames([])
    setProgress(0)
    setStatusMessage("")
  }, [])

  // 播放/暂停
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  // 跳转
  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])

  // 添加字幕区域
  const addSubtitleRegion = useCallback((region: Omit<BoundingBox, "id">) => {
    const newRegion: BoundingBox = {
      ...region,
      id: `region-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    }
    setSubtitleRegions((prev) => [...prev, newRegion])
  }, [])

  // 移除字幕区域
  const removeSubtitleRegion = useCallback((id: string) => {
    setSubtitleRegions((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // 更新字幕区域
  const updateSubtitleRegion = useCallback((id: string, region: Partial<BoundingBox>) => {
    setSubtitleRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...region } : r))
    )
  }, [])

  // 设置视频元素引用
  const setVideoElementRef = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video
  }, [])

  // 开始提取
  const startExtraction = useCallback(async () => {
    if (!videoFile && !videoUrl) {
      logger.error("视频元素未找到")
      return
    }

    if (subtitleRegions.length === 0) {
      logger.error("请先添加字幕区域")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setSubtitles([])
    setExtractedFrames([])
    setStatusMessage("正在初始化...")

    // 记录开始时间
    const startTime = Date.now()

    // 创建处理器
    processorRef.current = new VideoProcessor({
      vadThreshold: config.vadThreshold / 100, // 转换为 0-1
      minSpeechDuration: config.minSpeechDuration,
      maxSilenceDuration: config.silenceThreshold,
      sampleInterval: config.sampleInterval,
      useVAD: config.useVAD,
      ocrModelId: config.ocrModelId,
      subtitleRegions: subtitleRegions.map(r => ({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height
      }))
    })

    // 用于存储实时识别的字幕
    const recognizedSubtitles: Array<{
      id: string
      index: number
      startTime: string
      endTime: string
      text: string
      confidence: number
    }> = []
    let subtitleIndex = 0

    try {
      const result = await processorRef.current.process(
        videoRef.current,
        videoFile,
        (progressInfo: ProcessProgress) => {
          setProgress(progressInfo.progress)
          setStatusMessage(progressInfo.message)

          // 处理流式识别结果
          if (progressInfo.frameResult) {
            subtitleIndex++
            const { timestamp, text, confidence, segmentStart, segmentEnd } = progressInfo.frameResult

            // 创建字幕条目，使用语音段时间范围
            const newSubtitle = {
              id: `subtitle-${Date.now()}-${subtitleIndex}`,
              index: subtitleIndex,
              startTime: formatTime(segmentStart ?? timestamp),
              endTime: formatTime(segmentEnd ?? timestamp + 2),
              text: text,
              confidence: confidence
            }

            recognizedSubtitles.push(newSubtitle)

            // 立即更新字幕列表（流式显示）
            setSubtitles([...recognizedSubtitles])

            // 同时添加到提取的帧列表
            setExtractedFrames(prev => [...prev, {
              timestamp,
              imageUrl: '',
              recognizedText: text,
              confidence
            }])
          }
        }
      )

      // 计算总耗时
      const endTime = Date.now()
      const totalSeconds = Math.floor((endTime - startTime) / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60

      // 设置结果
      setSubtitles(result.subtitles)
      setExtractedFrames(result.frames)
      setTotalTime(totalSeconds) // 设置总耗时
      setStatusMessage("处理完成")
      setProgress(100)
    } catch (error) {
      logger.error("提取失败:", error)
      setStatusMessage(`处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsProcessing(false)
      processorRef.current = null
    }
  }, [config, subtitleRegions])

  // 取消提取
  const cancelExtraction = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.cancel()
    }
    setIsProcessing(false)
    setStatusMessage("已取消")
  }, [])

  // 清空结果
  const clearResults = useCallback(() => {
    setSubtitles([])
    setExtractedFrames([])
    setTotalTime(0) // 重置总耗时
    setProgress(0)
    setStatusMessage("")
  }, [])

  // 删除单条字幕
  const deleteSubtitle = useCallback((subtitleId: string) => {
    setSubtitles(prev => prev.filter(sub => sub.id !== subtitleId))
  }, [])

  // 导出SRT
  const exportSRT = useCallback(() => {
    if (subtitles.length === 0) return

    const srtContent = subtitles
      .map((sub) => {
        return `${sub.index}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}\n`
      })
      .join("\n")

    // 使用视频文件名作为导出文件名
    let fileName = "subtitle.srt"
    if (videoFile) {
      const videoName = videoFile.name.replace(/\.[^/.]+$/, "") // 移除扩展名
      fileName = `${videoName}.srt`
    }

    const blob = new Blob([srtContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }, [subtitles, videoFile])

  return {
    videoFile,
    videoUrl,
    isPlaying,
    currentTime,
    duration,
    subtitleRegions,
    config,
    subtitles,
    isProcessing,
    progress,
    extractedFrames,
    statusMessage,
    totalTime, // 添加总耗时
    setDuration,
    setConfig: saveConfig, // 使用保存配置的函数
    handleVideoUpload,
    handleVideoUrlChange,
    handlePlayPause,
    handleSeek,
    addSubtitleRegion,
    removeSubtitleRegion,
    updateSubtitleRegion,
    startExtraction,
    cancelExtraction,
    clearResults,
    deleteSubtitle,
    exportSRT,
    setVideoElementRef
  }
}

// 辅助函数：格式化时间为 SRT 格式 (HH:MM:SS,mmm)
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}