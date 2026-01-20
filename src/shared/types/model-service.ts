export type ModelProviderType = 'siliconflow' | 'modelscope' | 'custom'

export interface ModelProvider {
  id: string
  name: string
  type: ModelProviderType
  apiKey: string
  apiBaseUrl: string
  enabled: boolean
  isBuiltIn: boolean
  createdAt: number
  updatedAt: number
}

export interface ModelConfig {
  id: string
  providerId: string
  modelId: string
  displayName: string
  description?: string
  enabled: boolean
  capabilities: string[]
  parameters?: Record<string, any>
  createdAt: number
  updatedAt: number
}

export type UsageScenarioType =
  | 'thumbnail_filter'
  | 'image_analysis'
  | 'speech_to_text'
  | 'episode_generation'
  | 'ai_chat'
  | 'subtitle_ocr'

export interface UsageScenario {
  type: UsageScenarioType
  label: string
  description: string
  selectedModelIds?: string[] // 支持多个模型
  primaryModelId?: string // 主要使用的模型
  requiredCapabilities: string[]
}

export interface ModelServiceConfig {
  providers: ModelProvider[]
  models: ModelConfig[]
  scenarios: UsageScenario[]
  version: string
  lastUpdated: number
}
