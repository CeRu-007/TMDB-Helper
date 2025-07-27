"use client"

import React, { useState, useCallback, useRef } from "react"
import {
  Upload,
  FileText,
  Wand2,
  Settings,
  Download,
  Trash2,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Sparkles,
  BookOpen,
  Film,
  CheckCircle,
  Edit,
  Check,
  X,
  ArrowUp,
  XCircle,
  Clock,
  Minus,
  Plus,
  ArrowRight,
  MessageCircle,
  Feather,
  RotateCcw,
  List,
  Edit3,
  EyeOff,
  Eye,
  Scale,
  MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

// 硅基流动支持的模型列表
const SILICONFLOW_MODELS = [
  { id: "deepseek-ai/DeepSeek-V2.5", name: "DeepSeek-V2.5", description: "强大的中文理解能力" },
  { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen2.5-72B", description: "阿里通义千问大模型" },
  { id: "meta-llama/Meta-Llama-3.1-70B-Instruct", name: "Llama-3.1-70B", description: "Meta开源大模型" },
  { id: "01-ai/Yi-1.5-34B-Chat", name: "Yi-1.5-34B", description: "零一万物大模型" },
  { id: "THUDM/glm-4-9b-chat", name: "GLM-4-9B", description: "智谱AI大模型" }
]

// 标题风格选项
const TITLE_STYLES = [
  // 原有风格
  { id: "location_skill", name: "地名招式风格", description: "优先使用字幕中出现的具体地名、招式名、技能名作为标题核心，采用简洁的组合方式，如：树神之谜、封印之战、古村秘密等，避免使用冒号或复杂格式", icon: "⚔️" },
  { id: "character_focus", name: "角色聚焦", description: "以主要角色名字和行动为标题重点，突出角色的成长与变化", icon: "👤" },
  { id: "plot_highlight", name: "情节亮点", description: "突出本集最重要的情节转折点，强调故事发展的关键节点", icon: "🎯" },
  { id: "emotional_core", name: "情感核心", description: "以情感冲突或情感高潮为标题主题，注重内心世界的描绘", icon: "💫" },

  // 新增风格
  { id: "mystery_suspense", name: "悬疑推理", description: "营造神秘感和悬念，使用疑问式或暗示性的表达，如：消失的真相、隐藏的秘密、未解之谜", icon: "🔍" },
  { id: "action_adventure", name: "动作冒险", description: "强调动作场面和冒险元素，使用动感十足的词汇，如：激战、追击、突破、征服", icon: "⚡" },
  { id: "romantic_drama", name: "浪漫情感", description: "突出爱情线和情感纠葛，使用温馨或戏剧化的表达，如：心动时刻、告白之夜、离别之痛", icon: "💕" },
  { id: "philosophical", name: "哲理思辨", description: "体现深层思考和人生哲理，使用富有思辨性的词汇，如：选择、命运、真理、觉醒", icon: "🤔" },
  { id: "comedy_humor", name: "喜剧幽默", description: "突出轻松幽默的元素，使用俏皮或反差的表达，如：意外惊喜、搞笑日常、乌龙事件", icon: "😄" },
  { id: "traditional_classic", name: "传统经典", description: "采用经典的命名方式，使用传统文学色彩的词汇，如：风云变幻、英雄本色、江湖恩仇", icon: "📜" },
  { id: "modern_trendy", name: "现代时尚", description: "使用现代化和时尚的表达方式，贴近年轻观众的语言习惯，如：逆袭、燃爆、高能", icon: "🔥" },
  { id: "poetic_artistic", name: "诗意文艺", description: "采用优美诗意的表达，注重意境和美感，如：月下花前、春风化雨、岁月如歌", icon: "🌸" },
  { id: "simple_direct", name: "简洁直白", description: "使用最直接明了的表达，避免修饰，直击要害，如：决战、重逢、背叛、新生", icon: "📝" },
  { id: "symbolic_metaphor", name: "象征隐喻", description: "运用象征和隐喻手法，富有深层含义，如：破茧成蝶、星火燎原、镜花水月", icon: "🎭" },
  { id: "countdown_urgency", name: "紧迫倒计时", description: "营造紧迫感和时间压力，如：最后一战、倒计时、生死时速、关键时刻", icon: "⏰" }
]

// 简介风格选项
const SUMMARY_STYLES = [
  // 平台风格
  { id: "crunchyroll", name: "Crunchyroll平台风格", description: "动漫平台专业风格：结构化简洁表达，客观描述核心冲突，每段≤15字的精准叙述", icon: "🍥" },
  { id: "netflix", name: "Netflix平台风格", description: "流媒体平台戏剧风格：情感驱动叙述，强调角色困境与选择，富有张力的悬念营造", icon: "🎬" },
  { id: "ai_free", name: "AI自由发挥", description: "让AI根据内容自主选择最合适的表达方式，无固定格式限制，追求自然流畅的叙述", icon: "🤖" },

  // 常规风格
  { id: "professional", name: "专业", description: "正式、准确的描述风格", icon: "📝" },
  { id: "engaging", name: "引人入胜", description: "吸引观众的生动描述", icon: "✨" },
  { id: "suspenseful", name: "悬疑", description: "营造紧张悬疑氛围", icon: "🔍" },
  { id: "emotional", name: "情感", description: "注重情感表达和共鸣", icon: "💝" },
  { id: "humorous", name: "幽默", description: "轻松幽默的表达方式", icon: "😄" },
  { id: "dramatic", name: "戏剧化", description: "强调戏剧冲突和张力", icon: "🎭" },

  // 新增风格
  { id: "concise", name: "简洁明了", description: "简短直接的核心内容描述", icon: "📋" },
  { id: "detailed", name: "详细描述", description: "丰富详尽的内容介绍", icon: "📖" },
  { id: "action", name: "动作导向", description: "突出动作场面和节奏感", icon: "⚡" },
  { id: "character", name: "角色聚焦", description: "以角色发展和关系为中心", icon: "👥" },
  { id: "plot", name: "情节推进", description: "强调故事情节的发展脉络", icon: "🧩" },
  { id: "atmospheric", name: "氛围营造", description: "注重场景和氛围的描述", icon: "🌅" },
  { id: "technical", name: "技术分析", description: "从制作技术角度进行描述", icon: "🎯" },
  { id: "artistic", name: "文艺风格", description: "优雅文艺的表达方式", icon: "🎨" },
  { id: "accessible", name: "通俗易懂", description: "大众化的表达方式", icon: "👨‍👩‍👧‍👦" },
  { id: "objective", name: "客观中性", description: "客观事实性的描述", icon: "⚖️" }
]

// 兼容性：保持原有的GENERATION_STYLES用于向后兼容
const GENERATION_STYLES = SUMMARY_STYLES

// 生成状态类型
type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed'

// 字幕文件类型
interface SubtitleFile {
  id: string
  name: string
  size: number
  type: string
  content: string
  episodes: SubtitleEpisode[]
  uploadTime: Date
  generationStatus?: GenerationStatus
  generationProgress?: number // 0-100的进度百分比
  generatedCount?: number // 已生成的集数
}

interface SubtitleEpisode {
  episodeNumber: number
  title?: string
  content: string
  duration?: string
  wordCount: number
  lastTimestamp?: string // 最后一个时间戳，用于计算运行时间
}

// 生成结果
interface GenerationResult {
  episodeNumber: number
  originalTitle?: string
  generatedTitle: string
  generatedSummary: string
  confidence: number
  wordCount: number
  generationTime: number
  model: string
  styles: string[]
  fileName?: string // 添加文件名字段，用于批量生成时标识来源文件
  styleId?: string // 单个风格ID，用于标识该结果对应的风格
  styleName?: string // 风格名称，用于显示
}

// 生成配置
interface GenerationConfig {
  model: string
  summaryLength: [number, number] // [min, max]
  selectedStyles: string[] // 简介风格
  selectedTitleStyle: string // 标题风格（单选）
  customPrompt?: string
  temperature: number
  includeOriginalTitle: boolean
}

// 导出配置
interface ExportConfig {
  includeTitle: boolean
  includeOverview: boolean
  includeRuntime: boolean
}

// 智能截断文件名函数
function truncateFileName(fileName: string, maxLength: number = 30): string {
  if (fileName.length <= maxLength) {
    return fileName
  }

  // 提取文件名和扩展名
  const lastDotIndex = fileName.lastIndexOf('.')
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : ''

  // 如果扩展名太长，直接截断
  if (extension.length > 10) {
    return fileName.substring(0, maxLength - 3) + '...'
  }

  // 计算可用于文件名的长度
  const availableLength = maxLength - extension.length - 3 // 3 for '...'

  if (availableLength <= 0) {
    return fileName.substring(0, maxLength - 3) + '...'
  }

  // 智能截断：显示开头和结尾，中间用省略号
  const startLength = Math.ceil(availableLength * 0.6)
  const endLength = availableLength - startLength

  if (endLength <= 0) {
    return name.substring(0, startLength) + '...' + extension
  }

  return name.substring(0, startLength) + '...' + name.substring(name.length - endLength) + extension
}

// 获取文件名显示组件
function FileNameDisplay({
  fileName,
  maxLength = 30,
  className = ""
}: {
  fileName: string
  maxLength?: number
  className?: string
}) {
  const truncatedName = truncateFileName(fileName, maxLength)

  return <span className={className}>{truncatedName}</span>
}

export function SubtitleEpisodeGenerator({
  onOpenGlobalSettings
}: {
  onOpenGlobalSettings?: (section: string) => void
} = {}) {
  const [subtitleFiles, setSubtitleFiles] = useState<SubtitleFile[]>([])
  const [selectedFile, setSelectedFile] = useState<SubtitleFile | null>(null)
  const [generationResults, setGenerationResults] = useState<Record<string, GenerationResult[]>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [shouldReopenSettingsDialog, setShouldReopenSettingsDialog] = useState(false)
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeTitle: true,
    includeOverview: true,
    includeRuntime: true
  })
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  const [apiKey, setApiKey] = useState("")

  // 更新生成结果的函数
  const handleUpdateResult = useCallback((fileId: string, resultIndex: number, updatedResult: Partial<GenerationResult>) => {
    setGenerationResults(prev => {
      const fileResults = prev[fileId] || []
      const newResults = [...fileResults]
      if (newResults[resultIndex]) {
        newResults[resultIndex] = { ...newResults[resultIndex], ...updatedResult }
      }
      return {
        ...prev,
        [fileId]: newResults
      }
    })
  }, [])

  // 置顶风格简介的函数
  const handleMoveToTop = useCallback((fileId: string, resultIndex: number) => {
    setGenerationResults(prev => {
      const fileResults = prev[fileId] || []
      if (resultIndex <= 0 || resultIndex >= fileResults.length) return prev

      const newResults = [...fileResults]
      const [movedItem] = newResults.splice(resultIndex, 1)
      newResults.unshift(movedItem)

      return {
        ...prev,
        [fileId]: newResults
      }
    })
  }, [])
  const [config, setConfig] = useState<GenerationConfig>(() => {
    // 从本地存储加载配置
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('episode_generator_config')
      // 从全局设置加载模型配置
      const globalSettings = localStorage.getItem('siliconflow_api_settings')
      let episodeGenerationModel = "deepseek-ai/DeepSeek-V2.5" // 默认模型
      
      if (globalSettings) {
        try {
          const settings = JSON.parse(globalSettings)
          if (settings.episodeGenerationModel) {
            episodeGenerationModel = settings.episodeGenerationModel
          }
        } catch (e) {
          console.error('Failed to parse global siliconflow settings:', e)
        }
      }
      
      if (saved) {
        try {
          const parsedConfig = JSON.parse(saved)
          // 兼容性处理：从旧的数组格式迁移到新的单选格式
          if (parsedConfig.selectedTitleStyles && Array.isArray(parsedConfig.selectedTitleStyles)) {
            // 迁移：取第一个选中的风格作为单选值
            parsedConfig.selectedTitleStyle = parsedConfig.selectedTitleStyles[0] || "location_skill"
            delete parsedConfig.selectedTitleStyles
          } else if (!parsedConfig.selectedTitleStyle) {
            // 如果没有标题风格设置，使用默认值
            parsedConfig.selectedTitleStyle = "location_skill"
          }

          // 验证和清理简介风格选择：确保所有选中的风格ID都是有效的
          if (parsedConfig.selectedStyles && Array.isArray(parsedConfig.selectedStyles)) {
            const validStyleIds = GENERATION_STYLES.map(s => s.id)
            const originalStyles = [...parsedConfig.selectedStyles]
            parsedConfig.selectedStyles = parsedConfig.selectedStyles.filter(styleId =>
              validStyleIds.includes(styleId)
            )

            // 如果有无效的风格被过滤掉，记录日志并保存清理后的配置
            const removedStyles = originalStyles.filter(styleId => !validStyleIds.includes(styleId))
            if (removedStyles.length > 0) {
              console.warn(`清理了无效的风格ID: ${removedStyles.join(', ')}`)
              // 立即保存清理后的配置
              setTimeout(() => {
                localStorage.setItem('episode_generator_config', JSON.stringify(parsedConfig))
              }, 100)
            }
          } else {
            // 如果没有简介风格设置或格式不正确，使用空数组
            parsedConfig.selectedStyles = []
          }

          // 移除model字段，因为model应该从全局设置中获取
          const { model, ...configWithoutModel } = parsedConfig

          // 返回配置时使用从全局设置加载的model或默认model
          return {
            model: episodeGenerationModel,
            summaryLength: [20, 30],
            temperature: 0.7,
            includeOriginalTitle: true,
            ...configWithoutModel
          }
        } catch (e) {
          console.error('Failed to parse saved config:', e)
        }
      }
    }
    // 默认配置
    return {
      model: "deepseek-ai/DeepSeek-V2.5",
      summaryLength: [20, 30],
      selectedStyles: [], // 默认不选择任何风格，让用户自主选择
      selectedTitleStyle: "location_skill", // 默认选择地名招式风格
      temperature: 0.7,
      includeOriginalTitle: true
    }
  })

  // 从全局设置加载API密钥
  const loadGlobalSettings = React.useCallback(() => {
    const globalSiliconFlowSettings = localStorage.getItem('siliconflow_api_settings')
    if (globalSiliconFlowSettings) {
      try {
        const settings = JSON.parse(globalSiliconFlowSettings)
        setApiKey(settings.apiKey || '')
      } catch (error) {
        console.error('解析全局硅基流动设置失败:', error)
      }
    } else {
      // 兼容旧的设置
      const savedApiKey = localStorage.getItem('siliconflow_api_key')
      if (savedApiKey) {
        setApiKey(savedApiKey)
      }
    }
  }, [])

  // 初始加载配置
  React.useEffect(() => {
    loadGlobalSettings()
  }, [loadGlobalSettings])

  // 监听全局设置变化
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'siliconflow_api_settings') {
        console.log('检测到全局硅基流动设置变化，重新加载配置')
        loadGlobalSettings()
      }
    }

    // 监听localStorage变化
    window.addEventListener('storage', handleStorageChange)

    // 监听自定义事件（用于同一页面内的设置变化）
    const handleCustomSettingsChange = () => {
      console.log('检测到设置页面配置变化，重新加载配置')
      loadGlobalSettings()
    }
    window.addEventListener('siliconflow-settings-changed', handleCustomSettingsChange)

    // 监听全局设置对话框关闭事件
    const handleGlobalSettingsClose = () => {
      console.log('检测到全局设置对话框关闭')
      if (shouldReopenSettingsDialog) {
        console.log('重新打开分集简介生成设置对话框')
        setShouldReopenSettingsDialog(false)
        // 延迟一点时间确保全局设置对话框完全关闭
        setTimeout(() => {
          setShowSettingsDialog(true)
        }, 100)
      }
    }
    window.addEventListener('global-settings-closed', handleGlobalSettingsClose)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('siliconflow-settings-changed', handleCustomSettingsChange)
      window.removeEventListener('global-settings-closed', handleGlobalSettingsClose)
    }
  }, [loadGlobalSettings, shouldReopenSettingsDialog])



  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件上传（通用函数）
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      if (!file.name.match(/\.(srt|vtt|ass|ssa)$/i)) {
        alert(`不支持的文件格式: ${file.name}`)
        continue
      }

      try {
        const content = await file.text()
        const episodes = parseSubtitleFile(content, file.name)

        const subtitleFile: SubtitleFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content,
          episodes,
          uploadTime: new Date()
        }

        setSubtitleFiles(prev => [...prev, subtitleFile])
      } catch (error) {
        console.error('文件解析失败:', error)
        alert(`文件解析失败: ${file.name}`)
      }
    }
  }, [])

  // 处理文件上传
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    await processFiles(files)

    // 清空input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [processFiles])

  // 拖拽处理函数
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => {
      const newCounter = prev - 1
      if (newCounter === 0) {
        setIsDragOver(false)
      }
      return newCounter
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragOver(false)
    setDragCounter(0)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await processFiles(files)
    }
  }, [processFiles])

  // 解析字幕文件
  const parseSubtitleFile = (content: string, filename: string): SubtitleEpisode[] => {
    const episodes: SubtitleEpisode[] = []

    try {
      // 简单的SRT格式解析
      if (filename.toLowerCase().endsWith('.srt')) {
        const blocks = content.split(/\n\s*\n/).filter(block => block.trim())

        let currentEpisode = 1
        let episodeContent = ""
        let totalContent = ""
        let lastTimestamp = ""

        blocks.forEach(block => {
          const lines = block.trim().split('\n')
          if (lines.length >= 3) {
            // 提取时间戳
            const timestampLine = lines[1]
            if (timestampLine && timestampLine.includes('-->')) {
              const endTime = timestampLine.split('-->')[1].trim()
              if (endTime) {
                lastTimestamp = endTime
              }
            }

            // 提取字幕文本（跳过序号和时间戳）
            const text = lines.slice(2).join(' ').replace(/<[^>]*>/g, '').trim()
            if (text) {
              episodeContent += text + " "
              totalContent += text + " "

              // 检查是否是新集的开始（简单的启发式规则）
              if (text.match(/第\s*\d+\s*集|Episode\s*\d+|EP\s*\d+/i)) {
                if (episodeContent.trim() && episodeContent.trim().length > 50) {
                  episodes.push({
                    episodeNumber: currentEpisode,
                    content: episodeContent.trim(),
                    wordCount: episodeContent.trim().length,
                    lastTimestamp: lastTimestamp
                  })
                  currentEpisode++
                  episodeContent = ""
                }
              }
            }
          }
        })

        // 添加最后一集
        if (episodeContent.trim() && episodeContent.trim().length > 50) {
          episodes.push({
            episodeNumber: currentEpisode,
            content: episodeContent.trim(),
            wordCount: episodeContent.trim().length,
            lastTimestamp: lastTimestamp
          })
        }

        // 如果没有检测到分集，尝试按内容长度分割
        if (episodes.length === 0 && totalContent.trim()) {
          const sentences = totalContent.split(/[。！？.!?]/).filter(s => s.trim().length > 10)
          const chunkSize = Math.max(10, Math.floor(sentences.length / 3)) // 假设分为3集

          for (let i = 0; i < sentences.length; i += chunkSize) {
            const chunk = sentences.slice(i, i + chunkSize).join('。')
            if (chunk.trim()) {
              episodes.push({
                episodeNumber: Math.floor(i / chunkSize) + 1,
                content: chunk.trim(),
                wordCount: chunk.trim().length
              })
            }
          }
        }
      }

      // VTT格式解析
      else if (filename.toLowerCase().endsWith('.vtt')) {
        const lines = content.split('\n')
        let episodeContent = ""
        let lastTimestamp = ""

        lines.forEach(line => {
          const trimmedLine = line.trim()
          // 提取时间戳
          if (trimmedLine.includes('-->')) {
            const endTime = trimmedLine.split('-->')[1].trim()
            if (endTime) {
              lastTimestamp = endTime
            }
          }
          // 跳过时间戳和空行
          else if (trimmedLine && !trimmedLine.startsWith('WEBVTT')) {
            episodeContent += trimmedLine + " "
          }
        })

        if (episodeContent.trim()) {
          episodes.push({
            episodeNumber: 1,
            content: episodeContent.trim(),
            wordCount: episodeContent.trim().length,
            lastTimestamp: lastTimestamp
          })
        }
      }

      // 如果没有检测到分集，将整个内容作为一集
      if (episodes.length === 0) {
        const cleanContent = content
          .replace(/<[^>]*>/g, '') // 移除HTML标签
          .replace(/\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n/g, '') // 移除SRT时间戳
          .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '') // 移除VTT时间戳
          .replace(/WEBVTT/g, '') // 移除VTT头部
          .replace(/\n+/g, ' ') // 合并多个换行
          .trim()

        if (cleanContent) {
          episodes.push({
            episodeNumber: 1,
            content: cleanContent,
            wordCount: cleanContent.length
          })
        }
      }
    } catch (error) {
      console.error('解析字幕文件失败:', error)
      // 返回一个默认的集数
      episodes.push({
        episodeNumber: 1,
        content: '字幕文件解析失败，请检查文件格式',
        wordCount: 0
      })
    }

    return episodes
  }

  // 将时间戳转换为分钟数（四舍五入）
  const timestampToMinutes = (timestamp: string): number => {
    if (!timestamp) return 0

    try {
      // 处理SRT格式: 00:45:30,123 或 VTT格式: 00:45:30.123
      const timeStr = timestamp.replace(',', '.').split('.')[0] // 移除毫秒部分
      const parts = timeStr.split(':')

      if (parts.length === 3) {
        const hours = parseInt(parts[0]) || 0
        const minutes = parseInt(parts[1]) || 0
        const seconds = parseInt(parts[2]) || 0

        const totalMinutes = hours * 60 + minutes + seconds / 60
        return Math.round(totalMinutes)
      }
    } catch (error) {
      console.error('时间戳解析失败:', timestamp, error)
    }

    return 0
  }

  // 调用硅基流动API生成内容（为单个风格生成）
  const generateEpisodeContentForStyle = async (episode: SubtitleEpisode, styleId: string): Promise<GenerationResult> => {
    const prompt = buildPromptForStyle(episode, config, styleId)

    const response = await fetch('/api/siliconflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "你是一个专业的影视内容编辑，擅长根据字幕内容生成精彩的分集标题和剧情简介。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: config.temperature,
        max_tokens: 800,
        apiKey: apiKey
      })
    })

    if (!response.ok) {
      let errorMessage = `API调用失败 (${response.status})`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage

        // 根据错误类型提供更友好的提示
        if (response.status === 401) {
          errorMessage = 'API密钥无效，请检查配置'
        } else if (response.status === 429) {
          errorMessage = 'API调用频率过高，请稍后重试'
        } else if (response.status === 500) {
          errorMessage = '服务器内部错误，请稍后重试'
        }
      } catch (e) {
        // 无法解析错误响应
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'API调用失败')
    }

    const content = result.data.content

    if (!content) {
      throw new Error('API返回内容为空，请重试')
    }

    // 解析生成的内容
    return parseGeneratedContent(content, episode, config, styleId)
  }

  // 为所有选中的风格生成内容
  const generateEpisodeContent = async (episode: SubtitleEpisode): Promise<GenerationResult[]> => {
    const results: GenerationResult[] = []

    // 验证和过滤有效的风格ID
    const validStyleIds = GENERATION_STYLES.map(s => s.id)
    const validSelectedStyles = config.selectedStyles.filter(styleId => {
      const isValid = validStyleIds.includes(styleId)
      if (!isValid) {
        console.warn(`跳过无效的风格ID: ${styleId}`)
      }
      return isValid
    })

    if (validSelectedStyles.length === 0) {
      console.error('没有有效的风格被选中')
      return results
    }

    // 为每个有效的选中风格单独生成
    for (const styleId of validSelectedStyles) {
      try {
        const result = await generateEpisodeContentForStyle(episode, styleId)
        results.push(result)

        // 避免API限流，在风格之间添加短暂延迟
        if (validSelectedStyles.length > 1 && styleId !== validSelectedStyles[validSelectedStyles.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`风格 ${styleId} 生成失败:`, error)
        // 添加失败的结果占位符
        const style = GENERATION_STYLES.find(s => s.id === styleId)
        results.push({
          episodeNumber: episode.episodeNumber,
          generatedTitle: `第${episode.episodeNumber}集（${style?.name || styleId}风格生成失败）`,
          generatedSummary: `生成失败：${error instanceof Error ? error.message : '未知错误'}`,
          confidence: 0,
          wordCount: 0,
          generationTime: Date.now(),
          model: config.model,
          styles: [styleId],
          styleId: styleId
        })
      }
    }

    return results
  }

  // 构建提示词（为单个风格）
  const buildPromptForStyle = (episode: SubtitleEpisode, config: GenerationConfig, styleId: string): string => {
    const style = GENERATION_STYLES.find(s => s.id === styleId)
    const styleDescription = style ? `${style.name}(${style.description})` : styleId

    // 构建标题风格要求
    const titleStyleRequirements = config.selectedTitleStyle
      ? (() => {
          const titleStyle = TITLE_STYLES.find(s => s.id === config.selectedTitleStyle)
          return titleStyle ? `${titleStyle.name}(${titleStyle.description})` : config.selectedTitleStyle
        })()
      : "简洁有力，8-15个字符，体现本集核心看点"

    // 所有风格都使用统一的字数设置
    const summaryRequirement = `字数控制在${config.summaryLength[0]}-${config.summaryLength[1]}字范围内，最多不超过${config.summaryLength[1] + 10}字`

    // Netflix风格的特殊要求
    const netflixSpecialRequirements = styleId === 'netflix' ? `
5. **Netflix风格特殊要求**：
   - **情感驱动叙述**：
     * 重点描述角色的内心冲突和情感状态
     * 突出人物关系的变化和张力
     * 强调角色面临的道德选择和困境
     * 适度使用情感词汇增强代入感
   - **戏剧性表达**：
     * 使用富有张力的语言营造氛围
     * 突出关键转折点的戏剧效果
     * 强调危机感和紧迫感
     * 避免平铺直叙，增加表达力度
   - **悬念营造**：
     * 结尾必须留下强烈的期待感
     * 暗示即将到来的重大变化
     * 突出未解决的核心问题
     * 使用"当...时"、"然而"等转折词增强悬念
   - **结构要求**：
     * 采用：[角色困境] + [情感冲突] + [悬念钩子] 的三段式结构
     * 每部分衔接自然，层层递进
     * 重视角色名字的使用，增强个人化色彩
   - **语言风格**：
     * 生动有力，富有感染力
     * 适度使用修饰词增强表现力
     * 避免过于客观的描述，注入情感色彩
     * 禁用疑问句，但可使用感叹词增强语气` : ''

    // Crunchyroll风格的特殊要求
    const crunchyrollSpecialRequirements = styleId === 'crunchyroll' ? `
5. **Crunchyroll风格特殊要求**：
   - **句式结构**（严格遵循以下两种格式之一）：
     * 两段式：[情节点1]，[情节点2]。（一个逗号一个句号）
     * 三段式：[情节点1]，[情节点2]，[情节点3]。（两个逗号一个句号）
   - **内容规范**：
     * 每段情节点必须是主谓宾完整短句，长度不超过15字
     * 聚焦核心冲突或人物关系转折，避免细节描述
     * 结尾句必须保留悬念（暗示威胁、新角色登场或未解决事件）
     * 用词简洁客观，严禁使用感叹号、夸张形容词
   - **主题适配**：
     * 奇幻/恐怖类：强调危机或超自然元素
     * 日常/恋爱类：突出情感变化或生活事件
     * 动作/冒险类：点明战斗目标与阻碍
   - **语言要求**：
     * 使用陈述句，禁用疑问句、反问句
     * 客观中立叙述，不带主观情感色彩
     * 避免华丽辞藻和复杂句式
     * 重点描述动作和事件，而非心理活动` : ''

    // AI自由发挥风格的特殊要求
    const aiFreeSpecialRequirements = styleId === 'ai_free' ? `
5. **AI自由发挥风格特殊要求**：
   - 根据这段字幕文本生成一段分集剧情简介
   - 无任何格式限制，完全按照AI的理解和判断来表达
   - 自主选择最合适的叙述方式和语言风格
   - 保持简洁明了，突出核心剧情要点` : ''

    return `请根据以下字幕内容，为第${episode.episodeNumber}集生成标题和剧情简介：

## 字幕内容
${episode.content.substring(0, 2000)}${episode.content.length > 2000 ? '...' : ''}

## 生成要求
1. **标题要求**：${titleStyleRequirements}
2. **简介要求**：${summaryRequirement}，包含主要情节和看点
3. **简介风格要求**：严格采用${styleDescription}的风格，确保风格特色鲜明
4. **语言要求**：使用中文，语言生动自然${netflixSpecialRequirements}${crunchyrollSpecialRequirements}${aiFreeSpecialRequirements}

## ⚠️ 重要要求
- 简介字数必须控制在${config.summaryLength[0]}-${config.summaryLength[1]}字范围内
- 如果内容需要，最多可超出到${config.summaryLength[1] + 10}字
- 超出${config.summaryLength[1] + 10}字的内容不符合要求
- **严禁使用疑问句、反问句或以问号结尾的句子**
- **所有简介必须使用陈述句，确定性地描述剧情内容**

## 输出格式
请严格按照以下JSON格式输出：
{
  "title": "分集标题",
  "summary": "分集剧情简介",
  "confidence": 0.85
}

${config.customPrompt ? `\n## 额外要求\n${config.customPrompt}` : ''}`
  }

  // 构建提示词（兼容旧版本，融合多个风格）
  const buildPrompt = (episode: SubtitleEpisode, config: GenerationConfig): string => {
    const styleDescriptions = config.selectedStyles.map(styleId => {
      const style = GENERATION_STYLES.find(s => s.id === styleId)
      return style ? `${style.name}(${style.description})` : styleId
    }).join('、')

    // 构建标题风格要求
    const titleStyleRequirements = config.selectedTitleStyle
      ? (() => {
          const titleStyle = TITLE_STYLES.find(s => s.id === config.selectedTitleStyle)
          return titleStyle ? `${titleStyle.name}(${titleStyle.description})` : config.selectedTitleStyle
        })()
      : "简洁有力，8-15个字符，体现本集核心看点"

    const lengthRange = `${config.summaryLength[0]}-${config.summaryLength[1]}`

    return `请根据以下字幕内容，为第${episode.episodeNumber}集生成标题和剧情简介：

## 字幕内容
${episode.content.substring(0, 2000)}${episode.content.length > 2000 ? '...' : ''}

## 生成要求
1. **标题要求**：${titleStyleRequirements}
2. **简介要求**：字数控制在${lengthRange}字范围内，最多不超过${config.summaryLength[1] + 10}字，包含主要情节和看点
3. **风格要求**：采用${styleDescriptions}的风格
4. **语言要求**：使用中文，语言生动自然

## ⚠️ 重要要求
- 简介字数必须控制在${lengthRange}字范围内
- 如果内容需要，最多可超出到${config.summaryLength[1] + 10}字
- 超出${config.summaryLength[1] + 10}字的内容不符合要求
- **严禁使用疑问句、反问句或以问号结尾的句子**
- **所有简介必须使用陈述句，确定性地描述剧情内容**

## 输出格式
请严格按照以下JSON格式输出：
{
  "title": "分集标题",
  "summary": "分集剧情简介",
  "confidence": 0.85
}

${config.customPrompt ? `\n## 额外要求\n${config.customPrompt}` : ''}`
  }

  // 解析生成的内容
  const parseGeneratedContent = (content: string, episode: SubtitleEpisode, config: GenerationConfig, styleId?: string): GenerationResult => {
    const style = styleId ? GENERATION_STYLES.find(s => s.id === styleId) : null
    const styleName = style?.name || ''

    try {
      const parsed = JSON.parse(content)
      const summary = parsed.summary || '暂无简介'

      // 温和的字数检查（仅警告，不截断）
      const minLength = config.summaryLength[0]
      const maxLength = config.summaryLength[1]
      const allowedMaxLength = maxLength + 10 // 允许超出10字
      const currentLength = summary.length

      if (currentLength > allowedMaxLength) {
        console.warn(`简介字数超出过多(${currentLength}字 > ${allowedMaxLength}字)，建议调整提示词或重新生成`)
      } else if (currentLength < minLength - 5) {
        console.warn(`简介字数偏少(${currentLength}字 < ${minLength}字)，建议调整提示词`)
      }

      return {
        episodeNumber: episode.episodeNumber,
        originalTitle: episode.title,
        generatedTitle: parsed.title || `第${episode.episodeNumber}集`,
        generatedSummary: summary,
        confidence: parsed.confidence || 0.8,
        wordCount: summary.length,
        generationTime: Date.now(),
        model: config.model,
        styles: styleId ? [styleId] : config.selectedStyles,
        styleId: styleId,
        styleName: styleName
      }
    } catch (error) {
      // 如果不是JSON格式，尝试从文本中提取
      const lines = content.split('\n').filter(line => line.trim())
      let title = `第${episode.episodeNumber}集`
      let summary = '暂无简介'

      for (const line of lines) {
        if (line.includes('标题') || line.includes('title')) {
          title = line.replace(/.*[:：]\s*/, '').replace(/["""]/g, '').trim()
        } else if (line.includes('简介') || line.includes('summary')) {
          summary = line.replace(/.*[:：]\s*/, '').replace(/["""]/g, '').trim()
        }
      }

      return {
        episodeNumber: episode.episodeNumber,
        originalTitle: episode.title,
        generatedTitle: title,
        generatedSummary: summary,
        confidence: 0.6,
        wordCount: summary.length,
        generationTime: Date.now(),
        model: config.model,
        styles: styleId ? [styleId] : config.selectedStyles,
        styleId: styleId,
        styleName: styleName
      }
    }
  }

  // 批量生成
  const handleBatchGenerate = async () => {
    if (!selectedFile || !apiKey) {
      if (onOpenGlobalSettings) {
        onOpenGlobalSettings('api')
      } else {
        alert('请选择字幕文件并配置API密钥')
      }
      return
    }

    if (selectedFile.episodes.length === 0) {
      alert('字幕文件解析失败，请检查文件格式')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationResults(prev => ({ ...prev, [selectedFile.id]: [] }))

    try {
      const results: GenerationResult[] = []
      const episodes = selectedFile.episodes
      let successCount = 0
      let failCount = 0

      // 计算总任务数（集数 × 风格数）
      const totalTasks = episodes.length * config.selectedStyles.length
      let completedTasks = 0

      for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i]
        try {
          // 为每个选中的风格生成内容
          const episodeResults = await generateEpisodeContent(episode)

          // 添加所有风格的结果
          results.push(...episodeResults)

          // 计算成功和失败的数量
          const successResults = episodeResults.filter(r => r.confidence > 0)
          successCount += successResults.length
          failCount += episodeResults.length - successResults.length

          // 更新进度
          completedTasks += config.selectedStyles.length
          setGenerationResults(prev => ({ ...prev, [selectedFile.id]: [...results] }))
          setGenerationProgress((completedTasks / totalTasks) * 100)

          // 避免API限流，添加延迟
          if (i < episodes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500))
          }
        } catch (error) {
          console.error(`第${episode.episodeNumber}集生成失败:`, error)
          failCount += config.selectedStyles.length
          completedTasks += config.selectedStyles.length

          // 为每个风格添加失败的结果占位符
          for (const styleId of config.selectedStyles) {
            const style = GENERATION_STYLES.find(s => s.id === styleId)
            results.push({
              episodeNumber: episode.episodeNumber,
              generatedTitle: `第${episode.episodeNumber}集（${style?.name || styleId}风格生成失败）`,
              generatedSummary: `生成失败：${error instanceof Error ? error.message : '未知错误'}`,
              confidence: 0,
              wordCount: 0,
              generationTime: Date.now(),
              model: config.model,
              styles: [styleId],
              styleId: styleId,
              styleName: style?.name
            })
          }

          setGenerationResults(prev => ({ ...prev, [selectedFile.id]: [...results] }))
          setGenerationProgress((completedTasks / totalTasks) * 100)
        }
      }

      // 显示生成结果摘要
      if (successCount > 0) {
        console.log(`生成完成：成功 ${successCount} 个结果，失败 ${failCount} 个结果`)
      } else {
        alert('所有集数生成失败，请检查API配置和网络连接')
      }
    } catch (error) {
      console.error('批量生成失败:', error)
      alert(`生成失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  // 获取操作配置
  const getOperationConfig = (operation: EnhanceOperation) => {
    switch (operation) {
      case 'polish':
      case 'formalize':
      case 'literarize':
        return { temperature: 0.6, maxTokens: 1000 } // 需要更精确的控制
      case 'shorten':
      case 'summarize':
        return { temperature: 0.4, maxTokens: 600 } // 需要更简洁的输出
      case 'expand':
      case 'continue':
      case 'addSpoilers':
        return { temperature: 0.8, maxTokens: 1200 } // 需要更多创造性
      case 'colloquialize':
      case 'rephrase':
      case 'rewrite':
        return { temperature: 0.7, maxTokens: 1000 } // 平衡创造性和准确性
      case 'removeSpoilers':
        return { temperature: 0.5, maxTokens: 800 } // 需要谨慎处理
      default:
        return { temperature: 0.7, maxTokens: 800 }
    }
  }

  // 内容增强功能
  const handleEnhanceContent = async (fileId: string, resultIndex: number, operation: EnhanceOperation) => {
    const results = generationResults[fileId] || []
    const result = results[resultIndex]
    if (!result) return

    try {
      const prompt = buildEnhancePrompt(result, operation)

      // 根据操作类型调整参数
      const operationConfig = getOperationConfig(operation)

      const response = await fetch('/api/siliconflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: "system",
              content: `你是一位资深的影视内容编辑专家，专门负责优化电视剧、电影等影视作品的分集标题和剧情简介。你具备以下专业能力：

1. **深度理解影视叙事**：熟悉各种影视类型的叙事特点和观众心理
2. **精准语言表达**：能够根据不同平台和受众调整语言风格
3. **内容质量把控**：确保每次优化都能显著提升内容的吸引力和专业度
4. **剧透控制能力**：精确掌握信息透露的分寸，平衡悬念与吸引力

请严格按照用户要求进行内容优化，确保输出格式规范、内容质量上乘。`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: operationConfig.temperature,
          max_tokens: operationConfig.maxTokens,
          apiKey: apiKey
        })
      })

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '生成失败')
      }

      const enhancedContent = data.data.content.trim()

      // 解析增强后的内容
      const lines = enhancedContent.split('\n').filter((line: string) => line.trim())
      let enhancedTitle = result.generatedTitle
      let enhancedSummary = enhancedContent

      // 尝试解析标题和简介
      if (lines.length >= 2) {
        const titleMatch = lines[0].match(/^(?:标题[:：]?\s*)?(.+)$/)
        if (titleMatch) {
          enhancedTitle = titleMatch[1].trim()
          enhancedSummary = lines.slice(1).join('\n').replace(/^(?:简介[:：]?\s*)?/, '').trim()
        }
      }

      // 更新结果
      handleUpdateResult(fileId, resultIndex, {
        generatedTitle: enhancedTitle,
        generatedSummary: enhancedSummary,
        wordCount: enhancedSummary.length
      })

    } catch (error) {
      console.error('内容增强失败:', error)
      alert(`${getOperationName(operation)}失败：${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 构建增强提示词
  const buildEnhancePrompt = (result: GenerationResult, operation: EnhanceOperation) => {
    const currentTitle = result.generatedTitle
    const currentSummary = result.generatedSummary

    switch (operation) {
      case 'polish':
        return `请对以下影视剧集标题和简介进行专业润色，提升内容的吸引力和表达质量：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【润色要求】
1. **词汇升级**：将平淡词汇替换为更生动、更有感染力的表达
2. **句式优化**：调整句子结构，增强节奏感和可读性
3. **情感渲染**：适度增强情感色彩，但不夸张造作
4. **保持原意**：核心情节和信息点必须完全保留
5. **长度控制**：标题15字内，简介120-200字为佳

【参考标准】
- 标题要有冲击力，能瞬间抓住观众注意力
- 简介要有画面感，让读者产生观看欲望
- 语言要精练有力，避免冗余表达

请严格按照以下格式输出：
标题：[润色后的标题]
简介：[润色后的简介]`

      case 'shorten':
        return `请将以下影视剧集标题和简介进行专业精简，提炼出最核心的信息：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【精简策略】
1. **核心提取**：识别并保留最关键的情节转折点和冲突
2. **信息优先级**：主要人物关系 > 核心冲突 > 情节发展 > 背景信息
3. **删除冗余**：去除修饰性词汇、重复表达和次要细节
4. **保持吸引力**：即使精简也要保持悬念和观看欲望
5. **严格控制**：标题10字内，简介60-80字

【质量标准】
- 每个字都有存在价值，不能再删减
- 读完后能清楚了解本集的核心看点
- 保持原有的情感基调和类型特色

请严格按照以下格式输出：
标题：[精简后的标题]
简介：[精简后的简介]`

      case 'expand':
        return `请将以下影视剧集标题和简介进行专业扩写，丰富内容层次和细节描述：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【扩写方向】
1. **情节深化**：补充关键情节的前因后果，增加转折细节
2. **人物刻画**：丰富主要角色的动机、情感状态和关系变化
3. **环境渲染**：适度增加场景描述，营造氛围感
4. **悬念构建**：通过细节暗示增强观众的期待感
5. **情感层次**：深化角色间的情感冲突和内心戏

【扩写原则】
- 所有新增内容必须符合剧情逻辑
- 保持原有的节奏感，不拖沓冗长
- 增强画面感和代入感
- 标题可适度调整以匹配扩写内容
- 简介控制在200-300字

请严格按照以下格式输出：
标题：[扩写后的标题]
简介：[扩写后的简介]`

      case 'continue':
        return `请在以下影视剧集简介基础上进行专业续写，延续和深化故事发展：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【续写策略】
1. **自然衔接**：从现有情节的最后一个关键点开始延续
2. **情节推进**：增加新的冲突、转折或揭示
3. **角色发展**：展现人物在新情况下的反应和成长
4. **悬念升级**：在解决部分疑问的同时制造新的悬念
5. **节奏控制**：保持紧凑的叙事节奏，避免拖沓

【续写要求】
- 新增内容必须与原有情节逻辑一致
- 保持角色性格的连贯性
- 增强本集的完整性和观看价值
- 为下一集留下合理的悬念点
- 标题可根据新内容适度调整

请严格按照以下格式输出：
标题：[续写后的标题]
简介：[续写后的完整简介]`

      case 'formalize':
        return `请将以下影视剧集标题和简介转换为正式、专业的官方表达风格：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【正式化标准】
1. **词汇规范**：使用标准书面语，避免网络用语、俚语和口语化表达
2. **句式严谨**：采用完整的句式结构，避免省略和随意表达
3. **语调客观**：保持中性、客观的叙述语调，避免过于主观的评价
4. **表达精准**：使用准确、专业的词汇描述情节和人物关系
5. **格式规范**：符合官方发布和正式媒体的表达标准

【适用场景】
- 官方网站和平台发布
- 新闻稿和媒体通稿
- 正式的宣传材料
- 学术或专业讨论

请严格按照以下格式输出：
标题：[正式化后的标题]
简介：[正式化后的简介]`

      case 'colloquialize':
        return `请将以下影视剧集标题和简介转换为通俗易懂、贴近大众的亲民表达风格：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【口语化策略】
1. **词汇平民化**：将专业术语、书面语转换为日常用语
2. **表达生活化**：使用贴近生活的比喻和描述方式
3. **语调亲切**：采用轻松、亲和的叙述语调
4. **句式简化**：使用简单直接的句式，避免复杂的从句结构
5. **情感共鸣**：增加能引起普通观众共鸣的表达

【口语化特点】
- 就像朋友间聊天一样自然
- 让没有专业背景的观众也能轻松理解
- 保持内容的准确性但降低理解门槛
- 增加趣味性和亲近感

请严格按照以下格式输出：
标题：[口语化后的标题]
简介：[口语化后的简介]`

      case 'literarize':
        return `请将以下影视剧集标题和简介转换为具有文学色彩和艺术气息的高雅表达风格：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【文艺化手法】
1. **修辞运用**：适度使用比喻、拟人、排比等修辞手法
2. **词汇升华**：选用富有诗意和文化内涵的词汇
3. **意境营造**：通过文字营造深层的情感氛围和意境
4. **节奏美感**：注重语言的韵律感和节奏美
5. **文化底蕴**：融入适当的文化元素和人文思考

【文艺化原则】
- 保持故事本质，但提升表达层次
- 避免过度华丽而失去可读性
- 增强内容的艺术价值和文化品味
- 适合文艺片、艺术电影等高端作品
- 体现创作者的文学素养和艺术追求

请严格按照以下格式输出：
标题：[文艺化后的标题]
简介：[文艺化后的简介]`

      case 'rewrite':
        return `请完全重新构思和表达以下影视剧集标题和简介，提供全新的叙述视角：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【重写策略】
1. **视角转换**：尝试从不同角色或观察者的视角重新叙述
2. **结构重组**：完全改变信息的呈现顺序和逻辑结构
3. **表达革新**：使用全新的词汇、句式和表达方式
4. **重点调整**：可以突出原文中的次要元素，淡化主要元素
5. **风格转变**：在保持内容准确的前提下改变整体风格

【重写要求】
- 核心事实和关键情节必须保持一致
- 读者应该感受到完全不同的阅读体验
- 新版本应该具有独立的价值和吸引力
- 避免简单的同义词替换，要有实质性的创新
- 保持逻辑清晰和可读性

请严格按照以下格式输出：
标题：[重写后的标题]
简介：[重写后的简介]`

      case 'summarize':
        return `请将以下影视剧集标题和简介提炼为高度浓缩的核心摘要：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【总结策略】
1. **核心提取**：识别并保留最关键的故事核心和转折点
2. **信息筛选**：只保留对理解剧情绝对必要的信息
3. **精华浓缩**：将复杂情节压缩为最简洁的表达
4. **重点突出**：确保读者能快速抓住本集的核心看点
5. **逻辑完整**：虽然简短但逻辑链条必须完整

【总结标准】
- 标题6-8字，直击核心主题
- 简介30-50字，包含最关键信息
- 删除所有修饰词和次要细节
- 保持故事的基本逻辑和因果关系
- 适合快速浏览和信息获取

请严格按照以下格式输出：
标题：[总结后的标题]
简介：[总结后的简介]`

      case 'rephrase':
        return `请改写以下影视剧集标题和简介，保持核心意思不变但提供全新的表达方式：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【改写原则】
1. **意思保持**：核心信息、情节发展、人物关系完全一致
2. **表达创新**：使用不同的词汇、句式和表达角度
3. **风格一致**：保持原有的语言风格和情感基调
4. **避免重复**：尽量不使用原文中的关键词汇和句式
5. **自然流畅**：新表达应该自然流畅，不显生硬

【改写技巧】
- 同义词替换但要精准恰当
- 调整句子结构和信息顺序
- 改变描述角度但不改变事实
- 保持原有的节奏感和可读性
- 确保改写后的版本同样吸引人

请严格按照以下格式输出：
标题：[改写后的标题]
简介：[改写后的简介]`

      case 'removeSpoilers':
        return `请精心移除以下影视剧集标题和简介中的剧透内容，保持最佳的观看体验：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【去剧透策略】
1. **识别剧透点**：准确识别可能影响观看体验的关键信息
2. **保留悬念**：删除结局暗示但保留足够的悬念和吸引力
3. **维持逻辑**：确保去除剧透后内容仍然逻辑完整
4. **平衡信息**：在不透露关键情节的前提下提供足够的背景
5. **增强期待**：通过暗示和铺垫增强观众的期待感

【去剧透原则】
- 删除具体的结果和结局
- 保留冲突设置和人物关系
- 避免透露关键转折点的具体内容
- 保持故事的基本框架和吸引力
- 适合预告片、宣传和推广使用

请严格按照以下格式输出：
标题：[去剧透后的标题]
简介：[去剧透后的简介]`

      case 'addSpoilers':
        return `请在以下影视剧集标题和简介中适度增加剧情细节，满足深度了解需求：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【增加剧透策略】
1. **关键揭示**：适度透露重要的情节转折和结果
2. **细节补充**：增加具体的剧情发展和人物命运
3. **深度分析**：提供更多背景信息和因果关系
4. **结果暗示**：可以暗示或直接说明某些关键事件的结果
5. **讨论价值**：增加有助于剧情分析和讨论的信息

【增加剧透原则】
- 适合已观看或不介意剧透的观众
- 提供更完整的故事脉络和逻辑
- 增强内容的分析价值和讨论深度
- 保持叙述的连贯性和可读性
- 适合剧评、解析和深度讨论使用

【注意事项】
- 标题可以更直接地反映核心冲突或结果
- 简介可以包含更多具体的情节发展

请严格按照以下格式输出：
标题：[增加剧透后的标题]
简介：[增加剧透后的简介]`

      default:
        return currentSummary
    }
  }

  // 获取操作名称
  const getOperationName = (operation: EnhanceOperation) => {
    switch (operation) {
      case 'polish': return '润色'
      case 'shorten': return '缩写'
      case 'expand': return '扩写'
      case 'continue': return '续写'
      case 'formalize': return '正式化'
      case 'colloquialize': return '口语化'
      case 'literarize': return '文艺化'
      case 'rewrite': return '重写'
      case 'summarize': return '总结'
      case 'rephrase': return '改写'
      case 'removeSpoilers': return '去剧透'
      case 'addSpoilers': return '增加剧透'
      default: return '处理'
    }
  }

  // 批量导出所有结果到TMDB格式
  const handleBatchExportToTMDB = async () => {
    try {
      // 收集所有文件的结果
      const allResults: Array<{
        episodeNumber: number
        name: string
        runtime: number
        overview: string
        backdrop: string
      }> = []

      let globalEpisodeNumber = 1 // 全局集数计数器，按文件顺序递增

      // 按文件顺序处理
      for (const file of subtitleFiles) {
        const fileResults = generationResults[file.id] || []

        // 按字幕文件内的集数排序
        const sortedResults = fileResults.sort((a, b) => a.episodeNumber - b.episodeNumber)

        // 按字幕文件内的集数分组，每个集数只取第一个风格的结果
        const episodeGroups = new Map<number, GenerationResult>()
        for (const result of sortedResults) {
          if (!episodeGroups.has(result.episodeNumber)) {
            episodeGroups.set(result.episodeNumber, result)
          }
        }

        // 为每集创建导出数据
        for (const [, result] of episodeGroups) {
          // 找到对应的原始集数据以获取时间戳
          const originalEpisode = file.episodes.find(ep => ep.episodeNumber === result.episodeNumber)
          const runtime = originalEpisode?.lastTimestamp ? timestampToMinutes(originalEpisode.lastTimestamp) : 0

          const exportItem = {
            episodeNumber: globalEpisodeNumber, // 使用全局递增的集数
            name: exportConfig.includeTitle ? result.generatedTitle : '',
            runtime: exportConfig.includeRuntime ? runtime : 0,
            overview: exportConfig.includeOverview ? result.generatedSummary : '',
            backdrop: '' // 空的backdrop字段
          }

          allResults.push(exportItem)
          globalEpisodeNumber++ // 递增全局集数
        }
      }

      // 结果已经按文件顺序和集数顺序排列，无需重新排序

      // 生成CSV内容
      const headers = ['episode_number', 'name', 'runtime', 'overview', 'backdrop']
      const csvContent = [
        headers.join(','),
        ...allResults.map(item => [
          item.episodeNumber,
          `"${item.name.replace(/"/g, '""')}"`,
          item.runtime,
          `"${item.overview.replace(/"/g, '""')}"`,
          `"${item.backdrop}"`
        ].join(','))
      ].join('\n')

      // 写入到TMDB-Import目录
      const response = await fetch('/api/write-tmdb-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: csvContent
        })
      })

      if (response.ok) {
        return { success: true }
      } else {
        throw new Error('写入文件失败')
      }
    } catch (error) {
      console.error('导出失败:', error)
      throw error
    }
  }

  // 显示导出对话框
  const handleExportResults = () => {
    setShowExportDialog(true)
  }

  // 批量生成所有文件的简介
  const handleBatchGenerateAll = async () => {
    if (!apiKey) {
      if (onOpenGlobalSettings) {
        onOpenGlobalSettings('api')
      } else {
        alert('请先配置API密钥')
      }
      return
    }

    if (subtitleFiles.length === 0) {
      alert('请先上传字幕文件')
      return
    }

    // 检查是否有可生成的文件
    const validFiles = subtitleFiles.filter(file => file.episodes.length > 0)
    if (validFiles.length === 0) {
      alert('没有可生成简介的字幕文件，请检查文件格式')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationResults({})

    // 初始化所有文件状态为pending
    setSubtitleFiles(prev => prev.map(file => ({
      ...file,
      generationStatus: validFiles.some(vf => vf.id === file.id) ? 'pending' as GenerationStatus : file.generationStatus,
      generationProgress: 0,
      generatedCount: 0
    })))

    try {
      const allResults: Record<string, GenerationResult[]> = {}
      let totalEpisodes = 0
      let processedEpisodes = 0

      // 计算总集数
      validFiles.forEach(file => {
        totalEpisodes += file.episodes.length
        allResults[file.id] = [] // 初始化每个文件的结果数组
      })

      // 为每个文件生成简介
      for (const file of validFiles) {
        console.log(`开始处理文件: ${file.name}`)

        // 设置当前文件状态为generating
        setSubtitleFiles(prev => prev.map(f =>
          f.id === file.id
            ? { ...f, generationStatus: 'generating' as GenerationStatus, generationProgress: 0, generatedCount: 0 }
            : f
        ))

        for (let i = 0; i < file.episodes.length; i++) {
          const episode = file.episodes[i]
          try {
            // 临时设置当前文件为选中文件以便生成
            const originalSelectedFile = selectedFile
            setSelectedFile(file)

            const episodeResults = await generateEpisodeContent(episode)
            // 为每个风格的结果添加文件名信息
            const resultsWithFileName = episodeResults.map(result => ({
              ...result,
              fileName: file.name // 添加文件名信息
            }))
            allResults[file.id].push(...resultsWithFileName)

            processedEpisodes++
            setGenerationProgress((processedEpisodes / totalEpisodes) * 100)
            setGenerationResults(prev => ({ ...prev, ...allResults }))

            // 更新当前文件的进度
            const currentFileProgress = ((i + 1) / file.episodes.length) * 100
            setSubtitleFiles(prev => prev.map(f =>
              f.id === file.id
                ? {
                    ...f,
                    generationProgress: currentFileProgress,
                    generatedCount: i + 1
                  }
                : f
            ))

            // 恢复原选中文件
            setSelectedFile(originalSelectedFile)

            // 避免API限流，添加延迟
            if (processedEpisodes < totalEpisodes) {
              await new Promise(resolve => setTimeout(resolve, 1500))
            }
          } catch (error) {
            console.error(`文件 ${file.name} 第${episode.episodeNumber}集生成失败:`, error)

            // 为每个风格添加失败的结果占位符
            for (const styleId of config.selectedStyles) {
              const style = GENERATION_STYLES.find(s => s.id === styleId)
              allResults[file.id].push({
                episodeNumber: episode.episodeNumber,
                generatedTitle: `第${episode.episodeNumber}集（${style?.name || styleId}风格生成失败）`,
                generatedSummary: `生成失败：${error instanceof Error ? error.message : '未知错误'}`,
                confidence: 0,
                wordCount: 0,
                generationTime: Date.now(),
                model: config.model,
                styles: [styleId],
                styleId: styleId,
                styleName: style?.name,
                fileName: file.name
              })
            }

            processedEpisodes++
            setGenerationProgress((processedEpisodes / totalEpisodes) * 100)
            setGenerationResults(prev => ({ ...prev, ...allResults }))

            // 更新当前文件的进度（失败情况）
            const currentFileProgress = ((i + 1) / file.episodes.length) * 100
            setSubtitleFiles(prev => prev.map(f =>
              f.id === file.id
                ? {
                    ...f,
                    generationProgress: currentFileProgress,
                    generatedCount: i + 1
                  }
                : f
            ))
          }
        }

        // 文件处理完成，设置最终状态
        const fileResults = allResults[file.id] || []
        const hasFailures = fileResults.some(r => r.confidence === 0)
        setSubtitleFiles(prev => prev.map(f =>
          f.id === file.id
            ? {
                ...f,
                generationStatus: hasFailures ? 'failed' as GenerationStatus : 'completed' as GenerationStatus,
                generationProgress: 100,
                generatedCount: file.episodes.length
              }
            : f
        ))
      }

      // 计算总体统计
      const allResultsFlat = Object.values(allResults).flat()
      console.log(`批量生成完成：共处理 ${validFiles.length} 个文件，${totalEpisodes} 集内容`)
      console.log(`成功：${allResultsFlat.filter(r => r.confidence > 0).length} 集，失败：${allResultsFlat.filter(r => r.confidence === 0).length} 集`)

      // 生成完成后，自动选择合适的文件显示结果
      if (validFiles.length > 0) {
        if (!selectedFile) {
          // 如果没有选中文件，选择第一个文件
          setSelectedFile(validFiles[0])
        } else {
          // 如果当前选中的文件没有生成结果，选择第一个有结果的文件
          const currentFileResults = allResults[selectedFile.id] || []
          if (currentFileResults.length === 0) {
            const firstFileWithResults = validFiles.find(file => (allResults[file.id] || []).length > 0)
            if (firstFileWithResults) {
              setSelectedFile(firstFileWithResults)
            }
          }
        }
      }
    } catch (error) {
      console.error('批量生成失败:', error)
      alert(`批量生成失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  return (
    <TooltipProvider>
      <div
        className={`h-full flex flex-col bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/20 relative ${
          isDragOver ? 'bg-blue-100/50 dark:bg-blue-900/50' : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
      {/* 拖拽覆盖层 */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-blue-500/20 dark:bg-blue-600/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 shadow-2xl border-2 border-dashed border-blue-400 dark:border-blue-500 text-center max-w-md mx-4">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-30 rounded-full"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-full text-white">
                <Upload className="h-12 w-12" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              释放文件以上传
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              支持 SRT、VTT、ASS、SSA 格式
            </p>
          </div>
        </div>
      )}

      {/* 头部工具栏 */}
      <div className="flex-shrink-0 p-4 border-b border-blue-100/50 dark:border-blue-900/30 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 rounded-full"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full text-white">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                AI分集简介生成器
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                基于硅基流动AI模型，智能生成分集标题和剧情简介
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".srt,.vtt,.ass,.ssa"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧文件列表 */}
        <div className="w-72 border-r border-blue-100/50 dark:border-blue-900/30 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
          <FileList
            files={subtitleFiles}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            onDeleteFile={(fileId) => {
              setSubtitleFiles(prev => prev.filter(f => f.id !== fileId))
              if (selectedFile?.id === fileId) {
                setSelectedFile(null)
              }
            }}
            onUpload={() => fileInputRef.current?.click()}
            onOpenGlobalSettings={onOpenGlobalSettings}
            onOpenSettings={() => setShowSettingsDialog(true)}
            onBatchGenerate={handleBatchGenerateAll}
            onBatchExport={handleExportResults}
            isGenerating={isGenerating}
            apiConfigured={!!apiKey}
            hasResults={Object.values(generationResults).some(results => results.length > 0)}
          />
        </div>

        {/* 右侧主要工作区 */}
        <div className="flex-1 flex flex-col">
          {selectedFile ? (
            <WorkArea
              file={selectedFile}
              results={generationResults[selectedFile.id] || []}
              isGenerating={isGenerating}
              progress={generationProgress}
              onGenerate={handleBatchGenerate}
              apiConfigured={!!apiKey}
              onOpenGlobalSettings={onOpenGlobalSettings}
              onUpdateResult={(resultIndex, updatedResult) =>
                handleUpdateResult(selectedFile.id, resultIndex, updatedResult)
              }
              onMoveToTop={(resultIndex) =>
                handleMoveToTop(selectedFile.id, resultIndex)
              }
              onEnhanceContent={(resultIndex, operation) =>
                handleEnhanceContent(selectedFile.id, resultIndex, operation)
              }
            />
          ) : (
            <EmptyState onUpload={() => fileInputRef.current?.click()} />
          )}
        </div>
      </div>

      {/* 生成设置对话框 */}
      <GenerationSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        config={config}
        onConfigChange={setConfig}
        apiConfigured={!!apiKey}
        onOpenGlobalSettings={onOpenGlobalSettings}
        setShouldReopenSettingsDialog={setShouldReopenSettingsDialog}
      />

      {/* 导出配置对话框 */}
      <ExportConfigDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        config={exportConfig}
        onConfigChange={setExportConfig}
        onExport={handleBatchExportToTMDB}
      />
      </div>
    </TooltipProvider>
  )
}

// 文件列表组件
function FileList({
  files,
  selectedFile,
  onSelectFile,
  onDeleteFile,
  onUpload,
  onOpenGlobalSettings,
  onOpenSettings,
  onBatchGenerate,
  onBatchExport,
  isGenerating,
  apiConfigured,
  hasResults
}: {
  files: SubtitleFile[]
  selectedFile: SubtitleFile | null
  onSelectFile: (file: SubtitleFile) => void
  onDeleteFile: (fileId: string) => void
  onUpload: () => void
  onOpenGlobalSettings?: (section: string) => void
  onOpenSettings: () => void
  onBatchGenerate: () => void
  onBatchExport: () => void
  isGenerating: boolean
  apiConfigured: boolean
  hasResults: boolean
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-blue-100/50 dark:border-blue-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200">字幕文件</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {files.length} 个文件
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="h-8 w-8 p-0"
            title="生成设置"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* 批量操作按钮 */}
        <div className="mt-3 space-y-2">
          <Button
            onClick={onBatchGenerate}
            disabled={isGenerating || !apiConfigured || files.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400"
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                批量生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                批量生成简介
              </>
            )}
          </Button>

          {files.length > 0 && hasResults && (
            <Button
              onClick={onBatchExport}
              disabled={isGenerating}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              导出到TMDB
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {files.length > 0 ? (
          <div className="p-2 space-y-2">
            {files.map(file => (
            <Card
              key={file.id}
              className={cn(
                "group cursor-pointer transition-all duration-200 hover:shadow-md",
                selectedFile?.id === file.id
                  ? "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                  : "hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
              )}
              onClick={() => onSelectFile(file)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <FileNameDisplay
                          fileName={file.name}
                          maxLength={30}
                          className="font-medium text-sm block"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{file.episodes.length} 集</span>
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {file.uploadTime.toLocaleString()}
                      </div>

                      {/* 生成进度显示 */}
                      {file.generationStatus && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={cn(
                              "flex items-center space-x-1",
                              file.generationStatus === 'completed' && "text-green-600 dark:text-green-400",
                              file.generationStatus === 'generating' && "text-blue-600 dark:text-blue-400",
                              file.generationStatus === 'failed' && "text-red-600 dark:text-red-400",
                              file.generationStatus === 'pending' && "text-gray-500 dark:text-gray-400"
                            )}>
                              {file.generationStatus === 'completed' && <CheckCircle className="h-3 w-3" />}
                              {file.generationStatus === 'generating' && <Loader2 className="h-3 w-3 animate-spin" />}
                              {file.generationStatus === 'failed' && <XCircle className="h-3 w-3" />}
                              {file.generationStatus === 'pending' && <Clock className="h-3 w-3" />}
                              <span>
                                {file.generationStatus === 'completed' && '已完成'}
                                {file.generationStatus === 'generating' && '生成中'}
                                {file.generationStatus === 'failed' && '生成失败'}
                                {file.generationStatus === 'pending' && '等待中'}
                              </span>
                            </span>
                            {file.generationStatus === 'generating' && file.generationProgress !== undefined && (
                              <span className="text-xs text-gray-500">
                                {file.generatedCount || 0}/{file.episodes.length}
                              </span>
                            )}
                          </div>

                          {/* 进度条 */}
                          {(file.generationStatus === 'generating' || file.generationStatus === 'completed') && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                              <div
                                className={cn(
                                  "h-1 rounded-full transition-all duration-300",
                                  file.generationStatus === 'completed' ? "bg-green-500" : "bg-blue-500"
                                )}
                                style={{
                                  width: `${file.generationProgress || 0}%`
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteFile(file.id)
                      }}
                      title="删除文件"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        ) : (
          <FileListEmptyState onUpload={onUpload} />
        )}
      </ScrollArea>
    </div>
  )
}



// 工作区组件
function WorkArea({
  file,
  results,
  isGenerating,
  progress,
  onGenerate,
  apiConfigured,
  onOpenGlobalSettings,
  onUpdateResult,
  onMoveToTop,
  onEnhanceContent
}: {
  file: SubtitleFile
  results: GenerationResult[] // 这里接收的是当前文件的结果数组
  isGenerating: boolean
  progress: number
  onGenerate: () => void
  apiConfigured: boolean
  onOpenGlobalSettings?: (section: string) => void
  onUpdateResult?: (resultIndex: number, updatedResult: Partial<GenerationResult>) => void
  onMoveToTop?: (resultIndex: number) => void
  onEnhanceContent?: (resultIndex: number, operation: EnhanceOperation) => void
}) {
  return (
    <div className="h-full flex flex-col">
      {/* 文件信息和操作栏 */}
      <div className="flex-shrink-0 p-4 border-b border-blue-100/50 dark:border-blue-900/30 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Film className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-gray-800 dark:text-gray-200">
                <FileNameDisplay
                  fileName={file.name}
                  maxLength={50}
                  className="block"
                />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {file.episodes.length} 集 · 总字数 {file.episodes.reduce((sum, ep) => sum + ep.wordCount, 0).toLocaleString()}
              </p>
            </div>
          </div>


        </div>

        {isGenerating && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>生成进度</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>

      {/* 结果展示区域 */}
      <div className="flex-1 overflow-hidden">
        {results.length > 0 ? (
          <ResultsDisplay results={results} onUpdateResult={onUpdateResult} onMoveToTop={onMoveToTop} onEnhanceContent={onEnhanceContent} />
        ) : !apiConfigured ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                请先配置API密钥
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-4">
                需要配置硅基流动API密钥才能使用AI生成功能
              </p>
              <Button
                onClick={() => {
                  if (onOpenGlobalSettings) {
                    onOpenGlobalSettings('api')
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Settings className="h-4 w-4 mr-2" />
                配置API
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                准备就绪
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                点击左侧"批量生成简介"按钮，AI将为您生成精彩的分集简介
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 操作类型定义
type EnhanceOperation = 'polish' | 'shorten' | 'expand' | 'continue' | 'formalize' | 'colloquialize' | 'literarize' | 'rewrite' | 'summarize' | 'rephrase' | 'removeSpoilers' | 'addSpoilers'

// 结果展示组件
const ResultsDisplay: React.FC<{
  results: GenerationResult[]
  onUpdateResult?: (index: number, updatedResult: Partial<GenerationResult>) => void
  onMoveToTop?: (index: number) => void
  onEnhanceContent?: (index: number, operation: EnhanceOperation) => void
}> = ({ results, onUpdateResult, onMoveToTop, onEnhanceContent }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingSummary, setEditingSummary] = useState('')
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null)
  const [enhancingOperation, setEnhancingOperation] = useState<string | null>(null)

  const handleStartEdit = (index: number, result: GenerationResult) => {
    setEditingIndex(index)
    setEditingTitle(result.generatedTitle)
    setEditingSummary(result.generatedSummary)
  }

  const handleEnhance = async (index: number, operation: EnhanceOperation) => {
    if (enhancingIndex !== null) return // 防止重复操作

    setEnhancingIndex(index)
    setEnhancingOperation(operation)

    try {
      await onEnhanceContent?.(index, operation)
    } finally {
      setEnhancingIndex(null)
      setEnhancingOperation(null)
    }
  }

  const handleSaveEdit = (index: number) => {
    if (onUpdateResult) {
      onUpdateResult(index, {
        generatedTitle: editingTitle,
        generatedSummary: editingSummary,
        wordCount: editingSummary.length
      })
    }
    setEditingIndex(null)
    setEditingTitle('')
    setEditingSummary('')
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditingTitle('')
    setEditingSummary('')
  }

  return (
    <div className="h-full overflow-auto">
      {/* 警告提示 */}
      <div className="p-4 pb-2">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">⚠️ 重要提醒</p>
              <p className="leading-relaxed">
                AI生成的分集简介仅作<strong>辅助作用</strong>，请务必观看对应视频内容审核修改后再使用。
                <strong className="text-amber-900 dark:text-amber-100">禁止直接上传至TMDB</strong>等数据库平台。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {results.map((result, index) => (
          <div
            key={`${result.fileName || 'default'}-${result.episodeNumber}-${index}`}
            className="group border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            {/* 标题行 - 紧凑布局 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {/* 标签组 */}
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {result.fileName && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 max-w-[140px] cursor-help">
                          <span className="truncate">📁 {truncateFileName(result.fileName, 15)}</span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm break-all">
                        <p>文件：{result.fileName}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {result.styleName && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300">
                      🎨 {result.styleName}
                    </Badge>
                  )}
                  {index === 0 && (
                    <Badge className="text-xs px-1.5 py-0.5 bg-blue-600 text-white">
                      ⭐ 优先
                    </Badge>
                  )}
                </div>

                {/* 标题 */}
                <div className="flex-1 min-w-0">
                  {editingIndex === index ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full px-2 py-1 text-sm font-medium border border-blue-300 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
                      placeholder="编辑标题..."
                    />
                  ) : (
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {result.generatedTitle}
                    </h3>
                  )}
                </div>
              </div>

              {/* 右侧信息和操作 */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Badge
                  variant={result.confidence > 0.8 ? "default" : result.confidence > 0.6 ? "secondary" : "destructive"}
                  className="text-xs px-1.5 py-0.5"
                >
                  {Math.round(result.confidence * 100)}%
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {editingIndex === index ? editingSummary.length : result.wordCount}字
                </span>

                {/* 操作按钮 */}
                {editingIndex === index ? (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handleSaveEdit(index)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3 w-3 mr-1" />
                      取消
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index > 0 && onMoveToTop && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onMoveToTop(index)}
                        title="置顶"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleStartEdit(index, result)}
                      title="编辑"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        const textToCopy = `标题：${result.generatedTitle}\n\n简介：${result.generatedSummary}`
                        navigator.clipboard.writeText(textToCopy)
                      }}
                      title="复制"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          title="更多操作"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => handleEnhance(index, 'polish')}>
                          <Sparkles className="h-3 w-3 mr-2" />
                          润色
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEnhance(index, 'shorten')}>
                          <Minus className="h-3 w-3 mr-2" />
                          缩写
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEnhance(index, 'expand')}>
                          <Plus className="h-3 w-3 mr-2" />
                          扩写
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
            {/* 简介内容 - 紧凑显示 */}
            <div className="mb-3">
              {editingIndex === index ? (
                <textarea
                  value={editingSummary}
                  onChange={(e) => setEditingSummary(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:border-blue-500"
                  rows={4}
                  placeholder="编辑简介内容..."
                />
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {result.generatedSummary}
                </p>
              )}
            </div>

            {/* 底部信息行 */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <span>🤖 {result.model.split('/').pop()}</span>
                <span>🕒 {new Date(result.generationTime).toLocaleTimeString()}</span>
              </div>
              {enhancingIndex === index && (
                <div className="flex items-center space-x-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">
                    {enhancingOperation === 'polish' && '润色中...'}
                    {enhancingOperation === 'shorten' && '缩写中...'}
                    {enhancingOperation === 'expand' && '扩写中...'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 空状态组件
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="h-full flex flex-col">
      {/* 警告提示 */}
      <div className="p-4 pb-2">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">⚠️ 重要提醒</p>
              <p className="leading-relaxed">
                AI生成的分集简介仅作<strong>辅助作用</strong>，请务必观看对应视频内容审核修改后再使用。
                <strong className="text-amber-900 dark:text-amber-100">禁止直接上传至TMDB</strong>等数据库平台。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4">
          <div className="relative mb-8">
            {/* 外层光晕效果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-500 blur-2xl opacity-20 rounded-full scale-150"></div>

            {/* 中层装饰圆环 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full scale-110 opacity-60"></div>

            {/* 主图标容器 */}
            <div className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-8 rounded-full text-white shadow-2xl">
              {/* 内部装饰 */}
              <div className="absolute inset-2 bg-white/10 rounded-full"></div>
              <div className="absolute inset-4 bg-white/5 rounded-full"></div>

              {/* 主图标 - 使用更具创意的组合 */}
              <div className="relative flex items-center justify-center">
                <Sparkles className="h-8 w-8 absolute -top-1 -left-1 opacity-80" />
                <Film className="h-12 w-12 relative z-10" />
                <Wand2 className="h-6 w-6 absolute -bottom-1 -right-1 opacity-90" />
              </div>
            </div>

            {/* 浮动装饰元素 */}
            <div className="absolute -top-4 -right-4 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-2 -left-6 w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-300"></div>
            <div className="absolute top-1/2 -right-8 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping delay-700"></div>
          </div>

        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
          开始您的AI创作之旅
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg leading-relaxed">
          上传字幕文件，让AI为您生成精彩的分集标题和剧情简介
        </p>

        {/* 使用说明 */}
        <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-lg p-4 mb-6 text-left">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
            使用说明
          </h4>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 font-medium">1.</span>
              <span>点击"配置API"前往全局设置配置硅基流动API密钥</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 font-medium">2.</span>
              <span>上传SRT或VTT格式的字幕文件</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 font-medium">3.</span>
              <span>选择AI模型和生成风格</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 font-medium">4.</span>
              <span>点击"批量生成简介"获得AI创作的内容</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onUpload}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 p-1 shadow-2xl transition-all duration-300 hover:shadow-blue-500/25 hover:scale-105 active:scale-95"
          >
            {/* 内层按钮 */}
            <div className="relative rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 px-8 py-4 text-white transition-all duration-300 group-hover:from-blue-400 group-hover:via-indigo-400 group-hover:to-purple-500">
              {/* 光泽效果 */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

              {/* 内容 */}
              <div className="relative flex items-center space-x-3">
                {/* 图标容器 */}
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 blur-sm rounded-full"></div>
                  <div className="relative bg-white/10 p-2 rounded-full backdrop-blur-sm">
                    <Upload className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                </div>

                {/* 文字 */}
                <span className="text-lg font-medium tracking-wide">
                  点击上传或拖拽文件到此处
                </span>
              </div>

              {/* 底部装饰线 */}
              <div className="absolute bottom-0 left-1/2 h-px w-0 bg-white/40 transition-all duration-500 group-hover:w-3/4 group-hover:left-1/8"></div>
            </div>

            {/* 外层光晕 */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-30"></div>
          </button>
        </div>

        {/* 支持的文件格式和拖拽提示 */}
        <div className="mt-6 space-y-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
            支持格式：SRT、VTT、ASS、SSA
          </div>
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
            <div className="flex items-center space-x-1">
              <Upload className="h-3 w-3" />
              <span>点击上传</span>
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 border-2 border-dashed border-gray-400 rounded"></div>
              <span>拖拽上传</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

// 生成设置对话框组件
function GenerationSettingsDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
  apiConfigured,
  onOpenGlobalSettings,
  setShouldReopenSettingsDialog
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
  apiConfigured: boolean
  onOpenGlobalSettings?: (section: string) => void
  setShouldReopenSettingsDialog?: (value: boolean) => void
}) {
  const [activeTab, setActiveTab] = useState("generation")
  const { toast } = useToast()

  const handleSave = () => {
    // 在保存前再次验证和清理配置
    const validStyleIds = GENERATION_STYLES.map(s => s.id)
    const cleanedConfig = {
      ...config,
      selectedStyles: config.selectedStyles.filter(styleId => validStyleIds.includes(styleId))
    }

    // 不保存model字段到本地配置，因为model应该从全局设置中获取
    const { model, ...configWithoutModel } = cleanedConfig

    // 保存清理后的配置到本地存储（不包含model）
    localStorage.setItem('episode_generator_config', JSON.stringify(configWithoutModel))
    onConfigChange(cleanedConfig)
    
    // 显示保存成功的提示
    setTimeout(() => {
      toast({
        title: "设置已保存",
        description: "分集简介生成设置已成功保存",
      })
      onOpenChange(false)
    }, 100);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            分集简介生成设置
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          {/* API状态显示 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">硅基流动API:</span>
                <Badge variant={apiConfigured ? "default" : "destructive"}>
                  {apiConfigured ? "已配置" : "未配置"}
                </Badge>
                {apiConfigured && (
                  <span className="text-xs text-gray-500">当前模型: {config.model.split('/').pop()}</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onOpenGlobalSettings) {
                    // 设置标记，表示需要在全局设置关闭后重新打开此对话框
                    setShouldReopenSettingsDialog?.(true)
                    onOpenGlobalSettings('api')
                    onOpenChange(false)
                  }
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                配置API
              </Button>
            </div>
          </div>

          {/* 标签页导航 */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-4 flex-shrink-0">
            <nav className="-mb-px flex space-x-6">
              <button
                onClick={() => setActiveTab("generation")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "generation"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                生成设置
              </button>
              <button
                onClick={() => setActiveTab("titleStyle")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "titleStyle"
                    ? "border-green-500 text-green-600 dark:text-green-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                标题风格设置
              </button>
              <button
                onClick={() => setActiveTab("summaryStyle")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "summaryStyle"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                简介风格设置
              </button>
            </nav>
          </div>

          {/* 标签页内容 - 可滚动区域 */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-2">
            {activeTab === "generation" && (
              <GenerationTab config={config} onConfigChange={onConfigChange} />
            )}
            {activeTab === "titleStyle" && (
              <TitleStyleTab config={config} onConfigChange={onConfigChange} />
            )}
            {activeTab === "summaryStyle" && (
              <SummaryStyleTab config={config} onConfigChange={onConfigChange} />
            )}
          </div>

          {/* 底部按钮栏 */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mt-4">
            {/* 左侧：风格提示信息 */}
            <div className="flex-1 mr-4">
              {activeTab === "titleStyle" && (
                <div className="text-sm">
                  {config.selectedTitleStyle ? (
                    <span className="text-green-700 dark:text-green-300">
                      已选择标题风格：
                      {(() => {
                        const style = TITLE_STYLES.find(s => s.id === config.selectedTitleStyle)
                        return style?.name || config.selectedTitleStyle
                      })()}
                    </span>
                  ) : (
                    <span className="text-gray-500">未选择标题风格</span>
                  )}
                </div>
              )}
              {activeTab === "summaryStyle" && (
                <div className="text-sm">
                  {(() => {
                    // 过滤出有效的风格名称
                    const validStyleNames = config.selectedStyles
                      .map(styleId => {
                        const style = GENERATION_STYLES.find(s => s.id === styleId)
                        return style?.name
                      })
                      .filter(name => name !== undefined)

                    return validStyleNames.length > 0 ? (
                      <span className="text-blue-700 dark:text-blue-300">
                        已选择 {validStyleNames.length} 种简介风格：
                        {validStyleNames.join('、')}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        ⚠️ 请至少选择一种生成风格
                      </span>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* 右侧：按钮 */}
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleSave} className="bg-blue-500 hover:bg-blue-600">
                保存设置
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 生成设置标签页
function GenerationTab({
  config,
  onConfigChange
}: {
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
}) {
  // 模型选择选项
  const modelOptions = [
    { value: "deepseek-ai/DeepSeek-V2.5", label: "DeepSeek-V2.5 (推荐)", description: "高质量中文理解，适合内容生成" },
    { value: "Qwen/Qwen2.5-72B-Instruct", label: "Qwen2.5-72B", description: "强大的推理能力，适合复杂任务" },
    { value: "meta-llama/Meta-Llama-3.1-70B-Instruct", label: "Llama-3.1-70B", description: "平衡性能与效果" },
    { value: "meta-llama/Meta-Llama-3.1-8B-Instruct", label: "Llama-3.1-8B", description: "快速响应，成本较低" },
    { value: "internlm/internlm2_5-7b-chat", label: "InternLM2.5-7B", description: "轻量级模型，适合简单任务" }
  ]

  // 保存模型配置到本地存储
  const handleModelChange = (newModel: string) => {
    // 更新当前配置
    onConfigChange({
      ...config,
      model: newModel
    })

    // 保存到专门的分集简介生成器配置
    if (typeof window !== 'undefined') {
      try {
        const existingSettings = localStorage.getItem('siliconflow_api_settings')
        const settings = existingSettings ? JSON.parse(existingSettings) : {}

        // 更新分集简介生成模型配置
        settings.episodeGenerationModel = newModel

        localStorage.setItem('siliconflow_api_settings', JSON.stringify(settings))
        console.log('模型配置已保存到全局设置:', newModel)
      } catch (error) {
        console.error('保存模型配置失败:', error)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 模型选择 */}
      <div>
        <Label className="text-sm font-medium">AI模型选择</Label>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          选择用于生成分集简介的AI模型，不同模型有不同的特点和效果
        </p>
        <Select value={config.model} onValueChange={handleModelChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择AI模型" />
          </SelectTrigger>
          <SelectContent>
            {modelOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-gray-500">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 简介字数范围 */}
      <div>
        <Label className="text-sm font-medium">简介字数范围</Label>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          设置生成简介的字数范围，建议30-400字获得最佳效果
        </p>
        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12">最少:</span>
            <Slider
              value={[config.summaryLength[0]]}
              onValueChange={(value) =>
                onConfigChange({
                  ...config,
                  summaryLength: [value[0], config.summaryLength[1]]
                })
              }
              max={300}
              min={20}
              step={5}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12">{config.summaryLength[0]}字</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12">最多:</span>
            <Slider
              value={[config.summaryLength[1]]}
              onValueChange={(value) =>
                onConfigChange({
                  ...config,
                  summaryLength: [config.summaryLength[0], value[0]]
                })
              }
              max={400}
              min={config.summaryLength[0] + 10}
              step={5}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12">{config.summaryLength[1]}字</span>
          </div>
        </div>
      </div>

      {/* 创意温度 */}
      <div>
        <Label className="text-sm font-medium">创意温度</Label>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          控制AI生成内容的创意程度，0.1为保守，1.0为创意
        </p>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 dark:text-gray-400 w-12">保守</span>
          <Slider
            value={[config.temperature]}
            onValueChange={(value) =>
              onConfigChange({
                ...config,
                temperature: value[0]
              })
            }
            max={1.0}
            min={0.1}
            step={0.1}
            className="flex-1"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400 w-12">创意</span>
          <span className="text-sm font-medium w-12">{config.temperature.toFixed(1)}</span>
        </div>
      </div>

      {/* 其他选项 */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeOriginalTitle"
            checked={config.includeOriginalTitle}
            onCheckedChange={(checked) =>
              onConfigChange({
                ...config,
                includeOriginalTitle: !!checked
              })
            }
          />
          <Label htmlFor="includeOriginalTitle" className="text-sm">
            包含原始标题信息
          </Label>
        </div>
      </div>

      {/* 自定义提示词 */}
      <div>
        <Label htmlFor="customPrompt" className="text-sm font-medium">
          自定义提示词 (可选)
        </Label>
        <p className="text-xs text-gray-500 mt-1 mb-2">
          添加特殊要求或风格指导，将附加到生成提示中
        </p>
        <Textarea
          id="customPrompt"
          value={config.customPrompt || ""}
          onChange={(e) =>
            onConfigChange({
              ...config,
              customPrompt: e.target.value
            })
          }
          placeholder="例如：注重情感描述，突出角色关系..."
          className="h-20 resize-none"
        />
      </div>
    </div>
  )
}

// 标题风格设置标签页
function TitleStyleTab({
  config,
  onConfigChange
}: {
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
}) {
  const handleTitleStyleToggle = (styleId: string) => {
    // 单选模式：如果点击的是当前选中的风格，则取消选择；否则选择新风格
    const newStyle = config.selectedTitleStyle === styleId ? "" : styleId

    onConfigChange({
      ...config,
      selectedTitleStyle: newStyle
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">选择标题生成风格</h3>
        <div className="space-y-2 mb-4">
          <p className="text-xs text-gray-500">
            选择标题生成风格，单选模式，将应用到所有简介风格
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {TITLE_STYLES.map((style) => {
            const isSelected = config.selectedTitleStyle === style.id
            return (
              <div
                key={style.id}
                className={`group relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                  isSelected
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20 shadow-lg ring-2 ring-green-500/20"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md hover:bg-green-50/50 dark:hover:bg-green-950/10"
                }`}
                onClick={() => handleTitleStyleToggle(style.id)}
              >
                {/* 选中状态指示器 */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                <div className="p-5">
                  {/* 头部：图标和标题 */}
                  <div className="flex items-start space-x-3 mb-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                      isSelected
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-sm leading-tight ${
                        isSelected
                          ? "text-green-900 dark:text-green-100"
                          : "text-gray-900 dark:text-gray-100"
                      }`}>
                        {style.name}
                      </h4>
                    </div>
                  </div>

                  {/* 描述文字 */}
                  <p className={`text-xs leading-relaxed ${
                    isSelected
                      ? "text-green-700 dark:text-green-300"
                      : "text-gray-600 dark:text-gray-400"
                  }`}>
                    {style.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 简介风格设置标签页
function SummaryStyleTab({
  config,
  onConfigChange
}: {
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
}) {
  const handleStyleToggle = (styleId: string) => {
    let newStyles: string[]

    if (config.selectedStyles.includes(styleId)) {
      // 取消选择
      newStyles = config.selectedStyles.filter(id => id !== styleId)
    } else {
      // 选择新风格，直接添加
      newStyles = [...config.selectedStyles, styleId]
    }

    onConfigChange({
      ...config,
      selectedStyles: newStyles
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">选择简介生成风格</h3>
        <div className="space-y-2 mb-4">
          <p className="text-xs text-gray-500">
            可以选择多种风格组合使用，AI会为每种风格单独生成分集简介
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {GENERATION_STYLES.map((style) => {
            const isSelected = config.selectedStyles.includes(style.id)
            return (
              <div
                key={style.id}
                className={`group relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg ring-2 ring-blue-500/20"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md hover:bg-blue-50/50 dark:hover:bg-blue-950/10"
                }`}
                onClick={() => handleStyleToggle(style.id)}
              >
                {/* 选中状态指示器 */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                <div className="p-5">
                  {/* 头部：图标和标题 */}
                  <div className="flex items-start space-x-3 mb-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                      isSelected
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-sm leading-tight ${
                        isSelected
                          ? "text-blue-900 dark:text-blue-100"
                          : "text-gray-900 dark:text-gray-100"
                      }`}>
                        {style.name}
                      </h4>
                    </div>
                  </div>

                  {/* 描述文字 */}
                  <p className={`text-xs leading-relaxed ${
                    isSelected
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-400"
                  }`}>
                    {style.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 导出配置对话框组件
function ExportConfigDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
  onExport
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ExportConfig
  onConfigChange: (config: ExportConfig) => void
  onExport: () => Promise<{ success: boolean }>
}) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{ success: boolean; message?: string } | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setExportResult(null)

    try {
      const result = await onExport()
      setExportResult({
        success: result.success,
        message: result.success ? 'import.csv文件已成功覆盖！现在可以在对应词条详情页面使用集成工具上传到TMDB对应词条了。' : '导出失败'
      })
    } catch (error) {
      setExportResult({
        success: false,
        message: `导出失败：${error instanceof Error ? error.message : '未知错误'}`
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleClose = () => {
    setExportResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导出到TMDB格式</DialogTitle>
          <DialogDescription>
            配置导出选项，将生成的分集简介导出为TMDB-Import工具兼容的CSV格式
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!exportResult && (
            <>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTitle"
                    checked={config.includeTitle}
                    onCheckedChange={(checked) =>
                      onConfigChange({ ...config, includeTitle: !!checked })
                    }
                  />
                  <Label htmlFor="includeTitle" className="text-sm">
                    包含标题 (name列)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeOverview"
                    checked={config.includeOverview}
                    onCheckedChange={(checked) =>
                      onConfigChange({ ...config, includeOverview: !!checked })
                    }
                  />
                  <Label htmlFor="includeOverview" className="text-sm">
                    包含简介 (overview列)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeRuntime"
                    checked={config.includeRuntime}
                    onCheckedChange={(checked) =>
                      onConfigChange({ ...config, includeRuntime: !!checked })
                    }
                  />
                  <Label htmlFor="includeRuntime" className="text-sm">
                    包含分钟数 (runtime列)
                  </Label>
                </div>
              </div>

              <div className="text-xs text-gray-500 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <p>• 分钟数将根据字幕文件的最后时间戳计算（四舍五入）</p>
                <p>• 导出将直接覆盖 TMDB-Import-master/import.csv 文件</p>
                <p>• 集数顺序按照上传的字幕文件顺序排列</p>
              </div>
            </>
          )}

          {exportResult && (
            <div className={`p-4 rounded-lg ${exportResult.success ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
              <div className="flex items-center space-x-2">
                {exportResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <p className={`text-sm font-medium ${exportResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  {exportResult.success ? '导出成功！' : '导出失败'}
                </p>
              </div>
              {exportResult.message && (
                <p className={`text-sm mt-2 ${exportResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {exportResult.message}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!exportResult ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || (!config.includeTitle && !config.includeOverview && !config.includeRuntime)}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    导出
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              关闭
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 文件列表空状态组件
function FileListEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      {/* 简洁的图标 */}
      <div className="mb-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-full p-4 border border-gray-200/50 dark:border-gray-700/50">
          <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      {/* 简洁的文字说明 */}
      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          暂无文件
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-500 max-w-[200px] leading-relaxed">
          文件上传后将在此处显示
        </p>
      </div>

      {/* 简单的上传提示 */}
      <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-sm"></div>
          <span>支持拖拽上传</span>
        </div>
        <div className="text-gray-300 dark:text-gray-600">
          SRT • VTT • ASS • SSA
        </div>
      </div>
    </div>
  )
}