import { useState, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

export interface UseAIImprovementProps {
  onSendImprovement: (prompt: string) => Promise<void>
  onClose?: () => void
}

export interface UseAIImprovementReturn {
  inputMessage: string
  setInputMessage: (value: string) => void
  isSending: boolean
  error: string | null
  handleSend: () => Promise<void>
  handleKeyDown: (e: React.KeyboardEvent) => void
  clearError: () => void
}

export function useAIImprovement({ onSendImprovement, onClose }: UseAIImprovementProps): UseAIImprovementReturn {
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = useCallback(async (): Promise<void> => {
    if (!inputMessage.trim() || isSending) {
      return
    }

    setIsSending(true)
    setError(null)

    try {
      onClose?.()
      await onSendImprovement(inputMessage.trim())
      setInputMessage('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发送失败，请重试'
      setError(errorMessage)
      logger.error('AI改进失败:', err)
      throw err
    } finally {
      setIsSending(false)
    }
  }, [inputMessage, isSending, onSendImprovement, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const clearError = useCallback((): void => {
    setError(null)
  }, [])

  return {
    inputMessage,
    setInputMessage,
    isSending,
    error,
    handleSend,
    handleKeyDown,
    clearError
  }
}