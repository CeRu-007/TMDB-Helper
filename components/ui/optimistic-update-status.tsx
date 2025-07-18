"use client"

import React, { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { optimisticUpdateManager, OptimisticOperation } from '@/lib/optimistic-update-manager'

interface OptimisticUpdateStatusProps {
  className?: string
  showOnlyFailed?: boolean
  autoHide?: boolean
}

export function OptimisticUpdateStatus({ 
  className = "", 
  showOnlyFailed = false,
  autoHide = true 
}: OptimisticUpdateStatusProps) {
  const [operations, setOperations] = useState<OptimisticOperation[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleOperationsUpdate = (ops: OptimisticOperation[]) => {
      const filteredOps = showOnlyFailed 
        ? ops.filter(op => op.status === 'failed' || op.status === 'retrying')
        : ops

      setOperations(filteredOps)
      setIsVisible(filteredOps.length > 0)

      // 自动隐藏成功的操作
      if (autoHide && filteredOps.length === 0) {
        setTimeout(() => setIsVisible(false), 1000)
      }
    }

    optimisticUpdateManager.addListener(handleOperationsUpdate)
    
    // 初始加载
    handleOperationsUpdate(optimisticUpdateManager.getPendingOperations())

    return () => {
      optimisticUpdateManager.removeListener(handleOperationsUpdate)
    }
  }, [showOnlyFailed, autoHide])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'retrying':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (operation: OptimisticOperation) => {
    switch (operation.status) {
      case 'pending':
        return '处理中...'
      case 'retrying':
        return `重试中 (${operation.retryCount}/${operation.maxRetries})`
      case 'confirmed':
        return '已完成'
      case 'failed':
        return operation.lastError || '操作失败'
      default:
        return '未知状态'
    }
  }

  const getOperationDescription = (operation: OptimisticOperation) => {
    const entityName = operation.entity === 'item' ? '项目' : '任务'
    const actionName = operation.type === 'add' ? '添加' : 
                      operation.type === 'update' ? '更新' : '删除'
    
    const itemTitle = operation.data?.title || operation.data?.name || '未知'
    return `${actionName}${entityName}: ${itemTitle}`
  }

  const handleRetry = (operationId: string) => {
    optimisticUpdateManager.retryFailedOperation(operationId)
  }

  const handleCancel = (operationId: string) => {
    optimisticUpdateManager.cancelOperation(operationId)
  }

  if (!isVisible || operations.length === 0) {
    return null
  }

  return (
    <Card className={`fixed bottom-4 right-4 w-96 z-50 shadow-lg ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          操作状态
        </CardTitle>
        <CardDescription className="text-xs">
          {operations.length} 个操作正在处理
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-64 overflow-y-auto">
        {operations.map((operation) => (
          <div key={operation.id} className="flex items-start gap-3 p-2 rounded-md bg-muted/30">
            <div className="flex-shrink-0 mt-0.5">
              {getStatusIcon(operation.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {getOperationDescription(operation)}
              </div>
              
              <div className="text-xs text-muted-foreground mt-1">
                {getStatusText(operation)}
              </div>
              
              {operation.status === 'retrying' && operation.retryCount && operation.maxRetries && (
                <Progress 
                  value={(operation.retryCount / operation.maxRetries) * 100} 
                  className="h-1 mt-2"
                />
              )}
              
              {operation.status === 'failed' && (
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleRetry(operation.id)}
                  >
                    重试
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleCancel(operation.id)}
                  >
                    取消
                  </Button>
                </div>
              )}
            </div>
            
            <Badge 
              variant={
                operation.status === 'failed' ? 'destructive' :
                operation.status === 'retrying' ? 'secondary' :
                operation.status === 'confirmed' ? 'default' : 'outline'
              }
              className="text-xs"
            >
              {operation.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default OptimisticUpdateStatus
