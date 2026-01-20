import React from 'react'
import { Button } from "@/shared/components/ui/button"
import { Copy, Edit2, Trash2, RotateCcw, ThumbsUp, ThumbsDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageActionsProps {
  messageId: string
  messageRole: 'user' | 'assistant'
  messageRating?: 'like' | 'dislike' | null
  isLastMessage: boolean
  isLoading: boolean
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
  onRegenerate?: () => void
  onContinue?: () => void
  onRate?: (rating: 'like' | 'dislike' | null) => void
}

export function MessageActions({
  messageRole,
  messageRating,
  isLastMessage,
  isLoading,
  onCopy,
  onEdit,
  onDelete,
  onRegenerate,
  onContinue,
  onRate
}: MessageActionsProps) {
  if (messageRole === 'user') {
    return (
      <div className="flex justify-end gap-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          onClick={onCopy}
          title="复制"
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          onClick={onEdit}
          disabled={isLoading}
          title="编辑"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          onClick={onDelete}
          disabled={isLoading}
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 mt-4 -ml-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        onClick={onCopy}
        title="复制"
      >
        <Copy className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        onClick={onEdit}
        disabled={isLoading}
        title="编辑"
      >
        <Edit2 className="w-4 h-4" />
      </Button>
      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          onClick={onRegenerate}
          disabled={isLoading}
          title="重新生成"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      )}
      {onRate && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0 rounded-lg transition-all",
              messageRating === 'like'
                ? "text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            onClick={() => onRate('like')}
            title="点赞"
          >
            <ThumbsUp className={cn("w-4 h-4", messageRating === 'like' ? "fill-current" : "")} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0 rounded-lg transition-all",
              messageRating === 'dislike'
                ? "text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            onClick={() => onRate('dislike')}
            title="点踩"
          >
            <ThumbsDown className={cn("w-4 h-4", messageRating === 'dislike' ? "fill-current" : "")} />
          </Button>
        </>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        onClick={onDelete}
        disabled={isLoading}
        title="删除"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      {isLastMessage && onContinue && (
        <>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1.5" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center gap-1.5"
            onClick={onContinue}
            disabled={isLoading}
            title="继续生成"
          >
            <span className="text-sm font-medium">继续</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
    </div>
  )
}
