"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Square,
  RefreshCw,
  Eye,
  Download,
  Loader2,
  TrendingUp,
  BarChart3,
  Calendar,
  Timer,
  Zap,
  Target,
  AlertTriangle
} from "lucide-react"
import { StorageManager, ScheduledTask } from "@/lib/storage"
import { taskScheduler } from "@/lib/scheduler"
import { toast } from "@/components/ui/use-toast"

interface TaskExecutionMonitorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TaskExecutionStatus {
  id: string
  name: string
  status: 'running' | 'success' | 'failed' | 'pending' | 'cancelled'
  progress: number
  currentStep: string
  startTime?: string
  endTime?: string
  duration?: number
  error?: string
  logs: ExecutionLog[]
}

interface ExecutionLog {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  step: string
  message: string
  details?: any
}

interface ExecutionStatistics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  successRate: number
  todayExecutions: number
  weeklyExecutions: number
}

export default function TaskExecutionMonitor({ open, onOpenChange }: TaskExecutionMonitorProps) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [executionStatuses, setExecutionStatuses] = useState<Map<string, TaskExecutionStatus>>(new Map())
  const [statistics, setStatistics] = useState<ExecutionStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const allTasks = await StorageManager.getScheduledTasks()
      setTasks(allTasks)
      
      // 更新执行状态
      updateExecutionStatuses(allTasks)
      
      // 计算统计信息
      calculateStatistics(allTasks)
    } catch (error) {
      console.error("加载数据失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载任务执行数据",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [])

  // 更新执行状态
  const updateExecutionStatuses = (taskList: ScheduledTask[]) => {
    const newStatuses = new Map<string, TaskExecutionStatus>()
    
    taskList.forEach(task => {
      const isRunning = taskScheduler.isTaskRunning(task.id)
      
      let status: TaskExecutionStatus['status'] = 'pending'
      if (isRunning) {
        status = 'running'
      } else if (task.lastRunStatus === 'success') {
        status = 'success'
      } else if (task.lastRunStatus === 'failed') {
        status = 'failed'
      }
      
      const executionStatus: TaskExecutionStatus = {
        id: task.id,
        name: task.name,
        status,
        progress: isRunning ? getTaskProgress(task.id) : 100,
        currentStep: isRunning ? getTaskCurrentStep(task.id) : '',
        startTime: task.lastRun,
        endTime: task.lastRun && !isRunning ? task.lastRun : undefined,
        duration: calculateDuration(task),
        error: task.lastRunError,
        logs: getTaskLogs(task.id)
      }
      
      newStatuses.set(task.id, executionStatus)
    })
    
    setExecutionStatuses(newStatuses)
  }

  // 获取任务进度（模拟）
  const getTaskProgress = (taskId: string): number => {
    // 这里应该从实际的任务执行器获取进度
    // 目前返回模拟数据
    return Math.floor(Math.random() * 100)
  }

  // 获取任务当前步骤（模拟）
  const getTaskCurrentStep = (taskId: string): string => {
    const steps = [
      "初始化任务",
      "连接平台",
      "提取数据",
      "处理数据",
      "生成CSV",
      "上传数据",
      "标记完成"
    ]
    return steps[Math.floor(Math.random() * steps.length)]
  }

  // 获取任务日志（模拟）
  const getTaskLogs = (taskId: string): ExecutionLog[] => {
    // 这里应该从实际的日志系统获取
    // 目前返回模拟数据
    return []
  }

  // 计算执行时长
  const calculateDuration = (task: ScheduledTask): number | undefined => {
    if (!task.lastRun) return undefined
    
    // 这里应该从实际的执行记录计算
    // 目前返回模拟数据
    return Math.floor(Math.random() * 300) + 30 // 30-330秒
  }

  // 计算统计信息
  const calculateStatistics = (taskList: ScheduledTask[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const executedTasks = taskList.filter(t => t.lastRun)
    const successfulTasks = taskList.filter(t => t.lastRunStatus === 'success')
    const failedTasks = taskList.filter(t => t.lastRunStatus === 'failed')
    
    const todayTasks = taskList.filter(t => 
      t.lastRun && new Date(t.lastRun) >= today
    )
    
    const weeklyTasks = taskList.filter(t => 
      t.lastRun && new Date(t.lastRun) >= weekAgo
    )
    
    // 计算平均执行时间（模拟）
    const averageTime = executedTasks.length > 0 
      ? executedTasks.reduce((sum, task) => sum + (calculateDuration(task) || 0), 0) / executedTasks.length
      : 0
    
    const stats: ExecutionStatistics = {
      totalExecutions: executedTasks.length,
      successfulExecutions: successfulTasks.length,
      failedExecutions: failedTasks.length,
      averageExecutionTime: averageTime,
      successRate: executedTasks.length > 0 ? (successfulTasks.length / executedTasks.length) * 100 : 0,
      todayExecutions: todayTasks.length,
      weeklyExecutions: weeklyTasks.length
    }
    
    setStatistics(stats)
  }

  // 自动刷新
  useEffect(() => {
    if (!open || !autoRefresh) return

    const interval = setInterval(() => {
      loadData()
    }, 5000) // 每5秒刷新一次

    return () => clearInterval(interval)
  }, [open, autoRefresh, loadData])

  // 初始化
  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, loadData])

  // 格式化时间
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "未设置"
    try {
      return new Date(timeStr).toLocaleString()
    } catch (error) {
      return "时间格式错误"
    }
  }

  // 格式化持续时间
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "未知"
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`
    } else {
      return `${remainingSeconds}秒`
    }
  }

  // 获取状态图标
  const getStatusIcon = (status: TaskExecutionStatus['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <Square className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: TaskExecutionStatus['status']) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500'
      case 'success':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'cancelled':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  // 获取状态文本
  const getStatusText = (status: TaskExecutionStatus['status']) => {
    switch (status) {
      case 'running':
        return '执行中'
      case 'success':
        return '成功'
      case 'failed':
        return '失败'
      case 'cancelled':
        return '已取消'
      default:
        return '等待中'
    }
  }

  // 渲染任务执行卡片
  const renderExecutionCard = (task: ScheduledTask) => {
    const executionStatus = executionStatuses.get(task.id)
    if (!executionStatus) return null
    
    return (
      <Card key={task.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(executionStatus.status)}
              <CardTitle className="text-sm">{executionStatus.name}</CardTitle>
              <Badge variant="secondary" className={`${getStatusColor(executionStatus.status)} text-white text-xs`}>
                {getStatusText(executionStatus.status)}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    查看详情
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* 进度条 */}
            {executionStatus.status === 'running' && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>执行进度</span>
                  <span>{executionStatus.progress}%</span>
                </div>
                <Progress value={executionStatus.progress} className="h-2" />
                {executionStatus.currentStep && (
                  <p className="text-xs text-muted-foreground mt-1">
                    当前步骤: {executionStatus.currentStep}
                  </p>
                )}
              </div>
            )}
            
            {/* 执行信息 */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">开始时间:</span>
                <div>{formatTime(executionStatus.startTime)}</div>
              </div>
              
              <div>
                <span className="text-muted-foreground">执行时长:</span>
                <div>{formatDuration(executionStatus.duration)}</div>
              </div>
            </div>
            
            {/* 错误信息 */}
            {executionStatus.error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                <div className="flex items-center space-x-1 text-red-700 mb-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-medium">执行错误</span>
                </div>
                <div className="text-red-600">{executionStatus.error}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>任务执行监控</span>
              {statistics && (
                <Badge variant="outline">
                  {tasks.length} 个任务
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? '自动刷新' : '手动刷新'}
              </Button>
              
              {!autoRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* 统计信息 */}
          {statistics && (
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">总执行次数</p>
                      <p className="text-2xl font-bold">{statistics.totalExecutions}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">成功率</p>
                      <p className="text-2xl font-bold text-green-600">
                        {statistics.successRate.toFixed(1)}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">今日执行</p>
                      <p className="text-2xl font-bold text-blue-600">{statistics.todayExecutions}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">平均时长</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatDuration(Math.round(statistics.averageExecutionTime))}
                      </p>
                    </div>
                    <Timer className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 任务执行列表 */}
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">加载中...</span>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="grid grid-cols-2 gap-4 pr-4">
                  {tasks.length > 0 ? (
                    tasks.map(renderExecutionCard)
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">暂无任务</h3>
                      <p className="text-muted-foreground">
                        还没有任何定时任务在执行
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}