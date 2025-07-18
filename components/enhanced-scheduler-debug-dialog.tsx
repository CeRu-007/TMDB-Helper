"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Timer,
  Activity,
  Loader2
} from "lucide-react"
import { taskScheduler } from "@/lib/scheduler"
import { StorageManager, ScheduledTask } from "@/lib/storage"

interface EnhancedSchedulerDebugDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SchedulerStatus {
  isInitialized: boolean
  activeTimers: number
  runningTasks: number
  timerDetails: Array<{taskId: string, nextRun?: string}>
}

interface TaskStatus {
  id: string
  name: string
  enabled: boolean
  isRunning: boolean
  hasActiveTimer: boolean
  type: string
  schedule: any
  nextRun?: string
  lastRun?: string
  lastRunStatus?: string
  timeDiff?: number
  status: 'normal' | 'warning' | 'error'
  issues: string[]
}

export default function EnhancedSchedulerDebugDialog({ open, onOpenChange }: EnhancedSchedulerDebugDialogProps) {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SchedulerStatus | null>(null)
  const [tasks, setTasks] = useState<TaskStatus[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const loadStatus = async () => {
    try {
      setLoading(true)
      
      // 获取调度器状态
      const schedulerStatus = taskScheduler.getSchedulerStatus()
      setStatus(schedulerStatus)
      
      // 获取所有任务
      const allTasks = await StorageManager.getScheduledTasks()
      const now = new Date()
      
      // 分析每个任务的状态
      const taskStatuses: TaskStatus[] = allTasks.map(task => {
        const issues: string[] = []
        let status: 'normal' | 'warning' | 'error' = 'normal'
        
        // 检查任务是否有定时器
        const hasActiveTimer = schedulerStatus.timerDetails.some(t => t.taskId === task.id)
        
        // 检查任务是否应该有定时器但没有
        if (task.enabled && !hasActiveTimer) {
          issues.push('任务已启用但没有活跃的定时器')
          status = 'error'
        }
        
        // 检查任务是否错过了执行时间
        let timeDiff: number | undefined
        if (task.nextRun) {
          const nextRunTime = new Date(task.nextRun)
          timeDiff = Math.round((now.getTime() - nextRunTime.getTime()) / (60 * 1000))
          
          if (timeDiff > 5) {
            issues.push(`任务错过执行时间 ${timeDiff} 分钟`)
            status = 'error'
          } else if (timeDiff > 0) {
            issues.push(`任务即将错过执行时间`)
            status = 'warning'
          }
        } else if (task.enabled) {
          issues.push('任务没有设置下次执行时间')
          status = 'warning'
        }
        
        // 检查任务关联的项目是否存在
        if (!task.itemId || task.itemId.length > 50 || task.itemId.includes(' ')) {
          issues.push('任务关联的项目ID格式异常')
          status = 'error'
        }
        
        // 检查最后执行状态
        if (task.lastRunStatus === 'failed') {
          issues.push('上次执行失败')
          if (status === 'normal') status = 'warning'
        }
        
        return {
          id: task.id,
          name: task.name,
          enabled: task.enabled,
          isRunning: taskScheduler.isTaskRunning(task.id),
          hasActiveTimer,
          type: task.type,
          schedule: task.schedule,
          nextRun: task.nextRun,
          lastRun: task.lastRun,
          lastRunStatus: task.lastRunStatus,
          timeDiff,
          status,
          issues
        }
      })
      
      setTasks(taskStatuses)
    } catch (error) {
      console.error('加载调度器状态失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadStatus()
    setRefreshing(false)
  }

  const handleForceValidation = async () => {
    try {
      setRefreshing(true)
      // 触发调度器重新初始化
      await taskScheduler.initialize()
      await loadStatus()
    } catch (error) {
      console.error('强制验证失败:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleExecuteTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return
      
      const fullTask = await StorageManager.getScheduledTasks().then(tasks => 
        tasks.find(t => t.id === taskId)
      )
      
      if (fullTask) {
        await taskScheduler.executeTaskManually(fullTask)
        await loadStatus()
      }
    } catch (error) {
      console.error('手动执行任务失败:', error)
    }
  }

  useEffect(() => {
    if (open) {
      loadStatus()
    }
  }, [open])

  const getStatusIcon = (task: TaskStatus) => {
    if (task.isRunning) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    }
    if (task.status === 'error') {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (task.status === 'warning') {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
    if (!task.enabled) {
      return <Pause className="h-4 w-4 text-gray-400" />
    }
    if (task.hasActiveTimer) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <Clock className="h-4 w-4 text-gray-400" />
  }

  const getStatusText = (task: TaskStatus) => {
    if (task.isRunning) return '执行中'
    if (!task.enabled) return '已禁用'
    if (task.status === 'error') return '异常'
    if (task.status === 'warning') return '警告'
    if (task.hasActiveTimer) return '正常'
    return '无定时器'
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '未设置'
    try {
      return new Date(timeStr).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '格式错误'
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>定时任务调度器诊断</DialogTitle>
            <DialogDescription>
              正在加载调度器状态信息...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const errorTasks = tasks.filter(t => t.status === 'error')
  const warningTasks = tasks.filter(t => t.status === 'warning')
  const normalTasks = tasks.filter(t => t.status === 'normal')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            增强定时任务调度器诊断
          </DialogTitle>
          <DialogDescription>
            检查定时任务调度器的运行状态和问题诊断，包含自动修复建议。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button 
              onClick={handleRefresh} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              刷新状态
            </Button>
            <Button 
              onClick={handleForceValidation} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <Timer className="h-4 w-4 mr-2" />
              强制验证
            </Button>
          </div>

          {/* 总体状态 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">调度器状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {status?.isInitialized ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {status?.isInitialized ? '已初始化' : '未初始化'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">活跃定时器</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {status?.activeTimers || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">运行中任务</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {status?.runningTasks || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">问题任务</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {errorTasks.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 问题警告 */}
          {errorTasks.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                发现 {errorTasks.length} 个任务存在严重问题，{warningTasks.length} 个任务有警告。
                建议点击"强制验证"按钮尝试自动修复。
              </AlertDescription>
            </Alert>
          )}

          {/* 任务详情 */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                全部任务 ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="error" className="text-red-600">
                异常 ({errorTasks.length})
              </TabsTrigger>
              <TabsTrigger value="warning" className="text-yellow-600">
                警告 ({warningTasks.length})
              </TabsTrigger>
              <TabsTrigger value="normal" className="text-green-600">
                正常 ({normalTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {tasks.map(task => (
                <TaskStatusCard 
                  key={task.id} 
                  task={task} 
                  onExecute={handleExecuteTask}
                  getStatusIcon={getStatusIcon}
                  getStatusText={getStatusText}
                  formatTime={formatTime}
                />
              ))}
            </TabsContent>

            <TabsContent value="error" className="space-y-4">
              {errorTasks.map(task => (
                <TaskStatusCard 
                  key={task.id} 
                  task={task} 
                  onExecute={handleExecuteTask}
                  getStatusIcon={getStatusIcon}
                  getStatusText={getStatusText}
                  formatTime={formatTime}
                />
              ))}
            </TabsContent>

            <TabsContent value="warning" className="space-y-4">
              {warningTasks.map(task => (
                <TaskStatusCard 
                  key={task.id} 
                  task={task} 
                  onExecute={handleExecuteTask}
                  getStatusIcon={getStatusIcon}
                  getStatusText={getStatusText}
                  formatTime={formatTime}
                />
              ))}
            </TabsContent>

            <TabsContent value="normal" className="space-y-4">
              {normalTasks.map(task => (
                <TaskStatusCard 
                  key={task.id} 
                  task={task} 
                  onExecute={handleExecuteTask}
                  getStatusIcon={getStatusIcon}
                  getStatusText={getStatusText}
                  formatTime={formatTime}
                />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TaskStatusCardProps {
  task: TaskStatus
  onExecute: (taskId: string) => void
  getStatusIcon: (task: TaskStatus) => React.ReactNode
  getStatusText: (task: TaskStatus) => string
  formatTime: (timeStr?: string) => string
}

function TaskStatusCard({ task, onExecute, getStatusIcon, getStatusText, formatTime }: TaskStatusCardProps) {
  return (
    <Card className={`${
      task.status === 'error' ? 'border-red-200 bg-red-50' :
      task.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
      'border-gray-200'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(task)}
            <div>
              <CardTitle className="text-base">{task.name}</CardTitle>
              <CardDescription className="text-sm">
                类型: {task.type} | 调度: {task.schedule.type === 'daily' ? '每日' : '每周'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={task.enabled ? "default" : "secondary"}>
              {getStatusText(task)}
            </Badge>
            {task.enabled && !task.isRunning && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onExecute(task.id)}
              >
                <Play className="h-3 w-3 mr-1" />
                执行
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">下次执行:</span>
            <div className="font-medium">
              {formatTime(task.nextRun)}
              {task.timeDiff !== undefined && task.timeDiff > 0 && (
                <span className="text-red-500 ml-1">
                  (错过 {task.timeDiff}分钟)
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="text-gray-500">上次执行:</span>
            <div className="font-medium">{formatTime(task.lastRun)}</div>
          </div>
          <div>
            <span className="text-gray-500">执行状态:</span>
            <div className="font-medium">
              {task.lastRunStatus === 'success' && <span className="text-green-600">成功</span>}
              {task.lastRunStatus === 'failed' && <span className="text-red-600">失败</span>}
              {task.lastRunStatus === 'user_interrupted' && <span className="text-yellow-600">用户中断</span>}
              {!task.lastRunStatus && <span className="text-gray-400">未执行</span>}
            </div>
          </div>
          <div>
            <span className="text-gray-500">定时器:</span>
            <div className="font-medium">
              {task.hasActiveTimer ? (
                <span className="text-green-600">活跃</span>
              ) : (
                <span className="text-red-600">缺失</span>
              )}
            </div>
          </div>
        </div>
        
        {task.issues.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <div className="text-sm font-medium text-gray-700 mb-1">发现的问题:</div>
            <ul className="text-sm text-gray-600 space-y-1">
              {task.issues.map((issue, index) => (
                <li key={index} className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}