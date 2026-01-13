"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/common/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/common/tabs"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/common/card"
import { ScrollArea } from "@/components/common/scroll-area"
import { Button } from "@/components/common/button"
import { Input } from "@/components/common/input"
import { Label } from "@/components/common/label"
import { Badge } from "@/components/common/badge"
import { useToast } from "@/components/common/use-toast"
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
  Save,
  Minimize2,
  Maximize2,
  Activity as ActivityIcon,
  Square,
  CircleDashed
} from "lucide-react"
import path from "path"

// 导入新版表格组件
import { NewTMDBTable } from "@/components/features/media/new-tmdb-table"
import { TMDBItem } from "@/lib/data/storage"
import { parseCsvContent, serializeCsvData, processOverviewColumn, CSVData } from "@/lib/data/csv-processor-client"
import { validateCsvData, fixCsvData } from "@/lib/data/csv-validator"
import FixTMDBImportBugDialog from "../dialogs/fix-tmdb-import-bug-dialog"
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
  const [selectedSeason, setSelectedSeason] = useState<number>(1)
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

  const [displayedTMDBCommand, setDisplayedTMDBCommand] = useState("")
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
    return `python -m tmdb-import "${platformUrl}"`
  }

  // 生成TMDB抓取命令
  const generateTMDBCommand = (season: number) => {
    if (!item || !item.tmdbId || item.mediaType !== "tv") return ""
    const language = "zh-CN"

    // 确定Python命令：优先使用服务端配置，否则根据平台选择默认命令
    let python = pythonCmd && pythonCmd.trim() ? pythonCmd : (process.platform === "win32" ? "python" : "python3");

    // 确保URL格式正确，移除多余的引号
    const tmdbUrl = `https://www.themoviedb.org/tv/${item.tmdbId}/season/${season}?language=${language}`

    // 返回完整的命令字符串
    return `${python} -m tmdb-import "${tmdbUrl}"`
  }

  // 更新显示的命令
  const updateDisplayedCommands = useCallback(() => {
    const tmdbCommand = generateTMDBCommand(selectedSeason)
    setDisplayedTMDBCommand(tmdbCommand || `python -m tmdb-import "https://www.themoviedb.org/tv/290854/season/${selectedSeason}?language=zh-CN"`)
  }, [selectedSeason, item])

  
  
  
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
        appendTerminalOutput("发送输入失败", "error")
      }
    } catch (error) {
      appendTerminalOutput("发送输入时出错", "error")
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
      appendTerminalOutput("⚠️ 无法发送命令：进程ID未知", "warning");
      return false;
    }

    // 先验证进程是否存在
    const processExists = await checkProcessExists(currentProcessId);
    if (!processExists) {
      appendTerminalOutput(`⚠️ 无法发送命令：进程 ${currentProcessId} 已不存在或已终止`, "warning");
      return false;
    }

    try {
      appendTerminalOutput(`> 发送命令: ${command === "\n" ? "[回车]" : command}`, "info");

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
            appendTerminalOutput(`✓ 命令已发送`, "success");
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP错误: ${response.status}`);
          }
        } catch (error) {
          retryCount++;
          if (retryCount < maxRetries) {
            appendTerminalOutput(`⚠️ 发送失败，正在重试 (${retryCount}/${maxRetries})...`, "warning");
            // 等待一段时间再重试
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }
      return success;
    } catch (error) {
      appendTerminalOutput(`❌ 发送命令失败: ${error instanceof Error ? error.message : "未知错误"}`, "error");

      // 显示帮助信息
      appendTerminalOutput("💡 提示: 如果命令无法发送，请尝试重启应用或检查终端进程状态", "info");
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
        throw new Error("无法获取响应流")
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
                appendTerminalOutput(`✅ 进程已启动 (PID: ${data.processId})`, "success")
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
                appendTerminalOutput(`检测到Edge浏览器会话创建失败，可能需要关闭现有Edge进程`, "warning")
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
        appendTerminalOutput("⚠️ 警告: 未收到进程ID，交互功能可能不可用", "warning")
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
        appendTerminalOutput("命令执行已终止", "info")
        return { success: false, error: "用户取消", errorText: "用户取消", stdoutText: "" }
      }
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      appendTerminalOutput(`执行错误: ${errorMessage}`, "error")
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
      appendTerminalOutput("⚠️ 没有正在运行的进程", "warning");
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
        appendTerminalOutput(`✓ 进程 ${currentProcessId} 已终止`, "success");
        setIsExecutingCommand(false);
        setCurrentProcessId(null);
      } else {
        appendTerminalOutput(`✗ ${data.error}`, "error");
      }
    } catch (error) {
      appendTerminalOutput(`✗ 终止进程时出错: ${error instanceof Error ? error.message : "未知错误"}`, "error");
    }
  }

  // 从CSV文件读取数据
  const readCSVFile = async (workingDirectory: string): Promise<boolean> => {
    try {
            
      try {
        // 使用API路由读取CSV文件

        // 使用try-catch包裹axios请求，防止错误传播到控制台
        try {
        const response = await axios.post('/api/csv/read', { workingDirectory });

        if (!response.data.success) {
          throw new Error(response.data.error || '读取CSV文件失败');
        }

        const csvData = response.data.data;
        
        // 确保数据格式正确 - 新API返回数组，需要转换为期望的格式
        const formattedCsvData = Array.isArray(csvData) ? { rows: csvData } : csvData;
        
        // 验证CSV数据
        const validation = validateCsvData(formattedCsvData);
        if (!validation.valid) {
          
          // 尝试修复CSV数据
          const fixedData = fixCsvData(formattedCsvData);
          setCsvData(fixedData);

          // 保存修复后的CSV数据
          await axios.post('/api/csv/save', {
            filePath: path.join(workingDirectory, 'import.csv'),
            data: fixedData
          });

          appendTerminalOutput(`CSV数据已自动修复并保存，原因: ${validation.errors.join(', ')}`, "warning");
        } else {
          setCsvData(formattedCsvData);
        }

        // 生成CSV内容用于显示
        const content = serializeCsvData(csvData);
        setCsvContent(content);

        appendTerminalOutput("CSV文件读取成功", "success");
        
        
        return true;
        } catch (axiosError: any) {
          // 特殊处理404错误（文件不存在）
          if (axiosError.response && axiosError.response.status === 404) {
            const errorMessage = '未找到CSV文件。请先运行平台元数据抓取命令生成CSV文件。';
            appendTerminalOutput(errorMessage, "error");
            appendTerminalOutput("提示：切换到\"处理\"标签页，使用上方的TMDB导入命令抓取元数据。", "info");
            appendTerminalOutput("1. 首先运行播出平台命令获取基本信息", "info");
            appendTerminalOutput("2. 然后运行TMDB命令获取详细元数据", "info");
            appendTerminalOutput("3. 命令执行成功后会自动生成import.csv文件", "info");

            // 静默处理错误，不抛出异常
            
          } else if (axiosError.message && axiosError.message.includes('文件不存在')) {
            const errorMessage = '未找到CSV文件。请先运行平台元数据抓取命令生成CSV文件。';
            appendTerminalOutput(errorMessage, "error");
            appendTerminalOutput("提示：切换到\"处理\"标签页，使用上方的TMDB导入命令抓取元数据。", "info");
            appendTerminalOutput("1. 首先运行播出平台命令获取基本信息", "info");
            appendTerminalOutput("2. 然后运行TMDB命令获取详细元数据", "info");
            appendTerminalOutput("3. 命令执行成功后会自动生成import.csv文件", "info");

            // 静默处理错误，不抛出异常
            
          } else {
            // 其他错误
            const errorMessage = axiosError.message || '未知错误';
            appendTerminalOutput(`读取CSV文件失败: ${errorMessage}`, "error");
            
          }

          return false;
        }
      } catch (error: any) {
        // 捕获并处理所有其他错误

        appendTerminalOutput(`读取CSV文件过程中出错: ${error.message || '未知错误'}`, "error");
        return false;
      }
    } catch (outerError: any) {
      // 捕获所有可能的外部错误

      appendTerminalOutput("读取CSV文件时出现未预期的错误，请检查控制台日志", "error");
      return false;
    } finally {
          }
  };

  
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
        title: "操作被阻止",
        description: `当前已有操作 ${operationLock} 在进行中，请等待完成`,
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
        if (result.error === "用户取消") {
          appendTerminalOutput(`播出平台数据抓取已终止`, "info");
          return
        }
        appendTerminalOutput(`播出平台数据抓取失败，错误信息: ${result.errorText || "未知错误"}`, "error");
        return
      }

      appendTerminalOutput("播出平台数据抓取完成", "success")

      // Step 2: CSV file check
      const csvRead = await readCSVFile(savedTmdbImportPath)
      if (csvRead) {
        try {
          appendTerminalOutput("CSV文件读取完成", "success")
        } catch (error) {

          appendTerminalOutput("CSV文件读取完成", "success")
        }

         // 默认显示表格视图
        setEditorMode("enhanced") // 默认使用增强编辑器
        appendTerminalOutput("💡 现在可以在CSV文件管理中查看和编辑文件", "info")
      } else {
        appendTerminalOutput("CSV文件读取失败", "error")
      }
    } catch (error) {

      appendTerminalOutput(`处理出错: ${error instanceof Error ? error.message : "未知错误"}`, "error")
    } finally {
      // 释放操作锁
      setOperationLock(null);
      
      // 自动跳转到处理页面
      setActiveTab("process")
    }
  }

  
  // 通用错误处理辅助函数
  const handleSaveError = (error: any, appendTerminalOutput: (text: string, type: "info" | "success" | "error" | "warning" | "stdout" | "stderr") => void, toast: any) => {
    // 提供更友好的错误消息
    let errorMessage = error.message || '未知错误';
    let errorTitle = "保存失败";

    // 处理特定类型的错误
    if (errorMessage.includes('无法验证文件是否写入')) {
      errorMessage = '无法确认文件是否成功保存。请检查文件权限和磁盘空间。';
      errorTitle = "验证失败";
    } else if (errorMessage.includes('EACCES')) {
      errorMessage = '没有足够的权限写入文件。请检查文件权限设置。';
      errorTitle = "权限错误";
    } else if (errorMessage.includes('ENOSPC')) {
      errorMessage = '磁盘空间不足，无法保存文件。';
      errorTitle = "存储错误";
    }

    appendTerminalOutput(`保存CSV文件失败: ${errorMessage}`, "error");
    toast({
      title: errorTitle,
      description: `保存操作未完成: ${errorMessage}`,
      variant: "destructive",
      duration: 5000,
    });

    return { errorMessage, errorTitle };
  };

  // 统一的CSV保存函数
  const saveCSV = async (options: {
    mode: "enhanced" | "text",
    onSuccess?: (message: string) => void,
    showSuccessNotification?: boolean,
    skipDataParsing?: boolean
  }): Promise<boolean> => {
    try {
      if (!csvData) {
        toast({
          title: "错误",
          description: "没有CSV数据可保存",
          variant: "destructive",
        });
        return false;
      }

      // 设置保存中状态，提供视觉反馈
      setIsSaving(true);
      const saveMessage = options.mode === "enhanced" ? "正在保存增强型CSV编辑器的更改..." : "正在保存CSV文件...";
      appendTerminalOutput(saveMessage, "info");

      // 获取当前工作目录（兼容服务端配置回填）
      const tmdbImportPath = await getTmdbImportPath();
      if (!tmdbImportPath) {
        throw new Error("未找到TMDB-Import工具路径");
      }

      const importCsvPath = path.join(tmdbImportPath, 'import.csv');

      // 处理数据准备
      let dataToSave = csvData;
      if (options.mode === "text") {
        // 文本模式总是优先使用当前文本内容
        if (!options.skipDataParsing && csvContent !== undefined) {
          try {
            // 解析文本内容为CSV数据
            dataToSave = parseCsvContent(csvContent);
            // 更新组件状态中的CSV数据，确保其他功能也能使用最新数据
            setCsvData(dataToSave);
            appendTerminalOutput("成功解析文本内容为CSV数据", "success");
          } catch (error: any) {
            throw new Error(`CSV文本格式有误，无法解析: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        } else if (csvContent === undefined || csvContent.trim() === '') {
          // 如果文本内容为空，使用原始数据
          appendTerminalOutput("文本内容为空，使用现有CSV数据", "warning");
        }
      }

      // 处理overview列，确保格式正确
      const processedData = processOverviewData(dataToSave);

      // 使用API路由保存CSV文件
      const response = await axios.post('/api/csv/save', {
        filePath: importCsvPath,
        data: processedData
      });

      if (!response.data.success) {
        throw new Error(response.data.error || '保存CSV文件失败');
      }

      // 确保文件确实被写入
      const verifyResponse = await axios.post('/api/csv/verify', {
        filePath: importCsvPath
      });

      if (!verifyResponse.data.success || !verifyResponse.data.exists) {
        throw new Error('文件保存失败：无法验证文件是否写入');
      }

      appendTerminalOutput(`CSV文件已成功保存到 ${importCsvPath}`, "success");

      // 成功处理
      if (options.showSuccessNotification !== false) {
        toast({
          title: "保存成功",
          description: options.mode === "enhanced" ? "CSV文件已保存，可以继续操作" : "CSV文件已保存，修改已应用",
          ...(options.mode === "text" && { duration: 3000 }),
        });
      }

      // 调用成功回调
      if (options.onSuccess) {
        options.onSuccess(`CSV文件已成功保存到 ${importCsvPath}`);
      }

      // 对于增强模式，切换到处理标签页
      if (options.mode === "enhanced") {
        setActiveTab("process");
      }

      return true;
    } catch (error: any) {
      handleSaveError(error, appendTerminalOutput, toast);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // 处理整个CSV数据中的overview列
  const processOverviewData = (data: CSVDataType): CSVDataType => {
    if (!data || !data.headers || !data.rows) {
      return data;
    }

    const overviewIndex = data.headers.findIndex((header: string) =>
      header.toLowerCase().includes('overview') ||
      header.toLowerCase().includes('描述') ||
      header.toLowerCase().includes('简介')
    );

    if (overviewIndex === -1) {
      return data;
    }

    // 处理每一行的overview列
    const processedRows = data.rows.map((row: string[]) => {
      const newRow = [...row];
      if (newRow[overviewIndex]) {
        newRow[overviewIndex] = processOverviewColumn(newRow[overviewIndex]);
      }
      return newRow;
    });

    return {
      ...data,
      rows: processedRows
    };
  };

  // 统一的编码修复函数
  const fixEncoding = (text: string, preserveCsvStructure: boolean = true): string => {
    try {
      // 检查是否需要修复
      if (!/[\u00e0-\u00ff]{2,}|[\ufffd]/.test(text)) {
        return text; // 没有明显的乱码特征，直接返回
      }

      let result = text;

      // 简单修复UTF-8被错误解析为Latin1的情况
      try {
        if (/[\u00e0-\u00ef][\u00bc-\u00bf][\u0080-\u00bf]/.test(text)) {
          result = decodeURIComponent(escape(text));
        }
      } catch (e) {
        // 如果简单修复失败，继续使用复杂修复
      }

      // 如果需要保护CSV结构，使用高级修复逻辑
      if (preserveCsvStructure) {
        // 特殊字符替换映射表 - 不包含可能影响CSV结构的字符
        const specialCharMap: Record<string, string> = {
          "\ufffd": "", // Unicode替换字符，通常表示无法解码的字符
          "Â": "",      // 常见乱码前缀
          "â": "",      // 常见乱码前缀
          "Ã": "",      // 常见乱码前缀
          "ã": "",      // 常见乱码前缀
          "Å": "",      // 常见乱码前缀
          "å": "",      // 常见乱码前缀
          // 可以根据需要添加更多映射
        };

        // 分行处理，保护CSV结构
        const lines = result.split('\n');
        const fixedLines = lines.map(line => {
          // 使用引号状态追踪器来防止修改引号内的逗号
          let insideQuotes = false;
          let processedLine = '';

          for (let i = 0; i < line.length; i++) {
            const char = line[i];

            // 追踪引号状态
            if (char === '"') {
              // 检查是否是转义引号 ("")
              if (i + 1 < line.length && line[i + 1] === '"') {
                processedLine += '""'; // 保留转义引号
                i++; // 跳过下一个引号
              } else {
                insideQuotes = !insideQuotes;
                processedLine += char;
              }
            }
            // 保护逗号，特别是引号内的逗号
            else if (char === ',') {
              processedLine += char; // 总是保留逗号，它们是CSV结构的关键
            }
            // 处理可能的乱码字符
            else if (!insideQuotes && Object.keys(specialCharMap).includes(char)) {
              processedLine += specialCharMap[char] || char;
            }
            // 尝试修复UTF-8错误解析为Latin1的情况，但只在非引号内时
            else if (!insideQuotes && /[\u00e0-\u00ff]{2}/.test(char + (line[i+1] || ''))) {
              try {
                // 只处理当前字符，避免越界
                const fixed = decodeURIComponent(escape(char));
                if (fixed && fixed !== char) {
                  processedLine += fixed;
                } else {
                  processedLine += char;
                }
              } catch {
                processedLine += char;
              }
            }
            // 其他字符保持不变
            else {
              processedLine += char;
            }
          }

          return processedLine;
        });

        return fixedLines.join('\n');
      }

      return result;
    } catch (e) {

    }

    // 如果所有方法都失败，返回原文本
    return text;
  };

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
    return await saveCSV({ mode: "enhanced" });
  };

  // 保存CSV文本编辑器修改
  const saveCsvChanges = async () => {
    // 确保保存当前文本内容
    const result = await saveCSV({
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
      setCopyFeedback(`${type}已复制`)
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
        title: "操作被阻止",
        description: `当前已有操作 ${operationLock} 在进行中，请等待完成`,
        variant: "destructive",
      });
      return;
    }

    // 设置当前操作锁为"tmdb"
    setOperationLock("tmdb");

    try {
      // 更新UI状态
      appendTerminalOutput("准备执行TMDB导入命令...", "info");

      // 获取TMDB-Import工具路径（兼容服务端配置回填）
      const tmdbImportPath = await getTmdbImportPath();
      if (!tmdbImportPath) {
        appendTerminalOutput("未找到TMDB-Import工具路径，请先配置", "error");
        toast({
          title: "配置缺失",
          description: "未找到TMDB-Import工具路径，请在设置中配置",
          variant: "destructive",
        });
        return;
      }

      // 生成TMDB导入命令
      const tmdbCommand = generateTMDBCommand(selectedSeason);
      if (!tmdbCommand) {
        appendTerminalOutput("生成TMDB命令失败，请检查剧集ID和季数", "error");
        return;
      }

      // 解析命令，提取TMDB URL参数
      const cmdParts = tmdbCommand.split(' ');
      if (cmdParts.length < 3) {
        appendTerminalOutput("命令格式错误", "error");
        return;
      }

      // 提取URL参数部分
      const tmdbUrl = cmdParts[cmdParts.length - 1];

      // 构建完整的命令字符串，让服务器端API来处理环境检测和命令构建
      // 使用通用的cd命令格式，让API端点根据实际运行环境来调整
      const fullCommand = `cd "${tmdbImportPath}" && python -m tmdb-import ${tmdbUrl}`;

      // 在页面日志中显示将要执行的命令
      appendTerminalOutput(`将在页面终端执行命令: ${fullCommand}`, "info");

      // 直接在页面内部执行命令，使用流式输出
      const result = await executeCommandWithStream(fullCommand, process.cwd());

      // 根据执行结果更新状态
      if (result.success) {
        appendTerminalOutput("TMDB导入命令执行成功", "success");
        toast({
          title: "命令已执行",
          description: "TMDB导入命令已成功执行",
        });
      } else {
        // 如果是用户主动终止，不显示为错误
        if (result.error === "用户取消") {
          appendTerminalOutput("TMDB导入命令已终止", "info");
          toast({
            title: "命令已终止",
            description: "TMDB导入命令已被终止",
          });
        } else {
          const errorMsg = result.errorText || "未知错误";
          appendTerminalOutput(`TMDB导入命令执行失败: ${errorMsg}`, "error");
          toast({
            title: "执行失败",
            description: "TMDB导入命令执行失败，请查看终端输出了解详细信息",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {

      appendTerminalOutput(`执行出错: ${error.message || '未知错误'}`, "error");
      toast({
        title: "执行出错",
        description: error.message || "未知错误",
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
          title: "编码已修复",
          description: "已自动修复CSV文本中的中文乱码",
        })
      }

      appendTerminalOutput("已切换到文本模式，使用Ctrl+S快速保存更改", "info");
    }
    // 如果从文本模式切换到表格模式，需要尝试解析文本为csvData
    else if (mode !== "text" && editorMode === "text" && csvContent.trim()) {
      try {
        // 解析CSV文本为数据
        const newData = parseCsvContent(csvContent)
        setCsvData(newData)
        appendTerminalOutput("已将文本内容解析为表格数据", "success");
      } catch (error) {
        // 如果解析失败，显示错误提示但仍然切换模式
        toast({
          title: "CSV格式错误",
          description: "文本内容解析失败，可能包含无效的CSV格式，请检查并修复",
          variant: "destructive",
        })
        appendTerminalOutput("文本解析失败，可能包含无效的CSV格式，请检查并修复", "error");
        // 尝试恢复为上一次可用的CSV数据
        if (csvData) {
          const recoveredText = serializeCsvData(csvData);
          setCsvContent(recoveredText);
          appendTerminalOutput("已恢复为上一次有效的数据", "info");
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
        title: "编码已修复",
        description: "已修复CSV文本中的中文乱码",
      })
    } else {
      toast({
        title: "无需修复",
        description: "未检测到中文乱码或无法修复",
      })
    }
  }

  // 格式化CSV内容
  const formatCsvContent = () => {
    if (!csvContent) return

    try {
      // 解析当前CSV内容
      const parsedData = parseCsvContent(csvContent)
      // 重新序列化为格式化的CSV文本
      const formattedCsvText = serializeCsvData(parsedData)
      setCsvContent(formattedCsvText)

      toast({
        title: "格式化成功",
        description: "CSV内容已格式化",
        variant: "default",
      })
    } catch (error) {
      
      toast({
        title: "格式化失败",
        description: "CSV内容格式不正确，无法格式化",
        variant: "destructive",
      })
    }
  }

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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 添加紧凑模式状态
  const [isCompactMode, setIsCompactMode] = useState(false); // 默认使用标准模式

  // 不再自动设置紧凑模式，始终保持标准模式
  useEffect(() => {
    // 确保始终使用标准模式
    setIsCompactMode(false);
    // 不再根据inTab状态切换模式
  }, []);

  // 调试函数
  // 确保表格组件只有在完全准备好后才会渲染
  useEffect(() => {
    if (csvData && (activeTab === "edit" || inTab)) {
      // 表格组件现在直接渲染，不需要延迟加载
      
    }
  }, [csvData, activeTab, inTab])

  // 在inTab模式下自动尝试加载CSV数据
  useEffect(() => {
    const loadCsvData = async () => {
      if (inTab && !csvData) {
        
        const savedTmdbImportPath = await getTmdbImportPath();
        if (savedTmdbImportPath) {
          try {
            // 使用readCSVFile函数加载CSV数据
            // 由于readCSVFile已经处理了所有错误，这里不需要再捕获错误
            const result = await readCSVFile(savedTmdbImportPath);
            if (result) {
              
              // 不再自动切换到编辑标签
              // setActiveTab("edit");

              // 确保处理标签页内容正确显示
              if (activeTab === "process") {
                
              }
            } else {

              // 在加载失败的情况下，初始化处理标签页
              setActiveTab("process");
            }
          } catch (error) {
            // 这里应该不会执行到，因为readCSVFile已经处理了所有错误
            // 但为了安全起见，我们仍然保留这个捕获块
            console.log("加载CSV数据时出错 (应该不会发生)");
            setActiveTab("process");
          }
        } else {
          
          setActiveTab("process");
        }
      }
    };

    // 使用顶层try-catch包裹loadCsvData调用，确保不会有未捕获的错误
    (async () => {
      try {
        await loadCsvData();
      } catch (error) {
        // 捕获所有可能的错误，防止它们传播到控制台
        
      }
    })();
  }, [inTab, csvData]);

  // 添加标签切换处理器
  const handleTabChange = (value: string) => {
    
    // 如果点击的是当前已激活的标签，不做任何操作
    if (value === activeTab) {
      
      return;
    }

    setActiveTab(value)

    // 如果切换到处理标签页，确保表格状态正确
    if (value === "process") {
      
    }
    // 如果切换到编辑标签页，增加渲染计数以强制刷新内容
    else if (value === "edit") {
      
      // 确保有CSV数据可供编辑
      if (!csvData) {
        
        (async () => {
          try {
            const savedTmdbImportPath = await getTmdbImportPath();
            if (savedTmdbImportPath) {
              const success = await readCSVFile(savedTmdbImportPath);
                              if (success) {
                                
                              }
                          }
                        } catch (error) {
                          
                        }
                      })();
                    } else {
                      // 已有CSV数据，直接刷新编辑页面
                      
                    }    }
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
                处理
              </TabsTrigger>
              <TabsTrigger value="edit" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                编辑
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
                  TMDB导入命令
                  </CardTitle>
                </CardHeader>
              <CardContent>
                {/* 命令显示区域 */}
                <div className="bg-gray-900/90 text-green-400 p-3 rounded-md text-xs overflow-hidden w-full min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2 overflow-hidden">
                      <div className="font-mono text-xs"
                           style={{
                             textOverflow: 'ellipsis !important',
                             whiteSpace: 'nowrap !important',
                             overflow: 'hidden !important',
                             width: '100% !important',
                             maxWidth: '100%'
                           }}
                           title={generatePlatformCommand() || `python -m tmdb-import "${platformUrl || '请输入播出平台URL'}"`}>
                        {generatePlatformCommand() || `python -m tmdb-import "${platformUrl || '请输入播出平台URL'}"`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6"
                      onClick={() => copyToClipboard(generatePlatformCommand(), "播出平台命令")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2 overflow-hidden">
                      <div className="font-mono text-xs"
                           style={{
                             textOverflow: 'ellipsis !important',
                             whiteSpace: 'nowrap !important',
                             overflow: 'hidden !important',
                             width: '100% !important',
                             maxWidth: '100%'
                           }}
                           title={displayedTMDBCommand || `python -m tmdb-import "https://www.themoviedb.org/tv/290854/season/${selectedSeason}?language=zh-CN"`}>
                        {displayedTMDBCommand || `python -m tmdb-import "https://www.themoviedb.org/tv/290854/season/${selectedSeason}?language=zh-CN"`}
                      </div>
                    </div>
                                <Button
                      variant="ghost"
                      size="sm"
                      className="h-6"
                      onClick={() => copyToClipboard(generateTMDBCommand(selectedSeason), "TMDB命令")}
                    >
                      <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                </div>

                {/* 配置和按钮区域 */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {/* 左侧：URL和季数配置 */}
                  <div className="space-y-2">
                  <div>
                      <Label htmlFor="platform-url-tab" className="text-xs">播出平台URL</Label>
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
                        <Label className="text-xs">TMDB季</Label>
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
            </div>
          </div>

                  {/* 右侧：按钮区域 */}
                  <div className="flex flex-col justify-end space-y-2">
                    {/* 刷新按钮 */}
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
                        播出平台抓取
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
                        执行TMDB导入
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
                    终端输出
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
                      刷新数据
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={terminateProcess}
                      disabled={!isExecutingCommand}
                      className="h-7 text-xs"
                      title="终止正在运行的命令"
                    >
                      <Square className="h-3.5 w-3.5 mr-1" />
                      终止
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
                      <p>等待开始处理...</p>
                      <p className="mt-2">您可以:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>点击"播出平台抓取"开始处理</li>
                        <li>点击"执行TMDB导入"更新已有CSV数据</li>
                        <li>如果内容不显示，点击"刷新视图"按钮</li>
                        <li>如果需要加载已有CSV，点击"刷新数据"按钮</li>
                      </ul>
                      <p className="mt-2">注意: 首次使用需要先配置TMDB-Import工具路径</p>
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
                          正在执行命令...
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
                          确认
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => sendQuickCommand("w")}
                          disabled={!isExecutingCommand || !currentProcessId}
                          className="bg-yellow-600 hover:bg-yellow-700 h-7 text-xs"
                        >
                          <CircleDashed className="h-3 w-3 mr-1" />
                          等待
                        </Button>
                        <Button
                          variant="default"
                      size="sm"
                          onClick={() => sendQuickCommand("n")}
                          disabled={!isExecutingCommand || !currentProcessId}
                          className="bg-red-600 hover:bg-red-700 h-7 text-xs"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          取消
                        </Button>
                              </div>
                    </div>

                    {/* 终端输入 */}
                    <div className="mt-2 flex items-center space-x-2">
                      <Input
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        placeholder="输入命令..."
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
          className="h-full p-0 m-0 bg-transparent w-full"
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
                      表格模式
                    </Button>
                    <Button
                      variant={editorMode === "text" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleEditorModeChange("text")}
                      className="h-7 px-2 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      文本模式
                    </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveCsvChanges}
                  disabled={isSaving}
                  className="h-7 px-2 text-xs"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1" />
                  )}
                  保存
                </Button>
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
                      />
              ) : editorMode === "text" ? (
                <div className="flex-1 min-h-0 p-4">
                  <textarea
                    ref={textareaRef}
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-full font-mono text-sm resize-none focus:outline-none bg-transparent"
                    placeholder="CSV内容..."
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
        appendTerminalOutput("正在加载本地CSV文件...", "info");
        const result = await readCSVFile(savedTmdbImportPath);
        if (result) {
          appendTerminalOutput("本地CSV文件加载成功", "success");
          toast({
            title: "加载成功",
            description: "本地CSV文件已成功加载",
          });
                  } else {
          appendTerminalOutput("加载本地CSV文件失败", "error");
          toast({
            title: "加载失败",
            description: "未能加载本地CSV文件",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        
        appendTerminalOutput(`加载CSV文件时出错: ${error.message || "未知错误"}`, "error");
        toast({
          title: "加载错误",
          description: error.message || "未知错误",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "路径未配置",
        description: "请先在设置中配置TMDB-Import工具路径",
        variant: "destructive",
      });
      appendTerminalOutput("未找到TMDB-Import工具路径，请先配置", "error");
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

    // 更新显示的TMDB命令
    const tmdbCommand = generateTMDBCommand(season)
    setDisplayedTMDBCommand(tmdbCommand || `python -m tmdb-import "https://www.themoviedb.org/tv/290854/season/${season}?language=zh-CN"`)
  }

  // 在组件挂载和item变化时初始化命令显示
  useEffect(() => {
    updateDisplayedCommands()
  }, []) // 移除依赖，只在组件挂载时执行一次

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
                <span>TMDB-Import 本地集成</span>
                <Badge variant="outline">{item.title}</Badge>
                <Badge variant={activeTab === "process" ? "default" : "outline"} className="ml-2 text-xs">
                  {activeTab === "process" ? "处理模式" : "编辑模式"}
                </Badge>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? '退出全屏' : '全屏'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                  <span className="sr-only">{isFullscreen ? '退出全屏' : '全屏'}</span>
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

  
