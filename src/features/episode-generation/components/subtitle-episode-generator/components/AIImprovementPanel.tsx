import React from 'react'
import { X, Wand2, Loader2, Send } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/lib/utils'
import { useAIImprovement } from '../hooks/useAIImprovement'
import { GenerationResult } from '../types'

interface AIImprovementPanelProps {
  result: GenerationResult
  resultIndex: number
  onUpdateResult: (resultIndex: number, updatedResult: Partial<GenerationResult>) => void
  onClose: () => void
  onAIImprovement: (resultIndex: number, prompt: string) => Promise<void>
}

export function AIImprovementPanel({
  result,
  resultIndex,
  onUpdateResult,
  onClose,
  onAIImprovement
}: AIImprovementPanelProps) {
  const {
    inputMessage,
    setInputMessage,
    isSending,
    error,
    handleSend,
    handleKeyDown,
    clearError
  } = useAIImprovement({
    onSendImprovement: async (prompt) => {
      await onAIImprovement(resultIndex, prompt)
    },
    onClose
  })

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value)
    if (error) clearError()
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Wand2 className="h-4 w-4 mr-2 text-blue-500" />
          与AI改进简介
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onClose}
          title="关闭"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="relative">
        <div className="relative bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
          <textarea
            value={inputMessage}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="输入改进建议，例如：剧情不对重新梳理、禁止广告式、无信息套话、评价式结尾、必须以具体情节收尾..."
            disabled={isSending}
            className={cn(
              "min-h-[80px] max-h-[200px] w-full resize-none text-sm pr-12 border-0 bg-transparent rounded-lg py-2 px-3",
              "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            rows={3}
          />
          <Button
            onClick={handleSend}
            disabled={isSending || !inputMessage.trim()}
            className={cn(
              "absolute bottom-2 right-2 h-8 w-8 p-0 rounded-full",
              "bg-blue-500 hover:bg-blue-600 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-sm hover:shadow-md",
              "flex items-center justify-center"
            )}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 flex items-center">
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-medium">Enter</kbd>
          <span className="ml-1">发送</span>
        </div>
      </div>
    </div>
  )
}
