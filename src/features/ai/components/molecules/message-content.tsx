import React from 'react'
import { Markdown } from "@/shared/components/ui/markdown"
import { Loader2, Paperclip } from "lucide-react"

interface MessageContentProps {
  content: string
  type?: 'text' | 'file' | 'episode-summary'
  fileName?: string
  isStreaming?: boolean
  isEdited?: boolean
  role: 'user' | 'assistant'
}

export function MessageContent({
  content,
  type,
  fileName,
  isStreaming,
  isEdited,
  role
}: MessageContentProps) {
  if (role === 'user') {
    if (type === 'file') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            <span className="font-medium">{fileName}</span>
          </div>
          <div className="whitespace-pre-wrap break-words">{content}</div>
        </div>
      )
    }

    return (
      <div className="whitespace-pre-wrap break-words">
        {content}
        {isEdited && <span className="text-xs text-blue-200 ml-2">(已编辑)</span>}
      </div>
    )
  }

  // Assistant message
  if (type === 'file') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Paperclip className="w-4 h-4" />
          <span className="font-medium">{fileName}</span>
        </div>
        <div className="break-words text-gray-900 dark:text-gray-100 leading-relaxed">
          <Markdown>{content}</Markdown>
          {isStreaming && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在生成回复...</span>
            </div>
          )}
          {!isStreaming && isEdited && <span className="text-xs text-gray-400 ml-2">(已编辑)</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="break-words text-gray-900 dark:text-gray-100 leading-relaxed">
      <Markdown>{content}</Markdown>
      {isStreaming && (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>正在生成回复...</span>
        </div>
      )}
      {!isStreaming && isEdited && <span className="text-xs text-gray-400 ml-2">(已编辑)</span>}
    </div>
  )
}
