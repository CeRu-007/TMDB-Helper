"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  AlarmClock,
  Play,
  PauseCircle,
  PlayCircle,
  Settings,
  Trash2,
  Loader2,
  Search,
  Clock,
  Calendar,
  X,
  ExternalLink,
  Filter,
  CheckCircle2,
  XCircle,
  Info,
  RotateCw
} from "lucide-react"
import { StorageManager, TMDBItem, ScheduledTask } from "@/lib/storage"
import { taskScheduler } from "@/lib/scheduler"
import { toast } from "@/components/ui/use-toast"
import ScheduledTaskDialog from "./scheduled-task-dialog"

interface GlobalScheduledTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function GlobalScheduledTasksDialog({ open, onOpenChange }: GlobalScheduledTasksDialogProps) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [filteredTasks, setFilteredTasks] = useState<ScheduledTask[]>([])
  const [items, setItems] = useState<TMDBItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [isRunningTask, setIsRunningTask] = useState(false)
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<TMDBItem | null>(null)
  const [showTaskDialog, setShowTaskDialog] = useState(false)

  // 加载任务列表和项目
  useEffect(() => {
    if (open) {
      loadTasksAndItems()
    }
  }, [open])

  // 过滤任务
  useEffect(() => {
    filterTasks()
  }, [tasks, searchTerm, statusFilter])

  // 加载任务和项目
  const loadTasksAndItems = async () => {
    setLoading(true)
    try {
      // 加载任务
      const allTasks = await StorageManager.getScheduledTasks()
      setTasks(allTasks)
      
      // 加载项目
      const allItems = await StorageManager.getItemsWithRetry()
      setItems(allItems)
    } catch (error) {
      console.error("加载数据失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载定时任务或项目数据",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 过滤任务
  const filterTasks = () => {
    let filtered = [...tasks]
    
    // 按状态过滤
    if (statusFilter !== "all") {
      filtered = filtered.filter(task => 
        statusFilter === "enabled" ? task.enabled : !task.enabled
      )
    }
    
    // 按搜索词过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(task => {
        // 获取关联项目
        const relatedItem = items.find(item => item.id === task.itemId)
        
        return (
          task.name.toLowerCase().includes(term) || 
          relatedItem?.title.toLowerCase().includes(term)
        )
      })
    }
    
    setFilteredTasks(filtered)
  }

  // 获取任务关联的项目
  const getTaskItem = (taskItemId: string): TMDBItem | undefined => {
    return items.find(item => item.id === taskItemId)
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
        // 更新本地任务列表
        setTasks(prev => 
          prev.map(t => t.id === task.id ? updatedTask : t)
        )
        
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
      // 获取关联的项目
      const relatedItem = getTaskItem(task.itemId)
      
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
      if (relatedItem) {
        // 如果找到关联项目，添加其tmdbId和title作为备用参数
        params.append('tmdbId', relatedItem.tmdbId);
        params.append('title', relatedItem.title);
        params.append('platformUrl', relatedItem.platformUrl || '');
      } else {
        // 如果找不到关联项目，尝试通过任务名称查找可能匹配的项目
        console.warn(`找不到ID为 ${task.itemId} 的项目，尝试通过任务名称查找匹配项...`);
        
        // 尝试从任务名称中提取项目标题
        const taskNameWithoutSuffix = task.name.replace(/\s+定时任务$/, '');
        
        // 尝试通过名称模糊匹配
        const possibleMatches = items.filter(i => 
          i.title.includes(taskNameWithoutSuffix) || 
          taskNameWithoutSuffix.includes(i.title)
        );
        
        if (possibleMatches.length === 1) {
          // 只找到一个匹配项，使用它
          const matchedItem = possibleMatches[0];
          console.log(`通过名称找到匹配项: ${matchedItem.title} (ID: ${matchedItem.id})`);
          
          // 添加匹配项的信息作为备用参数
          params.append('tmdbId', matchedItem.tmdbId);
          params.append('title', matchedItem.title);
          params.append('platformUrl', matchedItem.platformUrl || '');
          
          // 更新任务的项目ID
          const updatedTask = { ...task, itemId: matchedItem.id };
          await StorageManager.updateScheduledTask(updatedTask);
          console.log(`已更新任务的项目ID: ${task.id} -> ${matchedItem.id}`);
          
          // 更新本地任务
          task = updatedTask;
        } else if (possibleMatches.length > 1) {
          // 找到多个匹配项，尝试通过媒体类型进一步筛选
          const betterMatches = possibleMatches.filter(i => i.mediaType === 'tv');
          if (betterMatches.length === 1) {
            const matchedItem = betterMatches[0];
            console.log(`通过名称和媒体类型找到匹配项: ${matchedItem.title} (ID: ${matchedItem.id})`);
            
            // 添加匹配项的信息作为备用参数
            params.append('tmdbId', matchedItem.tmdbId);
            params.append('title', matchedItem.title);
            params.append('platformUrl', matchedItem.platformUrl || '');
            
            // 更新任务的项目ID
            const updatedTask = { ...task, itemId: matchedItem.id };
            await StorageManager.updateScheduledTask(updatedTask);
            console.log(`已更新任务的项目ID: ${task.id} -> ${matchedItem.id}`);
            
            // 更新本地任务
            task = updatedTask;
          } else {
            // 找到多个可能的匹配项，添加第一个作为备用
            if (possibleMatches.length > 0) {
              params.append('tmdbId', possibleMatches[0].tmdbId);
              params.append('title', possibleMatches[0].title);
              params.append('platformUrl', possibleMatches[0].platformUrl || '');
              console.warn(`找到多个可能的匹配项 (${possibleMatches.length}个)，使用第一个作为备用`);
            }
          }
        }
      }
      
      // 调用API执行任务
      console.log(`执行任务: ${task.name}, 参数:`, Object.fromEntries(params.entries()));
      const response = await fetch(`/api/execute-scheduled-task?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '执行失败');
      }
      
      const result = await response.json();
      
      // 更新任务的最后执行时间和状态
      const updatedTask = {
        ...task,
        lastRun: new Date().toISOString(),
        lastRunStatus: "success" as const,
        lastRunError: null,
        updatedAt: new Date().toISOString()
      };
      
      await StorageManager.updateScheduledTask(updatedTask);
      
      // 更新本地任务列表
      setTasks(prev => 
        prev.map(t => t.id === task.id ? updatedTask : t)
      );
      
      // 如果自动标记了上传的集数，提示用户
      let successMessage = `任务已成功执行，处理了 ${result.csvData?.rows?.length || 0} 条数据`;
      if (result.markedEpisodes && result.markedEpisodes.length > 0) {
        successMessage += `，已标记 ${result.markedEpisodes.length} 个集数为已完成`;
      }
      
      toast({
        title: "执行成功",
        description: successMessage,
      });
    } catch (error: any) {
      console.error("执行任务失败:", error);
      
      // 更新任务的失败状态
      const failedTask = {
        ...task,
        lastRun: new Date().toISOString(),
        lastRunStatus: "failed" as const,
        lastRunError: error.message || "未知错误",
        updatedAt: new Date().toISOString()
      };
      
      await StorageManager.updateScheduledTask(failedTask);
      
      // 更新本地任务列表
      setTasks(prev => 
        prev.map(t => t.id === task.id ? failedTask : t)
      );
      
      toast({
        title: "执行失败",
        description: error.message || "无法执行任务",
        variant: "destructive"
      });
    } finally {
      setIsRunningTask(false);
      setRunningTaskId(null);
    }
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
        // 更新本地任务列表
        setTasks(prev => prev.filter(task => task.id !== taskToDelete))
        
        toast({
          title: "删除成功",
          description: "定时任务已删除",
        })
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

  // 编辑任务
  const handleEditTask = (task: ScheduledTask) => {
    const item = getTaskItem(task.itemId)
    if (item) {
      setSelectedItem(item)
      setShowTaskDialog(true)
    } else {
      toast({
        title: "无法编辑",
        description: "找不到关联的项目",
        variant: "destructive"
      })
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

  // 获取任务执行时间描述
  const getScheduleDescription = (task: ScheduledTask) => {
    const hour = task.schedule.hour.toString().padStart(2, '0')
    const minute = task.schedule.minute.toString().padStart(2, '0')
    const time = `${hour}:${minute}`
    
    if (task.schedule.type === "daily") {
      return `每天 ${time}`
    } else {
      return `每周${getDayOfWeekName(task.schedule.dayOfWeek || 0)} ${time}`
    }
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
    
    if (filteredTasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          {tasks.length === 0 ? (
            <>
              <AlarmClock className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">没有定时任务</h3>
              <span className="text-sm text-muted-foreground mb-4 block">
                您还没有创建任何定时任务
              </span>
            </>
          ) : (
            <>
              <Search className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">没有匹配的任务</h3>
              <span className="text-sm text-muted-foreground mb-4 block">
                尝试调整搜索条件或过滤器
              </span>
              <Button variant="outline" onClick={() => {
                setSearchTerm("")
                setStatusFilter("all")
              }}>
                清除过滤器
              </Button>
            </>
          )}
        </div>
      )
    }
    
    return (
      <div className="space-y-4">
        {filteredTasks.map(task => {
          const relatedItem = getTaskItem(task.itemId)
          
          return (
            <Card key={task.id} className={task.enabled ? "" : "opacity-70"}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base flex items-center">
                      <AlarmClock className="h-4 w-4 mr-2" />
                      {task.name}
                    </CardTitle>
                    <CardDescription>
                      {relatedItem && (
                        <span className="flex items-center">
                          <span className="truncate max-w-[200px]">{relatedItem.title}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 ml-1"
                            onClick={() => window.open(`/?item=${relatedItem.id}`, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </span>
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
                    <span className="text-muted-foreground">执行时间:</span>
                    <span>{getScheduleDescription(task)}</span>
                  </div>
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
          )
        })}
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlarmClock className="h-5 w-5 mr-2" />
              全局定时任务管理
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索任务..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Tabs
              defaultValue="all"
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as "all" | "enabled" | "disabled")}
              className="w-auto"
            >
              <TabsList>
                <TabsTrigger value="all" className="text-xs px-2 py-1">全部</TabsTrigger>
                <TabsTrigger value="enabled" className="text-xs px-2 py-1">已启用</TabsTrigger>
                <TabsTrigger value="disabled" className="text-xs px-2 py-1">已禁用</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button variant="outline" size="sm" onClick={loadTasksAndItems}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-3 mb-4 flex items-center">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              定时任务将在指定时间自动执行。您可以在这里管理所有词条的定时任务。
            </span>
          </div>
          
          <ScrollArea className="flex-1 pr-4">
            {renderTaskList()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* 删除确认对话框 */}
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
      
      {/* 编辑任务对话框 */}
      {selectedItem && (
        <ScheduledTaskDialog
          item={selectedItem}
          open={showTaskDialog}
          onOpenChange={setShowTaskDialog}
          onUpdate={() => loadTasksAndItems()}
        />
      )}
    </>
  )
} 