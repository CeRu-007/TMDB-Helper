"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Download,
  RefreshCw,
  BarChart3,
  AlertCircle,
  Info
} from "lucide-react"
import { performanceMonitor } from "@/lib/performance-monitor"
import { errorRecoveryManager } from "@/lib/error-recovery-manager"
import { useData } from "@/components/client-data-provider"

interface SystemHealthMonitorProps {
  className?: string
}

export function SystemHealthMonitor({ className = "" }: SystemHealthMonitorProps) {
  const { isConnected, pendingOperations } = useData()
  const [healthData, setHealthData] = useState<any>(null)
  const [errorStats, setErrorStats] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // 更新健康数据
  const updateHealthData = () => {
    const performanceReport = performanceMonitor.getPerformanceReport()
    const errorData = errorRecoveryManager.getErrorStats()
    
    setHealthData(performanceReport)
    setErrorStats(errorData)
  }

  // 自动刷新健康数据
  useEffect(() => {
    if (!autoRefresh) return

    updateHealthData()
    const interval = setInterval(updateHealthData, 5000) // 每5秒更新一次

    return () => clearInterval(interval)
  }, [autoRefresh])

  // 获取健康状态颜色
  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  // 获取健康状态图标
  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-4 w-4 text-green-600" />
    if (score >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <AlertCircle className="h-4 w-4 text-red-600" />
  }

  // 格式化时间
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // 导出健康报告
  const exportHealthReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      performance: performanceMonitor.exportData(),
      errors: errorRecoveryManager.exportErrorData(),
      connection: {
        isConnected,
        pendingOperations
      }
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `system-health-report-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!healthData) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Activity className="h-4 w-4 animate-pulse text-blue-500" />
        <span className="text-sm text-gray-500">加载健康数据...</span>
      </div>
    )
  }

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2">
            {getHealthIcon(healthData.healthScore)}
            <span className={`text-sm font-medium ${getHealthColor(healthData.healthScore)}`}>
              系统健康度: {healthData.healthScore}%
            </span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>系统健康监控</span>
                <Badge variant={healthData.healthScore >= 80 ? "default" : healthData.healthScore >= 60 ? "secondary" : "destructive"}>
                  {healthData.healthScore}%
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                  {autoRefresh ? '自动刷新' : '手动刷新'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportHealthReport}
                >
                  <Download className="h-4 w-4 mr-1" />
                  导出报告
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-6 p-4">
                {/* 连接状态 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      {isConnected ? (
                        <Wifi className="h-4 w-4 text-green-600" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-600" />
                      )}
                      <span>连接状态</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">实时同步</span>
                      <Badge variant={isConnected ? "default" : "destructive"}>
                        {isConnected ? '已连接' : '已断开'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">待处理操作</span>
                      <Badge variant={pendingOperations > 0 ? "secondary" : "outline"}>
                        {pendingOperations}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* 性能指标 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      <span>性能指标</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">连接延迟</span>
                          <span className="text-xs font-medium">
                            {formatTime(healthData.metrics.connectionLatency)}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(100, (healthData.metrics.connectionLatency / 2000) * 100)} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">消息处理</span>
                          <span className="text-xs font-medium">
                            {formatTime(healthData.metrics.messageProcessingTime)}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(100, (healthData.metrics.messageProcessingTime / 200) * 100)} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">乐观更新</span>
                          <span className="text-xs font-medium">
                            {formatTime(healthData.metrics.optimisticUpdateTime)}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(100, (healthData.metrics.optimisticUpdateTime / 100) * 100)} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">数据加载</span>
                          <span className="text-xs font-medium">
                            {formatTime(healthData.metrics.dataLoadTime)}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(100, (healthData.metrics.dataLoadTime / 5000) * 100)} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 错误统计 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span>错误统计</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-red-600">
                          {errorStats?.totalErrors || 0}
                        </div>
                        <div className="text-xs text-gray-600">总错误数</div>
                      </div>
                      
                      <div>
                        <div className="text-lg font-semibold text-orange-600">
                          {(healthData.metrics.errorRate * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">错误率</div>
                      </div>
                      
                      <div>
                        <div className="text-lg font-semibold text-blue-600">
                          {healthData.metrics.reconnectionCount}
                        </div>
                        <div className="text-xs text-gray-600">重连次数</div>
                      </div>
                    </div>

                    {errorStats?.errorsByType && Object.keys(errorStats.errorsByType).length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-700">错误类型分布</div>
                        {Object.entries(errorStats.errorsByType).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 capitalize">{type}</span>
                            <Badge variant="outline" className="text-xs">
                              {count as number}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 优化建议 */}
                {healthData.recommendations && healthData.recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span>优化建议</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {healthData.recommendations.map((recommendation: string, index: number) => (
                          <div key={index} className="flex items-start space-x-2">
                            <Info className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-gray-700">{recommendation}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 最近错误 */}
                {errorStats?.recentErrors && errorStats.recentErrors.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span>最近错误</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {errorStats.recentErrors.slice(0, 5).map((error: any, index: number) => (
                          <div key={index} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-xs">
                                {error.type}
                              </Badge>
                              <span className="text-gray-500">
                                {new Date(error.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-red-700 dark:text-red-300">
                              {error.error.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}