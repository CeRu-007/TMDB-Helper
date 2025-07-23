"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Folder,
  GitBranch,
  Calendar,
  MessageSquare,
  Loader2
} from "lucide-react"

interface VersionInfo {
  local?: {
    commitSha?: string
    commitDate?: string
    commitMessage?: string
    exists: boolean
  }
  remote: {
    commitSha: string
    commitDate: string
    commitMessage: string
    htmlUrl?: string
  }
  needsUpdate: boolean
}

interface InstallStatus {
  installed: boolean
  hasMainModule: boolean
  hasConfigFile: boolean
  installPath: string
  fileCount: number
}

interface TMDBImportUpdaterProps {
  onPathUpdate?: (path: string) => void
}

export default function TMDBImportUpdater({ onPathUpdate }: TMDBImportUpdaterProps) {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [installStatus, setInstallStatus] = useState<InstallStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const { toast } = useToast()

  // 检查版本信息
  const checkVersion = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tmdb-import-updater?action=check')
      const result = await response.json()
      
      if (result.success) {
        setVersionInfo(result.data)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('检查版本失败:', error)
      toast({
        title: "检查版本失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 获取安装状态
  const getInstallStatus = async () => {
    try {
      const response = await fetch('/api/tmdb-import-updater?action=status')
      const result = await response.json()
      
      if (result.success) {
        setInstallStatus(result.data)
        // 如果已安装，通知父组件更新路径
        if (result.data.installed && onPathUpdate) {
          onPathUpdate(result.data.installPath)
        }
      }
    } catch (error) {
      console.error('获取安装状态失败:', error)
    }
  }

  // 执行更新
  const performUpdate = async () => {
    setUpdating(true)
    setProgress(0)
    
    try {
      // 步骤1: 下载
      setCurrentStep('正在下载最新版本...')
      setProgress(25)
      
      const downloadResponse = await fetch('/api/tmdb-import-updater', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download' })
      })
      
      const downloadResult = await downloadResponse.json()
      if (!downloadResult.success) {
        throw new Error(downloadResult.error)
      }
      
      setProgress(50)
      
      // 步骤2: 安装
      setCurrentStep('正在安装更新...')
      setProgress(75)
      
      const installResponse = await fetch('/api/tmdb-import-updater', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install' })
      })
      
      const installResult = await installResponse.json()
      if (!installResult.success) {
        throw new Error(installResult.error)
      }
      
      setProgress(100)
      setCurrentStep('更新完成')
      
      toast({
        title: "更新成功",
        description: "TMDB-Import 已更新到最新版本",
      })
      
      // 刷新状态
      await Promise.all([checkVersion(), getInstallStatus()])
      
    } catch (error) {
      console.error('更新失败:', error)
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
      setProgress(0)
      setCurrentStep('')
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 初始化
  useEffect(() => {
    checkVersion()
    getInstallStatus()
  }, [])

  return (
    <div className="space-y-6">
      {/* 标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">TMDB-Import 自动更新</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            自动管理 TMDB-Import 工具的下载、安装和更新
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => Promise.all([checkVersion(), getInstallStatus()])}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          刷新
        </Button>
      </div>

      {/* 安装状态卡片 */}
      {installStatus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Folder className="h-4 w-4 mr-2" />
              安装状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">工具状态:</span>
              <Badge variant={installStatus.installed ? "default" : "secondary"}>
                {installStatus.installed ? "已安装" : "未安装"}
              </Badge>
            </div>
            
            {installStatus.installed && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">主模块:</span>
                  <Badge variant={installStatus.hasMainModule ? "default" : "destructive"}>
                    {installStatus.hasMainModule ? "正常" : "缺失"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">配置文件:</span>
                  <Badge variant={installStatus.hasConfigFile ? "default" : "secondary"}>
                    {installStatus.hasConfigFile ? "存在" : "不存在"}
                  </Badge>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  路径: {installStatus.installPath}
                  <br />
                  文件数: {installStatus.fileCount}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 版本信息卡片 */}
      {versionInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center">
                <GitBranch className="h-4 w-4 mr-2" />
                版本信息
              </div>
              {versionInfo.needsUpdate && (
                <Badge variant="destructive">需要更新</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 远程版本 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">最新版本 (GitHub)</span>
                {versionInfo.remote.htmlUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(versionInfo.remote.htmlUrl, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg space-y-1">
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(versionInfo.remote.commitDate)}
                </div>
                <div className="flex items-start text-xs">
                  <MessageSquare className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-800 dark:text-gray-200">
                    {versionInfo.remote.commitMessage}
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                  {versionInfo.remote.commitSha.substring(0, 8)}
                </div>
              </div>
            </div>

            {/* 本地版本 */}
            {versionInfo.local?.exists && (
              <div className="space-y-2">
                <span className="text-sm font-medium">当前版本 (本地)</span>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg space-y-1">
                  {versionInfo.local.commitDate ? (
                    <>
                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(versionInfo.local.commitDate)}
                      </div>
                      <div className="flex items-start text-xs">
                        <MessageSquare className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-800 dark:text-gray-200">
                          {versionInfo.local.commitMessage}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {versionInfo.local.commitSha?.substring(0, 8)}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      版本信息不可用（旧版本安装）
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 更新操作 */}
      {versionInfo && (
        <Card>
          <CardContent className="p-6">
            {updating ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{currentStep}</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            ) : versionInfo.needsUpdate ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    发现新版本可用，建议更新以获得最新功能和修复。
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={performUpdate}
                  className="w-full"
                  disabled={updating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {installStatus?.installed ? '更新到最新版本' : '下载并安装'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    当前已是最新版本，无需更新。
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  onClick={performUpdate}
                  className="w-full"
                  disabled={updating}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重新安装
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
