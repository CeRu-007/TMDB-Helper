/**
 * 设置对话框类型定义
 */

export interface TMDBConfig {
  encoding?: string
  logging_level?: string
  save_user_profile?: boolean
  tmdb_username?: string
  tmdb_password?: string
  backdrop_forced_upload?: boolean
  filter_words?: string
}

export interface GeneralSettings {
  autoSave: boolean
  dataBackup: boolean
  cacheCleanup: boolean
  requestTimeout: number
  concurrentRequests: number
  useProxy: boolean
  proxyUrl: string
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  primaryColor: string
  compactMode: boolean
  fontSize: 'small' | 'medium' | 'large'
  showAnimations: boolean
  showTooltips: boolean
  detailBackdropBlurEnabled?: boolean
  detailBackdropBlurIntensity?: 'light' | 'medium' | 'heavy'
}

export interface VideoThumbnailSettings {
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

export interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSection?: string
}

export interface SettingsPanelProps {
  onSave?: () => void
  onConfigChange?: (config: Record<string, unknown>) => void
}

// API配置相关类型
export interface ApiSettings {
  tmdb?: TMDBConfig
  siliconFlow?: {
    apiKey: string
    thumbnailFilterModel: string
  }
  modelScope?: {
    apiKey: string
    episodeGenerationModel: string
  }
}

// 模型服务相关类型
export interface ModelServiceTabState {
  activeTab: 'providers' | 'models' | 'scenarios'
}

export interface ProviderForm {
  name: string
  apiKey: string
  apiBaseUrl: string
}

export interface ConnectionTestResult {
  success: boolean
  message: string
}

export interface ModelForm {
  modelId: string
  displayName: string
  capabilities: string[]
}

export interface ScenarioSettings {
  [key: string]: {
    selectedModelIds: string[]
    primaryModelId: string
    parameters: Record<string, unknown>
  }
}

// 工具设置相关类型
export interface ToolsTabState {
  activeTab: 'management' | 'config' | 'dependencies'
}

// 帮助与支持相关类型
export interface HelpTabState {
  activeTab: 'about' | 'help' | 'feedback'
}

export interface AppInfo {
  name: string
  version: string
  versionInfo: {
    title: string
    description: string
    releaseDate: string
  }
}

// 密码修改相关类型
export interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}