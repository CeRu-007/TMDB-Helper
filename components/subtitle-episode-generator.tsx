"use client"

import React, { useState, useCallback, useRef } from "react"

// 超强浏览器菜单禁用样式
const rewriteModeStyles = `
  /* 全局禁用改写模式下的所有选择和菜单 */
  body.rewrite-mode-active,
  body.rewrite-mode-active * {
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-touch-callout: none !important;
    -webkit-user-drag: none !important;
    -khtml-user-drag: none !important;
    -moz-user-drag: none !important;
    -o-user-drag: none !important;
    user-drag: none !important;
    -webkit-tap-highlight-color: transparent !important;
  }

  /* 禁用所有选择高亮 */
  body.rewrite-mode-active *::selection,
  body.rewrite-mode-active *::-moz-selection,
  body.rewrite-mode-active *::-webkit-selection {
    background: transparent !important;
    color: inherit !important;
  }

  /* 只允许在指定区域选择文字 */
  body.rewrite-mode-active .text-selectable {
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
    user-select: text !important;
  }

  body.rewrite-mode-active .text-selectable::selection {
    background: #3b82f6 !important;
    color: white !important;
  }

  body.rewrite-mode-active .text-selectable::-moz-selection {
    background: #3b82f6 !important;
    color: white !important;
  }

  /* 隐藏所有可能的浏览器UI元素 */
  body.rewrite-mode-active [role="menu"],
  body.rewrite-mode-active [role="menuitem"],
  body.rewrite-mode-active [role="tooltip"],
  body.rewrite-mode-active .context-menu,
  body.rewrite-mode-active .selection-menu,
  body.rewrite-mode-active .copy-menu,
  body.rewrite-mode-active [data-testid*="menu"],
  body.rewrite-mode-active [class*="menu"],
  body.rewrite-mode-active [class*="context"],
  body.rewrite-mode-active [class*="selection"],
  body.rewrite-mode-active [class*="copy"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /* 禁用浏览器扩展可能添加的元素 */
  body.rewrite-mode-active [data-extension],
  body.rewrite-mode-active [data-copilot],
  body.rewrite-mode-active [data-grammarly],
  body.rewrite-mode-active [data-translate] {
    display: none !important;
  }
`

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = rewriteModeStyles
  if (!document.head.querySelector('style[data-rewrite-mode]')) {
    styleElement.setAttribute('data-rewrite-mode', 'true')
    document.head.appendChild(styleElement)
  }
}
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
import { EpisodeConfigClient } from "@/lib/episode-config-client"

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
import { VideoAnalyzer, VideoAnalysisResult } from "@/utils/video-analyzer"
import { VideoAnalysisFeedback, VideoAnalysisStep, createDefaultAnalysisSteps, updateStepStatus } from "@/components/video-analysis-feedback"
import { ClientConfigManager } from '@/lib/client-config-manager'

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
  error?: string // 错误类型，如 'INSUFFICIENT_BALANCE'
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
  // 视频分析配置
  speechRecognitionModel?: string // 语音识别模型
  enableVideoAnalysis?: boolean // 是否启用视频分析
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

  // API提供商状态
  const [apiProvider, setApiProvider] = useState<'siliconflow' | 'modelscope'>('siliconflow')
  const [siliconFlowApiKey, setSiliconFlowApiKey] = useState('')
  const [modelScopeApiKey, setModelScopeApiKey] = useState('')
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeTitle: true,
    includeOverview: true,
    includeRuntime: true
  })
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false)
  const [videoAnalysisProgress, setVideoAnalysisProgress] = useState(0)
  const [videoAnalysisResult, setVideoAnalysisResult] = useState<VideoAnalysisResult | null>(null)
  const [showAnalysisResult, setShowAnalysisResult] = useState(false)

  const [movieTitle, setMovieTitle] = useState('')
  const { toast } = useToast()

  // 余额不足弹窗状态
  const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false)

  // 检测是否是余额不足错误
  const isInsufficientBalanceError = (error: any): boolean => {
    if (typeof error === 'string') {
      return error.includes('account balance is insufficient') ||
             error.includes('余额已用完') ||
             error.includes('余额不足')
    }

    if (error && typeof error === 'object') {
      const errorStr = JSON.stringify(error).toLowerCase()
      return errorStr.includes('30001') ||
             errorStr.includes('account balance is insufficient') ||
             errorStr.includes('insufficient_balance') ||
             error.errorType === 'INSUFFICIENT_BALANCE'
    }

    return false
  }

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
  const [config, setConfig] = useState<GenerationConfig>({
    model: "deepseek-ai/DeepSeek-V2.5",
    summaryLength: [20, 30],
    selectedStyles: [],
    selectedTitleStyle: "location_skill",
    temperature: 0.7,
    includeOriginalTitle: true,
    speechRecognitionModel: "FunAudioLLM/SenseVoiceSmall",
    enableVideoAnalysis: false
  })

  // 首次从服务端加载分集生成配置与模型
  React.useEffect(() => {
    (async () => {
      try {
        const provider = (await ClientConfigManager.getItem('episode_generator_api_provider')) || 'siliconflow'
        const settingsKey = provider === 'siliconflow' ? 'siliconflow_api_settings' : 'modelscope_api_settings'
        const settingsText = await ClientConfigManager.getItem(settingsKey)
        let episodeGenerationModel = provider === 'siliconflow' ? 'deepseek-ai/DeepSeek-V2.5' : 'Qwen/Qwen3-32B'
        if (settingsText) {
          try { const s = JSON.parse(settingsText); if (s.episodeGenerationModel) episodeGenerationModel = s.episodeGenerationModel } catch {}
        }
        const saved = await ClientConfigManager.getItem('episode_generator_config')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed.selectedTitleStyles && Array.isArray(parsed.selectedTitleStyles)) {
              parsed.selectedTitleStyle = parsed.selectedTitleStyles[0] || 'location_skill'
              delete parsed.selectedTitleStyles
            } else if (!parsed.selectedTitleStyle) {
              parsed.selectedTitleStyle = 'location_skill'
            }
            if (parsed.selectedStyles && Array.isArray(parsed.selectedStyles)) {
              const validStyleIds = (typeof GENERATION_STYLES !== 'undefined' ? GENERATION_STYLES.map((s:any)=>s.id) : [])
              parsed.selectedStyles = parsed.selectedStyles.filter((id:string)=> validStyleIds.length ? validStyleIds.includes(id) : true)
            } else {
              parsed.selectedStyles = []
            }
            const { model: _omitModel, ...configWithoutModel } = parsed
            setConfig(prev => ({
              ...prev,
              ...configWithoutModel,
              model: episodeGenerationModel,
            }))
          } catch (e) {
            console.error('Failed to parse saved episode_generator_config:', e)
            setConfig(prev => ({ ...prev, model: episodeGenerationModel }))
          }
        } else {
          setConfig(prev => ({ ...prev, model: episodeGenerationModel }))
        }
      } catch (e) {
        console.error('加载服务端分集生成配置失败:', e)
      }
    })()
  }, [])

  // 从全局设置加载API密钥
  const loadGlobalSettings = React.useCallback(async () => {
    // 加载硅基流动设置
    const globalSiliconFlowSettings = await ClientConfigManager.getItem('siliconflow_api_settings')
    if (globalSiliconFlowSettings) {
      try {
        const settings = JSON.parse(globalSiliconFlowSettings)
        setSiliconFlowApiKey(settings.apiKey || '')
      } catch (error) {
        console.error('解析全局硅基流动设置失败:', error)
      }
    } else {
      // 兼容旧的设置
      const savedApiKey = await ClientConfigManager.getItem('siliconflow_api_key')
      if (savedApiKey) {
        setSiliconFlowApiKey(savedApiKey)
      }
    }

    // 加载魔搭社区设置
    const globalModelScopeSettings = await ClientConfigManager.getItem('modelscope_api_settings')
    if (globalModelScopeSettings) {
      try {
        const settings = JSON.parse(globalModelScopeSettings)
        setModelScopeApiKey(settings.apiKey || '')
      } catch (error) {
        console.error('解析全局魔搭社区设置失败:', error)
      }
    } else {
      // 兼容旧的设置
      const savedApiKey = await ClientConfigManager.getItem('modelscope_api_key')
      if (savedApiKey) {
        setModelScopeApiKey(savedApiKey)
      }
    }

    // 加载API提供商偏好设置
    const savedProvider = await ClientConfigManager.getItem('episode_generator_api_provider')
    if (savedProvider && (savedProvider === 'siliconflow' || savedProvider === 'modelscope')) {
      setApiProvider(savedProvider)
    }
  }, [])

  // 当API提供商切换时，更新模型配置
  React.useEffect(() => {
    const updateModelForProvider = () => {
      const settingsKey = apiProvider === 'siliconflow' ? 'siliconflow_api_settings' : 'modelscope_api_settings'
      let newModel = apiProvider === 'siliconflow' ? 'deepseek-ai/DeepSeek-V2.5' : 'Qwen/Qwen3-32B';

      (async () => {
        try {
          const globalSettings = await ClientConfigManager.getItem(settingsKey)
          if (globalSettings) {
            const settings = JSON.parse(globalSettings)
            if (settings.episodeGenerationModel) {
              newModel = settings.episodeGenerationModel
            }
          }
        } catch (e) {
          console.error(`Failed to parse ${apiProvider} settings:`, e)
        }
        setConfig(prev => ({ ...prev, model: newModel }))
      })()

      // 更新配置中的模型
      setConfig(prev => ({
        ...prev,
        model: newModel
      }))
    }

    updateModelForProvider()
  }, [apiProvider])

  // 初始加载配置
  React.useEffect(() => {
    loadGlobalSettings()
  }, [loadGlobalSettings])

  // 监听全局设置变化
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'siliconflow_api_settings' || e.key === 'modelscope_api_settings') {
        console.log('检测到全局API设置变化，重新加载配置')
        loadGlobalSettings()
      }
    }

    // 服务端存储不触发 storage 事件，这里仅保留自定义事件监听

    // 监听自定义事件（用于同一页面内的设置变化）
    const handleCustomSettingsChange = () => {
      console.log('检测到设置页面配置变化，重新加载配置')
      loadGlobalSettings()
    }
    window.addEventListener('siliconflow-settings-changed', handleCustomSettingsChange)
    window.addEventListener('modelscope-settings-changed', handleCustomSettingsChange)

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
      window.removeEventListener('modelscope-settings-changed', handleCustomSettingsChange)
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

  // 调用API生成内容（为单个风格生成）
  const generateEpisodeContentForStyle = async (episode: SubtitleEpisode, styleId: string): Promise<GenerationResult> => {
    const prompt = buildPromptForStyle(episode, config, styleId)

    // 根据API提供商选择不同的端点和API密钥
    const currentApiKey = apiProvider === 'siliconflow' ? siliconFlowApiKey : modelScopeApiKey
    const apiEndpoint = apiProvider === 'siliconflow' ? '/api/siliconflow' : '/api/modelscope'

    if (!currentApiKey) {
      throw new Error(`${apiProvider === 'siliconflow' ? '硅基流动' : '魔搭社区'}API密钥未配置`)
    }

    const response = await fetch(apiEndpoint, {
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
        apiKey: currentApiKey
      })
    })

    if (!response.ok) {
      let errorMessage = `API调用失败 (${response.status})`
      try {
        const responseText = await response.text()
        console.error('API错误原始响应:', responseText.substring(0, 500))

        // 检查是否是HTML响应
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          errorMessage = 'API端点返回错误页面，请检查API密钥配置'
          console.error('收到HTML响应:', responseText.substring(0, 200))
        } else {
          let errorData = null
          try {
            errorData = JSON.parse(responseText)
            console.error('API错误详情:', {
              status: response.status,
              statusText: response.statusText,
              errorData,
              apiProvider,
              endpoint: apiEndpoint,
              model: config.model
            })
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.error('无法解析错误响应为JSON:', parseError)
            errorMessage = `API返回非JSON响应: ${responseText.substring(0, 100)}`
          }

          // 根据错误类型提供更友好的提示
          if (response.status === 401) {
            errorMessage = 'API密钥无效，请检查配置'
          } else if (response.status === 429) {
            errorMessage = 'API调用频率过高，请稍后重试'
          } else if (response.status === 500) {
            errorMessage = '服务器内部错误，请稍后重试'
          } else if (response.status === 403) {
            // 检查是否是余额不足错误
            if (isInsufficientBalanceError(errorData) || isInsufficientBalanceError(responseText)) {
              // 显示余额不足弹窗，不抛出错误
              setShowInsufficientBalanceDialog(true)
              // 返回一个特殊的结果，表示余额不足
              return {
                episodeNumber: episode.episodeNumber,
                originalTitle: episode.title || `第${episode.episodeNumber}集`,
                generatedTitle: `第${episode.episodeNumber}集`,
                generatedSummary: '余额不足，无法生成内容',
                confidence: 0,
                wordCount: 0,
                generationTime: Date.now(),
                model: config.model,
                styles: styleId ? [styleId] : config.selectedStyles,
                styleId: styleId,
                styleName: styleName,
                error: 'INSUFFICIENT_BALANCE'
              }
            } else {
              errorMessage = '访问权限不足，请检查API密钥'
            }
          }
        }
      } catch (e) {
        console.error('处理错误响应时发生异常:', e)
        errorMessage = `网络错误或响应格式异常: ${e.message}`
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('客户端收到的完整响应:', result)

    if (!result.success) {
      console.error('API调用失败:', result)
      throw new Error(result.error || 'API调用失败')
    }

    console.log('API响应数据结构:', {
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : [],
      content: result.data?.content,
      contentType: typeof result.data?.content,
      contentLength: result.data?.content?.length,
      service: result.data?.service
    })

    const content = result.data.content

    if (!content) {
      console.error('内容为空的详细信息:', {
        content,
        contentType: typeof content,
        isNull: content === null,
        isUndefined: content === undefined,
        isEmpty: content === '',
        fullData: result.data
      })
      throw new Error('API返回内容为空，请重试')
    }

    // 解析生成的内容
    console.log('准备解析内容，调用parseGeneratedContent')
    const parsedResult = parseGeneratedContent(content, episode, config, styleId)
    console.log('解析完成，结果:', parsedResult)

    // 如果生成的简介太短，标记为低置信度
    if (parsedResult.generatedSummary.length < 30) {
      console.warn(`生成的简介太短(${parsedResult.generatedSummary.length}字)，建议重新生成`)
      parsedResult.confidence = Math.min(parsedResult.confidence, 0.3)
    }

    return parsedResult
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

        // 检查是否是余额不足的结果
        if (result.error === 'INSUFFICIENT_BALANCE') {
          // 余额不足时，直接返回已有结果，不继续生成其他风格
          results.push(result)
          break
        }

        results.push(result)

        // 避免API限流，在风格之间添加短暂延迟
        if (validSelectedStyles.length > 1 && styleId !== validSelectedStyles[validSelectedStyles.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`风格 ${styleId} 生成失败:`, error)

        // 检查是否是余额不足错误
        if (isInsufficientBalanceError(error)) {
          // 余额不足时，添加特殊的结果并停止生成
          const style = GENERATION_STYLES.find(s => s.id === styleId)
          results.push({
            episodeNumber: episode.episodeNumber,
            originalTitle: episode.title || `第${episode.episodeNumber}集`,
            generatedTitle: `第${episode.episodeNumber}集`,
            generatedSummary: '余额不足，无法生成内容',
            confidence: 0,
            wordCount: 0,
            generationTime: Date.now(),
            model: config.model,
            styles: [styleId],
            styleId: styleId,
            styleName: style?.name || styleId,
            error: 'INSUFFICIENT_BALANCE'
          })
          break
        }

        // 添加失败的结果占位符
        const style = GENERATION_STYLES.find(s => s.id === styleId)
        results.push({
          episodeNumber: episode.episodeNumber,
          originalTitle: episode.title || `第${episode.episodeNumber}集`,
          generatedTitle: `第${episode.episodeNumber}集（${style?.name || styleId}风格生成失败）`,
          generatedSummary: `生成失败：${error instanceof Error ? error.message : '未知错误'}`,
          confidence: 0,
          wordCount: 0,
          generationTime: Date.now(),
          model: config.model,
          styles: [styleId],
          styleId: styleId,
          styleName: style?.name || styleId
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
**🚨 严格要求：只输出JSON，禁止任何推理过程 🚨**

❌ 错误示例：
"让我来分析一下这段内容..."
"首先，我需要理解..."
"根据字幕内容，我认为..."

✅ 正确示例：
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



    console.log('开始解析生成的内容:', {
      content: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
      contentLength: content.length,
      episodeNumber: episode.episodeNumber,
      styleId,
      styleName
    })

    try {
      const parsed = JSON.parse(content)
      console.log('JSON解析成功:', parsed)
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
      console.log('JSON解析失败，尝试文本解析:', error.message)
      console.log('原始内容:', content)

      // 如果不是JSON格式，尝试从文本中提取
      const lines = content.split('\n').filter(line => line.trim())
      let title = `第${episode.episodeNumber}集`
      let summary = '暂无简介'

      console.log('分割后的行:', lines)

      // 尝试多种解析方式
      for (const line of lines) {
        const trimmedLine = line.trim()

        // 检查标题
        if (trimmedLine.includes('标题') || trimmedLine.includes('title') || trimmedLine.includes('Title')) {
          title = trimmedLine.replace(/.*[:：]\s*/, '').replace(/["""]/g, '').trim()
          console.log('提取到标题:', title)
        }
        // 检查简介
        else if (trimmedLine.includes('简介') || trimmedLine.includes('summary') || trimmedLine.includes('Summary')) {
          summary = trimmedLine.replace(/.*[:：]\s*/, '').replace(/["""]/g, '').trim()
          console.log('提取到简介:', summary)
        }
        // 如果没有明确标识，但内容较长，可能是简介
        else if (trimmedLine.length > 20 && !trimmedLine.includes('第') && !trimmedLine.includes('集')) {
          summary = trimmedLine
          console.log('推测为简介内容:', summary)
        }
      }

      // 如果还是没有找到合适的简介，尝试更智能的提取
      if (summary === '暂无简介' && content.trim().length > 0) {
        const trimmedContent = content.trim()

        // 尝试提取引号内的长文本
        const quotedMatch = trimmedContent.match(/"([^"]{20,})"/);
        if (quotedMatch) {
          summary = quotedMatch[1]
          console.log('提取引号内的长文本作为简介:', summary)
        }
        // 如果没有引号，但内容较短且看起来像简介，直接使用
        else if (trimmedContent.length < 200 && !trimmedContent.includes('\n\n')) {
          summary = trimmedContent
          console.log('使用完整内容作为简介:', summary)
        }
        // 如果内容很长，尝试提取第一段有意义的文本
        else {
          const sentences = trimmedContent.split(/[。！？.!?]/).filter(s => s.trim().length > 10)
          if (sentences.length > 0) {
            summary = sentences[0].trim() + '。'
            console.log('提取第一句有意义的文本作为简介:', summary)
          } else {
            summary = trimmedContent.substring(0, 100) + '...'
            console.log('截取前100字符作为简介:', summary)
          }
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
    const currentApiKey = apiProvider === 'siliconflow' ? siliconFlowApiKey : modelScopeApiKey
    if (!selectedFile || !currentApiKey) {
      if (onOpenGlobalSettings) {
        onOpenGlobalSettings('api')
      } else {
        alert(`请选择字幕文件并配置${apiProvider === 'siliconflow' ? '硅基流动' : '魔搭社区'}API密钥`)
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

      // 检查是否是余额不足错误
      if (isInsufficientBalanceError(error)) {
        setShowInsufficientBalanceDialog(true)
        // 不显示额外的错误提示
      } else {
        alert(`生成失败：${error instanceof Error ? error.message : '未知错误'}`)
      }
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
      case 'proofread':
        return { temperature: 0.3, maxTokens: 1000 } // 需要精确的语法纠正
      default:
        return { temperature: 0.7, maxTokens: 800 }
    }
  }

  // 内容增强功能
  const handleEnhanceContent = async (fileId: string, resultIndex: number, operation: EnhanceOperation, selectedTextInfo?: {text: string, start: number, end: number}) => {
    const results = generationResults[fileId] || []
    const result = results[resultIndex]
    if (!result) return

    try {
      let prompt: string
      let systemContent: string

      // 如果是改写操作且有选中文字信息，使用特殊的处理逻辑
      if (operation === 'rewrite' && selectedTextInfo) {
        console.log('改写API调用信息:', {
          operation,
          selectedTextInfo,
          originalSummary: result.generatedSummary
        })

        prompt = `请对以下文字进行改写，保持原意但使用不同的表达方式：

【需要改写的文字】
${selectedTextInfo.text}

【改写要求】
1. 保持原文的核心意思和信息
2. 使用不同的词汇和句式表达
3. 让表达更加生动自然
4. 保持与上下文的连贯性
5. 字数与原文相近

请直接输出改写后的文字，不要包含其他说明：`

        systemContent = "你是一位专业的文字编辑专家，擅长改写和优化文字表达。请严格按照用户要求进行改写，保持原意的同时提升表达质量。"
      } else {
        // 使用原有的增强逻辑
        prompt = buildEnhancePrompt(result, operation)
        systemContent = `你是一位资深的影视内容编辑专家，专门负责优化电视剧、电影等影视作品的分集标题和剧情简介。你具备以下专业能力：

1. **深度理解影视叙事**：熟悉各种影视类型的叙事特点和观众心理
2. **精准语言表达**：能够根据不同平台和受众调整语言风格
3. **内容质量把控**：确保每次优化都能显著提升内容的吸引力和专业度
4. **剧透控制能力**：精确掌握信息透露的分寸，平衡悬念与吸引力

请严格按照用户要求进行内容优化，确保输出格式规范、内容质量上乘。`
      }

      // 根据操作类型调整参数
      const operationConfig = getOperationConfig(operation)

      // 根据API提供商选择不同的端点和API密钥
      const currentApiKey = apiProvider === 'siliconflow' ? siliconFlowApiKey : modelScopeApiKey
      const apiEndpoint = apiProvider === 'siliconflow' ? '/api/siliconflow' : '/api/modelscope'

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: "system",
              content: systemContent
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: operationConfig.temperature,
          max_tokens: operationConfig.maxTokens,
          apiKey: currentApiKey
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

      // 如果是改写操作且有选中文字信息，进行部分替换
      if (operation === 'rewrite' && selectedTextInfo) {
        const originalSummary = result.generatedSummary
        const newSummary = originalSummary.substring(0, selectedTextInfo.start) +
                          enhancedContent +
                          originalSummary.substring(selectedTextInfo.end)

        console.log('改写结果处理:', {
          originalSummary,
          selectedText: selectedTextInfo.text,
          rewrittenText: enhancedContent,
          newSummary,
          start: selectedTextInfo.start,
          end: selectedTextInfo.end
        })

        // 更新结果
        handleUpdateResult(fileId, resultIndex, {
          generatedSummary: newSummary,
          wordCount: newSummary.length
        })
      } else {
        // 原有的增强逻辑
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
      }

    } catch (error) {
      console.error('内容增强失败:', error)

      // 检查是否是余额不足错误
      if (isInsufficientBalanceError(error)) {
        setShowInsufficientBalanceDialog(true)
        return // 直接返回，不显示错误提示
      } else {
        alert(`${getOperationName(operation)}失败：${error instanceof Error ? error.message : '未知错误'}`)
      }
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

      case 'proofread':
        return `请对以下影视剧集标题和简介进行语法纠错和语句优化，使其更加通顺流畅：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【纠错优化要求】
1. **语法纠正**：修正语法错误、标点符号使用不当等问题
2. **语句通顺**：优化句式结构，使表达更加流畅自然
3. **用词准确**：选择更准确、恰当的词汇表达
4. **逻辑清晰**：确保句子间逻辑关系清楚，表达连贯
5. **风格统一**：保持整体语言风格的一致性

【纠错原则】
- 保持原意不变，只优化表达方式
- 修正明显的语法和用词错误
- 提升语言的准确性和流畅度
- 保持内容的完整性和可读性
- 适合正式的影视介绍场合

【注意事项】
- 不改变核心内容和信息量
- 保持原有的语言风格特色
- 确保修改后的内容更加专业和准确

请严格按照以下格式输出：
标题：[纠错后的标题]
简介：[纠错后的简介]`

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
      case 'proofread': return '纠错'
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

  // 处理视频分析
  const handleVideoAnalysis = async (videoUrl: string) => {
    if (!siliconFlowApiKey) {
      toast({
        title: "需要配置API密钥",
        description: "视频分析功能需要硅基流动API密钥，请先在设置中配置",
        variant: "destructive"
      })
      return
    }

    setIsVideoAnalyzing(true)
    setVideoAnalysisProgress(0)

    try {
      // 创建视频分析器，传递语音识别模型配置
      const analyzer = new VideoAnalyzer(siliconFlowApiKey, {
        speechRecognitionModel: config.speechRecognitionModel || 'FunAudioLLM/SenseVoiceSmall'
      })

      // 开始分析
      const result = await analyzer.analyzeVideo(videoUrl)

      // 保存分析结果并显示
      setVideoAnalysisResult(result)
      setShowAnalysisResult(true)

      toast({
        title: "视频分析完成",
        description: "AI已成功分析视频内容，点击查看详细结果",
      })

    } catch (error) {
      console.error('视频分析失败:', error)
      alert(`视频分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsVideoAnalyzing(false)
      setVideoAnalysisProgress(0)
    }
  }

  // 为视频分析结果生成简介
  const generateEpisodesForFile = async (file: SubtitleFile) => {
    try {
      const results: GenerationResult[] = []
      const episodes = file.episodes
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
          setGenerationResults(prev => ({ ...prev, [file.id]: [...results] }))
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
              originalTitle: episode.title || `第${episode.episodeNumber}集`,
              originalContent: episode.content
            })
          }

          setGenerationResults(prev => ({ ...prev, [file.id]: [...results] }))
          setGenerationProgress((completedTasks / totalTasks) * 100)
        }
      }

      // 显示完成提示
      toast({
        title: "生成完成",
        description: `成功生成 ${successCount} 个简介，失败 ${failCount} 个`,
      })

    } catch (error) {
      console.error('批量生成失败:', error)

      // 检查是否是余额不足错误
      if (isInsufficientBalanceError(error)) {
        setShowInsufficientBalanceDialog(true)
        // 不显示额外的错误提示
      } else {
        toast({
          title: "生成失败",
          description: error instanceof Error ? error.message : '未知错误',
          variant: "destructive"
        })
      }
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  // 重新生成结构化内容（只生成SRT格式）
  const regenerateStructuredContent = (updatedResult: VideoAnalysisResult): VideoAnalysisResult => {
    const audioSegments = updatedResult.audioAnalysis.segments;

    // 生成SRT格式
    const formatSRTTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    };

    const srtLines = [];

    // 音频转录内容
    audioSegments.forEach((segment, index) => {
      const srtIndex = index + 1; // 从1开始
      const startTime = formatSRTTime(segment.start);
      const endTime = formatSRTTime(segment.end);

      srtLines.push(
        srtIndex.toString(),
        `${startTime} --> ${endTime}`,
        segment.text,
        ''
      );
    });

    const srtContent = srtLines.join('\n');

    return {
      ...updatedResult,
      structuredContent: {
        srt: srtContent,
        markdown: '', // 不再生成
        text: ''      // 不再生成
      }
    };
  };











  // 批量生成所有文件的简介
  const handleBatchGenerateAll = async () => {
    const currentApiKey = apiProvider === 'siliconflow' ? siliconFlowApiKey : modelScopeApiKey
    if (!currentApiKey) {
      if (onOpenGlobalSettings) {
        onOpenGlobalSettings('api')
      } else {
        alert(`请先配置${apiProvider === 'siliconflow' ? '硅基流动' : '魔搭社区'}API密钥`)
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

      // 检查是否是余额不足错误
      if (isInsufficientBalanceError(error)) {
        setShowInsufficientBalanceDialog(true)
        // 不显示额外的错误提示
      } else {
        alert(`批量生成失败：${error instanceof Error ? error.message : '未知错误'}`)
      }
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
            apiConfigured={!!(apiProvider === 'siliconflow' ? siliconFlowApiKey : modelScopeApiKey)}
            hasResults={Object.values(generationResults).some(results => results.length > 0)}
            videoAnalysisResult={videoAnalysisResult}
            onShowAnalysisResult={() => setShowAnalysisResult(true)}
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
              apiConfigured={!!(apiProvider === 'siliconflow' ? siliconFlowApiKey : modelScopeApiKey)}
              onOpenGlobalSettings={onOpenGlobalSettings}
              onUpdateResult={(resultIndex, updatedResult) =>
                handleUpdateResult(selectedFile.id, resultIndex, updatedResult)
              }
              onMoveToTop={(resultIndex) =>
                handleMoveToTop(selectedFile.id, resultIndex)
              }
              onEnhanceContent={(resultIndex, operation, selectedTextInfo) =>
                handleEnhanceContent(selectedFile.id, resultIndex, operation, selectedTextInfo)
              }
              isInsufficientBalanceError={isInsufficientBalanceError}
              setShowInsufficientBalanceDialog={setShowInsufficientBalanceDialog}
            />
          ) : (
            <EmptyState
              onUpload={() => fileInputRef.current?.click()}
              onVideoAnalysis={handleVideoAnalysis}
            />
          )}
        </div>
      </div>

      {/* 生成设置对话框 */}
      <GenerationSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        config={config}
        onConfigChange={setConfig}
        apiConfigured={!!(apiProvider === 'siliconflow' ? siliconFlowApiKey : modelScopeApiKey)}
        onOpenGlobalSettings={onOpenGlobalSettings}
        setShouldReopenSettingsDialog={setShouldReopenSettingsDialog}
        apiProvider={apiProvider}
        onApiProviderChange={async (provider) => {
          setApiProvider(provider)
          await ClientConfigManager.setItem('episode_generator_api_provider', provider)
        }}
        siliconFlowApiKey={siliconFlowApiKey}
        modelScopeApiKey={modelScopeApiKey}
      />

      {/* 导出配置对话框 */}
      <ExportConfigDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        config={exportConfig}
        onConfigChange={setExportConfig}
        onExport={handleBatchExportToTMDB}
      />

      {/* 视频分析结果对话框 */}
      <VideoAnalysisResultDialog
        open={showAnalysisResult}
        onOpenChange={setShowAnalysisResult}
        result={videoAnalysisResult}
        movieTitle={movieTitle}
        onMovieTitleChange={setMovieTitle}

        onGenerateEpisode={() => {
          if (videoAnalysisResult) {
            // 将视频分析结果转换为字幕文件格式
            const episodeContent = VideoAnalyzer.convertToEpisodeContent(videoAnalysisResult)

            // 创建虚拟字幕文件
            const videoFile: SubtitleFile = {
              id: `video-${Date.now()}`,
              name: videoAnalysisResult.videoInfo.title || '视频分析结果',
              size: episodeContent.length,
              uploadTime: new Date(),
              episodes: [{
                episodeNumber: 1,
                content: episodeContent,
                wordCount: episodeContent.length,
                title: videoAnalysisResult.videoInfo.title
              }]
            }

            // 添加到文件列表
            setSubtitleFiles(prev => [...prev, videoFile])
            setSelectedFile(videoFile)
            setShowAnalysisResult(false)

            // 自动开始生成简介
            setTimeout(() => {
              // 直接生成简介，不需要检查API密钥（视频分析已经验证过了）
              if (videoFile.episodes.length > 0) {
                setIsGenerating(true)
                setGenerationProgress(0)
                setGenerationResults(prev => ({ ...prev, [videoFile.id]: [] }))

                // 开始生成简介
                generateEpisodesForFile(videoFile)
              }
            }, 1000)
          }
        }}
      />

      {/* 余额不足弹窗 */}
      <Dialog open={showInsufficientBalanceDialog} onOpenChange={setShowInsufficientBalanceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              余额不足
            </DialogTitle>
            <DialogDescription>
              您的硅基流动余额已用完，无法继续使用AI生成功能。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>请前往硅基流动官网充值后继续使用：</p>
              <a
                href="https://cloud.siliconflow.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                https://cloud.siliconflow.cn
              </a>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowInsufficientBalanceDialog(false)}
              >
                知道了
              </Button>
              <Button
                onClick={() => {
                  window.open('https://cloud.siliconflow.cn', '_blank')
                  setShowInsufficientBalanceDialog(false)
                }}
                className="bg-blue-500 hover:bg-blue-600"
              >
                前往充值
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  hasResults,
  videoAnalysisResult,
  onShowAnalysisResult
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
  videoAnalysisResult?: VideoAnalysisResult | null
  onShowAnalysisResult?: () => void
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

          {/* 视频分析结果按钮 */}
          {videoAnalysisResult && onShowAnalysisResult && (
            <Button
              onClick={onShowAnalysisResult}
              disabled={isGenerating}
              variant="outline"
              className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/30"
              size="sm"
            >
              <Film className="h-4 w-4 mr-2" />
              查看视频分析结果
            </Button>
          )}

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
  onEnhanceContent,
  isInsufficientBalanceError,
  setShowInsufficientBalanceDialog
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
  onEnhanceContent?: (resultIndex: number, operation: EnhanceOperation, selectedTextInfo?: {text: string, start: number, end: number}) => void
  isInsufficientBalanceError?: (error: any) => boolean
  setShowInsufficientBalanceDialog?: (show: boolean) => void
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
          <ResultsDisplay
            results={results}
            onUpdateResult={onUpdateResult}
            onMoveToTop={onMoveToTop}
            onEnhanceContent={onEnhanceContent}
            isInsufficientBalanceError={isInsufficientBalanceError}
            setShowInsufficientBalanceDialog={setShowInsufficientBalanceDialog}
          />
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
type EnhanceOperation = 'polish' | 'shorten' | 'expand' | 'continue' | 'formalize' | 'colloquialize' | 'literarize' | 'rewrite' | 'summarize' | 'rephrase' | 'removeSpoilers' | 'addSpoilers' | 'proofread'

// 结果展示组件
const ResultsDisplay: React.FC<{
  results: GenerationResult[]
  onUpdateResult?: (index: number, updatedResult: Partial<GenerationResult>) => void
  onMoveToTop?: (index: number) => void
  onEnhanceContent?: (index: number, operation: EnhanceOperation, selectedTextInfo?: {text: string, start: number, end: number}) => void
  isInsufficientBalanceError?: (error: any) => boolean
  setShowInsufficientBalanceDialog?: (show: boolean) => void
}> = ({ results, onUpdateResult, onMoveToTop, onEnhanceContent, isInsufficientBalanceError, setShowInsufficientBalanceDialog }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingSummary, setEditingSummary] = useState('')
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null)
  const [enhancingOperation, setEnhancingOperation] = useState<string | null>(null)

  // 改写相关状态
  const [rewritingIndex, setRewritingIndex] = useState<number | null>(null)
  const [selectedText, setSelectedText] = useState<string>('')
  const [selectionStart, setSelectionStart] = useState<number>(0)
  const [selectionEnd, setSelectionEnd] = useState<number>(0)
  const [isRewritingText, setIsRewritingText] = useState<boolean>(false)

  // 自定义选择实现相关状态
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionHighlight, setSelectionHighlight] = useState<{start: number, end: number} | null>(null)
  const textContainerRef = useRef<HTMLDivElement>(null)

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

  // 自定义文字选择实现
  const getTextNodeAtPosition = (container: Element, offset: number): {node: Text, offset: number} | null => {
    let currentOffset = 0
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )

    let node = walker.nextNode() as Text
    while (node) {
      const nodeLength = node.textContent?.length || 0
      if (currentOffset + nodeLength >= offset) {
        return { node, offset: offset - currentOffset }
      }
      currentOffset += nodeLength
      node = walker.nextNode() as Text
    }

    return null
  }

  const getOffsetFromTextNode = (container: Element, targetNode: Node, targetOffset: number): number => {
    let offset = 0

    try {
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      )

      let node = walker.nextNode()
      while (node) {
        if (node === targetNode) {
          return offset + targetOffset
        }
        offset += node.textContent?.length || 0
        node = walker.nextNode()
      }

      // 如果没找到目标节点，尝试查找父节点
      if (targetNode.nodeType === Node.TEXT_NODE) {
        return offset + targetOffset
      } else {
        // 如果是元素节点，计算到该元素的偏移
        const textContent = container.textContent || ''
        const nodeText = targetNode.textContent || ''
        const nodeIndex = textContent.indexOf(nodeText)
        return nodeIndex >= 0 ? nodeIndex + targetOffset : offset
      }
    } catch (error) {
      console.log('getOffsetFromTextNode 错误:', error)
      return 0
    }
  }

  const handleCustomMouseDown = (e: React.MouseEvent, index: number) => {
    if (rewritingIndex !== index) return

    e.preventDefault()
    e.stopPropagation()

    console.log('开始自定义选择')

    setIsSelecting(true)
    setSelectionHighlight(null)
    setSelectedText('')

    // 完全禁用浏览器的选择
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges()
    }

    const container = textContainerRef.current
    if (!container) return

    const startX = e.clientX
    const startY = e.clientY
    let startOffset = 0

    // 计算起始位置
    try {
      if (document.caretRangeFromPoint) {
        const startRange = document.caretRangeFromPoint(startX, startY)
        if (startRange && container.contains(startRange.startContainer)) {
          startOffset = getOffsetFromTextNode(container, startRange.startContainer, startRange.startOffset)
        }
      } else {
        // 备用方法：简单的基于位置的估算
        const rect = container.getBoundingClientRect()
        const relativeX = startX - rect.left
        const relativeY = startY - rect.top
        const fullText = container.textContent || ''

        // 简单估算：基于相对位置计算大概的字符位置
        const lineHeight = 20 // 估算行高
        const charWidth = 8   // 估算字符宽度
        const lineIndex = Math.floor(relativeY / lineHeight)
        const charIndex = Math.floor(relativeX / charWidth)

        startOffset = Math.min(lineIndex * 50 + charIndex, fullText.length)
      }
    } catch (error) {
      console.log('计算起始位置失败:', error)
      startOffset = 0
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault()
      moveEvent.stopPropagation()

      let endOffset = startOffset

      // 计算结束位置
      try {
        if (document.caretRangeFromPoint) {
          const endRange = document.caretRangeFromPoint(moveEvent.clientX, moveEvent.clientY)
          if (endRange && container.contains(endRange.startContainer)) {
            endOffset = getOffsetFromTextNode(container, endRange.startContainer, endRange.startOffset)
          }
        } else {
          // 备用方法：简单的基于位置的估算
          const rect = container.getBoundingClientRect()
          const relativeX = moveEvent.clientX - rect.left
          const relativeY = moveEvent.clientY - rect.top
          const fullText = container.textContent || ''

          const lineHeight = 20
          const charWidth = 8
          const lineIndex = Math.floor(relativeY / lineHeight)
          const charIndex = Math.floor(relativeX / charWidth)

          endOffset = Math.min(lineIndex * 50 + charIndex, fullText.length)
        }
      } catch (error) {
        console.log('计算结束位置失败:', error)
        endOffset = startOffset
      }

      const start = Math.min(startOffset, endOffset)
      const end = Math.max(startOffset, endOffset)

      if (end > start) {
        const fullText = container.textContent || ''
        const selectedText = fullText.substring(start, end)

        console.log('选择范围:', { start, end, selectedText })

        setSelectionHighlight({ start, end })
        setSelectedText(selectedText)
        setSelectionStart(start)
        setSelectionEnd(end)
      }
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault()
      upEvent.stopPropagation()

      console.log('结束选择')

      setIsSelecting(false)
      document.removeEventListener('mousemove', handleMouseMove, { capture: true })
      document.removeEventListener('mouseup', handleMouseUp, { capture: true })

      // 确保浏览器选择被清除
      setTimeout(() => {
        if (window.getSelection) {
          window.getSelection()?.removeAllRanges()
        }
      }, 0)
    }

    document.addEventListener('mousemove', handleMouseMove, { capture: true, passive: false })
    document.addEventListener('mouseup', handleMouseUp, { capture: true, passive: false })
  }

  // 简单的单词选择功能（备用方案）
  const handleWordClick = (e: React.MouseEvent, text: string) => {
    e.preventDefault()
    e.stopPropagation()

    const target = e.target as HTMLElement
    const clickedText = target.textContent || ''

    if (clickedText.trim()) {
      const fullText = text
      const startIndex = fullText.indexOf(clickedText.trim())

      if (startIndex !== -1) {
        const endIndex = startIndex + clickedText.trim().length

        setSelectedText(clickedText.trim())
        setSelectionStart(startIndex)
        setSelectionEnd(endIndex)
        setSelectionHighlight({ start: startIndex, end: endIndex })

        console.log('单词选择:', { text: clickedText.trim(), start: startIndex, end: endIndex })
      }
    }
  }

  // 渲染带高亮的文字
  const renderTextWithHighlight = (text: string, highlight: {start: number, end: number} | null) => {
    if (!highlight) {
      // 将文字分割成单词，便于点击选择
      const words = text.split(/(\s+)/)
      return (
        <span>
          {words.map((word, index) => (
            <span
              key={index}
              className={word.trim() ? "hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer px-0.5 rounded" : ""}
              onClick={word.trim() ? (e) => handleWordClick(e, text) : undefined}
            >
              {word}
            </span>
          ))}
        </span>
      )
    }

    const before = text.substring(0, highlight.start)
    const selected = text.substring(highlight.start, highlight.end)
    const after = text.substring(highlight.end)

    return (
      <span>
        {before}
        <span className="bg-blue-500 text-white px-1 rounded">{selected}</span>
        {after}
      </span>
    )
  }

  // 改写相关处理函数
  const handleStartRewrite = (index: number) => {
    setRewritingIndex(index)
    setSelectedText('')
    setSelectionStart(0)
    setSelectionEnd(0)
    setSelectionHighlight(null)
    setIsSelecting(false)

    // 添加全局CSS类来禁用选择
    document.body.classList.add('rewrite-mode-active')
  }

  // 自定义选择模式下的超强浏览器行为控制系统
  React.useEffect(() => {
    if (rewritingIndex === null) return

    // 完全禁用浏览器的文字选择功能
    const globalEventBlocker = (event: Event) => {
      const target = event.target as Element

      // 检查是否在自定义选择容器内
      if (target && textContainerRef.current && textContainerRef.current.contains(target)) {
        // 在自定义选择区域内，也要阻止浏览器默认行为
        if (event.type === 'selectstart' || event.type === 'contextmenu') {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          return false
        }
      } else {
        // 在其他区域，完全阻止所有选择相关事件
        if (event.type === 'selectstart' ||
            event.type === 'contextmenu' ||
            event.type === 'copy' ||
            event.type === 'cut' ||
            event.type === 'mousedown' ||
            event.type === 'mouseup') {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          return false
        }
      }
    }

    // 注册全局事件阻止器 - 更激进的阻止
    const eventTypes = ['selectstart', 'contextmenu', 'copy', 'cut', 'mouseup', 'mousedown', 'dragstart', 'drag']
    eventTypes.forEach(eventType => {
      document.addEventListener(eventType, globalEventBlocker, {
        capture: true,
        passive: false
      })
      window.addEventListener(eventType, globalEventBlocker, {
        capture: true,
        passive: false
      })
    })

    // 持续清除浏览器选择
    const clearSelectionInterval = setInterval(() => {
      if (window.getSelection) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          selection.removeAllRanges()
        }
      }
    }, 50)

    // 清理函数
    const cleanup = () => {
      eventTypes.forEach(eventType => {
        document.removeEventListener(eventType, globalEventBlocker, { capture: true })
        window.removeEventListener(eventType, globalEventBlocker, { capture: true })
      })
      clearInterval(clearSelectionInterval)
    }

    return cleanup

    // ESC键处理
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && rewritingIndex !== null) {
        handleCancelRewrite()
        return
      }
    }

    // 键盘事件监听
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false })

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true })

      // 最终清理
      try {
        window.getSelection()?.removeAllRanges()
      } catch {}
    }
  }, [rewritingIndex])



  const handleCancelRewrite = () => {
    setRewritingIndex(null)
    setSelectedText('')
    setSelectionStart(0)
    setSelectionEnd(0)
    setSelectionHighlight(null)
    setIsSelecting(false)

    // 移除全局CSS类
    document.body.classList.remove('rewrite-mode-active')

    // 清除文字选择
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleTextSelection = (index: number) => {
    // 在自定义选择模式下，这个函数不再需要处理浏览器的选择
    // 选择逻辑已经在 handleCustomMouseDown 中处理
    return
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

  const handleConfirmRewrite = async (index: number) => {
    if (!selectedText.trim()) {
      alert('请先选择需要改写的文字')
      return
    }

    if (isRewritingText) return // 防止重复操作

    console.log('改写调试信息:', {
      selectedText,
      selectionStart,
      selectionEnd,
      originalText: results[index]?.generatedSummary
    })

    setIsRewritingText(true)

    try {
      // 调用现有的 onEnhanceContent 函数，传递选中文字信息
      if (onEnhanceContent) {
        await onEnhanceContent(index, 'rewrite', {
          text: selectedText,
          start: selectionStart,
          end: selectionEnd
        })
      }
    } catch (error) {
      console.error('改写失败:', error)
      alert(`改写失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsRewritingText(false)
      handleCancelRewrite()
    }
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
                        <DropdownMenuItem onClick={() => handleEnhance(index, 'proofread')}>
                          <CheckCircle className="h-3 w-3 mr-2" />
                          纠错
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStartRewrite(index)}>
                          <Edit className="h-3 w-3 mr-2" />
                          改写
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
              ) : rewritingIndex === index ? (
                <div className="relative rewrite-mode-container">
                  <div className="mb-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                    💡 请拖拽选择文字或点击单词来选择需要改写的内容 (按ESC键取消)
                  </div>
                  <div
                    ref={textContainerRef}
                    className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed p-2 rounded border-2 border-dashed border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 cursor-text select-none"
                    onMouseDown={(e) => handleCustomMouseDown(e, index)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      return false
                    }}
                    style={{
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                      minHeight: '60px',
                      width: '100%'
                    }}
                  >
                    {renderTextWithHighlight(result.generatedSummary, selectionHighlight)}
                  </div>
                  {selectedText && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-xs">
                      <div className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">已选择文字：</div>
                      <div className="text-yellow-700 dark:text-yellow-300 italic">"{selectedText}"</div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 mt-3">
                    <button
                      onClick={() => handleConfirmRewrite(index)}
                      disabled={!selectedText || isRewritingText}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {isRewritingText ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>改写中...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" />
                          <span>确认改写</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelRewrite}
                      disabled={isRewritingText}
                      className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <X className="h-3 w-3" />
                      <span>取消</span>
                    </button>
                  </div>
                </div>
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
                    {enhancingOperation === 'proofread' && '纠错中...'}
                  </span>
                </div>
              )}
              {rewritingIndex === index && !isRewritingText && (
                <div className="flex items-center space-x-1">
                  <Edit className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">改写模式</span>
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
function EmptyState({ onUpload, onVideoAnalysis }: {
  onUpload: () => void;
  onVideoAnalysis?: (videoUrl: string) => void;
}) {
  const [videoUrl, setVideoUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'video'>('upload')
  const [analysisSteps, setAnalysisSteps] = useState<VideoAnalysisStep[]>([])
  const [analysisError, setAnalysisError] = useState<string>('')

  const handleVideoAnalysis = async () => {
    if (!videoUrl.trim()) {
      setAnalysisError('请输入视频URL')
      return
    }

    if (!VideoAnalyzer.validateVideoUrl(videoUrl)) {
      setAnalysisError('不支持的视频URL格式，请使用YouTube、Bilibili等支持的平台')
      return
    }

    setIsAnalyzing(true)
    setAnalysisError('')
    setAnalysisSteps(createDefaultAnalysisSteps())

    try {
      // 模拟分析步骤进度
      const steps = createDefaultAnalysisSteps()

      // 开始下载
      setAnalysisSteps(updateStepStatus(steps, 'download', 'running', '正在下载视频...'))
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 下载完成，开始提取
      setAnalysisSteps(prev => updateStepStatus(
        updateStepStatus(prev, 'download', 'completed', '音频提取完成'),
        'extract', 'running', '正在进行语音识别...'
      ))
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 提取完成，开始字幕提取
      setAnalysisSteps(prev => updateStepStatus(
        updateStepStatus(prev, 'extract', 'completed', '内容提取完成'),
        'subtitle', 'running', '正在检测和提取字幕内容...'
      ))
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 字幕提取完成，开始AI分析
      setAnalysisSteps(prev => updateStepStatus(
        updateStepStatus(prev, 'subtitle', 'completed', '字幕提取完成'),
        'analyze', 'running', '正在使用AI分析视频内容...'
      ))

      // 调用实际的视频分析
      await onVideoAnalysis?.(videoUrl.trim())

      // 分析完成，开始生成简介
      setAnalysisSteps(prev => updateStepStatus(
        updateStepStatus(prev, 'analyze', 'completed', 'AI分析完成'),
        'generate', 'running', '正在生成分集简介...'
      ))
      await new Promise(resolve => setTimeout(resolve, 500))

      // 全部完成
      setAnalysisSteps(prev => updateStepStatus(prev, 'generate', 'completed', '简介生成完成'))

    } catch (error) {
      console.error('视频分析失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      setAnalysisError(`视频分析失败: ${errorMessage}`)

      // 标记当前步骤为失败
      setAnalysisSteps(prev => {
        const runningStep = prev.find(step => step.status === 'running')
        if (runningStep) {
          return updateStepStatus(prev, runningStep.id, 'failed', errorMessage)
        }
        return prev
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRetryAnalysis = () => {
    setAnalysisError('')
    setAnalysisSteps([])
    handleVideoAnalysis()
  }

  const handleCancelAnalysis = () => {
    setIsAnalyzing(false)
    setAnalysisSteps([])
    setAnalysisError('')
  }

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
        <div className="text-center max-w-3xl mx-auto px-4">
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
          上传字幕文件或输入视频链接，让AI为您生成精彩的分集标题和剧情简介
        </p>

        {/* 选项卡切换 */}
        <div className="mb-6">
          <div className="flex justify-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('upload')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  activeTab === 'upload'
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                )}
              >
                <Upload className="h-4 w-4 inline mr-2" />
                上传字幕文件
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  activeTab === 'video'
                    ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                )}
              >
                <Film className="h-4 w-4 inline mr-2" />
                AI视频分析
              </button>
            </div>
          </div>
        </div>

        {/* 选项卡内容 */}
        {activeTab === 'upload' && (
          <>
            {/* 字幕文件上传说明 */}
            <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <Upload className="h-4 w-4 mr-2 text-blue-500" />
                字幕文件上传
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
          </>
        )}

        {activeTab === 'video' && (
          <>
            {/* 视频分析说明 */}
            <div className="bg-purple-50/50 dark:bg-purple-950/30 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <Film className="h-4 w-4 mr-2 text-purple-500" />
                AI视频分析
              </h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-medium">1.</span>
                  <span>输入YouTube、Bilibili等平台的视频链接</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-medium">2.</span>
                  <span>AI将自动提取音频并进行语音识别分析</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-medium">3.</span>
                  <span>基于音频内容和关键信息生成精彩简介</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-medium">4.</span>
                  <span>支持视频时长：建议30分钟以内</span>
                </div>
              </div>
            </div>

            {/* 视频URL输入 */}
            <div className="mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  视频链接
                </label>
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="请输入视频URL，支持YouTube、Bilibili、Emby等平台..."
                      className={cn(
                        "w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors",
                        videoUrl.trim() && VideoAnalyzer.validateVideoUrl(videoUrl)
                          ? "border-green-300 dark:border-green-600 focus:ring-green-500"
                          : videoUrl.trim()
                            ? "border-red-300 dark:border-red-600 focus:ring-red-500"
                            : "border-gray-300 dark:border-gray-600 focus:ring-purple-500"
                      )}
                      disabled={isAnalyzing}
                    />
                    {/* URL验证状态指示器 */}
                    {videoUrl.trim() && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {VideoAnalyzer.validateVideoUrl(videoUrl) ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleVideoAnalysis}
                    disabled={isAnalyzing || !videoUrl.trim() || !VideoAnalyzer.validateVideoUrl(videoUrl)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>分析中...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        <span>开始分析</span>
                      </>
                    )}
                  </button>
                </div>

                {/* URL格式提示 */}
                {videoUrl.trim() && !VideoAnalyzer.validateVideoUrl(videoUrl) && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center space-x-1">
                    <XCircle className="h-3 w-3" />
                    <span>不支持的URL格式，请检查链接是否正确</span>
                  </div>
                )}

                {/* 支持的平台提示 */}
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <p className="mb-1">支持的视频平台：</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {VideoAnalyzer.getSupportedPlatforms().map((platform, index) => (
                      <span key={index} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                        {platform.name}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    <p>💡 支持媒体服务器直链（需包含API密钥参数）</p>
                    <p>📝 示例：http://server:8096/emby/videos/123/stream.mkv?api_key=xxx</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 视频分析反馈 */}
            <VideoAnalysisFeedback
              isAnalyzing={isAnalyzing}
              steps={analysisSteps}
              error={analysisError}
              onRetry={handleRetryAnalysis}
              onCancel={handleCancelAnalysis}
            />
          </>
        )}

        {/* 主要操作按钮 */}
        {activeTab === 'upload' && (
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
        )}

        {/* 支持的文件格式和拖拽提示 */}
        {activeTab === 'upload' && (
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
        )}

        {activeTab === 'video' && (
          <div className="mt-6 space-y-2">
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
              AI将提取音频内容并进行智能分析，自动生成分集简介
            </div>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
              <div className="flex items-center space-x-1">
                <Film className="h-3 w-3" />
                <span>音频分析</span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center space-x-1">
                <Wand2 className="h-3 w-3" />
                <span>AI生成</span>
              </div>
            </div>
          </div>
        )}
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
  setShouldReopenSettingsDialog,
  apiProvider,
  onApiProviderChange,
  siliconFlowApiKey,
  modelScopeApiKey
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
  apiConfigured: boolean
  onOpenGlobalSettings?: (section: string) => void
  setShouldReopenSettingsDialog?: (value: boolean) => void
  apiProvider: 'siliconflow' | 'modelscope'
  onApiProviderChange: (provider: 'siliconflow' | 'modelscope') => void
  siliconFlowApiKey: string
  modelScopeApiKey: string
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

    // 保存清理后的配置到服务端（不包含model）
    void EpisodeConfigClient.saveConfig(JSON.stringify(configWithoutModel))

    // 检查 onConfigChange 是否为函数
    if (typeof onConfigChange === 'function') {
      onConfigChange(cleanedConfig)
    }

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
          {/* API提供商选择和状态显示 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4 flex-shrink-0 space-y-4">
            {/* API提供商选择 */}
            <div>
              <Label className="text-sm font-medium mb-2 block">API提供商</Label>
              <div className="flex space-x-2">
                <Button
                  variant={apiProvider === 'siliconflow' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onApiProviderChange('siliconflow')}
                  className="flex-1"
                >
                  硅基流动
                </Button>
                <Button
                  variant={apiProvider === 'modelscope' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onApiProviderChange('modelscope')}
                  className="flex-1"
                >
                  魔搭社区
                </Button>
              </div>
            </div>

            {/* API状态显示 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {apiProvider === 'siliconflow' ? '硅基流动' : '魔搭社区'}API:
                </span>
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

            {/* API密钥状态提示 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${siliconFlowApiKey ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-gray-600 dark:text-gray-400">硅基流动</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${modelScopeApiKey ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-gray-600 dark:text-gray-400">魔搭社区</span>
              </div>
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
              <button
                onClick={() => setActiveTab("videoAnalysis")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "videoAnalysis"
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                视频分析设置
              </button>
            </nav>
          </div>

          {/* 标签页内容 - 可滚动区域 */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-2">
            {activeTab === "generation" && (
              <GenerationTab config={config} onConfigChange={onConfigChange} apiProvider={apiProvider} />
            )}
            {activeTab === "titleStyle" && (
              <TitleStyleTab config={config} onConfigChange={onConfigChange} />
            )}
            {activeTab === "summaryStyle" && (
              <SummaryStyleTab config={config} onConfigChange={onConfigChange} />
            )}
            {activeTab === "videoAnalysis" && (
              <VideoAnalysisTab config={config} onConfigChange={onConfigChange} />
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
              {activeTab === "videoAnalysis" && (
                <div className="text-sm">
                  {config.enableVideoAnalysis ? (
                    <span className="text-purple-700 dark:text-purple-300">
                      ✅ 视频分析功能已启用，模型：
                      {(() => {
                        const modelName = config.speechRecognitionModel || 'FunAudioLLM/SenseVoiceSmall';
                        if (modelName.includes('SenseVoiceSmall')) return 'SenseVoice-Small';
                        if (modelName.includes('SenseVoiceLarge')) return 'SenseVoice-Large';
                        if (modelName.includes('CosyVoice-300M-SFT')) return 'CosyVoice-300M-SFT';
                        if (modelName.includes('CosyVoice-300M-Instruct')) return 'CosyVoice-300M-Instruct';
                        if (modelName.includes('CosyVoice-300M')) return 'CosyVoice-300M';
                        if (modelName.includes('SpeechT5')) return 'SpeechT5';
                        return modelName;
                      })()}
                    </span>
                  ) : (
                    <span className="text-gray-500">视频分析功能未启用</span>
                  )}
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
  onConfigChange,
  apiProvider
}: {
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
  apiProvider: 'siliconflow' | 'modelscope'
}) {
  // 根据API提供商选择不同的模型选项
  const siliconFlowModelOptions = [
    { value: "deepseek-ai/DeepSeek-V2.5", label: "DeepSeek-V2.5 (推荐)", description: "高质量中文理解，适合内容生成" },
    { value: "Qwen/Qwen2.5-72B-Instruct", label: "Qwen2.5-72B", description: "强大的推理能力，适合复杂任务" },
    { value: "meta-llama/Meta-Llama-3.1-70B-Instruct", label: "Llama-3.1-70B", description: "平衡性能与效果" },
    { value: "meta-llama/Meta-Llama-3.1-8B-Instruct", label: "Llama-3.1-8B", description: "快速响应，成本较低" },
    { value: "internlm/internlm2_5-7b-chat", label: "InternLM2.5-7B", description: "轻量级模型，适合简单任务" }
  ]

  const modelScopeModelOptions = [
    { value: "Qwen/Qwen3-32B", label: "Qwen3-32B (推荐)", description: "通义千问3代，32B参数，强大推理能力" },
    { value: "ZhipuAI/GLM-4.5", label: "GLM-4.5", description: "智谱AI旗舰模型，专为智能体设计" },
    { value: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B", label: "DeepSeek-R1-Distill-Qwen-32B", description: "DeepSeek R1蒸馏版本，32B参数，高效推理" },
    { value: "Qwen/Qwen2.5-72B-Instruct", label: "Qwen2.5-72B-Instruct", description: "开源版本，72B参数" },
    { value: "Qwen/Qwen2.5-32B-Instruct", label: "Qwen2.5-32B-Instruct", description: "开源版本，32B参数" }
  ]

  const modelOptions = apiProvider === 'siliconflow' ? siliconFlowModelOptions : modelScopeModelOptions

  // 保存模型配置到本地存储
  const handleModelChange = (newModel: string) => {
    // 检查 onConfigChange 是否为函数
    if (typeof onConfigChange !== 'function') {
      console.error('onConfigChange is not a function:', onConfigChange)
      return
    }

    // 更新当前配置
    try {
      onConfigChange({
        ...config,
        model: newModel
      })
    } catch (error) {
      console.error('Error calling onConfigChange:', error)
      return
    }

    // 根据API提供商保存到不同的设置中
    // 保存到服务端配置
    (async () => {
      try {
        const key = apiProvider === 'siliconflow' ? 'siliconflow_api_settings' : 'modelscope_api_settings'
        const existing = await ClientConfigManager.getItem(key)
        const settings = existing ? JSON.parse(existing) : {}
        settings.episodeGenerationModel = newModel
        await ClientConfigManager.setItem(key, JSON.stringify(settings))
        console.log(`模型配置已保存到服务端${apiProvider === 'siliconflow' ? '（硅基流动）' : '（魔搭社区）'}设置:`, newModel)
      } catch (error) {
        console.error('保存模型配置失败:', error)
      }
    })()
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
          <SelectContent className="max-h-[300px] overflow-y-auto">
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
              onValueChange={(value) => {
                if (typeof onConfigChange === 'function' && value[0] !== undefined) {
                  onConfigChange({
                    ...config,
                    summaryLength: [value[0], config.summaryLength[1]]
                  })
                }
              }}
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
              onValueChange={(value) => {
                if (typeof onConfigChange === 'function' && value[0] !== undefined) {
                  onConfigChange({
                    ...config,
                    summaryLength: [config.summaryLength[0], value[0]]
                  })
                }
              }}
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
            onValueChange={(value) => {
              if (typeof onConfigChange === 'function' && value[0] !== undefined) {
                onConfigChange({
                  ...config,
                  temperature: value[0]
                })
              }
            }}
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
            onCheckedChange={(checked) => {
              if (typeof onConfigChange === 'function') {
                onConfigChange({
                  ...config,
                  includeOriginalTitle: !!checked
                })
              }
            }}
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
          onChange={(e) => {
            if (typeof onConfigChange === 'function') {
              onConfigChange({
                ...config,
                customPrompt: e.target.value
              })
            }
          }}
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
    // 检查 onConfigChange 是否为函数
    if (typeof onConfigChange !== 'function') {
      console.error('onConfigChange is not a function:', onConfigChange)
      return
    }

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
    // 检查 onConfigChange 是否为函数
    if (typeof onConfigChange !== 'function') {
      console.error('onConfigChange is not a function:', onConfigChange)
      return
    }

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
                    onCheckedChange={(checked) => {
                      if (typeof onConfigChange === 'function') {
                        onConfigChange({ ...config, includeTitle: !!checked })
                      }
                    }}
                  />
                  <Label htmlFor="includeTitle" className="text-sm">
                    包含标题 (name列)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeOverview"
                    checked={config.includeOverview}
                    onCheckedChange={(checked) => {
                      if (typeof onConfigChange === 'function') {
                        onConfigChange({ ...config, includeOverview: !!checked })
                      }
                    }}
                  />
                  <Label htmlFor="includeOverview" className="text-sm">
                    包含简介 (overview列)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeRuntime"
                    checked={config.includeRuntime}
                    onCheckedChange={(checked) => {
                      if (typeof onConfigChange === 'function') {
                        onConfigChange({ ...config, includeRuntime: !!checked })
                      }
                    }}
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

// 视频分析结果对话框组件
function VideoAnalysisResultDialog({
  open,
  onOpenChange,
  result,
  movieTitle,
  onMovieTitleChange,

  onGenerateEpisode
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: VideoAnalysisResult | null
  movieTitle: string
  onMovieTitleChange: (title: string) => void

  onGenerateEpisode: () => void
}) {
  if (!result) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Film className="h-5 w-5" />
            <span>视频分析结果</span>
          </DialogTitle>
          <DialogDescription>
            AI已完成视频音频分析，您可以查看详细结果
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <Film className="h-4 w-4 mr-2" />
              SRT字幕内容
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              音频转录生成的字幕内容
            </p>
          </div>

          <div className="h-[240px] border rounded-lg bg-gray-50 dark:bg-gray-900 overflow-auto">
            <div className="p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {result.structuredContent.srt || '暂无SRT字幕内容'}
              </pre>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-4 mt-4">
          {/* 关键信息修正区域 */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center">
              <Wand2 className="h-4 w-4 mr-2" />
              AI智能修正
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">
              修正关键信息中的错别字、同音字，同时修正对话内容的语法错误，不会添加原文中没有的信息
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="movieTitle" className="text-sm">
                  片名（用于智能修正）
                </Label>
                <Input
                  id="movieTitle"
                  value={movieTitle}
                  onChange={(e) => onMovieTitleChange(e.target.value)}
                  placeholder="请输入完整的影视作品名称"
                  className="mt-1"
                />
              </div>

            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
            <Button onClick={onGenerateEpisode} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              生成分集简介
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 视频分析设置标签页
function VideoAnalysisTab({
  config,
  onConfigChange
}: {
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
}) {
  return (
    <div className="space-y-6">
      {/* 功能介绍 */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <Film className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
              AI视频分析功能
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
              通过AI技术自动分析视频内容，提取音频进行语音识别，生成高质量的分集简介。
              支持YouTube、Bilibili等主流视频平台。
            </p>
          </div>
        </div>
      </div>

      {/* 功能开关 */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">功能控制</Label>
          <p className="text-xs text-gray-500 mt-1 mb-3">
            启用或关闭AI视频分析功能
          </p>
        </div>

        <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
          <Checkbox
            id="enableVideoAnalysis"
            checked={config.enableVideoAnalysis || false}
            onCheckedChange={(checked) => {
              if (typeof onConfigChange === 'function') {
                onConfigChange({
                  ...config,
                  enableVideoAnalysis: !!checked
                })
              }
            }}
          />
          <div className="flex-1">
            <Label htmlFor="enableVideoAnalysis" className="text-sm font-medium cursor-pointer">
              启用AI视频分析功能
            </Label>
            <p className="text-xs text-gray-500 mt-1">
              开启后可以通过视频URL直接生成分集简介
            </p>
          </div>
        </div>
      </div>

      {/* 语音识别模型配置 */}
      {config.enableVideoAnalysis && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">语音识别模型</Label>
            <p className="text-xs text-gray-500 mt-1 mb-3">
              选择用于语音转文字的AI模型。不同模型在精度、速度和适用场景上有所差异
            </p>
          </div>

          <Select
            value={config.speechRecognitionModel || "FunAudioLLM/SenseVoiceSmall"}
            onValueChange={(value) => {
              if (typeof onConfigChange === 'function') {
                onConfigChange({
                  ...config,
                  speechRecognitionModel: value
                })
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择语音识别模型" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="FunAudioLLM/SenseVoiceSmall">
                <div className="flex flex-col">
                  <span className="font-medium">SenseVoice-Small (推荐)</span>
                  <span className="text-xs text-gray-500">高精度多语言语音识别，支持中英文，速度快</span>
                </div>
              </SelectItem>
              <SelectItem value="FunAudioLLM/SenseVoiceLarge">
                <div className="flex flex-col">
                  <span className="font-medium">SenseVoice-Large</span>
                  <span className="text-xs text-gray-500">更高精度的语音识别，适合复杂音频环境</span>
                </div>
              </SelectItem>
              <SelectItem value="FunAudioLLM/CosyVoice-300M">
                <div className="flex flex-col">
                  <span className="font-medium">CosyVoice-300M</span>
                  <span className="text-xs text-gray-500">轻量级语音识别模型，处理速度极快</span>
                </div>
              </SelectItem>
              <SelectItem value="FunAudioLLM/CosyVoice-300M-SFT">
                <div className="flex flex-col">
                  <span className="font-medium">CosyVoice-300M-SFT</span>
                  <span className="text-xs text-gray-500">经过微调的轻量级模型，平衡速度与精度</span>
                </div>
              </SelectItem>
              <SelectItem value="FunAudioLLM/CosyVoice-300M-Instruct">
                <div className="flex flex-col">
                  <span className="font-medium">CosyVoice-300M-Instruct</span>
                  <span className="text-xs text-gray-500">指令微调模型，适合特定场景语音识别</span>
                </div>
              </SelectItem>
              <SelectItem value="iic/SpeechT5">
                <div className="flex flex-col">
                  <span className="font-medium">SpeechT5</span>
                  <span className="text-xs text-gray-500">通用语音处理模型，支持多种语音任务</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* 模型性能对比 */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-3 flex items-center">
                <span className="mr-2">💡</span>
                模型选择建议
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="font-medium">SenseVoice-Small</span>
                  <span className="text-green-600 dark:text-green-400">推荐首选，平衡精度与速度</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="font-medium">SenseVoice-Large</span>
                  <span className="text-purple-600 dark:text-purple-400">最高精度，适合复杂音频环境</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="font-medium">CosyVoice系列</span>
                  <span className="text-blue-600 dark:text-blue-400">轻量快速，适合简单清晰音频</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="font-medium">SpeechT5</span>
                  <span className="text-gray-600 dark:text-gray-400">通用模型，支持多种语音任务</span>
                </div>
              </div>
            </div>
          </div>

          {/* 支持的视频平台 */}
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="text-xs text-green-800 dark:text-green-200">
              <p className="font-medium mb-2 flex items-center">
                <span className="mr-2">🌐</span>
                支持的视频平台
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>YouTube</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Bilibili</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>腾讯视频</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span>爱奇艺</span>
                </div>
              </div>
            </div>
          </div>

          {/* 使用提示 */}
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-2 flex items-center">
                <span className="mr-2">⚠️</span>
                使用注意事项
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>视频分析功能需要消耗较多API额度，建议合理使用</li>
                <li>音频质量会影响语音识别准确度，建议选择清晰的视频</li>
                <li>长视频处理时间较长，请耐心等待分析完成</li>
                <li>生成的内容仅供参考，请根据实际情况进行调整</li>
              </ul>
            </div>
          </div>

          {/* 快速使用指南 */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-xs text-gray-700 dark:text-gray-300">
              <p className="font-medium mb-3 flex items-center">
                <span className="mr-2">📖</span>
                快速使用指南
              </p>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>在主界面选择"视频分析"选项卡</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>粘贴视频URL（支持YouTube、Bilibili等平台）</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>点击"开始分析"，AI将自动提取音频并进行语音识别</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>查看分析结果，生成精彩的分集简介</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 功能未启用时的提示 */}
      {!config.enableVideoAnalysis && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Film className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">视频分析功能未启用</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            启用后可以通过视频URL直接生成分集简介
          </p>
        </div>
      )}
    </div>
  )
}