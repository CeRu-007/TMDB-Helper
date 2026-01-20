import React, { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  ChevronRight,
  Copy,
  Settings,
  X,
  Minimize2,
  Maximize2,
  Terminal as TerminalIcon,
  Plus,
  Type,
  AlignLeft,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu"

interface TerminalProps {
  processId: number | null
  disabled?: boolean
  onSend?: (input: string) => void
  onClear?: () => void
  className?: string
  title?: string
  output: string
  placeholder?: string
  showToolbar?: boolean
  onMinimize?: () => void
  onMaximize?: () => void
  onClose?: () => void
  fontSize?: "sm" | "base" | "lg"
  theme?: "dark" | "light" | "system"
}

export function Terminal({
  processId,
  disabled = false,
  onSend,
  onClear,
  className,
  title = "Terminal",
  output,
  placeholder = "输入命令...",
  showToolbar = true,
  onMinimize,
  onMaximize,
  onClose,
  fontSize = "sm",
  theme = "dark",
}: TerminalProps) {
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isSending, setIsSending] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const [fontSizeClass, setFontSizeClass] = useState(
    fontSize === "sm" ? "text-sm" : fontSize === "lg" ? "text-lg" : "text-base"
  )

  // 自动滚动到底部
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  // 处理命令历史
  const addToHistory = (cmd: string) => {
    if (cmd.trim()) {
      setHistory(prev => [...prev, cmd])
      setHistoryIndex(-1)
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!input.trim() && input !== "") return

      setIsSending(true)
      onSend?.(input)
      addToHistory(input)
      setInput("")
      setTimeout(() => setIsSending(false), 300)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex = historyIndex + 1
        if (newIndex < history.length) {
          setHistoryIndex(newIndex)
          setInput(history[history.length - 1 - newIndex])
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(history[history.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput("")
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault()
      onClear?.()
    }
  }

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  // 复制到剪贴板
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output)
    } catch (err) {
      
    }
  }

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    onMaximize?.()
  }

  // 聚焦输入框
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-background shadow-sm",
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "relative",
        className
      )}
      onClick={() => inputRef.current?.focus()} // 点击终端区域时聚焦输入框
    >
      {showToolbar && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-4 w-4" />
            <span className="font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFontSizeClass("text-sm")}>
                  <Type className="mr-2 h-4 w-4" />
                  小号字体
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFontSizeClass("text-base")}>
                  <Type className="mr-2 h-4 w-4" />
                  中号字体
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFontSizeClass("text-lg")}>
                  <Type className="mr-2 h-4 w-4" />
                  大号字体
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={copyToClipboard}>
                  <Copy className="mr-2 h-4 w-4" />
                  复制输出
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onClear}>
                  <AlignLeft className="mr-2 h-4 w-4" />
                  清空终端
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMinimize}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <ScrollArea
        className={cn(
          "flex-1 p-4 font-mono",
          fontSizeClass,
          theme === "dark" ? "bg-zinc-900 text-zinc-50" : "bg-white text-zinc-900"
        )}
      >
        <div ref={outputRef} className="whitespace-pre-wrap break-all">
          {output}
        </div>
      </ScrollArea>
      <div className={cn("p-4", theme === "dark" ? "bg-zinc-900" : "bg-white")}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSend?.("y")
                setInput("")
              }}
            >
              Yes (Y)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSend?.("n")
                setInput("")
              }}
            >
              No (N)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSend?.("w")
                setInput("")
              }}
            >
              Overwrite (W)
            </Button>
          </div>
          <form 
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (input.trim()) {
                onSend?.(input)
                setInput("")
              }
            }}
          >
            <div className="flex items-center gap-1 text-muted-foreground">
              <ChevronRight className="h-4 w-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                "w-full bg-transparent border-0 outline-none p-0",
                "focus:outline-none focus:ring-0",
                fontSizeClass,
                theme === "dark" ? "text-zinc-50" : "text-zinc-900",
                "font-mono",
                "placeholder:text-muted-foreground"
              )}
              autoComplete="off"
              spellCheck="false"
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="终端输入"
            />
            {isSending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </form>
        </div>
      </div>
    </div>
  )
} 