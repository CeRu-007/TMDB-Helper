"use client"

import React, { useState, useEffect } from 'react'
import { Settings, BarChart3, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { optimisticUpdateManager } from '@/lib/optimistic-update-manager'
import { useOptimisticConfig } from '@/hooks/use-optimistic-config'

interface OptimisticDebugPanelProps {
  className?: string
}

export function OptimisticDebugPanel({ className = "" }: OptimisticDebugPanelProps) {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    failed: 0,
    retrying: 0,
    avgRetryCount: 0
  })

  const { config, networkQuality, updateConfig, resetConfig, adaptToNetwork } = useOptimisticConfig()

  // 更新统计信息
  useEffect(() => {
    const updateStats = () => {
      setStats(optimisticUpdateManager.getStats())
    }

    const interval = setInterval(updateStats, 1000)
    updateStats() // 立即更新一次

    return () => clearInterval(interval)
  }, [])

  const handleTimeoutChange = (value: number[]) => {
    updateConfig({ timeout: value[0] })
  }

  const handleMaxRetriesChange = (value: number[]) => {
    updateConfig({ maxRetries: value[0] })
  }

  const handleAdaptiveToggle = (checked: boolean) => {
    updateConfig({ adaptiveTimeout: checked })
  }

  const clearAllOperations = () => {
    optimisticUpdateManager.clear()
  }

  const getNetworkQualityColor = () => {
    if (!networkQuality) return 'gray'
    
    switch (networkQuality.effectiveType) {
      case '4g': return 'green'
      case '3g': return 'yellow'
      case '2g': return 'orange'
      case 'slow-2g': return 'red'
      default: return 'gray'
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          乐观更新调试面板
        </CardTitle>
        <CardDescription>
          监控和配置乐观更新系统
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 统计信息 */}
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            操作统计
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-muted rounded">
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">总计</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-lg font-bold text-blue-600">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">处理中</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="text-lg font-bold text-yellow-600">{stats.retrying}</div>
              <div className="text-xs text-muted-foreground">重试中</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <div className="text-lg font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">失败</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-center">
            平均重试次数: {stats.avgRetryCount.toFixed(1)}
          </div>
        </div>

        <Separator />

        {/* 网络质量 */}
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            {networkQuality ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            网络质量
          </h3>
          {networkQuality ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">连接类型:</span>
                <Badge style={{ backgroundColor: getNetworkQualityColor() }}>
                  {networkQuality.effectiveType.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">延迟:</span>
                <span className="text-sm font-mono">{networkQuality.rtt}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">下行速度:</span>
                <span className="text-sm font-mono">{networkQuality.downlink} Mbps</span>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={adaptToNetwork}
                className="w-full"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                适配网络
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              网络信息不可用
            </div>
          )}
        </div>

        <Separator />

        {/* 配置设置 */}
        <div>
          <h3 className="font-medium mb-3">配置设置</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">超时时间: {config.timeout / 1000}秒</Label>
              <Slider
                value={[config.timeout]}
                onValueChange={handleTimeoutChange}
                min={5000}
                max={120000}
                step={5000}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label className="text-sm">最大重试次数: {config.maxRetries}</Label>
              <Slider
                value={[config.maxRetries]}
                onValueChange={handleMaxRetriesChange}
                min={1}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">自适应超时</Label>
              <Switch
                checked={config.adaptiveTimeout}
                onCheckedChange={handleAdaptiveToggle}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* 操作按钮 */}
        <div className="space-y-2">
          <Button 
            variant="outline" 
            onClick={resetConfig}
            className="w-full"
          >
            重置配置
          </Button>
          <Button 
            variant="destructive" 
            onClick={clearAllOperations}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清除所有操作
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default OptimisticDebugPanel
