"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ModernTimePicker } from "@/components/ui/modern-time-picker"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Clock,
  Calendar,
  Trash2,
  Plus,
  Play,
  PauseCircle,
  PlayCircle,
  Settings,
  CheckCircle2,
  XCircle,
  AlarmClock,
  RotateCw,
  Upload,
  Check,
  Info,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { StorageManager, TMDBItem, ScheduledTask } from "@/lib/storage"
import { taskScheduler } from "@/lib/scheduler"
import { toast } from "@/components/ui/use-toast"

interface ScheduledTaskDialogProps {
  item: TMDBItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (item: TMDBItem) => void
  existingTask?: ScheduledTask
  onTaskSaved?: (task: ScheduledTask) => void
}

export default function ScheduledTaskDialog({ item, open, onOpenChange, onUpdate, existingTask, onTaskSaved }: ScheduledTaskDialogProps) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [isEditingTask, setIsEditingTask] = useState(false)
  const [currentTask, setCurrentTask] = useState<ScheduledTask | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [isRunningTask, setIsRunningTask] = useState(false)
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)

  // 加载任务或使用传入的existingTask
  useEffect(() => {
    if (open) {
      console.log("ScheduledTaskDialog 打开，item.id:", item.id);
      if (existingTask) {
        // 如果传入了existingTask，直接使用它
        console.log("使用传入的 existingTask:", existingTask);
        setTasks([existingTask])
        setLoading(false)
      } else {
        // 否则从存储中加载任务
        console.log("从存储中加载任务...");
      loadTasks()
    }
    }
  }, [open, item.id, existingTask])

  // 加载任务
  const loadTasks = async () => {
    setLoading(true)
    try {
      console.log("开始加载定时任务...");
      const allTasks = await StorageManager.getScheduledTasks()
      console.log("所有定时任务:", allTasks.length);
      const itemTasks = allTasks.filter(task => task.itemId === item.id)
      console.log(`项目 ${item.id} 的定时任务:`, itemTasks.length);
      setTasks(itemTasks)
    } catch (error) {
      console.error("加载定时任务失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载定时任务列表",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 创建新任务
  const handleAddTask = () => {
    console.log("创建新任务，关联项目:", item);
    const newTask: ScheduledTask = {
      id: uuidv4(),
      itemId: item.id,
      itemTitle: item.title,
      itemTmdbId: item.tmdbId,
      name: `${item.title} 定时任务`,
      type: "tmdb-import",
      schedule: {
        type: "weekly",
        dayOfWeek: new Date().getDay(), // 默认为今天
        hour: new Date().getHours(),
        minute: 0
      },
      action: {
        seasonNumber: item.seasons && item.seasons.length > 0 
          ? Math.max(...item.seasons.map(s => s.seasonNumber)) 
          : 1,
        autoUpload: true,
        autoRemoveMarked: true,
        autoConfirm: true, // 默认自动确认上传
        removeIqiyiAirDate: item.platformUrl?.includes('iqiyi.com') || false, // 爱奇艺平台自动启用
        autoMarkUploaded: true // 默认自动标记已上传的集数
      },
      enabled: false, // 强制设置为禁用状态
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    console.log("新建任务数据:", newTask);
    setCurrentTask(newTask)
    setIsAddingTask(true)
    setHasUnsavedChanges(false)
    setIsAutoSaving(false)
  }

  // 编辑任务
  const handleEditTask = (task: ScheduledTask) => {
    setCurrentTask({...task})
    setIsEditingTask(true)
    setHasUnsavedChanges(false)
    setIsAutoSaving(false)
  }

  // 保存任务
  const handleSaveTask = async () => {
    if (!currentTask) return
    
    try {
      let success: boolean
      const updatedTask = {
        ...currentTask,
        // 如果是新建任务，强制设置为禁用状态
        enabled: isAddingTask ? false : currentTask.enabled,
        updatedAt: new Date().toISOString()
      }
      
      // 确保任务的必要字段都已设置
      if (!updatedTask.itemId) {
        updatedTask.itemId = item.id;
      }
      
      if (!updatedTask.name || updatedTask.name.trim() === '') {
        updatedTask.name = `${item.title} 定时任务`;
      }
      
      console.log(`[ScheduledTaskDialog] 正在保存定时任务: ID=${updatedTask.id}, 项目ID=${updatedTask.itemId}, 名称=${updatedTask.name}, 启用状态=${updatedTask.enabled}`);
      console.log(`[ScheduledTaskDialog] 任务详情:`, JSON.stringify(updatedTask, null, 2));
      
      if (isAddingTask) {
        success = await StorageManager.addScheduledTask(updatedTask)
        if (success) {
          console.log(`[ScheduledTaskDialog] 创建任务成功: ID=${updatedTask.id}`);
          toast({
            title: "创建成功",
            description: "定时任务已创建",
          })
        } else {
          console.error(`[ScheduledTaskDialog] 创建任务失败: ID=${updatedTask.id}`);
          throw new Error("创建定时任务失败");
        }
      } else {
        success = await StorageManager.updateScheduledTask(updatedTask)
        if (success) {
          console.log(`[ScheduledTaskDialog] 更新任务成功: ID=${updatedTask.id}`);
          toast({
            title: "更新成功",
            description: "定时任务已更新",
          })
        } else {
          console.error(`[ScheduledTaskDialog] 更新任务失败: ID=${updatedTask.id}`);
          throw new Error("更新定时任务失败");
        }
      }
      
      if (success) {
        // 验证任务是否已成功保存
        const savedTasks = await StorageManager.forceRefreshScheduledTasks();
        const taskSaved = savedTasks.some(t => t.id === updatedTask.id);
        
        if (!taskSaved) {
          console.error(`[ScheduledTaskDialog] 验证失败: 任务 ID=${updatedTask.id} 未在存储中找到`);
          throw new Error("任务保存验证失败，请尝试重新保存");
        }
        
        console.log(`[ScheduledTaskDialog] 验证成功: 任务 ID=${updatedTask.id} 已成功保存到存储`);
        
        // 清除未保存更改状态
        setHasUnsavedChanges(false)
        
        // 如果提供了onTaskSaved回调，调用它
        if (onTaskSaved) {
          console.log("[ScheduledTaskDialog] 调用onTaskSaved回调");
          onTaskSaved(updatedTask);
        } else if (onUpdate) {
          // 否则使用旧的onUpdate回调
          console.log("[ScheduledTaskDialog] 调用onUpdate回调");
        // 重新加载任务列表
          await loadTasks();
          onUpdate(item);
        } else {
          console.warn("[ScheduledTaskDialog] 未提供onTaskSaved或onUpdate回调，任务已保存但UI可能不会更新");
        }
        
        // 如果任务已启用，重新调度
        if (updatedTask.enabled) {
          await taskScheduler.scheduleTask(updatedTask)
        }
        
        // 关闭编辑框
        cancelEditTask()

        if (success) {
          console.log(`[ScheduledTaskDialog] ${isAddingTask ? '创建' : '更新'}任务成功: ID=${updatedTask.id}`);
          toast({
            title: `${isAddingTask ? '创建' : '更新'}成功`,
            description: `定时任务已${isAddingTask ? '创建' : '更新'}${updatedTask.enabled ? '，并已启用' : '，处于禁用状态'}`,
          })
        }
      }
    } catch (error) {
      console.error("[ScheduledTaskDialog] 保存定时任务失败:", error)
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "无法保存定时任务，请检查项目关联是否正确",
        variant: "destructive"
      })
    }
  }

  // 取消编辑
  const cancelEditTask = () => {
    setCurrentTask(null)
    setIsAddingTask(false)
    setIsEditingTask(false)
    setHasUnsavedChanges(false)
    setIsAutoSaving(false)
  }

  // 确认删除任务
  const confirmDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId)
    setShowDeleteConfirm(true)
  }

  // 执行删除任务
  const handleDeleteTask = async () => {
    if (!taskToDelete) return
    
    try {
      const success = await StorageManager.deleteScheduledTask(taskToDelete)
      if (success) {
        toast({
          title: "删除成功",
          description: "定时任务已删除",
        })
        
        // 重新加载任务列表
        await loadTasks()
      }
    } catch (error) {
      console.error("删除定时任务失败:", error)
      toast({
        title: "删除失败",
        description: "无法删除定时任务",
        variant: "destructive"
      })
    } finally {
      setShowDeleteConfirm(false)
      setTaskToDelete(null)
    }
  }

  // 切换任务启用状态
  const toggleTaskEnabled = async (task: ScheduledTask) => {
    const updatedTask = {
      ...task,
      enabled: !task.enabled,
      updatedAt: new Date().toISOString()
    }
    
    try {
      const success = await StorageManager.updateScheduledTask(updatedTask)
      if (success) {
        // 重新加载任务列表
        await loadTasks()
        
        // 更新调度器
        if (updatedTask.enabled) {
          await taskScheduler.scheduleTask(updatedTask)
          toast({
            title: "任务已启用",
            description: `下次执行时间: ${new Date(updatedTask.nextRun || '').toLocaleString()}`,
          })
        } else {
          await taskScheduler.updateTask(updatedTask)
          toast({
            title: "任务已禁用",
            description: "此任务将不再自动执行",
          })
        }
      }
    } catch (error) {
      console.error("更新任务状态失败:", error)
      toast({
        title: "操作失败",
        description: "无法更新任务状态",
        variant: "destructive"
      })
    }
  }

  // 立即执行任务
  const runTaskNow = async (task: ScheduledTask) => {
    setIsRunningTask(true)
    setRunningTaskId(task.id)
    
    try {
      // 构建执行参数
      const params = new URLSearchParams({
        itemId: task.itemId,
        seasonNumber: task.action.seasonNumber.toString(),
        autoUpload: task.action.autoUpload.toString(),
        autoRemoveMarked: task.action.autoRemoveMarked.toString(),
        // 添加新的参数
        autoConfirm: (task.action.autoConfirm !== false).toString(),
        autoMarkUploaded: (task.action.autoMarkUploaded !== false).toString(),
        removeIqiyiAirDate: (task.action.removeIqiyiAirDate === true).toString()
      })
      
      // 添加额外的参数，用于在找不到项目时进行备用查找
      // 获取当前项目信息
      try {
        const items = await StorageManager.getItemsWithRetry();
        const currentItem = items.find(i => i.id === task.itemId);
        if (currentItem) {
          params.append('tmdbId', currentItem.tmdbId);
          params.append('title', currentItem.title);
          params.append('platformUrl', currentItem.platformUrl || '');
        } else {
          // 如果找不到项目，尝试使用当前组件中的项目
          params.append('tmdbId', item.tmdbId);
          params.append('title', item.title);
          params.append('platformUrl', item.platformUrl || '');
        }
      } catch (error) {
        console.warn("获取项目信息失败，将使用当前项目作为备用:", error);
        params.append('tmdbId', item.tmdbId);
        params.append('title', item.title);
        params.append('platformUrl', item.platformUrl || '');
      }
      
      // 调用API执行任务
      console.log(`执行定时任务: ${task.name}，参数:`, Object.fromEntries(params.entries()));
      const response = await fetch(`/api/execute-scheduled-task?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '执行失败')
      }
      
      const result = await response.json()
      
      // 更新任务的最后执行时间和状态
      const updatedTask = {
        ...task,
        lastRun: new Date().toISOString(),
        lastRunStatus: "success" as const,
        lastRunError: null,
        updatedAt: new Date().toISOString()
      }
      
      await StorageManager.updateScheduledTask(updatedTask)
      
      // 重新加载任务列表
      await loadTasks()
      
      // 如果自动标记了上传的集数，提示用户
      let successMessage = `任务已成功执行，处理了 ${result.csvData?.rows?.length || 0} 条数据`;
      if (result.markedEpisodes && result.markedEpisodes.length > 0) {
        successMessage += `，已标记 ${result.markedEpisodes.length} 个集数为已完成`;
      }
      
      toast({
        title: "执行成功",
        description: successMessage,
      })
    } catch (error: any) {
      console.error("执行任务失败:", error)
      
      // 更新任务的失败状态
      const failedTask = {
        ...task,
        lastRun: new Date().toISOString(),
        lastRunStatus: "failed" as const,
        lastRunError: error.message || "未知错误",
        updatedAt: new Date().toISOString()
      }
      
      await StorageManager.updateScheduledTask(failedTask)
      
      toast({
        title: "执行失败",
        description: error.message || "无法执行任务",
        variant: "destructive"
      })
    } finally {
      setIsRunningTask(false)
      setRunningTaskId(null)
    }
  }

  // 更新任务字段
  const updateTaskField = (field: string, value: any) => {
    if (!currentTask) return
    
    const updatedTask = { ...currentTask }
    
    // 处理嵌套字段更新
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      if (parent === 'schedule') {
        updatedTask.schedule = { ...updatedTask.schedule, [child]: value }
      } else if (parent === 'action') {
        updatedTask.action = { ...updatedTask.action, [child]: value }
      }
    } else {
      (updatedTask as any)[field] = value
    }
    
    setCurrentTask(updatedTask)
    setHasUnsavedChanges(true)
    
    // 如果是启用状态更改，自动保存
    if (field === 'enabled') {
      handleAutoSave(updatedTask)
    }
  }

  // 自动保存功能
  const handleAutoSave = async (taskToSave: ScheduledTask) => {
    if (!taskToSave) return
    
    setIsAutoSaving(true)
    console.log(`[ScheduledTaskDialog] 自动保存任务: ID=${taskToSave.id}, enabled=${taskToSave.enabled}`)
    
    try {
      const updatedTask = {
        ...taskToSave,
        // 如果是新建任务，强制设置为禁用状态
        enabled: isAddingTask ? false : taskToSave.enabled,
        updatedAt: new Date().toISOString()
      }
      
      let success: boolean
      
      if (isAddingTask) {
        success = await StorageManager.addScheduledTask(updatedTask)
      } else {
        success = await StorageManager.updateScheduledTask(updatedTask)
      }
      
      if (success) {
        console.log(`[ScheduledTaskDialog] 自动保存成功: ID=${updatedTask.id}`)
        setHasUnsavedChanges(false)
        
        // 如果任务已启用，重新调度
        if (updatedTask.enabled) {
          await taskScheduler.scheduleTask(updatedTask)
        }
        
        // 显示成功提示
        toast({
          title: "自动保存成功",
          description: `任务已${updatedTask.enabled ? '启用，将按计划自动执行' : '禁用，不会自动执行'}`,
        })
        
        // 如果提供了onTaskSaved回调，调用它
        if (onTaskSaved) {
          onTaskSaved(updatedTask)
        }
        
        // 重新加载任务列表
        await loadTasks()
      } else {
        console.error(`[ScheduledTaskDialog] 自动保存失败: ID=${updatedTask.id}`)
        toast({
          title: "自动保存失败",
          description: "无法保存任务状态，请手动保存",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("[ScheduledTaskDialog] 自动保存失败:", error)
      toast({
        title: "自动保存失败",
        description: "保存任务时出错，请手动保存",
        variant: "destructive"
      })
    } finally {
      setIsAutoSaving(false)
    }
  }

  // 格式化下次执行时间
  const formatNextRunTime = (task: ScheduledTask) => {
    if (!task.nextRun) return "未调度"
    
    try {
      const nextRun = new Date(task.nextRun)
      return nextRun.toLocaleString()
    } catch (error) {
      return "时间格式错误"
    }
  }

  // 格式化上次执行时间
  const formatLastRunTime = (task: ScheduledTask) => {
    if (!task.lastRun) return "从未执行"
    
    try {
      const lastRun = new Date(task.lastRun)
      return lastRun.toLocaleString()
    } catch (error) {
      return "时间格式错误"
    }
  }

  // 获取星期几名称
  const getDayOfWeekName = (day: number) => {
    const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    return days[day] || "未知"
  }

  // 渲染任务列表
  const renderTaskList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">加载中...</span>
        </div>
      )
    }
    
    if (tasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlarmClock className="h-12 w-12 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium">没有定时任务</h3>
          <p className="text-sm text-muted-foreground mb-4">
            创建定时任务可以自动执行TMDB-Import操作
          </p>
          <Button onClick={handleAddTask}>
            <Plus className="h-4 w-4 mr-2" />
            创建定时任务
          </Button>
        </div>
      )
    }
    
    return (
      <div className="space-y-4">
        {tasks.map(task => (
          <Card key={task.id} className={task.enabled ? "" : "opacity-70"}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center">
                    <AlarmClock className="h-4 w-4 mr-2" />
                    {task.name}
                  </CardTitle>
                  <CardDescription>
                    {task.schedule.type === "weekly" ? (
                      <>每周{getDayOfWeekName(task.schedule.dayOfWeek || 0)} {task.schedule.hour}:
                      {task.schedule.minute.toString().padStart(2, '0')}</>
                    ) : (
                      <>每天 {task.schedule.hour}:{task.schedule.minute.toString().padStart(2, '0')}</>
                    )}
                  </CardDescription>
                </div>
                <Badge variant={task.enabled ? "default" : "outline"}>
                  {task.enabled ? "已启用" : "已禁用"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">操作:</span>
                  <span>
                    TMDB-Import 第{task.action.seasonNumber}季
                    {task.action.autoUpload && " + 自动上传"}
                    {task.action.autoRemoveMarked && " + 自动过滤"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">下次执行:</span>
                  <span>{formatNextRunTime(task)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">上次执行:</span>
                  <span>{formatLastRunTime(task)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex justify-between">
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mr-2"
                  onClick={() => handleEditTask(task)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleTaskEnabled(task)}
                >
                  {task.enabled ? (
                    <>
                      <PauseCircle className="h-4 w-4 mr-1" />
                      禁用
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-1" />
                      启用
                    </>
                  )}
                </Button>
              </div>
              <div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mr-2"
                  onClick={() => confirmDeleteTask(task.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => runTaskNow(task)}
                  disabled={isRunningTask}
                >
                  {isRunningTask && runningTaskId === task.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      执行中
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      立即执行
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
        
        <div className="flex justify-center pt-2">
          <Button onClick={handleAddTask}>
            <Plus className="h-4 w-4 mr-2" />
            添加定时任务
          </Button>
        </div>
      </div>
    )
  }

  // 渲染任务编辑表单
  const renderTaskForm = () => {
    if (!currentTask) return null
    
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-name">任务名称</Label>
          <Input
            id="task-name"
            value={currentTask.name}
            onChange={(e) => updateTaskField('name', e.target.value)}
            placeholder="输入任务名称"
            autoFocus
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>执行频率</Label>
          <Select
            value={currentTask.schedule.type}
            onValueChange={(value) => updateTaskField('schedule.type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择执行频率" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">每天</SelectItem>
              <SelectItem value="weekly">每周</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {currentTask.schedule.type === "weekly" && (
          <div className="space-y-2">
            <Label>执行日期</Label>
            <Select
              value={currentTask.schedule.dayOfWeek?.toString() || "0"}
              onValueChange={(value) => updateTaskField('schedule.dayOfWeek', parseInt(value, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择星期几" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">周一</SelectItem>
                <SelectItem value="1">周二</SelectItem>
                <SelectItem value="2">周三</SelectItem>
                <SelectItem value="3">周四</SelectItem>
                <SelectItem value="4">周五</SelectItem>
                <SelectItem value="5">周六</SelectItem>
                <SelectItem value="6">周日</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        </div>
        
        <div className="space-y-2">
          <Label>执行时间</Label>
          <div className="flex justify-center">
            <ModernTimePicker 
              hour={currentTask.schedule.hour} 
              minute={currentTask.schedule.minute}
              minuteStep={1} // 允许每分钟调整
              onTimeChange={(hour, minute) => {
                console.log(`时间已更改: ${hour}:${minute}`);
                updateTaskField('schedule.hour', hour);
                updateTaskField('schedule.minute', minute);
              }}
              className="w-full"
            />
          </div>
          
          <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md flex items-center">
            <Info className="h-4 w-4 mr-2" />
            {currentTask.schedule.type === "weekly" 
              ? `每周${getDayOfWeekName(currentTask.schedule.dayOfWeek || 0)} ${currentTask.schedule.hour.toString().padStart(2, '0')}:${currentTask.schedule.minute.toString().padStart(2, '0')} 执行`
              : `每天 ${currentTask.schedule.hour.toString().padStart(2, '0')}:${currentTask.schedule.minute.toString().padStart(2, '0')} 执行`
            }
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>季数</Label>
          <Select
            value={currentTask.action.seasonNumber.toString()}
            onValueChange={(value) => updateTaskField('action.seasonNumber', parseInt(value, 10))}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择季数" />
            </SelectTrigger>
            <SelectContent>
              {item.seasons ? (
                item.seasons.map(season => (
                  <SelectItem key={season.seasonNumber} value={season.seasonNumber.toString()}>
                    第{season.seasonNumber}季 - {season.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="1">第1季</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="border p-4 rounded-md space-y-3">
          <h3 className="text-sm font-medium">基本选项</h3>
        
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="auto-upload" className="flex-1">
            自动上传至TMDB
          </Label>
          <Switch
            id="auto-upload"
            checked={currentTask.action.autoUpload}
            onCheckedChange={(checked) => updateTaskField('action.autoUpload', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="auto-remove-marked" className="flex-1">
            自动过滤已标记完成的集数
          </Label>
          <Switch
            id="auto-remove-marked"
            checked={currentTask.action.autoRemoveMarked}
            onCheckedChange={(checked) => updateTaskField('action.autoRemoveMarked', checked)}
          />
          </div>
        </div>
        
        <div className="border p-4 rounded-md space-y-3">
          <h3 className="text-sm font-medium">高级选项</h3>
        
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="auto-confirm" className="flex-1">
            自动确认上传（输入y）
          </Label>
          <Switch
            id="auto-confirm"
            checked={currentTask.action.autoConfirm !== false}
            onCheckedChange={(checked) => updateTaskField('action.autoConfirm', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="auto-mark-uploaded" className="flex-1">
            自动标记已上传的集数
          </Label>
          <Switch
            id="auto-mark-uploaded"
            checked={currentTask.action.autoMarkUploaded !== false}
            onCheckedChange={(checked) => updateTaskField('action.autoMarkUploaded', checked)}
          />
        </div>
        
        {item.platformUrl?.includes('iqiyi.com') && (
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="remove-iqiyi-air-date" className="flex-1">
              删除爱奇艺平台的air_date列
            </Label>
            <Switch
              id="remove-iqiyi-air-date"
              checked={currentTask.action.removeIqiyiAirDate !== false}
              onCheckedChange={(checked) => updateTaskField('action.removeIqiyiAirDate', checked)}
            />
          </div>
        )}
        </div>
        
        <div className="flex items-center justify-between space-x-2">
          <div>
            <Label htmlFor="task-enabled" className="flex-1">
              启用此任务
              {isAutoSaving && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                  <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                  保存中...
                </span>
              )}
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              {isAddingTask ? "任务默认为禁用状态，请先保存任务后再启用" : "启用后任务将按照设定的时间自动执行"}
            </p>
            {!currentTask.enabled && (
              <p className="text-xs text-amber-600 mt-1 flex items-center">
                <Info className="h-3 w-3 mr-1" />
                禁用状态下任务不会自动执行
              </p>
            )}
          </div>
          <Switch
            id="task-enabled"
            checked={currentTask.enabled}
            onCheckedChange={(checked) => updateTaskField('enabled', checked)}
            disabled={isAutoSaving || (isAddingTask && !hasUnsavedChanges)} // 新建任务时禁用开关
          />
        </div>
        
        {hasUnsavedChanges && !isAutoSaving && (
          <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-md flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            有未保存的更改
          </div>
        )}
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={cancelEditTask} disabled={isAutoSaving}>
            取消
          </Button>
          <Button onClick={handleSaveTask} disabled={isAutoSaving || !hasUnsavedChanges}>
            {isAutoSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                {isAddingTask ? '保存 (将保持禁用状态)' : '保存'}
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlarmClock className="h-5 w-5 mr-2" />
              {item.title} - 定时任务管理
            </DialogTitle>
            <DialogDescription>
              为此项目创建和管理自动执行的定时任务
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            {isAddingTask || isEditingTask ? renderTaskForm() : renderTaskList()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除此定时任务吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 