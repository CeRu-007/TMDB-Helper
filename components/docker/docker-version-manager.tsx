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
  Info,
  Server
} from "lucide-react"

interface VersionInfo {
  local?: {
    version?: string
    lastUpdated?: string
    exists: boolean
  }
  remote: {
    version: string
    lastUpdated: string
n  }
  needsUpdate: boolean
}

interface InstallStatus {
  installed: boolean
  isDockerEnvironment: boolean
  containerId?: string
  containerName?: string
}

export default function DockerVersionManager() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [installStatus, setInstallStatus] = useState<InstallStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [dockerHubRegistry, setDockerHubRegistry] = useState('https://hub.docker.com')
  const { toast } = useToast()

  // 检查版本信息
  const checkVersion = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      // 构造带registry参数的URL
      const url = `/api/docker-version-manager?action=check&registry=${encodeURIComponent(dockerHubRegistry)}`;
      const response = await fetch(url)
      const result = await response.json()

      if (result.success) {
        setVersionInfo(result.data)
      } else {
        throw new Error(result.error || result.details || "未知错误")
      }
    } catch (error) {
      console.error('检查版本失败:', error)
      // 即使出错也要更新状态，避免一直显示加载状态
      setVersionInfo(null)
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
      const response = await fetch('/api/docker-version-manager?action=status')
      const result = await response.json()

      if (result.success) {
        setInstallStatus(result.data)
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

  // 执行更新
  const performUpdate = async () => {
    setUpdating(true)
    setProgress(0)

    try {
      // 步骤1: 下载
      setCurrentStep('正在拉取最新镜像...')
      setProgress(25)

      const downloadResponse = await fetch('/api/docker-version-manager', {
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
      setCurrentStep('正在重启容器...')
      setProgress(75)

      const installResponse = await fetch('/api/docker-version-manager', {
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
        description: "Docker镜像已更新到最新版本",
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
    const initializeComponent = async () => {
      setLoading(true)
      try {
        // 初始化时也传递镜像源参数
        const url = `/api/docker-version-manager?action=check&registry=${encodeURIComponent(dockerHubRegistry)}`;
        const [versionResponse, statusResponse] = await Promise.all([
          fetch(url),
          fetch('/api/docker-version-manager?action=status')
        ]);
        
        const versionResult = await versionResponse.json();
        const statusResult = await statusResponse.json();
        
        if (versionResult.success) {
          setVersionInfo(versionResult.data);
        }
        
        if (statusResult.success) {
          setInstallStatus(statusResult.data);
        }
      } catch (error) {
        console.error('初始化失败:', error);
        toast({
          title: "初始化失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setIsInitialLoad(false);
      }
    };

    initializeComponent();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Docker镜像版本管理</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                自动管理Docker镜像的下载、安装和更新
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => Promise.all([checkVersion(true), getInstallStatus(true)])}
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
                <span className="text-sm text-gray-600 dark:text-gray-400">正在加载版本信息...</span>
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
                      <span className="text-xs text-gray-600 dark:text-gray-400">环境状态:</span>
                      <Badge variant={installStatus.isDockerEnvironment ? "default" : "secondary"} className="text-xs">
                        {installStatus.isDockerEnvironment ? "Docker环境" : "非Docker环境"}
                      </Badge>
                    </div>
                    {installStatus.isDockerEnvironment && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-400">容器状态:</span>
                          <Badge variant={installStatus.installed ? "default" : "destructive"} className="text-xs">
                            {installStatus.installed ? "已安装" : "未安装"}
                          </Badge>
                        </div>
                        {installStatus.containerName && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            容器名称: {installStatus.containerName}
                          </div>
                        )}
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
                          {formatDate(versionInfo.remote.lastUpdated)}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {versionInfo.remote.version}
                      </div>
                    </div>
                    {versionInfo.local?.exists && versionInfo.local.lastUpdated && (
                      <div className="text-xs">
                        <div className="text-gray-600 dark:text-gray-400">本地版本:</div>
                        <div className="flex items-center space-x-1 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-800 dark:text-gray-200">
                            {formatDate(versionInfo.local.lastUpdated)}
                          </span>
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 mt-1 truncate">
                          {versionInfo.local.version}
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

            {/* 镜像源配置 */}
            <div className="border-t pt-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Docker Hub 镜像源</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={dockerHubRegistry}
                    onChange={(e) => setDockerHubRegistry(e.target.value)}
                  >
                    <option value="https://hub.docker.com">官方源 (https://hub.docker.com)</option>
                    <option value="https://docker.mirrors.ustc.edu.cn">中科大镜像源 (https://docker.mirrors.ustc.edu.cn)</option>
                    <option value="https://registry.cn-hangzhou.aliyuncs.com">阿里云镜像源 (https://registry.cn-hangzhou.aliyuncs.com)</option>
                    <option value="https://mirror.ccs.tencentyun.com">腾讯云镜像源 (https://mirror.ccs.tencentyun.com)</option>
                  </select>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  为了改善在中国大陆的访问速度，您可以选择使用国内镜像源。
                  不同镜像源的可用性和速度可能有所差异，请根据实际情况选择。
                </p>
              </div>
            </div>

            {/* 操作区域 */}
            {versionInfo && installStatus?.isDockerEnvironment && (
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
                            <p className="mt-1">更新时会保留容器的配置、端口映射和挂载卷，但会使用最新的镜像重新创建容器。</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 非Docker环境提示 */}
            {installStatus && !installStatus.isDockerEnvironment && (
              <div className="border-t pt-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium">环境提示</p>
                      <p className="mt-1">此功能仅在Docker容器环境中可用。您当前似乎正在直接运行应用，而不是在Docker容器中运行。</p>
                      <p className="mt-1">要使用Docker镜像版本管理功能，请使用Docker部署此应用。</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}