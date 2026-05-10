"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useToast } from "@/lib/hooks/use-toast"
import {
  FileText,
  RefreshCw,
  Download,
  Trash2,
  Search,
  Pause,
  Play,
  ChevronRight,
  File,
  AlertCircle,
  Loader2,
  ArrowDown,
  ArrowUp,
} from "lucide-react"

interface LogFile {
  name: string
  size: number
  lastModified: string
}

interface LogContent {
  file: string
  content: string
  totalLines: number
}

const LEVEL_FILTERS = [
  { label: "全部", value: -1 },
  { label: "DEBUG", value: 0 },
  { label: "INFO", value: 1 },
  { label: "WARN", value: 2 },
  { label: "ERROR", value: 3 },
] as const

const LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR']

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`
}

function matchesLevel(line: string, minLevel: number): boolean {
  if (minLevel < 0) return true
  const match = line.match(/\[(DEBUG|INFO|WARN|ERROR)\]/)
  if (!match) return true
  return LEVEL_NAMES.indexOf(match[1]!) >= minLevel
}

function matchesSearch(line: string, query: string): boolean {
  if (!query) return true
  return line.toLowerCase().includes(query.toLowerCase())
}

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "text-cyan-500",
  INFO: "text-green-500",
  WARN: "text-orange-500",
  ERROR: "text-red-500",
}

function renderLogLine(line: string, index: number) {
  const levelMatch = line.match(/\[(DEBUG|INFO|WARN|ERROR)\]/)
  if (levelMatch && levelMatch.index !== undefined) {
    const beforeLevel = line.slice(0, levelMatch.index)
    const levelTag = levelMatch[0]
    const afterLevel = line.slice(levelMatch.index + levelTag.length)
    const color = LEVEL_COLORS[levelMatch[1]!] || "text-gray-300 dark:text-gray-400"
    return (
      <div key={index} className="leading-relaxed">
        <span className="text-gray-400">{beforeLevel}</span>
        <span className={`font-semibold ${color}`}>{levelTag}</span>
        <span className="text-gray-700 dark:text-gray-300">{afterLevel}</span>
      </div>
    )
  }
  return (
    <div key={index} className="leading-relaxed text-gray-700 dark:text-gray-300">{line}</div>
  )
}

export function LogsViewer() {
  const { toast } = useToast()
  const [files, setFiles] = useState<LogFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [logContent, setLogContent] = useState<LogContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingContent, setLoadingContent] = useState(false)
  const [levelFilter, setLevelFilter] = useState(-1)
  const [searchQuery, setSearchQuery] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [liveLines, setLiveLines] = useState<string[]>([])
  const [error, setError] = useState("")
  const contentEndRef = useRef<HTMLDivElement>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const sseRef = useRef<EventSource | null>(null)
  const initialLoadRef = useRef(true)
  const userScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const disconnectSSE = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }
  }, [])

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/system/logs")
      const json = await res.json()
      if (json.success && json.data?.files) {
        setFiles(json.data.files)
        if (!selectedFile && json.data.files.length > 0) {
          setSelectedFile(json.data.files[0].name)
        }
      }
    } catch {
      setError("无法连接到服务器")
    } finally {
      setLoading(false)
    }
  }, [selectedFile])

  const fetchContent = useCallback(async () => {
    if (!selectedFile) return
    setLoadingContent(true)
    setLiveLines([])
    try {
      const params = new URLSearchParams({ file: selectedFile, tail: "200" })
      if (levelFilter >= 0) params.set("level", String(levelFilter))
      if (searchQuery.trim()) params.set("search", searchQuery.trim())

      const res = await fetch(`/api/system/logs?${params}`)
      const json = await res.json()
      if (json.success && json.data) {
        setLogContent(json.data)
      }
    } catch {
      toast({ title: "错误", description: "加载日志内容失败", variant: "destructive" })
    } finally {
      setLoadingContent(false)
    }
  }, [selectedFile, levelFilter, searchQuery, toast])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    if (selectedFile) {
      fetchContent()
    }
  }, [selectedFile, levelFilter, fetchContent])

  useEffect(() => {
    return () => disconnectSSE()
  }, [disconnectSSE])

  useEffect(() => {
    if (!autoRefresh || !selectedFile) {
      disconnectSSE()
      return
    }

    const es = new EventSource(`/api/system/logs/stream?file=${selectedFile}`)
    sseRef.current = es

    es.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'init' && data.lines) {
          setLiveLines(data.lines)
        } else if (data.type === 'log') {
          const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR']
          const timestamp = data.timestamp ? `[${data.timestamp}]` : ''
          const levelStr = `[${levelNames[data.level] || 'LOG'}]`
          const line = `${timestamp}${levelStr} ${data.message}`
          setLiveLines(prev => [...prev.slice(-500), line])
        }
      } catch {}
    }

    es.onerror = () => {
      es.close()
      sseRef.current = null
    }

    return () => {
      es.close()
      sseRef.current = null
    }
  }, [autoRefresh, selectedFile, disconnectSSE])

useEffect(() => {
    if (!loadingContent && (logContent || liveLines.length > 0)) {
      if (!userScrollingRef.current) {
        setTimeout(() => {
          if (contentEndRef.current) {
            contentEndRef.current.scrollIntoView({ behavior: "auto" })
          }
        }, 100)
      }
    }
  }, [logContent, liveLines, loadingContent])

  useEffect(() => {
    if (autoRefresh && liveLines.length > 0 && !userScrollingRef.current) {
      setTimeout(() => {
        if (contentEndRef.current) {
          contentEndRef.current.scrollIntoView({ behavior: "auto" })
        }
      }, 100)
    }
  }, [liveLines, autoRefresh])

  useEffect(() => {
    const container = logContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      
      if (!isAtBottom) {
        userScrollingRef.current = true
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        scrollTimeoutRef.current = setTimeout(() => {
          userScrollingRef.current = false
        }, 2000)
      } else {
        userScrollingRef.current = false
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => {
      container.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const handleClearLogs = async () => {
    if (!confirm("确定要清除所有日志文件吗？")) return
    try {
      const res = await fetch("/api/system/logs", { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        toast({ title: "成功", description: "日志已清除" })
        setFiles([])
        setSelectedFile("")
        setLogContent(null)
        setLiveLines([])
      }
    } catch {
      toast({ title: "错误", description: "清除日志失败", variant: "destructive" })
    }
  }

  const handleDownload = async () => {
    if (!selectedFile) return
    try {
      const params = new URLSearchParams({ file: selectedFile, tail: "99999" })
      const res = await fetch(`/api/system/logs?${params}`)
      const json = await res.json()
      if (json.success && json.data?.content) {
        const blob = new Blob([json.data.content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = selectedFile
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      toast({ title: "错误", description: "下载日志失败", variant: "destructive" })
    }
  }

  const displayedLines = useMemo(() => {
    const baseLines = logContent?.content ? logContent.content.split('\n') : []
    const allLines = liveLines.length > 0
      ? [...baseLines, ...liveLines]
      : baseLines

    return allLines.filter(l => {
      if (!matchesLevel(l, levelFilter)) return false
      if (!matchesSearch(l, searchQuery)) return false
      return true
    })
  }, [logContent, liveLines, levelFilter, searchQuery])

  const scrollToBottom = useCallback(() => {
    userScrollingRef.current = false
    setTimeout(() => {
      if (contentEndRef.current) {
        contentEndRef.current.scrollIntoView({ behavior: "auto" })
      }
    }, 50)
  }, [])

  const scrollToTop = useCallback(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0
    }
  }, [])

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-500">{error}</p>
        <Button variant="outline" onClick={() => { setError(""); setLoading(true); fetchFiles() }}>
          重试
        </Button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <div className="w-64 border-r bg-gray-50/50 dark:bg-gray-900/50 flex flex-col">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">日志文件</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={fetchFiles}
              title="刷新文件列表"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          {files.length > 0 && (
            <p className="text-xs text-gray-400">{files.length} 个文件</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {files.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                <File className="w-8 h-8" />
                <p className="text-xs">暂无日志</p>
              </div>
            ) : (
              files.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setSelectedFile(f.name)}
                  className={`w-full flex items-start gap-2 p-2.5 rounded-lg text-left transition-colors ${
                    selectedFile === f.name
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <FileText className={`h-4 w-4 mt-0.5 flex-shrink-0 ${selectedFile === f.name ? "text-blue-500" : "text-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{f.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatFileSize(f.size)}
                    </div>
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 mt-1 flex-shrink-0 transition-transform ${
                    selectedFile === f.name ? "rotate-90 text-blue-500" : "text-gray-300"
                  }`} />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-3 border-t dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8"
            onClick={handleClearLogs}
            disabled={files.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            清除所有日志
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 p-3 border-b dark:border-gray-700 bg-white dark:bg-gray-950">
          <div className="flex items-center gap-1">
            {LEVEL_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setLevelFilter(f.value)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  levelFilter === f.value
                    ? f.label === "全部"
                      ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900"
                      : f.label === "DEBUG"
                        ? "bg-cyan-500 text-white"
                        : f.label === "INFO"
                          ? "bg-green-500 text-white"
                          : f.label === "WARN"
                            ? "bg-orange-500 text-white"
                            : "bg-red-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <div className="relative w-48">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="搜索日志..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? "关闭实时推送" : "开启实时推送"}
          >
            {autoRefresh ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => { initialLoadRef.current = true; fetchContent() }}
            title="重新加载"
            disabled={loadingContent || !selectedFile}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingContent ? "animate-spin" : ""}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDownload}
            disabled={!selectedFile || !logContent}
            title="下载日志"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div ref={logContainerRef} className="flex-1 overflow-x-hidden scrollbar-show">
          {!selectedFile ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">请从左侧选择一个日志文件</p>
              </div>
            </div>
          ) : loadingContent ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="p-4 font-mono text-xs whitespace-pre-wrap break-all">
                {displayedLines.length > 0
                    ? displayedLines.map(renderLogLine)
                    : <span className="text-gray-400">日志内容为空</span>}
              </div>
              <div ref={contentEndRef} />
              <div className="sticky bottom-0 px-4 py-1.5 border-t dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-400 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>{selectedFile}</span>
                  {autoRefresh && <span className="text-green-500">● 实时</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={scrollToTop}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title="滚动到顶部"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={scrollToBottom}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title="滚动到底部"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
