"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Package,
  Globe,
  Terminal,
  Info,
  Loader2
} from "lucide-react"

interface DependencyStatus {
  python: {
    available: boolean
    version?: string
    path?: string
  }
  packages: {
    [key: string]: boolean
  }
}

interface InstallProgress {
  step: string
  status: 'running' | 'success' | 'error'
  output: string
  progress?: number
}

interface InstallResult {
  results: InstallProgress[]
  summary: {
    total: number
    success: number
    failed: number
  }
}

const PYTHON_PACKAGES = [
  {
    name: 'playwright',
    displayName: 'Playwright',
    description: '现代化的浏览器自动化框架'
  },
  {
    name: 'python-dateutil',
    displayName: 'Python DateUtil',
    description: '强大的日期时间处理库'
  },
  {
    name: 'Pillow',
    displayName: 'Pillow (PIL)',
    description: 'Python图像处理库'
  },
  {
    name: 'bordercrop',
    displayName: 'BorderCrop',
    description: '图像边框裁剪工具'
  }
]

export default function DependencyInstaller() {
  const { toast } = useToast()
  const [status, setStatus] = useState<DependencyStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState<InstallProgress[]>([])
  // 移除activeTab状态，因为现在是统一界面

  // 检查依赖状态
  const checkDependencies = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/install-dependencies')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data)
      } else {
        toast({
          title: "检查失败",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "检查失败",
        description: "无法检查依赖状态",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 安装Python包
  const installPythonPackages = async () => {
    if (!status?.python.available) {
      toast({
        title: "Python未安装",
        description: "请先安装Python环境",
        variant: "destructive"
      })
      return
    }

    setInstalling(true)
    setInstallProgress([])

    try {
      const packagesToInstall = PYTHON_PACKAGES
        .filter(pkg => !status.packages[pkg.name])
        .map(pkg => pkg.name)

      if (packagesToInstall.length === 0) {
        toast({
          title: "无需安装",
          description: "所有Python包都已安装",
        })
        setInstalling(false)
        return
      }

      const response = await fetch('/api/install-dependencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          packages: packagesToInstall,
          type: 'python'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setInstallProgress(data.data.results)
        toast({
          title: "安装完成",
          description: `成功安装 ${data.data.summary.success} 个包`,
        })
        // 重新检查状态
        await checkDependencies()
      } else {
        toast({
          title: "安装失败",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "安装失败",
        description: "网络错误或服务器异常",
        variant: "destructive"
      })
    } finally {
      setInstalling(false)
    }
  }

  // 安装Playwright浏览器
  const installPlaywrightBrowsers = async () => {
    if (!status?.python.available || !status.packages.playwright) {
      toast({
        title: "前置条件不满足",
        description: "请先安装Python和Playwright包",
        variant: "destructive"
      })
      return
    }

    setInstalling(true)
    setInstallProgress([])

    try {
      const response = await fetch('/api/install-dependencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          packages: [],
          type: 'playwright'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setInstallProgress(data.data.results)
        toast({
          title: "浏览器安装完成",
          description: "Chromium浏览器安装成功",
        })
      } else {
        toast({
          title: "浏览器安装失败",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "浏览器安装失败",
        description: "网络错误或服务器异常",
        variant: "destructive"
      })
    } finally {
      setInstalling(false)
    }
  }

  // 组件加载时检查依赖状态
  useEffect(() => {
    checkDependencies()
  }, [])

  const getStatusIcon = (isInstalled: boolean, isLoading: boolean = false) => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    }
    return isInstalled ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getStatusBadge = (isInstalled: boolean) => {
    return (
      <Badge variant={isInstalled ? "default" : "destructive"}>
        {isInstalled ? "已安装" : "未安装"}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <Package className="h-5 w-5 mr-2" />
          依赖安装
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          一键安装TMDB-Import工具所需的第三方库和浏览器环境
        </p>
      </div>

      {/* Python环境检查 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Terminal className="h-4 w-4 mr-2" />
            Python环境
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">检查Python环境...</span>
            </div>
          ) : status ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(status.python.available)}
                <div>
                  <div className="font-medium">
                    {status.python.available ? "Python已安装" : "Python未安装"}
                  </div>
                  {status.python.version && (
                    <div className="text-sm text-gray-500">
                      {status.python.version} ({status.python.path})
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={checkDependencies}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">加载中...</div>
          )}
        </CardContent>
      </Card>

      {/* Python依赖包 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Python依赖包
            </CardTitle>
            <Button
              onClick={installPythonPackages}
              disabled={installing || !status?.python.available}
              className="min-w-[120px]"
            >
              {installing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  安装中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  一键安装
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {PYTHON_PACKAGES.map((pkg) => (
            <div key={pkg.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(status?.packages[pkg.name] || false, loading)}
                <div>
                  <div className="font-medium">{pkg.displayName}</div>
                  <div className="text-sm text-gray-500">{pkg.description}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(status?.packages[pkg.name] || false)}
              </div>
            </div>
          ))}

          {/* 安装说明 */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Python依赖说明</p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                  <li>Playwright: 用于浏览器自动化，支持现代化的网页抓取</li>
                  <li>Python-dateutil: 提供强大的日期时间解析和处理功能</li>
                  <li>Pillow: Python图像处理库，用于图片操作和格式转换</li>
                  <li>BorderCrop: 专用的图像边框检测和裁剪工具</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 浏览器环境 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              Playwright浏览器环境
            </CardTitle>
            <Button
              onClick={installPlaywrightBrowsers}
              disabled={installing || !status?.packages.playwright}
              className="min-w-[120px]"
            >
              {installing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  安装中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  安装浏览器
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Globe className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-medium">Chromium浏览器</div>
                <div className="text-sm text-gray-500">
                  Playwright专用的Chromium浏览器环境
                </div>
              </div>
            </div>
          </div>

          {/* 浏览器安装说明 */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">浏览器环境说明</p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                  <li>需要先安装Playwright Python包</li>
                  <li>将下载并安装Chromium浏览器（约100MB）</li>
                  <li>浏览器将安装到Playwright的专用目录</li>
                  <li>安装完成后即可使用TMDB-Import的浏览器功能</li>
                </ul>
              </div>
            </div>
          </div>

          {!status?.packages.playwright && (
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">前置条件</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    请先安装上方的Playwright包，然后再安装浏览器环境。
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 安装进度显示 */}
      {installProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">安装进度</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {installProgress.map((progress, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {progress.status === 'running' && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {progress.status === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {progress.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">{progress.step}</span>
                      </div>
                      <Badge
                        variant={
                          progress.status === 'success'
                            ? 'default'
                            : progress.status === 'error'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {progress.status === 'running'
                          ? '进行中'
                          : progress.status === 'success'
                          ? '完成'
                          : '失败'}
                      </Badge>
                    </div>
                    {progress.progress !== undefined && progress.status === 'running' && (
                      <Progress value={progress.progress} className="h-2" />
                    )}
                    <div className="text-xs text-gray-500 pl-6">{progress.output}</div>
                    {index < installProgress.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}