"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/shared/components/ui/tabs"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"
import { useToast } from "@/lib/hooks/use-toast"
import { ClientConfigManager } from "@/lib/utils/client-config-manager"
import { DELAY_1S } from "@/lib/constants/constants"
import axios from "axios"
import path from "path"
import "@/styles/table-fix.css"
import {
  Terminal,
  Download,
  Upload,
  FileText,
  Save,
  RefreshCw,
  Loader2,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Square,
  Trash2,
  Copy
} from "lucide-react"

// 导入现有的集成工具组件
import { NewTMDBTable } from "@/features/media-maintenance/components/new-tmdb-table"
import { parseCsvContent, serializeCsvData, CSVData } from "@/lib/data/csv-processor-client"
import { saveCSV } from "@/lib/data/csv-save-helper"
import { LanguageSelector } from "@/shared/components/ui/language-selector"

interface IndependentMaintenanceProps {
  onShowSettingsDialog?: (section?: string) => void
}

// 支持的平台列表
const SUPPORTED_PLATFORMS = [
  { id: "youku", name: "优酷", domain: "youku.com" },
  { id: "iqiyi", name: "爱奇艺", domain: "iqiyi.com" },
  { id: "qq", name: "腾讯视频", domain: "v.qq.com" },
  { id: "bilibili", name: "哔哩哔哩", domain: "bilibili.com" },
  { id: "mgtv", name: "芒果TV", domain: "mgtv.com" },
  { id: "netflix", name: "Netflix", domain: "netflix.com" },
  { id: "primevideo", name: "Prime Video", domain: "amazon.com" },
  { id: "disneyplus", name: "Disney+", domain: "disneyplus.com" }
]

export function IndependentMaintenance({ onShowSettingsDialog }: IndependentMaintenanceProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"process" | "edit">("process")
  const [platformUrl, setPlatformUrl] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState("")
  const [tmdbId, setTmdbId] = useState("")
  const [selectedSeason, setSelectedSeason] = useState<number>(1)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("zh-CN")
  const [isProcessing, setIsProcessing] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "$ 独立维护模式已启动",
    "$ 等待操作指令..."
  ])
  const [csvData, setCsvData] = useState<CSVData | null>(null)
  const [editorMode, setEditorMode] = useState<"table" | "text">("table")
  const [csvContent, setCsvContent] = useState("")
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null)
  const [isExecutingCommand, setIsExecutingCommand] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 统一获取 TMDB-Import 工具路径：服务端配置为唯一来源
  const getTmdbImportPath = useCallback(async (): Promise<string | null> => {
    try {
      const server = await ClientConfigManager.getItem('tmdb_import_path');
      if (!server || server.trim() === '') return null;
      return server;
    } catch (e) {
      
      return null;
    }
  }, []);

  // 自动滚动终端到底部
  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [terminalOutput, scrollToBottom])

  // 添加终端输出
  const appendTerminalOutput = useCallback((message: string, type: "info" | "success" | "error" | "warning" = "info") => {
    const timestamp = new Date().toLocaleTimeString()
    const prefix = type === "error" ? "❌" : type === "success" ? "✅" : type === "warning" ? "⚠️" : "💡"
    setTerminalOutput(prev => [...prev, `[${timestamp}] ${prefix} ${message}`])
  }, [])

  // 清空终端输出
  const clearTerminal = useCallback(() => {
    setTerminalOutput([
      "$ 独立维护模式已启动",
      "$ 等待操作指令..."
    ])
  }, [])

  // 自动检测平台
  const detectPlatform = useCallback((url: string) => {
    for (const platform of SUPPORTED_PLATFORMS) {
      if (url.includes(platform.domain)) {
        setSelectedPlatform(platform.id)
        return platform.id
      }
    }
    return ""
  }, [])

  // URL输入变化处理
  const handleUrlChange = useCallback((value: string) => {
    setPlatformUrl(value)
    if (value) {
      const detected = detectPlatform(value)
      if (detected) {
        appendTerminalOutput(`检测到平台: ${SUPPORTED_PLATFORMS.find(p => p.id === detected)?.name}`, "info")
      }
    }
  }, [detectPlatform, appendTerminalOutput])

  // 生成播出平台抓取命令
  const generatePlatformCommand = useCallback(() => {
    if (!platformUrl) return ""
    return `python -m tmdb-import "${platformUrl}"`
  }, [platformUrl])

  // 生成TMDB抓取命令
  const generateTMDBCommand = useCallback((season: number) => {
    if (!tmdbId) return ""
    const tmdbUrl = `https://www.themoviedb.org/tv/${tmdbId}/season/${season}?language=${selectedLanguage}`
    return `python -m tmdb-import "${tmdbUrl}"`
  }, [tmdbId, selectedLanguage])

  // 处理季数变化
  const handleSeasonChange = useCallback((newSeasonValue: string | number) => {
    const season = typeof newSeasonValue === "string" ? parseInt(newSeasonValue, 10) : newSeasonValue
    if (!Number.isNaN(season) && season > 0) {
      setSelectedSeason(season)
      appendTerminalOutput(`季数已更新为第${season}季`, "info")
    }
  }, [appendTerminalOutput])

  // 处理语言变化
  const handleLanguageChange = useCallback((languageCode: string) => {
    setSelectedLanguage(languageCode)

    appendTerminalOutput(`语言已更新为 ${languageCode}`, "info")
  }, [appendTerminalOutput])

  // 加载CSV文件 - 复用词条详情页面的实现逻辑
  const handleLoadCsv = useCallback(async () => {
    try {
      setIsProcessing(true)
      appendTerminalOutput("正在加载CSV文件...", "info")

      // 获取TMDB-Import工具路径
      const savedTmdbImportPath = await getTmdbImportPath()
      if (!savedTmdbImportPath) {
        throw new Error("请先在设置中配置TMDB-Import工具路径")
      }

      // 调用CSV读取API
      const response = await axios.post('/api/csv/read', { workingDirectory: savedTmdbImportPath })
      
      if (!response.data.success) {
        throw new Error(response.data.error || '读取CSV文件失败')
      }

      const csvData = response.data.data
      
      // 确保数据格式正确 - 新API返回数组，需要转换为期望的格式
      const formattedCsvData = Array.isArray(csvData) ? { rows: csvData } : csvData
      
      // 设置CSV数据
      setCsvData(formattedCsvData)

      // 生成CSV内容用于显示
      const content = serializeCsvData(csvData)
      setCsvContent(content)

      appendTerminalOutput("CSV文件读取成功", "success")
      toast({
        title: "加载成功",
        description: `CSV文件已加载，共${formattedCsvData.rows?.length || 0}行数据`
      })

    } catch (error: unknown) {

      // 特殊处理404错误（文件不存在）
      if (error instanceof Error && error.message.includes('404')) {
        const errorMessage = '未找到CSV文件。请先运行播出平台抓取命令生成CSV文件。'
        appendTerminalOutput(errorMessage, "error")
        appendTerminalOutput("提示：切换到\"处理\"标签页，使用播出平台抓取和TMDB导入命令。", "info")
        appendTerminalOutput("1. 首先运行播出平台命令获取基本信息", "info")
        appendTerminalOutput("2. 然后运行TMDB命令获取详细元数据", "info")
        appendTerminalOutput("3. 命令执行成功后会自动生成import.csv文件", "info")
        
        toast({
          title: "文件不存在",
          description: errorMessage,
          variant: "destructive"
        })
      } else if (error instanceof Error && error.message.includes('文件不存在')) {
        const errorMessage = '未找到CSV文件。请先运行播出平台抓取命令生成CSV文件。'
        appendTerminalOutput(errorMessage, "error")
        appendTerminalOutput("提示：使用播出平台抓取和TMDB导入功能生成CSV文件。", "info")
        
        toast({
          title: "文件不存在",
          description: errorMessage,
          variant: "destructive"
        })
      } else {
        // 其他错误
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        appendTerminalOutput(`读取CSV文件失败: ${errorMessage}`, "error")
        
        toast({
          title: "加载失败",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }, [getTmdbImportPath, appendTerminalOutput, toast])

  // 执行命令的通用函数
  const executeCommand = useCallback(async (command: string, description: string, workingDirectory?: string) => {
    if (!command.trim()) {
      toast({
        title: "错误",
        description: "命令为空，请检查配置",
        variant: "destructive"
      })
      return
    }

    // 如果没有提供工作目录，使用默认的TMDB-Import路径
    const finalWorkingDirectory = workingDirectory || (await getTmdbImportPath()) || process.cwd()

    setIsExecutingCommand(true)
    setCurrentProcessId(null)
    appendTerminalOutput(`开始执行: ${description}`, "info")
    appendTerminalOutput(`工作目录: ${finalWorkingDirectory}`, "info")
    appendTerminalOutput(`命令: ${command}`, "info")

    try {
      abortControllerRef.current = new AbortController()
      
      const response = await fetch("/api/commands/execute-command-interactive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          command,
          workingDirectory: finalWorkingDirectory,
          timeout: 300000, // 5分钟超时
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder('utf-8')

      if (!reader) {
        throw new Error("无法获取响应流")
      }

      let buffer = ""
      let hasError = false
      let errorText = ""
      let processIdReceived = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              // 保存进程ID以便交互
              if (data.type === "start" && data.processId) {
                setCurrentProcessId(data.processId)
                processIdReceived = true
                appendTerminalOutput(`✅ 进程已启动 (PID: ${data.processId})`, "success")
              }

              appendTerminalOutput(data.message, data.type)

              if (data.type === "stderr" || data.type === "error") {
                errorText += data.message + "\n"
              }

              if (data.type === "close" && data.exitCode !== 0) {
                hasError = true
              }
            } catch (e) {
              
            }
          }
        }
      }

      if (!processIdReceived) {
        appendTerminalOutput("⚠️ 警告: 未收到进程ID，交互功能可能不可用", "warning")
      }

      if (!hasError) {
        appendTerminalOutput(`${description}执行成功`, "success")
        
        // 如果是平台抓取，尝试加载生成的CSV
        if (description.includes("平台抓取")) {
          setTimeout(() => {
            handleLoadCsv()
          }, DELAY_1S)
        }
      }

      return { success: !hasError, errorText }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        appendTerminalOutput("命令执行已取消", "error")
        return { success: false, error: "用户取消" }
      }
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      appendTerminalOutput(`执行错误: ${errorMessage}`, "error")
      toast({
        title: "执行失败",
        description: errorMessage,
        variant: "destructive"
      })
      return { success: false, error: errorMessage }
    } finally {
      setIsExecutingCommand(false)
      abortControllerRef.current = null
    }
  }, [appendTerminalOutput, toast, handleLoadCsv])

  // 执行平台抓取
  const handlePlatformExtraction = useCallback(async () => {
    const command = generatePlatformCommand()
    if (!command) {
      toast({
        title: "错误",
        description: "请输入有效的播出平台URL",
        variant: "destructive"
      })
      return
    }

    // 检查TMDB-Import工具路径
    const savedTmdbImportPath = await getTmdbImportPath()
    if (!savedTmdbImportPath) {
      toast({
        title: "错误",
        description: "请先在设置中配置TMDB-Import工具路径",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    appendTerminalOutput(`切换到工作目录: ${savedTmdbImportPath}`, "info")
    await executeCommand(command, "播出平台抓取", savedTmdbImportPath)
    setIsProcessing(false)
  }, [generatePlatformCommand, executeCommand, toast, appendTerminalOutput])

  // 执行TMDB导入
  const handleTmdbImport = useCallback(async () => {
    const command = generateTMDBCommand(selectedSeason)
    if (!command) {
      toast({
        title: "错误",
        description: "请输入有效的TMDB ID",
        variant: "destructive"
      })
      return
    }

    // 检查TMDB-Import工具路径
    const savedTmdbImportPath = await getTmdbImportPath()
    if (!savedTmdbImportPath) {
      toast({
        title: "错误",
        description: "请先在设置中配置TMDB-Import工具路径",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    appendTerminalOutput(`切换到工作目录: ${savedTmdbImportPath}`, "info")
    await executeCommand(command, "TMDB导入", savedTmdbImportPath)
    setIsProcessing(false)
  }, [generateTMDBCommand, selectedSeason, executeCommand, toast, appendTerminalOutput])

  // 发送快速命令
  const sendQuickCommand = useCallback(async (input: string) => {
    if (!currentProcessId) {
      toast({
        title: "错误",
        description: "没有活动的进程",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/commands/send-input", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          processId: currentProcessId,
          input: input + "\n"
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      appendTerminalOutput(`> ${input}`, "info")
    } catch (error) {
      
      appendTerminalOutput(`发送输入失败: ${error instanceof Error ? error.message : "未知错误"}`, "error")
    }
  }, [currentProcessId, appendTerminalOutput, toast])

  // 停止命令执行
  const stopCommandExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      appendTerminalOutput("正在取消命令执行...", "warning")
    }
  }, [appendTerminalOutput])

  // 保存CSV文件 - 使用统一的保存函数
  const handleSaveCsv = useCallback(async () => {
    const success = await saveCSV({
      csvData,
      csvContent,
      editorMode,
      tmdbImportPath: await getTmdbImportPath(),
      appendTerminalOutput,
      toast,
      showSuccessNotification: true
    })
  }, [csvData, csvContent, editorMode, getTmdbImportPath, appendTerminalOutput, toast])

  return (
    <div className="h-full independent-maintenance">
      <div className="h-full flex flex-row">
        {/* 左侧区域 - 根据标签页显示不同内容 */}
        <div className="flex-1 bg-gray-900 dark:bg-gray-950 overflow-hidden min-w-0">
          <div className="h-full flex flex-col">
            {/* 左侧头部 */}
            <div className="bg-gray-800 dark:bg-gray-900 px-4 py-2 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-gray-300 text-xs">
                    {activeTab === "process" ? "终端输出" : "CSV编辑器"}
                  </span>
                </div>

                {activeTab === "edit" && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditorMode(editorMode === "table" ? "text" : "table")}
                      className="text-gray-300 hover:text-white text-xs"
                    >
                      {editorMode === "table" ? "文本模式" : "表格模式"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 左侧内容区域 */}
            <div className="flex-1 overflow-hidden">
              {activeTab === "process" ? (
                // 终端输出模式
                <div
                  ref={terminalRef}
                  className="h-full p-4 overflow-y-auto text-green-400 font-mono text-sm"
                >
                  {terminalOutput.map((line, index) => (
                    <div key={index} className="mb-1">
                      {line}
                    </div>
                  ))}
                  <div className="mt-2">
                    <span className="animate-pulse">█</span>
                  </div>
                </div>
              ) : (
                // CSV编辑器模式
                <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
                  {csvData ? (
                    editorMode === "table" ? (
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <NewTMDBTable
                          data={csvData}
                          onChange={setCsvData}
                          className="h-full w-full"
                          height="100%"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 p-4">
                        <textarea
                          value={csvContent}
                          onChange={(e) => {
                            setCsvContent(e.target.value)
                            try {
                              const parsed = parseCsvContent(e.target.value)
                              setCsvData(parsed)
                            } catch (error) {

                            }
                          }}
                          className="w-full h-full font-mono text-sm resize-none focus:outline-none bg-transparent"
                          placeholder="CSV内容..."
                        />
                      </div>
                    )
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>暂无CSV数据</p>
                        <p className="text-sm mt-1">请先执行平台抓取或加载文件</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧操作面板 */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
        {/* 操作面板头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            独立维护
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            维护已完结但未跟踪的连载影视
          </p>
        </div>

        {/* 标签导航 */}
        <div className="px-3 lg:px-4 pt-3 lg:pt-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "process" | "edit")}>
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="process" className="flex items-center space-x-2 text-sm">
                <Terminal className="h-4 w-4" />
                <span>处理</span>
              </TabsTrigger>
              <TabsTrigger value="edit" className="flex items-center space-x-2 text-sm">
                <FileText className="h-4 w-4" />
                <span>编辑</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="process" className="mt-3 lg:mt-4 space-y-3 lg:space-y-4">
              {/* 命令显示区域 */}
              <div className="bg-gray-900 text-green-400 p-2 lg:p-3 rounded-md font-mono text-xs overflow-hidden">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 w-0 truncate text-xs">{generatePlatformCommand() || `python -m tmdb-import "${platformUrl || '请输入播出平台URL'}"`}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 ml-2 flex-shrink-0"
                      onClick={() => {
                        const cmd = generatePlatformCommand()
                        if (cmd) {
                          navigator.clipboard.writeText(cmd)
                          toast({ title: "已复制", description: "播出平台命令已复制到剪贴板" })
                        }
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 w-0 truncate text-xs">{generateTMDBCommand(selectedSeason) || `python -m tmdb-import "https://www.themoviedb.org/tv/${tmdbId || 'TMDB_ID'}/season/${selectedSeason}?language=zh-CN"`}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 ml-2 flex-shrink-0"
                      onClick={() => {
                        const cmd = generateTMDBCommand(selectedSeason)
                        if (cmd) {
                          navigator.clipboard.writeText(cmd)
                          toast({ title: "已复制", description: "TMDB命令已复制到剪贴板" })
                        }
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 配置区域 */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="platform-url" className="text-xs font-medium">
                    播出平台URL
                  </Label>
                  <Input
                    id="platform-url"
                    type="url"
                    placeholder="https://example.com/show-page"
                    value={platformUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="mt-1 h-8 text-xs"
                    autoComplete="off"
                    data-form-type="other"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tmdb-id" className="text-xs font-medium">
                      TMDB ID
                    </Label>
                    <Input
                      id="tmdb-id"
                      type="text"
                      placeholder="例: 290854"
                      value={tmdbId}
                      onChange={(e) => setTmdbId(e.target.value)}
                      className="mt-1 h-8 text-xs"
                      autoComplete="off"
                      data-form-type="other"
                    />
                  </div>
                  <div>
                    <Label htmlFor="season-select" className="text-xs font-medium">
                      TMDB季数
                    </Label>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className="text-xs">第</span>
                      <Input
                        id="season-select"
                        type="number"
                        min="1"
                        max="20"
                        value={selectedSeason}
                        onChange={(e) => handleSeasonChange(e.target.value)}
                        className="w-12 h-8 text-xs"
                      />
                      <span className="text-xs">季</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">
                      语言
                    </Label>
                    <div className="flex items-center mt-1">
                      <LanguageSelector
                        value={selectedLanguage}
                        onChange={handleLanguageChange}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                {selectedPlatform && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {SUPPORTED_PLATFORMS.find(p => p.id === selectedPlatform)?.name}
                    </Badge>
                  </div>
                )}

                {/* 操作按钮组 */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handlePlatformExtraction}
                    disabled={!platformUrl.trim() || isProcessing || isExecutingCommand}
                    className="bg-green-600 hover:bg-green-700 h-9 text-xs"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-1" />
                    )}
                    播出平台抓取
                  </Button>

                  <Button
                    onClick={handleTmdbImport}
                    disabled={!tmdbId.trim() || isProcessing || isExecutingCommand}
                    className="bg-blue-600 hover:bg-blue-700 h-9 text-xs"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    执行TMDB导入
                  </Button>
                </div>

                {/* 加载CSV按钮 */}
                <Button
                  onClick={handleLoadCsv}
                  variant="outline"
                  className="w-full h-8 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  加载CSV文件
                </Button>
              </div>

              {/* 交互按钮区域 */}
              {isExecutingCommand && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs flex items-center">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      <span className="text-blue-600 dark:text-blue-400">
                        正在执行命令...
                        {currentProcessId && (
                          <span className="text-green-600 dark:text-green-400 ml-1">
                            (PID: {currentProcessId})
                          </span>
                        )}
                      </span>
                    </div>
                    <Button
                      onClick={stopCommandExecution}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs flex-shrink-0"
                    >
                      <Square className="h-3 w-3 mr-1" />
                      停止
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      onClick={() => sendQuickCommand("y")}
                      disabled={!currentProcessId}
                      className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      确认(Y)
                    </Button>
                    <Button
                      onClick={() => sendQuickCommand("n")}
                      disabled={!currentProcessId}
                      className="bg-red-600 hover:bg-red-700 h-7 text-xs"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      取消(N)
                    </Button>
                    <Button
                      onClick={() => sendQuickCommand("w")}
                      disabled={!currentProcessId}
                      className="bg-yellow-600 hover:bg-yellow-700 h-7 text-xs"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      等待(W)
                    </Button>
                  </div>
                </div>
              )}

              {/* 终端控制 */}
              <div className="pt-3 lg:pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2">
                  <Button
                    onClick={clearTerminal}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    清空
                  </Button>
                  <Button
                    onClick={() => {
                      const content = terminalOutput.join('\n')
                      navigator.clipboard.writeText(content)
                      toast({ title: "已复制", description: "终端输出已复制到剪贴板" })
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    复制
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="edit" className="mt-3 lg:mt-4 space-y-3 lg:space-y-4">
              {/* 文件操作 */}
              <div className="space-y-2">
                <Button
                  onClick={handleLoadCsv}
                  variant="outline"
                  className="w-full h-auto text-xs"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  加载CSV文件
                </Button>

                <Button
                  onClick={handleSaveCsv}
                  disabled={!csvData}
                  className="w-full h-auto text-xs hover:bg-primary/90 active:bg-primary/80 transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  保存CSV文件
                </Button>
              </div>

              {/* 编辑器状态 */}
              {csvData && (
                <div className="pt-3 lg:pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>行数: {csvData.length}</p>
                    <p>模式: {editorMode === "table" ? "表格编辑" : "文本编辑"}</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* 底部状态信息 */}
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>状态: {isProcessing ? "处理中..." : "就绪"}</p>
            <p>模式: 独立维护</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}