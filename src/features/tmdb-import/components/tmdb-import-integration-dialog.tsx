"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/shared/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/shared/components/ui/tabs"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/shared/components/ui/card"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"
import { useToast } from "@/shared/components/ui/use-toast"
import {
  CheckCircle2,
  XCircle,
  Terminal,
  Copy,
  Download,
  FileText,
  Loader2,
  Zap,
  RefreshCw,
  Send,
  Table as TableIcon,
  Minimize2,
  Maximize2,
  Activity as ActivityIcon,
  Square,
  CircleDashed,
  Eraser
} from "lucide-react"
import path from "path"
import { logger } from '@/lib/utils/logger'
import { useTranslation } from "react-i18next"

// 导入新版表格组件
import { NewTMDBTable } from "@/features/media-maintenance/components/new-tmdb-table"
import { TMDBItem } from "@/lib/data/storage"
import { LanguageSelector } from "@/shared/components/ui/language-selector"
import { parseCsvContent, serializeCsvData, CSVData, cleanCsvNewlines } from "@/lib/data/csv-processor-client"
import { saveCSV, handleSaveError } from "@/lib/data/csv-save-helper"
import { validateCsvData, fixCsvData } from "@/lib/data/csv-validator"
import FixTMDBImportBugDialog from "./fix-tmdb-import-bug-dialog"
import axios from "axios"
import { ClientConfigManager } from "@/lib/utils/client-config-manager"

// 定义显式空值标记常量
export const EXPLICIT_EMPTY_VALUE = "__EMPTY__"

interface TMDBImportIntegrationDialogProps {
  item: TMDBItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemUpdate?: (item: TMDBItem) => void
  inTab?: boolean // 是否在标签页中显示
}


export default function TMDBImportIntegrationDialog({ item, open, onOpenChange, onItemUpdate, inTab = false }: TMDBImportIntegrationDialogProps) {
  const { t } = useTranslation('media')
  const [selectedSeason, setSelectedSeason] = useState<number>(1)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("zh-CN")
  // 从服务端配置读取上次选择的季数
  useEffect(() => {
    (async () => {
      try {
        const key = `tmdb_season_${item.id}`
        const savedSeason = await ClientConfigManager.getItem(key)
        if (savedSeason) {
          const parsed = parseInt(savedSeason, 10)
          if (!Number.isNaN(parsed) && parsed > 0) setSelectedSeason(parsed)
        }
      } catch (e) {

      }
    })()
  }, [item.id])
  // Python 命令（优先服务端配置）
  const [pythonCmd, setPythonCmd] = useState<string>(() => (process.platform === "win32" ? "python" : "python3"))
  useEffect(() => {
    (async () => {
      const v = await ClientConfigManager.getItem('python_command')
      if (v && v.trim()) setPythonCmd(v)
    })()
  }, [])

  const [activeTab, setActiveTab] = useState<string>("process") // 默认显示处理标签
  const [csvData, setCsvData] = useState<CSVData | null>(null)
  const [csvContent, setCsvContent] = useState<string>("")
  const [terminalOutput, setTerminalOutput] = useState("")
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const [platformUrl, setPlatformUrl] = useState(item.platformUrl || "")
  const [isExecutingCommand, setIsExecutingCommand] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [terminalInput, setTerminalInput] = useState("")
  const [currentProcessId, setCurrentProcessId] = useState<number | null>(null)
  const [showFixBugDialog, setShowFixBugDialog] = useState(false)
  const [editorMode, setEditorMode] = useState<"table" | "text">("table")
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // 用于跟踪行数变化的ref
  const prevLineCountRef = useRef<number>(0)
  // 服务端路径状态（仅用于显示/按钮启用判断）
  const [tmdbPathState, setTmdbPathState] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      const p = await getTmdbImportPath()
      setTmdbPathState(p)
    })()
  }, [open])

  // TMDB-Import 运行模式：前台模式（GUI）或后台模式（无头）
  const [headlessMode, setHeadlessMode] = useState<boolean>(false)

  // 添加操作锁，防止按钮互相触发
  const [operationLock, setOperationLock] = useState<string | null>(null)


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

  
  
  
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  
  // 当item变化时，更新platformUrl
  useEffect(() => {
    if (item && item.platformUrl) {
      setPlatformUrl(item.platformUrl)
    }
  }, [item])

  // 生成播出平台抓取命令
  const generatePlatformCommand = () => {
    if (!platformUrl) return ""
    return `python -m tmdb-import ${headlessMode ? '--headless' : ''} "${platformUrl}"`
  }

  // 生成TMDB抓取命令
  const generateTMDBCommand = (season: number) => {
    if (!item || !item.tmdbId || item.mediaType !== "tv") return ""

    // 确定Python命令：优先使用服务端配置，否则根据平台选择默认命令
    let python = pythonCmd && pythonCmd.trim() ? pythonCmd : (process.platform === "win32" ? "python" : "python3");

    // 确保URL格式正确，移除多余的引号
    const tmdbUrl = `https://www.themoviedb.org/tv/${item.tmdbId}/season/${season}?language=${selectedLanguage}`

    // 返回完整的命令字符串，根据 headlessMode 决定是否添加 --headless 标志
    return `${python} -m tmdb-import ${headlessMode ? '--headless' : ''} "${tmdbUrl}"`
  }
  
    
    
  
    // 发送终端输入
  const sendTerminalInput = async () => {
    if (!terminalInput.trim() || !currentProcessId) return

    try {
      const response = await fetch("/api/commands/send-input", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          processId: currentProcessId,
          input: terminalInput,
        }),
      })

      if (response.ok) {
        appendTerminalOutput(`> ${terminalInput}`, "info")
        setTerminalInput("")
      } else {
        appendTerminalOutput(t('tmdbIntegration.sendInputFailed'), "error")
      }
    } catch (error) {
      appendTerminalOutput(t('tmdbIntegration.sendInputError'), "error")
    }
  }

  // 检查进程是否存在且活跃
  const checkProcessExists = async (processId: number | string | null): Promise<boolean> => {
    if (!processId) return false;

    // 确保processId是数字类型
    const pid = typeof processId === 'string' ? parseInt(processId, 10) : processId;

    try {
      // 调用API获取活跃进程列表
      const response = await fetch("/api/system/get-active-processes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (!response.ok) {
        
        return false;
      }

      const data = await response.json();

      if (!data.success) {
        
        return false;
      }

      // 检查processId是否在活跃进程列表中
      const isActive = data.processes.includes(pid);
      
      return isActive;
    } catch (error) {
      
      return false;
    }
  };

  // 发送快捷命令
  const sendQuickCommand = async (command: string) => {
    if (!currentProcessId) {
      appendTerminalOutput(`⚠️ ${t('tmdbIntegration.cannotSendNoProcess')}`, "warning");
      return false;
    }

    // 先验证进程是否存在
    const processExists = await checkProcessExists(currentProcessId);
    if (!processExists) {
      appendTerminalOutput(`⚠️ ${t('tmdbIntegration.processNotExist', { processId: currentProcessId })}`, "warning");
      return false;
    }

    try {
      appendTerminalOutput(`> ${t('tmdbIntegration.sendingCommand')}: ${command === "\n" ? t('tmdbIntegration.enterKey') : command}`, "info");

      // 添加重试逻辑
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          const response = await fetch("/api/commands/send-input", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              processId: currentProcessId,
              input: command,
              sendDirectly: true // 确保直接发送带回车
            }),
            // 设置较短的超时时间以便快速重试
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            success = true;
            appendTerminalOutput(`✓ ${t('tmdbIntegration.commandSent')}`, "success");
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP错误: ${response.status}`);
          }
        } catch (error) {
          retryCount++;
          if (retryCount < maxRetries) {
            appendTerminalOutput(`⚠️ ${t('tmdbIntegration.sendingFailedRetry', { retryCount, maxRetries })}`, "warning");
            // 等待一段时间再重试
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }
      return success;
    } catch (error) {
      appendTerminalOutput(`❌ ${t('tmdbIntegration.commandSendFailed')}: ${error instanceof Error ? error.message : t('tmdbIntegration.unknownError')}`, "error");

      // 显示帮助信息
      appendTerminalOutput(t('tmdbIntegration.tipRetry'), "info");
      return false;
    }
  };

  // 更新executeCommandWithStream函数
  const executeCommandWithStream = async (command: string, workingDirectory: string) => {
    setIsExecutingCommand(true)
    setCurrentProcessId(null)
        abortControllerRef.current = new AbortController()

    try {
      const response = await fetch("/api/commands/execute-command-interactive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command,
          workingDirectory,
          timeout: 300000, // 5分钟默认超时
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder('utf-8')

      if (!reader) {
        throw new Error(t('tmdbIntegration.cannotGetResponseStream'))
      }

      let buffer = ""
      let hasError = false
      let errorText = ""
      let stdoutText = ""
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
                appendTerminalOutput(`${t('tmdbIntegration.processStarted', { processId: data.processId })}`, "success")
              }

              appendTerminalOutput(data.message, data.type)

              // 收集输出信息 - 确保同时收集stdout和stderr
              if (data.type === "stdout") {
                stdoutText += data.message + "\n";
              }
              if (data.type === "stderr" || data.type === "error") {
                errorText += data.message + "\n"
              }

              // 特殊处理Edge浏览器会话创建失败的错误
              if (data.message && typeof data.message === 'string' &&
                  (data.message.includes("SessionNotCreatedException") ||
                   data.message.includes("user data directory is already in use"))) {
                appendTerminalOutput(t('tmdbIntegration.edgeBrowserSessionFailed'), "warning")
                hasError = true
              }

              // 处理进程关闭事件
              if (data.type === "close") {
                // 如果状态是terminated，表示进程被用户主动终止，不视为错误
                if (data.status === "terminated") {
                  hasError = false
                } else if (data.exitCode !== 0) {
                  hasError = true
                }
              }
            } catch (e) {
              // 忽略解析错误
              
            }
          }
        }
      }

      // 如果没有收到进程ID，显示警告
      if (!processIdReceived) {
        appendTerminalOutput(t('tmdbIntegration.noProcessIdReceived'), "warning")
      }

      // 记录收集到的输出信息
      
      // 返回更完整的结果对象
      return {
        success: !hasError,
        errorText,
        stdoutText,
        hasError
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // AbortError通常是由于用户主动终止进程，不显示为错误
        appendTerminalOutput(t('tmdbIntegration.commandTerminated'), "info")
        return { success: false, error: t('tmdbIntegration.userCancelled'), errorText: t('tmdbIntegration.userCancelled'), stdoutText: "" }
      }
      const errorMessage = error instanceof Error ? error.message : t('tmdbIntegration.unknownError')
      appendTerminalOutput(`${t('tmdbIntegration.executeError')}: ${errorMessage}`, "error")
      return {
        success: false,
        error: errorMessage,
        errorText: errorMessage,
        stdoutText: "",
        hasError: true
      }
    } finally {
      setIsExecutingCommand(false)
      abortControllerRef.current = null
      // 不要在这里清除currentProcessId，让它保持到下一个命令执行
    }
  }

  // 终止正在运行的进程
  const terminateProcess = async () => {
    if (!currentProcessId) {
      appendTerminalOutput(`⚠️ ${t('tmdbIntegration.noRunningProcess')}`, "warning");
      return;
    }

    try {
      const response = await fetch("/api/commands/terminate-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processId: currentProcessId }),
      });

      const data = await response.json();

      if (data.success) {
        appendTerminalOutput(t('tmdbIntegration.processTerminated', { processId: currentProcessId }), "success");
        setIsExecutingCommand(false);
        setCurrentProcessId(null);
      } else {
        appendTerminalOutput(`✗ ${data.error}`, "error");
      }
    } catch (error) {
      appendTerminalOutput(`✗ ${t('tmdbIntegration.terminateProcessError')}: ${error instanceof Error ? error.message : t('tmdbIntegration.unknownError')}`, "error");
    }
  }

  // 从CSV文件读取数据
  const readCSVFile = async (workingDirectory: string): Promise<boolean> => {
    try {
      const response = await axios.post('/api/csv/read', { workingDirectory })

      if (!response.data.success) {
        throw new Error(response.data.error || '读取CSV文件失败')
      }

      const csvData = response.data.data
      const formattedCsvData = Array.isArray(csvData) ? { rows: csvData } : csvData

      const validation = validateCsvData(formattedCsvData)
      if (!validation.valid) {
        const fixedData = fixCsvData(formattedCsvData)
        setCsvData(fixedData)

        await axios.post('/api/csv/save', {
          filePath: path.join(workingDirectory, 'import.csv'),
          data: fixedData
        })

        appendTerminalOutput(`CSV数据已自动修复并保存，原因: ${validation.errors.join(', ')}`, "warning")
      } else {
        setCsvData(formattedCsvData)
      }

      const content = serializeCsvData(csvData)
      setCsvContent(content)

      appendTerminalOutput(t('tmdbIntegration.csvFileReadSuccess'), "success")
      return true
    } catch (axiosError: unknown) {
      if (axiosError && typeof axiosError === 'object' && 'response' in axiosError && axiosError.response && typeof axiosError.response === 'object' && 'status' in axiosError.response && axiosError.response.status === 404) {
        appendTerminalOutput(t('tmdbIntegration.csvFileNotFound'), "error")
        appendTerminalOutput(t('tmdbIntegration.tipSwitchToProcess'), "info")
        appendTerminalOutput(t('tmdbIntegration.step1RunPlatform'), "info")
        appendTerminalOutput(t('tmdbIntegration.step2RunTmdb'), "info")
        appendTerminalOutput(t('tmdbIntegration.step3Success'), "info")
      } else {
        const errorMessage = axiosError instanceof Error ? axiosError.message : '未知错误'
        appendTerminalOutput(`读取CSV文件失败: ${errorMessage}`, "error")
      }

      return false
    }
  }

  
  // 开始处理流程
  const startProcessing = async (e?: React.MouseEvent) => {
    // 防止事件冒泡
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 检查操作锁，如果有其他操作正在进行，则退出
    if (operationLock) {
      
      toast({
        title: t('tmdbIntegration.operationBlocked'),
        description: t('tmdbIntegration.operationInProgress', { operation: operationLock }),
        variant: "destructive",
      });
      return;
    }

    // 设置当前操作锁为"platform"
    setOperationLock("platform");
    
    const savedTmdbImportPath = (await getTmdbImportPath())
    if (!savedTmdbImportPath) {
      
      setOperationLock(null);
      
      return
    }

    if (!platformUrl) {
      
      setOperationLock(null);
      
      return
    }

    // 操作锁已经设置为"platform"，不需要再设置isProcessing
    setTerminalOutput("")

    try {
      // Step 1: Platform extraction
      const command = generatePlatformCommand()

      appendTerminalOutput(`切换到工作目录: ${savedTmdbImportPath}`, "info")
      appendTerminalOutput(`执行命令: ${command}`, "info")

      const result = await executeCommandWithStream(command, savedTmdbImportPath)

      if (!result.success) {
        // 如果是用户主动终止，不显示为错误
        if (result.error === t('tmdbIntegration.userCancelled')) {
          appendTerminalOutput(t('tmdbIntegration.platformCrawlTerminated'), "info");
          return
        }
        appendTerminalOutput(t('tmdbIntegration.platformCrawlFailed', { error: result.errorText || t('tmdbIntegration.unknownError') }), "error");
        return
      }

      appendTerminalOutput(t('tmdbIntegration.platformCrawlSuccess'), "success")

      // Step 2: CSV file check
      const csvRead = await readCSVFile(savedTmdbImportPath)
      if (csvRead) {
        try {
          appendTerminalOutput(t('tmdbIntegration.csvFileReadComplete'), "success")
        } catch (error) {

          appendTerminalOutput(t('tmdbIntegration.csvFileReadComplete'), "success")
        }

         // 默认显示表格视图
        setEditorMode("table") // 默认使用表格编辑器
        appendTerminalOutput(t('tmdbIntegration.nowCanEdit'), "info")
      } else {
        appendTerminalOutput(t('tmdbIntegration.csvFileReadFailed'), "error")
      }
    } catch (error) {

      appendTerminalOutput(t('tmdbIntegration.processingError'), "error")
    } finally {
      // 释放操作锁
      setOperationLock(null);
      
      // 自动跳转到处理页面
      setActiveTab("process")
    }
  }

  // 通用错误处理辅助函数
  const handleSaveErrorWrapper = (error: unknown) => {
    handleSaveError(error, appendTerminalOutput, toast)
  }

  // 统一的CSV保存函数
  const saveCSVWrapper = async (options: {
    mode: "enhanced" | "text",
    onSuccess?: (message: string) => void,
    showSuccessNotification?: boolean,
    skipDataParsing?: boolean
  }): Promise<boolean> => {
    const success = await saveCSV({
      csvData,
      csvContent,
      editorMode: options.mode === "enhanced" ? "table" : "text",
      tmdbImportPath: await getTmdbImportPath(),
      appendTerminalOutput,
      toast,
      onSuccess: options.onSuccess,
      showSuccessNotification: options.showSuccessNotification,
      skipDataParsing: options.skipDataParsing
    })

    if (success && options.mode === "enhanced") {
      setActiveTab("process")
    }

    return success
  };

  // 统一的编码修复函数
  const fixEncoding = (text: string, preserveCsvStructure: boolean = true): string => {
    // 检查是否需要修复
    if (!/[\u00e0-\u00ff]{2,}|[\ufffd]/.test(text)) {
      return text
    }

    let result = text

    // 简单修复UTF-8被错误解析为Latin1的情况
    if (/[\u00e0-\u00ef][\u00bc-\u00bf][\u0080-\u00bf]/.test(text)) {
      try {
        result = decodeURIComponent(escape(text))
      } catch {
        // 修复失败，使用原文本
      }
    }

    // 如果需要保护CSV结构，使用高级修复逻辑
    if (preserveCsvStructure) {
      const specialCharMap: Record<string, string> = {
        "\ufffd": "",
        "Â": "",
        "â": "",
        "Ã": "",
        "ã": "",
        "Å": "",
        "å": ""
      }

      const lines = result.split('\n')
      const fixedLines = lines.map(line => {
        let insideQuotes = false
        let processedLine = ''

        for (let i = 0; i < line.length; i++) {
          const char = line[i]

          if (char === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              processedLine += '""'
              i++
            } else {
              insideQuotes = !insideQuotes
              processedLine += char
            }
          } else if (char === ',') {
            processedLine += char
          } else if (!insideQuotes && specialCharMap[char]) {
            processedLine += specialCharMap[char]
          } else if (!insideQuotes && /[\u00e0-\u00ff]{2}/.test(char + (line[i + 1] || ''))) {
            try {
              const fixed = decodeURIComponent(escape(char))
              processedLine += fixed && fixed !== char ? fixed : char
            } catch {
              processedLine += char
            }
          } else {
            processedLine += char
          }
        }

        return processedLine
      })

      return fixedLines.join('\n')
    }

    return result
  }

  // 添加终端输出
  const appendTerminalOutput = (
    text: string,
    type: "info" | "success" | "error" | "warning" | "stdout" | "stderr" = "info",
  ) => {
    const timestamp = new Date().toLocaleTimeString()
    let prefix = ""

    switch (type) {
      case "success":
        prefix = "✓ "
        break
      case "error":
      case "stderr":
        prefix = "✗ "
        break
      case "warning":
        prefix = "⚠️ "
        break
      case "info":
        prefix = "ℹ️ "
        break
      default:
        prefix = ""
    }

    // 修复可能的中文乱码
    const fixedText = type === "stderr" || type === "stdout" ? fixEncoding(text, false) : text;

    setTerminalOutput((prev) => prev + `[${timestamp}] ${prefix}${fixedText}\n`)
  }

  // 处理增强型CSV编辑器的保存
  const handleSaveEnhancedCSV = async () => {
    return await saveCSVWrapper({ mode: "enhanced" });
  };

  // 保存CSV文本编辑器修改
  const saveCsvChanges = async () => {
    // 确保保存当前文本内容
    const result = await saveCSVWrapper({
      mode: "text",
      skipDataParsing: false // 强制解析文本内容
    });

    // 在保存成功后显示一个临时提示（仅用于文本模式）
    if (result) {
      const statusText = document.createElement('div');
      statusText.textContent = '✓ 已保存';
      statusText.style.position = 'fixed';
      statusText.style.bottom = '20px';
      statusText.style.right = '20px';
      statusText.style.backgroundColor = 'rgba(0, 128, 0, 0.8)';
      statusText.style.color = 'white';
      statusText.style.padding = '8px 16px';
      statusText.style.borderRadius = '4px';
      statusText.style.zIndex = '9999';
      statusText.style.fontSize = '14px';
      document.body.appendChild(statusText);

      // 在几秒钟后移除提示
      setTimeout(() => {
        if (document.body.contains(statusText)) {
          document.body.removeChild(statusText);
        }
      }, 2000);
    }

    return result;
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(t('tmdbIntegration.copied'))
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch (error) {
      
    }
  }

  
  // 手动执行TMDB导入
  const executeTMDBExtraction = async (e?: React.MouseEvent) => {
    // 防止事件冒泡
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 检查操作锁，如果有其他操作正在进行，则退出
    if (operationLock) {
      
      toast({
        title: t('tmdbIntegration.operationBlocked'),
        description: t('tmdbIntegration.operationInProgress', { operation: operationLock }),
        variant: "destructive",
      });
      return;
    }

    // 设置当前操作锁为"tmdb"
    setOperationLock("tmdb");

    try {
      // 更新UI状态
      appendTerminalOutput(t('tmdbIntegration.preparingTmdb'), "info");

      // 获取TMDB-Import工具路径（兼容服务端配置回填）
      const tmdbImportPath = await getTmdbImportPath();
      if (!tmdbImportPath) {
        appendTerminalOutput(t('tmdbIntegration.tmdbImportToolNotFound'), "error");
        toast({
          title: t('tmdbIntegration.configMissing'),
          description: t('tmdbIntegration.configureInSettings'),
          variant: "destructive",
        });
        return;
      }

      // 生成TMDB导入命令
      const tmdbCommand = generateTMDBCommand(selectedSeason);
      if (!tmdbCommand) {
        appendTerminalOutput(t('tmdbIntegration.generateTmdbCommandFailed'), "error");
        return;
      }

      // 解析命令，提取TMDB URL参数
      const cmdParts = tmdbCommand.split(' ');
      if (cmdParts.length < 3) {
        appendTerminalOutput(t('tmdbIntegration.commandFormatError'), "error");
        return;
      }

      // 提取URL参数部分
      const tmdbUrl = cmdParts[cmdParts.length - 1];

      // 构建完整的命令字符串，根据 headlessMode 决定是否添加 --headless 标志
      const headlessFlag = headlessMode ? '--headless' : '';
      const fullCommand = `cd "${tmdbImportPath}" && python -m tmdb-import ${headlessFlag} ${tmdbUrl}`;

      // 在页面日志中显示将要执行的命令
      appendTerminalOutput(t('tmdbIntegration.willExecuteCommand', { command: fullCommand }), "info");

      // 直接在页面内部执行命令，使用流式输出
      const result = await executeCommandWithStream(fullCommand, process.cwd());

      // 根据执行结果更新状态
      if (result.success) {
        appendTerminalOutput(t('tmdbIntegration.tmdbImportSuccess'), "success");
        toast({
          title: t('tmdbIntegration.commandExecuted'),
          description: t('tmdbIntegration.tmdbImportSuccessDesc'),
        });
      } else {
        if (result.error === t('tmdbIntegration.userCancelled')) {
          appendTerminalOutput(t('tmdbIntegration.tmdbImportTerminated'), "info");
          toast({
            title: t('tmdbIntegration.commandTerminated'),
            description: t('tmdbIntegration.commandTerminatedDesc'),
          });
        } else {
          const errorMsg = result.errorText || t('tmdbIntegration.unknownError');
          appendTerminalOutput(t('tmdbIntegration.tmdbImportFailed') + `: ${errorMsg}`, "error");
          toast({
            title: t('tmdbIntegration.executeFailed'),
            description: t('tmdbIntegration.tmdbImportFailedDesc'),
            variant: "destructive",
          });
        }
      }
    } catch (error: unknown) {

      appendTerminalOutput(`${t('tmdbIntegration.executeError')}: ${error instanceof Error ? error.message : t('tmdbIntegration.unknownError')}`, "error");
      toast({
        title: t('tmdbIntegration.executeError'),
        description: error instanceof Error ? error.message : t('tmdbIntegration.unknownError'),
        variant: "destructive",
      });
    } finally {
      // 释放操作锁
      setOperationLock(null);
    }
  };

  
  
  // 处理编辑器模式切换
  const handleEditorModeChange = (mode: "table" | "text") => {
    // 如果从表格模式切换到文本模式，需要将csvData转换为文本
    if (mode === "text" && editorMode !== "text" && csvData) {
      // 将csvData转换为CSV文本并修复可能的编码问题
      const rawCsvText = serializeCsvData(csvData)
      // 多次尝试修复乱码，有些复杂的乱码可能需要多次处理
      let fixedCsvText = fixEncoding(rawCsvText)
      // 再次尝试修复，处理可能遗漏的乱码
      fixedCsvText = fixEncoding(fixedCsvText)
      setCsvContent(fixedCsvText)

      // 如果检测到并修复了乱码，显示提示
      if (fixedCsvText !== rawCsvText) {
        toast({
          title: t('tmdbIntegration.encodingFixed'),
          description: t('tmdbIntegration.encodingAutoFixed'),
        })
      }

      appendTerminalOutput(t('tmdbIntegration.switchedToTextMode'), "info");
    }
    // 如果从文本模式切换到表格模式，需要尝试解析文本为csvData
    else if (mode !== "text" && editorMode === "text" && csvContent.trim()) {
      try {
        // 解析CSV文本为数据
        const newData = parseCsvContent(csvContent)
        setCsvData(newData)
        appendTerminalOutput(t('tmdbIntegration.textParsedToTable'), "success");
      } catch (error) {
        // 如果解析失败，显示错误提示但仍然切换模式
        toast({
          title: t('tmdbIntegration.csvFormatError'),
          description: t('tmdbIntegration.textParseFailed'),
          variant: "destructive",
        })
        appendTerminalOutput(t('tmdbIntegration.textParseFailedError'), "error");
        // 尝试恢复为上一次可用的CSV数据
        if (csvData) {
          const recoveredText = serializeCsvData(csvData);
          setCsvContent(recoveredText);
          appendTerminalOutput(t('tmdbIntegration.recoveredLastValid'), "info");
        }
        return; // 解析失败时不切换模式
      }
    }

    // 更新编辑器模式
    setEditorMode(mode)

    // 如果切换到文本模式，需要优化显示区域
    if (mode === "text") {
      // 延迟执行以确保DOM已更新
      setTimeout(() => {
        
        forceExpandEditor();
      }, 100);
    }
  }

  // 手动修复编码
  const handleFixEncoding = () => {
    if (!csvContent) return

    // 多次尝试修复乱码
    let fixedCsvContent = fixEncoding(csvContent)
    // 再次尝试修复，处理可能遗漏的乱码
    fixedCsvContent = fixEncoding(fixedCsvContent)

    if (fixedCsvContent !== csvContent) {
      setCsvContent(fixedCsvContent)
      toast({
        title: t('tmdbIntegration.encodingFixed'),
        description: t('tmdbIntegration.encodingFixedManual'),
      })
    } else {
      toast({
        title: t('tmdbIntegration.noEncodingIssue'),
        description: t('tmdbIntegration.noEncodingIssue'),
      })
    }
  }

  // 格式化CSV内容
  const formatCsvContent = () => {
    if (!csvContent) return

    try {
      const parsedData = parseCsvContent(csvContent)
      const formattedCsvText = serializeCsvData(parsedData)
      setCsvContent(formattedCsvText)

      toast({
        title: t('tmdbIntegration.formatSuccess'),
        description: t('tmdbIntegration.csvFormatted'),
        variant: "default"
      })
    } catch {
      toast({
        title: t('tmdbIntegration.formatFailed'),
        description: t('tmdbIntegration.csvFormatIncorrect'),
        variant: "destructive"
      })
    }
  }

  // 清理CSV中的换行符
  const handleCleanNewlines = useCallback(() => {
    if (!csvContent) return;

    try {
      const cleanedContent = cleanCsvNewlines(csvContent);
      setCsvContent(cleanedContent);

      // 同时更新csvData
      const newData = parseCsvContent(cleanedContent);
      setCsvData(newData);

      appendTerminalOutput('已清理CSV中的换行符', 'success');
      toast({
        title: '清理完成',
        description: 'overview字段中的换行符已替换为空格',
      });
    } catch (error) {
      appendTerminalOutput(`清理换行符失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
      toast({
        title: '清理失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    }
  }, [csvContent, appendTerminalOutput, toast]);

  // 键盘快捷键处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 保存快捷键: Ctrl+S
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      saveCsvChanges();

      // 在编辑器底部临时显示保存提示
      const textArea = textareaRef.current;
      if (textArea) {
        const saveIndicator = document.createElement('div');
        saveIndicator.textContent = '正在保存...';
        saveIndicator.style.position = 'absolute';
        saveIndicator.style.bottom = '10px';
        saveIndicator.style.left = '50%';
        saveIndicator.style.transform = 'translateX(-50%)';
        saveIndicator.style.backgroundColor = 'var(--primary, #3b82f6)';
        saveIndicator.style.color = 'white';
        saveIndicator.style.padding = '4px 10px';
        saveIndicator.style.borderRadius = '4px';
        saveIndicator.style.fontSize = '12px';
        saveIndicator.style.zIndex = '50';
        saveIndicator.style.opacity = '0.9';

        // 将提示添加到编辑器容器
        const container = textArea.parentElement;
        if (container) {
          container.appendChild(saveIndicator);

          // 2秒后移除提示
          setTimeout(() => {
            if (container.contains(saveIndicator)) {
              container.removeChild(saveIndicator);
            }
          }, 2000);
        }
      }
    }
    // 对于Ctrl+F，我们使用浏览器默认搜索

    // 修复编码快捷键: Ctrl+E
    else if (e.ctrlKey && e.key === "e") {
      e.preventDefault();
      handleFixEncoding();
    }

    // 格式化快捷键: Ctrl+F+F (先按Ctrl+F，再按F)
    else if (e.ctrlKey && e.key === "f" && e.shiftKey) {
      e.preventDefault();
      formatCsvContent();
    }

    // 取消快捷键: Esc
    else if (e.key === "Escape") {
      e.preventDefault();
      ;
    }

    // Tab键处理：插入4个空格而不是切换焦点
    else if (e.key === "Tab") {
      e.preventDefault();
      const textArea = textareaRef.current;
      if (textArea) {
        const start = textArea.selectionStart || 0;
        const end = textArea.selectionEnd || 0;
        const spaces = "    ";  // 4个空格

        // 在光标位置插入空格
        const newContent =
          csvContent.substring(0, start) +
          spaces +
          csvContent.substring(end);

        setCsvContent(newContent);

        // 重新设置光标位置
        setTimeout(() => {
          if (textArea) {
            textArea.selectionStart = textArea.selectionEnd = start + spaces.length;
          }
        }, 0);
      }
    }
  }

  // 添加全屏模式状态
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 添加紧凑模式状态
  const [isCompactMode, setIsCompactMode] = useState(false)

  // 确保始终使用标准模式
  useEffect(() => {
    setIsCompactMode(false)
  }, [])

  // 在inTab模式下自动尝试加载CSV数据
  useEffect(() => {
    const loadCsvData = async () => {
      if (inTab && !csvData) {
        const savedTmdbImportPath = await getTmdbImportPath()
        if (savedTmdbImportPath) {
          const result = await readCSVFile(savedTmdbImportPath)
          if (!result) {
            setActiveTab("process")
          }
        } else {
          setActiveTab("process")
        }
      }
    }

    loadCsvData().catch(() => {
      setActiveTab("process")
    })
  }, [inTab, csvData])

  // 添加标签切换处理器
  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return
    }

    setActiveTab(value)

    if (value === "edit" && !csvData) {
      getTmdbImportPath().then(savedTmdbImportPath => {
        if (savedTmdbImportPath) {
          readCSVFile(savedTmdbImportPath)
        }
      }).catch(() => {
        // 忽略错误
      })
    }
  }
  // 添加CSS样式
  useEffect(() => {
    // 添加全局样式
    const globalStyle = document.createElement('style');
    globalStyle.id = 'tmdb-import-global-style';
    globalStyle.textContent = `
      .csv-text-editor {
        width: 100%;
        height: auto; /* 改为自动高度，根据内容调整 */
        resize: none;
        border: none;
        background-color: transparent;
        font-family: monospace;
        white-space: pre;
        overflow-wrap: normal;
        overflow-x: auto;
        overflow-y: auto; /* 确保垂直滚动 */
        min-height: 70vh; /* 减少最小高度，避免过度占用空间 */
        max-height: none; /* 移除最大高度限制 */
        padding-bottom: 50px; /* 增加底部内边距，确保最后几行内容可见 */
        display: block; /* 确保元素正确显示 */
        font-size: 20px; /* 保持合适的字体大小 */
        line-height: 2.0; /* 略微减小行高，显示更多内容 */
        flex: 1 1 auto; /* 允许编辑器自动扩展 */
        letter-spacing: 0.5px; /* 增加字符间距，提高可读性 */
        position: relative; /* 设置相对定位 */
        color: #333; /* 深色文本颜色，提高可读性 */
        font-weight: 500; /* 稍微加粗字体 */
        text-shadow: 0 0 0.5px rgba(0, 0, 0, 0.1); /* 轻微文字阴影，提高清晰度 */
        padding-left: 50px; /* 增加左侧内边距，确保行号与内容对齐 */
        padding-right: 20px; /* 右侧内边距 */
        tab-size: 4; /* 设置制表符大小 */
        scrollbar-width: thin; /* Firefox滚动条样式 */
        scrollbar-gutter: stable; /* 为滚动条预留空间，避免布局偏移 */
      }

      .csv-text-editor-container {
        position: relative;
        border: 1px solid var(--border, #e5e5e5);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-height: 70vh; /* 减少最小高度 */
        height: auto; /* 改为自动高度 */
        max-height: none; /* 移除最大高度限制 */
        overflow-y: auto; /* 明确设置垂直滚动 */
        overflow-x: hidden; /* 隐藏水平滚动，由textarea处理 */
        margin-bottom: 2px; /* 进一步减少底部边距 */
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* 添加轻微阴影，提升视觉效果 */
        background-color: #fcfcfc; /* 轻微的背景色，提高可读性 */
        padding: 0; /* 移除容器内边距，由文本编辑器控制内边距 */
        scrollbar-width: thin; /* Firefox滚动条样式 */
      }

      .csv-line-numbers {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background-color: var(--background-muted, #f5f5f5);
        border-right: 1px solid var(--border, #e5e5e5);
        z-index: 10;
        overflow-y: hidden;
        text-align: right;
        padding-right: 5px;
        user-select: none;
        font-size: 14px;
      }

      .csv-line-number {
        color: var(--muted-foreground, #71717a);
        font-size: 14px;
        padding: 0 5px;
      }

      .csv-line-number.active {
        background-color: var(--accent-muted, #e5e5e5);
        color: var(--accent-foreground, #18181b);
      }

      /* 增强表格样式 */
      .new-tmdb-table.grid-lines table {
        border-collapse: separate;
        border-spacing: 0;
      }

      .new-tmdb-table.grid-lines th,
      .new-tmdb-table.grid-lines td {
        border-right: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
      }

      .new-tmdb-table.grid-lines th:last-child,
      .new-tmdb-table.grid-lines td:last-child {
        border-right: none;
      }

      .new-tmdb-table.grid-lines tr:last-child td {
        border-bottom: none;
      }

      .new-tmdb-table.alternate-rows tbody tr:nth-child(even) {
        background-color: var(--muted/50);
      }

      .new-tmdb-table.fixed-row-height tbody tr {
        height: 40px;
      }

      /* 优化表格滚动 */
      .csv-table-wrapper {
        position: relative;
        overflow: auto;
        border: 1px solid var(--border);
        border-radius: 6px;
      }

      .csv-table-wrapper::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .csv-table-wrapper::-webkit-scrollbar-track {
        background: var(--muted/30);
        border-radius: 4px;
      }

      .csv-table-wrapper::-webkit-scrollbar-thumb {
        background: var(--muted-foreground/30);
        border-radius: 4px;
      }

      .csv-table-wrapper::-webkit-scrollbar-thumb:hover {
        background: var(--muted-foreground/50);
      }

      /* 单元格编辑优化 */
      .group\/cell:hover {
        background-color: var(--accent/10);
      }

      .group\/cell input {
        font-size: 14px;
        line-height: 1.4;
      }

      /* 行号列样式 */
      .tmdb-table th:first-child,
      .tmdb-table td:first-child {
        position: sticky;
        left: 0;
        z-index: 10;
        background-color: var(--background);
        border-right: 2px solid var(--border);
      }

      /* 列头操作按钮样式 */
      .group:hover .group-hover\\:opacity-100 {
        opacity: 1;
      }

      /* 行操作按钮样式 */
      .group:hover .group-hover\\:opacity-100 {
        opacity: 1;
      }

      /* 表格工具栏样式 */
      .csv-table-toolbar {
        background: var(--muted/30);
        border-bottom: 1px solid var(--border);
        padding: 8px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      /* 表格状态信息样式 */
      .csv-table-status {
        font-size: 12px;
        color: var(--muted-foreground);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* 改善单元格编辑体验 */
      .csv-cell-editor {
        width: 100%;
        height: 100%;
        padding: 4px 8px;
        border: 2px solid var(--primary);
        border-radius: 4px;
        background: var(--background);
        font-size: 14px;
        line-height: 1.4;
        outline: none;
        box-shadow: 0 0 0 2px var(--primary/20);
      }

      /* 单元格悬停效果 */
      .csv-cell:hover {
        background-color: var(--accent/10);
      }

      .csv-cell.selected {
        background-color: var(--primary/20);
      }

      .csv-cell.active {
        outline: 2px solid var(--primary);
        outline-offset: -2px;
      }

      /* 行列操作按钮动画 */
      .csv-operation-btn {
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
      }

      .group:hover .csv-operation-btn {
        opacity: 1;
      }

      /* 表格加载状态 */
      .csv-table-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--muted-foreground);
      }
      `;
    document.head.appendChild(globalStyle);

    // 在inTab模式下添加特定的样式
    if (inTab) {
      const style = document.createElement('style');
      style.id = 'tmdb-import-integration-in-tab-style';
      style.textContent = `
        .tmdb-import-in-tab .csv-line-numbers {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background-color: var(--background-muted, #f5f5f5);
          border-right: 1px solid var(--border, #e5e5e5);
          z-index: 10;
          overflow-y: hidden;
          text-align: right;
          padding-right: 5px;
          user-select: none;
        }

        .tmdb-import-in-tab .csv-line-number {
          color: var(--muted-foreground, #71717a);
          font-size: 12px;
          padding: 0 5px;
        }

        .tmdb-import-in-tab .csv-line-number.active {
          background-color: var(--accent-muted, #e5e5e5);
          color: var(--accent-foreground, #18181b);
        }

        .tmdb-import-in-tab .csv-text-editor {
          width: 100%;
          height: 100%;
          resize: none;
          border: none;
          background-color: transparent;
          font-family: monospace;
          white-space: pre;
          overflow-wrap: normal;
          overflow-x: auto;
          overflow-y: auto;
          min-height: calc(100% - 10px); /* 确保最小高度为容器的100%减去一点边距 */
          padding-bottom: 10px; /* 减少底部内边距 */
          display: block; /* 确保元素正确显示 */
          font-size: 14px; /* 默认字体大小 */
          line-height: 1.5; /* 略微降低行高以显示更多内容 */
        }

        .tmdb-import-in-tab .csv-text-editor-container {
          position: relative;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          min-height: calc(100vh - 250px); /* 动态计算最小高度，确保填充可用空间 */
          height: calc(100vh - 200px); /* 设置高度充分利用空间 */
          overflow: auto;
          margin-bottom: 2px; /* 进一步减少底部边距 */
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* 添加轻微阴影 */
        }

        .tmdb-import-in-tab .csv-text-editor.compact-mode,
        .tmdb-import-in-tab .csv-line-numbers.compact-mode {
          font-size: 11px !important; /* 更小的字体大小 */
          line-height: 1.3 !important; /* 更紧凑的行高 */
        }

        /* 优化滚动条样式 */
        .tmdb-import-in-tab .csv-text-editor::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .tmdb-import-in-tab .csv-text-editor::-webkit-scrollbar-track {
          background: transparent;
        }

        .tmdb-import-in-tab .csv-text-editor::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }

        .tmdb-import-in-tab .csv-text-editor::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0, 0, 0, 0.3);
        }

        /* 添加滚动指示器 */
        .tmdb-import-in-tab .scroll-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.15), transparent);
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
          z-index: 20;
        }

        .tmdb-import-in-tab .csv-text-editor:not(:last-child) ~ .scroll-indicator {
          opacity: 1;
        }
      `;
      document.head.appendChild(style);

      return () => {
        const existingStyle = document.getElementById('tmdb-import-integration-in-tab-style');
        if (existingStyle) {
          existingStyle.remove();
        }
        const existingGlobalStyle = document.getElementById('tmdb-import-global-style');
        if (existingGlobalStyle) {
          existingGlobalStyle.remove();
        }
      };
    }

    return () => {
      const existingGlobalStyle = document.getElementById('tmdb-import-global-style');
      if (existingGlobalStyle) {
        existingGlobalStyle.remove();
      }
    };
  }, [inTab]);

  // 渲染inTab模式内容
  const renderInTabContent = () => (
    <div className="h-full flex flex-col bg-transparent backdrop-blur-md w-full overflow-hidden overscroll-none touch-none" style={{ maxWidth: '100%', width: '100%' }}>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full h-full flex flex-col"
        defaultValue="process"
      >
        <div className="border-b bg-background/30 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-2">
            <TabsList>
              <TabsTrigger value="process" className="flex items-center">
                <Terminal className="h-4 w-4 mr-2" />
                {t('tmdbIntegration.processTab')}
              </TabsTrigger>
              <TabsTrigger value="edit" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                {t('tmdbIntegration.editTab')}
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* 处理标签内容 */}
        <TabsContent
          value="process"
          className="h-full overflow-hidden p-0 m-0 bg-transparent"
        >
          <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-4 max-w-full min-w-0">
            {/* TMDB导入命令区域 */}
              <Card variant="frosted" className="w-full min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                  <Terminal className="h-4 w-4 mr-2" />
                  {t('tmdbIntegration.tmdbImportCommand')}
                  </CardTitle>
                </CardHeader>
              <CardContent>
                {/* 命令显示区域 */}
                <div className="bg-gray-900/90 text-green-400 p-3 rounded-md text-xs overflow-hidden w-full min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2 w-0">
                      <div className="font-mono text-xs truncate"
                           title={generatePlatformCommand() || `python -m tmdb-import "${platformUrl || t('tmdbIntegration.pleaseInputPlatformUrl')}"`}>
                        {generatePlatformCommand() || `python -m tmdb-import "${platformUrl || t('tmdbIntegration.pleaseInputPlatformUrl')}"`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6"
                      onClick={() => copyToClipboard(generatePlatformCommand(), t('tmdbIntegration.platformCommandCopied'))}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2 w-0">
                      <div className="font-mono text-xs truncate"
                           title={generateTMDBCommand(selectedSeason) || `python -m tmdb-import "https://www.themoviedb.org/tv/290854/season/${selectedSeason}?language=zh-CN"`}>
                        {generateTMDBCommand(selectedSeason) || `python -m tmdb-import "https://www.themoviedb.org/tv/290854/season/${selectedSeason}?language=zh-CN"`}
                      </div>
                    </div>
                                <Button
                      variant="ghost"
                      size="sm"
                      className="h-6"
                      onClick={() => copyToClipboard(generateTMDBCommand(selectedSeason), t('tmdbIntegration.tmdbCommandCopied'))}
                    >
                      <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                </div>

                {/* 配置和按钮区域 */}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {/* 左侧：URL和季数配置 */}
                  <div className="space-y-2">
                  <div>
                      <Label htmlFor="platform-url-tab" className="text-xs mb-1 block">{t('tmdbIntegration.platformUrl')}</Label>
                      <Input
                        id="platform-url-tab"
                        value={platformUrl}
                        onChange={(e) => setPlatformUrl(e.target.value)}
                        placeholder="https://example.com/show-page"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <Label className="text-xs">{t('tmdbIntegration.tmdbSeason')}</Label>
                    <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs">第</span>
                                <Input
                        type="number"
                        min="1"
                        max="20"
                        value={selectedSeason}
                        onChange={(e) => handleSeasonChange(e.target.value)}
                            className="w-12 h-7 text-xs"
                      />
                      <span className="text-xs">季</span>
                    </div>
                  </div>
                  <div>
                        <Label className="text-xs">{t('tmdbIntegration.language')}</Label>
                    <div className="flex items-center mt-1">
                          <LanguageSelector
                            value={selectedLanguage}
                            onChange={handleLanguageChange}
                            size="sm"
                          />
                    </div>
                  </div>
            </div>
          </div>

                  {/* 中间：运行模式选择 */}
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs mb-1 block">{t('tmdbIntegration.runMode')}</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={!headlessMode ? "default" : "outline"}
                          size="sm"
                          onClick={() => setHeadlessMode(false)}
                          className={`flex-1 h-7 text-xs ${!headlessMode ? "bg-green-600 hover:bg-green-700" : ""}`}
                        >
                          <Terminal className="h-3 w-3 mr-1" />
                          {t('tmdbIntegration.foreground')}
                        </Button>
                        <Button
                          type="button"
                          variant={headlessMode ? "default" : "outline"}
                          size="sm"
                          onClick={() => setHeadlessMode(true)}
                          className={`flex-1 h-7 text-xs ${headlessMode ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                        >
                          <ActivityIcon className="h-3 w-3 mr-1" />
                          {t('tmdbIntegration.background')}
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {headlessMode ? t('tmdbIntegration.backgroundTip') : t('tmdbIntegration.foregroundTip')}
                    </p>
                  </div>

                  {/* 右侧：按钮区域 */}
                  <div className="flex flex-col justify-end space-y-2">
                    {/* 两个主要按钮 */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={(e) => startProcessing(e)}
                        disabled={operationLock === "platform" || !tmdbPathState || !platformUrl}
                        className="bg-green-600 hover:bg-green-700 h-9 text-xs"
                      >
                        {operationLock === "platform" ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-1" />
                        )}
                        {t('tmdbIntegration.platformCrawl')}
                      </Button>
                      <Button
                        onClick={(e) => executeTMDBExtraction(e)}
                        disabled={operationLock === "tmdb" || csvData === null}
                        className="bg-blue-600 hover:bg-blue-700 h-9 text-xs"
                      >
                        {operationLock === "tmdb" ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                        <Download className="h-4 w-4 mr-1" />
                        )}
                        {t('tmdbIntegration.executeTmdbImport')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 终端输出 */}
            <Card variant="frosted">
              <CardHeader className="py-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <ActivityIcon className="h-4 w-4 mr-2" />
                    {t('tmdbIntegration.terminalOutput')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadLocalCSVFile}
                      disabled={operationLock !== null}
                      className="h-7 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      {t('tmdbIntegration.refreshData')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={terminateProcess}
                      disabled={!isExecutingCommand}
                      className="h-7 text-xs"
                      title={t('tmdbIntegration.terminateTip')}
                    >
                      <Square className="h-3.5 w-3.5 mr-1" />
                      {t('tmdbIntegration.terminate')}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  ref={terminalRef}
                  className="bg-gray-900/90 backdrop-blur-md text-green-400 p-3 rounded-lg font-mono text-xs h-[250px] max-h-[250px] overflow-y-auto whitespace-pre-wrap"
                >
                  {terminalOutput ? (
                    <div dangerouslySetInnerHTML={{ __html: terminalOutput }} />
                  ) : (
                    <div className="text-muted">
                      <p>{t('tmdbIntegration.waitingForProcess')}</p>
                      <p className="mt-2">{t('tmdbIntegration.youCanDo')}</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>{t('tmdbIntegration.clickToStart')}</li>
                        <li>{t('tmdbIntegration.clickToExecute')}</li>
                        <li>{t('tmdbIntegration.ifNotDisplay')}</li>
                        <li>{t('tmdbIntegration.ifLoadCsv')}</li>
                      </ul>
                      <p className="mt-2">{t('tmdbIntegration.firstTimeTip')}</p>
                    </div>
                  )}
                                </div>

                {/* 交互按钮区域 */}
                {isExecutingCommand && (
                  <div className="p-3 border-t">
                    <div className="flex items-center justify-between">
                      <div className="text-xs flex items-center">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        <span className="text-blue-600 dark:text-blue-400">
                          {t('tmdbIntegration.executingCommand')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                    <Button
                          variant="default"
                      size="sm"
                          onClick={() => sendQuickCommand("y")}
                          disabled={!isExecutingCommand || !currentProcessId}
                          className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('tmdbIntegration.confirm')}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => sendQuickCommand("w")}
                          disabled={!isExecutingCommand || !currentProcessId}
                          className="bg-yellow-600 hover:bg-yellow-700 h-7 text-xs"
                        >
                          <CircleDashed className="h-3 w-3 mr-1" />
                          {t('tmdbIntegration.wait')}
                        </Button>
                        <Button
                          variant="default"
                      size="sm"
                          onClick={() => sendQuickCommand("n")}
                          disabled={!isExecutingCommand || !currentProcessId}
                          className="bg-red-600 hover:bg-red-700 h-7 text-xs"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          {t('tmdbIntegration.cancel')}
                        </Button>
                              </div>
                    </div>

                    {/* 终端输入 */}
                    <div className="mt-2 flex items-center space-x-2">
                      <Input
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        placeholder={t('tmdbIntegration.inputCommand')}
                        className="text-xs h-7"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && terminalInput) {
                            sendTerminalInput();
                            e.preventDefault();
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={sendTerminalInput}
                        disabled={!terminalInput || !isExecutingCommand || !currentProcessId}
                        className="h-7"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                            </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* 编辑标签内容 */}
        <TabsContent
          value="edit"
          className="h-full min-h-0 p-0 m-0 bg-transparent w-full"
        >
            <div className="h-full flex flex-col w-full overflow-hidden">
            {/* 编辑工具栏 */}
            <div className="border-b px-4 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-muted rounded-md p-0.5 flex items-center">
                  <Button
                      variant={editorMode === "table" ? "default" : "ghost"}
                    size="sm"
                      onClick={() => handleEditorModeChange("table")}
                      className="h-7 px-2 text-xs"
                    >
                      <TableIcon className="h-3.5 w-3.5 mr-1" />
                      {t('tmdbIntegration.tableMode')}
                    </Button>
                    <Button
                      variant={editorMode === "text" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleEditorModeChange("text")}
                      className="h-7 px-2 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      {t('tmdbIntegration.textMode')}
                    </Button>
                </div>
              </div>
            </div>

              {/* 编辑区域 */}
            <div className="flex-1 min-h-0 overflow-hidden" style={{ maxWidth: '100%', width: '100%' }}>
              {editorMode === "table" && csvData ? (
                      <NewTMDBTable
                        data={csvData}
                        onChange={handleCsvDataChange}
                        onSave={handleSaveEnhancedCSV}
                        onCancel={() => {}}
                        className="h-full w-full"
                        height="100%"
                        isSaving={isSaving}
                        onCleanNewlines={handleCleanNewlines}
                      />
              ) : editorMode === "text" ? (
                <div className="h-full flex flex-col csv-text-editor-container">
                  <textarea
                    ref={textareaRef}
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 font-mono text-xs resize-none focus:outline-none bg-background/40 backdrop-blur-md csv-text-editor"
                    placeholder={t('tmdbIntegration.csvContent')}
                    style={{ lineHeight: 1.6 }}
                  ></textarea>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
                          )}
                        </div>
                      </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // 自动调整编辑器高度的函数
  const adjustEditorHeight = useCallback(() => {
    // 获取编辑器容器和文本区域
    const container = document.querySelector('.csv-text-editor-container');
    const textEditor = document.querySelector('.csv-text-editor');
    if (!container || !textEditor) return;

    // 保存当前滚动位置
    const currentScrollPosition = (container as HTMLElement).scrollTop;

    // 获取页面顶部到容器顶部的距离
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;

    // 计算可用高度（视口高度减去容器顶部位置）
    const availableHeight = window.innerHeight - containerTop - 10; // 保留10px边距

    // 计算内容实际高度
    const lineCount = csvContent.split('\n').length;
    const contentHeight = lineCount * 32 + 100; // 每行约32px + 额外空间

    // 使用较大的可用高度或内容高度，但不限制最大高度
    const optimalHeight = Math.max(availableHeight, contentHeight);
    
    // 设置容器为自动高度，让内容决定实际高度
    (container as HTMLElement).style.height = 'auto';
    (container as HTMLElement).style.minHeight = `${Math.min(availableHeight, 600)}px`;
    (container as HTMLElement).style.maxHeight = 'none';

    // 设置文本区域样式
    (textEditor as HTMLElement).style.height = 'auto';
    (textEditor as HTMLElement).style.minHeight = `${Math.min(availableHeight, 600)}px`;
    (textEditor as HTMLElement).style.maxHeight = 'none';

    // 恢复滚动位置
    setTimeout(() => {
      (container as HTMLElement).scrollTop = currentScrollPosition;
    }, 10);
  }, [csvContent]);

  // 在组件挂载和窗口大小变化时调整编辑器高度
  useEffect(() => {
    if (typeof window === 'undefined' || !csvData || editorMode !== 'text') return;

    // 延迟执行以确保DOM已完全加载
    const timer = setTimeout(() => {
      adjustEditorHeight();

      // 添加窗口大小变化事件监听器，但保持滚动位置
      window.addEventListener('resize', () => {
        // 保存当前滚动位置
        const container = document.querySelector('.csv-text-editor-container');
        const textEditor = document.querySelector('.csv-text-editor');
        const scrollPosition = container ? (container as HTMLElement).scrollTop : 0;
        
        adjustEditorHeight();
        
        // 恢复滚动位置
        setTimeout(() => {
          if (container) {
            (container as HTMLElement).scrollTop = scrollPosition;
          }
        }, 50);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', adjustEditorHeight);
    };
  }, [adjustEditorHeight, csvData, editorMode]);

  // 强制扩展编辑器高度的函数
  const forceExpandEditor = useCallback(() => {
    // 获取编辑器容器和文本区域
    const container = document.querySelector('.csv-text-editor-container');
    const textEditor = document.querySelector('.csv-text-editor');

    if (!container || !textEditor) return;

    // 保存当前滚动位置
    const currentScrollPosition = (container as HTMLElement).scrollTop;

    // 计算内容实际高度（文本行数 * 行高）
    const lineCount = csvContent.split('\n').length;
    const lineHeight = isCompactMode ? 1.7 : 2.2; // 更新与编辑器匹配的行高
    const fontSize = isCompactMode ? 17 : 20; // 更新与编辑器匹配的字体大小
    
    // 计算内容所需的最小高度，添加额外的padding确保最后几行内容可见
    const contentHeight = lineCount * lineHeight * fontSize + 150; // 增加底部padding到150px

    // 获取视口高度
    const viewportHeight = window.innerHeight;
    
    // 使用内容实际高度，确保所有内容都能显示和滚动
    // 不再限制最大高度，允许内容超出视口高度以支持滚动
    const optimalHeight = Math.max(contentHeight, viewportHeight * 0.9);

    // 应用高度样式
    (container as HTMLElement).style.height = `${optimalHeight}px`;
    (container as HTMLElement).style.maxHeight = 'none'; // 移除最大高度限制
    (container as HTMLElement).style.overflowY = 'auto'; // 确保容器可垂直滚动
    
    (textEditor as HTMLElement).style.minHeight = `${optimalHeight}px`;
    (textEditor as HTMLElement).style.height = 'auto'; // 让textarea根据内容自动调整高度
    (textEditor as HTMLElement).style.overflowY = 'auto'; // 确保文本区域可垂直滚动

    // 确保文本区域有足够的宽度，防止水平滚动
    (textEditor as HTMLElement).style.width = '100%';
    (textEditor as HTMLElement).style.maxWidth = 'none';
    
    // 添加底部padding确保最后几行内容完全可见
    (textEditor as HTMLElement).style.paddingBottom = '50px';

    // 恢复滚动位置
    setTimeout(() => {
      (container as HTMLElement).scrollTop = currentScrollPosition;
    }, 10);
  }, [csvContent, isCompactMode]);

  // 在CSV内容变化时调用强制扩展函数，但减少调用频率
  useEffect(() => {
    if (editorMode === 'text' && csvContent) {
      // 只在内容长度发生显著变化时才调整高度
      const lineCount = csvContent.split('\n').length;
      
      if (Math.abs(lineCount - prevLineCountRef.current) > 5) {
        // 延迟执行以确保DOM已更新
        setTimeout(forceExpandEditor, 100);
        prevLineCountRef.current = lineCount;
      }
    }
  }, [csvContent, editorMode, forceExpandEditor]);

  
  
  // 添加加载本地CSV文件的函数
  const loadLocalCSVFile = useCallback(async () => {
    
    const savedTmdbImportPath = await getTmdbImportPath();
    if (savedTmdbImportPath) {
      try {
        appendTerminalOutput(t('tmdbIntegration.loadingLocalCsv'), "info");
        const result = await readCSVFile(savedTmdbImportPath);
        if (result) {
          appendTerminalOutput(t('tmdbIntegration.localCsvLoaded'), "success");
          toast({
            title: t('tmdbIntegration.loadSuccess'),
            description: t('tmdbIntegration.localCsvLoaded'),
          });
                  } else {
          appendTerminalOutput(t('tmdbIntegration.loadLocalCsvFailed'), "error");
          toast({
            title: t('tmdbIntegration.loadFailed'),
            description: t('tmdbIntegration.loadLocalCsvFailed'),
            variant: "destructive",
          });
        }
      } catch (error: unknown) {
        
        appendTerminalOutput(`${t('tmdbIntegration.loadCsvError')}: ${error instanceof Error ? error.message : t('tmdbIntegration.unknownError')}`, "error");
        toast({
          title: t('tmdbIntegration.loadError'),
          description: error instanceof Error ? error.message : t('tmdbIntegration.unknownError'),
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: t('tmdbIntegration.pathNotConfigured'),
        description: t('tmdbIntegration.configureToolPath'),
        variant: "destructive",
      });
      appendTerminalOutput(t('tmdbIntegration.tmdbImportToolNotFound'), "error");
    }
  }, [appendTerminalOutput, readCSVFile]);

  // 添加组件初始化钩子，确保页面打开时显示处理标签页
  useEffect(() => {
    // 当对话框打开时，强制设置为处理标签
    if (open) {

      setActiveTab("process")

      // 短暂延迟后再次确认是处理标签页
      setTimeout(() => {
        setActiveTab("process")
              
              }, 100)
    } else {
      // 对话框关闭时，重置初始化状态
          }
  }, [open])

  
  
  // 处理季数变化
  const handleSeasonChange = (newSeasonValue: string | number) => {
    const season = Number.parseInt(String(newSeasonValue)) || 1
    setSelectedSeason(season)

    // 保存选择的季数到服务端配置
    void ClientConfigManager.setItem(`tmdb_season_${item.id}`, season.toString());
  }

  // 处理语言变化
  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode)
  }

  // 处理CSV数据变更
  const handleCsvDataChange = (newData: CSVDataType) => {
    // 只更新CSV数据，不进行其他操作
    setCsvData(newData);
  };

  
  
  
  return (
    <>
      {/* 根据是否在标签页中决定是否使用Dialog组件 */}
      {inTab ? (
        renderInTabContent()
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className={`${isFullscreen ? 'max-w-full w-full h-full max-h-full inset-0 rounded-none' : 'max-w-[90vw] max-h-[90vh]'} overflow-y-auto p-0 bg-transparent border-none`}
            style={{
              transform: isFullscreen ? 'none' : undefined,
              top: isFullscreen ? '0' : undefined,
              left: isFullscreen ? '0' : undefined,
            }}
          >
            <DialogHeader className="p-6 pb-2 flex flex-row items-center justify-between bg-background/30 backdrop-blur-md border-b">
              <DialogTitle className="flex items-center space-x-2">
                <Terminal className="h-5 w-5" />
                <span>{t('tmdbIntegration.localIntegration')}</span>
                <Badge variant="outline">{item.title}</Badge>
                <Badge variant={activeTab === "process" ? "default" : "outline"} className="ml-2 text-xs">
                  {activeTab === "process" ? t('tmdbIntegration.processMode') : t('tmdbIntegration.editMode')}
                </Badge>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? t('tmdbIntegration.exitFullscreen') : t('tmdbIntegration.fullscreen')}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                  <span className="sr-only">{isFullscreen ? t('tmdbIntegration.exitFullscreen') : t('tmdbIntegration.fullscreen')}</span>
                </Button>
              </div>
            </DialogHeader>

            {/* 主要内容区域 */}
            {renderInTabContent()}
        </DialogContent>
      </Dialog>
      )}

      {/* 修复Bug对话框 */}
      <FixTMDBImportBugDialog
        open={showFixBugDialog}
        onOpenChange={setShowFixBugDialog}
      />

      {/* 复制反馈 */}
      {copyFeedback && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-up">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{copyFeedback}</span>
          </div>
        </div>
      )}
    </>
  )
}

  
