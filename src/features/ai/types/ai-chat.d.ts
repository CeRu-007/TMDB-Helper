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
}

export interface ChatHistory {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}