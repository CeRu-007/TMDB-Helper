import React, { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface TerminalInputProps {
  onSubmit: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function TerminalInput({
  onSubmit,
  className,
  placeholder = "输入命令...",
  disabled = false,
}: TerminalInputProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    onSubmit(value)
    setValue("")
  }

  const handleKeyInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 对于 y/n/w 输入，直接提交
    if (e.key.toLowerCase() === "y" || e.key.toLowerCase() === "n" || e.key.toLowerCase() === "w") {
      e.preventDefault()
      onSubmit(e.key.toLowerCase())
      setValue("")
      return
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyInput}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "w-full bg-transparent px-3 py-2",
          "text-sm font-mono",
          "border border-input rounded-md",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        autoComplete="off"
        spellCheck="false"
      />
    </form>
  )
} 