"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Database, 
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react'
import { ConfigMigration, MigrationResult } from '@/lib/config-migration'
import { useToast } from '@/hooks/use-toast'

interface ConfigMigrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ConfigMigrationDialog({ open, onOpenChange }: ConfigMigrationDialogProps) {
  const { toast } = useToast()
  const [migrationStatus, setMigrationStatus] = useState({
    needsMigration: false,
    hasLocalData: false,
    migrationComplete: false,
    localDataKeys: [] as string[]
  })
  const [isLoading, setIsLoading] = useState(false)
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [progress, setProgress] = useState(0)

  // 检查迁移状态
  const checkMigrationStatus = () => {
    const status = ConfigMigration.getMigrationStatus()
    setMigrationStatus(status)
  }

  useEffect(() => {
    if (open) {
      checkMigrationStatus()
    }
  }, [open])

  // 执行迁移
  const handleMigration = async () => {
    setIsLoading(true)
    setProgress(0)
    setMigrationResult(null)

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await ConfigMigration.migrate()
      
      clearInterval(progressInterval)
      setProgress(100)
      setMigrationResult(result)
      
      if (result.success) {
        toast({
          title: "迁移成功",
          description: result.message,
        })
        checkMigrationStatus() // 重新检查状态
      } else {
        toast({
          title: "迁移失败",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      setProgress(0)
      toast({
        title: "迁移出错",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 重置迁移状态（用于测试）
  const handleResetMigration = () => {
    ConfigMigration.resetMigrationFlag()
    checkMigrationStatus()
    setMigrationResult(null)
    toast({
      title: "迁移状态已重置",
      description: "可以重新进行配置迁移",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            配置迁移
          </DialogTitle>
          <DialogDescription>
            将配置从浏览器本地存储迁移到服务端存储，提高安全性和可靠性
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 迁移状态卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">迁移状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>迁移状态:</span>
                {migrationStatus.migrationComplete ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    已完成
                  </Badge>
                ) : migrationStatus.needsMigration ? (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    需要迁移
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Info className="h-3 w-3 mr-1" />
                    无需迁移
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span>本地数据:</span>
                <Badge variant={migrationStatus.hasLocalData ? "outline" : "secondary"}>
                  {migrationStatus.localDataKeys.length} 个配置项
                </Badge>
              </div>

              {migrationStatus.localDataKeys.length > 0 && (
                <div>
                  <span className="text-sm font-medium">待迁移的配置:</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {migrationStatus.localDataKeys.map(key => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 迁移进度 */}
          {isLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>迁移进度</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 迁移结果 */}
          {migrationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {migrationResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  迁移结果
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {migrationResult.message}
                </p>

                {migrationResult.migratedKeys.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">成功迁移的配置:</span>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {migrationResult.migratedKeys.map(key => (
                        <Badge key={key} variant="default" className="text-xs bg-green-500">
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {migrationResult.errors.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-red-500">错误信息:</span>
                    <ScrollArea className="mt-2 h-20 w-full rounded border p-2">
                      {migrationResult.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-500 mb-1">
                          {error}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={checkMigrationStatus}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新状态
              </Button>
              
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline"
                  onClick={handleResetMigration}
                  disabled={isLoading}
                >
                  重置状态
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                关闭
              </Button>
              
              {migrationStatus.needsMigration && (
                <Button
                  onClick={handleMigration}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      迁移中...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      开始迁移
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
