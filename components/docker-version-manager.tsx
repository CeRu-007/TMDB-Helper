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
  registry?: string
}

interface VersionHistory {
  version: string
  releaseDate: string
  changelog: string[]
}

interface UpdateStatus {
  phase: 'idle' | 'checking' | 'downloading' | 'installing' | 'verifying' | 'completed' | 'failed'
  progress: number
  message: string
  error?: string
}

interface DockerValidation {
  name: string
  success: boolean
  error?: string
  version?: string
}

interface RegistrySpeed {
  registry: string
  speed: number
  status: 'testing' | 'completed' | 'failed'
}

export default function DockerVersionManager() {
  const { toast } = useToast()
  const [versionInfo, setVersionInfo] = useState<DockerVersionInfo | null>(null)
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    phase: 'idle',
    progress: 0,
    message: ''
  })
  const [isDockerEnvironment, setIsDockerEnvironment] = useState(true)
  const [dockerHubRegistry, setDockerHubRegistry] = useState('https://hub.docker.com')
  const [dockerValidation, setDockerValidation] = useState<DockerValidation[]>([])
  const [registrySpeeds, setRegistrySpeeds] = useState<RegistrySpeed[]>([])
  const [containerInfo, setContainerInfo] = useState<any>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  
  // 测试镜像源速度
  const testRegistrySpeed = async (registry: string): Promise<number> => {
    const start = Date.now()
    try {
      const registryParam = registry === 'https://hub.docker.com' ? '' : `&registry=${encodeURIComponent(registry)}`
      const response = await fetch(`/api/docker-version-manager?action=check${registryParam}`, {
        signal: AbortSignal.timeout(5000)
      })
      if (response.ok) {
        return Date.now() - start
      }
      return Infinity
    } catch {
      return Infinity
    }
  }

  // 测试所有镜像源速度
  const testAllRegistrySpeeds = async () => {
    const registries = [
      'https://hub.docker.com',
      'https://docker.mirrors.ustc.edu.cn',
      'https://registry.cn-hangzhou.aliyuncs.com',
      'https://mirror.ccs.tencentyun.com'
    ]

    const initialSpeeds: RegistrySpeed[] = registries.map(registry => ({
      registry,
      speed: 0,
      status: 'testing'
    }))
    
    setRegistrySpeeds(initialSpeeds)

    const speedTests = registries.map(async (registry) => {
      const speed = await testRegistrySpeed(registry)
      return { registry, speed, status: speed === Infinity ? 'failed' : 'completed' as const }
    })

    const results = await Promise.all(speedTests)
    setRegistrySpeeds(results)
    
    // 自动选择最快的镜像源
    const fastest = results.filter(r => r.status === 'completed').sort((a, b) => a.speed - b.speed)[0]
    if (fastest && fastest.registry !== dockerHubRegistry) {
      setDockerHubRegistry(fastest.registry)
      toast({
        title: "自动选择最快镜像源",
        description: `已切换到响应时间最短的镜像源 (${fastest.speed}ms)`
      })
    }
  }

  // 获取版本信息
  const fetchVersionInfo = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true)
      }
      setLastError(null)
      
      // 调用API获取版本信息，传递当前选择的镜像源参数
      const registryParam = dockerHubRegistry === 'https://hub.docker.com' ? '' : `&registry=${encodeURIComponent(dockerHubRegistry)}`
      const url = `/api/docker-version-manager?action=check${registryParam}`
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000) // 30秒超时
      })
      
      if (response.status === 404) {
        throw new Error('API端点未找到，请检查服务器配置')
      }
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to fetch version info')
      }
      
      // 处理API返回的数据结构
      if (data.success && data.data) {
        const { local, remote, needsUpdate } = data.data
        setVersionInfo({
          currentVersion: local?.version || 'unknown',
          latestVersion: remote?.version || 'unknown',
          isUpdateAvailable: needsUpdate || false,
          lastChecked: new Date().toISOString(),
          registry: remote?.registry || dockerHubRegistry
        })
      } else {
        throw new Error(data.error || 'Invalid response format')
      }
      
      // 获取版本历史记录
      try {
        const historyResponse = await fetch('/api/docker-version-manager?action=history')
        if (historyResponse.ok) {
          const historyData: VersionHistory[] = await historyResponse.json()
          setVersionHistory(historyData)
        }
      } catch (historyError) {
        console.warn('Failed to fetch version history:', historyError)
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[DockerVersionManager] Error fetching version info:', error)
      setLastError(errorMessage)
      
      toast({
        title: "获取版本信息失败",
        description: errorMessage.includes('timeout') ? 
          "请求超时，请检查网络连接" : 
          "无法连接到版本服务器，请稍后重试",
        variant: "destructive"
      })
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }
  
  // 执行更新
  const performUpdate = async () => {
    try {
      setIsUpdating(true)
      setUpdateStatus({
        phase: 'checking',
        progress: 10,
        message: '正在进行预检查...'
      })
      
      // 调用API执行更新
      const response = await fetch('/api/docker-version-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'install' }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to initiate update')
      }
      
      if (data.success) {
        // 模拟更新进度
        const phases = [
          { phase: 'downloading' as const, progress: 30, message: '正在下载新镜像...' },
          { phase: 'installing' as const, progress: 60, message: '正在安装更新...' },
          { phase: 'verifying' as const, progress: 90, message: '正在验证更新...' },
          { phase: 'completed' as const, progress: 100, message: '更新完成！' }
        ]
        
        for (const phaseInfo of phases) {
          setUpdateStatus(phaseInfo)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        // 更新完成后刷新版本信息
        await fetchVersionInfo(false)
        
        toast({
          title: "更新成功",
          description: data.rolledBack ? 
            "更新失败，已自动回滚到之前版本" : 
            `Docker镜像已更新到 ${data.data?.versionInfo?.version || '最新版本'}`
        })
      } else {
        throw new Error(data.error || 'Update failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[DockerVersionManager] Error performing update:', error)
      
      setUpdateStatus({
        phase: 'failed',
        progress: 0,
        message: '更新失败',
        error: errorMessage
      })
      
      toast({
        title: "更新失败",
        description: errorMessage.includes('回滚') ? 
          errorMessage : 
          "更新过程中出现错误，请查看详细信息或重试",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
      // 3秒后重置状态
      setTimeout(() => {
        setUpdateStatus({
          phase: 'idle',
          progress: 0,
          message: ''
        })
      }, 3000)
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
          setContainerInfo(data.data.containerInfo)
          setDockerValidation(data.data.dockerValidation || [])
          
          // 如果在Docker环境中，获取版本信息并测试镜像源速度
          if (data.data.isDockerEnvironment) {
            fetchVersionInfo()
            testAllRegistrySpeeds()
          }
        } else {
          setIsDockerEnvironment(false)
        }
      } catch (error) {
        console.error('[DockerVersionManager] Error checking environment:', error)
        setIsDockerEnvironment(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkDockerEnvironment()
  }, [])

  // 当镜像源改变时，重新获取版本信息
  useEffect(() => {
    if (isDockerEnvironment && dockerHubRegistry) {
      fetchVersionInfo(false)
    }
  }, [dockerHubRegistry])
  
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
            <Server className="h-5 w-5 mr-2" />
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
                disabled={isLoading || isUpdating}
              >
                <option value="https://hub.docker.com">官方源 (https://hub.docker.com)</option>
                <option value="https://docker.mirrors.ustc.edu.cn">中科大镜像源 (https://docker.mirrors.ustc.edu.cn)</option>
                <option value="https://registry.cn-hangzhou.aliyuncs.com">阿里云镜像源 (https://registry.cn-hangzhou.aliyuncs.com)</option>
                <option value="https://mirror.ccs.tencentyun.com">腾讯云镜像源 (https://mirror.ccs.tencentyun.com)</option>
              </select>
            </div>
            
            {/* 镜像源速度测试结果 */}
            {registrySpeeds.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">镜像源响应时间</label>
                <div className="grid grid-cols-1 gap-2">
                  {registrySpeeds.map((speed) => (
                    <div key={speed.registry} className="flex items-center justify-between p-2 border rounded text-sm">
                      <span className="truncate">
                        {speed.registry.includes('ustc') ? '中科大' : 
                         speed.registry.includes('aliyun') ? '阿里云' : 
                         speed.registry.includes('tencentyun') ? '腾讯云' : 
                         '官方源'}
                      </span>
                      <div className="flex items-center">
                        {speed.status === 'testing' && (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        )}
                        <span className={`${
                          speed.status === 'failed' ? 'text-red-500' :
                          speed.speed < 1000 ? 'text-green-500' :
                          speed.speed < 3000 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {speed.status === 'testing' ? '测试中...' :
                           speed.status === 'failed' ? '连接失败' :
                           `${speed.speed}ms`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testAllRegistrySpeeds}
                  disabled={isLoading || isUpdating}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  重新测试速度
                </Button>
              </div>
            )}
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              为了改善在中国大陆的访问速度，您可以选择使用国内镜像源。
              系统会自动测试各镜像源的响应时间，并推荐最快的源。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Docker环境状态 */}
      {containerInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2" />
              容器信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">容器名称:</span>
                  <span className="text-sm font-medium">{containerInfo.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">当前镜像:</span>
                  <span className="text-sm font-medium truncate" title={containerInfo.image}>
                    {containerInfo.image || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">创建时间:</span>
                  <span className="text-sm font-medium">
                    {containerInfo.created ? new Date(containerInfo.created).toLocaleString('zh-CN') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">运行状态:</span>
                  <Badge variant={containerInfo.state === 'running' ? 'default' : 'destructive'}>
                    {containerInfo.state || 'unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Docker配置验证 */}
      {dockerValidation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Docker配置检查
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dockerValidation.map((check, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{check.name}</span>
                  <div className="flex items-center">
                    {check.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span className={`text-sm ${check.success ? 'text-green-600' : 'text-red-600'}`}>
                      {check.success ? '正常' : '异常'}
                    </span>
                    {check.version && (
                      <span className="text-xs text-gray-500 ml-2">({check.version})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
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
              
              {/* 错误信息显示 */}
              {lastError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">获取版本信息时出现错误</p>
                      <p className="text-sm">{lastError}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fetchVersionInfo()}
                        disabled={isLoading}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        重试
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {versionInfo && !lastError && (
                <>
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
                                {updateStatus.message || '更新中...'}
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
                            <div className="flex items-center justify-between text-sm">
                              <span>{updateStatus.message}</span>
                              <span>{updateStatus.progress}%</span>
                            </div>
                            <Progress value={updateStatus.progress} className="w-full" />
                            {updateStatus.phase === 'failed' && updateStatus.error && (
                              <p className="text-xs text-red-500 mt-2">
                                错误详情: {updateStatus.error}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {updateStatus.phase === 'completed' ? 
                                '更新完成，容器将自动重启' : 
                                '正在更新Docker镜像，请勿关闭应用...'}
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
            </>
          )}
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  const response = await fetch('/api/docker-version-manager/logs')
                  const data = await response.json()
                  if (data.success) {
                    const logWindow = window.open('', '_blank')
                    if (logWindow) {
                      logWindow.document.write(`
                        <html>
                          <head><title>Docker版本管理日志</title></head>
                          <body style="font-family: monospace; padding: 20px;">
                            <h2>Docker版本管理操作日志</h2>
                            <p>共 ${data.total} 条记录</p>
                            <pre>${JSON.stringify(data.data, null, 2)}</pre>
                          </body>
                        </html>
                      `)
                      logWindow.document.close()
                    }
                  }
                } catch (error) {
                  toast({
                    title: "获取日志失败",
                    description: "无法获取操作日志",
                    variant: "destructive"
                  })
                }
              }}
              disabled={isLoading || isUpdating}
              size="sm"
            >
              <Info className="h-4 w-4 mr-2" />
              查看日志
            </Button>
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