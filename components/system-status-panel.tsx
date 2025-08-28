"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Wrench,
  Activity,
  Database,
  FileText,
  Loader2,
  Info,
  ExternalLink
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import FixTMDBImportBugDialog from "./fix-tmdb-import-bug-dialog"

interface SystemStatus {
  tmdbImport: {
    exists: boolean
    fixed: boolean
    version?: string
    lastError?: string
  }
  storage: {
    type: string
    itemCount: number
    taskCount: number
    healthy: boolean
  }
  scheduler: {
    isInitialized: boolean
    activeTimers: number
    runningTasks: number
    lastError?: string
  }
  python: {
    available: boolean
    version?: string
    packages: string[]
  }
}

interface SystemStatusPanelProps {
  className?: string
}

export default function SystemStatusPanel({ className }: SystemStatusPanelProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFixDialog, setShowFixDialog] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // 加载系统状态
  const loadSystemStatus = async () => {
    setLoading(true)
    try {
      // 并行获取各个系统状态
      const [tmdbResponse, storageResponse] = await Promise.all([
        fetch('/api/fix-tmdb-import-bug').catch(() => null),
        fetch('/api/debug-storage').catch(() => null)
      ])

      const systemStatus: SystemStatus = {
        tmdbImport: {
          exists: false,
          fixed: false
        },
        storage: {
          type: 'unknown',
          itemCount: 0,
          taskCount: 0,
          healthy: false
        },
        scheduler: {
          isInitialized: false,
          activeTimers: 0,
          runningTasks: 0
        },
        python: {
          available: false,
          packages: []
        }
      }

      // 处理 TMDB-Import 状态
      if (tmdbResponse?.ok) {
        const tmdbData = await tmdbResponse.json()
        systemStatus.tmdbImport = {
          exists: tmdbData.exists || false,
          fixed: tmdbData.fixed || false,
          lastError: tmdbData.error
        }
      }

      // 处理存储状态
      if (storageResponse?.ok) {
        const storageData = await storageResponse.json()
        if (storageData.success) {
          systemStatus.storage = {
            type: storageData.storageType || 'unknown',
            itemCount: storageData.itemCount || 0,
            taskCount: storageData.taskCount || 0,
            healthy: storageData.healthy !== false
          }
        }
      }



      setStatus(systemStatus)
    } catch (error) {
      console.error("加载系统状态失败:", error)
      toast({
        title: "加载失败",
        description: "无法获取系统状态信息",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 刷新状态
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadSystemStatus()
    setRefreshing(false)
    toast({
      title: "刷新完成",
      description: "系统状态已更新",
    })
  }

  // 初始加载
  useEffect(() => {
    loadSystemStatus()
  }, [])

  // 获取整体健康状态
  const getOverallHealth = () => {
    if (!status) return { status: 'unknown', score: 0 }
    
    let score = 0
    let maxScore = 0
    
    // TMDB-Import 状态 (30分)
    maxScore += 30
    if (status.tmdbImport.exists) {
      score += 15
      if (status.tmdbImport.fixed) {
        score += 15
      }
    }
    
    // 存储状态 (25分)
    maxScore += 25
    if (status.storage.healthy) {
      score += 25
    }
    
    // 调度器状态 (25分)
    maxScore += 25
    if (status.scheduler.isInitialized) {
      score += 25
    }
    
    // Python环境 (20分)
    maxScore += 20
    if (status.python.available) {
      score += 20
    }
    
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
    
    if (percentage >= 90) return { status: 'excellent', score: percentage }
    if (percentage >= 70) return { status: 'good', score: percentage }
    if (percentage >= 50) return { status: 'warning', score: percentage }
    return { status: 'error', score: percentage }
  }

  const health = getOverallHealth()

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>加载系统状态...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>系统状态</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      {health.status === 'excellent' && (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          优秀
                        </Badge>
                      )}
                      {health.status === 'good' && (
                        <Badge className="bg-blue-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          良好
                        </Badge>
                      )}
                      {health.status === 'warning' && (
                        <Badge className="bg-yellow-500">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          警告
                        </Badge>
                      )}
                      {health.status === 'error' && (
                        <Badge className="bg-red-500">
                          <XCircle className="h-3 w-3 mr-1" />
                          错误
                        </Badge>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>系统健康度: {health.score.toFixed(1)}%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* 健康度进度条 */}
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">系统健康度</span>
              <span className="font-medium">{health.score.toFixed(1)}%</span>
            </div>
            <Progress 
              value={health.score} 
              className={`h-2 ${
                health.status === 'excellent' ? 'bg-green-100' :
                health.status === 'good' ? 'bg-blue-100' :
                health.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
              }`}
            />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* TMDB-Import 状态 */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {status?.tmdbImport.exists ? (
                  status.tmdbImport.fixed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium text-sm">TMDB-Import</span>
              </div>
              
              <div className="text-xs text-muted-foreground">
                {status?.tmdbImport.exists ? (
                  status.tmdbImport.fixed ? '正常运行' : '需要修复'
                ) : '未安装'}
              </div>
            </div>
            
            {status?.tmdbImport.exists && !status.tmdbImport.fixed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFixDialog(true)}
              >
                <Wrench className="h-3 w-3 mr-1" />
                修复
              </Button>
            )}
          </div>

          {/* 存储状态 */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {status?.storage.healthy ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium text-sm">数据存储</span>
              </div>
              
              <div className="text-xs text-muted-foreground">
                {status?.storage.type} • {status?.storage.itemCount} 项目 • {status?.storage.taskCount} 任务
              </div>
            </div>
          </div>



          {/* 问题提醒 */}
          {status && (
            <>
              {!status.tmdbImport.exists && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    TMDB-Import 工具未安装或配置不正确。
                    <Button variant="link" className="p-0 h-auto text-sm" asChild>
                      <a href="https://github.com/your-repo/TMDB-Import" target="_blank" rel="noopener noreferrer">
                        查看安装指南 <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {status.tmdbImport.exists && !status.tmdbImport.fixed && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    检测到 TMDB-Import 中文字符解析错误，建议立即修复。
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-sm ml-2"
                      onClick={() => setShowFixDialog(true)}
                    >
                      立即修复
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              

            </>
          )}
        </CardContent>
      </Card>

      {/* 修复对话框 */}
      <FixTMDBImportBugDialog
        open={showFixDialog}
        onOpenChange={(open) => {
          setShowFixDialog(open)
          if (!open) {
            // 修复完成后刷新状态
            loadSystemStatus()
          }
        }}
      />
    </>
  )
}