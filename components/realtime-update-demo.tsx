"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Zap,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUp,
  ArrowDown,
  Sparkles
} from "lucide-react"
import { useData } from "@/components/client-data-provider"

interface RealtimeUpdateDemoProps {
  className?: string
}

export function RealtimeUpdateDemo({ className = "" }: RealtimeUpdateDemoProps) {
  const { items, pendingOperations, isConnected, getOptimisticStats } = useData()
  const [previousCount, setPreviousCount] = useState(0)
  const [countChange, setCountChange] = useState<'up' | 'down' | null>(null)
  const [animationKey, setAnimationKey] = useState(0)

  // 监听项目数量变化，实现数字直接变化的动画效果
  useEffect(() => {
    const currentCount = items.length
    
    if (previousCount !== 0 && currentCount !== previousCount) {
      // 数字发生变化，触发动画
      setCountChange(currentCount > previousCount ? 'up' : 'down')
      setAnimationKey(prev => prev + 1)
      
      // 2秒后清除变化指示
      setTimeout(() => {
        setCountChange(null)
      }, 2000)
    }
    
    setPreviousCount(currentCount)
  }, [items.length, previousCount])

  const stats = getOptimisticStats()
  const totalItems = items.length
  const ongoingItems = items.filter(item => item.status === 'ongoing').length
  const completedItems = items.filter(item => item.status === 'completed').length

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 实时状态卡片 */}
      <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Activity className="h-4 w-4 text-blue-600" />
            <span>实时数据更新演示</span>
            {isConnected && (
              <Badge variant="secondary" className="bg-green-500 text-white text-xs">
                <Zap className="h-3 w-3 mr-1" />
                实时同步
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 项目总数 - 带动画效果 */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium">项目总数</span>
            </div>
            <div className="flex items-center space-x-2">
              {countChange && (
                <div className={`flex items-center space-x-1 animate-pulse ${
                  countChange === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {countChange === 'up' ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  <span className="text-xs font-medium">
                    {countChange === 'up' ? '增加' : '减少'}
                  </span>
                </div>
              )}
              <div 
                key={animationKey}
                className={`text-2xl font-bold transition-all duration-500 ${
                  countChange === 'up' 
                    ? 'text-green-600 animate-bounce' 
                    : countChange === 'down' 
                    ? 'text-red-600 animate-bounce' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {totalItems}
              </div>
            </div>
          </div>

          {/* 状态分布 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">进行中</span>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-orange-500" />
                  <span className="text-lg font-semibold text-orange-600">{ongoingItems}</span>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">已完成</span>
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-lg font-semibold text-green-600">{completedItems}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 乐观更新状态 */}
          {pendingOperations > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-yellow-600 animate-spin" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    正在处理操作
                  </span>
                </div>
                <Badge variant="secondary" className="bg-yellow-500 text-white">
                  {pendingOperations}
                </Badge>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                数据正在同步中，界面已提前更新
              </p>
            </div>
          )}

          {/* 操作统计 */}
          {stats.total > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">乐观更新统计</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{stats.pending}</div>
                  <div className="text-gray-500">待处理</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{stats.confirmed}</div>
                  <div className="text-gray-500">已确认</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-600">{stats.failed}</div>
                  <div className="text-gray-500">失败</div>
                </div>
              </div>
            </div>
          )}

          {/* 说明文字 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help underline decoration-dotted">
                    这里演示了真正的响应式更新效果
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <p>• 数据变化时，数字会直接从1变为2</p>
                    <p>• 不需要刷新浏览器页面</p>
                    <p>• 乐观更新让界面立即响应</p>
                    <p>• 实时同步确保数据一致性</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}