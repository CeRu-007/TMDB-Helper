"use client"

import React, { useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"

interface TMDBTableCellEditorProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  autoFocus?: boolean
}

export function TMDBTableCellEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  autoFocus = true,
}: TMDBTableCellEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  
  // 自动聚焦
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [autoFocus])
  
  return (
    <div className="w-full h-full p-0">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-full border-2 border-blue-500 p-1 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSubmit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
        onBlur={onSubmit}
      />
    </div>
  )
} 