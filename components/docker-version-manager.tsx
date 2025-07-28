"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import {
  Download,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Calendar,
  Tag,
  ArrowUpRight,
  Loader2,
  Server
} from "lucide-react"

interface DockerVersionInfo {
  currentVersion: string
  latestVersion: string
  isUpdateAvailable: boolean
  lastChecked: string
}

interface VersionHistory {
  version: string
  releaseDate: string
  changelog: string[]
}

export default function DockerVersionManager() {
  const { toast } = useToast()
  const [versionInfo, setVersionInfo] = useState<DockerVersionInfo | null>(null)
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [isDockerEnvironment, setIsDockerEnvironment] = useState(true)
  const [dockerHubRegistry, setDockerHubRegistry] = useState('https://docker.mirrors.ustc.edu.cn')
  
  // 获取版本信息
  const fetchVersionInfo = async () => {
    try {
      setIsLoading(true)
      
      // 调用API获取版本信息，传递当前选择的镜像源参数
      const registryParam = dockerHubRegistry === 'https://hub.docker.com' ? '' : `&registry=${encodeURIComponent(dockerHubRegistry)}`;
      const url = `/api/docker-version-manager?action=check${registryParam}`
      const response = await fetch(url)
      
      // 处理404错误
      if (response.status === 404) {
        throw new Error('API端点未找到，请检查服务器配置')
      }
      
      const data = await response.json()
      
      if (!response.ok) {
        // 如果API返回错误，显示具体的错误信息
        throw new Error(data.details || 'Failed to fetch version info')
      }
      
      setVersionInfo(data)
      
      // 获取版本历史记录
      const historyResponse = await fetch('/api/docker-version-manager?action=history')
      if (historyResponse.ok) {
        const historyData: VersionHistory[] = await historyResponse.json()
        setVersionHistory(historyData)
      }
    } catch (error) {
      console.error('[DockerVersionManager] Error fetching version info:', error)
      toast({
        title: "获取版本信息失败",
        description: "无法连接到版本服务器，请稍后重试",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // 执行更新
  const performUpdate = async () => {
    try {
      setIsUpdating(true)
      setUpdateProgress(0)
      
      // 调用API执行更新
        const response = await fetch('/api/docker-version-manager', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'install' }),
        })
      
      if (!response.ok) {
        throw new Error('Failed to initiate update')
      }
      
      const data = await response.json()
      
      if (data.success) {
        // 更新进度条到100%
        setUpdateProgress(100)
        
        // 更新完成后刷新版本信息
        await fetchVersionInfo()
        
        toast({
          title: "更新成功",
          description: "Docker镜像已更新到最新版本"
        })
      } else {
        throw new Error(data.error || 'Update failed')
      }
    } catch (error) {
      console.error('[DockerVersionManager] Error performing update:', error)
      toast({
        title: "更新失败",
        description: "更新过程中出现错误，请查看日志或重试",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
      setUpdateProgress(0)
    }
  }
  
  useEffect(() => {
    // 检查是否在Docker环境中运行
    const checkDockerEnvironment = async () => {
      try {
        const response = await fetch('/api/docker-version-manager?action=status')
        if (response.ok) {
          const data = await response.json()
          setIsDockerEnvironment(data.data.isDockerEnvironment)
          
          // 如果在Docker环境中，获取版本信息
          if (data.data.isDockerEnvironment) {
            fetchVersionInfo()
          }
        } else {
          // 如果API调用失败，假设不在Docker环境中
          setIsDockerEnvironment(false)
        }
      } catch (error) {
        console.error('[DockerVersionManager] Error checking environment:', error)
        setIsDockerEnvironment(false)
      }
    }

    checkDockerEnvironment()
  }, [])
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">正在检查版本信息...</span>
      </div>
    )
  }
  
  // 如果不在Docker环境中，显示提示信息
  if (!isDockerEnvironment) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Docker镜像版本管理
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="mb-2">此功能仅在Docker容器环境中可用。</p>
                <p>您当前似乎正在直接运行应用，而不是在Docker容器中运行。</p>
                <p className="mt-2">要使用Docker镜像版本管理功能，请使用Docker部署此应用。</p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* 镜像源配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            镜像源配置
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
      
      {/* 版本状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Docker镜像版本
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {versionInfo && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Tag className="h-4 w-4 mr-1" />
                    当前版本
                  </div>
                  <div className="font-medium">{versionInfo.currentVersion}</div>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    最新版本
                  </div>
                  <div className="font-medium">{versionInfo.latestVersion}</div>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Clock className="h-4 w-4 mr-1" />
                    最后检查
                  </div>
                  <div className="font-medium">
                    {new Date(versionInfo.lastChecked).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                   <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                     <Server className="h-4 w-4 mr-1" />
                     当前镜像源
                   </div>
                   <div className="font-medium truncate" title={dockerHubRegistry}>
                     {dockerHubRegistry.includes('ustc') ? '中科大' : 
                      dockerHubRegistry.includes('aliyun') ? '阿里云' : 
                      dockerHubRegistry.includes('tencentyun') ? '腾讯云' : 
                      '官方源'}
                   </div>
                 </div>
              </div>
              
              {versionInfo.isUpdateAvailable ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-medium">发现新版本可用</span>
                        <span className="ml-2 text-sm">从 {versionInfo.currentVersion} 更新到 {versionInfo.latestVersion}</span>
                      </div>
                      <Button 
                        onClick={performUpdate}
                        disabled={isUpdating}
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            更新中...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            一键更新
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {isUpdating && (
                      <div className="mt-3 space-y-2">
                        <Progress value={updateProgress} className="w-full" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          正在更新Docker镜像，请勿关闭应用...
                        </p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span className="text-green-800 dark:text-green-200">您使用的是最新版本</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        最新
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
          
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={fetchVersionInfo}
              disabled={isLoading || isUpdating}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              重新检查
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 版本历史记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            版本历史记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {versionHistory.map((version, index) => (
                <div key={version.version} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center">
                      <Tag className="h-4 w-4 mr-2" />
                      {version.version}
                    </h3>
                    <Badge variant="secondary">{version.releaseDate}</Badge>
                  </div>
                  <ul className="text-sm space-y-1">
                    {version.changelog.map((change, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}