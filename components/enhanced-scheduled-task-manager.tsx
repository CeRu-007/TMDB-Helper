"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
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
    Loader2,
    Search,
    MoreHorizontal,
    Copy,
    Edit,
    History,
    BarChart3,
    Activity,
    TrendingUp,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    CheckSquare,
    Square,
    X,
    FileText
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { StorageManager, TMDBItem, ScheduledTask } from "@/lib/storage"
import { taskScheduler } from "@/lib/scheduler"
import { toast } from "@/components/ui/use-toast"
import EnhancedTaskFormDialog from "./enhanced-task-form-dialog"
import TaskTemplateManager from "./task-template-manager"
import TaskExecutionMonitor from "./task-execution-monitor"

// 任务统计接口
interface TaskStatistics {
    total: number
    enabled: number
    disabled: number
    running: number
    successful: number
    failed: number
    pending: number
    todayExecutions: number
    weeklyExecutions: number
    successRate: number
}

// 任务模板接口
interface TaskTemplate {
    id: string
    name: string
    description: string
    schedule: {
        type: 'daily' | 'weekly'
        dayOfWeek?: number
        secondDayOfWeek?: number
        hour: number
        minute: number
    }
    action: {
        seasonNumber: number
        autoUpload: boolean
        autoRemoveMarked: boolean
        autoConfirm: boolean
        removeIqiyiAirDate: boolean
        autoMarkUploaded: boolean
        conflictAction: 'w' | 'a' | 's'
        enableYoukuSpecialHandling: boolean
        enableTitleCleaning: boolean
        autoDeleteWhenCompleted: boolean
    }
    tags: string[]
    isDefault: boolean
    createdAt: string
    updatedAt: string
}

interface EnhancedScheduledTaskManagerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function EnhancedScheduledTaskManager({ open, onOpenChange }: EnhancedScheduledTaskManagerProps) {
    // 基础状态
    const [tasks, setTasks] = useState<ScheduledTask[]>([])
    const [items, setItems] = useState<TMDBItem[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("tasks")

    // 搜索和过滤状态
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled" | "running" | "failed">("all")
    const [sortBy, setSortBy] = useState<"name" | "created" | "lastRun" | "nextRun" | "status">("name")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

    // 批量操作状态
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
    const [isSelectionMode, setIsSelectionMode] = useState(false)

    // 对话框状态
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
    const [showTaskForm, setShowTaskForm] = useState(false)
    const [showTemplateManager, setShowTemplateManager] = useState(false)
    const [showExecutionMonitor, setShowExecutionMonitor] = useState(false)

    // 任务操作状态
    const [isRunningTask, setIsRunningTask] = useState(false)
    const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
    const [currentTask, setCurrentTask] = useState<ScheduledTask | null>(null)
    const [isEditingTask, setIsEditingTask] = useState(false)

    // 统计状态
    const [statistics, setStatistics] = useState<TaskStatistics | null>(null)

    // 视图状态
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

    // 加载数据
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [allTasks, allItems] = await Promise.all([
                StorageManager.getScheduledTasks(),
                StorageManager.getItemsWithRetry()
            ])

            setTasks(allTasks)
            setItems(allItems)

            // 计算统计信息
            calculateStatistics(allTasks)

        } catch (error) {
            console.error("加载数据失败:", error)
            toast({
                title: "加载失败",
                description: "无法加载定时任务数据",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [])

    // 计算统计信息
    const calculateStatistics = (taskList: ScheduledTask[]) => {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

        const stats: TaskStatistics = {
            total: taskList.length,
            enabled: taskList.filter(t => t.enabled).length,
            disabled: taskList.filter(t => !t.enabled).length,
            running: taskList.filter(t => taskScheduler.isTaskRunning(t.id)).length,
            successful: taskList.filter(t => t.lastRunStatus === 'success').length,
            failed: taskList.filter(t => t.lastRunStatus === 'failed').length,
            pending: taskList.filter(t => !t.lastRun).length,
            todayExecutions: taskList.filter(t =>
                t.lastRun && new Date(t.lastRun) >= today
            ).length,
            weeklyExecutions: taskList.filter(t =>
                t.lastRun && new Date(t.lastRun) >= weekAgo
            ).length,
            successRate: taskList.length > 0 ?
                (taskList.filter(t => t.lastRunStatus === 'success').length / taskList.length) * 100 : 0
        }

        setStatistics(stats)
    }

    // 过滤和排序任务
    const filteredAndSortedTasks = useMemo(() => {
        let filtered = [...tasks]

        // 搜索过滤
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(task => {
                const relatedItem = items.find(item => item.id === task.itemId)
                return (
                    task.name.toLowerCase().includes(term) ||
                    relatedItem?.title.toLowerCase().includes(term) ||
                    task.itemTitle?.toLowerCase().includes(term)
                )
            })
        }

        // 状态过滤
        if (statusFilter !== "all") {
            filtered = filtered.filter(task => {
                switch (statusFilter) {
                    case "enabled":
                        return task.enabled
                    case "disabled":
                        return !task.enabled
                    case "running":
                        return taskScheduler.isTaskRunning(task.id)
                    case "failed":
                        return task.lastRunStatus === 'failed'
                    default:
                        return true
                }
            })
        }

        // 排序
        filtered.sort((a, b) => {
            let aValue: any, bValue: any

            switch (sortBy) {
                case "name":
                    aValue = a.name.toLowerCase()
                    bValue = b.name.toLowerCase()
                    break
                case "created":
                    aValue = new Date(a.createdAt).getTime()
                    bValue = new Date(b.createdAt).getTime()
                    break
                case "lastRun":
                    aValue = a.lastRun ? new Date(a.lastRun).getTime() : 0
                    bValue = b.lastRun ? new Date(b.lastRun).getTime() : 0
                    break
                case "nextRun":
                    aValue = a.nextRun ? new Date(a.nextRun).getTime() : 0
                    bValue = b.nextRun ? new Date(b.nextRun).getTime() : 0
                    break
                case "status":
                    aValue = a.enabled ? 1 : 0
                    bValue = b.enabled ? 1 : 0
                    break
                default:
                    return 0
            }

            if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
            if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
            return 0
        })

        return filtered
    }, [tasks, items, searchTerm, statusFilter, sortBy, sortOrder])

    // 初始化
    useEffect(() => {
        if (open) {
            loadData()
        }
    }, [open, loadData])

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
                setTasks(prev =>
                    prev.map(t => t.id === task.id ? updatedTask : t)
                )

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

                // 重新计算统计信息
                calculateStatistics(tasks.map(t => t.id === task.id ? updatedTask : t))
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
        if (isRunningTask) {
            toast({
                title: "任务执行中",
                description: "已有任务正在执行，请等待完成"
            })
            return
        }

        setIsRunningTask(true)
        setRunningTaskId(task.id)

        try {
            await taskScheduler.executeTaskManually(task)

            toast({
                title: "任务执行成功",
                description: `任务 "${task.name}" 执行完成`,
            })

            // 重新加载数据
            await loadData()
        } catch (error: any) {
            console.error("执行任务失败:", error)
            toast({
                title: "执行任务失败",
                description: error.message || "未知错误",
                variant: "destructive"
            })
        } finally {
            setIsRunningTask(false)
            setRunningTaskId(null)
        }
    }

    // 删除任务
    const handleDeleteTask = async () => {
        if (!taskToDelete) return

        try {
            const success = await StorageManager.deleteScheduledTask(taskToDelete)
            if (success) {
                setTasks(prev => prev.filter(task => task.id !== taskToDelete))

                toast({
                    title: "删除成功",
                    description: "定时任务已删除",
                })

                // 重新计算统计信息
                const updatedTasks = tasks.filter(task => task.id !== taskToDelete)
                calculateStatistics(updatedTasks)
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

    // 批量删除任务
    const handleBatchDelete = async () => {
        try {
            const deletePromises = Array.from(selectedTasks).map(taskId =>
                StorageManager.deleteScheduledTask(taskId)
            )

            await Promise.all(deletePromises)

            setTasks(prev => prev.filter(task => !selectedTasks.has(task.id)))
            setSelectedTasks(new Set())
            setIsSelectionMode(false)

            toast({
                title: "批量删除成功",
                description: `已删除 ${selectedTasks.size} 个任务`,
            })

            // 重新计算统计信息
            const updatedTasks = tasks.filter(task => !selectedTasks.has(task.id))
            calculateStatistics(updatedTasks)
        } catch (error) {
            console.error("批量删除失败:", error)
            toast({
                title: "批量删除失败",
                description: "部分任务删除失败",
                variant: "destructive"
            })
        } finally {
            setShowBatchDeleteConfirm(false)
        }
    }

    // 批量启用/禁用任务
    const handleBatchToggleEnabled = async (enabled: boolean) => {
        try {
            const updatePromises = Array.from(selectedTasks).map(async taskId => {
                const task = tasks.find(t => t.id === taskId)
                if (task) {
                    const updatedTask = {
                        ...task,
                        enabled,
                        updatedAt: new Date().toISOString()
                    }
                    await StorageManager.updateScheduledTask(updatedTask)
                    return updatedTask
                }
                return null
            })

            const updatedTasks = await Promise.all(updatePromises)

            setTasks(prev =>
                prev.map(task => {
                    const updated = updatedTasks.find(ut => ut?.id === task.id)
                    return updated || task
                })
            )

            setSelectedTasks(new Set())
            setIsSelectionMode(false)

            toast({
                title: enabled ? "批量启用成功" : "批量禁用成功",
                description: `已${enabled ? '启用' : '禁用'} ${selectedTasks.size} 个任务`,
            })

            // 重新计算统计信息
            calculateStatistics(tasks.map(task => {
                const updated = updatedTasks.find(ut => ut?.id === task.id)
                return updated || task
            }))
        } catch (error) {
            console.error("批量操作失败:", error)
            toast({
                title: "批量操作失败",
                description: "部分任务操作失败",
                variant: "destructive"
            })
        }
    }

    // 格式化时间
    const formatTime = (timeStr?: string) => {
        if (!timeStr) return "未设置"
        try {
            return new Date(timeStr).toLocaleString()
        } catch (error) {
            return "时间格式错误"
        }
    }

    // 获取任务状态信息
    const getTaskStatusInfo = (task: ScheduledTask) => {
        if (taskScheduler.isTaskRunning(task.id)) {
            return {
                status: "running",
                label: "执行中",
                color: "bg-blue-500",
                icon: <Loader2 className="h-3 w-3 animate-spin" />
            }
        } else if (!task.enabled) {
            return {
                status: "disabled",
                label: "已禁用",
                color: "bg-gray-500",
                icon: <PauseCircle className="h-3 w-3" />
            }
        } else if (task.lastRunStatus === 'success') {
            return {
                status: "success",
                label: "成功",
                color: "bg-green-500",
                icon: <CheckCircle2 className="h-3 w-3" />
            }
        } else if (task.lastRunStatus === 'failed') {
            return {
                status: "failed",
                label: "失败",
                color: "bg-red-500",
                icon: <XCircle className="h-3 w-3" />
            }
        } else {
            return {
                status: "pending",
                label: "等待中",
                color: "bg-yellow-500",
                icon: <Clock className="h-3 w-3" />
            }
        }
    }

    // 渲染任务卡片
    const renderTaskCard = (task: ScheduledTask) => {
        const relatedItem = items.find(item => item.id === task.itemId)
        const statusInfo = getTaskStatusInfo(task)
        const isSelected = selectedTasks.has(task.id)
        const isExpanded = expandedTasks.has(task.id)

        return (
            <Card key={task.id} className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                            {isSelectionMode && (
                                <div className="pt-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => {
                                            const newSelected = new Set(selectedTasks)
                                            if (isSelected) {
                                                newSelected.delete(task.id)
                                            } else {
                                                newSelected.add(task.id)
                                            }
                                            setSelectedTasks(newSelected)
                                        }}
                                    >
                                        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                    </Button>
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                    <AlarmClock className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-sm font-medium truncate">{task.name}</CardTitle>
                                    <Badge variant="secondary" className={`${statusInfo.color} text-white text-xs`}>
                                        <span className="flex items-center space-x-1">
                                            {statusInfo.icon}
                                            <span>{statusInfo.label}</span>
                                        </span>
                                    </Badge>
                                </div>

                                <CardDescription className="text-xs">
                                    {relatedItem ? (
                                        <span className="flex items-center space-x-1">
                                            <span>{relatedItem.title}</span>
                                            <span>•</span>
                                            <span>第{task.action.seasonNumber}季</span>
                                        </span>
                                    ) : (
                                        <span className="text-red-500">项目不存在</span>
                                    )}
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex items-center space-x-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                                const newExpanded = new Set(expandedTasks)
                                                if (isExpanded) {
                                                    newExpanded.delete(task.id)
                                                } else {
                                                    newExpanded.add(task.id)
                                                }
                                                setExpandedTasks(newExpanded)
                                            }}
                                        >
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {isExpanded ? '收起详情' : '展开详情'}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => runTaskNow(task)} disabled={isRunningTask}>
                                        <Play className="h-4 w-4 mr-2" />
                                        立即执行
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        setCurrentTask(task)
                                        setIsEditingTask(true)
                                        setShowTaskForm(true)
                                    }}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        const newTask = {
                                            ...task,
                                            id: uuidv4(),
                                            name: `${task.name} (副本)`,
                                            enabled: false,
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString(),
                                            lastRun: undefined,
                                            lastRunStatus: undefined,
                                            lastRunError: undefined,
                                            nextRun: undefined
                                        }
                                        setCurrentTask(newTask)
                                        setIsEditingTask(false)
                                        setShowTaskForm(true)
                                    }}>
                                        <Copy className="h-4 w-4 mr-2" />
                                        复制
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toggleTaskEnabled(task)}>
                                        {task.enabled ? (
                                            <>
                                                <PauseCircle className="h-4 w-4 mr-2" />
                                                禁用
                                            </>
                                        ) : (
                                            <>
                                                <PlayCircle className="h-4 w-4 mr-2" />
                                                启用
                                            </>
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setTaskToDelete(task.id)
                                            setShowDeleteConfirm(true)
                                        }}
                                        className="text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        删除
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                {isExpanded && (
                    <CardContent className="pt-0">
                        <div className="space-y-3">
                            {/* 调度信息 */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-xs text-muted-foreground">执行频率</Label>
                                    <div className="flex items-center space-x-1 mt-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                            {task.schedule.type === 'daily' ? '每天' : '每周'}
                                            {task.schedule.type === 'weekly' && (
                                                <span>
                                                    {['一', '二', '三', '四', '五', '六', '日'][task.schedule.dayOfWeek || 0]}
                                                    {task.schedule.secondDayOfWeek !== undefined &&
                                                        `、${['一', '二', '三', '四', '五', '六', '日'][task.schedule.secondDayOfWeek]}`
                                                    }
                                                </span>
                                            )}
                                            {` ${task.schedule.hour.toString().padStart(2, '0')}:${task.schedule.minute.toString().padStart(2, '0')}`}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs text-muted-foreground">下次执行</Label>
                                    <div className="flex items-center space-x-1 mt-1">
                                        <Clock className="h-3 w-3" />
                                        <span className="text-xs">{formatTime(task.nextRun)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 执行历史 */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-xs text-muted-foreground">上次执行</Label>
                                    <div className="flex items-center space-x-1 mt-1">
                                        <History className="h-3 w-3" />
                                        <span className="text-xs">{formatTime(task.lastRun)}</span>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs text-muted-foreground">执行状态</Label>
                                    <div className="flex items-center space-x-1 mt-1">
                                        {statusInfo.icon}
                                        <span className="text-xs">{statusInfo.label}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 错误信息 */}
                            {task.lastRunError && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">错误信息</Label>
                                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                        {task.lastRunError}
                                    </div>
                                </div>
                            )}

                            {/* 操作配置 */}
                            <div>
                                <Label className="text-xs text-muted-foreground">操作配置</Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {task.action.autoUpload && <Badge variant="outline" className="text-xs">自动上传</Badge>}
                                    {task.action.autoRemoveMarked && <Badge variant="outline" className="text-xs">自动过滤</Badge>}
                                    {task.action.autoConfirm && <Badge variant="outline" className="text-xs">自动确认</Badge>}
                                    {task.action.autoMarkUploaded && <Badge variant="outline" className="text-xs">自动标记</Badge>}
                                    {task.action.enableYoukuSpecialHandling && <Badge variant="outline" className="text-xs">优酷处理</Badge>}
                                    {task.action.enableTitleCleaning && <Badge variant="outline" className="text-xs">标题清理</Badge>}
                                    {task.action.autoDeleteWhenCompleted && <Badge variant="outline" className="text-xs">完结删除</Badge>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Settings className="h-5 w-5" />
                            <span>增强定时任务管理</span>
                            {statistics && (
                                <Badge variant="outline">
                                    {statistics.total} 个任务
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            {isSelectionMode && (
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedTasks(new Set())
                                            setIsSelectionMode(false)
                                        }}
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        取消选择
                                    </Button>

                                    {selectedTasks.size > 0 && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    批量操作 ({selectedTasks.size})
                                                    <ChevronDown className="h-4 w-4 ml-1" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleBatchToggleEnabled(true)}>
                                                    <PlayCircle className="h-4 w-4 mr-2" />
                                                    批量启用
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleBatchToggleEnabled(false)}>
                                                    <PauseCircle className="h-4 w-4 mr-2" />
                                                    批量禁用
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => setShowBatchDeleteConfirm(true)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    批量删除
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsSelectionMode(!isSelectionMode)}
                            >
                                <CheckSquare className="h-4 w-4 mr-1" />
                                {isSelectionMode ? '退出选择' : '批量选择'}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadData}
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                                刷新
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col min-h-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="tasks" className="flex items-center space-x-2">
                                <AlarmClock className="h-4 w-4" />
                                <span>任务管理</span>
                            </TabsTrigger>
                            <TabsTrigger value="statistics" className="flex items-center space-x-2">
                                <BarChart3 className="h-4 w-4" />
                                <span>统计分析</span>
                            </TabsTrigger>
                            <TabsTrigger value="history" className="flex items-center space-x-2">
                                <History className="h-4 w-4" />
                                <span>执行历史</span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="tasks" className="flex-1 flex flex-col space-y-4">
                            {/* 搜索和过滤栏 */}
                            <div className="flex items-center space-x-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="搜索任务名称或项目..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="状态筛选" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">全部</SelectItem>
                                        <SelectItem value="enabled">已启用</SelectItem>
                                        <SelectItem value="disabled">已禁用</SelectItem>
                                        <SelectItem value="running">执行中</SelectItem>
                                        <SelectItem value="failed">失败</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="排序方式" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="name">名称</SelectItem>
                                        <SelectItem value="created">创建时间</SelectItem>
                                        <SelectItem value="lastRun">上次执行</SelectItem>
                                        <SelectItem value="nextRun">下次执行</SelectItem>
                                        <SelectItem value="status">状态</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                >
                                    {sortOrder === "asc" ? "升序" : "降序"}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowTemplateManager(true)}
                                >
                                    <FileText className="h-4 w-4 mr-1" />
                                    模板
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowExecutionMonitor(true)}
                                >
                                    <Activity className="h-4 w-4 mr-1" />
                                    监控
                                </Button>

                                <Button
                                    onClick={() => {
                                        setCurrentTask(null)
                                        setIsEditingTask(false)
                                        setShowTaskForm(true)
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    新建任务
                                </Button>
                            </div>

                            {/* 任务列表 */}
                            <div className="flex-1 min-h-0">
                                {loading ? (
                                    <div className="flex items-center justify-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                        <span className="ml-2">加载中...</span>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-full">
                                        <div className="space-y-4 pr-4">
                                            {filteredAndSortedTasks.length > 0 ? (
                                                filteredAndSortedTasks.map(renderTaskCard)
                                            ) : (
                                                <div className="text-center py-12">
                                                    <AlarmClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                                    <h3 className="text-lg font-medium mb-2">暂无任务</h3>
                                                    <p className="text-muted-foreground mb-4">
                                                        {searchTerm || statusFilter !== "all"
                                                            ? "没有找到符合条件的任务"
                                                            : "还没有创建任何定时任务"
                                                        }
                                                    </p>
                                                    <Button
                                                        onClick={() => {
                                                            setCurrentTask(null)
                                                            setIsEditingTask(false)
                                                            setShowTaskForm(true)
                                                        }}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        创建第一个任务
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="statistics" className="flex-1">
                            {statistics && (
                                <div className="space-y-6">
                                    {/* 统计卡片 */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">总任务数</p>
                                                        <p className="text-2xl font-bold">{statistics.total}</p>
                                                    </div>
                                                    <AlarmClock className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">已启用</p>
                                                        <p className="text-2xl font-bold text-green-600">{statistics.enabled}</p>
                                                    </div>
                                                    <PlayCircle className="h-8 w-8 text-green-600" />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">执行中</p>
                                                        <p className="text-2xl font-bold text-blue-600">{statistics.running}</p>
                                                    </div>
                                                    <Activity className="h-8 w-8 text-blue-600" />
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
                                    </div>

                                    {/* 成功率进度条 */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">任务执行统计</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex justify-between text-sm mb-2">
                                                        <span>成功任务</span>
                                                        <span>{statistics.successful}/{statistics.total}</span>
                                                    </div>
                                                    <Progress
                                                        value={statistics.total > 0 ? (statistics.successful / statistics.total) * 100 : 0}
                                                        className="h-2"
                                                    />
                                                </div>

                                                <div>
                                                    <div className="flex justify-between text-sm mb-2">
                                                        <span>失败任务</span>
                                                        <span>{statistics.failed}/{statistics.total}</span>
                                                    </div>
                                                    <Progress
                                                        value={statistics.total > 0 ? (statistics.failed / statistics.total) * 100 : 0}
                                                        className="h-2"
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="history" className="flex-1">
                            <div className="text-center py-12">
                                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium mb-2">执行历史</h3>
                                <p className="text-muted-foreground mb-4">查看任务的详细执行历史记录</p>
                                <Button onClick={() => setShowExecutionMonitor(true)}>
                                    <Activity className="h-4 w-4 mr-2" />
                                    打开执行监控
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

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
                            <AlertDialogAction onClick={handleBatchDelete}>删除</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>

            {/* 任务表单对话框 */}
            <EnhancedTaskFormDialog
                open={showTaskForm}
                onOpenChange={setShowTaskForm}
                task={currentTask}
                isEditing={isEditingTask}
                onTaskSaved={(task) => {
                    // 更新任务列表
                    if (isEditingTask) {
                        setTasks(prev => prev.map(t => t.id === task.id ? task : t))
                    } else {
                        setTasks(prev => [...prev, task])
                    }
                    // 重新计算统计信息
                    calculateStatistics(isEditingTask
                        ? tasks.map(t => t.id === task.id ? task : t)
                        : [...tasks, task]
                    )
                }}
            />

            {/* 模板管理对话框 */}
            <TaskTemplateManager
                open={showTemplateManager}
                onOpenChange={setShowTemplateManager}
                onTemplateSelect={(template) => {
                    // 使用模板创建新任务
                    const newTask: Partial<ScheduledTask> = {
                        id: uuidv4(),
                        name: `${template.name} 任务`,
                        type: 'tmdb-import',
                        schedule: { ...template.schedule },
                        action: { ...template.action },
                        enabled: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }

                    setCurrentTask(newTask as ScheduledTask)
                    setIsEditingTask(false)
                    setShowTaskForm(true)
                }}
            />

            {/* 执行监控对话框 */}
            <TaskExecutionMonitor
                open={showExecutionMonitor}
                onOpenChange={setShowExecutionMonitor}
            />
        </Dialog>
    )
}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索任务名称或项目..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="enabled">已启用</SelectItem>
                    <SelectItem value="disabled">已禁用</SelectItem>
                    <SelectItem value="running">执行中</SelectItem>
                    <SelectItem value="failed">失败</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="排序方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">名称</SelectItem>
                    <SelectItem value="created">创建时间</SelectItem>
                    <SelectItem value="lastRun">上次执行</SelectItem>
                    <SelectItem value="nextRun">下次执行</SelectItem>
                    <SelectItem value="status">状态</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  {sortOrder === "asc" ? "升序" : "降序"}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateManager(true)}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  模板
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExecutionMonitor(true)}
                >
                  <Activity className="h-4 w-4 mr-1" />
                  监控
                </Button>
                
                <Button
                  onClick={() => {
                    setCurrentTask(null)
                    setIsEditingTask(false)
                    setShowTaskForm(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新建任务
                </Button>
              </div >

    {/* 任务列表 */ }
    < div className = "flex-1 min-h-0" >
    {
        loading?(
                  <div className = "flex items-center justify-center h-64" >
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">加载中...</span>
                  </div>
                ) : (
    <ScrollArea className="h-full">
        <div className="space-y-4 pr-4">
            {filteredAndSortedTasks.length > 0 ? (
                filteredAndSortedTasks.map(renderTaskCard)
            ) : (
                <div className="text-center py-12">
                    <AlarmClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">暂无任务</h3>
                    <p className="text-muted-foreground mb-4">
                        {searchTerm || statusFilter !== "all"
                            ? "没有找到符合条件的任务"
                            : "还没有创建任何定时任务"
                        }
                    </p>
                </div>
            )}
        </div>
    </ScrollArea>
)}
              </div >
            </TabsContent >

            <TabsContent value="statistics" className="flex-1">
              {statistics && (
                <div className="space-y-6">
                  {/* 统计卡片 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">总任务数</p>
                            <p className="text-2xl font-bold">{statistics.total}</p>
                          </div>
                          <AlarmClock className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">已启用</p>
                            <p className="text-2xl font-bold text-green-600">{statistics.enabled}</p>
                          </div>
                          <PlayCircle className="h-8 w-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">执行中</p>
                            <p className="text-2xl font-bold text-blue-600">{statistics.running}</p>
                          </div>
                          <Activity className="h-8 w-8 text-blue-600" />
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
                  </div>
                  
                  {/* 成功率进度条 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">任务执行统计</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>成功任务</span>
                            <span>{statistics.successful}/{statistics.total}</span>
                          </div>
                          <Progress 
                            value={statistics.total > 0 ? (statistics.successful / statistics.total) * 100 : 0} 
                            className="h-2"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>失败任务</span>
                            <span>{statistics.failed}/{statistics.total}</span>
                          </div>
                          <Progress 
                            value={statistics.total > 0 ? (statistics.failed / statistics.total) * 100 : 0} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="flex-1">
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">执行历史</h3>
                <p className="text-muted-foreground">功能开发中...</p>
              </div>
            </TabsContent>
          </Tabs >
        </div >

    {/* 删除确认对话框 */ }
    < AlertDialog open = { showDeleteConfirm } onOpenChange = { setShowDeleteConfirm } >
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
        </AlertDialog >

    {/* 批量删除确认对话框 */ }
    < AlertDialog open = { showBatchDeleteConfirm } onOpenChange = { setShowBatchDeleteConfirm } >
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>确认批量删除</AlertDialogTitle>
                <AlertDialogDescription>
                    确定要删除选中的 {selectedTasks.size} 个定时任务吗？此操作无法撤销。
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleBatchDelete}>删除</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog >
      </DialogContent >
    </Dialog >
  )
}