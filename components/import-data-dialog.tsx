"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, AlertCircle, CheckCircle, Info } from "lucide-react"
import { StorageManager } from "@/lib/storage"
import { useEnhancedData } from "@/components/enhanced-client-data-provider"

interface ImportDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ImportPreview {
  isValid: boolean
  error?: string
  stats?: {
    itemCount: number
    taskCount: number
    validItemCount: number
    validTaskCount: number
  }
  data?: {
    version?: string
    exportDate?: string
  }
}

export default function ImportDataDialog({ open, onOpenChange }: ImportDataDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStep, setImportStep] = useState("")
  const [importResult, setImportResult] = useState<{
    success: boolean
    error?: string
    stats?: {
      itemsImported: number
      tasksImported: number
      itemsSkipped: number
      tasksSkipped: number
    }
  } | null>(null)

  const { importData } = useEnhancedData()

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      setFile(null)
      setPreview(null)
      return
    }

    setFile(selectedFile)
    setImportResult(null)

    // 读取文件并预览
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as string
        const validation = StorageManager.validateImportData(data)
        
        setPreview({
          isValid: validation.isValid,
          error: validation.error,
          stats: validation.stats,
          data: validation.data ? {
            version: validation.data.version,
            exportDate: validation.data.exportDate
          } : undefined
        })
      } catch (error) {
        setPreview({
          isValid: false,
          error: error instanceof Error ? error.message : "文件读取失败"
        })
      }
    }
    reader.readAsText(selectedFile)
  }

  // 执行导入
  const handleImport = async () => {
    if (!file || !preview?.isValid) return

    setImporting(true)
    setImportProgress(0)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as string

          setImportStep("正在解析文件...")
          setImportProgress(10)

          // 解析数据
          const parsedData = JSON.parse(data)
          let items: any[] = []

          // 检查数据格式
          if (Array.isArray(parsedData)) {
            items = parsedData
          } else if (parsedData.items && Array.isArray(parsedData.items)) {
            items = parsedData.items
          } else {
            throw new Error("数据格式不正确")
          }

          setImportStep(`准备导入 ${items.length} 个项目...`)
          setImportProgress(30)

          // 使用新的文件操作API直接导入
          setImportStep("正在备份原数据...")
          const response = await fetch('/api/storage/file-operations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              items,
              backup: true // 自动备份原文件
            }),
          })

          setImportStep("正在写入数据文件...")
          setImportProgress(70)

          const result = await response.json()

          setImportStep("导入完成！")
          setImportProgress(100)

          if (result.success) {
            setImportResult({
              success: true,
              stats: {
                itemsImported: result.itemCount,
                tasksImported: 0,
                itemsSkipped: 0,
                tasksSkipped: 0
              }
            })

            // 延迟刷新页面，让用户看到成功信息
            setTimeout(() => {
              window.location.reload()
            }, 2000)
          } else {
            throw new Error(result.error || "导入失败")
          }
        } catch (error) {
          setImportStep("导入失败")
          setImportResult({
            success: false,
            error: error instanceof Error ? error.message : "导入失败"
          })
        } finally {
          setImporting(false)
        }
      }
      reader.readAsText(file)
    } catch (error) {
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : "导入失败"
      })
      setImporting(false)
    }
  }

  // 重置状态
  const handleReset = () => {
    setFile(null)
    setPreview(null)
    setImportResult(null)
    setImportProgress(0)
    setImportStep("")
    setImporting(false)
  }

  // 关闭对话框
  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            导入数据
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 文件选择 */}
          <div className="space-y-2">
            <Label htmlFor="import-file">选择备份文件</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              disabled={importing}
            />
            <p className="text-sm text-muted-foreground">
              支持 JSON 格式的备份文件
            </p>
          </div>

          {/* 文件预览 */}
          {file && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  文件信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>文件名：</span>
                  <span className="font-mono">{file.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>文件大小：</span>
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                
                {preview && (
                  <>
                    {preview.isValid ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          数据格式验证通过
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {preview.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {preview.stats && (
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">项目数量：</span>
                            <Badge variant="outline">
                              {preview.stats.validItemCount}/{preview.stats.itemCount}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">任务数量：</span>
                            <Badge variant="outline">
                              {preview.stats.validTaskCount}/{preview.stats.taskCount}
                            </Badge>
                          </div>
                        </div>
                        
                        {preview.data && (
                          <div className="space-y-2">
                            {preview.data.version && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm">版本：</span>
                                <span className="text-sm font-mono">{preview.data.version}</span>
                              </div>
                            )}
                            {preview.data.exportDate && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm">导出时间：</span>
                                <span className="text-sm">
                                  {new Date(preview.data.exportDate).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {preview.stats && (preview.stats.itemCount !== preview.stats.validItemCount || preview.stats.taskCount !== preview.stats.validTaskCount) && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          部分数据格式不正确将被跳过：
                          {preview.stats.itemCount !== preview.stats.validItemCount && (
                            <span> {preview.stats.itemCount - preview.stats.validItemCount} 个无效项目</span>
                          )}
                          {preview.stats.taskCount !== preview.stats.validTaskCount && (
                            <span> {preview.stats.taskCount - preview.stats.validTaskCount} 个无效任务</span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* 导入进度 */}
          {importing && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">导入进度</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">
                  {importStep || "正在导入数据，请稍候..."}
                </p>
                <div className="text-xs text-muted-foreground mt-1">
                  {importProgress}% 完成
                </div>
              </CardContent>
            </Card>
          )}

          {/* 导入结果 */}
          {importResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  导入结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                {importResult.success ? (
                  <div className="space-y-2">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        数据导入成功！
                      </AlertDescription>
                    </Alert>
                    {importResult.stats && (
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>已导入项目：</span>
                            <Badge variant="secondary">{importResult.stats.itemsImported}</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>已导入任务：</span>
                            <Badge variant="secondary">{importResult.stats.tasksImported}</Badge>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {importResult.stats.itemsSkipped > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>跳过项目：</span>
                              <Badge variant="outline">{importResult.stats.itemsSkipped}</Badge>
                            </div>
                          )}
                          {importResult.stats.tasksSkipped > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>跳过任务：</span>
                              <Badge variant="outline">{importResult.stats.tasksSkipped}</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {importResult.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              {importResult?.success ? "完成" : "取消"}
            </Button>
            {!importResult?.success && (
              <>
                {file && preview?.isValid && !importing && (
                  <Button onClick={handleImport}>
                    开始导入
                  </Button>
                )}
                {(file || preview) && !importing && (
                  <Button variant="outline" onClick={handleReset}>
                    重新选择
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
