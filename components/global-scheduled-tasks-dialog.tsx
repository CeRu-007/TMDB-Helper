"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

  Plus,
  RefreshCcw,
} from "lucide-react"
import { StorageManager, TMDBItem, ScheduledTask } from "@/lib/storage"
import { taskScheduler } from "@/lib/scheduler"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import ScheduledTaskDialog from "./scheduled-task-dialog"
import { TaskExecutionLogsDialog } from "./task-execution-logs-dialog"
import EnhancedSchedulerDebugDialog from "./enhanced-scheduler-debug-dialog"
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
  const [items, setItems] = useState<TMDBItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
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
  // 选择模式状态
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [itemSearchTerm, setItemSearchTerm] = useState("")
  const [relinkSuggestions, setRelinkSuggestions] = useState<Array<{item: TMDBItem, score: number, matchType: string, matchDetails: string}>>([])
  const [showBatchRelinkDialog, setShowBatchRelinkDialog] = useState(false)
  const [tasksToRelink, setTasksToRelink] = useState<ScheduledTask[]>([])
  // 任务执行日志对话框状态
  const [showExecutionLogs, setShowExecutionLogs] = useState(false)
  // 调度器调试对话框状态
  const [showSchedulerDebug, setShowSchedulerDebug] = useState(false)
  // 防止重复加载的标志
  const [isLoadingData, setIsLoadingData] = useState(false)

  // 下拉菜单状态管理
  const [openDropdownMenus, setOpenDropdownMenus] = useState<Set<string>>(new Set())

  // 下拉菜单状态管理辅助函数
  const handleDropdownOpenChange = useCallback((taskId: string, open: boolean) => {
    setOpenDropdownMenus(prev => {
      const newSet = new Set(prev)
      if (open) {
        // 关闭其他所有下拉菜单，只保持当前菜单打开
        newSet.clear()
        newSet.add(taskId)
      } else {
        newSet.delete(taskId)
      }
      return newSet
    })
  }, [])

  // 关闭所有下拉菜单
  const closeAllDropdownMenus = useCallback(() => {
    setOpenDropdownMenus(new Set())
  }, [])

  // 获取正在运行的任务 - 使用更稳定的依赖
  const runningTasks = useMemo(() => {
    return tasks.filter(task => task.isRunning || taskScheduler.isTaskRunning(task.id))
  }, [tasks, runningTaskId])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 加载任务列表和项目 - 添加防抖
  useEffect(() => {
    if (open && !isLoadingData) {
      const timer = setTimeout(() => {
        loadTasksAndItems()
      }, 100) // 100ms防抖

      return () => clearTimeout(timer)
    }
  }, [open])

  // 使用useMemo优化过滤任务
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // 按状态过滤
    if (statusFilter !== "all") {
      filtered = filtered.filter(task =>
        statusFilter === "enabled" ? task.enabled : !task.enabled
      );
    }

    // 按搜索词过滤
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(task => {
        // 获取关联项目
        const relatedItem = items.find(item => item.id === task.itemId);

        return (
          task.name.toLowerCase().includes(term) ||
          relatedItem?.title.toLowerCase().includes(term)
        );
      });
    }

    return filtered;
  }, [tasks, debouncedSearchTerm, statusFilter, items]);

  // 加载任务和项目
  const loadTasksAndItems = async (forceRefresh = false) => {
    // 防止重复加载
    if (isLoadingData) {
      console.log("[GlobalScheduledTasksDialog] 数据正在加载中，跳过重复请求");
      return;
    }

    setIsLoadingData(true);
    setLoading(true);

    try {
      console.log("[GlobalScheduledTasksDialog] 开始加载数据...");

      // 并行加载任务和项目，只在必要时强制刷新
      const [allTasks, allItems] = await Promise.all([
        StorageManager.getScheduledTasks(forceRefresh),
        StorageManager.getItemsWithRetry()
      ]);

      console.log(`[GlobalScheduledTasksDialog] 加载完成: ${allTasks.length} 个任务, ${allItems.length} 个项目`);
      
      // 检查项目是否存在
      if (allItems.length === 0) {
        console.warn("[GlobalScheduledTasksDialog] 警告: 系统中没有项目，任务将无法执行");
        toast({
          title: "注意",
          description: "系统中没有可用项目，定时任务将无法执行",
          variant: "warning",
          icon: <AlarmClock className="h-4 w-4" />
        });
      }
      
      // 检查任务的项目关联
      const tasksWithInvalidItem = allTasks.filter(task => !allItems.some(item => item.id === task.itemId));
      if (tasksWithInvalidItem.length > 0) {
        console.warn(`[GlobalScheduledTasksDialog] 警告: 有 ${tasksWithInvalidItem.length} 个任务关联的项目不存在`);
        
        // 显示警告并提供修复选项
        if (tasksWithInvalidItem.length === 1) {
          toast({
            title: "项目关联问题",
            description: `任务"${tasksWithInvalidItem[0].name}"关联的项目不存在，需要重新关联`,
            variant: "destructive",
            action: (
              <ToastAction altText="重新关联" onClick={() => {
                setTaskToRelink(tasksWithInvalidItem[0]);
                setShowRelinkDialog(true);
              }}>
                重新关联
              </ToastAction>
            )
          });
        } else {
          toast({
            title: "项目关联问题",
            description: `有 ${tasksWithInvalidItem.length} 个任务关联的项目不存在，需要修复`,
            variant: "destructive",
            action: (
              <ToastAction altText="批量修复" onClick={handleCleanInvalidTasks}>
                批量修复
              </ToastAction>
            )
          });
        }
      }
      
      setTasks(allTasks)
      setItems(allItems)


    } catch (error) {
      console.error("[GlobalScheduledTasksDialog] 加载数据失败:", error);
      toast({
        title: "加载失败",
        description: "无法加载定时任务或项目数据",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  }

  // 轻量级任务更新，避免重新加载所有数据
  const refreshTasksOnly = async () => {
    try {
      const updatedTasks = await StorageManager.getScheduledTasks();
      setTasks(updatedTasks);
    } catch (error) {
      console.error("[GlobalScheduledTasksDialog] 刷新任务失败:", error);
    }
  }

  // 手动刷新数据
  const handleManualRefresh = async () => {
    console.log("[GlobalScheduledTasksDialog] 手动刷新数据...");
    toast({
      title: "正在刷新",
      description: "正在刷新定时任务列表...",
    });
    await loadTasksAndItems(true); // 手动刷新时强制刷新
    toast({
      title: "刷新完成",
      description: `已加载 ${tasks.length} 个定时任务`,
    });
  }

  // 获取任务关联的项目
  const getTaskItem = useCallback((taskItemId: string, task?: ScheduledTask): TMDBItem | undefined => {
    // 方法1: 通过ID直接匹配
    const exactMatch = items.find(item => item.id === taskItemId);
    if (exactMatch) {
      console.log(`[GlobalScheduledTasksDialog] 通过ID直接找到项目: ${exactMatch.title}`);
      return exactMatch;
    }

    // 如果没有直接找到，尝试通过其他方法查找
    console.log(`[GlobalScheduledTasksDialog] 通过ID ${taskItemId} 未找到项目，尝试其他方法...`);
    

    
    // 方法2: 如果提供了任务对象，尝试通过itemTmdbId和itemTitle匹配
    if (task) {
      // 通过TMDB ID匹配
      if (task.itemTmdbId) {
        const tmdbIdMatch = items.find(item => item.tmdbId === task.itemTmdbId);
        if (tmdbIdMatch) {
          console.log(`[GlobalScheduledTasksDialog] 通过TMDB ID匹配到项目: ${tmdbIdMatch.title}`);
          return tmdbIdMatch;
        }
      }
      
      // 通过标题匹配
      if (task.itemTitle) {
        const titleMatch = items.find(item => 
          item.title === task.itemTitle ||
          (item.title.includes(task.itemTitle) && item.title.length - task.itemTitle.length < 10) ||
          (task.itemTitle.includes(item.title) && task.itemTitle.length - item.title.length < 10)
        );
        
        if (titleMatch) {
          console.log(`[GlobalScheduledTasksDialog] 通过标题匹配到项目: ${titleMatch.title}`);
          return titleMatch;
        }
      }
      
      // 通过任务名称匹配（去掉"定时任务"后缀）
      const taskNameWithoutSuffix = task.name.replace(/\s+定时任务$/, '');
      const nameMatch = items.find(item => 
        item.title === taskNameWithoutSuffix ||
        (item.title.includes(taskNameWithoutSuffix) && item.title.length - taskNameWithoutSuffix.length < 10) ||
        (taskNameWithoutSuffix.includes(item.title) && taskNameWithoutSuffix.length - item.title.length < 10)
      );
      
      if (nameMatch) {
        console.log(`[GlobalScheduledTasksDialog] 通过任务名称匹配到项目: ${nameMatch.title}`);
        return nameMatch;
      }
    }
    
    // 方法3: 如果ID是数字字符串或者长度不正确，可能是格式问题
    if (/^\d+$/.test(taskItemId) || taskItemId.length > 40) {
      console.log(`[GlobalScheduledTasksDialog] 检测到可能是格式问题的ID: ${taskItemId}`);
      
      // 按创建时间排序找最近的项目
      const sortedItems = [...items].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      if (sortedItems.length > 0) {
        console.log(`[GlobalScheduledTasksDialog] 使用最近创建的项目: ${sortedItems[0].title}`);
        return sortedItems[0];
      }
    }
    
    // 最终结果是未找到项目
    console.log(`[GlobalScheduledTasksDialog] 无法找到匹配的项目`);
    return undefined;
  }, [items]);

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
      
      // 4. 检查列删除选项匹配
      if (task.action.removeAirDateColumn || task.action.removeRuntimeColumn || task.action.removeBackdropColumn) {
        totalScore += 5;
        matchReasons.push("有列删除配置");
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
  const toggleTaskEnabled = useCallback(async (task: ScheduledTask) => {
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
  }, []);

  // 立即执行任务
  const runTaskNow = useCallback(async (task: ScheduledTask) => {
    try {
      if (isRunningTask) {
        toast({
          title: "任务执行中",
          description: "已有任务正在执行，请等待完成"
        });
        return;
      }
      
      // 检查是否有可用项目
      const hasItems = await StorageManager.hasAnyItems();
      if (!hasItems) {
        console.error("[GlobalScheduledTasksDialog] 系统中没有可用项目");

        // 获取详细的存储状态信息
        const storageStatus = await StorageManager.getStorageStatus();
        console.log("[GlobalScheduledTasksDialog] 存储状态:", storageStatus);

        toast({
          title: "无法执行任务",
          description: `系统中没有可用项目，请先添加至少一个项目后再试。存储类型: ${storageStatus.storageType}，项目数量: ${storageStatus.itemCount}`,
          variant: "destructive",
          duration: 8000
        });
        return;
      }
      
      // 检查项目列表是否为空（本地状态检查，作为备份）
      if (!items || items.length === 0) {
        console.error("[GlobalScheduledTasksDialog] 本地项目列表为空，尝试重新加载...");
        
        // 尝试重新加载项目列表
        setLoading(true);
        try {
          const allItems = await StorageManager.getItemsWithRetry();
          console.log(`[GlobalScheduledTasksDialog] 重新加载了 ${allItems.length} 个项目`);
          
          // 如果仍然为空，提示用户
          if (!allItems || allItems.length === 0) {
            toast({
              title: "无法执行任务",
              description: "系统中没有可用项目，请先添加至少一个项目后再试",
              variant: "destructive"
            });
            return;
          }
          
          // 更新项目列表
          setItems(allItems);
        } catch (loadError) {
          console.error("[GlobalScheduledTasksDialog] 重新加载项目失败:", loadError);
          toast({
            title: "无法执行任务",
            description: "系统中没有可用项目，请先添加至少一个项目后再试",
            variant: "destructive"
          });
          return;
        } finally {
          setLoading(false);
        }
      }
      
      setIsRunningTask(true);
      setRunningTaskId(task.id);
      
      toast({
        title: "开始执行任务",
        description: `正在执行任务: ${task.name}`
      });
      
      // 获取任务相关的项目
      const relatedItem = getTaskItem(task.itemId, task);
      
      if (!relatedItem) {
        // 尝试查找可能的匹配项目
        const possibleMatches = findPossibleMatches(task);
        
        if (possibleMatches.length > 0) {
          // 找到了可能匹配的项目，提示用户重新关联
          const bestMatch = possibleMatches[0];
          toast({
            title: "找不到关联项目",
            description: `无法找到任务对应的项目，可能需要重新关联到 "${bestMatch.item.title}"`,
            variant: "destructive",
            action: (
              <ToastAction altText="重新关联" onClick={() => {
                setTaskToRelink(task);
                setRelinkSuggestions(possibleMatches);
                setShowRelinkDialog(true);
              }}>
                重新关联
              </ToastAction>
            )
          });
          setIsRunningTask(false);
          setRunningTaskId(null);
          return;
        } else {
          toast({
            title: "执行失败",
            description: "找不到任务关联的项目，无法执行任务",
            variant: "destructive",
            icon: <AlarmClock className="h-4 w-4" />
          });
          setIsRunningTask(false);
          setRunningTaskId(null);
          return;
        }
      }
      
      // 检查项目平台URL
      if (!relatedItem.platformUrl) {
        toast({
          title: "执行失败",
          description: `项目 ${relatedItem.title} 没有设置平台URL，无法执行任务`,
          variant: "destructive",
          icon: <AlarmClock className="h-4 w-4" />
        });
        setIsRunningTask(false);
        setRunningTaskId(null);
        return;
      }
      
      console.log(`[GlobalScheduledTasksDialog] 执行定时任务: ${task.name}`);

      // 验证重要字段
      if (!relatedItem.id) {
        console.error("[GlobalScheduledTasksDialog] 错误: 项目缺少ID");
        throw new Error("项目ID无效");
      }

      if (!relatedItem.platformUrl) {
        console.error("[GlobalScheduledTasksDialog] 错误: 项目缺少平台URL");
        throw new Error("项目缺少平台URL");
      }

      // 使用调度器直接执行任务
      console.log(`[GlobalScheduledTasksDialog] 通过调度器执行任务: ${task.id}`);

      try {
        // 直接调用调度器的手动执行方法
        await taskScheduler.executeTaskManually(task);

        console.log(`[GlobalScheduledTasksDialog] 任务执行成功: ${task.name}`);

        // 轻量级刷新任务状态（调度器已经更新了任务状态）
        await refreshTasksOnly();

        // 显示成功消息
        const successMessage = `任务 "${task.name}" 执行完成`;

        toast({
          title: "任务执行成功",
          description: successMessage,
          duration: 5000,
          variant: 'success',
          icon: <AlarmClock className="h-4 w-4" />
        });
      } catch (executionError: any) {
        console.error("[GlobalScheduledTasksDialog] 调度器执行任务失败:", executionError);
        throw executionError; // 重新抛出以便外层catch处理
      }
    } catch (error: any) {
      console.error("[GlobalScheduledTasksDialog] 执行任务失败:", error);
      
      // 更新任务的失败状态
      try {
        // 查找最新的任务数据
        const tasksRefreshed = await StorageManager.getScheduledTasks();
        const taskToUpdate = tasksRefreshed.find(t => t.id === task.id);
        
        if (taskToUpdate) {
          const failedTask = {
            ...taskToUpdate,
            lastRun: new Date().toISOString(),
            lastRunStatus: "failed" as const,
            lastRunError: error.message || "未知错误",
            updatedAt: new Date().toISOString()
          };
          
          await StorageManager.updateScheduledTask(failedTask);
          
          // 轻量级刷新任务状态
          await refreshTasksOnly();
        }
      } catch (updateError) {
        console.error("[GlobalScheduledTasksDialog] 更新任务失败状态时出错:", updateError);
      }
      
      // 根据错误类型提供不同的提示
      if (error.message && error.message.includes("系统中没有可用项目")) {
        // 获取存储状态信息
        const storageStatus = await StorageManager.getStorageStatus();
        console.log("[GlobalScheduledTasksDialog] 任务执行失败时的存储状态:", storageStatus);

        toast({
          title: "无法执行任务",
          description: `系统中没有可用项目，请先添加至少一个项目后再试。当前存储: ${storageStatus.storageType}，项目数: ${storageStatus.itemCount}`,
          variant: "destructive",
          duration: 8000,
          icon: <AlarmClock className="h-4 w-4" />
        });
      } else if (error.message && (error.message.includes("找不到") && error.message.includes("项目"))) {
        toast({
          title: "项目关联问题",
          description: "任务关联的项目可能已被删除，请使用重新关联功能",
          variant: "destructive",
          icon: <AlarmClock className="h-4 w-4" />,
          action: (
            <ToastAction altText="重新关联" onClick={() => {
              setTaskToRelink(task);
              setShowRelinkDialog(true);
            }}>
              重新关联
            </ToastAction>
          )
        });
      } else {
        toast({
          title: "执行任务失败",
          description: error.message || "未知错误，请检查控制台获取详细信息",
          variant: "destructive"
        });
      }
    } finally {
      setIsRunningTask(false);
      setRunningTaskId(null);
    }
  }, [isRunningTask, refreshTasksOnly]);

  // 确认删除任务
  const confirmDeleteTask = useCallback((taskId: string) => {
    setTaskToDelete(taskId)
    setShowDeleteConfirm(true)
  }, []);

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
  const handleEditTask = useCallback((task: ScheduledTask) => {
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
  }, [getTaskItem]);

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
  const showTaskErrorDetails = useCallback((task: ScheduledTask) => {
    setSelectedErrorTask(task)
    setShowErrorDetails(true)
  }, []);
  
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
  const openRelinkDialog = useCallback((task: ScheduledTask, possibleMatches?: Array<{item: TMDBItem, score: number, matchType: string, matchDetails: string}>) => {
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
  }, []);
  
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
  const copyTask = useCallback((task: ScheduledTask) => {
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
  }, [getTaskItem]);

  // 切换选择模式
  const toggleSelectionMode = useCallback(() => {
    const newSelectionMode = !isSelectionMode
    setIsSelectionMode(newSelectionMode)

    // 退出选择模式时清空选中的任务
    if (!newSelectionMode) {
      setSelectedTasks(new Set())
    }
  }, [isSelectionMode])

  // 选择/取消选择任务
  const toggleTaskSelection = useCallback((taskId: string) => {
    const newSelectedTasks = new Set(selectedTasks)
    if (newSelectedTasks.has(taskId)) {
      newSelectedTasks.delete(taskId)
    } else {
      newSelectedTasks.add(taskId)
    }
    setSelectedTasks(newSelectedTasks)
  }, [selectedTasks]);
  
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

        // 操作完成后退出选择模式
        setIsSelectionMode(false)
        setSelectedTasks(new Set())
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

        // 操作完成后退出选择模式
        setIsSelectionMode(false)
        setSelectedTasks(new Set())
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
        
        // 清空选中状态并退出选择模式
        setSelectedTasks(new Set())
        setIsSelectionMode(false)

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
  const renderTaskList = useCallback(() => {
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
        {isSelectionMode && (
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
                disabled={isBatchProcessing || selectedTasks.size === 0}
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                启用
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={batchDisableTasks}
                disabled={isBatchProcessing || selectedTasks.size === 0}
              >
                <PauseCircle className="h-4 w-4 mr-1" />
                禁用
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBatchDeleteConfirm(true)}
                disabled={isBatchProcessing || selectedTasks.size === 0}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                删除
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectionMode}
                disabled={isBatchProcessing}
                className="ml-2"
              >
                <X className="h-4 w-4 mr-1" />
                退出选择
              </Button>
                </div>
                  </div>
        )}
        
        <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
          {filteredTasks.map(task => {
            // 获取关联的项目
            const relatedItem = getTaskItem(task.itemId)
            const hasError = task.lastRunStatus === "failed" && !!task.lastRunError
            const isRunning = isRunningTask && runningTaskId === task.id
            const isSuccess = task.lastRunStatus === "success"
            const isUserInterrupted = task.lastRunStatus === "user_interrupted"
            const isSelected = selectedTasks.has(task.id)
            
            return (
              <TaskCard
                key={task.id}
                task={task}
                relatedItem={relatedItem}
                hasError={!!hasError}
                isRunning={!!isRunning}
                isSuccess={!!isSuccess}
                isUserInterrupted={!!isUserInterrupted}
                isSelected={isSelected}
                isSelectionMode={isSelectionMode}
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
  }, [loading, filteredTasks, tasks, selectedTasks, isSelectionMode, isRunningTask, runningTaskId, getTaskItem, toggleTaskEnabled, confirmDeleteTask, runTaskNow, openRelinkDialog, handleEditTask, copyTask, showTaskErrorDetails, toggleTaskSelection]);

  // 任务卡片组件 - 使用memo优化
  const TaskCard = memo(({
    task,
    relatedItem,
    hasError,
    isRunning,
    isSuccess,
    isUserInterrupted,
    isSelected,
    isSelectionMode,
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
    isUserInterrupted: boolean;
    isSelected: boolean;
    isSelectionMode: boolean;
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
      } else if (isUserInterrupted) {
        return {
          color: "bg-orange-500 dark:bg-orange-600",
          textColor: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-50 dark:bg-orange-900/30",
          borderColor: "border-orange-300 dark:border-orange-800",
          icon: <PauseCircle className="h-4 w-4" />,
          label: "用户中断"
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
      <div
        className={`bg-card border border-border rounded-lg task-card-compact ${
          isSelected ? 'task-card-selected' : ''
        }`}
        onClick={(e) => {
          // 如果点击的是下拉菜单相关元素，不处理卡片点击
          const target = e.target as HTMLElement
          if (target.closest('[data-radix-dropdown-menu-trigger]') ||
              target.closest('[data-radix-dropdown-menu-content]')) {
            return
          }

          // 关闭所有下拉菜单
          closeAllDropdownMenus()

          // 阻止卡片点击事件冒泡，避免影响菜单
          e.stopPropagation();
        }}
      >
        {/* 状态指示器 */}
        <div className={`status-indicator ${
          hasError ? 'error' :
          isRunning ? 'running' :
          isUserInterrupted ? 'user-interrupted' :
          isSuccess ? 'success' :
          !task.enabled ? 'disabled' : ''
        }`}>
          {isRunning && <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-60" />}
        </div>

        {/* 主要内容区域 - 水平布局 */}
        <div className="task-info-horizontal pt-3">
          {/* 选择框和状态图标 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isSelectionMode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect();
                }}
              >
                {isSelected ? (
                  <CheckSquare className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )}
              </Button>
            )}

            <div className={`p-1.5 rounded-full ${
              task.enabled ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <AlarmClock className={`h-3.5 w-3.5 ${
                task.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
            </div>
          </div>

          {/* 任务信息 */}
          <div className="flex-1 min-w-0">
            <div className="task-title-horizontal group flex items-center">
              <span className="truncate">{task.name}</span>
              {hasError && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="h-3.5 w-3.5 ml-2 text-red-500 flex-shrink-0" />
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
                className="h-5 w-5 p-0 ml-2 opacity-0 group-hover:opacity-100 simple-hover-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(task);
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>

            {/* 关联项目信息 */}
            <div className="task-meta-horizontal mt-1">
              {relatedItem ? (
                <span className="flex items-center text-xs opacity-70">
                  <Link className="h-3 w-3 mr-1" />
                  {relatedItem.title}
                </span>
              ) : (
                <span className="flex items-center text-xs text-red-400">
                  <Link2Off className="h-3 w-3 mr-1" />
                  项目未找到
                </span>
              )}

              {/* 调度信息 */}
              <span className="flex items-center text-xs opacity-70">
                <Calendar className="h-3 w-3 mr-1" />
                {getScheduleDescription(task)}
              </span>
            </div>
          </div>

          {/* 状态和操作 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`px-2 py-1 rounded-md border bg-background text-xs ${
              task.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
            }`}>
              <span className="flex items-center gap-1">
                {statusInfo.icon}
                <span className="hidden sm:inline">{statusInfo.label}</span>
              </span>
            </div>

            <DropdownMenu
              open={openDropdownMenus.has(task.id)}
              onOpenChange={(open) => handleDropdownOpenChange(task.id, open)}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    // 阻止事件冒泡到父容器
                    e.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover border border-border w-48"
                sideOffset={5}
                style={{ zIndex: 9999 }}
                onCloseAutoFocus={(e) => {
                  // 防止自动聚焦导致的问题
                  e.preventDefault()
                }}
              >
                <DropdownMenuLabel>任务操作</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                    handleDropdownOpenChange(task.id, false);
                  }}
                  disabled={isRunning || !relatedItem}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  编辑任务
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(task);
                    handleDropdownOpenChange(task.id, false);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  复制任务
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleEnabled(task);
                    handleDropdownOpenChange(task.id, false);
                  }}
                  disabled={isRunning}
                >
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
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRun(task);
                    handleDropdownOpenChange(task.id, false);
                  }}
                  disabled={isRunning || !relatedItem}
                >
                  <Play className="h-4 w-4 mr-2" />
                  立即执行
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                    handleDropdownOpenChange(task.id, false);
                  }}
                  disabled={isRunning}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除任务
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* 错误信息显示 */}
        {hasError && (
          <div className="mt-3 p-2 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-lg text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="font-medium">执行失败</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2 py-0 text-red-400 hover:text-red-300"
                  onClick={() => onShowError(task)}
                >
                  详情
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2 py-0 text-red-400 hover:text-red-300"
                  onClick={() => onRelink(task)}
                >
                  重新关联
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 额外信息 - 仅在展开时显示 */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/10 text-xs opacity-70">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>下次: {formatNextRunTime(task)}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span>季: {task.action.seasonNumber}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {task.action.autoUpload && (
                  <span className="px-2 py-1 rounded-md border bg-background text-xs">自动上传</span>
                )}
                {task.action.autoRemoveMarked && (
                  <span className="px-2 py-1 rounded-md border bg-background text-xs">自动过滤</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  });

  // 清理无效任务
  const handleCleanInvalidTasks = async () => {
    try {
      setLoading(true);
      
      toast({
        title: "正在清理无效任务",
        description: "正在检查和清理无效任务..."
      });
      
      const result = await taskScheduler.cleanInvalidTasks();
      
      if (result.success) {
        toast({
          title: "清理完成",
          description: result.message
        });
        
        // 重新加载任务列表（清理后需要强制刷新）
        await loadTasksAndItems(true);
      } else {
        toast({
          title: "清理失败",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("清理无效任务失败:", error);
      toast({
        title: "清理失败",
        description: "操作过程中发生错误",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl bg-background border border-border" showCloseButton={false}>
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="flex items-center text-lg">
                <div className="p-2 rounded-full bg-blue-500/20 mr-3">
                  <AlarmClock className="h-5 w-5 text-blue-400" />
                </div>
                定时任务管理
                <Badge className="ml-3" variant="outline">
                  共 {tasks.length} 个任务
                </Badge>
              </DialogTitle>

              <div className="dialog-header-buttons">
                {runningTasks.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExecutionLogs(true)}
                    className=""
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    执行日志 ({runningTasks.length})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className=""
                >
                  关闭
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {/* 工具栏 */}
          <div className="glass-card rounded-lg p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索任务..."
                    className="pl-10 w-[220px] border border-input bg-background/40 backdrop-blur-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select value={statusFilter} onValueChange={(value: "all" | "enabled" | "disabled") => setStatusFilter(value)}>
                  <SelectTrigger className="w-[140px] border border-input bg-background/40 backdrop-blur-sm">
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent className="border border-input bg-popover/80 backdrop-blur-md">
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
                  onClick={toggleSelectionMode}
                  disabled={loading || isRunningTask}
                  title={isSelectionMode ? "退出选择模式" : "进入选择模式"}
                  className={isSelectionMode ? "bg-primary/20 border-primary/30" : ""}
                >
                  {isSelectionMode ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      退出选择
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      选择模式
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCleanInvalidTasks}
                  disabled={loading || isRunningTask}
                  title="清理无效任务"
                  className=""
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  清理无效
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSchedulerDebug(true)}
                  title="调度器诊断"
                  className=""
                >
                  <Settings className="h-4 w-4 mr-2" />
                  调度器诊断
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={loading}
                  title="刷新任务列表"
                  className=""
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
                    className="bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30 text-blue-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    添加任务
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className={`task-display-area glass-card rounded-lg p-4 ${isSelectionMode ? 'selection-mode' : ''}`}>
            <ScrollArea className="h-[500px] pr-4">
              {renderTaskList()}
            </ScrollArea>
          </div>
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
          onTaskSaved={(task: ScheduledTask, isAutoSave?: boolean) => {
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

            // 只有在非自动保存时才关闭对话框
            if (!isAutoSave) {
              setShowTaskDialog(false);
              // 清除复制的任务
              setTaskToCopy(null);
            }
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



      {/* 任务执行日志对话框 */}
      <TaskExecutionLogsDialog
        open={showExecutionLogs}
        onOpenChange={setShowExecutionLogs}
        runningTasks={runningTasks}
      />

      {/* 调度器调试对话框 */}
      <EnhancedSchedulerDebugDialog
        open={showSchedulerDebug}
        onOpenChange={setShowSchedulerDebug}
      />
    </>
  )
}