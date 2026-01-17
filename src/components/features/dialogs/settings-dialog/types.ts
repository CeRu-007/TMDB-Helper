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
  onConfigChange?: (config: any) => void
}