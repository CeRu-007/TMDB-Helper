"use client"

import React, { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, RefreshCw, Download, Trash2, Info } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Separator } from '@/shared/components/ui/separator'
import { useToast } from '@/shared/lib/hooks/use-toast'
import { dataRecoveryManager, DataValidationResult } from '@/shared/lib/data/data-recovery-manager'
import { StorageManager } from '@/lib/data/storage'

interface DataDiagnosticPanelProps {
  className?: string
}

export function DataDiagnosticPanel({ className = "" }: DataDiagnosticPanelProps) {
  const [validation, setValidation] = useState<DataValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  // 运行数据验证
  const runValidation = async () => {
    setIsValidating(true)
    try {
      const result = await dataRecoveryManager.validateData()
      setValidation(result)
      
      if (result.isValid) {
        toast({
          title: "数据验证通过",
          description: `发现 ${result.itemCount} 个项目和 ${result.taskCount} 个任务`,
          duration: 3000
        })
      } else {
        toast({
          title: "数据验证失败",
          description: `发现 ${result.errors.length} 个错误`,
          variant: "destructive",
          duration: 5000
        })
      }
    } catch (error) {
      
      toast({
        title: "验证过程失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setIsValidating(false)
    }
  }

  // 安全导出数据
  const safeExport = async () => {
    setIsExporting(true)
    try {
      const result = await dataRecoveryManager.safeExportData({
        includeBackup: true,
        validateData: true,
        autoFix: true,
        maxRetries: 3
      })

      if (result.success && result.data && result.filename) {
        // 创建下载链接
        const blob = new Blob([result.data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "安全导出成功",
          description: `已导出 ${result.stats?.itemCount || 0} 个项目和 ${result.stats?.taskCount || 0} 个任务`,
          duration: 3000
        })
      } else {
        throw new Error(result.error || '导出失败')
      }
    } catch (error) {
      
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setIsExporting(false)
    }
  }

  // 修复数据问题
  const fixDataIssues = async () => {
    try {
      await StorageManager.forceRefreshScheduledTasks()
      toast({
        title: "数据修复完成",
        description: "已尝试修复检测到的数据问题",
        duration: 3000
      })
      
      // 重新验证
      await runValidation()
    } catch (error) {
      
      toast({
        title: "修复失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive",
        duration: 5000
      })
    }
  }

  // 清理损坏数据
  const cleanupCorruptedData = () => {
    if (typeof window === 'undefined' || !window.localStorage) return

    const keys = Object.keys(localStorage)
    const corruptedKeys = keys.filter(key => 
      key.includes('corrupted') || 
      key.includes('backup')
    )

    corruptedKeys.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        
      }
    })

    toast({
      title: "清理完成",
      description: `已清理 ${corruptedKeys.length} 个损坏的数据项`,
      duration: 3000
    })

    // 重新验证
    runValidation()
  }

  // 组件加载时自动验证
  useEffect(() => {
    runValidation()
  }, [])

  const getStatusIcon = () => {
    if (!validation) return <RefreshCw className="h-5 w-5 animate-spin" />
    return validation.isValid ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <AlertTriangle className="h-5 w-5 text-red-500" />
  }

  const getStatusText = () => {
    if (!validation) return "验证中..."
    return validation.isValid ? "数据完整" : "发现问题"
  }

  const getStatusColor = () => {
    if (!validation) return "secondary"
    return validation.isValid ? "default" : "destructive"
  }

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          数据诊断面板
        </CardTitle>
        <CardDescription>
          检查和修复数据完整性问题
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 状态概览 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">数据状态:</span>
            <Badge variant={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
          <Button 
            onClick={runValidation} 
            disabled={isValidating}
            size="sm"
            variant="outline"
          >
            {isValidating ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            重新验证
          </Button>
        </div>

        {validation && (
          <>
            {/* 数据统计 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{validation.itemCount}</div>
                <div className="text-sm text-muted-foreground">项目数量</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{validation.taskCount}</div>
                <div className="text-sm text-muted-foreground">任务数量</div>
              </div>
            </div>

            <Separator />

            {/* 错误信息 */}
            {validation.errors.length > 0 && (
              <div>
                <h3 className="font-medium mb-2 text-red-600">发现的错误:</h3>
                <div className="space-y-2">
                  {validation.errors.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* 警告信息 */}
            {validation.warnings.length > 0 && (
              <div>
                <h3 className="font-medium mb-2 text-yellow-600">警告信息:</h3>
                <div className="space-y-2">
                  {validation.warnings.map((warning, index) => (
                    <Alert key={index}>
                      <Info className="h-4 w-4" />
                      <AlertDescription>{warning}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* 操作按钮 */}
            <div className="space-y-2">
              <Button 
                onClick={safeExport} 
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                安全导出数据
              </Button>
              
              {!validation.isValid && (
                <Button 
                  onClick={fixDataIssues}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  尝试修复问题
                </Button>
              )}
              
              <Button 
                onClick={cleanupCorruptedData}
                variant="outline"
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                清理损坏数据
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default DataDiagnosticPanel
