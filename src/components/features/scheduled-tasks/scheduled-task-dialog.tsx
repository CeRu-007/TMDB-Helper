"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/common/dialog"
import { Button } from "@/components/common/button"
import { Input } from "@/components/common/input"
import { Label } from "@/components/common/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select"
import { Switch } from "@/components/common/switch"
import { ModernTimePicker } from "@/components/common/modern-time-picker"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/common/card"
import { Badge } from "@/components/common/badge"
import { ScrollArea } from "@/components/common/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/tabs"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/common/alert-dialog"
import {
  Clock,
  Calendar,
  Trash2,
  Plus,
  Play,
  Info,
  PauseCircle,
  PlayCircle,
  Settings,
  CheckCircle2,
  XCircle,
  AlarmClock,
  RotateCw,
  Upload,
  Check,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { StorageManager, TMDBItem, ScheduledTask } from "@/lib/data/storage"
import { taskScheduler } from "@/lib/data/task-scheduler"
import { toast } from "@/components/common/use-toast"

interface ScheduledTaskDialogProps {
  item: TMDBItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (item: TMDBItem) => void
  existingTask?: ScheduledTask
  onTaskSaved?: (task: ScheduledTask, isAutoSave?: boolean) => void
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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 监听对话框状态变化，重置状态
  useEffect(() => {
    if (open) {
      
      // 重置状态
      setHasUnsavedChanges(false);
      setIsAutoSaving(false);
      setCurrentTask(null);
      setIsAddingTask(false);
      setIsEditingTask(false);

      if (existingTask) {
        // 如果传入了existingTask，直接使用它
        
        setTasks([existingTask])
        setLoading(false)
      } else {
        // 否则从存储中加载任务
        
        loadTasks()
      }
    } else {
      // 对话框关闭时重置所有状态
      
      // 清理防抖定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      setHasUnsavedChanges(false);
      setIsAutoSaving(false);
      setCurrentTask(null);
      setIsAddingTask(false);
      setIsEditingTask(false);
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
      setIsRunningTask(false);
      setRunningTaskId(null);
    }
  }, [open, item.id, existingTask])

  // 组件卸载时清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [])

  // 加载任务
  const loadTasks = async () => {
    setLoading(true)
    try {
      
      const allTasks = await StorageManager.getScheduledTasks()
      
      const itemTasks = allTasks.filter(task => task.itemId === item.id)
      
      setTasks(itemTasks)
    } catch (error) {
      
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
        removeAirDateColumn: false, // 默认不删除air_date列
        removeRuntimeColumn: false, // 默认不删除runtime列
        removeBackdropColumn: false, // 默认不删除backdrop列
        autoMarkUploaded: true, // 默认自动标记已上传的集数
        conflictAction: 'w' as const, // 默认覆盖写入
        // 新增的用户自定义选项（默认启用）
        enableYoukuSpecialHandling: true,  // 默认启用优酷特殊处理
        enableTitleCleaning: true,         // 默认启用词条标题清理
        autoDeleteWhenCompleted: true      // 默认启用完结后自动删除
      },
      enabled: false, // 强制设置为禁用状态
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setCurrentTask(newTask)
    setIsAddingTask(true)
    setHasUnsavedChanges(false) // 新建任务初始状态不应该有未保存更改
    setIsAutoSaving(false)
  }

  // 编辑任务
  const handleEditTask = (task: ScheduledTask) => {
    setCurrentTask({ ...task })
    setIsEditingTask(true)
    setHasUnsavedChanges(false) // 编辑任务初始状态不应该有未保存更改
    setIsAutoSaving(false)
  }

  // 保存任务（使用特定状态）
  const handleSaveTaskWithState = async (taskToSave: ScheduledTask, shouldCloseDialog: boolean = true) => {
    if (!taskToSave) return

    try {
      // 确保项目有效
      if (!item || !item.id) {
        
        throw new Error("当前项目无效，无法创建定时任务");
      }

      // 确保项目有平台URL
      if (!item.platformUrl) {
        
        throw new Error("当前项目缺少平台URL，无法创建定时任务");
      }

      // 创建要保存的任务副本
      const updatedTask = {
        ...taskToSave,
        itemId: item.id,
        itemTitle: item.title,
        itemTmdbId: item.tmdbId,
        updatedAt: new Date().toISOString()
      };

      // 确保任务的必要字段都已设置
      if (!updatedTask.name || updatedTask.name.trim() === '') {
        updatedTask.name = `${item.title} 定时任务`;
      }

      console.log(`[ScheduledTaskDialog] 任务详情:`, JSON.stringify(updatedTask, null, 2));

      let success = false;
      if (isAddingTask) {
        success = await StorageManager.addScheduledTask(updatedTask)
        if (success) {
          
        }
      } else {
        success = await StorageManager.updateScheduledTask(updatedTask)
        if (success) {
          
        }
      }

      if (success) {
        // 更新本地状态
        setCurrentTask(updatedTask);

        // 清除未保存更改状态和防抖定时器
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        setHasUnsavedChanges(false)

        // 重新加载任务列表
        await loadTasks()

        // 如果提供了onTaskSaved回调，调用它
        if (onTaskSaved) {
          onTaskSaved(updatedTask);
        } else if (onUpdate) {
          onUpdate(item);
        } else {
          
        }

        // 如果任务已启用，重新调度
        if (updatedTask.enabled) {
          await taskScheduler.scheduleTask(updatedTask)
        }

        // 只有在需要关闭对话框时才关闭编辑框
        if (shouldCloseDialog) {
          cancelEditTask()
        } else {
          // 自动保存时只清除未保存更改状态
          setHasUnsavedChanges(false)
        }

        if (shouldCloseDialog) {
          toast({
            title: `${isAddingTask ? '创建' : '更新'}成功`,
            description: `定时任务已${isAddingTask ? '创建' : '更新'}${updatedTask.enabled ? '，并已启用' : '，处于禁用状态'}`,
          })
        }
      }
    } catch (error) {
      
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "无法保存定时任务，请检查项目关联是否正确",
        variant: "destructive"
      })
    }
  }

  // 保存任务
  const handleSaveTask = async () => {
    if (!currentTask) return
    await handleSaveTaskWithState(currentTask);
  }

  // 取消编辑
  const cancelEditTask = () => {
    // 清理防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

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
      // 检查系统中是否有项目
      if (await StorageManager.hasAnyItems() === false) {
        throw new Error("系统中没有可用项目，请先添加至少一个项目后再试");
      }

      // 获取最新的项目信息
      let currentItem = item; // 默认使用当前组件的项目

      try {
        const items = await StorageManager.getItemsWithRetry();
        const foundItem = items.find(i => i.id === task.itemId);
        if (foundItem) {
          currentItem = foundItem;
        } else {
          
        }
      } catch (error) {
        
      }

      // 检查项目平台URL
      if (!currentItem.platformUrl) {
        throw new Error(`项目 ${currentItem.title} 没有设置平台URL，无法执行TMDB导入任务`);
      }

      // 构建请求体数据
      const requestData = {
        taskId: task.id,
        itemId: currentItem.id,
        action: {
          seasonNumber: task.action.seasonNumber,
          autoUpload: task.action.autoUpload,
          autoRemoveMarked: task.action.autoRemoveMarked,
          autoConfirm: task.action.autoConfirm !== false,
          autoMarkUploaded: task.action.autoMarkUploaded !== false,
          removeAirDateColumn: task.action.removeAirDateColumn === true,
          removeRuntimeColumn: task.action.removeRuntimeColumn === true,
          removeBackdropColumn: task.action.removeBackdropColumn === true
        },
        metadata: {
          tmdbId: currentItem.tmdbId,
          title: currentItem.title,
          platformUrl: currentItem.platformUrl
        }
      };

      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000); // 3分钟超时

      try {
        // 使用POST请求调用API执行任务
        const response = await fetch('/api/tasks/execute-scheduled-task', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        });

        // 清除超时计时器
        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = '';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || `HTTP错误: ${response.status}`;
          } catch (e) {
            errorMessage = `HTTP错误: ${response.status}`;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || result.message || '执行失败，但未返回具体错误信息');
        }

        // 更新任务的最后执行时间和状态
        const updatedTask = {
          ...task,
          lastRun: new Date().toISOString(),
          lastRunStatus: "success" as const,
          lastRunError: null,
          updatedAt: new Date().toISOString()
        };

        await StorageManager.updateScheduledTask(updatedTask);

        // 重新加载任务列表
        await loadTasks();

        // 构建成功消息
        let successMessage = '任务已成功执行';

        // 如果有CSV路径信息，添加到消息中
        if (result.csvPath) {
          successMessage += `，生成了CSV文件: ${result.csvPath}`;
        }

        // 如果自动标记了上传的集数，提示用户
        if (result.markedEpisodes && result.markedEpisodes.length > 0) {
          successMessage += `，已标记 ${result.markedEpisodes.length} 个集数为已完成`;
        }

        toast({
          title: "执行成功",
          description: successMessage,
          variant: 'success',
          icon: <AlarmClock className="h-4 w-4" />
        });
      } catch (fetchError: any) {
        // 清除超时计时器
        clearTimeout(timeoutId);

        // 检查是否是超时错误
        if (fetchError.name === 'AbortError') {
          
          throw new Error("请求超时（3分钟），请检查网络连接或稍后再试");
        }

        throw fetchError; // 重新抛出以便外层catch处理
      }
    } catch (error: any) {
      
      // 更新任务的失败状态
      try {
        const failedTask = {
          ...task,
          lastRun: new Date().toISOString(),
          lastRunStatus: "failed" as const,
          lastRunError: error.message || "未知错误",
          updatedAt: new Date().toISOString()
        };

        await StorageManager.updateScheduledTask(failedTask);

        // 重新加载任务列表
        await loadTasks();
      } catch (updateError) {
        
      }

      // 提供特定错误消息
      let errorTitle = "执行失败";
      let errorDescription = error.message || "无法执行任务，请检查控制台获取详细错误信息";

      if (error.message && error.message.includes("系统中没有可用项目")) {
        errorTitle = "无法执行任务";
        errorDescription = "系统中没有可用项目，请先添加至少一个项目后再试";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsRunningTask(false);
      setRunningTaskId(null);
    }
  }

  // 更新任务字段
  const updateTaskField = (field: string, value: any) => {
    if (!currentTask) return

    // 获取当前值进行比较
    let currentValue;
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'schedule') {
        currentValue = currentTask.schedule[child as keyof typeof currentTask.schedule];
      } else if (parent === 'action') {
        currentValue = currentTask.action[child as keyof typeof currentTask.action];
      }
    } else {
      currentValue = (currentTask as any)[field];
    }

    // 如果值没有变化，不需要更新
    if (currentValue === value) {
      return;
    }

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

    // 只有在编辑模式下才设置未保存状态
    if (isAddingTask || isEditingTask) {
      // 特殊处理：执行频率切换不应该触发未保存状态
      const isFrequencyChange = field === 'schedule.frequency';

      if (!isFrequencyChange) {
        // 清除之前的防抖定时器
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // 设置新的防抖定时器
        debounceTimerRef.current = setTimeout(() => {
          setHasUnsavedChanges(true);
        }, 100); // 100ms 防抖
      } else {
        // 执行频率切换时，重置表单状态但不设置未保存状态
        
        // 根据频率类型重置相关字段的默认值
        if (value === 'daily') {
          // 每日执行：重置时间
          if (!updatedTask.schedule.time) {
            updatedTask.schedule.time = '09:00';
          }
        } else if (value === 'weekly') {
          // 每周执行：重置星期和时间
          if (!updatedTask.schedule.weekday) {
            updatedTask.schedule.weekday = 1; // 默认周一
          }
          if (!updatedTask.schedule.time) {
            updatedTask.schedule.time = '09:00';
          }
        }

        // 更新任务状态但不触发未保存提示
        setCurrentTask(updatedTask);
      }
    }

    // 只有启用状态更改才自动保存，特殊处理选项需要手动保存
    if (field === 'enabled') {
      handleAutoSave(updatedTask)
    }
  }

  // 自动保存功能
  const handleAutoSave = async (taskToSave: ScheduledTask) => {
    if (!taskToSave) return

    setIsAutoSaving(true)
    
    try {
      const updatedTask = {
        ...taskToSave,
        // 不再强制设置为禁用状态，尊重用户通过按钮的选择
        updatedAt: new Date().toISOString()
      }

      let success: boolean

      if (isAddingTask) {
        success = await StorageManager.addScheduledTask(updatedTask)
      } else {
        success = await StorageManager.updateScheduledTask(updatedTask)
      }

      if (success) {
        
        setHasUnsavedChanges(false)

        // 如果任务已启用，重新调度
        if (updatedTask.enabled) {
          await taskScheduler.scheduleTask(updatedTask)
        }

        // 显示成功提示
        toast({
          title: "自动保存成功",
          description: updatedTask.enabled ? "任务已启用，将按计划自动执行" : "任务设置已保存",
        })

        // 如果提供了onTaskSaved回调，调用它（标记为自动保存）
        if (onTaskSaved) {
          onTaskSaved(updatedTask, true)
        }

        // 重新加载任务列表
        await loadTasks()
      } else {
        
        toast({
          title: "自动保存失败",
          description: "无法保存任务状态，请手动保存",
          variant: "destructive"
        })
      }
    } catch (error) {
      
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

  // 修改任务列表渲染函数
  const renderTaskList = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">加载中...</span>
        </div>
      )
    }

    if (tasks.length === 0) {
      return (
        <div className="text-center p-4">
          <div className="mb-2 text-muted-foreground">此项目暂无定时任务</div>
          <Button onClick={handleAddTask}>
            <Plus className="h-4 w-4 mr-2" />
            添加定时任务
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {tasks.map(task => (
          <Card key={task.id} className={task.enabled ? "" : "opacity-70"}>
            <CardHeader className="py-3 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm flex items-center">
                    <AlarmClock className="h-3 w-3 mr-1" />
                    {task.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {task.schedule.type === "weekly" ? (
                      task.schedule.secondDayOfWeek !== undefined ? (
                        <>每周{getDayOfWeekName(task.schedule.dayOfWeek || 0)}、{getDayOfWeekName(task.schedule.secondDayOfWeek)} {task.schedule.hour}:
                          {task.schedule.minute.toString().padStart(2, '0')} (双更)</>
                      ) : (
                        <>每周{getDayOfWeekName(task.schedule.dayOfWeek || 0)} {task.schedule.hour}:
                          {task.schedule.minute.toString().padStart(2, '0')}</>
                      )
                    ) : (
                      <>每天 {task.schedule.hour}:{task.schedule.minute.toString().padStart(2, '0')}</>
                    )}
                  </CardDescription>
                </div>
                <Badge variant={task.enabled ? "default" : "outline"} className="text-xs">
                  {task.enabled ? "已启用" : "已禁用"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="py-1 px-4">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">操作:</span>
                  <span>
                    第{task.action.seasonNumber}季
                    {task.action.autoUpload && " + 自动上传"}
                    {task.action.autoRemoveMarked && " + 自动过滤"}
                    {task.action.conflictAction && ` + 冲突处理(${task.action.conflictAction})`}
                    {task.action.enableYoukuSpecialHandling && " + 优酷特殊处理"}
                    {task.action.enableTitleCleaning && " + 词条标题清理"}
                    {task.action.autoDeleteWhenCompleted && " + 完结自动删除"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">下次执行:</span>
                  <span>{formatNextRunTime(task)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">上次执行:</span>
                  <span>
                    {task.lastRunStatus === "success" ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {formatLastRunTime(task)}
                      </span>
                    ) : task.lastRunStatus === "failed" ? (
                      <span className="text-red-600 dark:text-red-400 flex items-center">
                        <XCircle className="h-3 w-3 mr-1" />
                        {formatLastRunTime(task)}
                      </span>
                    ) : (
                      formatLastRunTime(task)
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="py-2 px-4 flex justify-between">
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => handleEditTask(task)}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => toggleTaskEnabled(task)}
                >
                  {task.enabled ? (
                    <>
                      <PauseCircle className="h-3 w-3 mr-1" />
                      禁用
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-3 w-3 mr-1" />
                      启用
                    </>
                  )}
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7"
                  onClick={() => confirmDeleteTask(task.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  删除
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7"
                  onClick={() => runTaskNow(task)}
                  disabled={isRunningTask}
                >
                  {isRunningTask && runningTaskId === task.id ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      执行中
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      立即执行
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}

        <div className="flex justify-center">
          <Button size="sm" onClick={handleAddTask}>
            <Plus className="h-3 w-3 mr-1" />
            添加定时任务
          </Button>
        </div>
      </div>
    )
  }

  // 修改任务表单函数，使布局更加紧凑
  const renderTaskForm = () => {
    if (!currentTask) return null

    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="task-name">任务名称</Label>
          <Input
            id="task-name"
            value={currentTask.name}
            onChange={(e) => updateTaskField('name', e.target.value)}
            placeholder="输入任务名称"
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
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
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">播出日期设置</Label>
                <Badge variant="outline" className="text-xs">
                  {currentTask.schedule.secondDayOfWeek !== undefined ? "双更模式" : "单更模式"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">主播出日</Label>
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

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">第二播出日 (可选)</Label>
                  <Select
                    value={currentTask.schedule.secondDayOfWeek?.toString() || "none"}
                    onValueChange={(value) => {
                      const secondDay = value === "none" ? undefined : parseInt(value, 10);
                      updateTaskField('schedule.secondDayOfWeek', secondDay);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择第二播出日" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不设置</SelectItem>
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
              </div>

              {currentTask.schedule.secondDayOfWeek !== undefined && (
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded border-l-2 border-blue-500">
                  <div className="flex items-center">
                    <Info className="h-3 w-3 mr-1 text-blue-500" />
                    双更模式：任务将在每周的两个不同日期执行
                  </div>
                </div>
              )}
            </div>
          )}

          {currentTask.schedule.type === "daily" && (
            <div className="space-y-1">
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
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <Label>执行时间</Label>
            <div className="text-xs text-muted-foreground">
              {currentTask.schedule.type === "weekly"
                ? (currentTask.schedule.secondDayOfWeek !== undefined
                  ? `每周${getDayOfWeekName(currentTask.schedule.dayOfWeek || 0)}、${getDayOfWeekName(currentTask.schedule.secondDayOfWeek)} ${currentTask.schedule.hour.toString().padStart(2, '0')}:${currentTask.schedule.minute.toString().padStart(2, '0')}`
                  : `每周${getDayOfWeekName(currentTask.schedule.dayOfWeek || 0)} ${currentTask.schedule.hour.toString().padStart(2, '0')}:${currentTask.schedule.minute.toString().padStart(2, '0')}`)
                : `每天 ${currentTask.schedule.hour.toString().padStart(2, '0')}:${currentTask.schedule.minute.toString().padStart(2, '0')}`
              }
            </div>
          </div>
          <div className="flex justify-center">
            <ModernTimePicker
              hour={currentTask.schedule.hour}
              minute={currentTask.schedule.minute}
              minuteStep={1}
              onTimeChange={(hour, minute) => {
                updateTaskField('schedule.hour', hour);
                updateTaskField('schedule.minute', minute);
              }}
              className="w-full"
            />
          </div>
        </div>

        {currentTask.schedule.type === "weekly" && (
          <div className="space-y-1">
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
        )}

        <div className="border p-4 rounded-lg space-y-4">
          <h3 className="text-sm font-medium text-center border-b pb-2">基本选项</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between space-x-3 p-3 bg-muted/30 rounded-md">
              <div className="flex-1">
                <Label htmlFor="auto-upload" className="text-sm font-medium">
                  自动上传至TMDB
                </Label>
              </div>
              <Switch
                id="auto-upload"
                checked={currentTask.action.autoUpload}
                onCheckedChange={(checked) => updateTaskField('action.autoUpload', checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-3 p-3 bg-muted/30 rounded-md">
              <div className="flex-1">
                <Label htmlFor="auto-remove-marked" className="text-sm font-medium">
                  自动过滤已完成集数
                </Label>
              </div>
              <Switch
                id="auto-remove-marked"
                checked={currentTask.action.autoRemoveMarked}
                onCheckedChange={(checked) => updateTaskField('action.autoRemoveMarked', checked)}
              />
            </div>
          </div>
        </div>

        <div className="border p-4 rounded-lg space-y-4">
          <h3 className="text-sm font-medium text-center border-b pb-2">高级选项</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between space-x-3 p-3 bg-muted/30 rounded-md">
              <div className="flex-1">
                <Label htmlFor="auto-confirm" className="text-sm font-medium">
                  自动确认上传
                </Label>
              </div>
              <Switch
                id="auto-confirm"
                checked={currentTask.action.autoConfirm !== false}
                onCheckedChange={(checked) => updateTaskField('action.autoConfirm', checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-3 p-3 bg-muted/30 rounded-md">
              <div className="flex-1">
                <Label htmlFor="auto-mark-uploaded" className="text-sm font-medium">
                  自动标记已上传集数
                </Label>
              </div>
              <Switch
                id="auto-mark-uploaded"
                checked={currentTask.action.autoMarkUploaded !== false}
                onCheckedChange={(checked) => updateTaskField('action.autoMarkUploaded', checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-3 p-3 bg-muted/30 rounded-md">
              <Label htmlFor="remove-air-date" className="text-sm font-medium">
                删除播出日期列
              </Label>
              <Switch
                id="remove-air-date"
                checked={currentTask.action.removeAirDateColumn === true}
                onCheckedChange={(checked) => updateTaskField('action.removeAirDateColumn', checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-3 p-3 bg-muted/30 rounded-md">
              <Label htmlFor="remove-runtime" className="text-sm font-medium">
                删除时长/分钟列
              </Label>
              <Switch
                id="remove-runtime"
                checked={currentTask.action.removeRuntimeColumn === true}
                onCheckedChange={(checked) => updateTaskField('action.removeRuntimeColumn', checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-3 p-3 bg-muted/30 rounded-md">
              <Label htmlFor="remove-backdrop" className="text-sm font-medium">
                删除分集图片URL列
              </Label>
              <Switch
                id="remove-backdrop"
                checked={currentTask.action.removeBackdropColumn === true}
                onCheckedChange={(checked) => updateTaskField('action.removeBackdropColumn', checked)}
              />
            </div>
          </div>

          <div className="space-y-3 p-3 bg-muted/20 rounded-md">
            <Label className="text-sm font-medium">TMDB数据冲突处理</Label>
            <Select
              value={currentTask.action.conflictAction || 'w'}
              onValueChange={(value: 'w' | 'y' | 'n') => updateTaskField('action.conflictAction', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择冲突处理方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="w">
                  <div className="flex flex-col">
                    <span className="font-medium">覆盖写入 (w)</span>
                    <span className="text-xs text-muted-foreground">覆盖TMDB上的现有数据</span>
                  </div>
                </SelectItem>
                <SelectItem value="y">
                  <div className="flex flex-col">
                    <span className="font-medium">确认 (y)</span>
                    <span className="text-xs text-muted-foreground">确认执行操作</span>
                  </div>
                </SelectItem>
                <SelectItem value="n">
                  <div className="flex flex-col">
                    <span className="font-medium">跳过 (n)</span>
                    <span className="text-xs text-muted-foreground">跳过冲突的数据</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              当TMDB已有对应数据时的处理方式
            </p>
          </div>
        </div>

        <div className="border p-4 rounded-lg space-y-4">
          <h3 className="text-sm font-medium text-center border-b pb-2">特殊处理选项</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between space-x-3 p-3 bg-muted/30 rounded-md">
              <div className="flex-1">
                <Label htmlFor="enable-youku-handling" className="text-sm font-medium">
                  优酷平台特殊处理
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  优酷平台删除已标记集数-1的行（如第1-8集已标记，删除第1-7集）
                </p>
              </div>
              <Switch
                id="enable-youku-handling"
                checked={currentTask.action.enableYoukuSpecialHandling !== false}
                onCheckedChange={(checked) => updateTaskField('action.enableYoukuSpecialHandling', checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-3 p-3 bg-muted/30 rounded-md">
              <div className="flex-1">
                <Label htmlFor="enable-title-cleaning" className="text-sm font-medium">
                  词条标题清理功能
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  清理CSV中name列包含词条标题的单元格，直到完全清理后才进行集数标记
                </p>
              </div>
              <Switch
                id="enable-title-cleaning"
                checked={currentTask.action.enableTitleCleaning !== false}
                onCheckedChange={(checked) => updateTaskField('action.enableTitleCleaning', checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-3 p-3 bg-muted/30 rounded-md">
              <div className="flex-1">
                <Label htmlFor="auto-delete-completed" className="text-sm font-medium">
                  完结后自动删除任务
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  项目所有集数标记完成后自动删除该定时任务
                </p>
              </div>
              <Switch
                id="auto-delete-completed"
                checked={currentTask.action.autoDeleteWhenCompleted !== false}
                onCheckedChange={(checked) => updateTaskField('action.autoDeleteWhenCompleted', checked)}
              />
            </div>
          </div>
        </div>

        {/* 未保存更改提示 */}
        {hasUnsavedChanges && !isAutoSaving && (
          <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-md flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            有未保存的更改
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-3">
          <Button variant="outline" onClick={cancelEditTask} disabled={isAutoSaving} size="sm">
            取消
          </Button>

          {isAutoSaving ? (
            <Button disabled size="sm">
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              保存中...
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={async () => {
                  // 设置为禁用状态并保存
                  if (currentTask) {
                    const taskWithDisabled = { ...currentTask, enabled: false };
                    setCurrentTask(taskWithDisabled);
                    // 直接调用保存函数，传入更新后的任务
                    await handleSaveTaskWithState(taskWithDisabled);
                  }
                }}
                disabled={isAutoSaving}
                size="sm"
              >
                <PauseCircle className="h-3 w-3 mr-2" />
                保存并禁用
              </Button>

              <Button
                onClick={async () => {
                  // 设置为启用状态并保存
                  if (currentTask) {
                    const taskWithEnabled = { ...currentTask, enabled: true };
                    setCurrentTask(taskWithEnabled);
                    // 直接调用保存函数，传入更新后的任务
                    await handleSaveTaskWithState(taskWithEnabled);
                  }
                }}
                disabled={isAutoSaving}
                size="sm"
              >
                <PlayCircle className="h-3 w-3 mr-2" />
                保存并启用
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center">
              <AlarmClock className="h-5 w-5 mr-2" />
              {item.title} - 定时任务管理
            </DialogTitle>
            <DialogDescription>
              为此项目创建和管理自动执行的定时任务
            </DialogDescription>
          </DialogHeader>

          {isAddingTask || isEditingTask ? renderTaskForm() : renderTaskList()}
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