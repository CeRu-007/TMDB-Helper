export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'text' | 'file' | 'episode-summary'
  fileName?: string
  fileContent?: string
  isStreaming?: boolean
  suggestions?: string[]
  rating?: 'like' | 'dislike' | null
  isEdited?: boolean
  originalContent?: string
  canContinue?: boolean
  modelId?: string  // 存储生成此消息时使用的模型ID
}

export interface ChatHistory {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}