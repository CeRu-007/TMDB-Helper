"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Calendar,
  MessageSquare,
  Loader2,
  Settings,
  Info
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
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const { toast } = useToast()

  // 缓存键
  const CACHE_KEYS = {
    VERSION_INFO: 'tmdb_import_version_info',
    INSTALL_STATUS: 'tmdb_import_install_status',
    CACHE_TIMESTAMP: 'tmdb_import_cache_timestamp'
  }

  // 缓存有效期（5分钟）
  const CACHE_DURATION = 5 * 60 * 1000

  // 从缓存加载数据
  const loadFromCache = () => {
    if (typeof window === 'undefined') return false

    try {
      const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP)
      if (!timestamp) return false

      const cacheAge = Date.now() - parseInt(timestamp)
      if (cacheAge > CACHE_DURATION) {
        // 缓存过期，清理
        clearCache()
        return false
      }

      const cachedVersionInfo = localStorage.getItem(CACHE_KEYS.VERSION_INFO)
      const cachedInstallStatus = localStorage.getItem(CACHE_KEYS.INSTALL_STATUS)

      if (cachedVersionInfo) {
        setVersionInfo(JSON.parse(cachedVersionInfo))
      }
      if (cachedInstallStatus) {
        setInstallStatus(JSON.parse(cachedInstallStatus))
      }

      return !!(cachedVersionInfo || cachedInstallStatus)
    } catch (error) {
      console.warn('加载缓存失败:', error)
      clearCache()
      return false
    }
  }

  // 保存到缓存
  const saveToCache = (versionData?: VersionInfo, statusData?: InstallStatus) => {
    if (typeof window === 'undefined') return

    try {
      if (versionData) {
        localStorage.setItem(CACHE_KEYS.VERSION_INFO, JSON.stringify(versionData))
      }
      if (statusData) {
        localStorage.setItem(CACHE_KEYS.INSTALL_STATUS, JSON.stringify(statusData))
      }
      localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString())
    } catch (error) {
      console.warn('保存缓存失败:', error)
    }
  }

  // 清理缓存
  const clearCache = () => {
    if (typeof window === 'undefined') return

    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  // 检查版本信息
  const checkVersion = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch('/api/tmdb-import-updater?action=check')
      const result = await response.json()

      if (result.success) {
        setVersionInfo(result.data)
        saveToCache(result.data, installStatus)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('检查版本失败:', error)
      if (showLoading) {
        toast({
          title: "检查版本失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        })
      }
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // 获取安装状态
  const getInstallStatus = async (showLoading = true) => {
    try {
      const response = await fetch('/api/tmdb-import-updater?action=status')
      const result = await response.json()

      if (result.success) {
        setInstallStatus(result.data)
        saveToCache(versionInfo, result.data)
        // 如果已安装，通知父组件更新路径
        if (result.data.installed && onPathUpdate) {
          onPathUpdate(result.data.installPath)
        }
      }
    } catch (error) {
      console.error('获取安装状态失败:', error)
      if (showLoading) {
        toast({
          title: "获取安装状态失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        })
      }
    }
  }

  // 执行自动下载和安装
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
      setCurrentStep('正在解压和安装...')
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
      setCurrentStep('安装完成')

      // 自动设置路径到解压后的目录
      const installPath = installResult.data?.installPath
      const credentialsPreserved = installResult.data?.credentialsPreserved

      let description = "TMDB-Import 已安装到最新版本"
      if (installPath && onPathUpdate) {
        onPathUpdate(installPath)
        description = "TMDB-Import 已安装并自动配置路径"
      }

      if (credentialsPreserved) {
        description += "，TMDB 用户凭据已保留"
      }

      toast({
        title: "安装成功",
        description: description,
      })

      // 刷新状态
      await Promise.all([checkVersion(), getInstallStatus()])

    } catch (error) {
      console.error('安装失败:', error)
      toast({
        title: "安装失败",
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
    const initializeComponent = async () => {
      // 首先尝试从缓存加载
      const hasCachedData = loadFromCache()

      if (hasCachedData) {
        // 有缓存数据，在后台静默刷新
        setIsInitialLoad(false)
        setTimeout(() => {
          checkVersion(false)
          getInstallStatus(false)
        }, 100)
      } else {
        // 没有缓存数据，显示加载状态
        setLoading(true)
        try {
          await Promise.all([
            checkVersion(false),
            getInstallStatus(false)
          ])
        } finally {
          setLoading(false)
          setIsInitialLoad(false)
        }
      }
    }

    initializeComponent()
  }, [onPathUpdate])

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">TMDB-Import 工具管理</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                自动管理 TMDB-Import 工具的下载、安装和更新
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearCache()
              Promise.all([checkVersion(true), getInstallStatus(true)])
            }}
            disabled={loading || updating}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            刷新
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 加载状态 */}
        {isInitialLoad && loading && !versionInfo && !installStatus ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">正在加载工具信息...</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 状态和版本信息行 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 安装状态 */}
              {installStatus ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">安装状态</span>
              </div>
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">工具状态:</span>
                  <Badge variant={installStatus.installed ? "default" : "secondary"} className="text-xs">
                    {installStatus.installed ? "已安装" : "未安装"}
                  </Badge>
                </div>
                {installStatus.installed && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">主模块:</span>
                      <Badge variant={installStatus.hasMainModule ? "default" : "destructive"} className="text-xs">
                        {installStatus.hasMainModule ? "正常" : "缺失"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      文件数: {installStatus.fileCount}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : loading && !installStatus ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ) : loading && !installStatus ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ) : null}

          {/* 版本信息 */}
          {versionInfo ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">版本信息</span>
                </div>
                {versionInfo.needsUpdate ? (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    需要更新
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    最新版本
                  </Badge>
                )}
              </div>
              <div className="space-y-2 pl-6">
                <div className="text-xs">
                  <div className="text-gray-600 dark:text-gray-400">最新版本:</div>
                  <div className="flex items-center space-x-1 mt-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-800 dark:text-gray-200">
                      {formatDate(versionInfo.remote.commitDate)}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 mt-1 truncate">
                    {versionInfo.remote.commitMessage}
                  </div>
                </div>
                {versionInfo.local?.exists && versionInfo.local.commitDate && (
                  <div className="text-xs">
                    <div className="text-gray-600 dark:text-gray-400">本地版本:</div>
                    <div className="flex items-center space-x-1 mt-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-800 dark:text-gray-200">
                        {formatDate(versionInfo.local.commitDate)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : loading && !versionInfo ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="space-y-2 pl-6">
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ) : null}
        </div>

        {/* 操作区域 */}
        {versionInfo && (
          <div className="border-t pt-4">
            {updating ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium">{currentStep}</span>
                </div>
                <Progress value={progress} className="w-full h-2" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {versionInfo.needsUpdate ? (
                      <span className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1 text-orange-500" />
                        发现新版本可用，建议更新
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                        当前已是最新版本
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {versionInfo.needsUpdate ? (
                      <Button
                        onClick={performUpdate}
                        size="sm"
                        disabled={updating}
                        className="px-4"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {installStatus?.installed ? '更新版本' : '下载安装'}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={performUpdate}
                        size="sm"
                        disabled={updating}
                        className="px-4"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        重新安装
                      </Button>
                    )}
                  </div>
                </div>

                {/* 凭据保留说明 */}
                {installStatus?.installed && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-800 dark:text-blue-200">
                        <p className="font-medium">安装说明</p>
                        <p className="mt-1">重新安装时会使用最新版本的默认配置，但会自动保留您的 TMDB 用户名和密码。</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
