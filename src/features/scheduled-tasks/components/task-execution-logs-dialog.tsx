"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Progress } from "@/shared/components/ui/progress"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Clock,
  Play,
  PauseCircle,
  RefreshCw,
  X
} from "lucide-react"
import { ExecutionLog, ScheduledTask } from "@/lib/data/storage"
import { taskExecutionLogger, StepInfo } from "@/lib/data/task-execution-logger"

interface TaskExecutionLogsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  runningTasks: ScheduledTask[]
}

export function TaskExecutionLogsDialog({
  open,
  onOpenChange,
  runningTasks
}: TaskExecutionLogsDialogProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [taskLogs, setTaskLogs] = useState<Map<string, ExecutionLog[]>>(new Map())
  const [taskProgress, setTaskProgress] = useState<Map<string, number>>(new Map())
  const [taskCurrentStep, setTaskCurrentStep] = useState<Map<string, string>>(new Map())
  const [taskSteps, setTaskSteps] = useState<Map<string, Map<string, StepInfo>>>(new Map())
  const [autoRefresh, setAutoRefresh] = useState(true)

  // 更新任务数据
  const updateTaskData = useCallback(() => {
    const newLogs = new Map<string, ExecutionLog[]>()
    const newProgress = new Map<string, number>()
    const newCurrentStep = new Map<string, string>()
    const newSteps = new Map<string, Map<string, StepInfo>>()

    runningTasks.forEach(task => {
      newLogs.set(task.id, taskExecutionLogger.getTaskLogs(task.id))
      newProgress.set(task.id, taskExecutionLogger.getTaskProgress(task.id))
      newCurrentStep.set(task.id, taskExecutionLogger.getTaskCurrentStep(task.id))
      newSteps.set(task.id, taskExecutionLogger.getTaskSteps(task.id))
    })

    setTaskLogs(newLogs)
    setTaskProgress(newProgress)
    setTaskCurrentStep(newCurrentStep)
    setTaskSteps(newSteps)
  }, [runningTasks])

  // 自动刷新
  useEffect(() => {
    if (!open || !autoRefresh) return

    const interval = setInterval(updateTaskData, 1000)
    return () => clearInterval(interval)
  }, [open, autoRefresh, updateTaskData])

  // 初始加载和任务变化时更新
  useEffect(() => {
    if (open) {
      updateTaskData()
      
      // 如果没有选中的任务或选中的任务不在运行列表中，选择第一个
      if (!selectedTaskId || !runningTasks.find(t => t.id === selectedTaskId)) {
        setSelectedTaskId(runningTasks[0]?.id || null)
      }
    }
  }, [open, runningTasks, selectedTaskId, updateTaskData])

  // 获取日志级别对应的图标和颜色
  const getLogLevelInfo = (level: ExecutionLog['level']) => {
    switch (level) {
      case 'success':
        return { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-50' }
      case 'error':
        return { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-50' }
      case 'warning':
        return { icon: <AlertCircle className="h-4 w-4" />, color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
      default:
        return { icon: <Info className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-50' }
    }
  }

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN')
  }

  // 获取任务状态
  const getTaskStatus = (task: ScheduledTask) => {
    if (task.isRunning) {
      return { label: '执行中', color: 'bg-blue-500', icon: <Play className="h-3 w-3" /> }
    } else if (task.lastRunStatus === 'success') {
      return { label: '成功', color: 'bg-green-500', icon: <CheckCircle2 className="h-3 w-3" /> }
    } else if (task.lastRunStatus === 'failed') {
      return { label: '失败', color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> }
    } else if (task.lastRunStatus === 'user_interrupted') {
      return { label: '用户中断', color: 'bg-orange-500', icon: <PauseCircle className="h-3 w-3" /> }
    } else {
      return { label: '等待', color: 'bg-gray-500', icon: <Clock className="h-3 w-3" /> }
    }
  }

  const selectedTask = runningTasks.find(t => t.id === selectedTaskId)
  const selectedLogs = selectedTaskId ? taskLogs.get(selectedTaskId) || [] : []
  const selectedProgress = selectedTaskId ? taskProgress.get(selectedTaskId) || 0 : 0
  const selectedCurrentStep = selectedTaskId ? taskCurrentStep.get(selectedTaskId) || '' : ''
  const selectedSteps = selectedTaskId ? taskSteps.get(selectedTaskId) || new Map() : new Map()

  // 步骤状态图标
  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  // 步骤状态颜色
  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30'
      case 'completed':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30'
      case 'failed':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30'
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pr-12">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Play className="h-5 w-5 mr-2" />
              任务执行日志
              <Badge className="ml-3" variant="outline">
                {runningTasks.length} 个任务
              </Badge>
            </div>
            <div className="flex items-center gap-2 mr-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? '自动' : '手动'}
              </Button>
              {!autoRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={updateTaskData}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* 左侧任务列表 */}
          <div className="w-80 flex-shrink-0">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">正在执行的任务</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2 p-4 pt-0">
                    {runningTasks.map(task => {
                      const status = getTaskStatus(task)
                      const progress = taskProgress.get(task.id) || 0
                      const currentStep = taskCurrentStep.get(task.id) || ''
                      const isSelected = selectedTaskId === task.id

                      return (
                        <Card
                          key={task.id}
                          className={`cursor-pointer transition-all ${
                            isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
                          }`}
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-sm truncate flex-1">
                                {task.name}
                              </div>
                              <Badge
                                variant="secondary"
                                className={`${status.color} text-white text-xs`}
                              >
                                <span className="flex items-center">
                                  {status.icon}
                                  <span className="ml-1">{status.label}</span>
                                </span>
                              </Badge>
                            </div>
                            
                            {task.isRunning && (
                              <>
                                <div className="mb-2">
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>进度</span>
                                    <span>{progress}%</span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                </div>
                                
                                {currentStep && (
                                  <div className="text-xs text-muted-foreground">
                                    当前步骤: {currentStep}
                                  </div>
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* 右侧日志详情 */}
          <div className="flex-1 min-w-0">
            {selectedTask ? (
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{selectedTask.name} - 执行日志</span>
                    <div className="flex items-center gap-2">
                      {selectedTask.isRunning && (
                        <>
                          <Badge variant="outline">{selectedProgress}%</Badge>
                          <Badge variant="outline">{selectedCurrentStep}</Badge>
                        </>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4 p-4 pt-0">
                      {/* 步骤状态概览 */}
                      {selectedSteps.size > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">执行步骤</h4>
                          <div className="grid gap-2">
                            {Array.from(selectedSteps.entries()).map(([stepKey, stepInfo]) => (
                              <div
                                key={stepKey}
                                className={`p-3 rounded-lg border ${getStepStatusColor(stepInfo.status)}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getStepStatusIcon(stepInfo.status)}
                                    <span className="text-sm font-medium">{stepKey}</span>
                                    <span className="text-sm text-muted-foreground">{stepInfo.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {stepInfo.status === 'running' && (
                                      <Badge variant="outline" className="text-xs">进行中</Badge>
                                    )}
                                    {stepInfo.status === 'completed' && (
                                      <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">已完成</Badge>
                                    )}
                                    {stepInfo.status === 'failed' && (
                                      <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">失败</Badge>
                                    )}
                                    {stepInfo.status === 'pending' && (
                                      <Badge variant="outline" className="text-xs">等待中</Badge>
                                    )}
                                  </div>
                                </div>
                                {stepInfo.error && (
                                  <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                                    错误: {stepInfo.error}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 详细日志 */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">详细日志</h4>
                        {selectedLogs.length > 0 ? (
                        selectedLogs.map(log => {
                          const levelInfo = getLogLevelInfo(log.level)
                          return (
                            <div
                              key={log.id}
                              className={`p-3 rounded-lg border ${levelInfo.bgColor}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={levelInfo.color}>
                                  {levelInfo.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="font-medium text-sm">
                                      {log.step}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatTime(log.timestamp)}
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {log.message}
                                  </div>
                                  {log.details && (
                                    <div className="mt-2 text-xs font-mono bg-gray-100 p-2 rounded">
                                      {JSON.stringify(log.details, null, 2)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            暂无执行日志
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>选择一个任务查看执行日志</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
