"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useMediaQuery } from "@/hooks/use-media-query"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Drawer, 
  DrawerContent, 
  DrawerDescription, 
  DrawerFooter, 
  DrawerHeader, 
  DrawerTitle 
} from "@/components/ui/drawer"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  Terminal, 
  Play, 
  Square, 
  Copy, 
  Check, 
  Download, 
  FileText,
  AlignLeft,
  CheckSquare,
  Languages,
  Loader2,
  Settings,
  Wrench,
  Zap,
  RefreshCw,
  Bug,
  Send,
  Table as TableIcon,
  Info,
  Plus,
  Save,
  Undo,
  MessageSquare,
  ChevronDown,
  X,
  Search,
  ChevronLeft,
  Minimize2,
  Maximize2,
  Maximize,
  Minimize,
  Activity as ActivityIcon,
  Trash,
  AlertTriangle,
  CircleDashed,
  AlignHorizontalJustifyCenter
} from "lucide-react"
import path from "path"

// 导入新版表格组件
import { NewTMDBTable, type NewTMDBTableProps } from "@/components/new-tmdb-table"
import { TMDBItem } from "@/lib/storage"
import { parseCsvContent, serializeCsvData, processOverviewColumn, repairCsvData, fixColumnMisalignment, CSVData as CSVDataType } from "@/lib/csv-processor-client"
import { validateCsvData, fixCsvData } from "@/lib/csv-validator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import FixTMDBImportBugDialog from "./fix-tmdb-import-bug-dialog"
import axios from "axios"

// 定义显式空值标记常量
export const EXPLICIT_EMPTY_VALUE = "__EMPTY__"

interface TMDBImportIntegrationDialogProps {
  item: TMDBItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemUpdate?: (item: TMDBItem) => void
  inTab?: boolean // 是否在标签页中显示
}

interface ImportStep {
  id: string
  title: string
  description: string
  status: "pending" | "running" | "completed" | "error" | "skipped"
  output?: string
  error?: string
}

// 重用从csv-processor导入的CSVDataType类型
type CSVData = CSVDataType;

// 处理步骤配置
const STEPS: ImportStep[] = [
  {
    id: "platform-extract",
    title: "播出平台抓取",
    description: "从播出平台抓取元数据并生成import.csv",
    status: "pending",
  },
  {
    id: "csv-review",
    title: "CSV文件检查",
    description: "检查和编辑生成的import.csv文件",
    status: "pending",
  },
  {
    id: "tmdb-import",
    title: "TMDB导入",
    description: "从TMDB获取剧集数据并更新CSV",
    status: "pending",
  },
]

export default function TMDBImportIntegrationDialog({ item, open, onOpenChange, onItemUpdate, inTab = false }: TMDBImportIntegrationDialogProps) {
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [displayedTMDBCommand, setDisplayedTMDBCommand] = useState("")
  const [activeTab, setActiveTab] = useState<string>("process") // 默认显示处理标签
  // 添加一个标记记录组件是否已初始化
  const [isDialogInitialized, setIsDialogInitialized] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<ImportStep[]>([...STEPS])
  const [csvData, setCsvData] = useState<CSVData | null>(null)
  const [csvContent, setCsvContent] = useState<string>("")
  const [showCsvEditor, setShowCsvEditor] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState("")
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const [platformUrl, setPlatformUrl] = useState(item.platformUrl || "")
  const [isExecutingCommand, setIsExecutingCommand] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [terminalInput, setTerminalInput] = useState("")
  const [commandTimeout, setCommandTimeout] = useState(300000) // 5分钟默认超时
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [showFixBugDialog, setShowFixBugDialog] = useState(false)
  const [hasNoneTypeError, setHasNoneTypeError] = useState(false)
  const [editorMode, setEditorMode] = useState<"enhanced" | "text">("enhanced")
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [, setForceUpdateValue] = useState(0)
  const forceUpdate = () => setForceUpdateValue(val => val + 1)
  // 添加操作锁，防止按钮互相触发
  const [operationLock, setOperationLock] = useState<string | null>(null)
  // 添加处理页面渲染计数器
  const [processTabRenderCount, setProcessTabRenderCount] = useState(0)
  // 添加编辑标签页渲染计数器
  const [editTabRenderCount, setEditTabRenderCount] = useState(0)
  // 添加表格加载状态
  const [tableReady, setTableReady] = useState(false)
  // 判断是否为Windows环境（根据浏览器 userAgent 或 Node process.platform）
  const isWindows: boolean = typeof navigator !== 'undefined' ? /Windows/i.test(navigator.userAgent) : (typeof process !== 'undefined' && process.platform === 'win32');

  // 计算行号区域的宽度
  const getLineNumbersWidth = (lineCount: number) => {
    // 根据行数计算行号区域的宽度，增加宽度以避免文本遮挡
    if (lineCount < 100) return 60; // 1-99行
    if (lineCount < 1000) return 70; // 100-999行
    if (lineCount < 10000) return 80; // 1000-9999行
    return 90; // 10000+行
  };

  // 计算编辑器的最佳高度
  const calculateOptimalEditorHeight = useCallback(() => {
    if (typeof window !== 'undefined') {
      // 获取视窗高度
      const viewportHeight = window.innerHeight;
      // 预留顶部导航栏、工具栏等元素的空间
      const reservedSpace = 100; // 减少预留空间，增加编辑器高度
      // 计算可用高度，并留出一点底部边距
      const availableHeight = viewportHeight - reservedSpace - 5; // 减少底部边距
      // 确保最小高度不低于800px
      return Math.max(800, availableHeight);
    }
    return 800; // 增加默认高度
  }, []);

  // 在组件中添加行号宽度的状态
  const [lineNumbersWidth, setLineNumbersWidth] = useState(50);
  // 添加编辑器高度状态
  const [editorHeight, setEditorHeight] = useState(calculateOptimalEditorHeight());

  // 在csvContent变化时更新行号宽度
  useEffect(() => {
    const lineCount = csvContent.split('\n').length;
    setLineNumbersWidth(getLineNumbersWidth(lineCount));
  }, [csvContent]);

  // 监听窗口大小变化，动态调整编辑器高度
  useEffect(() => {
    const handleResize = () => {
      setEditorHeight(calculateOptimalEditorHeight());
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      // 初始化时计算一次
      handleResize();
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [calculateOptimalEditorHeight]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  // 检测错误类型
  useEffect(() => {
    if (lastError && lastError.includes("TypeError: argument of type 'NoneType' is not iterable")) {
      setHasNoneTypeError(true)
    }
  }, [lastError])
  
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
    
    // 获取存储的Python命令（如果有）
    const storedPythonCmd = localStorage.getItem("python_command");
    
    // 确定Python命令：优先使用存储的命令，否则根据平台选择默认命令
    let pythonCmd = storedPythonCmd;
    if (!pythonCmd) {
      // 在Windows环境下，直接使用python命令（Windows通常不使用python3命令）
      // 在其他平台上，优先使用python3
      pythonCmd = process.platform === "win32" ? "python" : "python3";
    }
    
    // 确保URL格式正确，移除多余的引号
    const tmdbUrl = `https://www.themoviedb.org/tv/${item.tmdbId}/season/${season}?language=${language}`
    
    // 返回完整的命令字符串
    return `${pythonCmd} -m tmdb-import "${tmdbUrl}"`
  }
  
  // 更新显示的命令
  const updateDisplayedCommands = useCallback(() => {
    const tmdbCommand = generateTMDBCommand(selectedSeason)
    setDisplayedTMDBCommand(tmdbCommand || `python -m tmdb-import "https://www.themoviedb.org/tv/290854/season/${selectedSeason}?language=zh-CN"`)
  }, [selectedSeason, item])

  // 检测错误类型并提供解决方案
  const analyzeError = (errorText: string) => {
    if (errorText.includes("TypeError: argument of type 'NoneType' is not iterable")) {
      return {
        type: "code_bug",
        title: "TMDB-Import代码错误",
        description: "检测到episode.name为None时的类型错误",
        solutions: [
          "这是TMDB-Import工具的一个已知bug",
          "需要修改common.py文件中的filter_by_name函数",
          "建议联系TMDB-Import项目维护者报告此问题",
        ],
        fixCode: `# 在 common.py 的 filter_by_name 函数中修改第83行:
# 原代码: if word and word in episode.name:
# 修改为: if word and episode.name and word in episode.name:`,
      }
    }

    if (errorText.includes("HTTP 500") || errorText.includes("HTTP 503")) {
      return {
        type: "server_error",
        title: "服务器错误",
        description: "目标网站服务器返回错误",
        solutions: ["检查网站是否可正常访问", "稍后重试", "尝试使用其他URL"],
      }
    }

    if (errorText.includes("timeout") || errorText.includes("超时")) {
      return {
        type: "timeout",
        title: "执行超时",
        description: "命令执行时间过长",
        solutions: ["增加超时时间设置", "检查网络连接", "尝试使用更稳定的网络环境"],
      }
    }

    return null
  }

  // 停止命令执行
  const stopCommandExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  // 发送终端输入
  const sendTerminalInput = async () => {
    if (!terminalInput.trim() || !currentProcessId) return

    try {
      const response = await fetch("/api/send-input", {
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
      const response = await fetch("/api/get-active-processes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      });
      
      if (!response.ok) {
        console.error("获取活跃进程列表失败:", response.status);
        return false;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error("获取活跃进程列表API错误:", data.error);
        return false;
      }
      
      // 检查processId是否在活跃进程列表中
      const isActive = data.processes.includes(pid);
      console.log(`进程 ${pid} 状态检查: ${isActive ? "活跃" : "已终止"}`);
      
      return isActive;
    } catch (error) {
      console.error("检查进程状态时出错:", error);
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
          const response = await fetch("/api/send-input", {
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
    setLastError(null)
    setHasNoneTypeError(false)
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch("/api/execute-command-interactive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command,
          workingDirectory,
          timeout: commandTimeout,
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
                setLastError(data.message)
              }

              if (data.type === "close" && data.exitCode !== 0) {
                hasError = true
                setLastError(errorText)
              }
            } catch (e) {
              // 忽略解析错误
              console.log("解析命令输出时出错:", e)
            }
          }
        }
      }
      
      // 如果没有收到进程ID，显示警告
      if (!processIdReceived) {
        appendTerminalOutput("⚠️ 警告: 未收到进程ID，交互功能可能不可用", "warning")
      }

      // 记录收集到的输出信息
      console.log("命令执行完成，stdout长度:", stdoutText.length, "stderr长度:", errorText.length)
      
      // 返回更完整的结果对象
      return { 
        success: !hasError, 
        errorText, 
        stdoutText,
        hasError
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        appendTerminalOutput("命令执行已取消", "error")
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

  // 从CSV文件读取数据
  const readCSVFile = async (workingDirectory: string): Promise<boolean> => {
    try {
      setIsProcessing(true);
      console.log("开始读取CSV文件，工作目录:", workingDirectory);
      
      try {
        // 使用API路由读取CSV文件
        console.log("发送API请求读取CSV文件");
        // 使用try-catch包裹axios请求，防止错误传播到控制台
        try {
        const response = await axios.post('/api/csv/read', { workingDirectory });
        
        if (!response.data.success) {
          throw new Error(response.data.error || '读取CSV文件失败');
        }
        
        const csvData = response.data.data;
        console.log("成功获取CSV数据:", csvData ? `${csvData.rows.length}行数据` : "无数据");
        
        // 验证CSV数据
        const validation = validateCsvData(csvData);
        if (!validation.valid) {
          console.warn("CSV数据验证失败:", validation.errors);
          
          // 尝试修复CSV数据
          const fixedData = fixCsvData(csvData);
          setCsvData(fixedData);
          
          // 保存修复后的CSV数据
          await axios.post('/api/csv/save', {
            filePath: path.join(workingDirectory, 'import.csv'),
            data: fixedData
          });
          
          appendTerminalOutput(`CSV数据已自动修复并保存，原因: ${validation.errors.join(', ')}`, "warning");
        } else {
          setCsvData(csvData);
        }
        
        // 生成CSV内容用于显示
        const content = serializeCsvData(csvData);
        setCsvContent(content);
        
        appendTerminalOutput("CSV文件读取成功", "success");
        console.log("CSV文件读取成功，已更新状态");
        
        // 确保在处理页面时强制刷新处理页面内容
        if (activeTab === "process") {
          console.log("当前在处理页面，触发处理页面刷新");
          setProcessTabRenderCount(prev => prev + 1);
        }
        
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
            setLastError(errorMessage);
            
            // 静默处理错误，不抛出异常
            console.log("CSV文件不存在，需要先运行平台元数据抓取命令");
          } else if (axiosError.message && axiosError.message.includes('文件不存在')) {
            const errorMessage = '未找到CSV文件。请先运行平台元数据抓取命令生成CSV文件。';
            appendTerminalOutput(errorMessage, "error");
            appendTerminalOutput("提示：切换到\"处理\"标签页，使用上方的TMDB导入命令抓取元数据。", "info");
            appendTerminalOutput("1. 首先运行播出平台命令获取基本信息", "info");
            appendTerminalOutput("2. 然后运行TMDB命令获取详细元数据", "info");
            appendTerminalOutput("3. 命令执行成功后会自动生成import.csv文件", "info");
            setLastError(errorMessage);
            
            // 静默处理错误，不抛出异常
            console.log("CSV文件不存在，需要先运行平台元数据抓取命令");
          } else {
            // 其他错误
            const errorMessage = axiosError.message || '未知错误';
            appendTerminalOutput(`读取CSV文件失败: ${errorMessage}`, "error");
            setLastError(errorMessage);
            console.error("读取CSV文件时出错:", axiosError);
          }
          
          return false;
        }
      } catch (error: any) {
        // 捕获并处理所有其他错误
        console.error("读取CSV文件过程中出错:", error);
        appendTerminalOutput(`读取CSV文件过程中出错: ${error.message || '未知错误'}`, "error");
        setLastError(error.message || '未知错误');
        return false;
      }
    } catch (outerError: any) {
      // 捕获所有可能的外部错误
      console.error("readCSVFile函数出现未预期的错误:", outerError);
      appendTerminalOutput("读取CSV文件时出现未预期的错误，请检查控制台日志", "error");
      setLastError(outerError.message || '未知错误');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理读取到的CSV数据
  const handleCsvDataAfterRead = (csvData: CSVDataType) => {
    console.log("CSV数据加载成功，开始处理")
    
    // 设置CSV数据
    setCsvData(csvData)
    
    // 将csvData对象转换为CSV文本
    const csvText = serializeCsvData(csvData)
    setCsvContent(fixCsvTextEncoding(csvText))
    
    // 更新UI状态
    appendTerminalOutput(`CSV文件读取成功，共${csvData.rows.length}行`, "success");
    updateStepStatus(1, "completed", `成功读取CSV文件，共${csvData.rows.length}行`);
    setShowCsvEditor(true);
    
    // 确保在处理页面时强制刷新处理页面内容
    if (activeTab === "process") {
      console.log("CSV数据加载后，触发处理页面刷新");
      setProcessTabRenderCount(prev => prev + 1);
    }
    // 确保在编辑页面时强制刷新编辑页面内容
    else if (activeTab === "edit") {
      console.log("CSV数据加载后，处于编辑页，触发编辑页面完整刷新");
      
      // 立即设置表格就绪状态
      setTableReady(true);
      
      // 延迟执行以确保DOM更新
      setTimeout(() => {
        forceRefreshEditTab();
      }, 100);
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
      console.log(`操作被阻止：当前已有操作 ${operationLock} 在进行中`);
      toast({
        title: "操作被阻止",
        description: `当前已有操作 ${operationLock} 在进行中，请等待完成`,
        variant: "destructive",
      });
      return;
    }
    
    // 设置当前操作锁为"platform"
    setOperationLock("platform");
    console.log("设置操作锁: platform");

    const savedTmdbImportPath = localStorage.getItem("tmdb_import_path")
    if (!savedTmdbImportPath) {
      alert("请先在设置中配置TMDB-Import工具路径")
      setOperationLock(null);
      console.log("释放操作锁: 未配置TMDB-Import路径");
      return
    }

    if (!platformUrl) {
      alert("请先设置播出平台URL")
      setOperationLock(null);
      console.log("释放操作锁: 未设置平台URL");
      return
    }

    // 操作锁已经设置为"platform"，不需要再设置isProcessing
    setTerminalOutput("")
    setCurrentStep(0)
    setLastError(null)
    setHasNoneTypeError(false)

    // Reset step status
    setSteps(STEPS.map((step) => ({ ...step, status: "pending" })))

    try {
      // Step 1: Platform extraction
      updateStepStatus(0, "running")
      const command = generatePlatformCommand()

      appendTerminalOutput(`切换到工作目录: ${savedTmdbImportPath}`, "info")
      appendTerminalOutput(`执行命令: ${command}`, "info")

      const result = await executeCommandWithStream(command, savedTmdbImportPath)

      if (!result.success) {
        updateStepStatus(0, "error", undefined, "命令执行失败")
        appendTerminalOutput(`播出平台数据抓取失败，错误信息: ${result.errorText || "未知错误"}`, "error");
        return
      }

      updateStepStatus(0, "completed", "播出平台数据抓取完成")

      // Step 2: CSV file check
      setCurrentStep(1)
      updateStepStatus(1, "running")

      const csvRead = await readCSVFile(savedTmdbImportPath)
      if (csvRead) {
        try {
          updateStepStatus(1, "completed", "CSV文件读取完成")
        } catch (error) {
          console.error("修复CSV数据时出错:", error);
          updateStepStatus(1, "completed", "CSV文件读取完成")
        }
        
        setShowCsvEditor(false) // 默认显示表格视图
        setEditorMode("enhanced") // 默认使用增强编辑器
        appendTerminalOutput("💡 现在可以在CSV文件管理中查看和编辑文件", "info")
      } else {
        updateStepStatus(1, "error", undefined, "CSV文件读取失败")
      }
    } catch (error) {
      console.error("处理过程中出错:", error)
      updateStepStatus(currentStep, "error", undefined, error instanceof Error ? error.message : "未知错误")
    } finally {
      // 释放操作锁
      setOperationLock(null);
      console.log("释放操作锁: platform处理完成");
      // 自动跳转到处理页面
      setActiveTab("process")
    }
  }

  // 更新步骤状态
  const updateStepStatus = (stepIndex: number, status: ImportStep["status"], output?: string, error?: string) => {
    setSteps((prev) => prev.map((step, index) => (index === stepIndex ? { ...step, status, output, error } : step)))
  }

  // 添加一个函数用于修复中文乱码
  const fixChineseEncoding = (text: string): string => {
    // 尝试修复常见的中文乱码问题
    // 这种方法不能解决所有乱码问题，但可以处理一些常见情况
    try {
      // 检查是否包含常见的乱码字符组合
      if (/[\u00e0-\u00ef][\u00bc-\u00bf][\u0080-\u00bf]/.test(text)) {
        // 尝试修复UTF-8被错误解析为Latin1的情况
        return decodeURIComponent(escape(text));
      }
    } catch (e) {
      console.error("修复编码时出错:", e);
    }
    return text;
  };

  // 修复CSV文本内容中的中文乱码
  const fixCsvTextEncoding = (text: string): string => {
    try {
      // 检查是否需要修复
      if (!/[\u00e0-\u00ff]{2,}|[\ufffd]/.test(text)) {
        return text; // 没有明显的乱码特征，直接返回
      }

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
      const lines = text.split('\n');
      const fixedLines = lines.map(line => {
        // 使用引号状态追踪器来防止修改引号内的逗号
        let insideQuotes = false;
        let result = '';
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          // 追踪引号状态
          if (char === '"') {
            // 检查是否是转义引号 ("")
            if (i + 1 < line.length && line[i + 1] === '"') {
              result += '""'; // 保留转义引号
              i++; // 跳过下一个引号
            } else {
              insideQuotes = !insideQuotes;
              result += char;
            }
          }
          // 保护逗号，特别是引号内的逗号
          else if (char === ',') {
            result += char; // 总是保留逗号，它们是CSV结构的关键
          }
          // 处理可能的乱码字符
          else if (!insideQuotes && Object.keys(specialCharMap).includes(char)) {
            result += specialCharMap[char];
          }
          // 尝试修复UTF-8错误解析为Latin1的情况，但只在非引号内时
          else if (!insideQuotes && /[\u00e0-\u00ff]{2}/.test(char + (line[i+1] || ''))) {
            try {
              // 只处理当前字符，避免越界
              const fixed = decodeURIComponent(escape(char));
              if (fixed && fixed !== char) {
                result += fixed;
              } else {
                result += char;
              }
            } catch {
              result += char;
            }
          }
          // 其他字符保持不变
          else {
            result += char;
          }
        }
        
        return result;
      });
      
      return fixedLines.join('\n');
    } catch (e) {
      console.error("修复CSV编码时出错:", e);
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
    const fixedText = type === "stderr" || type === "stdout" ? fixChineseEncoding(text) : text;
    
    setTerminalOutput((prev) => prev + `[${timestamp}] ${prefix}${fixedText}\n`)
  }

  // 处理增强型CSV编辑器的保存
  const handleSaveEnhancedCSV = async () => {
    try {
      if (!csvData) {
        toast({
          title: "错误",
          description: "没有CSV数据可保存",
          variant: "destructive",
        });
        return;
      }
      
      // 设置保存中状态，更新UI反馈
      setIsSaving(true);
      setIsProcessing(true);
      appendTerminalOutput("正在保存增强型CSV编辑器的更改...", "info");
      
      // 获取当前工作目录
      const tmdbImportPath = localStorage.getItem("tmdb_import_path");
      if (!tmdbImportPath) {
        throw new Error("未找到TMDB-Import工具路径");
      }
      
      const importCsvPath = path.join(tmdbImportPath, 'import.csv');
      
      // 处理overview列，确保格式正确
      const processedData = processOverviewColumn(csvData);
      
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
      toast({
        title: "保存成功",
        description: "CSV文件已保存，可以继续操作",
      });
      
      // 更新UI状态
      setShowCsvEditor(false);
      setActiveTab("process");
      return true;
    } catch (error: any) {
      console.error("保存CSV文件失败:", error);
      
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
      return false;
    } finally {
      setIsSaving(false);
      setIsProcessing(false);
    }
  };

  // 处理单行CSV编辑器的保存
  const handleSaveSingleLineCSV = async () => {
    try {
      appendTerminalOutput("解析单行编辑器CSV内容...", "info");
      
      // 解析CSV内容
      const newData = parseCsvContent(csvContent);
      
      // 验证解析后的数据
      const validationResult = validateCsvData(newData);
      if (!validationResult.valid) {
        appendTerminalOutput(`CSV数据结构有问题: ${validationResult.errors.join(", ")}`, "warning");
        
        // 尝试修复数据
        appendTerminalOutput("尝试修复CSV数据结构...", "info");
        const fixedData = fixCsvData(newData);
        setCsvData(fixedData);
      } else {
        setCsvData(newData);
      }
      
      // 获取当前工作目录
      const tmdbImportPath = localStorage.getItem("tmdb_import_path");
      if (!tmdbImportPath) {
        throw new Error("未找到TMDB-Import工具路径");
      }
      
      const importCsvPath = path.join(tmdbImportPath, 'import.csv');
      
      // 处理overview列，确保格式正确
      const processedData = processOverviewColumn(newData);
      
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
      
      appendTerminalOutput("CSV文件保存成功", "success");
      toast({
        title: "成功",
        description: "CSV文件已保存",
      });
      
      // 更新UI状态
      setShowCsvEditor(false);
      setActiveTab("process");
    } catch (error: any) {
      // 提供更友好的错误消息
      let errorMessage = error.message || '未知错误';
      let errorTitle = "错误";
      
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
      
      console.error("保存CSV文件失败:", error);
      appendTerminalOutput(`保存CSV文件失败: ${errorMessage}`, "error");
      toast({
        title: errorTitle,
        description: `保存CSV文件失败: ${errorMessage}`,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // 保存CSV文本编辑器修改
  const saveCsvChanges = async () => {
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
      setIsProcessing(true);
      appendTerminalOutput("正在保存CSV文件...", "info");
      
      // 获取当前工作目录
      const tmdbImportPath = localStorage.getItem("tmdb_import_path");
      if (!tmdbImportPath) {
        throw new Error("未找到TMDB-Import工具路径");
      }
      
      const importCsvPath = path.join(tmdbImportPath, 'import.csv');
      
      // 对于文本模式，需要先将文本解析为CSV数据结构
      let dataToSave = csvData;
      if (editorMode === "text" && csvContent) {
        try {
          // 解析文本内容为CSV数据
          dataToSave = parseCsvContent(csvContent);
          // 更新组件状态中的CSV数据，确保其他功能也能使用最新数据
          setCsvData(dataToSave);
          appendTerminalOutput("成功解析文本内容为CSV数据", "success");
        } catch (error: any) {
          throw new Error(`CSV文本格式有误，无法解析: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
      
      // 处理overview列，确保格式正确
      const processedData = processOverviewColumn(dataToSave);
      
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
      toast({
        title: "保存成功",
        description: "CSV文件已保存，修改已应用",
        duration: 3000,
      });
      
      // 在保存成功后显示一个临时提示
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
        document.body.removeChild(statusText);
      }, 2000);
      
      return true;
    } catch (error: any) {
      console.error("保存CSV文件失败:", error);
      
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
      return false;
    } finally {
      // 恢复状态
      setIsSaving(false);
      setIsProcessing(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(`${type}已复制`)
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch (error) {
      console.error("复制失败:", error)
    }
  }

  // 下载CSV文件
  const downloadCSV = () => {
    if (!csvData) return

    try {
      appendTerminalOutput("处理CSV数据准备下载...", "info")
      
      // 验证数据结构
      const validationResult = validateCsvData(csvData)
      if (!validationResult.valid) {
        appendTerminalOutput(`⚠️ CSV数据结构有问题: ${validationResult.errors.map(e => e.message).join(", ")}`, "warning")
        appendTerminalOutput("尝试修复CSV数据结构...", "info")
      }
      
      // 处理overview列并规范化数据
      let processedData = processOverviewColumn(csvData)
      processedData = validationResult.valid ? processedData : fixCsvData(processedData)
      
      // 检查是否有显式空值标记
      let hasExplicitEmpty = false;
      for (const row of processedData.rows) {
        if (row.some(cell => cell === EXPLICIT_EMPTY_VALUE)) {
          hasExplicitEmpty = true;
          break;
        }
      }
      
      if (hasExplicitEmpty) {
        appendTerminalOutput("ℹ️ CSV文件包含显式空值标记，这些单元格在下载时会转换为空字符串", "info");
      }
      
      // 转换为CSV字符串
      const content = serializeCsvData(processedData)
      
      // 检查生成的内容是否正确
      const lines = content.trim().split('\n')
      if (lines.length < 2 || !lines[0].includes(',')) {
        appendTerminalOutput("⚠️ 生成的CSV内容无效，已中止下载", "warning")
        return
      }
      
      // 创建Blob对象并下载
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "import.csv"
    link.click()
    URL.revokeObjectURL(link.href)
    
    appendTerminalOutput("✓ CSV文件已下载到本地", "success")
      appendTerminalOutput("✓ 已清理overview列中的换行符", "success")
      appendTerminalOutput("✓ 已规范化CSV数据结构", "success")
    } catch (error) {
      console.error("下载CSV文件时发生错误:", error)
      appendTerminalOutput(`⚠️ 下载CSV文件失败: ${error instanceof Error ? error.message : "未知错误"}`, "error")
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
      console.log(`操作被阻止：当前已有操作 ${operationLock} 在进行中`);
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
      updateStepStatus(2, "running", "正在准备执行TMDB导入...");
      
      // 获取TMDB-Import工具路径
      const tmdbImportPath = localStorage.getItem("tmdb_import_path");
      if (!tmdbImportPath) {
        appendTerminalOutput("未找到TMDB-Import工具路径，请先配置", "error");
        updateStepStatus(2, "error", undefined, "未找到TMDB-Import工具路径");
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
        updateStepStatus(2, "error", undefined, "生成TMDB命令失败");
        return;
      }
      
      // 解析命令，提取TMDB URL参数
      const cmdParts = tmdbCommand.split(' ');
      if (cmdParts.length < 3) {
        appendTerminalOutput("命令格式错误", "error");
        updateStepStatus(2, "error", undefined, "命令格式错误");
        return;
      }

      // 提取URL参数部分
      const tmdbUrl = cmdParts[cmdParts.length - 1];
      
      // 判断是否为Windows环境
      const isWindows = typeof navigator !== 'undefined' ? /Windows/i.test(navigator.userAgent) : (typeof process !== 'undefined' && process.platform === 'win32');
      
      // 构建完整命令（在页面内直接执行，而不是在新的终端窗口中）
      const pythonExecutable = isWindows ? "python" : "python3";
      
      // 构建完整的命令字符串，将cd和python命令合并为一个命令
      let fullCommand;
      if (isWindows) {
        // Windows环境下，使用 & 连接命令，使用双引号包裹URL
        fullCommand = `cd /D "${tmdbImportPath}" && ${pythonExecutable} -m tmdb-import ${tmdbUrl}`;
      } else {
        // Linux/macOS环境下，使用 && 连接命令，使用单引号包裹URL
        fullCommand = `cd "${tmdbImportPath}" && ${pythonExecutable} -m tmdb-import ${tmdbUrl}`;
      }
      
      // 在页面日志中显示将要执行的命令
      appendTerminalOutput(`将在页面终端执行命令: ${fullCommand}`, "info");
      
      // 直接在页面内部执行命令，使用流式输出
      const result = await executeCommandWithStream(fullCommand, process.cwd());
      
      // 根据执行结果更新状态
      if (result.success) {
        appendTerminalOutput("TMDB导入命令执行成功", "success");
        updateStepStatus(2, "completed", "TMDB导入命令已执行完成");
        toast({
          title: "命令已执行",
          description: "TMDB导入命令已成功执行",
        });
      } else {
        const errorMsg = result.errorText || "未知错误";
        appendTerminalOutput(`TMDB导入命令执行失败: ${errorMsg}`, "error");
        updateStepStatus(2, "error", undefined, `TMDB导入命令执行失败: ${errorMsg}`);
        toast({
          title: "执行失败",
          description: "TMDB导入命令执行失败，请查看终端输出了解详细信息",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("执行过程中出错:", error);
      appendTerminalOutput(`执行出错: ${error.message || '未知错误'}`, "error");
      updateStepStatus(2, "error", undefined, `执行出错: ${error.message || '未知错误'}`);
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

  // 获取步骤状态图标
  const getStepStatusIcon = (status: ImportStep["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
    }
  }

  // 分析当前错误
  const currentErrorAnalysis = lastError ? analyzeError(lastError) : null

  // 处理编辑器模式切换
  const handleEditorModeChange = (mode: "enhanced" | "text") => {
    // 如果从表格模式切换到文本模式，需要将csvData转换为文本
    if (mode === "text" && editorMode !== "text" && csvData) {
      // 将csvData转换为CSV文本并修复可能的编码问题
      const rawCsvText = serializeCsvData(csvData)
      // 多次尝试修复乱码，有些复杂的乱码可能需要多次处理
      let fixedCsvText = fixCsvTextEncoding(rawCsvText)
      // 再次尝试修复，处理可能遗漏的乱码
      fixedCsvText = fixCsvTextEncoding(fixedCsvText)
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
        console.log("切换到文本模式，优化编辑区域高度");
        forceExpandEditor();
      }, 100);
    }
  }

  // 手动修复编码
  const handleFixEncoding = () => {
    if (!csvContent) return
    
    // 多次尝试修复乱码
    let fixedCsvContent = fixCsvTextEncoding(csvContent)
    // 再次尝试修复，处理可能遗漏的乱码
    fixedCsvContent = fixCsvTextEncoding(fixedCsvContent)
    
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
      console.error("格式化CSV内容时出错:", error)
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
      setShowCsvEditor(false);
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
  const debugState = () => {
    console.log("组件状态:", {
      inTab,
      activeTab,
      csvData: csvData ? `${csvData.rows.length}行数据` : "无数据",
      editorMode,
      isProcessing,
      tableReady
    })
  }
  
  // 确保表格组件只有在完全准备好后才会渲染
  useEffect(() => {
    if (csvData && (activeTab === "edit" || inTab)) {
      // 延迟加载表格组件
      setTableReady(false)
      const timer = setTimeout(() => {
        setTableReady(true)
        console.log("表格组件已准备就绪", { inTab, activeTab, hasCsvData: !!csvData })
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [csvData, activeTab, inTab])

  // 在inTab模式下自动尝试加载CSV数据
  useEffect(() => {
    const loadCsvData = async () => {
      if (inTab && !csvData) {
        console.log("尝试在inTab模式下加载CSV数据");
        const savedTmdbImportPath = localStorage.getItem("tmdb_import_path");
        if (savedTmdbImportPath) {
          try {
            // 使用readCSVFile函数加载CSV数据
            // 由于readCSVFile已经处理了所有错误，这里不需要再捕获错误
            const result = await readCSVFile(savedTmdbImportPath);
            if (result) {
              console.log("CSV数据加载成功");
              // 不再自动切换到编辑标签
              // setActiveTab("edit");
              
              // 确保处理标签页内容正确显示
              if (activeTab === "process") {
                console.log("CSV数据加载后，刷新处理标签页");
                setProcessTabRenderCount(prev => prev + 1);
              }
            } else {
              console.log("CSV数据加载失败");
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
          console.log("未找到TMDB-Import工具路径");
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
        console.log("加载CSV数据时出现未预期的错误");
      }
    })();
  }, [inTab, csvData]);

  // 添加标签切换处理器
  const handleTabChange = (value: string) => {
    console.log(`标签切换: ${activeTab} -> ${value}`)
    // 如果点击的是当前已激活的标签，不做任何操作
    if (value === activeTab) {
      console.log("点击了当前已激活的标签，忽略操作")
      return;
    }
    
    setActiveTab(value)
    
    // 如果切换到处理标签页，增加渲染计数以强制刷新内容
    if (value === "process") {
      console.log("切换到处理标签页，强制刷新内容")
      setProcessTabRenderCount(prev => prev + 1)
      
      // 延迟执行以确保DOM更新
      setTimeout(() => {
        setProcessTabRenderCount(prev => prev + 1)
      }, 50)
    }
    // 如果切换到编辑标签页，增加渲染计数以强制刷新内容
    else if (value === "edit") {
      console.log("切换到编辑标签页，强制刷新内容")
      
      // 确保有CSV数据可供编辑
      if (!csvData) {
        console.log("尝试加载CSV数据以供编辑");
        const savedTmdbImportPath = localStorage.getItem("tmdb_import_path");
        if (savedTmdbImportPath) {
          // 使用try-catch包裹readCSVFile调用，确保错误不会传播到控制台
          (async () => {
            try {
              const success = await readCSVFile(savedTmdbImportPath);
            if (success) {
              console.log("成功加载CSV数据，准备编辑");
              setTableReady(true);
              forceRefreshEditTab();
              
              // 延迟执行forceExpandEditor以确保DOM已更新
              setTimeout(() => {
                if (editorMode === 'text') {
                  console.log("优化编辑区域高度以显示更多内容");
                  forceExpandEditor();
                }
              }, 100);
            }
            } catch (error) {
              // 捕获所有可能的错误，防止它们传播到控制台
              console.log("加载CSV数据时出现错误，无法编辑");
            }
          })();
        }
      } else {
        // 已有CSV数据，直接刷新编辑页面
        setTableReady(true);
        forceRefreshEditTab();
        
        // 延迟执行forceExpandEditor以确保DOM已更新
        setTimeout(() => {
          if (editorMode === 'text') {
            console.log("优化编辑区域高度以显示更多内容");
            forceExpandEditor();
          }
        }, 100);
      }
    }
  }

  // 渲染主要内容
  const renderContent = () => (
    <>
      {/* 使用标签式布局 */}
      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange} 
        className="w-full h-full" 
        defaultValue="process"
      >
        <div className="border-b">
          <div className="flex items-center justify-between px-6 py-2">
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
            
                      <div className="flex items-center space-x-2">
                        {csvData && (
                <Button variant="outline" size="sm" onClick={downloadCSV} className="flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  下载CSV
                              </Button>
              )}
                              <Button
                variant="outline"
                                size="sm"
                onClick={() => setShowFixBugDialog(true)}
                className="flex items-center"
                              >
                <Wrench className="h-4 w-4 mr-2" />
                Bug修复
                              </Button>
                            </div>
                      </div>
                </div>

        {/* 处理标签内容 */}
        <TabsContent 
          value="process" 
          className="h-[calc(100%-48px)] overflow-hidden"
          key={`process-tab-${processTabRenderCount}`}
        >
          <div className="p-4 h-full overflow-y-auto space-y-4">
            {/* TMDB导入命令区域 */}
                <Card>
              <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                  <Terminal className="h-4 w-4 mr-2" />
                  TMDB导入命令
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 命令显示区域 */}
                <div className="bg-gray-900 text-green-400 p-3 rounded-md font-mono text-sm overflow-x-auto whitespace-pre">
                  <div className="flex items-center justify-between">
                    <div>{generatePlatformCommand() || `python -m tmdb-import "${platformUrl || '请输入播出平台URL'}"`}</div>
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
                    <div>{displayedTMDBCommand || `python -m tmdb-import "https://www.themoviedb.org/tv/290854/season/${selectedSeason}?language=zh-CN"`}</div>
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
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 左侧：URL和季数配置 */}
                  <div className="space-y-3">
                <div>
                  <Label htmlFor="platform-url">播出平台URL</Label>
                  <Input
                    id="platform-url"
                    value={platformUrl}
                    onChange={(e) => setPlatformUrl(e.target.value)}
                    placeholder="https://example.com/show-page"
                    className="mt-1"
                  />
                </div>
                    <div className="flex items-center gap-3">
                <div>
                        <Label>TMDB季</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm">第</span>
                  <Input
                    type="number"
                            min="1"
                            max="20"
                            value={selectedSeason}
                            onChange={(e) => handleSeasonChange(e.target.value)}
                            className="w-16 h-8"
                          />
                          <span className="text-sm">季</span>
                        </div>
                </div>

                      <div className="flex items-center space-x-2 mt-6">
                    <Badge variant={localStorage.getItem("tmdb_import_path") ? "default" : "secondary"}>
                          {localStorage.getItem("tmdb_import_path") ? "工具路径已配置" : "未配置工具路径"}
                    </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadLocalCSVFile}
                          disabled={operationLock !== null}
                          className="h-7"
                          title="加载本地CSV文件"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                  </div>
                    </div>
                </div>

                  {/* 右侧：按钮区域 */}
                  <div className="flex flex-col justify-end space-y-2">
                    {/* 两个主要按钮 */}
                    <div className="grid grid-cols-2 gap-3">
                  <Button
                        onClick={(e) => startProcessing(e)}
                        disabled={operationLock === "platform" || !localStorage.getItem("tmdb_import_path") || !platformUrl}
                        className="bg-green-600 hover:bg-green-700 h-12"
                  >
                    {operationLock === "platform" ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-5 w-5 mr-2" />
                    )}
                        播出平台抓取
                  </Button>
                      <Button 
                        onClick={(e) => executeTMDBExtraction(e)}
                        disabled={operationLock === "tmdb" || csvData === null}
                        className="bg-blue-600 hover:bg-blue-700 h-12"
                      >
                        {operationLock === "tmdb" ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                        <Download className="h-5 w-5 mr-2" />
                        )}
                        执行TMDB导入
                      </Button>
                  </div>
                </div>
                  </div>
              </CardContent>
            </Card>

                {/* 错误分析和解决方案 */}
                {hasNoneTypeError && (
              <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 mb-6">
                    <Bug className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-red-800 dark:text-red-200">TMDB-Import代码错误</strong>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFixBugDialog(true)}
                            className="h-7 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 border-red-300 dark:border-red-700"
                          >
                            <Wrench className="h-3 w-3 mr-1" />
                            <span className="text-xs">自动修复</span>
                          </Button>
                        </div>
                        <p className="text-red-700 dark:text-red-300 text-sm">
                          检测到episode.name为None时的类型错误。这是TMDB-Import工具的一个已知bug，需要修改common.py文件。
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 步骤进度 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">处理步骤</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <div key={step.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">{getStepStatusIcon(step.status)}</div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className={`text-sm font-medium ${
                              step.status === "completed"
                                ? "text-green-700 dark:text-green-300"
                                : step.status === "error"
                                  ? "text-red-700 dark:text-red-300"
                                  : step.status === "running"
                                    ? "text-blue-700 dark:text-blue-300"
                                    : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {step.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                          {step.output && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">✓ {step.output}</div>
                          )}
                          {step.error && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">✗ {step.error}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 步骤操作区域 */}
                  {csvData && steps[1].status === "completed" && (
                    <div className="mt-6 border-t pt-4">
                      <div className="flex flex-col space-y-2">
                        <h4 className="text-sm font-medium">执行下一步骤</h4>
                        
                        <div className="flex items-center space-x-2">
                          <div>
                            <Label htmlFor="direct-season" className="text-xs">TMDB季数</Label>
                            <Input
                              id="direct-season"
                              type="number"
                              min="1"
                              value={selectedSeason}
                              onChange={(e) => handleSeasonChange(e.target.value)}
                              className="w-16 h-7 text-xs"
                            />
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={(e) => executeTMDBExtraction(e)}
                            disabled={operationLock === "tmdb" || steps[2].status === "running"}
                            className="bg-blue-600 hover:bg-blue-700 h-7"
                          >
                            {operationLock === "tmdb" ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                            <Download className="h-3 w-3 mr-1" />
                            )}
                            <span className="text-xs">执行TMDB导入</span>
                          </Button>
                        </div>
                        
                        {steps[2].status === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveTab("edit")}
                            className="h-7"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            <span className="text-xs">查看更新后的CSV</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 步骤进度和终端输出区域 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center">
                      <ActivityIcon className="h-4 w-4 mr-2" />
                      终端输出
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={forceRefreshProcessTab} 
                        title="如果内容不显示，请点击此按钮刷新"
                        className="h-7 text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        刷新视图
                        </Button>
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
                        onClick={() => setTerminalOutput("")} 
                        disabled={operationLock !== null} 
                        className="h-7"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div
                    ref={terminalRef}
                    className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-[400px] max-h-[400px] overflow-y-auto whitespace-pre-wrap"
                  >
                    {terminalOutput || (
                      <>
                        等待开始处理...
                        {csvData && (
                          <div className="mt-2 text-yellow-300">
                            提示：如果内容显示不正确，请尝试点击上方的"刷新"按钮重新加载CSV数据。
                  </div>
                        )}
                        {!csvData && (
                          <div className="mt-2 text-yellow-300">
                            未检测到CSV数据，请先加载CSV文件或执行播出平台抓取。
                          </div>
                        )}
                      </>
                    )}
            </div>

            {/* 交互按钮区域 */}
            {isExecutingCommand && (
                    <div className="p-4 border-t">
                        <div className="flex items-center justify-between">
            <div className="text-sm flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span className="text-blue-600 dark:text-blue-400">
                正在执行命令... {currentProcessId ? 
                  <span className="text-green-600 dark:text-green-400">(进程ID: {currentProcessId})</span> : 
                  <span className="text-yellow-600 dark:text-yellow-400">(等待进程ID...)</span>
                }
              </span>
            </div>
            <div className="flex items-center space-x-2">
                          <Button
                variant="default"
                            size="sm"
                onClick={() => sendQuickCommand("y")}
                disabled={!isExecutingCommand || !currentProcessId}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                确认 (Y)
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
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-1" />
                取消 (N)
                          </Button>
                        </div>
                  </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
                      </div>
        </TabsContent>

        {/* 编辑标签内容 */}
        <TabsContent 
          value="edit" 
          className="h-[calc(100%-48px)] overflow-hidden"
          key={`edit-tab-${editTabRenderCount}`}
        >
          <div className="h-full">
            {/* 添加调试状态显示 */}
            <div className="absolute top-1 right-1 z-50">
              <Badge 
                variant={csvData ? "outline" : "destructive"}
                className="text-xs mb-1"
              >
                CSV数据: {csvData ? "已加载" : "未加载"}
              </Badge>
              <Badge 
                variant={tableReady ? "outline" : "destructive"}
                className="text-xs mb-1 ml-1"
              >
                表格状态: {tableReady ? "就绪" : "未准备"}
              </Badge>
              <Badge 
                variant="outline"
                className="text-xs mb-1 ml-1"
              >
                渲染计数: {editTabRenderCount}
              </Badge>
            </div>
            
            {csvData ? (
              <div className="h-full flex flex-col">
                {/* 编辑器使用提示 */}
                <div className="flex flex-col">
                  <div className="bg-background border-b px-4 py-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted rounded-md p-0.5 flex items-center">
                        <Button
                          variant={editorMode === "enhanced" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleEditorModeChange("enhanced")}
                            className="h-8 px-3 text-xs"
                        >
                          <TableIcon className="h-3.5 w-3.5 mr-1" />
                          表格模式
                        </Button>
                        <Button
                          variant={editorMode === "text" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleEditorModeChange("text")}
                          className="h-8 px-3 text-xs"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          文本模式
                        </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={forceRefreshEditTab}
                          className="h-8 px-3 text-xs"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          刷新视图
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={saveCsvChanges}
                          disabled={isSaving}
                          className="h-8 px-3 text-xs"
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
                  </div>
                </div>
                
                {/* 编辑区域 */}
                <div className="flex-1 overflow-hidden relative">
                  {/* 添加加载状态覆盖层 */}
                  {(!tableReady || !csvData) && (
                    <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10">
                      <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                      <p className="text-sm text-muted-foreground">正在准备编辑器...</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={forceRefreshEditTab}
                        className="mt-4"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        手动刷新
                      </Button>
                    </div>
                  )}
                  
                  {/* 表格编辑模式 */}
                  {editorMode === "enhanced" ? (
                    <div className="h-full">
                      {tableReady && csvData ? (
                        <NewTMDBTable
                          key={`tmdb-table-${editTabRenderCount}`}
                          data={csvData}
                          onChange={handleCsvDataChange}
                          onSave={handleSaveEnhancedCSV}
                          onCancel={() => {}}
                          height="100%"
                          isSaving={isSaving}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">正在加载表格数据...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : editorMode === "text" ? (
                    <div className="h-full flex flex-col">
                      <textarea
                        ref={textareaRef}
                        value={csvContent}
                        onChange={(e) => setCsvContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 p-4 font-mono text-xs resize-none focus:outline-none bg-white dark:bg-black csv-text-editor"
                        placeholder="CSV内容..."
                        style={{ minHeight: "70vh", lineHeight: 1.6 }}
                      ></textarea>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <AlertCircle className="h-8 w-8 mx-auto mb-4 text-orange-500" />
                        <p className="text-sm">未知的编辑器模式</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <h3 className="text-lg font-semibold mb-2">未检测到CSV数据</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    请先加载CSV文件或执行播出平台抓取，然后再尝试编辑。
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button onClick={() => setActiveTab("process")}>
                      <Terminal className="h-4 w-4 mr-2" />
                      返回处理页面
                    </Button>
                    <Button variant="outline" onClick={loadLocalCSVFile}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      尝试加载CSV
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  )

  // 添加CSS样式
  useEffect(() => {
    // 添加全局样式
    const globalStyle = document.createElement('style');
    globalStyle.id = 'tmdb-import-global-style';
    globalStyle.textContent = `
      .csv-text-editor {
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
        min-height: 80vh; /* 增加最小高度到80vh */
        padding-bottom: 30px; /* 减少底部内边距，但仍确保最后几行内容可见 */
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
      }
      
      .csv-text-editor-container {
        position: relative;
        border: 1px solid var(--border, #e5e5e5);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-height: 80vh; /* 增加最小高度到80vh */
        height: 98vh; /* 增加默认视口高度利用率到98% */
        overflow: auto; /* 允许滚动 */
        margin-bottom: 2px; /* 进一步减少底部边距 */
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* 添加轻微阴影，提升视觉效果 */
        background-color: #fcfcfc; /* 轻微的背景色，提高可读性 */
        padding: 0; /* 移除容器内边距，由文本编辑器控制内边距 */
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
    <div className="h-full flex flex-col bg-background">
      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange} 
        className="w-full h-full flex flex-col"
        defaultValue="process"
      >
        <div className="border-b">
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
            
            <div className="flex items-center space-x-2">
              {csvData && (
              <Button variant="outline" size="sm" onClick={downloadCSV} className="h-8 text-xs">
                  <Download className="h-4 w-4 mr-1" />
                下载CSV
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 处理标签内容 */}
        <TabsContent 
          value="process" 
          className="h-full overflow-hidden p-0 m-0"
          key={`process-tab-${processTabRenderCount}`}
        >
          <div className="p-4 h-full overflow-y-auto space-y-4">
            {/* TMDB导入命令区域 */}
              <Card>
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                  <Terminal className="h-4 w-4 mr-2" />
                  TMDB导入命令
                  </CardTitle>
                </CardHeader>
              <CardContent>
                {/* 命令显示区域 */}
                <div className="bg-gray-900 text-green-400 p-3 rounded-md font-mono text-xs overflow-x-auto whitespace-pre">
                  <div className="flex items-center justify-between">
                    <div>{generatePlatformCommand() || `python -m tmdb-import "${platformUrl || '请输入播出平台URL'}"`}</div>
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
                    <div>{displayedTMDBCommand || `python -m tmdb-import "https://www.themoviedb.org/tv/290854/season/${selectedSeason}?language=zh-CN"`}</div>
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
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    <div className="flex items-center justify-end mb-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                        onClick={loadLocalCSVFile}
                        disabled={operationLock !== null}
                        className="h-7 text-xs"
                        title="加载本地CSV文件"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        加载CSV
                                </Button>
                              </div>
                    {/* 两个主要按钮 */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={(e) => startProcessing(e)}
                        disabled={operationLock === "platform" || !localStorage.getItem("tmdb_import_path") || !platformUrl}
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
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <ActivityIcon className="h-4 w-4 mr-2" />
                    终端输出
                    {processTabRenderCount > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        渲染: {processTabRenderCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                      onClick={forceRefreshProcessTab} 
                      title="如果内容不显示，请点击此按钮刷新"
                      className="h-7 text-xs"
                                >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      刷新视图
                                </Button>
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
                      onClick={() => setTerminalOutput("")} 
                      disabled={operationLock !== null} 
                      className="h-7"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  ref={terminalRef}
                  className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs h-[250px] max-h-[250px] overflow-y-auto whitespace-pre-wrap"
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
        </TabsContent>

        {/* 编辑标签内容 */}
        <TabsContent 
          value="edit" 
          className="h-full p-0 m-0"
          key={`edit-tab-${editTabRenderCount}`}
        >
            <div className="h-full flex flex-col">
            {/* 编辑工具栏 */}
            <div className="border-b px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-muted rounded-md p-0.5 flex items-center">
                  <Button
                      variant={editorMode === "enhanced" ? "default" : "ghost"}
                    size="sm"
                      onClick={() => handleEditorModeChange("enhanced")}
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
                </div>
                
                <div className="flex items-center gap-2">
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
              </div>
              
              {/* 编辑区域 */}
            <div className="flex-1 overflow-hidden">
              {editorMode === "enhanced" && tableReady && csvData ? (
                      <NewTMDBTable
                  key={`tmdb-table-tab-${Date.now()}`}
                        data={csvData}
                        onChange={handleCsvDataChange}
                        onSave={handleSaveEnhancedCSV}
                        onCancel={() => {}}
                        height="100%"
                        isSaving={isSaving}
                      />
              ) : editorMode === "text" ? (
                <div className="h-full flex flex-col">
                  <textarea
                    ref={textareaRef}
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 p-4 font-mono text-xs resize-none focus:outline-none bg-white dark:bg-black csv-text-editor"
                    placeholder="CSV内容..."
                    style={{ minHeight: "70vh", lineHeight: 1.6 }}
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
    // 获取编辑器容器
    const container = document.querySelector('.csv-text-editor-container');
    if (!container) return;

    // 获取页面顶部到容器顶部的距离
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    
    // 计算可用高度（视口高度减去容器顶部位置，几乎不留边距，最大化利用空间）
    const availableHeight = window.innerHeight - containerTop - 2; // 减少边距到2px
    
    // 设置容器高度，确保最小高度不低于800px，提供更大的显示区域
    const optimalHeight = Math.max(800, availableHeight);
    (container as HTMLElement).style.height = `${optimalHeight}px`;
    
    // 同时调整文本区域高度
    const textEditor = document.querySelector('.csv-text-editor');
    if (textEditor) {
      (textEditor as HTMLElement).style.minHeight = `${optimalHeight}px`;
    }
    
    // 更新编辑器高度状态
    setEditorHeight(optimalHeight);
  }, []);

  // 在组件挂载和窗口大小变化时调整编辑器高度
  useEffect(() => {
    if (typeof window === 'undefined' || !csvData || editorMode !== 'text') return;
    
    // 延迟执行以确保DOM已完全加载
    const timer = setTimeout(() => {
      adjustEditorHeight();
      
      // 添加窗口大小变化事件监听器
      window.addEventListener('resize', adjustEditorHeight);
      
      // 定期检查并调整高度，确保编辑器始终填充可用空间
      const intervalTimer = setInterval(() => {
        adjustEditorHeight();
      }, 1000); // 每秒检查一次
      
      return () => {
        clearInterval(intervalTimer);
      };
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
    
    // 计算内容高度（文本行数 * 行高）
    const lineCount = csvContent.split('\n').length;
    const lineHeight = isCompactMode ? 1.7 : 2.2; // 更新与编辑器匹配的行高
    const fontSize = isCompactMode ? 17 : 20; // 更新与编辑器匹配的字体大小
    // 为每行分配更多空间，确保内容完全显示
    const contentHeight = lineCount * lineHeight * fontSize + 100; // 减少额外边距到100px
    
    // 获取视口高度
    const viewportHeight = window.innerHeight;
    
    // 设置容器高度为内容高度和视口高度的较大值，增加视口高度利用率
    const optimalHeight = Math.max(contentHeight, viewportHeight * 0.98);
    
    // 应用高度
    (container as HTMLElement).style.height = `${optimalHeight}px`;
    (textEditor as HTMLElement).style.minHeight = `${optimalHeight}px`;
    
    // 更新编辑器高度状态
    setEditorHeight(optimalHeight);
    
    // 确保文本区域有足够的宽度，防止水平滚动
    (textEditor as HTMLElement).style.width = '100%';
    (textEditor as HTMLElement).style.maxWidth = 'none';
  }, [csvContent, isCompactMode]);
  
  // 在CSV内容变化时调用强制扩展函数
  useEffect(() => {
    if (editorMode === 'text' && csvContent) {
      // 延迟执行以确保DOM已更新
      setTimeout(forceExpandEditor, 100);
    }
  }, [csvContent, editorMode, forceExpandEditor]);

  // 监听Tab切换，特别是从编辑页面切换到处理页面的情况
  useEffect(() => {
    // 当从编辑页面切换到处理页面时
    if (activeTab === "process") {
      console.log("切换到处理标签页，强制更新渲染计数器确保内容显示");
      // 更新渲染计数器，强制重新渲染处理页面内容
      setProcessTabRenderCount(prev => prev + 1);
    }
  }, [activeTab]);

  // 确保正确加载和显示CSV数据
  useEffect(() => {
    if (csvData && activeTab === "process") {
      console.log("检测到CSV数据并在处理标签页，确保内容显示");
      // CSV数据存在且在处理页面，确保处理页面被正确渲染
      setProcessTabRenderCount(prev => prev + 1);
    }
  }, [csvData, activeTab]);

  // 添加一个函数来强制刷新处理页面内容
  const forceRefreshProcessTab = useCallback(() => {
    console.log("强制刷新处理标签页内容");
    setProcessTabRenderCount(prev => prev + 1);
    
    // 延迟再次刷新，确保DOM已完全加载
    setTimeout(() => {
      setProcessTabRenderCount(prev => prev + 1);
    }, 300);
  }, []);
  
  // 在组件挂载时执行一次处理页面内容刷新
  useEffect(() => {
    if (activeTab === "process") {
      console.log("组件挂载，初始化处理标签页");
      forceRefreshProcessTab();
    }
  }, [forceRefreshProcessTab]);

  // 确保TMDB导入命令显示正确
  useEffect(() => {
    if (activeTab === "process" && item && item.tmdbId) {
      console.log("检测到TMDB ID，确保命令显示正确");
      forceRefreshProcessTab();
    }
  }, [item, activeTab, forceRefreshProcessTab]);

  // 添加加载本地CSV文件的函数
  const loadLocalCSVFile = useCallback(async () => {
    console.log("尝试加载本地CSV文件");
    const savedTmdbImportPath = localStorage.getItem("tmdb_import_path");
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
          // 确保处理页面刷新
          forceRefreshProcessTab();
        } else {
          appendTerminalOutput("加载本地CSV文件失败", "error");
          toast({
            title: "加载失败",
            description: "未能加载本地CSV文件",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("加载CSV文件时出错:", error);
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
  }, [appendTerminalOutput, forceRefreshProcessTab, readCSVFile]);

  // 添加组件初始化钩子，确保页面打开时显示处理标签页
  useEffect(() => {
    // 当对话框打开时，强制设置为处理标签
    if (open) {
      console.log("对话框打开，强制设置处理标签页")
      setActiveTab("process")
      setProcessTabRenderCount(prev => prev + 1)
      
      // 短暂延迟后再次确认是处理标签页
      setTimeout(() => {
        setActiveTab("process")
        setProcessTabRenderCount(prev => prev + 1)
        setIsDialogInitialized(true)
      }, 100)
    } else {
      // 对话框关闭时，重置初始化状态
      setIsDialogInitialized(false)
    }
  }, [open])

  // 实时记录组件挂载状态
  useEffect(() => {
    console.log("组件状态:", { open, activeTab, inTab, isDialogInitialized, csvData: !!csvData });
  });

  // 添加函数来强制刷新编辑标签页内容
  const forceRefreshEditTab = useCallback(() => {
    console.log("强制刷新编辑标签页内容");
    
    // 确保tableReady状态为true
    setTableReady(true);
    
    // 增加渲染计数
    setEditTabRenderCount(prev => prev + 1);
    
    // 多阶段刷新机制，确保DOM完全更新
    const refreshStages = [300, 700, 1200];
    
    refreshStages.forEach((delay, index) => {
      setTimeout(() => {
        console.log(`编辑标签刷新阶段 ${index + 1}/${refreshStages.length}`);
        setTableReady(true);
        setEditTabRenderCount(prev => prev + 1);
        
        // 额外的调试信息
        if (csvData) {
          console.log(`CSV数据状态: ${csvData.rows.length}行数据可用`);
        } else {
          console.log("警告: CSV数据未加载");
        }
      }, delay);
    });
    
    // 通知用户刷新正在进行
    toast({
      title: "页面刷新",
      description: "正在刷新编辑页面...",
      duration: 2000,
    });
  }, [csvData, toast]);

  // 确保编辑标签页能正确显示内容
  useEffect(() => {
    if (csvData && activeTab === "edit") {
      console.log("检测到CSV数据并在编辑标签页，确保内容显示");
      // 立即设置表格就绪状态
      setTableReady(true);
      
      // 使用多阶段渲染确保DOM已更新
      const renderStages = [50, 300, 600];
      renderStages.forEach((delay, index) => {
        setTimeout(() => {
          console.log(`编辑标签页渲染阶段 ${index + 1}/${renderStages.length}`);
          setTableReady(true);
          setEditTabRenderCount(prev => prev + 1);
        }, delay);
      });
    }
  }, [csvData, activeTab]);

  // 处理季数变化
  const handleSeasonChange = (newSeasonValue: string | number) => {
    const season = Number.parseInt(String(newSeasonValue)) || 1
    setSelectedSeason(season)
    
    // 更新显示的TMDB命令
    const tmdbCommand = generateTMDBCommand(season)
    setDisplayedTMDBCommand(tmdbCommand || `python -m tmdb-import "https://www.themoviedb.org/tv/290854/season/${season}?language=zh-CN"`)
  }
  
  // 在组件挂载和item变化时初始化命令显示
  useEffect(() => {
    updateDisplayedCommands()
  }, [updateDisplayedCommands])

  // 在组件挂载和item变化时初始化命令显示
  useEffect(() => {
    updateDisplayedCommands()
  }, [updateDisplayedCommands])

  // 处理CSV数据变更
  const handleCsvDataChange = (newData: CSVDataType) => {
    // 更新CSV数据
    setCsvData(newData);
    
    // 更新CSV内容（用于文本编辑模式）
    const serialized = serializeCsvData(newData);
    setCsvContent(serialized);
    
    // 标记数据已修改
    const updatedItem = { ...item, notes: item.notes || "数据已修改" };
    onItemUpdate?.(updatedItem);
  };

  // 检查并关闭Edge浏览器实例
  const checkAndCloseEdgeBrowser = async () => {
    try {
      appendTerminalOutput(`检查是否有Edge浏览器实例正在运行...`, "info");
      
      // 根据环境判断是否为Windows（前端无法可靠访问process.platform）
      const isWindows = typeof navigator !== "undefined" ? /Windows/i.test(navigator.userAgent) : (typeof process !== "undefined" && process.platform === "win32");
      
      if (isWindows) {
        // 在Windows上使用多种方式检测Edge进程
        
        // 方法1：使用tasklist命令查找Edge进程
        const checkEdgeCmd = `tasklist /FI "IMAGENAME eq msedge.exe" /FO CSV`;
        const edgeCheckResult = await executeCommandWithStream(checkEdgeCmd, process.cwd());
        
        // 注意：tasklist命令的输出在Windows上通常写入stdout而非stderr
        const outputText = edgeCheckResult.stdoutText || edgeCheckResult.errorText || "";
        console.log("Edge检测输出:", outputText);
        appendTerminalOutput(`Edge检测结果: ${outputText.length > 100 ? outputText.substring(0, 100) + "..." : outputText}`, "info");
        
        const hasEdgeProcess = outputText.toLowerCase().includes("msedge.exe");
        
        // 方法2：使用wmic命令查找Edge进程（备用方法）
        if (!hasEdgeProcess) {
          appendTerminalOutput(`使用备用方法检测Edge进程...`, "info");
          const wmicCheckCmd = `wmic process where "name='msedge.exe'" get processid`;
          const wmicResult = await executeCommandWithStream(wmicCheckCmd, process.cwd());
          const wmicOutput = wmicResult.stdoutText || wmicResult.errorText || "";
          
          if (wmicOutput.toLowerCase().includes("processid") && wmicOutput.trim().split("\n").length > 1) {
            appendTerminalOutput(`通过WMIC检测到Edge进程`, "warning");
            console.log("WMIC检测结果:", wmicOutput);
          }
        }
        
        // 无论检测结果如何，都尝试关闭Edge进程，确保环境干净
        appendTerminalOutput(`尝试关闭所有Edge浏览器实例...`, "info");
        
        // 首先使用taskkill命令关闭Edge进程
        const killEdgeCmd = `taskkill /F /IM msedge.exe /T`;
        const killResult = await executeCommandWithStream(killEdgeCmd, process.cwd());
        
        // 等待一小段时间确保进程完全关闭
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 再次检查是否还有Edge进程
        const recheckCmd = `tasklist /FI "IMAGENAME eq msedge.exe" /FO CSV`;
        const recheckResult = await executeCommandWithStream(recheckCmd, process.cwd());
        const recheckOutput = recheckResult.stdoutText || recheckResult.errorText || "";
        
        if (recheckOutput.toLowerCase().includes("msedge.exe")) {
          // 如果还有Edge进程，尝试使用更强力的方式关闭
          appendTerminalOutput(`仍检测到Edge进程，尝试使用更强力的方式关闭...`, "warning");
          
          // 使用wmic命令强制终止Edge进程
          const wmicKillCmd = `wmic process where "name='msedge.exe'" call terminate`;
          await executeCommandWithStream(wmicKillCmd, process.cwd());
          
          // 再次等待确保进程关闭
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // 最后一次检查
          const finalCheckCmd = `tasklist /FI "IMAGENAME eq msedge.exe" /FO CSV`;
          const finalCheckResult = await executeCommandWithStream(finalCheckCmd, process.cwd());
          const finalCheckOutput = finalCheckResult.stdoutText || finalCheckResult.errorText || "";
          
          if (finalCheckOutput.toLowerCase().includes("msedge.exe")) {
            appendTerminalOutput(`警告: 无法完全关闭所有Edge进程，可能会影响执行`, "warning");
            return false;
          } else {
            appendTerminalOutput(`成功关闭所有Edge浏览器实例`, "success");
            return true;
          }
        } else {
          appendTerminalOutput(`成功关闭Edge浏览器实例`, "success");
          return true;
        }
      } else {
        // 非Windows系统使用ps命令
        const checkEdgeCmd = `ps -ef | grep -i edge | grep -v grep`;
        const edgeCheckResult = await executeCommandWithStream(checkEdgeCmd, process.cwd());
        
        // 在非Windows系统中，输出通常在stderr中
        const outputText = edgeCheckResult.stdoutText || edgeCheckResult.errorText || "";
        
        if (outputText.toLowerCase().includes("edge")) {
          appendTerminalOutput(`检测到Edge浏览器实例正在运行`, "warning");
          appendTerminalOutput(`尝试关闭Edge浏览器实例...`, "info");
          
          // 使用pkill命令关闭Edge进程
          const killEdgeCmd = `pkill -f edge`;
          const killResult = await executeCommandWithStream(killEdgeCmd, process.cwd());
          
          // 等待一小段时间确保进程完全关闭
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 再次检查是否还有Edge进程
          const recheckCmd = `ps -ef | grep -i edge | grep -v grep`;
          const recheckResult = await executeCommandWithStream(recheckCmd, process.cwd());
          const recheckOutput = recheckResult.stdoutText || recheckResult.errorText || "";
          
          if (recheckOutput.toLowerCase().includes("edge")) {
            // 如果还有Edge进程，尝试使用更强力的方式关闭
            appendTerminalOutput(`仍检测到Edge进程，尝试使用更强力的方式关闭...`, "warning");
            
            // 使用kill -9命令强制终止Edge进程
            const forceKillCmd = `pkill -9 -f edge`;
            await executeCommandWithStream(forceKillCmd, process.cwd());
            
            // 再次等待确保进程关闭
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // 最后一次检查
            const finalCheckCmd = `ps -ef | grep -i edge | grep -v grep`;
            const finalCheckResult = await executeCommandWithStream(finalCheckCmd, process.cwd());
            const finalCheckOutput = finalCheckResult.stdoutText || finalCheckResult.errorText || "";
            
            if (finalCheckOutput.toLowerCase().includes("edge")) {
              appendTerminalOutput(`警告: 无法完全关闭所有Edge进程，可能会影响执行`, "warning");
              return false;
            } else {
              appendTerminalOutput(`成功关闭所有Edge浏览器实例`, "success");
              return true;
            }
          } else {
            appendTerminalOutput(`成功关闭Edge浏览器实例`, "success");
            return true;
          }
        } else {
          appendTerminalOutput(`未检测到运行中的Edge浏览器实例`, "success");
          return true;
        }
      }
    } catch (error: any) {
      appendTerminalOutput(`检查Edge浏览器实例时出错: ${error.message || "未知错误"}`, "warning");
      console.error("检查Edge浏览器实例时出错:", error);
      return true; // 出错时也继续执行
    }
  }

  // 准备独立的Selenium目录（简化版临时目录方案）
  const prepareSeleniumDirectory = async (workingDirectory: string): Promise<boolean> => {
    try {
      appendTerminalOutput(`准备独立的Selenium目录...`, "info");
      
      // 创建唯一的Selenium目录名称
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 8);
      const seleniumDirName = `Selenium_${timestamp}_${randomString}`;
      
      // 在工作目录中创建独立的Selenium目录
      const seleniumDirPath = isWindows 
        ? `${workingDirectory}\\${seleniumDirName}`
        : `${workingDirectory}/${seleniumDirName}`;
      
      // 创建Selenium目录
      const mkdirCmd = isWindows
        ? `mkdir "${seleniumDirPath}"`
        : `mkdir -p "${seleniumDirPath}"`;
      
      appendTerminalOutput(`创建独立的Selenium目录: ${seleniumDirPath}`, "info");
      const mkdirResult = await executeCommandWithStream(mkdirCmd, process.cwd());
      
      if (!mkdirResult.success) {
        appendTerminalOutput(`创建独立的Selenium目录失败，将使用默认目录`, "warning");
        return false;
      }
      
      // 创建或修改配置文件，指定使用独立的Selenium目录
      const configContent = `[DEFAULT]
encoding = utf-8-sig
browser = edge
save_user_profile = false
backdrop_forced_upload = false
logging_level = INFO
selenium_dir = ${seleniumDirPath}
`;
      
      // 写入配置文件
      const configFilePath = isWindows
        ? `${workingDirectory}\\config.ini`
        : `${workingDirectory}/config.ini`;
        
      const response = await fetch("/api/write-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filePath: configFilePath,
          content: configContent,
        }),
      });
      
      if (response.ok) {
        appendTerminalOutput(`成功创建配置文件，使用独立的Selenium目录`, "success");
        return true;
      } else {
        const errorData = await response.json();
        appendTerminalOutput(`创建配置文件失败: ${errorData.error || "未知错误"}`, "error");
        return false;
      }
    } catch (error: any) {
      appendTerminalOutput(`准备独立的Selenium目录时出错: ${error.message || "未知错误"}`, "error");
      console.error("准备独立的Selenium目录时出错:", error);
      return false;
    }
  }

  // 创建临时工作目录
  const createTempWorkingDirectory = async (originalDirectory: string): Promise<string> => {
    try {
      appendTerminalOutput(`准备创建临时工作目录...`, "info");
      
      // 创建唯一的临时目录名称
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 8);
      const tempDirName = `tmdb_temp_${timestamp}_${randomString}`;
      
      // 在用户临时目录中创建临时目录（避免系统临时目录的权限问题）
      // Windows: %USERPROFILE%\AppData\Local\Temp
      // Linux/Mac: /tmp
      const userTempDir = isWindows 
        ? `${process.env.USERPROFILE || "C:\\Users\\Public"}\\AppData\\Local\\Temp` 
        : "/tmp";
      
      appendTerminalOutput(`使用用户临时目录: ${userTempDir}`, "info");
      
      const tempDirPath = isWindows 
        ? `${userTempDir}\\${tempDirName}`
        : `${userTempDir}/${tempDirName}`;
      
      // 创建临时目录
      const mkdirCmd = isWindows
        ? `mkdir "${tempDirPath}"`
        : `mkdir -p "${tempDirPath}"`;
      
      appendTerminalOutput(`创建临时目录: ${tempDirPath}`, "info");
      const mkdirResult = await executeCommandWithStream(mkdirCmd, process.cwd());
      
      if (!mkdirResult.success) {
        appendTerminalOutput(`创建临时目录失败，将使用原始目录`, "warning");
        return originalDirectory;
      }
      
      // 复制必要的文件到临时目录
      appendTerminalOutput(`复制必要文件到临时目录...`, "info");
      
      // 复制config.ini（如果存在）
      const checkConfigCmd = isWindows
        ? `if exist "${originalDirectory}\\config.ini" echo exists`
        : `test -f "${originalDirectory}/config.ini" && echo exists`;
      
      const configCheckResult = await executeCommandWithStream(checkConfigCmd, process.cwd());
      
      if (configCheckResult.stdoutText?.includes("exists") || configCheckResult.errorText?.includes("exists")) {
        const copyConfigCmd = isWindows
          ? `copy "${originalDirectory}\\config.ini" "${tempDirPath}\\config.ini" /Y`
          : `cp "${originalDirectory}/config.ini" "${tempDirPath}/config.ini"`;
        
        await executeCommandWithStream(copyConfigCmd, process.cwd());
        appendTerminalOutput(`已复制config.ini文件`, "info");
      }
      
      // 复制import.csv（如果存在）
      const checkCsvCmd = isWindows
        ? `if exist "${originalDirectory}\\import.csv" echo exists`
        : `test -f "${originalDirectory}/import.csv" && echo exists`;
      
      const csvCheckResult = await executeCommandWithStream(checkCsvCmd, process.cwd());
      
      if (csvCheckResult.stdoutText?.includes("exists") || csvCheckResult.errorText?.includes("exists")) {
        const copyCsvCmd = isWindows
          ? `copy "${originalDirectory}\\import.csv" "${tempDirPath}\\import.csv" /Y`
          : `cp "${originalDirectory}/import.csv" "${tempDirPath}/import.csv"`;
        
        await executeCommandWithStream(copyCsvCmd, process.cwd());
        appendTerminalOutput(`已复制import.csv文件`, "info");
      }
      
      // 创建Python模块链接（Windows上使用复制，Linux上使用符号链接）
      if (isWindows) {
        // Windows上复制整个tmdb-import目录
        const copyPythonModuleCmd = `xcopy "${originalDirectory}\\tmdb-import" "${tempDirPath}\\tmdb-import" /E /I /H /Y`;
        await executeCommandWithStream(copyPythonModuleCmd, process.cwd());
      } else {
        // Linux上创建符号链接
        const createPythonLinkCmd = `ln -s "${originalDirectory}/tmdb-import" "${tempDirPath}/tmdb-import"`;
        await executeCommandWithStream(createPythonLinkCmd, process.cwd());
      }
      
      appendTerminalOutput(`临时工作目录创建成功: ${tempDirPath}`, "success");
      return tempDirPath;
    } catch (error: any) {
      appendTerminalOutput(`创建临时工作目录时出错: ${error.message || "未知错误"}`, "error");
      console.error("创建临时工作目录时出错:", error);
      return originalDirectory; // 出错时使用原始目录
    }
  }

  // 创建临时配置文件
  const createTempConfig = async (workingDirectory: string) => {
    try {
      appendTerminalOutput(`准备创建临时配置文件...`, "info");
      
      // 检查是否存在原始配置文件
      const checkConfigCmd = isWindows
        ? `if exist "${workingDirectory}\\config.ini" echo exists`
        : `test -f "${workingDirectory}/config.ini" && echo exists`;
      
      
      const configCheckResult = await executeCommandWithStream(checkConfigCmd, process.cwd());
      
      // 如果存在原始配置文件，创建备份
      if (configCheckResult.success && (configCheckResult.errorText || "").includes("exists")) {
        appendTerminalOutput(`检测到原始配置文件，创建备份...`, "info");
        
        const backupCmd = isWindows
          ? `copy "${workingDirectory}\\config.ini" "${workingDirectory}\\config.ini.bak"`
          : `cp "${workingDirectory}/config.ini" "${workingDirectory}/config.ini.bak"`;
        
        await executeCommandWithStream(backupCmd, process.cwd());
      }
      
      // 创建增强版临时配置文件内容，添加更多Edge浏览器相关配置
      const configContent = `[DEFAULT]
encoding = utf-8-sig
browser = edge
save_user_profile = false
backdrop_forced_upload = false
logging_level = INFO
`;
      
      // 写入临时配置文件，使用正确的路径分隔符
      const configFilePath = isWindows
        ? `${workingDirectory}\\config.ini`
        : `${workingDirectory}/config.ini`;
        
      const response = await fetch("/api/write-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filePath: configFilePath,
          content: configContent,
        }),
      });
      
      if (response.ok) {
        appendTerminalOutput(`成功创建临时配置文件，已禁用用户配置文件保存功能`, "success");
        return true;
      } else {
        const errorData = await response.json();
        appendTerminalOutput(`创建临时配置文件失败: ${errorData.error || "未知错误"}`, "error");
        return false;
      }
    } catch (error: any) {
      appendTerminalOutput(`创建临时配置文件时出错: ${error.message || "未知错误"}`, "error");
      console.error("创建临时配置文件时出错:", error);
      return false;
    }
  }

  return (
    <>
      {/* 根据是否在标签页中决定是否使用Dialog组件 */}
      {inTab ? (
        renderInTabContent()
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent 
            className={`${isFullscreen ? 'max-w-full w-full h-full max-h-full inset-0 rounded-none' : 'max-w-[90vw] max-h-[90vh]'} overflow-y-auto p-0`}
            style={{
              transform: isFullscreen ? 'none' : undefined,
              top: isFullscreen ? '0' : undefined,
              left: isFullscreen ? '0' : undefined,
            }}
          >
            <DialogHeader className="p-6 pb-2 flex flex-row items-center justify-between">
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
                  onClick={forceRefreshProcessTab}
                  title="如果页面不正常，点击刷新"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsFullscreen(!isFullscreen)}
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
            {renderContent()}
        </DialogContent>
      </Dialog>
      )}

      {/* 修复Bug对话框 */}
      <FixTMDBImportBugDialog 
        open={showFixBugDialog} 
        onOpenChange={setShowFixBugDialog} 
        onCopyFix={() => {
          toast({
            title: "修复代码已复制",
            description: "已复制到剪贴板，可粘贴到common.py文件中",
          });
          setCopyFeedback("修复代码已复制到剪贴板");
          setTimeout(() => setCopyFeedback(null), 3000);
        }}
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

  // 搜索相关函数已简化




