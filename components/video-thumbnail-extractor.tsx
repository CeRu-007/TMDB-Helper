"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Upload,
  Play,
  Download,
  ImageIcon,
  RefreshCw,
  Trash2,
  Star,
  Clock,
  FileVideo,
  Grid3X3,
  Filter,
  ArrowUpDown,
  Settings,
  Brain,
  Layers,
  Cpu,
  Info,
  Save,
  Terminal,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import {
  Checkbox,
} from "@/components/ui/checkbox"
import ImageProcessor from "@/utils/image-processor"

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
  status: "pending" | "processing" | "completed" | "error"
  // 分页状态
  thumbnailPagination?: {
    currentPage: number
    itemsPerPage: number
  }
}

interface Thumbnail {
  id: string
  url: string
  timestamp: number
  quality: number
}

interface ExtractionSettings {
  startTime: number // 开始提取时间（秒）
  threadCount: number // 线程数
  outputFormat: "jpg" | "png"
  thumbnailCount: number // 每个视频提取的缩略图数量
  prioritizeStatic: boolean
  avoidSubtitles: boolean
  preferPeople: boolean
  preferFaces: boolean // 新增：优先人物正脸
  subtitleDetectionStrength: number // 字幕检测强度 (0-1)
  staticFrameThreshold: number // 静态帧阈值
}

// 可用的AI模型配置
const availableModels = {
  subtitleDetection: [
    { id: "basic", name: "基础检测", description: "使用基本图像处理算法检测字幕区域" },
    { id: "ocr-lite", name: "OCR-Lite", description: "轻量级OCR模型，速度快但准确率一般" },
    { id: "tesseract", name: "Tesseract OCR", description: "开源OCR引擎，准确率高但速度较慢" },
    { id: "subtitle-net", name: "SubtitleNet", description: "专门针对视频字幕的深度学习模型" },
  ],
  peopleDetection: [
    { id: "basic", name: "基础检测", description: "使用基本图像处理算法检测人物轮廓" },
    { id: "yolo-tiny", name: "YOLO-Tiny", description: "轻量级目标检测模型，速度快" },
    { id: "face-detect", name: "人脸检测", description: "专注于检测人脸的模型" },
    { id: "human-pose", name: "人体姿态", description: "检测完整人体姿态的高级模型" },
  ],
}

export default function VideoThumbnailExtractor() {
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name")
  const [filterBy, setFilterBy] = useState<"all" | "completed" | "processing">("all")
  const [settings, setSettings] = useState<ExtractionSettings>({
    startTime: 0,
    threadCount: 6,
    outputFormat: "jpg",
    thumbnailCount: 10, // 默认每个视频提取10张缩略图
    prioritizeStatic: true,
    avoidSubtitles: true,
    preferPeople: true,
    preferFaces: true,
    subtitleDetectionStrength: 0.8,
    staticFrameThreshold: 0.8,
  })
  // 默认每页显示的缩略图数量修改为9（3x3布局）
  const [defaultItemsPerPage, setDefaultItemsPerPage] = useState<number>(9)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [selectedSubtitleModel, setSelectedSubtitleModel] = useState("basic")
  const [showSubtitleMarkers, setShowSubtitleMarkers] = useState(true)
  const [subtitleModelLoading, setSubtitleModelLoading] = useState(false)
  const [subtitleLanguage, setSubtitleLanguage] = useState<"auto" | "chinese" | "english" | "japanese">("auto")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useMobile()
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [processorReady, setProcessorReady] = useState<boolean>(false)
  const imageProcessorRef = useRef<ImageProcessor | null>(null)

  // 初始化图像处理器
  useEffect(() => {
    const initProcessor = async () => {
      try {
        // 获取图像处理器实例
        const processor = ImageProcessor.getInstance();
        await processor.initialize();
        imageProcessorRef.current = processor;
        setProcessorReady(true);
      } catch (error) {
        console.error("初始化图像处理器失败:", error);
        // 降级为原始处理逻辑
      }
    };
    
    initProcessor();
    
    // 组件卸载时清理资源
    return () => {
      if (imageProcessorRef.current) {
        imageProcessorRef.current.dispose();
      }
    };
  }, []);
  
  // 加载保存的高级设置
  useEffect(() => {
    const savedSettings = localStorage.getItem("video_thumbnail_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        
        // 验证并转换关键数值设置，确保所有值都有默认值且不为undefined
        const validatedParsed = {
          ...parsed,
          startTime: parsed.startTime !== undefined ? Number(parsed.startTime) : 0,
          threadCount: parsed.threadCount !== undefined ? Number(parsed.threadCount) : 6,
          thumbnailCount: parsed.thumbnailCount !== undefined ? Number(parsed.thumbnailCount) : 10,
          subtitleDetectionStrength: parsed.subtitleDetectionStrength !== undefined ? Number(parsed.subtitleDetectionStrength) : 0.8,
          staticFrameThreshold: parsed.staticFrameThreshold !== undefined ? Number(parsed.staticFrameThreshold) : 0.8,
          outputFormat: parsed.outputFormat || "jpg",
          prioritizeStatic: parsed.prioritizeStatic !== undefined ? Boolean(parsed.prioritizeStatic) : true,
          avoidSubtitles: parsed.avoidSubtitles !== undefined ? Boolean(parsed.avoidSubtitles) : true,
          preferPeople: parsed.preferPeople !== undefined ? Boolean(parsed.preferPeople) : true,
          preferFaces: parsed.preferFaces !== undefined ? Boolean(parsed.preferFaces) : true
        };
        
        // 加载设置到 settings 状态，确保使用有效的值替换
        setSettings((prev) => {
          const newSettings = { ...prev, ...validatedParsed };
          return newSettings;
        });
        
        // 加载模型相关设置，确保有默认值
        if (parsed.selectedSubtitleModel) {
          setSelectedSubtitleModel(parsed.selectedSubtitleModel);
        }
        if (parsed.subtitleLanguage) {
          setSubtitleLanguage(parsed.subtitleLanguage);
        }
        if (parsed.showSubtitleMarkers !== undefined) {
          setShowSubtitleMarkers(parsed.showSubtitleMarkers);
        }
      } catch (error) {
        console.error("Failed to load saved settings:", error);
      }
    }
  }, []);

  // 处理文件上传
  const handleFileUpload = useCallback((files: FileList) => {
    const newVideos: VideoFile[] = []

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("video/")) {
        const videoUrl = URL.createObjectURL(file)
        const video = document.createElement("video")

        video.onloadedmetadata = () => {
          const newVideo: VideoFile = {
            id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            file,
            name: file.name,
            duration: video.duration,
            resolution: `${video.videoWidth}x${video.videoHeight}`,
            size: file.size,
            url: videoUrl,
            thumbnails: [],
            selectedThumbnail: 0,
            extractionProgress: 0,
            status: "pending",
            // 添加分页状态，修改为9个缩略图每页
            thumbnailPagination: {
              currentPage: 0,
              itemsPerPage: 9
            }
          }

          setVideos((prev) => [...prev, newVideo])
        }

        video.src = videoUrl
      }
    })
  }, [])

  // 处理拖放事件
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }, [handleFileUpload])

  // 提取视频缩略图
  const extractThumbnails = async (videoFile: VideoFile) => {
    console.log(`开始处理视频: ${videoFile.name}`);
    
    // 更新状态为处理中
    setVideos((prev) =>
      prev.map((v) => (v.id === videoFile.id ? { ...v, status: "processing", extractionProgress: 0 } : v)),
    )
    
    try {
      // 创建视频元素
      const video = document.createElement("video")
      video.src = videoFile.url
      video.muted = true
      video.playsInline = true
      video.crossOrigin = "anonymous" // 允许跨域处理

      // 设置视频属性
      video.preload = "metadata"
      
      // 设置最大尝试次数
      const MAX_RETRIES = 2;
      let retryCount = 0;
      
      // 添加重试逻辑
      while (retryCount <= MAX_RETRIES) {
        try {
          // 等待视频加载完成
          await new Promise<void>((resolve, reject) => {
            const loadHandler = () => {
              video.removeEventListener('loadeddata', loadHandler);
              resolve();
            };
            
            const errorHandler = () => {
              video.removeEventListener('error', errorHandler);
              reject(new Error("视频加载失败"));
            };
            
            // 添加超时
            const timeout = setTimeout(() => {
              video.removeEventListener('loadeddata', loadHandler);
              video.removeEventListener('error', errorHandler);
              reject(new Error("视频加载超时"));
            }, 30000); // 增加到30秒超时
            
            video.addEventListener('loadeddata', loadHandler);
            video.addEventListener('error', errorHandler);
            
            // 如果视频已经加载完成，直接解析
            if (video.readyState >= 2) {
              clearTimeout(timeout);
              resolve();
            }
          });
          
          // 视频加载成功，继续处理
          break;
        } catch (error) {
          console.warn(`视频加载尝试 ${retryCount + 1}/${MAX_RETRIES + 1} 失败:`, error);
          
          if (retryCount >= MAX_RETRIES) {
            throw error; // 重试次数用完，抛出错误
          }
          
          // 增加重试计数并等待一段时间再重试
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 更新进度
          setVideos((prev) =>
            prev.map((v) => (v.id === videoFile.id ? { ...v, extractionProgress: 5 * retryCount } : v)),
          );
        }
      }

      // 使用优化的图像处理器
      if (imageProcessorRef.current && processorReady) {
        try {
          // 为进度更新创建一个函数
          const updateProgress = (progress: number) => {
            setVideos((prev) =>
              prev.map((v) => (v.id === videoFile.id ? { ...v, extractionProgress: progress } : v)),
            )
          }
          
          // 使用优化的处理器从视频提取帧
          updateProgress(10);
          
          // 提取视频帧，添加重试逻辑
          let frames: ImageData[] = [];
          retryCount = 0;
          
          while (retryCount <= MAX_RETRIES) {
            try {
              frames = await imageProcessorRef.current.extractFramesFromVideo(video, {
                startTime: settings.startTime,
                frameCount: settings.thumbnailCount * 2, // 提取双倍帧数以便更好地选择
                interval: 'uniform'
              });
              
              // 如果成功提取了至少一帧，就继续处理
              if (frames.length > 0) {
                break;
              }
              
              throw new Error("未能提取任何帧");
            } catch (error) {
              console.warn(`帧提取尝试 ${retryCount + 1}/${MAX_RETRIES + 1} 失败:`, error);
              
              if (retryCount >= MAX_RETRIES) {
                // 如果重试次数用完，但至少有一帧，继续处理
                if (frames.length > 0) {
                  console.log(`尽管有错误，但成功提取了 ${frames.length} 帧，继续处理`);
                  break;
                }
                throw error; // 否则抛出错误
              }
              
              // 增加重试计数并等待一段时间再重试
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // 更新进度
              updateProgress(10 + 5 * retryCount);
            }
          }
          
          // 检查是否成功提取了帧
          if (frames.length === 0) {
            console.warn(`视频 ${videoFile.name} 未能提取任何帧，将使用传统方法`);
            return await extractThumbnailsLegacy(video, videoFile);
          }
          
          updateProgress(50);
          
          // 分析帧并找出最佳的几帧
          const { frames: bestFrames } = await imageProcessorRef.current.findOptimalFrames(
            frames, 
            settings.thumbnailCount * 2, // 提取更多候选帧以便筛选
            {
              prioritizeStatic: true,       // 优先静态帧
              avoidSubtitles: true,         // 必须避免字幕
              preferPeople: true,           // 必须有人物
              preferFaces: true,            // 优先有正脸的帧
              avoidEmptyFrames: true        // 避免空镜头
            },
            {
              subtitleDetectionStrength: 1.0,  // 提高字幕检测强度，确保无字幕
              staticFrameThreshold: settings.staticFrameThreshold,
              sampleRate: 2 // 使用2倍采样率提高效率
            }
          );
          
          // 检查是否有最佳帧
          if (bestFrames.length === 0) {
            console.warn(`视频 ${videoFile.name} 未能找到最佳帧，将使用传统方法`);
            return await extractThumbnailsLegacy(video, videoFile);
          }
          
          updateProgress(80);
          
          // 筛选符合条件的帧：无字幕、有人物、优先有正脸
          const filteredFrames = bestFrames.filter(({ scores }) => {
            // 必须无字幕
            const hasNoSubtitles = scores.subtitleScore < 0.25;
            // 必须有人物
            const hasPeople = scores.peopleScore > 0.4;
            
            return hasNoSubtitles && hasPeople;
          });
          
          // 如果筛选后没有符合条件的帧，使用原始的最佳帧
          const framesToUse = filteredFrames.length > 0 ? filteredFrames : bestFrames;
          
          // 限制数量到设置的缩略图数量
          const finalFrames = framesToUse.slice(0, settings.thumbnailCount);
          
          // 转换为缩略图
          const thumbnails: Thumbnail[] = [];
          
          // 并行处理生成缩略图
          await Promise.all(
            finalFrames.map(async ({ index, scores }, i) => {
              try {
                // 确保索引有效
                if (index >= 0 && index < frames.length) {
                  const frame = frames[index];
                  
                  // 生成优化的缩略图
                  const { url } = await imageProcessorRef.current!.generateThumbnail(frame, {
                    maxWidth: 640,
                    maxHeight: 360,
                    quality: 0.8,
                    format: settings.outputFormat as 'webp' | 'jpeg' | 'png'
                  });
                  
                  // 添加到缩略图列表（移除不必要的标记）
                  thumbnails.push({
                    id: `thumb_${i}`,
                    url,
                    timestamp: settings.startTime + (index / frames.length) * (video.duration - settings.startTime),
                    quality: (scores.staticScore * 0.5 + (1 - scores.subtitleScore) * 0.3 + scores.peopleScore * 0.2) * 100
                  });
                } else {
                  console.warn(`无效的帧索引: ${index}，有效范围: 0-${frames.length - 1}`);
                }
                
                // 更新进度
                updateProgress(80 + ((i + 1) / finalFrames.length) * 20);
              } catch (error) {
                console.error(`处理缩略图 ${i} 失败:`, error);
              }
            })
          );
          
          // 检查是否生成了缩略图
          if (thumbnails.length === 0) {
            console.warn(`视频 ${videoFile.name} 未能生成缩略图，将使用传统方法`);
            return await extractThumbnailsLegacy(video, videoFile);
          }
          
          // 更新完成状态
          setVideos((prev) =>
            prev.map((v) =>
              v.id === videoFile.id ? {
                    ...v,
                    thumbnails: thumbnails,
                    status: "completed",
                    extractionProgress: 100,
                  }
                : v,
            ),
          );
          
          return thumbnails;
        } catch (error) {
          console.error(`使用优化方法处理视频 ${videoFile.name} 失败:`, error);
          // 降级到传统方法
          return await extractThumbnailsLegacy(video, videoFile);
        }
      } else {
        // 降级到原来的处理方式
        return await extractThumbnailsLegacy(video, videoFile);
      }
    } catch (error) {
      console.error("提取缩略图失败:", error);
      setVideos((prev) => prev.map((v) => (v.id === videoFile.id ? { ...v, status: "error" } : v)));
      return [];
    }
  }
  
  // 保留原始提取逻辑作为备用
  const extractThumbnailsLegacy = async (video: HTMLVideoElement, videoFile: VideoFile) => {
    // 原始的提取逻辑，从这里开始复制
    return new Promise<Thumbnail[]>((resolve) => {
      video.onloadeddata = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")!
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const thumbnails: Thumbnail[] = []
        // 使用设置的缩略图数量，确保至少提取5张
        const totalFrames = Math.max(5, settings.thumbnailCount)
        const interval = (video.duration - settings.startTime) / (totalFrames * 2) // 提取更多候选帧

        let currentFrame = 0
        const candidateFrames: Array<{
          timestamp: number
          imageData: ImageData
          staticScore: number
          subtitleScore: number
          peopleScore: number
          dataUrl: string
          quality: number
        }> = []

        const extractFrame = () => {
          if (currentFrame >= totalFrames * 2) {
            // 分析候选帧并选择最佳的
            processCandidateFrames()
            return
          }

          const timestamp = settings.startTime + currentFrame * interval
          video.currentTime = timestamp

          video.onseeked = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

            // 计算静态分数（基于像素变化和边缘检测）
            const staticScore = calculateStaticScore(imageData)

            // 计算字幕分数（检测底部区域的文字特征）
            const subtitleScore = calculateSubtitleScore(imageData, canvas.width, canvas.height)

            // 计算人物分数（基于肤色检测和面部特征）
            const peopleScore = calculatePeopleScore(imageData)

            candidateFrames.push({
              timestamp,
              imageData,
              staticScore,
              subtitleScore,
              peopleScore,
              dataUrl: canvas.toDataURL(`image/${settings.outputFormat}`, 0.9),
              quality: (staticScore * 0.5 + (1 - subtitleScore) * 0.3 + peopleScore * 0.2) * 100
            })

            currentFrame++
            const progress = (currentFrame / (totalFrames * 2)) * 50 // 前50%进度用于帧提取
            setVideos((prev) => prev.map((v) => (v.id === videoFile.id ? { ...v, extractionProgress: progress } : v)))

            setTimeout(extractFrame, 100) // 减少延迟提高处理速度
          }
        }

        const processCandidateFrames = () => {
          // 对候选帧进行排序和筛选
          candidateFrames.sort((a, b) => {
            // 优先无字幕、有人物的帧
            const aScore = a.subtitleScore < 0.25 && a.peopleScore > 0.4 ? 1 : 0;
            const bScore = b.subtitleScore < 0.25 && b.peopleScore > 0.4 ? 1 : 0;
            
            if (aScore !== bScore) return bScore - aScore;
            
            // 其次按质量排序
            return b.quality - a.quality;
          });
          
          // 选择最佳的N帧
          const bestFrames = candidateFrames.slice(0, settings.thumbnailCount);
          
          // 转换为缩略图
          const thumbnails = bestFrames.map((frame, i) => ({
            id: `thumb_${i}`,
            url: frame.dataUrl,
            timestamp: frame.timestamp,
            quality: frame.quality,
          }));
          
          // 更新视频对象
          setVideos((prev) =>
            prev.map((v) =>
              v.id === videoFile.id
                ? { ...v, thumbnails, status: "completed", extractionProgress: 100 }
                : v
            )
          );
          
          // 完成提取并解析Promise
          resolve(thumbnails);
        };

        extractFrame()
      }
    })
  }

  // 计算静态分数的辅助函数
  const calculateStaticScore = (imageData: ImageData): number => {
    const data = imageData.data
    let edgeCount = 0
    let totalPixels = 0

    // 简化的边缘检测算法
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // 计算像素亮度
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b

      // 检测边缘（简化版本）
      if (i > imageData.width * 4) {
        const prevBrightness =
          0.299 * data[i - imageData.width * 4] +
          0.587 * data[i - imageData.width * 4 + 1] +
          0.114 * data[i - imageData.width * 4 + 2]
        if (Math.abs(brightness - prevBrightness) > 30) {
          edgeCount++
        }
      }
      totalPixels++
    }

    // 返回静态分数（边缘越少越静态）
    return Math.max(0, 1 - (edgeCount / totalPixels) * 10)
  }

  // 计算字幕分数的辅助函数 - 完全重写的增强版
  const calculateSubtitleScore = (imageData: ImageData, width: number, height: number): number => {
    const data = imageData.data;
    
    // 定义多个检测区域，更精细地划分视频帧
    const regions = [
      { startY: Math.floor(height * 0.80), endY: height, weight: 0.50 },      // 底部区域（最高权重）
      { startY: Math.floor(height * 0.70), endY: Math.floor(height * 0.80), weight: 0.20 }, // 底部上方区域
      { startY: Math.floor(height * 0.05), endY: Math.floor(height * 0.15), weight: 0.15 }, // 顶部区域
      { startY: Math.floor(height * 0.15), endY: Math.floor(height * 0.25), weight: 0.10 }, // 顶部下方区域
      { startY: Math.floor(height * 0.40), endY: Math.floor(height * 0.60), weight: 0.05 }  // 中间区域（最低权重）
    ];
    
    // 用于存储各种字幕特征的检测结果
    const results = {
      textPatterns: 0,        // 文本模式特征（如规则的文本行）
      contrastRegions: 0,     // 高对比度区域
      horizontalEdges: 0,     // 水平边缘（文字的主要特征）
      verticalEdges: 0,       // 垂直边缘（文字的次要特征）
      colorPatterns: 0,       // 颜色模式（如字幕背景）
      textureUniformity: 0,   // 纹理均匀性（字幕通常有一致的纹理）
      regularSpacing: 0,      // 规则间距（字符间距通常很规则）
      edgeRatio: 0,           // 边缘比例（字幕通常有特定的水平/垂直边缘比例）
      boxDetection: 0,        // 字幕框检测（新增）
      verticalAlignment: 0,   // 垂直对齐检测（新增）
      temporalConsistency: 0, // 时间一致性（预留，需要多帧信息）
      totalPixelsAnalyzed: 0  // 分析的总像素数
    };
    
    // 字幕背景色检测（新增）- 检测常见的字幕背景色
    const subtitleBackgrounds = [
      {r: 0, g: 0, b: 0, a: 128, name: "半透明黑"}, // 半透明黑色背景
      {r: 0, g: 0, b: 0, a: 255, name: "纯黑"}, // 纯黑色背景
      {r: 128, g: 128, b: 128, a: 128, name: "半透明灰"}, // 半透明灰色背景
      {r: 255, g: 255, b: 255, a: 128, name: "半透明白"},
    ];
    
    // 字幕文本颜色检测（新增）- 检测常见的字幕文本颜色
    const subtitleTextColors = [
      {r: 255, g: 255, b: 255, name: "白色"},
      {r: 255, g: 255, b: 0, name: "黄色"},
      {r: 0, g: 255, b: 255, name: "青色"},
      {r: 0, g: 0, b: 0, name: "黑色"},
      {r: 255, g: 0, b: 0, name: "红色"},
      {r: 0, g: 255, b: 0, name: "绿色"},
      {r: 0, g: 0, b: 255, name: "蓝色"},
      {r: 255, g: 128, b: 0, name: "橙色"},
      {r: 255, g: 0, b: 255, name: "紫色"},
    ];
    
    // 分析每个区域
    for (const region of regions) {
      // 区域特征计数器
      let regionTextPatterns = 0;
      let regionContrastPixels = 0;
      let regionHorizontalEdges = 0;
      let regionVerticalEdges = 0;
      let regionColorPatterns = 0;
      let regionTextureUniformity = 0;
      let regionPixels = 0;
      let regionBoxDetection = 0; // 新增：字幕框检测
      
      // 存储上一行的亮度值，用于检测垂直边缘
      const prevRowBrightness: number[] = new Array(width).fill(-1);
      
      // 用于检测文本模式的变量
      let linePatternStrength = 0;
      let lastLinePatternStrength = 0;
      let patternConsistencyCount = 0;
      
      // 用于检测规则间距的变量
      const edgePositions: number[][] = [];
      
      // 用于字幕框检测的变量（新增）
      let consecutiveUniformRows = 0;
      let maxConsecutiveUniformRows = 0;
      let lastRowUniform = false;
      
      // 颜色聚类分析（新增）
      const colorClusters: {[key: string]: number} = {};
      
      // 分析区域内的每一行
      for (let y = region.startY; y < region.endY; y++) {
        let lastBrightness = -1;
        let horizontalEdgeCount = 0;
        let rowBrightValues: number[] = [];
        let rowEdgePositions: number[] = [];
        let rowColors: {r: number, g: number, b: number}[] = [];
        
        // 行的均匀性分析变量
        let rowUniformity = 0;
        let brightPixels = 0;
        let darkPixels = 0;
        
        // 分析该行的每个像素
        for (let x = 0; x < width; x += 1) { // 减少跳跃采样以提高准确性
          const i = (y * width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3]; // 考虑透明度
          
          // 计算亮度
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          rowBrightValues.push(brightness);
          
          // 颜色聚类（新增）
          // 简化的颜色量化，将RGB值归类到16个区间
          const colorKey = `${Math.floor(r/16)},${Math.floor(g/16)},${Math.floor(b/16)}`;
          colorClusters[colorKey] = (colorClusters[colorKey] || 0) + 1;
          
          // 收集行颜色信息
          rowColors.push({r, g, b});
          
          // 检测高对比度区域（可能是字幕）
          if (brightness > 200) {
            brightPixels++;
          } else if (brightness < 50) {
            darkPixels++;
          }
          
          // 检测字幕背景色（新增）
          for (const bg of subtitleBackgrounds) {
            // 允许一定的颜色偏差
            if (Math.abs(r - bg.r) < 30 && 
                Math.abs(g - bg.g) < 30 && 
                Math.abs(b - bg.b) < 30 &&
                (bg.a === 255 || a < 240)) { // 考虑透明度
              regionColorPatterns += 0.5;
              break;
            }
          }
          
          // 检测字幕文本颜色（新增）
          for (const textColor of subtitleTextColors) {
            // 允许一定的颜色偏差
            if (Math.abs(r - textColor.r) < 30 && 
                Math.abs(g - textColor.g) < 30 && 
                Math.abs(b - textColor.b) < 30) {
              regionColorPatterns += 1;
              break;
            }
          }
          
          // 检测水平对比度（字幕文字特征）
          if (lastBrightness >= 0) {
            const horizontalContrast = Math.abs(brightness - lastBrightness);
            if (horizontalContrast > 40) { // 降低阈值以捕获更多边缘
              horizontalEdgeCount++;
              rowEdgePositions.push(x); // 记录边缘位置
            }
          }
          
          // 检测垂直对比度
          if (prevRowBrightness[x] >= 0) {
            const verticalContrast = Math.abs(brightness - prevRowBrightness[x]);
            if (verticalContrast > 40) {
              regionVerticalEdges++;
            }
          }
          
          // 更新上一个亮度值
          lastBrightness = brightness;
          prevRowBrightness[x] = brightness;
          
          regionPixels++;
        }
        
        // 分析行的亮度分布，计算纹理均匀性
        if (rowBrightValues.length > 10) {
          const sortedValues = [...rowBrightValues].sort((a, b) => a - b);
          const median = sortedValues[Math.floor(sortedValues.length / 2)];
          let uniformCount = 0;
          
          // 计算接近中值的像素比例
          for (const val of rowBrightValues) {
            if (Math.abs(val - median) < 25) { // 降低阈值以更严格地定义均匀性
              uniformCount++;
            }
          }
          
          // 如果大部分像素亮度接近，说明纹理均匀
          const rowUniformityScore = uniformCount / rowBrightValues.length;
          if (rowUniformityScore > 0.75) {
            regionTextureUniformity++;
            
            // 字幕框检测（新增）
            if (!lastRowUniform) {
              consecutiveUniformRows = 1;
            } else {
              consecutiveUniformRows++;
            }
            lastRowUniform = true;
            
            if (consecutiveUniformRows > maxConsecutiveUniformRows) {
              maxConsecutiveUniformRows = consecutiveUniformRows;
          }
          } else {
            lastRowUniform = false;
          }
        }
        
        // 分析该行的文本模式
        if (horizontalEdgeCount > 0) {
          // 计算该行的文本模式强度
          const currentLinePatternStrength = horizontalEdgeCount / width;
          
          // 检测连续行的一致性（字幕通常有一致的文本模式）
          if (Math.abs(currentLinePatternStrength - lastLinePatternStrength) < 0.08 && 
              currentLinePatternStrength > 0.04) {
            patternConsistencyCount++;
          }
          
          lastLinePatternStrength = currentLinePatternStrength;
        }
        
        // 如果该行有足够的水平边缘，可能是文本
        if (horizontalEdgeCount > width * 0.025) {
          regionHorizontalEdges++;
          
          // 保存边缘位置用于分析规则间距
          if (rowEdgePositions.length > 3) { // 至少需要几个边缘才能分析间距
            edgePositions.push(rowEdgePositions);
          }
        }
        
        // 分析行中的明暗像素比例（新增）
        // 字幕通常会有明显的明暗对比
        if (brightPixels + darkPixels > rowBrightValues.length * 0.1) {
          const contrastRatio = Math.min(brightPixels, darkPixels) / Math.max(brightPixels, darkPixels);
          if (contrastRatio > 0.1) { // 有一定比例的明暗对比
            regionContrastPixels += (brightPixels + darkPixels);
          }
            }
          }
          
      // 字幕框检测评分（新增）
      if (maxConsecutiveUniformRows >= 2 && maxConsecutiveUniformRows <= 5) {
        // 典型字幕通常占2-5行
        regionBoxDetection = Math.min(1.0, maxConsecutiveUniformRows / 5);
      }
      
      // 检测文本模式的一致性（字幕的特征）
      if (patternConsistencyCount > (region.endY - region.startY) * 0.12) {
        regionTextPatterns = patternConsistencyCount / (region.endY - region.startY);
      }
      
      // 分析边缘的规则间距
      let regularSpacingScore = 0;
      if (edgePositions.length > 2) {
        // 计算每行边缘间的间距
        const spacings: number[] = [];
        for (const rowEdges of edgePositions) {
          if (rowEdges.length < 4) continue; // 忽略边缘太少的行
          
          for (let i = 1; i < rowEdges.length; i++) {
            const spacing = rowEdges[i] - rowEdges[i-1];
            if (spacing > 3 && spacing < 50) { // 过滤掉太大或太小的间距
              spacings.push(spacing);
            }
          }
        }
        
        // 如果有足够的间距样本
        if (spacings.length > 5) {
          // 计算间距的标准差与平均值的比率
          const avg = spacings.reduce((sum, val) => sum + val, 0) / spacings.length;
          const variance = spacings.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / spacings.length;
          const stdDev = Math.sqrt(variance);
          
          // 规则间距的特征是标准差相对较小
          const variationCoefficient = stdDev / avg;
          if (variationCoefficient < 0.5) { // 变异系数小表示间距规则
            regularSpacingScore = 1 - variationCoefficient;
          }
        }
      }
      
      // 计算水平边缘与垂直边缘的比例
      let edgeRatioScore = 0;
      if (regionHorizontalEdges > 0 && regionVerticalEdges > 0) {
        const ratio = regionHorizontalEdges / regionVerticalEdges;
        // 字幕通常水平边缘多于垂直边缘
        if (ratio > 1.2 && ratio < 4) {
          edgeRatioScore = 0.5 + Math.min(0.5, (ratio - 1.2) / 2.8);
        }
      }
      
      // 分析颜色聚类（新增）
      let colorClusterScore = 0;
      const colorClusterEntries = Object.entries(colorClusters);
      if (colorClusterEntries.length > 0) {
        // 排序找出主要颜色
        colorClusterEntries.sort((a, b) => b[1] - a[1]);
        
        // 计算前两种颜色的像素占比
        if (colorClusterEntries.length >= 2) {
          const topTwoColors = colorClusterEntries[0][1] + colorClusterEntries[1][1];
          const topTwoRatio = topTwoColors / regionPixels;
          
          // 如果前两种颜色占比高，可能是字幕（文本+背景）
          if (topTwoRatio > 0.6) {
            colorClusterScore = Math.min(1.0, (topTwoRatio - 0.6) * 2.5);
          }
        }
      }
      
      // 累加区域特征到总结果，应用权重
      results.textPatterns += regionTextPatterns * region.weight;
      results.contrastRegions += (regionContrastPixels / regionPixels) * region.weight;
      results.horizontalEdges += (regionHorizontalEdges / (region.endY - region.startY)) * region.weight;
      results.verticalEdges += (regionVerticalEdges / regionPixels) * region.weight;
      results.colorPatterns += (regionColorPatterns / regionPixels) * region.weight;
      results.textureUniformity += (regionTextureUniformity / (region.endY - region.startY)) * region.weight;
      results.regularSpacing += regularSpacingScore * region.weight;
      results.edgeRatio += edgeRatioScore * region.weight;
      results.boxDetection += regionBoxDetection * region.weight; // 新增
      results.totalPixelsAnalyzed += regionPixels;
    }
    
    // 综合所有特征计算最终字幕分数
    let finalScore = 0;
    finalScore += results.textPatterns * 0.25;           // 文本模式是最强的字幕指标
    finalScore += results.horizontalEdges * 0.15;        // 水平边缘是字幕的重要特征
    finalScore += results.contrastRegions * 0.15;        // 高对比度区域
    finalScore += results.regularSpacing * 0.15;         // 规则间距
    finalScore += results.edgeRatio * 0.10;              // 边缘比例
    finalScore += results.colorPatterns * 0.10;          // 颜色模式（权重提高）
    finalScore += results.boxDetection * 0.05;           // 字幕框检测（新增）
    finalScore += results.verticalEdges * 0.03;          // 垂直边缘
    finalScore += results.textureUniformity * 0.02;      // 纹理均匀性
    
    // 应用阈值和归一化
    finalScore = Math.min(1, Math.max(0, finalScore));
    
    // 如果分数非常低，可能是误检，进一步降低分数
    if (finalScore < 0.1) {
      finalScore *= 0.5;
    }
    
    // 如果分数非常高，可能是明确的字幕，进一步提高分数
    if (finalScore > 0.7) {
      finalScore = Math.min(1, finalScore * 1.2);
    }
    
    return finalScore;
  }

  // 计算人物分数的辅助函数
  const calculatePeopleScore = (imageData: ImageData): number => {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    
    // 初始化计数器和分数
    let skinColorPixels = 0
    let totalPixels = 0
    let faceScore = 0
    
    // 将图像划分为3x3网格，分别计算每个区域的肤色比例
    const gridSize = 3
    const gridScores: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0))
    const gridCounts: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0))
    
    // 肤色检测 - 使用更高效的采样和更准确的肤色模型
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const pixelIndex = (y * width + x) * 4
        if (pixelIndex >= data.length - 4) continue
        
        const r = data[pixelIndex]
        const g = data[pixelIndex + 1]
        const b = data[pixelIndex + 2]

        // 计算网格位置
        const gridX = Math.min(gridSize - 1, Math.floor(x / width * gridSize))
        const gridY = Math.min(gridSize - 1, Math.floor(y / height * gridSize))
        gridCounts[gridY][gridX]++
        
        // 改进的肤色检测 - 结合RGB和YCbCr两种模型
        // RGB模型检测
        const isSkinRGB = (
          r > 95 && g > 40 && b > 20 && // 基本亮度要求
          r > g && r > b && // 红色分量最大
          Math.abs(r - g) > 15 && // 红绿差异明显
          r - g > 15 && // 红色明显大于绿色
          r - b > 15 // 红色明显大于蓝色
        )
        
        // YCbCr模型检测
        const yColor = 0.299 * r + 0.587 * g + 0.114 * b
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
        const isSkinYCbCr = (
          yColor > 80 && // 足够亮
          cb > 85 && cb < 135 && // Cb在肤色范围内
          cr > 135 && cr < 180 // Cr在肤色范围内
        )
        
        // 综合两种模型的结果
        if (isSkinRGB || isSkinYCbCr) {
        skinColorPixels++
          gridScores[gridY][gridX]++
      }
        
      totalPixels++
    }
    }
    
    // 计算基础肤色分数
    const skinRatio = totalPixels > 0 ? skinColorPixels / totalPixels : 0
    let peopleScore = Math.min(1, skinRatio * 5) // 基础分数
    
    // 人脸特征检测 - 基于肤色区域分布
    // 1. 中心区域权重更高（人脸通常在中心）
    const centerWeight = 1.5
    const centerX = 1, centerY = 1 // 3x3网格的中心
    
    // 2. 计算加权的区域肤色分数
    let weightedRegionScore = 0
    let totalWeight = 0
    
    for (let gridY = 0; gridY < gridSize; gridY++) {
      for (let gridX = 0; gridX < gridSize; gridX++) {
        // 计算与中心的距离作为权重
        const distance = Math.sqrt(Math.pow(gridX - centerX, 2) + Math.pow(gridY - centerY, 2))
        const weight = 1 / (1 + distance) * (distance < 1 ? centerWeight : 1)
        
        // 计算该区域的肤色比例
        const regionRatio = gridCounts[gridY][gridX] > 0 ? gridScores[gridY][gridX] / gridCounts[gridY][gridX] : 0
        
        weightedRegionScore += regionRatio * weight
        totalWeight += weight
      }
    }
    
    // 标准化加权分数
    const normalizedRegionScore = totalWeight > 0 ? weightedRegionScore / totalWeight : 0
    
    // 3. 检测人脸特征的可能性 - 基于区域分布模式
    // 人脸通常在上半部分有较高的肤色比例
    const topHalfSkinRatio = (
      gridScores[0][0] + gridScores[0][1] + gridScores[0][2] +
      gridScores[1][0] + gridScores[1][1] + gridScores[1][2]
    ) / (
      gridCounts[0][0] + gridCounts[0][1] + gridCounts[0][2] +
      gridCounts[1][0] + gridCounts[1][1] + gridCounts[1][2] || 1
    )
    
    // 中心区域通常有更高的肤色比例
    const centerSkinRatio = gridCounts[1][1] > 0 ? gridScores[1][1] / gridCounts[1][1] : 0
    
    // 检测面部对称性 - 左右区域肤色比例相近
    const leftSkinRatio = (
      gridScores[0][0] + gridScores[1][0] + gridScores[2][0]
    ) / (
      gridCounts[0][0] + gridCounts[1][0] + gridCounts[2][0] || 1
    )
    
    const rightSkinRatio = (
      gridScores[0][2] + gridScores[1][2] + gridScores[2][2]
    ) / (
      gridCounts[0][2] + gridCounts[1][2] + gridCounts[2][2] || 1
    )
    
    // 对称性分数 - 左右肤色比例差异越小，对称性越高
    const symmetryScore = 1 - Math.min(1, Math.abs(leftSkinRatio - rightSkinRatio) * 3)
    
    // 4. 综合多种特征，计算最终的人脸分数
    // 肤色比例、区域分布、对称性综合评分
    faceScore = (
      normalizedRegionScore * 0.4 + // 区域分布权重
      centerSkinRatio * 0.3 + // 中心区域肤色权重
      topHalfSkinRatio * 0.2 + // 上半部分肤色权重
      symmetryScore * 0.1 // 对称性权重
    )
    
    // 5. 结合基础人物分数和人脸分数
    // 如果检测到较强的人脸特征，提升总分
    if (faceScore > 0.4) {
      peopleScore = Math.max(peopleScore, faceScore)
    }
    
    // 应用非线性变换，使高分更突出
    peopleScore = Math.pow(peopleScore, 0.8)
    
    // 返回人物分数和人脸分数
    return peopleScore
  }

  // 根据字幕检测强度调整分数 - 完全重写的增强版
  const adjustScoreByModel = (score: number, frame: any, subtitleDetectionStrength: number): number => {
    let adjustedScore = score;
    
    // 根据字幕检测强度调整分数
    const strength = Math.min(1, Math.max(0, subtitleDetectionStrength)); // 确保在0-1范围内
    
    // 字幕检测阈值 - 根据检测强度动态调整
    // 更精细的阈值调整，使用非线性映射
    const lowThreshold = 0.10 - (0.05 * Math.pow(strength, 1.5));  // 0.05-0.10，更敏感的低阈值
    const highThreshold = 0.18 + (0.17 * Math.pow(strength, 0.8)); // 0.18-0.35，更合理的高阈值范围
    
    // 字幕惩罚系数 - 根据检测强度动态调整
    const penaltyFactor = 0.60 + (0.40 * strength);  // 0.60-1.0，更合理的惩罚范围
    const boostFactor = 1.10 + (0.40 * strength);    // 1.10-1.5，更合理的提升范围
    
    // 应用字幕检测逻辑
    if (frame.subtitleScore < lowThreshold) {
      // 无字幕或字幕可能性非常低 - 提升分数
      // 使用平滑曲线提升，低字幕分数提升更多
      const boostMultiplier = boostFactor * (1 - frame.subtitleScore / lowThreshold);
      adjustedScore *= (1 + boostMultiplier * 0.1);
    } else if (frame.subtitleScore > highThreshold) {
      // 有字幕可能性高 - 大幅降低分数
      // 使用S型曲线进行惩罚，使过渡更平滑
      const normalizedScore = (frame.subtitleScore - highThreshold) / (1 - highThreshold);
      const sigmoidPenalty = 1 / (1 + Math.exp(-10 * (normalizedScore - 0.5)));
      adjustedScore *= (1 - (sigmoidPenalty * penaltyFactor));
      
      // 确保分数不会太低，防止完全排除有用的帧
      adjustedScore = Math.max(adjustedScore, score * 0.15);
    } else {
      // 中间区域 - 使用平滑过渡
      const normalizedPosition = (frame.subtitleScore - lowThreshold) / (highThreshold - lowThreshold);
      // 使用余弦函数创建平滑过渡
      const smoothPenalty = 0.5 * (1 - Math.cos(normalizedPosition * Math.PI));
      adjustedScore *= (1 - (smoothPenalty * 0.4));
    }
    
    // 考虑人物检测和静态帧特征的组合效应
    let combinedBoost = 1.0;
    
    // 人物检测提升 - 增强对人脸的偏好
    if (frame.peopleScore > 0.25) { 
      // 使用更强的提升曲线，特别是对高分人脸
      // 检测到人脸的可能性越高，提升越明显
      const faceBoostThreshold = 0.6; // 人脸检测阈值
      
      if (frame.peopleScore > faceBoostThreshold) {
        // 可能包含人脸 - 给予更高的提升
        const faceBoost = 0.25 * Math.pow((frame.peopleScore - faceBoostThreshold) / (1 - faceBoostThreshold), 0.7);
        combinedBoost += faceBoost;
      } else {
        // 普通人物检测 - 较小提升
      const peopleBoost = 0.15 * Math.log10(1 + frame.peopleScore * 9);
      combinedBoost += peopleBoost;
      }
    }
    
    // 静态帧提升
    if (frame.staticScore > 0.60) { 
      // 使用对数曲线，避免过度提升高分
      const staticBoost = 0.20 * Math.log10(1 + (frame.staticScore - 0.6) * 10);
      combinedBoost += staticBoost;
    }
    
    // 应用组合提升
    adjustedScore *= combinedBoost;
    
    // 确保分数在有效范围内
    return Math.min(1.0, Math.max(0.0, adjustedScore));
  }

  // 处理批量提取
  const handleBatchExtraction = async () => {
    if (isProcessing) return
    
    setIsProcessing(true)
    
    try {
      // 过滤出待处理的视频
    const pendingVideos = videos.filter((v) => v.status === "pending")
    
    if (pendingVideos.length === 0) {
        setCopyFeedback("没有待处理的视频")
        setTimeout(() => setCopyFeedback(null), 3000)
        return
      }
      
      // 使用队列处理视频，避免同时处理太多导致浏览器崩溃
      const processQueue = async (videos: VideoFile[]) => {
        // 创建一个队列
        const queue = [...videos]
        
        // 同时处理的视频数量
        const concurrentLimit = Math.max(1, Math.min(settings.threadCount, 16))
        
        // 当前正在处理的视频数量
        let activeCount = 0
        
        // 处理下一个视频
        const processNext = async () => {
          if (queue.length === 0) return
          
          // 如果达到并发限制，等待
          if (activeCount >= concurrentLimit) return
          
          activeCount++
          const video = queue.shift()!
          
          try {
            await processVideo(video)
          } catch (error) {
            console.error(`处理视频 ${video.name} 时出错:`, error)
            // 更新视频状态为错误
            setVideos((prev) =>
              prev.map((v) =>
                v.id === video.id ? { ...v, status: "error" } : v
              )
            )
          } finally {
            activeCount--
            // 继续处理队列
            processNext()
          }
        }
        
        // 启动初始的并发处理
        const initialBatch = Math.min(concurrentLimit, queue.length)
        for (let i = 0; i < initialBatch; i++) {
          processNext()
        }
      }
      
      // 处理单个视频
      const processVideo = async (video: VideoFile) => {
        // 更新视频状态为处理中
        setVideos((prev) =>
          prev.map((v) =>
            v.id === video.id ? { ...v, status: "processing", extractionProgress: 0 } : v
          )
        )
        
        try {
          // 使用高级图像处理器提取缩略图
          if (processorReady && imageProcessorRef.current) {
            await extractThumbnails(video)
          } else {
            // 降级为传统处理方法
            const videoElement = document.createElement("video")
            videoElement.src = video.url
            await extractThumbnailsLegacy(videoElement, video)
          }
          
          // 更新视频状态为完成，并确保有分页状态
          setVideos((prev) =>
            prev.map((v) => {
              if (v.id === video.id) {
                // 确保视频有分页状态
                const thumbnailPagination = v.thumbnailPagination || {
                  currentPage: 0,
                  itemsPerPage: defaultItemsPerPage
                };
                
                return { 
                    ...v,
                    status: "completed",
                    extractionProgress: 100,
                  thumbnailPagination 
                };
              }
              return v;
            })
          )
        } catch (error) {
          console.error(`处理视频 ${video.name} 时出错:`, error)
          // 更新视频状态为错误
          setVideos((prev) =>
            prev.map((v) =>
              v.id === video.id ? { ...v, status: "error" } : v
            )
          )
        }
      }
      
      // 开始处理队列
      await processQueue(pendingVideos)
    } catch (error) {
      console.error("批量处理视频时出错:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  // 选择缩略图
  const selectThumbnail = (videoId: string, thumbnailIndex: number) => {
    setVideos((prev) => prev.map((v) => (v.id === videoId ? { ...v, selectedThumbnail: thumbnailIndex } : v)))
  }

  // 下载缩略图
  const downloadThumbnail = (video: VideoFile, thumbnail?: Thumbnail) => {
    const targetThumbnail = thumbnail || video.thumbnails[video.selectedThumbnail]
    if (!targetThumbnail) return

    const link = document.createElement("a")
    link.href = targetThumbnail.url
    link.download = `${video.name.replace(/\.[^/.]+$/, "")}_thumbnail.${settings.outputFormat}`
    link.click()
  }

  // 批量下载
  const downloadAllThumbnails = () => {
    const completedVideos = videos.filter((v) => v.status === "completed")
    completedVideos.forEach((video) => {
      setTimeout(() => downloadThumbnail(video), 100)
    })
  }

  // 删除视频
  const removeVideo = (videoId: string) => {
    setVideos((prev) => {
      const video = prev.find((v) => v.id === videoId)
      if (video) {
        URL.revokeObjectURL(video.url)
      }
      return prev.filter((v) => v.id !== videoId)
    })
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 格式化时长
  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) {
      return "00:00"
    }
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
    }
    
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // 保存高级设置
  const saveAdvancedSettings = () => {
    try {
      // 确保 startTime 和 threadCount 是有效的数值
      const validatedSettings = {
        ...settings,
        startTime: isNaN(settings.startTime) ? 0 : settings.startTime,
        threadCount: isNaN(settings.threadCount) ? 6 : Math.max(1, Math.min(12, Number(settings.threadCount)))
      };
      
      // 直接保存整个 settings 对象，确保所有设置项都被保存
      const settingsToSave = {
        ...validatedSettings, // 包含所有设置项，包括 startTime 和 threadCount
        // 添加模型相关设置
        selectedSubtitleModel,
        subtitleLanguage,
        showSubtitleMarkers
      }
      
      console.log("保存设置:", settingsToSave); // 添加日志以便调试
      localStorage.setItem("video_thumbnail_settings", JSON.stringify(settingsToSave))
      setCopyFeedback("所有设置已保存，包括开始时间和线程数")
      setTimeout(() => setCopyFeedback(null), 3000)
    } catch (error) {
      console.error("Failed to save settings:", error)
      setCopyFeedback("保存设置失败，请重试")
      setTimeout(() => setCopyFeedback(null), 3000)
    }
  }

  // 测试模型可用性
  const testModelAvailability = async (modelType: string, modelId: string): Promise<boolean> => {
    // 简化为仅测试字幕检测模型
    if (modelType === "subtitle") {
      // 模拟模型可用性检测
      await new Promise((resolve) => setTimeout(resolve, 500))
      return true
    }
    return false
  }

  // 分页相关函数
  const getTotalPages = useCallback((thumbnailsCount: number, itemsPerPage: number) => {
    return Math.max(1, Math.ceil(thumbnailsCount / itemsPerPage));
  }, []);
  
  // 获取当前页的缩略图
  const getCurrentPageThumbnails = useCallback((thumbnails: Thumbnail[], pagination: { currentPage: number, itemsPerPage: number }) => {
    const { currentPage, itemsPerPage } = pagination;
    const startIndex = currentPage * itemsPerPage;
    return thumbnails.slice(startIndex, startIndex + itemsPerPage);
  }, []);
  
  // 切换页码
  const changePage = useCallback((videoId: string, newPage: number) => {
    setVideos(prev => 
      prev.map(video => {
        if (video.id === videoId && video.thumbnailPagination) {
          const totalPages = getTotalPages(video.thumbnails.length, video.thumbnailPagination.itemsPerPage);
          // 确保页码在有效范围内
          const validPage = Math.max(0, Math.min(newPage, totalPages - 1));
          
          return {
            ...video,
            thumbnailPagination: {
              ...video.thumbnailPagination,
              currentPage: validPage
            }
          };
        }
        return video;
      })
    );
  }, [getTotalPages]);
  
  // 修改每页显示数量
  const changeItemsPerPage = useCallback((videoId: string, newItemsPerPage: number) => {
    setVideos(prev => 
      prev.map(video => {
        if (video.id === videoId && video.thumbnailPagination) {
          return {
            ...video,
            thumbnailPagination: {
              currentPage: 0, // 重置到第一页
              itemsPerPage: Math.max(1, newItemsPerPage)
            }
          };
        }
        return video;
      })
    );
  }, []);
  
  // 全局修改每页显示数量
  const changeDefaultItemsPerPage = useCallback((newValue: number) => {
    setDefaultItemsPerPage(Math.max(1, newValue));
    // 同时更新所有视频的分页设置
    setVideos(prev => 
      prev.map(video => {
        if (video.thumbnailPagination) {
          return {
            ...video,
            thumbnailPagination: {
              currentPage: 0, // 重置到第一页
              itemsPerPage: Math.max(1, newValue)
            }
          };
        }
        return video;
      })
    );
  }, []);

  /* 排序视频 */
  const sortItems = (items: VideoFile[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name)
      } else if (sortBy === "date") {
        return new Date(b.file.lastModified).getTime() - new Date(a.file.lastModified).getTime()
      } else if (sortBy === "size") {
        return b.size - a.size
      }
      // 默认按名称排序
      return a.name.localeCompare(b.name)
    })
  }

  /* 筛选视频 */
  const filterItems = (items: VideoFile[]) => {
    if (filterBy === "all") {
      return items
    } else if (filterBy === "completed") {
      return items.filter((item) => item.status === "completed")
    } else if (filterBy === "processing") {
      return items.filter((item) => item.status === "processing")
    }
    // 默认返回所有项目
    return items
  }

  // 获取筛选和排序后的视频
  const getFilteredAndSortedVideos = () => {
    return sortItems(filterItems(videos))
  }

  // 在视频候选帧中显示缩略图
  const renderThumbnailCandidates = (video: VideoFile) => {
    if (video.thumbnails.length === 0) return null;

    // 计算当前页面显示的缩略图
    const itemsPerPage = video.thumbnailPagination?.itemsPerPage || defaultItemsPerPage;
    const currentPage = video.thumbnailPagination?.currentPage || 0;
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    const visibleThumbnails = video.thumbnails.slice(start, end);
    const totalPages = Math.ceil(video.thumbnails.length / itemsPerPage);

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">候选帧 ({video.thumbnails.length})</h4>
        <div className="grid grid-cols-3 gap-2">
          {visibleThumbnails.map((thumb, idx) => {
            const actualIndex = start + idx;
            return (
              <div
                key={thumb.id}
                className={`relative cursor-pointer rounded-md overflow-hidden border-2 ${
                  video.selectedThumbnail === actualIndex
                    ? "border-blue-500"
                    : "border-transparent"
                }`}
                onClick={() => selectThumbnail(video.id, actualIndex)}
              >
                <div className="aspect-video">
                  <img
                    src={thumb.url}
                    alt={`缩略图 ${actualIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 flex justify-between items-center">
                  <span>{formatDuration(thumb.timestamp)}</span>
                  <span className="text-xs">{thumb.quality.toFixed(0)}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* 分页控制 */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-2 gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(video.id, Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 text-sm">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(video.id, Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <Card className="shadow-lg border-t-4 border-t-blue-500 dark:border-t-blue-400">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FileVideo className="h-6 w-6 mr-2 text-blue-500" />
              <span>视频缩略图提取工具</span>
        </div>
            {processorReady && (
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Cpu className="h-3 w-3 mr-1" />
                处理引擎就绪
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="space-y-4">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="upload" className="flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                <span>上传视频</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                <span>提取设置</span>
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center">
                <ImageIcon className="h-4 w-4 mr-2" />
                <span>管理缩略图</span>
              </TabsTrigger>
            </TabsList>

            {/* 上传视频标签页 */}
            <TabsContent value="upload" className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center transition-colors hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer bg-gray-50 dark:bg-gray-900"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  accept="video/*"
                  multiple
                  className="hidden"
                />

                {isProcessing ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                      <h3 className="text-xl font-medium mb-2">处理中...</h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                        正在处理视频并提取缩略图，请稍候。处理时间取决于视频大小和数量。
                      </p>
                      <div className="w-full max-w-md">
                        <Progress value={
                          videos.filter(v => v.status === "processing" || v.status === "completed").length / 
                          videos.length * 100
                        } className="h-2" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        已完成: {videos.filter(v => v.status === "completed").length}/{videos.length} 个视频
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                        <Upload className="h-12 w-12 text-blue-500 dark:text-blue-400" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">上传视频文件</h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        点击此区域或将视频文件拖放到这里。支持MP4、AVI、MKV、MOV等格式。
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Badge variant="outline">MP4</Badge>
                      <Badge variant="outline">AVI</Badge>
                      <Badge variant="outline">MKV</Badge>
                      <Badge variant="outline">MOV</Badge>
                      <Badge variant="outline">WebM</Badge>
                    </div>
                  </div>
                )}
              </div>

              {videos.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">已上传视频 ({videos.length})</h3>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleBatchExtraction}
                        disabled={isProcessing || !videos.some((v) => v.status === "pending")}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                          <Play className="h-4 w-4 mr-2" />
                        {isProcessing ? "处理中..." : "开始处理"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {videos.map((video) => (
                      <Card key={video.id} className={`overflow-hidden ${
                        video.status === "completed" ? "border-green-300 dark:border-green-800" :
                        video.status === "processing" ? "border-blue-300 dark:border-blue-800" :
                        video.status === "error" ? "border-red-300 dark:border-red-800" : ""
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium truncate" title={video.name}>{video.name}</h4>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatDuration(video.duration)}
                                </span>
                                <span>|</span>
                              <span>{formatFileSize(video.size)}</span>
                                <span>|</span>
                                <span>{video.resolution}</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500"
                              onClick={() => removeVideo(video.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            </div>

                            {video.status === "processing" && (
                            <div className="mt-4">
                              <div className="flex justify-between items-center mb-1 text-xs">
                                <span>提取进度</span>
                                <span>{Math.round(video.extractionProgress)}%</span>
                          </div>
                              <Progress value={video.extractionProgress} className="h-1" />
                            </div>
                          )}

                          {video.status === "completed" && (
                            <div className="mt-4 flex justify-between items-center">
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                <Check className="h-3 w-3 mr-1" />
                                已生成 {video.thumbnails.length} 张缩略图
                              </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                                onClick={() => {
                                  // 切换到管理标签页并聚焦到此视频
                                  document.querySelector('[data-value="manage"]')?.dispatchEvent(
                                    new MouseEvent('click', { bubbles: true })
                                  );
                                }}
                              >
                                查看缩略图
                          </Button>
                        </div>
                          )}

                          {video.status === "error" && (
                            <div className="mt-4">
                              <Badge variant="destructive">
                                <X className="h-3 w-3 mr-1" />
                                处理失败
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 设置标签页 */}
            <TabsContent value="settings">
              <Card className="border border-gray-200 dark:border-gray-800">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* 基本设置区域 */}
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center">
                        <Settings className="h-5 w-5 mr-2 text-blue-500" />
                        基本设置
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                      <div>
                            <Label htmlFor="thumbnailCount">缩略图数量</Label>
                            <div className="flex items-center mt-1 space-x-2">
                        <Input
                                id="thumbnailCount"
                          type="number"
                                min={1}
                                max={50}
                                value={settings.thumbnailCount}
                          onChange={(e) =>
                                  setSettings((prev) => ({ 
                                    ...prev, 
                                    thumbnailCount: Math.max(1, Math.min(50, parseInt(e.target.value) || 10)) 
                                  }))
                          }
                                className="w-20"
                              />
                              <Slider
                                min={1}
                                max={30}
                                step={1}
                                value={[settings.thumbnailCount]}
                                onValueChange={(value) =>
                                  setSettings((prev) => ({ ...prev, thumbnailCount: value[0] }))
                          }
                                className="flex-1"
                              />
                      </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              每个视频提取的缩略图数量 (1-50)
                            </p>
                    </div>

                      <div>
                            <Label htmlFor="startTime">开始时间 (秒)</Label>
                            <div className="flex items-center mt-1 space-x-2">
                        <Input
                                id="startTime"
                          type="number"
                                min={0}
                                value={settings.startTime}
                          onChange={(e) =>
                                  setSettings((prev) => ({ 
                                    ...prev, 
                                    startTime: Math.max(0, parseFloat(e.target.value) || 0) 
                                  }))
                          }
                                className="w-20"
                        />
                              <span className="text-sm text-gray-500">秒</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              跳过视频开始的指定秒数
                            </p>
                          </div>
                      </div>

                        <div className="space-y-4">
                      <div>
                        <Label htmlFor="outputFormat">输出格式</Label>
                        <Select
                          value={settings.outputFormat}
                              onValueChange={(value: "jpg" | "png") => 
                                setSettings((prev) => ({ ...prev, outputFormat: value }))
                          }
                        >
                              <SelectTrigger id="outputFormat" className="w-full mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                                <SelectItem value="jpg">JPG (较小)</SelectItem>
                            <SelectItem value="png">PNG (高质量)</SelectItem>
                          </SelectContent>
                        </Select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              JPG文件更小，PNG质量更高但体积更大
                            </p>
                      </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="prioritizeStatic"
                                checked={settings.prioritizeStatic}
                                onCheckedChange={(checked) => 
                                  setSettings((prev) => ({ ...prev, prioritizeStatic: !!checked }))
                                }
                              />
                              <Label htmlFor="prioritizeStatic" className="text-sm">优先选择静态帧</Label>
                    </div>
                    
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="avoidSubtitles"
                                checked={settings.avoidSubtitles}
                                onCheckedChange={(checked) => 
                                  setSettings((prev) => ({ ...prev, avoidSubtitles: !!checked }))
                                }
                              />
                              <Label htmlFor="avoidSubtitles" className="text-sm">避免包含字幕的帧</Label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="preferPeople"
                                checked={settings.preferPeople}
                                onCheckedChange={(checked) => 
                                  setSettings((prev) => ({ ...prev, preferPeople: !!checked }))
                                }
                              />
                              <Label htmlFor="preferPeople" className="text-sm">优先选择包含人物的帧</Label>
                        </div>
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="preferFaces"
                                checked={settings.preferFaces}
                                onCheckedChange={(checked) => 
                                  setSettings((prev) => ({ ...prev, preferFaces: !!checked }))
                                }
                              />
                              <Label htmlFor="preferFaces" className="text-sm">优先选择包含人物正脸的帧</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 高级设置区域 */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium flex items-center">
                          <Cpu className="h-5 w-5 mr-2 text-blue-500" />
                          高级设置
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                          className="text-sm"
                        >
                          {showAdvancedSettings ? "隐藏高级设置" : "显示高级设置"}
                        </Button>
                      </div>
                      
                      {showAdvancedSettings && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <Label htmlFor="threadCount">处理线程数</Label>
                              <div className="flex items-center mt-1 space-x-2">
                                <Input
                                  id="threadCount"
                                  type="number"
                                  min={1}
                                  max={16}
                                  value={settings.threadCount}
                                  onChange={(e) => 
                            setSettings((prev) => ({
                              ...prev,
                                      threadCount: Math.max(1, Math.min(16, parseInt(e.target.value) || 6)) 
                                    }))
                                  }
                                  className="w-20"
                                />
                                <Slider
                                  min={1}
                                  max={16}
                                  step={1}
                                  value={[settings.threadCount]}
                                  onValueChange={(value) =>
                                    setSettings((prev) => ({ ...prev, threadCount: value[0] }))
                          }
                                  className="flex-1"
                        />
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                并行处理线程数 (1-16)，根据电脑性能调整
                        </p>
                      </div>
                      
                            <div>
                              <Label htmlFor="subtitleModel">字幕检测模型</Label>
                              <Select
                                value={selectedSubtitleModel}
                                onValueChange={setSelectedSubtitleModel}
                              >
                                    <SelectTrigger id="subtitleModel" className="w-full mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableModels.subtitleDetection.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                      {model.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {availableModels.subtitleDetection.find(m => m.id === selectedSubtitleModel)?.description || "选择字幕检测模型"}
                            </p>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                        <Label htmlFor="subtitleLanguage">字幕语言优化</Label>
                        <Select
                          value={subtitleLanguage}
                          onValueChange={(value: any) => setSubtitleLanguage(value)}
                        >
                                <SelectTrigger id="subtitleLanguage" className="w-full mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">自动检测</SelectItem>
                            <SelectItem value="chinese">中文优化</SelectItem>
                            <SelectItem value="english">英文优化</SelectItem>
                            <SelectItem value="japanese">日文优化</SelectItem>
                          </SelectContent>
                        </Select>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          针对特定语言字幕优化检测算法
                        </p>
                          </div>
                      
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label htmlFor="subtitleDetectionStrength">字幕检测强度</Label>
                                <span className="text-sm">
                                  {Math.round(settings.subtitleDetectionStrength * 100)}%
                                </span>
                              </div>
                              <Slider
                                id="subtitleDetectionStrength"
                                min={0}
                                max={1}
                                step={0.05}
                                value={[settings.subtitleDetectionStrength]}
                                onValueChange={(value) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    subtitleDetectionStrength: value[0],
                                  }))
                                }
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                字幕检测灵敏度，值越高检测越严格
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label htmlFor="staticThreshold">静态帧检测阈值</Label>
                                <span className="text-sm">
                                  {Math.round(settings.staticFrameThreshold * 100)}%
                                </span>
                              </div>
                              <Slider
                                id="staticThreshold"
                                min={0}
                                max={1}
                                step={0.05}
                                value={[settings.staticFrameThreshold]}
                                onValueChange={(value) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    staticFrameThreshold: value[0],
                                  }))
                                }
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                静态帧判定阈值，值越高要求画面越静止
                              </p>
                            </div>
                      
                            <div className="space-y-3 flex flex-col justify-center">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="showSubtitleMarkers"
                                  checked={showSubtitleMarkers}
                                  onCheckedChange={(checked) => 
                                    setShowSubtitleMarkers(!!checked)
                                  }
                                />
                                <Label htmlFor="showSubtitleMarkers" className="text-sm">显示字幕检测标记</Label>
                              </div>
                            </div>
                          </div>

                          {/* 新增：字幕检测预览区域 */}
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">字幕检测预览</h4>
                              <Badge variant="outline" className="text-xs">实验性功能</Badge>
                            </div>
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2">
                                  <div className="aspect-video bg-gray-100 dark:bg-gray-900 mb-2 relative overflow-hidden">
                                    <img src="/placeholder.svg" alt="底部字幕示例" className="w-full h-full object-cover opacity-60" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-center text-white text-xs">
                                      示例底部字幕
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs">底部字幕</span>
                                    <Badge variant="destructive" className="text-xs">高检测率</Badge>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2">
                                  <div className="aspect-video bg-gray-100 dark:bg-gray-900 mb-2 relative overflow-hidden">
                                    <img src="/placeholder.svg" alt="顶部字幕示例" className="w-full h-full object-cover opacity-60" />
                                    <div className="absolute top-0 left-0 right-0 bg-black/70 p-2 text-center text-white text-xs">
                                      示例顶部字幕
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs">顶部字幕</span>
                                    <Badge variant="destructive" className="text-xs">中检测率</Badge>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2">
                                  <div className="aspect-video bg-gray-100 dark:bg-gray-900 mb-2 relative overflow-hidden">
                                    <img src="/placeholder.svg" alt="无字幕示例" className="w-full h-full object-cover opacity-60" />
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs">无字幕</span>
                                    <Badge variant="secondary" className="text-xs">推荐选择</Badge>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                字幕检测算法会识别视频帧中的字幕区域，包括底部、顶部和中间区域。检测结果将用于筛选最佳缩略图，避免选择带有字幕的帧。
                              </p>
                              
                              {/* 添加测试按钮 */}
                              <div className="flex justify-end mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    setSubtitleModelLoading(true);
                                    try {
                                      const available = await testModelAvailability('subtitle', selectedSubtitleModel);
                                      setCopyFeedback(available ? "模型可用" : "模型不可用，将使用基础检测");
                                    } catch (error) {
                                      setCopyFeedback("模型测试失败，将使用基础检测");
                                    } finally {
                                      setSubtitleModelLoading(false);
                                      setTimeout(() => setCopyFeedback(null), 3000);
                                    }
                                  }}
                                  disabled={subtitleModelLoading}
                                >
                                  {subtitleModelLoading ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Terminal className="h-4 w-4 mr-2" />
                                  )}
                                  测试字幕检测模型
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 保存和重置设置 */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveAdvancedSettings}
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/30"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        保存设置
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // 定义明确的默认设置
                          const defaultSettings: ExtractionSettings = {
                            startTime: 0,
                            threadCount: 6,
                            outputFormat: "jpg" as "jpg" | "png",
                            thumbnailCount: 10,
                            prioritizeStatic: true,
                            avoidSubtitles: true,
                            preferPeople: true,
                              preferFaces: true,
                            subtitleDetectionStrength: 0.8,
                            staticFrameThreshold: 0.8,
                          };
                          
                          console.log("重置为默认设置:", defaultSettings);
                          setSettings(defaultSettings);
                          
                          // 重置模型相关设置
                          setSelectedSubtitleModel("basic");
                          setSubtitleLanguage("auto");
                          setShowSubtitleMarkers(true);
                          
                          setCopyFeedback("已恢复默认设置");
                          setTimeout(() => setCopyFeedback(null), 3000);
                        }}
                          className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        重置默认
                      </Button>
                    </div>
                    
                    {copyFeedback && (
                      <span className="text-sm text-blue-600 animate-pulse">{copyFeedback}</span>
                    )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 管理缩略图标签页 */}
            <TabsContent value="manage" className="space-y-4">
              <Card className="border border-gray-200 dark:border-gray-800">
                <CardContent className="p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* 移除视图模式切换按钮 */}
                        
                  <div className="flex items-center space-x-2">
                          <Filter className="h-4 w-4 text-gray-500" />
                    <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                            <SelectTrigger className="h-8 w-32 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="completed">已完成</SelectItem>
                        <SelectItem value="processing">处理中</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                          <ArrowUpDown className="h-4 w-4 text-gray-500" />
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                            <SelectTrigger className="h-8 w-32 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                              <SelectItem value="name">按名称</SelectItem>
                              <SelectItem value="date">按日期</SelectItem>
                              <SelectItem value="size">按大小</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                  <Button
                    onClick={downloadAllThumbnails}
                    disabled={!videos.some((v) => v.status === "completed")}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-9"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    批量下载
                  </Button>
              </div>

                    {/* 缩略图展示区域 */}
                    {getFilteredAndSortedVideos().filter(video => video.status === "completed").length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-4">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">暂无缩略图</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md">
                          请先上传视频并完成缩略图提取，处理完成后的缩略图将显示在这里。
                        </p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => {
                            document.querySelector('[data-value="upload"]')?.dispatchEvent(
                              new MouseEvent('click', { bubbles: true })
                            );
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          上传视频
                        </Button>
                      </div>
                    ) : (
                      <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px] pr-4 -mr-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getFilteredAndSortedVideos()
                    .filter((video) => video.status === "completed")
                    .map((video) => (
                              <Card key={video.id} className="overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                {/* 移除根据viewMode条件渲染的内容，只保留网格视图 */}
                        <div className="relative">
                                      <div className="aspect-video bg-gray-100 dark:bg-gray-900 overflow-hidden">
                          <img
                            src={video.thumbnails[video.selectedThumbnail]?.url || "/placeholder.svg"}
                            alt={video.name}
                                          className="w-full h-full object-cover"
                          />
                          </div>
                                      <div className="absolute bottom-2 right-2">
                                        <Badge className="border-0 text-white text-xs px-2 py-0.5 rounded-sm shadow-md"
                                          style={{background: "linear-gradient(90deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.55) 100%)"}}>
                                          <Clock className="h-3 w-3 mr-1 inline-block align-middle" />
                                          {formatDuration(video.thumbnails[video.selectedThumbnail]?.timestamp || 0)}
                                        </Badge>
                                      </div>
                        </div>
                        <CardContent className="p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium truncate text-sm" title={video.name}>{video.name}</h3>
                                        <Badge variant="outline" className="text-xs whitespace-nowrap ml-2">
                              {video.thumbnails.length}张
                            </Badge>
                          </div>

                                  {/* 候选缩略图滚动条 - 修改为显示3x3布局 */}
                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                          <h4 className="text-xs font-medium text-gray-500">候选帧</h4>
                                          <div className="text-xs text-gray-500">
                                            {video.thumbnails.length > 0 && (
                                              <span>
                                            {(video.thumbnailPagination?.currentPage || 0) * 9 + 1}-{Math.min(((video.thumbnailPagination?.currentPage || 0) * 9 + 9), video.thumbnails.length)}/{video.thumbnails.length}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                            
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-900">
                                          {video.thumbnails.length === 0 ? (
                                            <div className="text-center text-gray-500 text-xs py-4">
                                              暂无缩略图
                                            </div>
                                          ) : (
                                            <>
                                              <div className="grid grid-cols-3 gap-3 mb-2">
                                                {getCurrentPageThumbnails(video.thumbnails, {
                                                  currentPage: video.thumbnailPagination?.currentPage || 0,
                                              itemsPerPage: 9 // 修改为显示9个缩略图
                                                }).map((thumbnail, index) => {
                                                  // 计算实际索引
                                              const actualIndex = (video.thumbnailPagination?.currentPage || 0) * 9 + index; // 修改为9个每页
                                                  
                                                  return (
                                                    <button
                                                      key={thumbnail.id}
                                                      onClick={() => selectThumbnail(video.id, actualIndex)}
                                                      className={`relative flex-shrink-0 border rounded overflow-hidden ${
                                                        actualIndex === video.selectedThumbnail
                                                          ? "border-blue-500 border-2"
                                                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                                                      }`}
                                                    >
                                                      <div className="relative w-full aspect-video group">
                                                        <img
                                                          src={thumbnail.url || "/placeholder.svg"}
                                                          alt={`缩略图 ${actualIndex + 1}`}
                                                          className="w-full h-full object-cover"
                                                        />
                                                        {actualIndex === video.selectedThumbnail && (
                                                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center pointer-events-none">
                                                            <Check className="h-5 w-5 text-blue-600" />
                                                          </div>
                                                        )}
                                                      </div>
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                              
                                          {/* 分页控制 - 修改为9个每页 */}
                                          {video.thumbnails.length > 9 && (
                                                <div className="flex justify-center items-center gap-2 pt-2">
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => changePage(video.id, (video.thumbnailPagination?.currentPage || 0) - 1)}
                                                    disabled={(video.thumbnailPagination?.currentPage || 0) === 0}
                                                    className="h-7 w-7 p-0"
                                                  >
                                                    <ChevronLeft className="h-4 w-4" />
                                                  </Button>
                                                  
                                                  <span className="text-xs text-gray-500">
                                                {(video.thumbnailPagination?.currentPage || 0) + 1}/{Math.ceil(video.thumbnails.length / 9)}
                                                  </span>
                                                  
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => changePage(video.id, (video.thumbnailPagination?.currentPage || 0) + 1)}
                                                disabled={(video.thumbnailPagination?.currentPage || 0) >= Math.ceil(video.thumbnails.length / 9) - 1}
                                                    className="h-7 w-7 p-0"
                                                  >
                                                    <ChevronRight className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex justify-between items-center">
                                        <div className="flex space-x-1">
                                          {/* 移除所有类型标记显示 */}
                                        </div>
                                        <Button
                                          size="sm"
                                          onClick={() => downloadThumbnail(video)}
                                          className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                          <Download className="h-3 w-3 mr-1" />
                                          下载
                                        </Button>
                                      </div>
                                    </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
