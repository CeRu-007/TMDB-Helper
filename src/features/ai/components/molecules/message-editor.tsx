import React, { useRef, useEffect } from 'react'
import { Button } from "@/shared/components/ui/button"
import { AutoResizeTextarea } from "../auto-resize-textarea"

interface MessageEditorProps {
  content: string
  role: 'user' | 'assistant'
  onContentChange: (content: string) => void
  onSave: () => void
  onCancel: () => void
  isSaveDisabled: boolean
}

export function MessageEditor({
  content,
  role,
  onContentChange,
  onSave,
  onCancel,
  isSaveDisabled
}: MessageEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.focus()
      textarea.setSelectionRange(content.length, content.length)
      textarea.scrollTop = textarea.scrollHeight
    }
  }, [content.length])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (!isSaveDisabled) {
        onSave()
      }
    }
  }

  const containerClass = role === 'user'
    ? "relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
    : "relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"

  const textareaStyle = role === 'user'
    ? { minHeight: '80px', maxHeight: '400px' }
    : { minHeight: '120px', maxHeight: 'calc(100vh - 300px)' }

  const saveButtonText = role === 'user' ? '保存并重新生成' : '保存'

  return (
    <div className="w-full space-y-2 animate-in fade-in-50 duration-200">
      <div className={containerClass}>
        <AutoResizeTextarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-gray-900 dark:text-gray-100 resize-none leading-relaxed text-base"
          style={textareaStyle}
        />
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="h-7 px-2 text-xs"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaveDisabled}
              className={role === 'user' ? "h-7 px-3 text-xs bg-blue-500 hover:bg-blue-600 text-white" : "h-7 px-3 text-xs"}
            >
              {saveButtonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
