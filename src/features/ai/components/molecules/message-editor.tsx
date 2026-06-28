import React, { useRef, useEffect } from 'react'
import { Button } from "@/shared/components/ui/button"
import { AutoResizeTextarea } from "../auto-resize-textarea"
import { useTranslation } from "react-i18next"

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
    ? "relative bg-card rounded-2xl shadow-sm border border-border overflow-hidden"
    : "relative bg-card rounded-xl shadow-sm border border-border overflow-hidden"

  const textareaStyle = role === 'user'
    ? { minHeight: '80px', maxHeight: '400px' }
    : { minHeight: '120px', maxHeight: 'calc(100vh - 300px)' }

  const { t } = useTranslation("ai-chat")
  const saveButtonText = role === 'user' ? t("saveAndRegenerate") : t("saveAction")

  return (
    <div className="w-full space-y-2 animate-in fade-in-50 duration-200">
      <div className={containerClass}>
        <AutoResizeTextarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-foreground resize-none leading-relaxed text-base"
          style={textareaStyle}
        />
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 bg-muted/50 border-t border-border">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="h-7 px-2 text-xs"
            >
              {t("cancel", { ns: "common" })}
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
