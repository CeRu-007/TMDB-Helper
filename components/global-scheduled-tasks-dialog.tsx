"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
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
  RotateCw,
  Link,
  Link2Off,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  MoreHorizontal,
  BarChart2,
  History,
  AlertTriangle,
  Check,
  Lightbulb,
  Plus,
  RefreshCcw,
} from "lucide-react"
import { StorageManager, TMDBItem, ScheduledTask } from "@/lib/storage"
import { taskScheduler } from "@/lib/scheduler"
import { toast } from "@/components/ui/use-toast"
import ScheduledTaskDialog from "./scheduled-task-dialog"
import { v4 as uuidv4 } from "uuid"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface GlobalScheduledTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ScheduledTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TMDBItem;
  onUpdate?: () => void;
  existingTask?: ScheduledTask;
  onTaskSaved?: (task: ScheduledTask) => void;
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
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [selectedErrorTask, setSelectedErrorTask] = useState<ScheduledTask | null>(null)
  const [showRelinkDialog, setShowRelinkDialog] = useState(false)
  const [taskToRelink, setTaskToRelink] = useState<ScheduledTask | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string>("")
  const [taskToCopy, setTaskToCopy] = useState<ScheduledTask | null>(null)
  // 批量操作相关状态
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const [itemSearchTerm, setItemSearchTerm] = useState("")
  const [relinkSuggestions, setRelinkSuggestions] = useState<Array<{item: TMDBItem, score: number, matchType: string, matchDetails: string}>>([])
  const [showBatchRelinkDialog, setShowBatchRelinkDialog] = useState(false)
  const [tasksToRelink, setTasksToRelink] = useState<ScheduledTask[]>([])

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
      console.log("[GlobalScheduledTasksDialog] 开始加载定时任务...");
      const allTasks = await StorageManager.forceRefreshScheduledTasks(); // 使用强制刷新方法
      console.log(`[GlobalScheduledTasksDialog] 加载了 ${allTasks.length} 个定时任务`);
      setTasks(allTasks)
      
      // 加载项目
      console.log("[GlobalScheduledTasksDialog] 开始加载项目...");
      const allItems = await StorageManager.getItemsWithRetry()
      console.log(`[GlobalScheduledTasksDialog] 加载了 ${allItems.length} 个项目`);
      setItems(allItems)
    } catch (error) {
      console.error("[GlobalScheduledTasksDialog] 加载数据失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载定时任务或项目数据",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 手动刷新数据
  const handleManualRefresh = async () => {
    console.log("[GlobalScheduledTasksDialog] 手动刷新数据...");
    toast({
      title: "正在刷新",
      description: "正在刷新定时任务列表...",
    });
    await loadTasksAndItems();
    toast({
      title: "刷新完成",
      description: `已加载 ${tasks.length} 个定时任务`,
    });
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

  // 查找可能匹配的项目
  const findPossibleMatches = (task: ScheduledTask): Array<{item: TMDBItem, score: number, matchType: string, matchDetails: string}> => {
    // 创建匹配项集合，用于记录每个匹配项的匹配方式和分数
    const matchCandidates: Array<{item: TMDBItem, score: number, matchType: string, matchDetails: string}> = [];
    
    // 从任务名称中提取可能的项目标题
    const taskNameWithoutSuffix = task.name.replace(/\s+定时任务$/, '');
    
    // 遍历所有项目，计算匹配度
    items.filter(item => item.mediaType === 'tv').forEach(item => {
      let totalScore = 0;
      const matchReasons: string[] = [];
      
      // 1. 标题精确匹配 (最高分)
      if (item.title === taskNameWithoutSuffix) {
        totalScore += 100;
        matchReasons.push("标题完全匹配");
      }
      // 2. 标题包含关系
      else if (item.title.includes(taskNameWithoutSuffix) || taskNameWithoutSuffix.includes(item.title)) {
        // 计算相似度分数
        const similarity = Math.min(
          item.title.length, 
          taskNameWithoutSuffix.length
        ) / Math.max(item.title.length, taskNameWithoutSuffix.length);
        
        // 转换为0-80的分数范围
        const similarityScore = Math.round(similarity * 80);
        totalScore += similarityScore;
        matchReasons.push(`标题部分匹配 (相似度: ${Math.round(similarity * 100)}%)`);
      }
      
      // 3. 检查创建时间接近度
      try {
        const taskCreatedAt = new Date(task.createdAt).getTime();
        const itemCreatedAt = new Date(item.createdAt).getTime();
        const timeDiff = Math.abs(taskCreatedAt - itemCreatedAt);
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        
        // 如果创建时间在3天内，加分
        if (daysDiff < 3) {
          const timeScore = Math.round(20 * (1 - daysDiff / 3));
          totalScore += timeScore;
          matchReasons.push(`创建时间接近 (${Math.round(daysDiff * 24)}小时内)`);
        }
      } catch (e) {
        // 忽略日期解析错误
      }
      
      // 4. 检查平台URL相似度
      if (item.platformUrl && task.action.removeIqiyiAirDate) {
        // 如果任务有爱奇艺特殊处理，且项目是爱奇艺平台
        if (item.platformUrl.includes('iqiyi.com')) {
          totalScore += 30;
          matchReasons.push("平台匹配 (爱奇艺)");
        }
      }
      
      // 5. 检查季数匹配
      if (item.seasons) {
        const hasSeason = item.seasons.some(s => s.seasonNumber === task.action.seasonNumber);
        if (hasSeason) {
          totalScore += 25;
          matchReasons.push(`包含匹配的季数 (第${task.action.seasonNumber}季)`);
        }
      }
      
      // 只添加分数大于30的匹配项
      if (totalScore > 30) {
        matchCandidates.push({
          item,
          score: totalScore,
          matchType: matchReasons[0], // 主要匹配原因
          matchDetails: matchReasons.join(", ")
        });
      }
    });
    
    // 按分数降序排序
    return matchCandidates.sort((a, b) => b.score - a.score);
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
      console.log(`开始执行任务: ${task.name}, ID: ${task.id}, 关联项目ID: ${task.itemId}`);
      
      // 获取关联的项目
      const relatedItem = getTaskItem(task.itemId)
      
      // 打印项目列表长度，帮助调试
      console.log(`当前项目列表共有 ${items.length} 个项目`);
      
      // 先验证项目是否存在，如果不存在，直接提示用户重新关联项目
      if (!relatedItem) {
        console.warn(`找不到ID为 ${task.itemId} 的项目，需要重新关联项目`);
        
        // 检查项目ID是否无效（太长或格式错误）
        const isInvalidId = task.itemId.length > 20 || !/^[0-9]+$/.test(task.itemId);
        if (isInvalidId) {
          console.warn(`项目ID ${task.itemId} 格式可能无效，尝试自动修复`);
          
          // 尝试通过任务名称修复项目ID
          const possibleItem = items.find(item => 
            item.title === task.name.replace(/\s+定时任务$/, '')
          );
          
          if (possibleItem) {
            console.log(`找到可能匹配的项目: ${possibleItem.title}, ID: ${possibleItem.id}`);
            
            // 自动更新任务的itemId
            const fixedTask = {
              ...task,
              itemId: possibleItem.id,
              updatedAt: new Date().toISOString()
            };
            
            await StorageManager.updateScheduledTask(fixedTask);
            toast({
              title: "自动修复成功",
              description: `已将任务关联到项目"${possibleItem.title}"`,
            });
            
            // 递归调用自身，使用修复后的任务
            setTasks(prev => prev.map(t => t.id === task.id ? fixedTask : t));
            return runTaskNow(fixedTask);
          }
        }
        
        // 使用增强的匹配算法查找可能的匹配项
        const possibleMatches = findPossibleMatches(task);
        
        if (possibleMatches.length > 0) {
          // 找到可能的匹配项，提示用户选择
          const bestMatch = possibleMatches[0];
          const matchConfidence = bestMatch.score >= 90 ? "高" : bestMatch.score >= 70 ? "中" : "低";
          
          toast({
            title: "项目不存在",
            description: `找不到ID为 ${task.itemId} 的项目，但找到了 ${possibleMatches.length} 个可能的匹配项`,
            variant: "destructive",
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => openRelinkDialog(task, possibleMatches)}
              >
                重新关联
              </Button>
            ),
          });
          
          // 可以选择自动打开重新关联对话框
          setTimeout(() => {
            openRelinkDialog(task, possibleMatches);
          }, 500);
          
          return;
        } else {
          // 找不到任何可能的匹配项
          toast({
            title: "项目不存在",
            description: `找不到ID为 ${task.itemId} 的项目，也无法找到可能的匹配项`,
            variant: "destructive",
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => openRelinkDialog(task)}
              >
                重新关联
              </Button>
            ),
          });
          
          // 可以选择自动打开重新关联对话框
          setTimeout(() => {
            openRelinkDialog(task);
          }, 500);
          
          return;
        }
      }
      
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
        // 这部分代码不会执行，因为我们已经在前面处理了relatedItem不存在的情况
        // 但为了代码的完整性，保留这部分逻辑
        // ... existing code ...
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
      
      // 检查是否是"找不到项目"错误
      const isItemNotFoundError = error.message && (
        error.message.includes('找不到ID为') || 
        error.message.includes('项目不存在') ||
        error.message.includes('找不到项目')
      );
      
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
      
      // 如果是找不到项目的错误，提供快速重新关联的选项
      if (isItemNotFoundError) {
        toast({
          title: "执行失败",
          description: error.message || "无法执行任务",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => openRelinkDialog(failedTask)}
            >
              重新关联
            </Button>
          ),
        });
        
        // 可以选择自动打开重新关联对话框
        setTimeout(() => {
          openRelinkDialog(failedTask);
        }, 500);
      } else {
        // 其他类型的错误，显示普通错误消息
      toast({
        title: "执行失败",
        description: error.message || "无法执行任务",
        variant: "destructive"
      });
      }
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

  // 显示任务错误详情
  const showTaskErrorDetails = (task: ScheduledTask) => {
    setSelectedErrorTask(task)
    setShowErrorDetails(true)
  }
  
  // 解析错误信息中的项目ID
  const parseItemIdFromError = (errorMessage: string): string | null => {
    // 尝试匹配"找不到ID为 xxxx 的项目"格式
    const match = errorMessage.match(/找不到ID为\s+(\d+)\s+的项目/)
    return match ? match[1] : null
  }
  
  // 获取错误类型和建议
  const getErrorTypeAndSuggestion = (errorMessage: string | null | undefined): {
    type: string;
    suggestion: string;
    icon: React.ReactNode;
  } => {
    if (!errorMessage) {
      return {
        type: "未知错误",
        suggestion: "请检查系统日志获取详细信息",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />
      };
    }
    
    // 项目不存在错误
    if (errorMessage.includes("找不到ID为") || errorMessage.includes("找不到项目") || errorMessage.includes("项目不存在")) {
      return {
        type: "项目关联错误",
        suggestion: "请重新关联任务到正确的项目",
        icon: <Link2Off className="h-5 w-5 text-red-500" />
      };
    }
    
    // TMDB ID错误
    if (errorMessage.includes("缺少TMDB ID") || errorMessage.includes("必须有TMDB ID")) {
      return {
        type: "TMDB ID缺失",
        suggestion: "请编辑项目，添加正确的TMDB ID",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />
      };
    }
    
    // 平台URL错误
    if (errorMessage.includes("缺少平台URL") || errorMessage.includes("必须有平台URL")) {
      return {
        type: "平台URL缺失",
        suggestion: "请编辑项目，添加正确的流媒体平台URL",
        icon: <ExternalLink className="h-5 w-5 text-red-500" />
      };
    }
    
    // 执行命令错误
    if (errorMessage.includes("命令执行失败") || errorMessage.includes("执行失败")) {
      return {
        type: "命令执行错误",
        suggestion: "请检查TMDB-Import工具配置和Python环境",
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />
      };
    }
    
    // 默认错误
    return {
      type: "执行错误",
      suggestion: "请查看详细错误信息",
      icon: <AlertCircle className="h-5 w-5 text-red-500" />
    };
  };
  
  // 打开重新关联项目对话框
  const openRelinkDialog = (task: ScheduledTask, possibleMatches?: Array<{item: TMDBItem, score: number, matchType: string, matchDetails: string}>) => {
    setTaskToRelink(task)
    setSelectedItemId("")
    setItemSearchTerm("")
    // 如果提供了可能的匹配项，保存它们
    if (possibleMatches && possibleMatches.length > 0) {
      setRelinkSuggestions(possibleMatches)
    } else {
      // 否则清空建议
      setRelinkSuggestions([])
    }
    setShowRelinkDialog(true)
  }
  
  // 重新关联项目
  const handleRelinkTask = async () => {
    if (!taskToRelink || !selectedItemId) return
    
    try {
      // 获取选择的项目
      const selectedItem = items.find(i => i.id === selectedItemId)
      if (!selectedItem) {
        toast({
          title: "错误",
          description: "找不到选择的项目",
          variant: "destructive"
        })
        return
      }
      
      // 记录关联历史（可以存储在localStorage中，用于未来的智能推荐）
      try {
        const relinkHistory = JSON.parse(localStorage.getItem('tmdb_helper_relink_history') || '[]');
        relinkHistory.push({
          taskId: taskToRelink.id,
          oldItemId: taskToRelink.itemId,
          newItemId: selectedItemId,
          taskName: taskToRelink.name,
          itemTitle: selectedItem.title,
          timestamp: new Date().toISOString(),
          suggestions: relinkSuggestions.map(s => ({
            itemId: s.item.id,
            score: s.score,
            matchType: s.matchType
          }))
        });
        // 只保留最近的50条记录
        if (relinkHistory.length > 50) {
          relinkHistory.splice(0, relinkHistory.length - 50);
        }
        localStorage.setItem('tmdb_helper_relink_history', JSON.stringify(relinkHistory));
      } catch (e) {
        // 忽略存储错误
        console.warn("保存关联历史记录失败", e);
      }
      
      // 更新任务的项目ID
      const updatedTask = {
        ...taskToRelink,
        itemId: selectedItemId,
        lastRunError: null, // 清除错误信息
        updatedAt: new Date().toISOString()
      }
      
      const success = await StorageManager.updateScheduledTask(updatedTask)
      if (success) {
        // 更新本地任务列表
        setTasks(prev => 
          prev.map(t => t.id === taskToRelink.id ? updatedTask : t)
        )
        
        // 查找是否有相同错误的其他任务
        const similarErrorTasks = tasks.filter(t => 
          t.id !== taskToRelink.id && 
          t.itemId === taskToRelink.itemId && 
          t.lastRunStatus === "failed" &&
          t.lastRunError?.includes("找不到ID为")
        );
        
        let toastMessage = `任务已重新关联到项目: ${selectedItem.title}`;
        if (similarErrorTasks.length > 0) {
          toastMessage += `\n发现${similarErrorTasks.length}个任务有相同错误，建议一并修复`;
        }
        
        toast({
          title: "关联成功",
          description: toastMessage,
          action: similarErrorTasks.length > 0 ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                batchRelinkTasks(taskToRelink.id, taskToRelink.itemId, selectedItemId);
              }}
            >
              批量修复
            </Button>
          ) : undefined
        })
        
        // 关闭对话框
        setShowRelinkDialog(false)
        setTaskToRelink(null)
        setRelinkSuggestions([])
      }
    } catch (error) {
      console.error("重新关联项目失败:", error)
      toast({
        title: "关联失败",
        description: "无法更新任务关联",
        variant: "destructive"
      })
    }
  }

  // 复制任务
  const copyTask = (task: ScheduledTask) => {
    // 获取关联的项目
    const relatedItem = getTaskItem(task.itemId)
    if (!relatedItem) {
      toast({
        title: "无法复制",
        description: "找不到关联的项目，请先重新关联项目",
        variant: "destructive"
      })
      return
    }
    
    // 创建任务副本
    const copiedTask: ScheduledTask = {
      ...task,
      id: uuidv4(), // 使用uuid库生成新ID
      name: `${task.name} (副本)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRun: undefined,
      lastRunStatus: undefined,
      lastRunError: null,
      nextRun: undefined
    }
    
    // 设置为当前选中的项目和任务
    setSelectedItem(relatedItem)
    setTaskToCopy(copiedTask)
    setShowTaskDialog(true)
    
    toast({
      title: "已创建副本",
      description: "请编辑并保存任务副本",
    })
  }

  // 选择/取消选择任务
  const toggleTaskSelection = (taskId: string) => {
    const newSelectedTasks = new Set(selectedTasks)
    if (newSelectedTasks.has(taskId)) {
      newSelectedTasks.delete(taskId)
    } else {
      newSelectedTasks.add(taskId)
    }
    setSelectedTasks(newSelectedTasks)
  }
  
  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      // 如果全部已选中，则取消全选
      setSelectedTasks(new Set())
    } else {
      // 否则全选
      const allTaskIds = filteredTasks.map(task => task.id)
      setSelectedTasks(new Set(allTaskIds))
    }
  }
  
  // 批量启用任务
  const batchEnableTasks = async () => {
    if (selectedTasks.size === 0) return
    
    setIsBatchProcessing(true)
    
    try {
      const updatedTasks: ScheduledTask[] = []
      
      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId)
        if (task && !task.enabled) {
          const updatedTask = {
            ...task,
            enabled: true,
            updatedAt: new Date().toISOString()
          }
          
          const success = await StorageManager.updateScheduledTask(updatedTask)
          if (success) {
            await taskScheduler.scheduleTask(updatedTask)
            updatedTasks.push(updatedTask)
          }
        }
      }
      
      if (updatedTasks.length > 0) {
        // 更新本地任务列表
        setTasks(prev => 
          prev.map(task => {
            const updatedTask = updatedTasks.find(t => t.id === task.id)
            return updatedTask || task
          })
        )
        
        toast({
          title: "批量操作成功",
          description: `已启用 ${updatedTasks.length} 个任务`,
        })
      }
    } catch (error) {
      console.error("批量启用任务失败:", error)
      toast({
        title: "批量操作失败",
        description: "无法启用部分或全部任务",
        variant: "destructive"
      })
    } finally {
      setIsBatchProcessing(false)
    }
  }
  
  // 批量禁用任务
  const batchDisableTasks = async () => {
    if (selectedTasks.size === 0) return
    
    setIsBatchProcessing(true)
    
    try {
      const updatedTasks: ScheduledTask[] = []
      
      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId)
        if (task && task.enabled) {
          const updatedTask = {
            ...task,
            enabled: false,
            updatedAt: new Date().toISOString()
          }
          
          const success = await StorageManager.updateScheduledTask(updatedTask)
          if (success) {
            await taskScheduler.updateTask(updatedTask)
            updatedTasks.push(updatedTask)
          }
        }
      }
      
      if (updatedTasks.length > 0) {
        // 更新本地任务列表
        setTasks(prev => 
          prev.map(task => {
            const updatedTask = updatedTasks.find(t => t.id === task.id)
            return updatedTask || task
          })
        )
        
        toast({
          title: "批量操作成功",
          description: `已禁用 ${updatedTasks.length} 个任务`,
        })
      }
    } catch (error) {
      console.error("批量禁用任务失败:", error)
      toast({
        title: "批量操作失败",
        description: "无法禁用部分或全部任务",
        variant: "destructive"
      })
    } finally {
      setIsBatchProcessing(false)
    }
  }
  
  // 批量删除任务
  const batchDeleteTasks = async () => {
    if (selectedTasks.size === 0) return
    
    setIsBatchProcessing(true)
    
    try {
      const deletedTaskIds: string[] = []
      
      for (const taskId of selectedTasks) {
        const success = await StorageManager.deleteScheduledTask(taskId)
        if (success) {
          deletedTaskIds.push(taskId)
        }
      }
      
      if (deletedTaskIds.length > 0) {
        // 更新本地任务列表
        setTasks(prev => prev.filter(task => !deletedTaskIds.includes(task.id)))
        
        // 清空选中状态
        setSelectedTasks(new Set())
        
        toast({
          title: "批量删除成功",
          description: `已删除 ${deletedTaskIds.length} 个任务`,
        })
      }
    } catch (error) {
      console.error("批量删除任务失败:", error)
      toast({
        title: "批量删除失败",
        description: "无法删除部分或全部任务",
        variant: "destructive"
      })
    } finally {
      setIsBatchProcessing(false)
      setShowBatchDeleteConfirm(false)
    }
  }

  // 批量重新关联项目
  const batchRelinkTasks = (sourceTaskId: string, sourceItemId: string, targetItemId: string) => {
    // 查找所有需要重新关联的任务
    const affectedTasks = tasks.filter(t => 
      t.id !== sourceTaskId && // 排除已经修复的源任务
      t.itemId === sourceItemId && // 相同的旧项目ID
      (t.lastRunStatus === "failed" || !getTaskItem(t.itemId)) // 失败状态或找不到项目
    );
    
    if (affectedTasks.length === 0) {
      toast({
        title: "没有需要修复的任务",
        description: "没有找到其他需要重新关联的任务"
      });
      return;
    }
    
    // 设置需要重新关联的任务列表
    setTasksToRelink(affectedTasks);
    
    // 预设目标项目ID
    setSelectedItemId(targetItemId);
    
    // 打开批量重新关联对话框
    setShowBatchRelinkDialog(true);
  };
  
  // 执行批量重新关联
  const handleBatchRelink = async () => {
    if (!selectedItemId || tasksToRelink.length === 0) return;
    
    setIsBatchProcessing(true);
    
    try {
      // 获取选择的项目
      const selectedItem = items.find(i => i.id === selectedItemId);
      if (!selectedItem) {
        throw new Error("找不到选择的项目");
      }
      
      const updatedTasks: ScheduledTask[] = [];
      const failedTaskIds: string[] = [];
      
      // 逐个更新任务
      for (const task of tasksToRelink) {
        const updatedTask = {
          ...task,
          itemId: selectedItemId,
          lastRunError: null, // 清除错误信息
          updatedAt: new Date().toISOString()
        };
        
        const success = await StorageManager.updateScheduledTask(updatedTask);
        if (success) {
          updatedTasks.push(updatedTask);
        } else {
          failedTaskIds.push(task.id);
        }
      }
      
      // 更新本地任务列表
      if (updatedTasks.length > 0) {
        setTasks(prev => 
          prev.map(t => {
            const updatedTask = updatedTasks.find(ut => ut.id === t.id);
            return updatedTask || t;
          })
        );
        
        toast({
          title: "批量关联成功",
          description: `已将 ${updatedTasks.length} 个任务重新关联到项目: ${selectedItem.title}`,
        });
      }
      
      // 如果有失败的任务，显示警告
      if (failedTaskIds.length > 0) {
        toast({
          title: "部分任务关联失败",
          description: `${failedTaskIds.length} 个任务关联失败，请稍后重试`,
          variant: "destructive"
        });
      }
      
      // 关闭对话框
      setShowBatchRelinkDialog(false);
      setTasksToRelink([]);
      
    } catch (error) {
      console.error("批量重新关联项目失败:", error);
      toast({
        title: "批量关联失败",
        description: error instanceof Error ? error.message : "无法更新任务关联",
        variant: "destructive"
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // 渲染任务列表
  const renderTaskList = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">加载中...</span>
        </div>
      )
    }
    
    if (filteredTasks.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          {tasks.length === 0 ? "暂无定时任务" : "没有匹配的任务"}
        </div>
      )
    }
    
    return (
      <div className="space-y-4">
        {selectedTasks.size > 0 && (
          <div className="bg-muted p-2 rounded-md flex items-center justify-between">
            <div className="flex items-center">
                          <Button 
                            variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                onClick={toggleSelectAll}
              >
                {selectedTasks.size === filteredTasks.length ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                          </Button>
              <span className="ml-2 text-sm">
                已选择 {selectedTasks.size} 个任务
                        </span>
                  </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={batchEnableTasks}
                disabled={isBatchProcessing}
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                启用
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={batchDisableTasks}
                disabled={isBatchProcessing}
              >
                <PauseCircle className="h-4 w-4 mr-1" />
                禁用
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBatchDeleteConfirm(true)}
                disabled={isBatchProcessing}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                删除
              </Button>
                </div>
                  </div>
        )}
        
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {filteredTasks.map(task => {
            // 获取关联的项目
            const relatedItem = getTaskItem(task.itemId)
            const hasError = task.lastRunStatus === "failed" && !!task.lastRunError
            const isRunning = isRunningTask && runningTaskId === task.id
            const isSuccess = task.lastRunStatus === "success"
            const isSelected = selectedTasks.has(task.id)
            
            return (
              <TaskCard
                key={task.id}
                task={task}
                relatedItem={relatedItem}
                hasError={!!hasError}
                isRunning={!!isRunning}
                isSuccess={!!isSuccess}
                isSelected={isSelected}
                onToggleSelect={() => toggleTaskSelection(task.id)}
                onEdit={handleEditTask}
                onDelete={confirmDeleteTask}
                onToggleEnabled={toggleTaskEnabled}
                onRun={runTaskNow}
                onCopy={copyTask}
                onShowError={showTaskErrorDetails}
                onRelink={openRelinkDialog}
                runningTaskId={runningTaskId}
              />
            )
          })}
                  </div>
                  </div>
    )
  }

  // 任务卡片组件
  const TaskCard = ({ 
    task, 
    relatedItem, 
    hasError, 
    isRunning,
    isSuccess,
    isSelected,
    onToggleSelect,
    onEdit,
    onDelete,
    onToggleEnabled,
    onRun,
    onCopy,
    onShowError,
    onRelink,
    runningTaskId
  }: {
    task: ScheduledTask;
    relatedItem?: TMDBItem;
    hasError: boolean;
    isRunning: boolean;
    isSuccess: boolean;
    isSelected: boolean;
    onToggleSelect: () => void;
    onEdit: (task: ScheduledTask) => void;
    onDelete: (taskId: string) => void;
    onToggleEnabled: (task: ScheduledTask) => void;
    onRun: (task: ScheduledTask) => void;
    onCopy: (task: ScheduledTask) => void;
    onShowError: (task: ScheduledTask) => void;
    onRelink: (task: ScheduledTask) => void;
    runningTaskId: string | null;
  }) => {
    // 任务卡片展开状态
    const [expanded, setExpanded] = useState(false);
    
    // 获取状态信息
    const getStatusInfo = () => {
      if (isRunning) {
        return {
          color: "bg-blue-500 dark:bg-blue-600",
          textColor: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/30",
          borderColor: "border-blue-300 dark:border-blue-800",
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          label: "执行中"
        };
      } else if (hasError) {
        return {
          color: "bg-red-500 dark:bg-red-600",
          textColor: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-900/30",
          borderColor: "border-red-300 dark:border-red-800",
          icon: <AlertCircle className="h-4 w-4" />,
          label: "执行失败"
        };
      } else if (isSuccess) {
        return {
          color: "bg-green-500 dark:bg-green-600",
          textColor: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-900/30",
          borderColor: "border-green-300 dark:border-green-800",
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: "执行成功"
        };
      } else if (task.enabled) {
        return {
          color: "bg-green-500 dark:bg-green-600",
          textColor: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-900/30",
          borderColor: "border-green-300 dark:border-green-800",
          icon: <AlarmClock className="h-4 w-4" />,
          label: "已启用"
        };
      } else {
        return {
          color: "bg-gray-300 dark:bg-gray-700",
          textColor: "text-gray-500 dark:text-gray-400",
          bgColor: "bg-gray-50 dark:bg-gray-900/30",
          borderColor: "border-gray-300 dark:border-gray-800",
          icon: <AlarmClock className="h-4 w-4" />,
          label: "已禁用"
        };
      }
    };
    
    const statusInfo = getStatusInfo();
    
    return (
      <Card 
        className={`overflow-hidden transition-all duration-200 ${
          isSelected ? 'ring-2 ring-primary' : ''
        } ${
          hasError ? statusInfo.borderColor : 
          isRunning ? statusInfo.borderColor : 
          ''
        }`}
      >
        <div className={`h-1 ${statusInfo.color}`}>
          {isRunning && <Progress value={45} className="h-full" />}
                  </div>
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-base font-medium flex items-center group">
                  <Button
                  variant="ghost"
                    size="sm"
                  className="h-6 w-6 p-0 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect();
                  }}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  </Button>
                <div className={`p-1 rounded-full mr-2 ${
                  task.enabled ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <AlarmClock className={`h-4 w-4 ${
                    task.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                  }`} />
                </div>
                <span className="flex-1">{task.name}</span>
                {hasError && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-4 w-4 ml-2 text-red-500 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>任务执行失败</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                  <Button
                  variant="ghost" 
                    size="sm"
                  className="h-6 w-6 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(task);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </CardTitle>
              <CardDescription className="mt-1 ml-8">
                {relatedItem ? (
                  <span className="flex items-center text-xs">
                    <Link className="h-3 w-3 mr-1" />
                    关联项目: {relatedItem.title}
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-red-500">
                    <Link2Off className="h-3 w-3 mr-1" />
                    找不到关联项目 (ID: {task.itemId})
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center">
              <Badge 
                variant={task.enabled ? "default" : "outline"} 
                className={`mr-2 ${isRunning ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
              >
                <span className="flex items-center">
                  {statusInfo.icon}
                  <span className="ml-1">{statusInfo.label}</span>
                </span>
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>任务操作</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onEdit(task)} disabled={isRunning || !relatedItem}>
                    <Settings className="h-4 w-4 mr-2" />
                    编辑任务
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCopy(task)}>
                    <Copy className="h-4 w-4 mr-2" />
                    复制任务
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onToggleEnabled(task)} disabled={isRunning}>
                    {task.enabled ? (
                      <>
                        <PauseCircle className="h-4 w-4 mr-2" />
                        禁用任务
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        启用任务
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRun(task)} disabled={isRunning || !relatedItem}>
                    <Play className="h-4 w-4 mr-2" />
                    立即执行
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(task.id)} disabled={isRunning} className="text-red-600 dark:text-red-400">
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除任务
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
                </div>
          </div>
        </CardHeader>
        
        <CardContent className={`pb-2 text-sm ${statusInfo.bgColor}`}>
          <div className="grid grid-cols-2 gap-2">
                <div>
              <div className="flex items-center text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1 shrink-0" />
                {getScheduleDescription(task)}
              </div>
              <div className="flex items-center text-muted-foreground mt-1">
                <Clock className="h-3 w-3 mr-1 shrink-0" />
                下次执行: {formatNextRunTime(task)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">
                季: {task.action.seasonNumber}
              </div>
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-1">
                {task.action.autoUpload && (
                  <Badge variant="outline" className="text-xs py-0 h-5">自动上传</Badge>
                )}
                {task.action.autoRemoveMarked && (
                  <Badge variant="outline" className="text-xs py-0 h-5">自动过滤</Badge>
                )}
              </div>
            </div>
          </div>
          
          {hasError && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-600 dark:text-red-400">
              <div className="font-medium">错误信息:</div>
              <div className="truncate">{task.lastRunError}</div>
              <div className="mt-1 flex justify-between">
                  <Button
                  variant="ghost" 
                    size="sm"
                  className="h-6 text-xs px-2 py-0"
                  onClick={() => onShowError(task)}
                  >
                  查看详情
                  </Button>
                  <Button
                  variant="ghost" 
                    size="sm"
                  className="h-6 text-xs px-2 py-0"
                  onClick={() => onRelink(task)}
                >
                  重新关联项目
                </Button>
              </div>
            </div>
          )}
          
          {task.lastRun && !hasError && (
            <div className="mt-2 text-xs text-muted-foreground">
              上次执行: {formatLastRunTime(task)}
              {isSuccess && (
                <span className={`ml-2 ${statusInfo.textColor}`}>
                  <CheckCircle2 className="h-3 w-3 inline" /> 成功
                </span>
              )}
            </div>
          )}
          
          {/* 展开的额外信息 */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-border">
              <h4 className="text-xs font-medium mb-2">高级选项</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span>自动确认上传:</span>
                  <Badge variant="outline" className="font-normal">
                    {task.action.autoConfirm !== false ? "是" : "否"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>自动标记已上传:</span>
                  <Badge variant="outline" className="font-normal">
                    {task.action.autoMarkUploaded !== false ? "是" : "否"}
                  </Badge>
                </div>
                {task.action.removeIqiyiAirDate !== undefined && (
                  <div className="flex items-center justify-between">
                    <span>删除爱奇艺日期:</span>
                    <Badge variant="outline" className="font-normal">
                      {task.action.removeIqiyiAirDate ? "是" : "否"}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>创建时间:</span>
                  <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-2 flex flex-col gap-2">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRun(task)}
              disabled={isRunning || !relatedItem}
              className={`flex-1 ${isRunning ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800' : ''}`}
            >
              {isRunning && runningTaskId === task.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  执行中...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        立即执行
                      </>
                    )}
                  </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="ml-2"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
    );
  };

  // 清理无效的任务
  const handleCleanInvalidTasks = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // 识别无效的任务
      let invalidTasks: ScheduledTask[] = [];
      let fixedCount = 0;
      
      for (const task of tasks) {
        const relatedItem = getTaskItem(task.itemId);
        if (!relatedItem) {
          // 尝试自动修复
          const matchingItem = items.find(item => 
            item.title === task.name.replace(/\s+定时任务$/, '')
          );
          
          if (matchingItem) {
            // 可以修复
            const fixedTask = {
              ...task,
              itemId: matchingItem.id,
              updatedAt: new Date().toISOString()
            };
            
            await StorageManager.updateScheduledTask(fixedTask);
            fixedCount++;
          } else {
            // 无法修复
            invalidTasks.push(task);
          }
        }
      }
      
      // 如果有无法修复的任务，显示确认对话框
      if (invalidTasks.length > 0) {
        if (window.confirm(`发现 ${invalidTasks.length} 个无法自动修复的无效任务，是否删除？已自动修复 ${fixedCount} 个任务。`)) {
          let deleteCount = 0;
          for (const task of invalidTasks) {
            const success = await StorageManager.deleteScheduledTask(task.id);
            if (success) deleteCount++;
          }
          
          toast({
            title: "清理完成",
            description: `成功删除 ${deleteCount} 个无效任务，自动修复 ${fixedCount} 个任务`,
          });
          
          // 重新加载任务列表
          await loadTasksAndItems();
        } else {
          toast({
            title: "操作取消",
            description: `已取消删除操作，但已自动修复 ${fixedCount} 个任务`,
          });
          
          if (fixedCount > 0) {
            // 如果有任务被修复，重新加载任务列表
            await loadTasksAndItems();
          }
        }
      } else if (fixedCount > 0) {
        toast({
          title: "清理完成",
          description: `已自动修复 ${fixedCount} 个任务，没有发现无法修复的任务`,
        });
        
        // 重新加载任务列表
        await loadTasksAndItems();
      } else {
        toast({
          title: "检查完成",
          description: "所有任务都是有效的，无需清理",
        });
      }
    } catch (error) {
      console.error("清理无效任务失败:", error);
      toast({
        title: "清理失败",
        description: "无法完成清理操作",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlarmClock className="h-5 w-5 mr-2" />
              定时任务管理
              <Badge className="ml-3" variant="outline">
                共 {tasks.length} 个任务
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {/* 工具栏 */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索任务..."
                  className="pl-8 w-[200px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value: "all" | "enabled" | "disabled") => setStatusFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有状态</SelectItem>
                  <SelectItem value="enabled">已启用</SelectItem>
                  <SelectItem value="disabled">已禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={handleCleanInvalidTasks}
                  disabled={loading || isRunningTask}
                  title="清理无效任务"
                  className="mr-2"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  清理无效
                </Button>
                
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={loading}
                  title="刷新任务列表"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCw className="h-4 w-4 mr-2" />
                  )}
                  刷新
                </Button>
              
              {selectedItem && (
                <Button
                  size="sm"
                  onClick={() => setShowTaskDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加任务
            </Button>
              )}
          </div>
          </div>
          
          <ScrollArea className="flex-1 h-[500px] pr-4">
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
              确定要删除这个定时任务吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 批量删除确认对话框 */}
      <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedTasks.size} 个定时任务吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={batchDeleteTasks}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 编辑任务对话框 */}
      {selectedItem && (
        <ScheduledTaskDialog
          open={showTaskDialog}
          onOpenChange={setShowTaskDialog}
          item={selectedItem}
          existingTask={taskToCopy || tasks.find(t => t.itemId === selectedItem.id)}
          onTaskSaved={(task: ScheduledTask) => {
            // 更新任务列表
            setTasks(prev => {
              const index = prev.findIndex(t => t.id === task.id);
              if (index !== -1) {
                const newTasks = [...prev];
                newTasks[index] = task;
                return newTasks;
              }
              return [...prev, task];
            });
            setShowTaskDialog(false);
            // 清除复制的任务
            setTaskToCopy(null);
          }}
        />
      )}
      
      {/* 错误详情对话框 */}
      <Dialog open={showErrorDetails} onOpenChange={setShowErrorDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>任务错误详情</DialogTitle>
          </DialogHeader>
          
          {selectedErrorTask && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">任务名称</h3>
                <p>{selectedErrorTask.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">执行时间</h3>
                <p>{formatLastRunTime(selectedErrorTask)}</p>
              </div>
              
              {selectedErrorTask.lastRunError && (
                <>
                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-md">
                    {(() => {
                      const { type, suggestion, icon } = getErrorTypeAndSuggestion(selectedErrorTask.lastRunError);
                      return (
                        <>
                          <div className="flex items-center mb-2">
                            {icon}
                            <span className="ml-2 font-medium text-red-700 dark:text-red-300">{type}</span>
                          </div>
                          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{suggestion}</p>
                          <div className="bg-white dark:bg-gray-900 p-3 rounded text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {selectedErrorTask.lastRunError}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowErrorDetails(false)}
                    >
                      关闭
                    </Button>
                    {getErrorTypeAndSuggestion(selectedErrorTask.lastRunError).type === "项目关联错误" && (
                      <Button 
                        variant="default"
                        onClick={() => {
                          setShowErrorDetails(false);
                          openRelinkDialog(selectedErrorTask, []);
                        }}
                      >
                        重新关联项目
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* 重新关联项目对话框 */}
      <Dialog open={showRelinkDialog} onOpenChange={setShowRelinkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>重新关联项目</DialogTitle>
          </DialogHeader>
          
          {taskToRelink && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">任务名称</h3>
                <p>{taskToRelink.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">当前关联项目ID</h3>
                <p>{taskToRelink.itemId}</p>
              </div>
              
              {relinkSuggestions.length > 0 && (
                <div className="border rounded-md p-4 bg-amber-50 dark:bg-amber-950">
                  <h3 className="text-sm font-medium flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                    智能匹配建议
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    系统根据多种因素找到了以下可能的匹配项目，点击卡片选择：
                  </p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {relinkSuggestions.map(suggestion => (
                      <div 
                        key={suggestion.item.id}
                        className={cn(
                          "border rounded-md p-2 cursor-pointer transition-colors",
                          selectedItemId === suggestion.item.id 
                            ? "bg-primary/10 border-primary" 
                            : "hover:bg-accent"
                        )}
                        onClick={() => setSelectedItemId(suggestion.item.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="font-medium">{suggestion.item.title}</div>
                          <Badge variant={
                            suggestion.score >= 90 ? "default" : 
                            suggestion.score >= 70 ? "secondary" : "outline"
                          }>
                            匹配度: {suggestion.score}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {suggestion.matchDetails}
                        </div>
                        {suggestion.item.platformUrl && (
                          <div className="text-xs mt-1 truncate text-blue-500 dark:text-blue-400">
                            {suggestion.item.platformUrl}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium">选择新的关联项目</h3>
                <div className="relative mt-1">
                  <Command className="rounded-md border shadow-md">
                    <CommandInput 
                      placeholder="搜索项目..." 
                      value={itemSearchTerm}
                      onValueChange={setItemSearchTerm}
                      className="border-none focus:ring-0"
                    />
                    <CommandList className="max-h-[300px] overflow-auto">
                      <CommandEmpty>没有找到匹配的项目</CommandEmpty>
                      {(() => {
                        // 按首字母分组项目
                        const filteredItems = items
                          .filter(item => item.mediaType === 'tv')
                          .filter(item => 
                            item.title.toLowerCase().includes(itemSearchTerm.toLowerCase())
                          )
                          .sort((a, b) => a.title.localeCompare(b.title));
                        
                        if (filteredItems.length === 0) {
                          return null;
                        }
                        
                        // 如果搜索词不为空，不进行分组
                        if (itemSearchTerm) {
                          return (
                            <CommandGroup heading="搜索结果">
                              {filteredItems.map(item => (
                                <CommandItem
                                  key={item.id}
                                  value={item.id}
                                  onSelect={(value) => {
                                    setSelectedItemId(value);
                                    setItemSearchTerm("");
                                  }}
                                  className={cn(
                                    "cursor-pointer py-2",
                                    selectedItemId === item.id && "bg-accent text-accent-foreground"
                                  )}
                                >
                                  <div className="flex items-center">
                                    {selectedItemId === item.id && (
                                      <Check className="mr-2 h-4 w-4" />
                                    )}
                                    <span>{item.title}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          );
                        }
                        
                        // 按首字母分组
                        const groupedItems: Record<string, TMDBItem[]> = {};
                        
                        filteredItems.forEach(item => {
                          const firstChar = item.title.charAt(0).toUpperCase();
                          if (!groupedItems[firstChar]) {
                            groupedItems[firstChar] = [];
                          }
                          groupedItems[firstChar].push(item);
                        });
                        
                        return Object.entries(groupedItems).map(([letter, items]) => (
                          <CommandGroup key={letter} heading={letter}>
                            {items.map(item => (
                              <CommandItem
                                key={item.id}
                                value={item.id}
                                onSelect={(value) => {
                                  setSelectedItemId(value);
                                  setItemSearchTerm("");
                                }}
                                className={cn(
                                  "cursor-pointer py-2",
                                  selectedItemId === item.id && "bg-accent text-accent-foreground"
                                )}
                              >
                                <div className="flex items-center">
                                  {selectedItemId === item.id && (
                                    <Check className="mr-2 h-4 w-4" />
                                  )}
                                  <span>{item.title}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ));
                      })()}
                    </CommandList>
                  </Command>
                  
                  {selectedItemId && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">已选择: </span>
                      {items.find(item => item.id === selectedItemId)?.title}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowRelinkDialog(false)}
                >
                  取消
                </Button>
                <Button 
                  variant="default"
                  onClick={handleRelinkTask}
                  disabled={!selectedItemId}
                >
                  确认关联
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* 批量重新关联对话框 */}
      <Dialog open={showBatchRelinkDialog} onOpenChange={setShowBatchRelinkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>批量重新关联项目</DialogTitle>
            <DialogDescription>
              将多个任务同时重新关联到新的项目
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">受影响的任务 ({tasksToRelink.length})</h3>
              <ScrollArea className="h-[200px] mt-2 border rounded-md p-2">
                <div className="space-y-2">
                  {tasksToRelink.map(task => (
                    <div key={task.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="font-medium">{task.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {task.id}</div>
                      </div>
                      {task.lastRunStatus === "failed" && (
                        <Badge variant="destructive">失败</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            <div>
              <h3 className="text-sm font-medium">目标项目</h3>
              {selectedItemId && (
                <div className="mt-2 p-3 border rounded-md">
                  <div className="font-medium">
                    {items.find(item => item.id === selectedItemId)?.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ID: {selectedItemId}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowBatchRelinkDialog(false)}
                disabled={isBatchProcessing}
              >
                取消
              </Button>
              <Button 
                variant="default"
                onClick={handleBatchRelink}
                disabled={isBatchProcessing || !selectedItemId}
              >
                {isBatchProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  "确认批量关联"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 