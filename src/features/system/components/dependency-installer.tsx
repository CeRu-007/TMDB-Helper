"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Progress } from "@/shared/components/ui/progress"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Separator } from "@/shared/components/ui/separator"
import { useToast } from "@/lib/hooks/use-toast"
import {
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Package,
  Globe,
  Terminal,
  Info,
  Loader2,
  Monitor,
  Container
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
  environment?: 'web' | 'docker' | 'electron'
  platform?: string
}

interface InstallProgress {
  step: string
  status: 'running' | 'success' | 'error'
  output: string
  progress?: number
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

// 环境图标和标签
const ENVIRONMENT_CONFIG = {
  web: {
    icon: Globe,
    label: 'Web',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  docker: {
    icon: Container,
    label: 'Docker',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  electron: {
    icon: Monitor,
    label: '桌面端',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    borderColor: 'border-purple-200 dark:border-purple-800'
  }
}

export default function DependencyInstaller() {
  const { toast } = useToast()
  const { t } = useTranslation("settings")
  const [status, setStatus] = useState<DependencyStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState<InstallProgress[]>([])
  const [installType, setInstallType] = useState<'python' | 'playwright' | null>(null)

  // 检查依赖状态
  const checkDependencies = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/system/install-dependencies')
      const data = await response.json()

      if (data.success) {
        setStatus(data.data)
      } else {
        // 即使检查失败也设置状态，显示环境信息
        setStatus({
          python: { available: false },
          packages: {},
          environment: data.environment,
          platform: data.platform
        })
        toast({
          title: t("dependencyInstaller.checkFailed"),
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: t("dependencyInstaller.checkFailed"),
        description: t("dependencyInstaller.networkError"),
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
        title: t("dependencyInstaller.pythonNotInstall"),
        description: t("dependencyInstaller.pleaseInstallPython"),
        variant: "destructive"
      })
      return
    }

    setInstalling(true)
    setInstallType('python')
    setInstallProgress([])

    try {
      const packagesToInstall = PYTHON_PACKAGES
        .filter(pkg => !status.packages[pkg.name])
        .map(pkg => pkg.name)

      if (packagesToInstall.length === 0) {
        toast({
          title: t("dependencyInstaller.noNeedInstall"),
          description: t("dependencyInstaller.allPackagesInstalled"),
        })
        setInstalling(false)
        setInstallType(null)
        return
      }

      const response = await fetch('/api/system/install-dependencies', {
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
          title: t("dependencyInstaller.installComplete"),
          description: t("dependencyInstaller.successInstallCount", { count: data.data.summary.success }),
        })
        // 重新检查状态
        await checkDependencies()
      } else {
        setInstallProgress(data.data?.results || [{
          step: '安装失败',
          status: 'error',
          output: data.error || '未知错误'
        }])
        toast({
          title: t("dependencyInstaller.installFailed"),
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: t("dependencyInstaller.installFailed"),
        description: t("dependencyInstaller.networkError"),
        variant: "destructive"
      })
    } finally {
      setInstalling(false)
      setInstallType(null)
    }
  }

  // 安装Playwright浏览器
  const installPlaywrightBrowsers = async () => {
    if (!status?.python.available || !status.packages.playwright) {
      toast({
        title: t("dependencyInstaller.prerequisiteNotMet"),
        description: t("dependencyInstaller.pleaseInstallPlaywrightFirst"),
        variant: "destructive"
      })
      return
    }

    setInstalling(true)
    setInstallType('playwright')
    setInstallProgress([])

    try {
      const response = await fetch('/api/system/install-dependencies', {
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
          title: t("dependencyInstaller.browserInstallComplete"),
          description: t("dependencyInstaller.chromiumInstalled"),
        })
      } else {
        setInstallProgress(data.data?.results || [{
          step: '浏览器安装失败',
          status: 'error',
          output: data.error || '未知错误'
        }])
        toast({
          title: t("dependencyInstaller.browserInstallFailed"),
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: t("dependencyInstaller.browserInstallFailed"),
        description: t("dependencyInstaller.networkError"),
        variant: "destructive"
      })
    } finally {
      setInstalling(false)
      setInstallType(null)
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
        {isInstalled ? t("tmdbImportUpdater.installed") : t("tmdbImportUpdater.notInstalled")}
      </Badge>
    )
  }

  // 获取环境显示配置
  const getEnvironmentDisplay = () => {
    const envType = status?.environment || 'web'
    return ENVIRONMENT_CONFIG[envType] || ENVIRONMENT_CONFIG.web
  }

  const envDisplay = getEnvironmentDisplay()
  const EnvIcon = envDisplay.icon

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <Package className="h-5 w-5 mr-2" />
          {t("dependencyInstaller.title")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t("dependencyInstaller.description")}
        </p>
      </div>

      {/* 环境信息 */}
      {status?.environment && (
        <div className={`p-3 ${envDisplay.bgColor} rounded-lg border ${envDisplay.borderColor}`}>
          <div className="flex items-center space-x-2">
            <EnvIcon className={`h-4 w-4 ${envDisplay.color}`} />
            <span className="text-sm font-medium">
              运行环境: {envDisplay.label}
            </span>
            {status.platform && (
              <span className="text-xs text-gray-500">
                ({status.platform})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Python环境检查 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Terminal className="h-4 w-4 mr-2" />
            {t("dependencyInstaller.pythonEnvironment")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t("dependencyInstaller.checkingPython")}</span>
            </div>
          ) : status ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(status.python.available)}
                <div>
                  <div className="font-medium">
                    {status.python.available ? t("dependencyInstaller.pythonInstalled") : t("dependencyInstaller.pythonNotInstalled")}
                  </div>
                  {status.python.version && (
                    <div className="text-sm text-gray-500">
                      {status.python.version} ({status.python.path})
                    </div>
                  )}
                  {!status.python.available && (
                    <div className="text-sm text-red-500 mt-1">
                      请确保系统已安装 Python 3.8+ 并添加到环境变量
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
                {t("dependencyInstaller.refresh")}
              </Button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">{t("dependencyInstaller.loading")}</div>
          )}
        </CardContent>
      </Card>

      {/* Python依赖包 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center">
              <Package className="h-4 w-4 mr-2" />
              {t("dependencyInstaller.pythonDeps")}
            </CardTitle>
            <Button
              onClick={installPythonPackages}
              disabled={installing || !status?.python.available}
              className="min-w-[120px]"
            >
              {installing && installType === 'python' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("dependencyInstaller.installing")}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t("dependencyInstaller.installAll")}
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
                  <div className="font-medium">{t(`dependencyInstaller.${pkg.name}`)}</div>
                  <div className="text-sm text-gray-500">{t(`dependencyInstaller.${pkg.name}Note`)}</div>
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
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">{t("dependencyInstaller.pythonDepsNote")}</p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                  <li>Playwright: {t("dependencyInstaller.playwrightNote")}</li>
                  <li>Python-dateutil: {t("dependencyInstaller.pythonDateutilNote")}</li>
                  <li>Pillow: {t("dependencyInstaller.pillowNote")}</li>
                  <li>BorderCrop: {t("dependencyInstaller.bordercropNote")}</li>
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
              {t("dependencyInstaller.playwrightBrowser")}
            </CardTitle>
            <Button
              onClick={installPlaywrightBrowsers}
              disabled={installing || !status?.packages.playwright}
              className="min-w-[120px]"
            >
              {installing && installType === 'playwright' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("dependencyInstaller.installing")}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t("dependencyInstaller.installAll")}
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
                <div className="font-medium">{t("dependencyInstaller.chromiumBrowser")}</div>
                <div className="text-sm text-gray-500">
                  {t("dependencyInstaller.chromiumBrowserDesc")}
                </div>
              </div>
            </div>
          </div>

          {/* 浏览器安装说明 */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">{t("dependencyInstaller.browserNote")}</p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                  <li>{t("dependencyInstaller.needInstallPlaywrightFirst")}</li>
                  <li>{t("dependencyInstaller.willDownloadChromium")}</li>
                  <li>{t("dependencyInstaller.browserWillInstallToPlaywrightDir")}</li>
                  <li>{t("dependencyInstaller.canUseBrowserAfterInstall")}</li>
                </ul>
              </div>
            </div>
          </div>

          {!status?.packages.playwright && (
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">{t("dependencyInstaller.prerequisite")}</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {t("dependencyInstaller.pleaseInstallPlaywrightFirst2")}
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
            <CardTitle className="text-base">{t("dependencyInstaller.installProgress")}</CardTitle>
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
                          ? t("dependencyInstaller.running")
                          : progress.status === 'success'
                          ? t("dependencyInstaller.success")
                          : t("dependencyInstaller.failed")}
                      </Badge>
                    </div>
                    {progress.progress !== undefined && progress.status === 'running' && (
                      <Progress value={progress.progress} className="h-2" />
                    )}
                    {progress.output && (
                      <div className="text-xs text-gray-500 pl-6">{progress.output}</div>
                    )}
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
