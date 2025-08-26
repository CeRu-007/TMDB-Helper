"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  FileText,
  Plus,
  Edit,
  Copy,
  Trash2,
  Save,
  X,
  MoreHorizontal,
  Star,
  Clock,
  Settings,
  Tag,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { toast } from "@/components/ui/use-toast"

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
    removeAirDateColumn: boolean
    removeRuntimeColumn: boolean
    removeBackdropColumn: boolean
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

interface TaskTemplateManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTemplateSelect?: (template: TaskTemplate) => void
}

export default function TaskTemplateManager({
  open,
  onOpenChange,
  onTemplateSelect
}: TaskTemplateManagerProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<TaskTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // 表单状�?
  const [formData, setFormData] = useState<Partial<TaskTemplate>>({})
  const [saving, setSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // 加载模板
  const loadTemplates = async () => {
    setLoading(true)
    try {
      const saved = localStorage.getItem('tmdb_task_templates')
      if (saved) {
        const parsedTemplates = JSON.parse(saved)
        setTemplates(parsedTemplates)
      } else {
        // 创建默认模板
        const defaultTemplates = createDefaultTemplates()
        setTemplates(defaultTemplates)
        await saveTemplates(defaultTemplates)
      }
    } catch (error) {
      console.error("加载模板失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载任务模板",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 保存模板到本地存�?
  const saveTemplates = async (templateList: TaskTemplate[]) => {
    try {
      localStorage.setItem('tmdb_task_templates', JSON.stringify(templateList))
    } catch (error) {
      console.error("保存模板失败:", error)
      throw error
    }
  }

  // 创建默认模板
  const createDefaultTemplates = (): TaskTemplate[] => {
    return [
      {
        id: uuidv4(),
        name: "每日更新模板",
        description: "适用于每日更新的剧集，自动执行所有操�?,
        schedule: {
          type: 'daily',
          hour: 9,
          minute: 0
        },
        action: {
          seasonNumber: 1,
          autoUpload: true,
          autoRemoveMarked: true,
          autoConfirm: true,
          removeAirDateColumn: false,
          removeRuntimeColumn: false,
          removeBackdropColumn: false,
          autoMarkUploaded: true,
          conflictAction: 'w',
          enableYoukuSpecialHandling: true,
          enableTitleCleaning: true,
          autoDeleteWhenCompleted: true
        },
        tags: ["每日", "自动", "推荐"],
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        name: "周更模板",
        description: "适用于每周更新的剧集，周一上午执行",
        schedule: {
          type: 'weekly',
          dayOfWeek: 0,
          hour: 10,
          minute: 0
        },
        action: {
          seasonNumber: 1,
          autoUpload: true,
          autoRemoveMarked: true,
          autoConfirm: true,
          removeAirDateColumn: false,
          removeRuntimeColumn: false,
          removeBackdropColumn: false,
          autoMarkUploaded: true,
          conflictAction: 'w',
          enableYoukuSpecialHandling: true,
          enableTitleCleaning: true,
          autoDeleteWhenCompleted: true
        },
        tags: ["周更", "自动", "推荐"],
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        name: "双更模板",
        description: "适用于一周两更的剧集，周二和周五晚上执行",
        schedule: {
          type: 'weekly',
          dayOfWeek: 1,
          secondDayOfWeek: 4,
          hour: 20,
          minute: 0
        },
        action: {
          seasonNumber: 1,
          autoUpload: true,
          autoRemoveMarked: true,
          autoConfirm: true,
          removeAirDateColumn: false,
          removeRuntimeColumn: false,
          removeBackdropColumn: false,
          autoMarkUploaded: true,
          conflictAction: 'w',
          enableYoukuSpecialHandling: true,
          enableTitleCleaning: true,
          autoDeleteWhenCompleted: true
        },
        tags: ["双更", "自动", "推荐"],
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        name: "手动确认模板",
        description: "仅导出数据，需要手动确认上�?,
        schedule: {
          type: 'weekly',
          dayOfWeek: 0,
          hour: 9,
          minute: 0
        },
        action: {
          seasonNumber: 1,
          autoUpload: false,
          autoRemoveMarked: true,
          autoConfirm: false,
          removeAirDateColumn: false,
          removeRuntimeColumn: false,
          removeBackdropColumn: false,
          autoMarkUploaded: false,
          conflictAction: 'w',
          enableYoukuSpecialHandling: true,
          enableTitleCleaning: true,
          autoDeleteWhenCompleted: false
        },
        tags: ["手动", "安全"],
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }

  // 初始�?
  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  // 过滤模板
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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
    
    // 清除相关验证错误
    if (validationErrors[path]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[path]
        return newErrors
      })
    }
  }

  // 验证表单
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.name?.trim()) {
      errors.name = "模板名称不能为空"
    }
    
    if (!formData.description?.trim()) {
      errors.description = "模板描述不能为空"
    }
    
    if (!formData.schedule?.hour && formData.schedule?.hour !== 0) {
      errors['schedule.hour'] = "请设置执行小�?
    }
    
    if (!formData.schedule?.minute && formData.schedule?.minute !== 0) {
      errors['schedule.minute'] = "请设置执行分�?
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

  // 创建新模�?
  const handleCreateTemplate = () => {
    setCurrentTemplate(null)
    setFormData({
      id: uuidv4(),
      name: '',
      description: '',
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
        removeAirDateColumn: false,
          removeRuntimeColumn: false,
          removeBackdropColumn: false,
        autoMarkUploaded: true,
        conflictAction: 'w',
        enableYoukuSpecialHandling: true,
        enableTitleCleaning: true,
        autoDeleteWhenCompleted: true
      },
      tags: [],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    setIsEditing(false)
    setValidationErrors({})
    setShowTemplateForm(true)
  }

  // 编辑模板
  const handleEditTemplate = (template: TaskTemplate) => {
    setCurrentTemplate(template)
    setFormData({ ...template })
    setIsEditing(true)
    setValidationErrors({})
    setShowTemplateForm(true)
  }

  // 复制模板
  const handleCopyTemplate = (template: TaskTemplate) => {
    const newTemplate = {
      ...template,
      id: uuidv4(),
      name: `${template.name} (副本)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setCurrentTemplate(null)
    setFormData(newTemplate)
    setIsEditing(false)
    setValidationErrors({})
    setShowTemplateForm(true)
  }

  // 保存模板
  const handleSaveTemplate = async () => {
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
      const templateData = {
        ...formData,
        updatedAt: new Date().toISOString()
      } as TaskTemplate
      
      let updatedTemplates: TaskTemplate[]
      
      if (isEditing && currentTemplate) {
        updatedTemplates = templates.map(t => 
          t.id === currentTemplate.id ? templateData : t
        )
      } else {
        updatedTemplates = [...templates, templateData]
      }
      
      await saveTemplates(updatedTemplates)
      setTemplates(updatedTemplates)
      
      toast({
        title: isEditing ? "更新成功" : "创建成功",
        description: `模板�?{isEditing ? '更新' : '创建'}`,
      })
      
      setShowTemplateForm(false)
    } catch (error) {
      console.error("保存模板失败:", error)
      toast({
        title: "保存失败",
        description: "无法保存模板",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // 删除模板
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return
    
    try {
      const updatedTemplates = templates.filter(t => t.id !== templateToDelete)
      await saveTemplates(updatedTemplates)
      setTemplates(updatedTemplates)
      
      toast({
        title: "删除成功",
        description: "模板已删�?,
      })
    } catch (error) {
      console.error("删除模板失败:", error)
      toast({
        title: "删除失败",
        description: "无法删除模板",
        variant: "destructive"
      })
    } finally {
      setShowDeleteConfirm(false)
      setTemplateToDelete(null)
    }
  }

  // 使用模板
  const handleUseTemplate = (template: TaskTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template)
    }
    onOpenChange(false)
  }

  // 获取星期几名�?
  const getDayName = (day: number) => {
    const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    return days[day] || "未知"
  }

  // 渲染模板卡片
  const renderTemplateCard = (template: TaskTemplate) => {
    return (
      <Card key={template.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <CardTitle className="text-base">{template.name}</CardTitle>
                {template.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    默认
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleUseTemplate(template)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  使用模板
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopyTemplate(template)}>
                  <Copy className="h-4 w-4 mr-2" />
                  复制
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    setTemplateToDelete(template.id)
                    setShowDeleteConfirm(true)
                  }}
                  className="text-red-600"
                  disabled={template.isDefault}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* 调度信息 */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>
                  {template.schedule.type === 'daily' ? '每天' : '每周'}
                  {template.schedule.type === 'weekly' && (
                    <span>
                      {getDayName(template.schedule.dayOfWeek || 0)}
                      {template.schedule.secondDayOfWeek !== undefined && 
                        `�?{getDayName(template.schedule.secondDayOfWeek)}`
                      }
                    </span>
                  )}
                  {` ${template.schedule.hour.toString().padStart(2, '0')}:${template.schedule.minute.toString().padStart(2, '0')}`}
                </span>
              </div>
            </div>
            
            {/* 操作配置 */}
            <div className="flex flex-wrap gap-1">
              {template.action.autoUpload && <Badge variant="outline" className="text-xs">自动上传</Badge>}
              {template.action.autoRemoveMarked && <Badge variant="outline" className="text-xs">自动过滤</Badge>}
              {template.action.autoConfirm && <Badge variant="outline" className="text-xs">自动确认</Badge>}
              {template.action.autoMarkUploaded && <Badge variant="outline" className="text-xs">自动标记</Badge>}
              {template.action.enableYoukuSpecialHandling && <Badge variant="outline" className="text-xs">优酷处理</Badge>}
              {template.action.enableTitleCleaning && <Badge variant="outline" className="text-xs">标题清理</Badge>}
              {template.action.autoDeleteWhenCompleted && <Badge variant="outline" className="text-xs">完结删除</Badge>}
            </div>
            
            {/* 标签 */}
            {template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>任务模板管理</span>
                <Badge variant="outline">
                  {templates.length} 个模�?
                </Badge>
              </div>
              
              <Button onClick={handleCreateTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                新建模板
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col space-y-4 min-h-0">
            {/* 搜索�?*/}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="搜索模板名称、描述或标签..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* 模板列表 */}
            <div className="flex-1 min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">加载�?..</span>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-2 gap-4 pr-4">
                    {filteredTemplates.length > 0 ? (
                      filteredTemplates.map(renderTemplateCard)
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">暂无模板</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm 
                            ? "没有找到符合条件的模�? 
                            : "还没有创建任何模�?
                          }
                        </p>
                        <Button onClick={handleCreateTemplate}>
                          <Plus className="h-4 w-4 mr-2" />
                          创建第一个模�?
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 模板表单对话�?*/}
      <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? '编辑模板' : '创建模板'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* 基础信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">基础信息</h3>
                
                <div>
                  <Label htmlFor="templateName">模板名称 *</Label>
                  <Input
                    id="templateName"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="输入模板名称"
                    className={validationErrors.name ? 'border-red-500' : ''}
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="templateDescription">模板描述 *</Label>
                  <Textarea
                    id="templateDescription"
                    value={formData.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="描述模板的用途和特点"
                    className={validationErrors.description ? 'border-red-500' : ''}
                  />
                  {validationErrors.description && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.description}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="templateTags">标签</Label>
                  <Input
                    id="templateTags"
                    value={formData.tags?.join(', ') || ''}
                    onChange={(e) => updateField('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                    placeholder="输入标签，用逗号分隔"
                  />
                </div>
              </div>

              {/* 调度设置 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">调度设置</h3>
                
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

                {formData.schedule?.type === 'weekly' && (
                  <div>
                    <Label>执行日期</Label>
                    <Select
                      value={formData.schedule.dayOfWeek?.toString() || ''}
                      onValueChange={(value) => updateField('schedule.dayOfWeek', parseInt(value))}
                    >
                      <SelectTrigger className={validationErrors['schedule.dayOfWeek'] ? 'border-red-500' : ''}>
                        <SelectValue placeholder="选择星期�? />
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
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>小时</Label>
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
                    <Label>分钟</Label>
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
              </div>

              {/* 操作配置 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">操作配置</h3>
                
                <div>
                  <Label htmlFor="seasonNumber">默认季数</Label>
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
                          <p>导出后自动执行上传操�?/p>
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
                      <Label htmlFor="autoRemoveMarked">自动过滤已完�?/Label>
                    </div>
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
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoMarkUploaded"
                        checked={formData.action?.autoMarkUploaded || false}
                        onCheckedChange={(checked) => updateField('action.autoMarkUploaded', checked)}
                      />
                      <Label htmlFor="autoMarkUploaded">自动标记已上�?/Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTemplateForm(false)}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? '更新模板' : '创建模板'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话�?*/}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个模板吗？此操作无法撤销�?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
