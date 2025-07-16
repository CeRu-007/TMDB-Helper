"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Clock,
  Calendar,
  Settings,
  Info,
  AlertTriangle,
  CheckCircle2,
  Save,
  X,
  Copy,
  FileText,
  Zap,
  Target,
  Upload,
  Filter,
  Trash2,
  RefreshCw,
  PlayCircle,
  PauseCircle
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { StorageManager, TMDBItem, ScheduledTask } from "@/lib/storage"
import { toast } from "@/components/ui/use-toast"

interface EnhancedTaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: ScheduledTask | null
  item?: TMDBItem | null
  isEditing?: boolean
  onTaskSaved?: (task: ScheduledTask) => void
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
}

export default function EnhancedTaskFormDialog({
  open,
  onOpenChange,
  task,
  item,
  isEditing = false,
  onTaskSaved
}: EnhancedTaskFormDialogProps) {
  // 表单状态
  const [formData, setFormData] = useState<Partial<ScheduledTask>>({})
  const [items, setItems] = useState<TMDBItem[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [activeTab, setActiveTab] = useState("basic")
  
  // UI状态
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // 初始化表单数据
  useEffect(() => {
    if (open) {
      if (task) {
        setFormData({ ...task })
      } else if (item) {
        // 从项目创建新任务
        setFormData({
          id: uuidv4(),
          itemId: item.id,
          itemTitle: item.title,
          itemTmdbId: item.tmdbId,
          name: `${item.title} 定时任务`,
          type: 'tmdb-import',
          schedule: {
            type: 'weekly',
            dayOfWeek: 0,
            hour: 9,
            minute: 0
          },
          action: {
            seasonNumber: item.seasons && item.seasons.length > 0 
              ? Math.max(...item.seasons.map(s => s.seasonNumber))
              : 1,
            autoUpload: true,
            autoRemoveMarked: true,
            autoConfirm: true,
            removeIqiyiAirDate: item.platformUrl?.includes('iqiyi.com') || false,
            autoMarkUploaded: true,
            conflictAction: 'w',
            enableYoukuSpecialHandling: true,
            enableTitleCleaning: true,
            autoDeleteWhenCompleted: true
          },
          enabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      } else {
        // 创建空任务
        setFormData({
          id: uuidv4(),
          name: '',
          type: 'tmdb-import',
          schedule: {
            type: 'weekly',
            dayOfWeek: 0,
            hour: 9,
            minute: 0
          },
          action: {
            seasonNumber: 1,
            autoUpload: true,
            autoRemoveMarked: true,
            autoConfirm: true,
            removeIqiyiAirDate: false,
            autoMarkUploaded: true,
            conflictAction: 'w',
            enableYoukuSpecialHandling: true,
            enableTitleCleaning: true,
            autoDeleteWhenCompleted: true
          },
          enabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
      
      loadData()
      setHasUnsavedChanges(false)
      setValidationErrors({})
    }
  }, [open, task, item])

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const [allItems, savedTemplates] = await Promise.all([
        StorageManager.getItemsWithRetry(),
        loadTemplates()
      ])
      
      setItems(allItems)
      setTemplates(savedTemplates)
    } catch (error) {
      console.error("加载数据失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载项目或模板数据",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 加载模板
  const loadTemplates = async (): Promise<TaskTemplate[]> => {
    try {
      const saved = localStorage.getItem('tmdb_task_templates')
      if (saved) {
        return JSON.parse(saved)
      }
      return []
    } catch (error) {
      console.error("加载模板失败:", error)
      return []
    }
  }

  // 更新表单字段
  const updateField = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev }
      const keys = path.split('.')
      let current: any = newData
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newData
    })
    
    setHasUnsavedChanges(true)
    
    // 清除相关验证错误
    if (validationErrors[path]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[path]
        return newErrors
      })
    }
  }

  // 应用模板
  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return
    
    setFormData(prev => ({
      ...prev,
      schedule: { ...template.schedule },
      action: { ...template.action }
    }))
    
    setHasUnsavedChanges(true)
    toast({
      title: "模板已应用",
      description: `已应用模板: ${template.name}`,
    })
  }

  // 验证表单
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.name?.trim()) {
      errors.name = "任务名称不能为空"
    }
    
    if (!formData.itemId) {
      errors.itemId = "请选择关联项目"
    }
    
    if (!formData.schedule?.hour && formData.schedule?.hour !== 0) {
      errors['schedule.hour'] = "请设置执行小时"
    }
    
    if (!formData.schedule?.minute && formData.schedule?.minute !== 0) {
      errors['schedule.minute'] = "请设置执行分钟"
    }
    
    if (formData.schedule?.type === 'weekly' && formData.schedule?.dayOfWeek === undefined) {
      errors['schedule.dayOfWeek'] = "请选择执行日期"
    }
    
    if (!formData.action?.seasonNumber || formData.action.seasonNumber < 1) {
      errors['action.seasonNumber'] = "季数必须大于0"
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 保存任务
  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: "表单验证失败",
        description: "请检查并修正表单中的错误",
        variant: "destructive"
      })
      return
    }
    
    setSaving(true)
    try {
      const taskData = {
        ...formData,
        updatedAt: new Date().toISOString()
      } as ScheduledTask
      
      let success = false
      if (isEditing && task) {
        success = await StorageManager.updateScheduledTask(taskData)
      } else {
        success = await StorageManager.addScheduledTask(taskData)
      }
      
      if (success) {
        toast({
          title: isEditing ? "更新成功" : "创建成功",
          description: `定时任务已${isEditing ? '更新' : '创建'}`,
        })
        
        if (onTaskSaved) {
          onTaskSaved(taskData)
        }
        
        onOpenChange(false)
      } else {
        throw new Error("保存失败")
      }
    } catch (error) {
      console.error("保存任务失败:", error)
      toast({
        title: "保存失败",
        description: "无法保存定时任务",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // 获取星期几名称
  const getDayName = (day: number) => {
    const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    return days[day] || "未知"
  }

  // 获取冲突处理名称
  const getConflictActionName = (action: string) => {
    const actions = {
      'w': '覆盖写入',
      'a': '追加写入',
      's': '跳过写入'
    }
    return actions[action as keyof typeof actions] || '未知'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>{isEditing ? '编辑定时任务' : '创建定时任务'}</span>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-orange-600">
                未保存
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">基础设置</TabsTrigger>
              <TabsTrigger value="schedule">调度设置</TabsTrigger>
              <TabsTrigger value="actions">操作配置</TabsTrigger>
              <TabsTrigger value="advanced">高级选项</TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 overflow-hidden">
              <TabsContent value="basic" className="h-full space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* 基础信息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">基础信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="name">任务名称 *</Label>
                        <Input
                          id="name"
                          value={formData.name || ''}
                          onChange={(e) => updateField('name', e.target.value)}
                          placeholder="输入任务名称"
                          className={validationErrors.name ? 'border-red-500' : ''}
                        />
                        {validationErrors.name && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="itemId">关联项目 *</Label>
                        <Select
                          value={formData.itemId || ''}
                          onValueChange={(value) => {
                            const selectedItem = items.find(i => i.id === value)
                            if (selectedItem) {
                              updateField('itemId', value)
                              updateField('itemTitle', selectedItem.title)
                              updateField('itemTmdbId', selectedItem.tmdbId)
                              
                              // 自动设置季数
                              if (selectedItem.seasons && selectedItem.seasons.length > 0) {
                                const maxSeason = Math.max(...selectedItem.seasons.map(s => s.seasonNumber))
                                updateField('action.seasonNumber', maxSeason)
                              }
                              
                              // 自动设置爱奇艺特殊处理
                              if (selectedItem.platformUrl?.includes('iqiyi.com')) {
                                updateField('action.removeIqiyiAirDate', true)
                              } else {
                                updateField('action.removeIqiyiAirDate', false)
                              }
                            }
                          }}
                        >
                          <SelectTrigger className={validationErrors.itemId ? 'border-red-500' : ''}>
                            <SelectValue placeholder="选择项目" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                <div className="flex items-center space-x-2">
                                  <span>{item.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {item.mediaType === 'tv' ? '剧集' : '电影'}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {validationErrors.itemId && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.itemId}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enabled"
                          checked={formData.enabled || false}
                          onCheckedChange={(checked) => updateField('enabled', checked)}
                        />
                        <Label htmlFor="enabled">启用任务</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>启用后任务将按计划自动执行</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 模板选择 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">快速配置</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>选择模板</Label>
                        <Select
                          value={selectedTemplate}
                          onValueChange={(value) => {
                            setSelectedTemplate(value)
                            if (value) {
                              applyTemplate(value)
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择预设模板" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                <div>
                                  <div className="font-medium">{template.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {template.description}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 预览当前配置 */}
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="text-sm font-medium mb-2">当前配置预览</h4>
                        <div className="space-y-1 text-xs">
                          <div>执行频率: {formData.schedule?.type === 'daily' ? '每天' : '每周'}</div>
                          {formData.schedule?.type === 'weekly' && (
                            <div>
                              执行日期: {formData.schedule.dayOfWeek !== undefined ? getDayName(formData.schedule.dayOfWeek) : '未设置'}
                              {formData.schedule.secondDayOfWeek !== undefined && 
                                ` 和 ${getDayName(formData.schedule.secondDayOfWeek)}`
                              }
                            </div>
                          )}
                          <div>
                            执行时间: {formData.schedule?.hour?.toString().padStart(2, '0') || '00'}:
                            {formData.schedule?.minute?.toString().padStart(2, '0') || '00'}
                          </div>
                          <div>季数: 第{formData.action?.seasonNumber || 1}季</div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {formData.action?.autoUpload && <Badge variant="outline" className="text-xs">自动上传</Badge>}
                            {formData.action?.autoRemoveMarked && <Badge variant="outline" className="text-xs">自动过滤</Badge>}
                            {formData.action?.autoConfirm && <Badge variant="outline" className="text-xs">自动确认</Badge>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="h-full space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>调度配置</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 执行频率 */}
                    <div>
                      <Label>执行频率</Label>
                      <Select
                        value={formData.schedule?.type || 'weekly'}
                        onValueChange={(value: 'daily' | 'weekly') => updateField('schedule.type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">每天执行</SelectItem>
                          <SelectItem value="weekly">每周执行</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 每周执行设置 */}
                    {formData.schedule?.type === 'weekly' && (
                      <div className="space-y-4">
                        <div>
                          <Label>主播出日</Label>
                          <Select
                            value={formData.schedule.dayOfWeek?.toString() || ''}
                            onValueChange={(value) => updateField('schedule.dayOfWeek', parseInt(value))}
                          >
                            <SelectTrigger className={validationErrors['schedule.dayOfWeek'] ? 'border-red-500' : ''}>
                              <SelectValue placeholder="选择星期几" />
                            </SelectTrigger>
                            <SelectContent>
                              {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {validationErrors['schedule.dayOfWeek'] && (
                            <p className="text-sm text-red-500 mt-1">{validationErrors['schedule.dayOfWeek']}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="doubleUpdate"
                            checked={formData.schedule.secondDayOfWeek !== undefined}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateField('schedule.secondDayOfWeek', (formData.schedule?.dayOfWeek || 0) + 3 % 7)
                              } else {
                                updateField('schedule.secondDayOfWeek', undefined)
                              }
                            }}
                          />
                          <Label htmlFor="doubleUpdate">双更模式</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>启用后可设置一周两次更新</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {formData.schedule.secondDayOfWeek !== undefined && (
                          <div>
                            <Label>第二播出日</Label>
                            <Select
                              value={formData.schedule.secondDayOfWeek.toString()}
                              onValueChange={(value) => updateField('schedule.secondDayOfWeek', parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, index) => (
                                  <SelectItem key={index} value={index.toString()}>
                                    {day}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 执行时间 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hour">小时</Label>
                        <Select
                          value={formData.schedule?.hour?.toString() || ''}
                          onValueChange={(value) => updateField('schedule.hour', parseInt(value))}
                        >
                          <SelectTrigger className={validationErrors['schedule.hour'] ? 'border-red-500' : ''}>
                            <SelectValue placeholder="小时" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {validationErrors['schedule.hour'] && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors['schedule.hour']}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="minute">分钟</Label>
                        <Select
                          value={formData.schedule?.minute?.toString() || ''}
                          onValueChange={(value) => updateField('schedule.minute', parseInt(value))}
                        >
                          <SelectTrigger className={validationErrors['schedule.minute'] ? 'border-red-500' : ''}>
                            <SelectValue placeholder="分钟" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 60 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {validationErrors['schedule.minute'] && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors['schedule.minute']}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="h-full space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* 基础操作 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">基础操作</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="seasonNumber">目标季数</Label>
                        <Input
                          id="seasonNumber"
                          type="number"
                          min="1"
                          value={formData.action?.seasonNumber || 1}
                          onChange={(e) => updateField('action.seasonNumber', parseInt(e.target.value) || 1)}
                          className={validationErrors['action.seasonNumber'] ? 'border-red-500' : ''}
                        />
                        {validationErrors['action.seasonNumber'] && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors['action.seasonNumber']}</p>
                        )}
                      </div>

                      <div>
                        <Label>冲突处理方式</Label>
                        <Select
                          value={formData.action?.conflictAction || 'w'}
                          onValueChange={(value: 'w' | 'a' | 's') => updateField('action.conflictAction', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="w">覆盖写入 (推荐)</SelectItem>
                            <SelectItem value="a">追加写入</SelectItem>
                            <SelectItem value="s">跳过写入</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 自动化选项 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">自动化选项</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="autoUpload"
                              checked={formData.action?.autoUpload || false}
                              onCheckedChange={(checked) => updateField('action.autoUpload', checked)}
                            />
                            <Label htmlFor="autoUpload">自动上传</Label>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>导出后自动执行上传操作</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="autoRemoveMarked"
                              checked={formData.action?.autoRemoveMarked || false}
                              onCheckedChange={(checked) => updateField('action.autoRemoveMarked', checked)}
                            />
                            <Label htmlFor="autoRemoveMarked">自动过滤已完成</Label>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>自动过滤掉已标记完成的集数</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="autoConfirm"
                              checked={formData.action?.autoConfirm || false}
                              onCheckedChange={(checked) => updateField('action.autoConfirm', checked)}
                            />
                            <Label htmlFor="autoConfirm">自动确认上传</Label>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>上传时自动确认，无需手动干预</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="autoMarkUploaded"
                              checked={formData.action?.autoMarkUploaded || false}
                              onCheckedChange={(checked) => updateField('action.autoMarkUploaded', checked)}
                            />
                            <Label htmlFor="autoMarkUploaded">自动标记已上传</Label>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>上传成功后自动标记集数为已完成</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="h-full space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">高级选项</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="removeIqiyiAirDate"
                            checked={formData.action?.removeIqiyiAirDate || false}
                            onCheckedChange={(checked) => updateField('action.removeIqiyiAirDate', checked)}
                          />
                          <Label htmlFor="removeIqiyiAirDate">移除爱奇艺播出日期</Label>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>爱奇艺平台特殊处理，移除air_date字段</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enableYoukuSpecialHandling"
                            checked={formData.action?.enableYoukuSpecialHandling || false}
                            onCheckedChange={(checked) => updateField('action.enableYoukuSpecialHandling', checked)}
                          />
                          <Label htmlFor="enableYoukuSpecialHandling">强化CSV处理</Label>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>启用强化CSV处理器，修复损坏的CSV结构并安全删除剧集</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enableTitleCleaning"
                            checked={formData.action?.enableTitleCleaning || false}
                            onCheckedChange={(checked) => updateField('action.enableTitleCleaning', checked)}
                          />
                          <Label htmlFor="enableTitleCleaning">词条标题清理</Label>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>自动清理和规范化标题格式</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="autoDeleteWhenCompleted"
                            checked={formData.action?.autoDeleteWhenCompleted || false}
                            onCheckedChange={(checked) => updateField('action.autoDeleteWhenCompleted', checked)}
                          />
                          <Label htmlFor="autoDeleteWhenCompleted">完结后自动删除</Label>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>项目完结后自动删除此定时任务</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-1 text-sm text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span>有未保存的更改</span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? '更新任务' : '创建任务'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}