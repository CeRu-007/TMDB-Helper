"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Progress } from "@/shared/components/ui/progress"
import { useToast } from "@/lib/hooks/use-toast"
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Calendar,
  Loader2,
  Settings,
  Info
} from "lucide-react"
import { useTranslation } from "react-i18next"

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
  isInstalled: boolean
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
  const { t } = useTranslation("settings")

  // 使用 useRef 存储 onPathUpdate 的最新值，避免 useEffect 重复执行
  const onPathUpdateRef = useRef(onPathUpdate)
  onPathUpdateRef.current = onPathUpdate

  // 缓存功能已禁用，直接返回空函数
  const clearCache = () => {}

  const saveToCache = (_versionData?: VersionInfo | null, _statusData?: InstallStatus | null) => {}

  const loadFromCache = () => {
    return false
  }

  // 检查版本信息
  const checkVersion = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch('/api/external/tmdb-import-updater?action=check')
      const result = await response.json()

      if (result.success) {
        setVersionInfo(result.data)
        saveToCache(result.data, installStatus)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      
      if (showLoading) {
        toast({
          title: t("tmdbImportUpdater.checkVersionFailed"),
          description: error instanceof Error ? error.message : t("tmdbImportUpdater.unknownError"),
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
      const response = await fetch('/api/external/tmdb-import-updater?action=status')
      const result = await response.json()

      if (result.success) {
        setInstallStatus(result.data)
        saveToCache(versionInfo, result.data)
        // 如果已安装，通知父组件更新路径
        if (result.data.installed && onPathUpdateRef.current) {
          onPathUpdateRef.current(result.data.installPath)
        }
      }
    } catch (error) {
      
      if (showLoading) {
        toast({
          title: t("tmdbImportUpdater.getInstallStatusFailed"),
          description: error instanceof Error ? error.message : t("tmdbImportUpdater.unknownError"),
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
      setCurrentStep(t("tmdbImportUpdater.downloading"))
      setProgress(25)

      const downloadResponse = await fetch('/api/external/tmdb-import-updater', {
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
      setCurrentStep(t("tmdbImportUpdater.installing"))
      setProgress(75)

      const installResponse = await fetch('/api/external/tmdb-import-updater', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install' })
      })

      const installResult = await installResponse.json()
      if (!installResult.success) {
        throw new Error(installResult.error)
      }

      setProgress(100)
      setCurrentStep(t("tmdbImportUpdater.installComplete"))

      // 自动设置路径到解压后的目录
      const installPath = installResult.data?.installPath
      const credentialsPreserved = installResult.data?.credentialsPreserved

      let description = t("tmdbImportUpdater.installedSuccess")
      if (installPath && onPathUpdateRef.current) {
        onPathUpdateRef.current(installPath)
        description = t("tmdbImportUpdater.installedAndConfigured")
      }

      if (credentialsPreserved) {
        description += t("tmdbImportUpdater.credentialsPreserved")
      }

      toast({
        title: t("tmdbImportUpdater.installSuccess"),
        description: description,
      })

      // 刷新状态
      await Promise.all([checkVersion(), getInstallStatus()])

    } catch (error) {
      
      toast({
        title: t("tmdbImportUpdater.installFailed"),
        description: error instanceof Error ? error.message : t("tmdbImportUpdater.unknownError"),
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

  // 初始化 - 使用 ref 避免依赖问题
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
  }, []) // 移除 onPathUpdate 依赖，使用 ref 获取最新值

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{t("tmdbImportUpdater.title")}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t("tmdbImportUpdater.description")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              clearCache()
              try {
                await Promise.all([checkVersion(true), getInstallStatus(true)])
              } catch (error) {
                // 刷新失败，错误会在 checkVersion/getInstallStatus 中处理
              }
            }}
            disabled={loading || updating}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t("tmdbImportUpdater.refresh")}
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
                <span className="text-sm text-gray-600 dark:text-gray-400">{t("tmdbImportUpdater.loading")}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 状态和版本信息行 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 安装状态 */}
              {installStatus ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{t("tmdbImportUpdater.installStatus")}</span>
              </div>
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{t("tmdbImportUpdater.toolStatus")}:</span>
                  <Badge variant={installStatus.installed ? "default" : "secondary"} className="text-xs">
                    {installStatus.installed ? t("tmdbImportUpdater.installed") : t("tmdbImportUpdater.notInstalled")}
                  </Badge>
                </div>
                {installStatus.installed && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{t("tmdbImportUpdater.mainModule")}:</span>
                      <Badge variant={installStatus.hasMainModule ? "default" : "destructive"} className="text-xs">
                        {installStatus.hasMainModule ? t("tmdbImportUpdater.normal") : t("tmdbImportUpdater.missing")}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      {t("tmdbImportUpdater.fileCount")} {installStatus.fileCount}
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
                  <span className="text-sm font-medium">{t("tmdbImportUpdater.versionInfo")}</span>
                </div>
                {!versionInfo.isInstalled ? (
                  <Badge variant="secondary" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {t("tmdbImportUpdater.notInstalled")}
                  </Badge>
                ) : versionInfo.needsUpdate ? (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {t("tmdbImportUpdater.needsUpdate")}
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t("tmdbImportUpdater.upToDate")}
                  </Badge>
                )}
              </div>
              <div className="space-y-2 pl-6">
                <div className="text-xs">
                  <div className="text-gray-600 dark:text-gray-400">{t("tmdbImportUpdater.latestVersion")}:</div>
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
                    <div className="text-gray-600 dark:text-gray-400">{t("tmdbImportUpdater.localVersion")}:</div>
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
                    {!versionInfo.isInstalled ? (
                      <span className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1 text-orange-500" />
                        {t("tmdbImportUpdater.notInstalledDesc")}
                      </span>
                    ) : versionInfo.needsUpdate ? (
                      <span className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1 text-orange-500" />
                        {t("tmdbImportUpdater.updateAvailable")}
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                        {t("tmdbImportUpdater.currentIsLatest")}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {!versionInfo.isInstalled || versionInfo.needsUpdate ? (
                      <Button
                        onClick={performUpdate}
                        size="sm"
                        disabled={updating}
                        className="px-4"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {versionInfo.isInstalled ? t("tmdbImportUpdater.updateVersion") : t("tmdbImportUpdater.downloadInstall")}
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
                        {t("tmdbImportUpdater.reinstall")}
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
                        <p className="font-medium">{t("tmdbImportUpdater.installInstructions")}</p>
                        <p className="mt-1">{t("tmdbImportUpdater.reinstallNote")}</p>
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
