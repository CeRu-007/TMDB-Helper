"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, FileText, Database, Settings, Info } from "lucide-react"
import { useData } from "@/components/client-data-provider"
import { StorageManager } from "@/lib/storage"

interface ExportDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ExportOptions {
  includeItems: boolean
  includeTasks: boolean
  format: 'json' | 'csv'
  itemsOnly: boolean // 仅导出项目（兼容旧格式）
  exactCopy: boolean // 导出与data文件夹完全一致的文件
}

export default function ExportDataDialog({ open, onOpenChange }: ExportDataDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    includeItems: true,
    includeTasks: true,
    format: 'json',
    itemsOnly: false,
    exactCopy: false
  })
  const [exporting, setExporting] = useState(false)
  const [stats, setStats] = useState<{
    itemCount: number
    taskCount: number
  } | null>(null)

  const { items, exportData } = useData()

  // 加载统计信息
  React.useEffect(() => {
    if (open) {
      loadStats()
    }
  }, [open])

  const loadStats = async () => {
    try {
      const tasks = await StorageManager.getScheduledTasks()
      setStats({
        itemCount: items.length,
        taskCount: tasks.length
      })
    } catch (error) {
      console.error("Failed to load stats:", error)
      setStats({
        itemCount: items.length,
        taskCount: 0
      })
    }
  }

  // 处理导出
  const handleExport = async () => {
    setExporting(true)

    try {
      if (options.format === 'json') {
        if (options.exactCopy) {
          // 导出与data文件夹完全一致的文件
          try {
            const response = await fetch('/api/storage/file-operations')
            const result = await response.json()

            if (result.success) {
              const data = JSON.stringify(result.items, null, 2)
              downloadFile(data, 'tmdb_items.json', 'application/json')
            } else {
              throw new Error(result.error || "读取数据失败")
            }
          } catch (error) {
            console.error("从文件导出失败:", error)
            throw error
          }
        } else if (options.itemsOnly) {
          // 导出旧格式（仅项目数组）
          const data = JSON.stringify(items, null, 2)
          downloadFile(data, `tmdb-helper-items-${new Date().toISOString().split("T")[0]}.json`, 'application/json')
        } else {
          // 导出新格式 - 包含任务的完整备份
          try {
            const response = await fetch('/api/storage/file-operations')
            const result = await response.json()

            if (result.success) {
              // 创建完整的导出格式
              const exportData = {
                items: result.items,
                tasks: await StorageManager.getScheduledTasks(), // 从localStorage获取任务
                version: "1.0.0",
                exportDate: new Date().toISOString()
              }

              const data = JSON.stringify(exportData, null, 2)
              downloadFile(data, `tmdb-helper-backup-${new Date().toISOString().split("T")[0]}.json`, 'application/json')
            } else {
              throw new Error(result.error || "读取数据失败")
            }
          } catch (error) {
            console.error("从文件导出失败，尝试使用内存数据:", error)
            // 降级到原来的导出方法
            await exportData()
          }
        }
      } else if (options.format === 'csv') {
        // 导出CSV格式
        await exportToCSV()
      }

      onOpenChange(false)
    } catch (error) {
      console.error("Export failed:", error)
      alert(`导出失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setExporting(false)
    }
  }

  // 导出CSV格式
  const exportToCSV = async () => {
    if (!options.includeItems) return

    const csvHeaders = [
      'ID', '标题', '原标题', '类型', 'TMDB ID', 'TMDB URL', '海报URL', 
      '播出星期', '播出时间', '总集数', '已完成', '状态', '平台URL', '备注', '分类', '创建时间'
    ]

    const csvRows = items.map(item => [
      item.id,
      item.title,
      item.originalTitle || '',
      item.mediaType,
      item.tmdbId,
      item.tmdbUrl || '',
      item.posterUrl || '',
      item.weekday,
      item.airTime || '',
      item.totalEpisodes || '',
      item.completed ? '是' : '否',
      item.status === 'ongoing' ? '进行中' : '已完成',
      item.platformUrl || '',
      item.notes || '',
      item.category || '',
      item.createdAt
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    downloadFile(csvContent, `tmdb-helper-items-${new Date().toISOString().split("T")[0]}.csv`, 'text/csv')
  }

  // 下载文件
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            导出数据
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 数据统计 */}
          {stats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  数据统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">项目数量：</span>
                    <Badge variant="outline">{stats.itemCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">定时任务：</span>
                    <Badge variant="outline">{stats.taskCount}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 导出格式 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                导出格式
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={options.format}
                onValueChange={(value) => setOptions(prev => ({ ...prev, format: value as 'json' | 'csv' }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json" className="flex-1">
                    <div>
                      <div className="font-medium">JSON 格式</div>
                      <div className="text-sm text-muted-foreground">
                        完整的数据备份，包含所有字段和结构
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex-1">
                    <div>
                      <div className="font-medium">CSV 格式</div>
                      <div className="text-sm text-muted-foreground">
                        表格格式，便于在Excel等软件中查看
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 导出选项 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                导出选项
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {options.format === 'json' && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeItems"
                      checked={options.includeItems}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, includeItems: checked as boolean }))
                      }
                    />
                    <Label htmlFor="includeItems" className="flex-1">
                      <div>
                        <div className="font-medium">包含项目数据</div>
                        <div className="text-sm text-muted-foreground">
                          导出所有影视项目信息
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeTasks"
                      checked={options.includeTasks}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, includeTasks: checked as boolean }))
                      }
                    />
                    <Label htmlFor="includeTasks" className="flex-1">
                      <div>
                        <div className="font-medium">包含定时任务</div>
                        <div className="text-sm text-muted-foreground">
                          导出所有定时任务配置
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exactCopy"
                      checked={options.exactCopy}
                      onCheckedChange={(checked) =>
                        setOptions(prev => ({
                          ...prev,
                          exactCopy: checked as boolean,
                          includeItems: true,
                          includeTasks: !checked,
                          itemsOnly: false
                        }))
                      }
                    />
                    <Label htmlFor="exactCopy" className="flex-1">
                      <div>
                        <div className="font-medium">导出data文件副本</div>
                        <div className="text-sm text-muted-foreground">
                          导出与data/tmdb_items.json完全一致的文件
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="itemsOnly"
                      checked={options.itemsOnly}
                      onCheckedChange={(checked) =>
                        setOptions(prev => ({
                          ...prev,
                          itemsOnly: checked as boolean,
                          includeItems: true,
                          includeTasks: !checked,
                          exactCopy: false
                        }))
                      }
                    />
                    <Label htmlFor="itemsOnly" className="flex-1">
                      <div>
                        <div className="font-medium">兼容旧版本格式</div>
                        <div className="text-sm text-muted-foreground">
                          仅导出项目数组，兼容旧版本导入
                        </div>
                      </div>
                    </Label>
                  </div>
                </>
              )}

              {options.format === 'csv' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    CSV 格式仅包含项目数据，不包含定时任务信息
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={exporting || (options.format === 'json' && !options.includeItems && !options.includeTasks)}
            >
              {exporting ? "导出中..." : "开始导出"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
