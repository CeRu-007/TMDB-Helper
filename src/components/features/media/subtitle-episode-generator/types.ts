// 生成状态类型
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed'

// 操作类型定义
export type EnhanceOperation = 'polish' | 'shorten' | 'expand' | 'proofread' | 'rewrite'

// 字幕文件类型
export interface SubtitleFile {
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

export interface SubtitleEpisode {
  episodeNumber: number
  title?: string
  content: string
  duration?: string
  wordCount: number
  lastTimestamp?: string // 最后一个时间戳，用于计算运行时间
}

// 生成结果
export interface GenerationResult {
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
  originalContent?: string // 原始内容，用于某些特殊情况
}

// 生成配置
export interface GenerationConfig {
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
  // 模仿风格配置
  imitateConfig?: {
    sampleContent: string // 需要模仿的样本内容
    generateCount: number // 生成数量
  }
}

// 导出配置
export interface ExportConfig {
  includeTitle: boolean
  includeOverview: boolean
  includeRuntime: boolean
}

// 风格配置类型
export interface StyleOption {
  id: string
  name: string
  description: string
  icon: string
  isExclusive?: boolean // 是否为互斥风格（如模仿风格）
}

// 视频分析相关类型（从 VideoAnalysisFeedback 组件导入）
export interface VideoAnalysisStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  description?: string
  error?: string
}

export interface VideoAnalysisResult {
  videoInfo: {
    title: string
    duration: number
    platform: string
    url: string
  }
  audioAnalysis: {
    segments: Array<{
      start: number
      end: number
      text: string
      confidence?: number
    }>
    language: string
    totalWords: number
  }
  structuredContent: {
    srt: string
    markdown?: string
    text?: string
  }
  metadata: {
    analysisTime: number
    modelUsed: string
    confidence: number
  }
}

// 组件 Props 类型定义
export interface FileListProps {
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
}

export interface WorkAreaProps {
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
}

export interface ResultsDisplayProps {
  results: GenerationResult[]
  onUpdateResult?: (index: number, updatedResult: Partial<GenerationResult>) => void
  onMoveToTop?: (index: number) => void
  onEnhanceContent?: (index: number, operation: EnhanceOperation, selectedTextInfo?: {text: string, start: number, end: number}) => void
  isInsufficientBalanceError?: (error: any) => boolean
  setShowInsufficientBalanceDialog?: (show: boolean) => void
}

export interface EmptyStateProps {
  onUpload: () => void
  onVideoAnalysis?: (videoUrl: string) => void;
}

export interface GenerationSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
  onOpenGlobalSettings?: (section: string) => void
  setShouldReopenSettingsDialog?: (value: boolean) => void
  scenarioModels: any // 使用场景模型配置的返回类型
}

export interface ExportConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ExportConfig
  onConfigChange: (config: ExportConfig) => void
  onExport: () => Promise<{ success: boolean }>
}

export interface VideoAnalysisResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: VideoAnalysisResult | null
  movieTitle: string
  onMovieTitleChange: (title: string) => void
  onGenerateEpisode: () => void
}

export interface FileNameDisplayProps {
  fileName: string
  maxLength?: number
  className?: string
}