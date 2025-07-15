"use client"

import { useRef } from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Key,
  Info,
  Settings,
  Terminal,
  FolderOpen,
  FileText,
  RefreshCw,
  Save,
  Database,
  Globe,
  Shield,
  Palette,
  Monitor,
  Sun,
  Moon,
} from "lucide-react"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TMDBConfig {
  encoding?: string
  logging_level?: string
  browser?: string
  save_user_profile?: boolean
  tmdb_username?: string
  tmdb_password?: string
  backdrop_forced_upload?: boolean
  filter_words?: string
}

interface GeneralSettings {
  autoSave: boolean
  dataBackup: boolean
  cacheCleanup: boolean
  requestTimeout: number
  concurrentRequests: number
  useProxy: boolean
  proxyUrl: string
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  primaryColor: string
  compactMode: boolean
  fontSize: 'small' | 'medium' | 'large'
  showAnimations: boolean
  showTooltips: boolean
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState("api")
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [validationMessage, setValidationMessage] = useState("")
  const [tmdbImportPath, setTmdbImportPath] = useState("")
  const directoryInputRef = useRef<HTMLInputElement>(null)

  // TMDB配置相关状态
  const [tmdbConfig, setTmdbConfig] = useState<TMDBConfig>({
    encoding: 'utf-8-sig',
    logging_level: 'INFO',
    browser: 'edge',
    save_user_profile: true,
    tmdb_username: '',
    tmdb_password: '',
    backdrop_forced_upload: false,
    filter_words: ''
  })
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [showTmdbPassword, setShowTmdbPassword] = useState(false)

  // 通用设置状态
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    autoSave: true,
    dataBackup: true,
    cacheCleanup: false,
    requestTimeout: 30,
    concurrentRequests: 5,
    useProxy: false,
    proxyUrl: ''
  })

  // 外观设置状态
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>({
    theme: 'system',
    primaryColor: 'blue',
    compactMode: false,
    fontSize: 'medium',
    showAnimations: true,
    showTooltips: true
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    // 加载API设置
    const savedApiKey = localStorage.getItem("tmdb_api_key")
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
    const savedTmdbImportPath = localStorage.getItem("tmdb_import_path")
    if (savedTmdbImportPath) {
      setTmdbImportPath(savedTmdbImportPath)
      loadTmdbConfig(savedTmdbImportPath)
    }

    // 加载通用设置
    const savedGeneralSettings = localStorage.getItem("general_settings")
    if (savedGeneralSettings) {
      try {
        setGeneralSettings(JSON.parse(savedGeneralSettings))
      } catch (error) {
        console.error('加载通用设置失败:', error)
      }
    }

    // 加载外观设置
    const savedAppearanceSettings = localStorage.getItem("appearance_settings")
    if (savedAppearanceSettings) {
      try {
        const settings = JSON.parse(savedAppearanceSettings)
        setAppearanceSettings(settings)
        // 应用主题设置
        applyThemeSettings(settings)
      } catch (error) {
        console.error('加载外观设置失败:', error)
      }
    }
  }, [])

  // 应用主题设置
  const applyThemeSettings = (settings: AppearanceSettings) => {
    const root = document.documentElement

    // 应用主题模式
    if (settings.theme === 'dark') {
      root.classList.add('dark')
    } else if (settings.theme === 'light') {
      root.classList.remove('dark')
    } else {
      // 系统主题
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    // 应用主色调
    root.setAttribute('data-primary-color', settings.primaryColor)

    // 应用字体大小
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
    root.style.fontSize = fontSizeMap[settings.fontSize]

    // 应用紧凑模式
    if (settings.compactMode) {
      root.classList.add('compact-mode')
    } else {
      root.classList.remove('compact-mode')
    }

    // 应用动画设置
    if (!settings.showAnimations) {
      root.classList.add('no-animations')
    } else {
      root.classList.remove('no-animations')
    }
  }

  // 保存通用设置
  const saveGeneralSettings = () => {
    try {
      localStorage.setItem("general_settings", JSON.stringify(generalSettings))
      toast({
        title: "成功",
        description: "通用设置已保存",
      })
    } catch (error) {
      toast({
        title: "错误",
        description: "保存通用设置失败",
        variant: "destructive",
      })
    }
  }

  // 保存外观设置
  const saveAppearanceSettings = () => {
    try {
      localStorage.setItem("appearance_settings", JSON.stringify(appearanceSettings))
      applyThemeSettings(appearanceSettings)
      toast({
        title: "成功",
        description: "外观设置已保存并应用",
      })
    } catch (error) {
      toast({
        title: "错误",
        description: "保存外观设置失败",
        variant: "destructive",
      })
    }
  }

  // 加载TMDB配置
  const loadTmdbConfig = async (path: string) => {
    if (!path) return

    setConfigLoading(true)
    try {
      const response = await fetch(`/api/tmdb-config?path=${encodeURIComponent(path)}`)
      const data = await response.json()

      if (data.success && data.config) {
        setTmdbConfig({
          encoding: data.config.encoding || 'utf-8-sig',
          logging_level: data.config.logging_level || 'INFO',
          browser: data.config.browser || 'edge',
          save_user_profile: data.config.save_user_profile !== false,
          tmdb_username: data.config.tmdb_username || '',
          tmdb_password: data.config.tmdb_password || '',
          backdrop_forced_upload: data.config.backdrop_forced_upload === true,
          filter_words: data.config.filter_words || ''
        })
      }
    } catch (error) {
      console.error('加载TMDB配置失败:', error)
    } finally {
      setConfigLoading(false)
    }
  }

  // 保存TMDB配置
  const saveTmdbConfig = async () => {
    if (!tmdbImportPath) {
      toast({
        title: "错误",
        description: "请先设置TMDB-Import工具路径",
        variant: "destructive",
      })
      return
    }

    setConfigSaving(true)
    try {
      const response = await fetch('/api/tmdb-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tmdbImportPath,
          config: tmdbConfig
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "成功",
          description: "TMDB配置保存成功",
        })
      } else {
        throw new Error(data.error || '保存失败')
      }
    } catch (error) {
      console.error('保存TMDB配置失败:', error)
      toast({
        title: "错误",
        description: `保存TMDB配置失败: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      })
    } finally {
      setConfigSaving(false)
    }
  }

  const validateApiKey = (key: string) => {
    if (!key) {
      return { isValid: false, message: "请输入API密钥" }
    }

    if (key.length < 20) {
      return { isValid: false, message: "API密钥长度不足，请检查是否完整" }
    }

    if (!/^[a-f0-9]+$/i.test(key)) {
      return { isValid: false, message: "API密钥格式不正确，应为十六进制字符串" }
    }

    return { isValid: true, message: "API密钥格式正确" }
  }

  const handleSave = async () => {
    setSaveStatus("saving")
    setValidationMessage("")

    try {
      // 根据当前活动的设置页面保存对应的设置
      switch (activeSection) {
        case "api":
          const validation = validateApiKey(apiKey)
          if (!validation.isValid) {
            setSaveStatus("error")
            setValidationMessage(validation.message)
            return
          }

          await new Promise((resolve) => setTimeout(resolve, 1000))

          if (typeof window !== "undefined") {
            localStorage.setItem("tmdb_api_key", apiKey)
            const oldPath = localStorage.getItem("tmdb_import_path")
            localStorage.setItem("tmdb_import_path", tmdbImportPath)

            if (oldPath !== tmdbImportPath && tmdbImportPath) {
              loadTmdbConfig(tmdbImportPath)
            }
          }
          break

        case "general":
          saveGeneralSettings()
          break

        case "appearance":
          saveAppearanceSettings()
          break

        case "tools":
          await saveTmdbConfig()
          break
      }

      setSaveStatus("success")
      setValidationMessage("设置已成功保存")

      setTimeout(() => {
        setSaveStatus("idle")
        setValidationMessage("")
      }, 2000)
    } catch (error) {
      setSaveStatus("error")
      setValidationMessage("保存失败，请重试")
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setSaveStatus("idle")
    setValidationMessage("")

    if (typeof window === "undefined") return

    // 恢复原始值
    const savedApiKey = localStorage.getItem("tmdb_api_key")
    const savedTmdbImportPath = localStorage.getItem("tmdb_import_path")
    if (savedApiKey) {
      setApiKey(savedApiKey)
    } else {
      setApiKey("")
    }
    if (savedTmdbImportPath) {
      setTmdbImportPath(savedTmdbImportPath)
    } else {
      setTmdbImportPath("")
    }
  }

  const getStatusIcon = () => {
    switch (saveStatus) {
      case "saving":
        return <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (saveStatus) {
      case "success":
        return "text-green-600 dark:text-green-400"
      case "error":
        return "text-red-600 dark:text-red-400"
      case "saving":
        return "text-blue-600 dark:text-blue-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  // 检查是否有有效的API密钥
  const hasValidApiKey = () => {
    if (typeof window === "undefined") return false
    const savedApiKey = localStorage.getItem("tmdb_api_key")
    return savedApiKey && savedApiKey.trim().length > 0
  }

  // 设置菜单项
  const settingsMenuItems = [
    {
      id: "api",
      label: "API配置",
      icon: Key,
      description: "TMDB API密钥设置"
    },
    {
      id: "tools",
      label: "工具配置",
      icon: Terminal,
      description: "TMDB-Import工具设置"
    },
    {
      id: "general",
      label: "通用设置",
      icon: Settings,
      description: "应用程序通用配置"
    },
    {
      id: "appearance",
      label: "外观设置",
      icon: Palette,
      description: "主题和界面设置"
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            设置
          </DialogTitle>
          <DialogDescription>
            配置应用程序的全局设置和API密钥
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[calc(90vh-120px)]">
          {/* 左侧导航菜单 */}
          <div className="w-64 border-r bg-gray-50/50 dark:bg-gray-900/50">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {settingsMenuItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${activeSection === item.id
                        ? "bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{item.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-6">{renderSettingsContent()}</div>
            </ScrollArea>

            {/* 底部操作按钮 */}
            <div className="border-t p-4 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancel} disabled={saveStatus === "saving"}>
                  取消
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  className={saveStatus === "success" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {saveStatus === "saving" && (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  )}
                  {saveStatus === "success" ? "已保存" : saveStatus === "saving" ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  // 渲染设置内容的函数
  function renderSettingsContent() {
    switch (activeSection) {
      case "api":
        return renderApiSettings()
      case "tools":
        return renderToolsSettings()
      case "general":
        return renderGeneralSettings()
      case "appearance":
        return renderAppearanceSettings()
      default:
        return renderApiSettings()
    }
  }

  // API设置内容
  function renderApiSettings() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">TMDB API配置</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            配置TMDB API密钥以启用电影和电视剧数据获取功能
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="apiKey" className="flex items-center text-sm font-medium">
                TMDB API密钥
              </Label>
              <div className="relative mt-2">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入您的TMDB API密钥"
                  className={`pr-10 ${saveStatus === "success"
                    ? "border-green-300 focus:border-green-500"
                    : saveStatus === "error"
                      ? "border-red-300 focus:border-red-500"
                      : ""
                    }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* 当前状态显示 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">API状态:</span>
                <Badge variant={hasValidApiKey() ? "default" : "secondary"}>
                  {hasValidApiKey() ? "已配置" : "未配置"}
                </Badge>
              </div>
              {hasValidApiKey() && apiKey && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)}
                </span>
              )}
            </div>

            {/* 帮助信息 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">如何获取TMDB API密钥？</p>
                  <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal list-inside">
                    <li>访问TMDB官网并注册账户</li>
                    <li>进入账户设置页面</li>
                    <li>在API部分申请新的API密钥</li>
                    <li>复制生成的API密钥到此处</li>
                  </ol>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://www.themoviedb.org/settings/api", "_blank")}
                    className="mt-3"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    前往TMDB设置页面
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 状态反馈 */}
        {(validationMessage || saveStatus !== "idle") && (
          <Card
            className={`${saveStatus === "success"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
              : saveStatus === "error"
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
              }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-sm ${getStatusColor()}`}>
                  {validationMessage || (saveStatus === "saving" ? "正在保存..." : "")}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // 工具设置内容
  function renderToolsSettings() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">TMDB-Import工具配置</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            配置本地TMDB-Import工具路径和相关设置
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="tmdbImportPath" className="flex items-center text-sm font-medium">
                工具路径
              </Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  id="tmdbImportPath"
                  value={tmdbImportPath}
                  onChange={(e) => setTmdbImportPath(e.target.value)}
                  placeholder="D:\tmdb-import"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const path = prompt("请输入TMDB-Import工具路径:", tmdbImportPath)
                    if (path) setTmdbImportPath(path)
                  }}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 当前状态显示 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">工具状态:</span>
                <Badge variant={tmdbImportPath ? "default" : "secondary"}>
                  {tmdbImportPath ? "已配置" : "未配置"}
                </Badge>
              </div>
              {tmdbImportPath && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {tmdbImportPath.length > 40 ? `...${tmdbImportPath.slice(-40)}` : tmdbImportPath}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* config.ini配置 */}
        {tmdbImportPath && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-base">config.ini 配置</CardTitle>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadTmdbConfig(tmdbImportPath)}
                    disabled={configLoading}
                  >
                    {configLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    刷新
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveTmdbConfig}
                    disabled={configSaving}
                  >
                    {configSaving ? (
                      <Save className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    保存配置
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 编码设置 */}
                <div>
                  <Label className="text-sm font-medium">编码</Label>
                  <Select
                    value={tmdbConfig.encoding}
                    onValueChange={(value) => setTmdbConfig(prev => ({ ...prev, encoding: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utf-8-sig">utf-8-sig</SelectItem>
                      <SelectItem value="utf-8">utf-8</SelectItem>
                      <SelectItem value="gbk">gbk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 日志级别 */}
                <div>
                  <Label className="text-sm font-medium">日志级别</Label>
                  <Select
                    value={tmdbConfig.logging_level}
                    onValueChange={(value) => setTmdbConfig(prev => ({ ...prev, logging_level: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBUG">DEBUG</SelectItem>
                      <SelectItem value="INFO">INFO</SelectItem>
                      <SelectItem value="WARNING">WARNING</SelectItem>
                      <SelectItem value="ERROR">ERROR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 浏览器 */}
                <div>
                  <Label className="text-sm font-medium">浏览器</Label>
                  <Select
                    value={tmdbConfig.browser}
                    onValueChange={(value) => setTmdbConfig(prev => ({ ...prev, browser: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="edge">Edge</SelectItem>
                      <SelectItem value="chrome">Chrome</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 保存用户配置文件 */}
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="save_user_profile"
                    checked={tmdbConfig.save_user_profile}
                    onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, save_user_profile: checked }))}
                  />
                  <Label htmlFor="save_user_profile" className="text-sm font-medium">
                    保存用户配置文件
                  </Label>
                </div>
              </div>

              <Separator />

              {/* TMDB账户信息 */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">TMDB 账户信息</Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600 dark:text-gray-400">用户名</Label>
                    <Input
                      value={tmdbConfig.tmdb_username}
                      onChange={(e) => setTmdbConfig(prev => ({ ...prev, tmdb_username: e.target.value }))}
                      placeholder="TMDB用户名"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600 dark:text-gray-400">密码</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showTmdbPassword ? "text" : "password"}
                        value={tmdbConfig.tmdb_password}
                        onChange={(e) => setTmdbConfig(prev => ({ ...prev, tmdb_password: e.target.value }))}
                        placeholder="TMDB密码"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowTmdbPassword(!showTmdbPassword)}
                      >
                        {showTmdbPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 其他设置 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="backdrop_forced_upload"
                    checked={tmdbConfig.backdrop_forced_upload}
                    onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, backdrop_forced_upload: checked }))}
                  />
                  <Label htmlFor="backdrop_forced_upload" className="text-sm font-medium">
                    强制上传背景图
                  </Label>
                </div>

                <div>
                  <Label className="text-sm font-medium">过滤词 (用逗号分隔)</Label>
                  <Textarea
                    value={tmdbConfig.filter_words}
                    onChange={(e) => setTmdbConfig(prev => ({ ...prev, filter_words: e.target.value }))}
                    placeholder="番外,加更"
                    className="mt-1 h-20 resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 帮助信息 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">TMDB-Import工具说明</p>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1 list-decimal list-inside">
                  <li>请输入本地TMDB-Import工具的完整路径</li>
                  <li>确保路径中包含可执行的Python模块</li>
                  <li>配置后可在词条详情中使用本地集成功能</li>
                  <li>支持播出平台抓取和自动上传至TMDB</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 通用设置内容
  function renderGeneralSettings() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">通用设置</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            配置应用程序的通用选项和行为设置
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Database className="h-4 w-4 mr-2" />
              数据管理
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">自动保存</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">自动保存编辑的数据</p>
              </div>
              <Switch
                checked={generalSettings.autoSave}
                onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, autoSave: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">数据备份</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">定期备份重要数据</p>
              </div>
              <Switch
                checked={generalSettings.dataBackup}
                onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, dataBackup: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">缓存清理</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">自动清理过期缓存</p>
              </div>
              <Switch
                checked={generalSettings.cacheCleanup}
                onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, cacheCleanup: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              网络设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">请求超时时间 (秒)</Label>
              <Input
                type="number"
                value={generalSettings.requestTimeout}
                onChange={(e) => setGeneralSettings(prev => ({ ...prev, requestTimeout: parseInt(e.target.value) || 30 }))}
                className="mt-1"
                min="5"
                max="300"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">并发请求数</Label>
              <Input
                type="number"
                value={generalSettings.concurrentRequests}
                onChange={(e) => setGeneralSettings(prev => ({ ...prev, concurrentRequests: parseInt(e.target.value) || 5 }))}
                className="mt-1"
                min="1"
                max="20"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">使用代理</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">通过代理服务器访问网络</p>
              </div>
              <Switch
                checked={generalSettings.useProxy}
                onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, useProxy: checked }))}
              />
            </div>

            {generalSettings.useProxy && (
              <div>
                <Label className="text-sm font-medium">代理地址</Label>
                <Input
                  value={generalSettings.proxyUrl}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, proxyUrl: e.target.value }))}
                  placeholder="http://proxy.example.com:8080"
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 状态反馈 */}
        {(validationMessage || saveStatus !== "idle") && (
          <Card
            className={`${saveStatus === "success"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
              : saveStatus === "error"
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
              }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-sm ${getStatusColor()}`}>
                  {validationMessage || (saveStatus === "saving" ? "正在保存..." : "")}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // 外观设置内容
  function renderAppearanceSettings() {
    const colorOptions = [
      { value: 'blue', label: '蓝色', color: 'bg-blue-500' },
      { value: 'green', label: '绿色', color: 'bg-green-500' },
      { value: 'purple', label: '紫色', color: 'bg-purple-500' },
      { value: 'red', label: '红色', color: 'bg-red-500' },
      { value: 'orange', label: '橙色', color: 'bg-orange-500' },
      { value: 'pink', label: '粉色', color: 'bg-pink-500' },
    ]

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">外观设置</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            自定义应用程序的外观和主题设置
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Palette className="h-4 w-4 mr-2" />
              主题设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">主题模式</Label>
              <Select
                value={appearanceSettings.theme}
                onValueChange={(value: 'light' | 'dark' | 'system') =>
                  setAppearanceSettings(prev => ({ ...prev, theme: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center space-x-2">
                      <Sun className="h-4 w-4" />
                      <span>浅色模式</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center space-x-2">
                      <Moon className="h-4 w-4" />
                      <span>深色模式</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center space-x-2">
                      <Monitor className="h-4 w-4" />
                      <span>跟随系统</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">主色调</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAppearanceSettings(prev => ({ ...prev, primaryColor: color.value }))}
                    className={`w-10 h-10 rounded-full ${color.color} hover:scale-110 transition-transform relative ${appearanceSettings.primaryColor === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                    title={color.label}
                  >
                    {appearanceSettings.primaryColor === color.value && (
                      <CheckCircle2 className="h-4 w-4 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">紧凑模式</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">减少界面元素间距</p>
              </div>
              <Switch
                checked={appearanceSettings.compactMode}
                onCheckedChange={(checked) => setAppearanceSettings(prev => ({ ...prev, compactMode: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              界面设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">字体大小</Label>
              <Select
                value={appearanceSettings.fontSize}
                onValueChange={(value: 'small' | 'medium' | 'large') =>
                  setAppearanceSettings(prev => ({ ...prev, fontSize: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">小 (14px)</SelectItem>
                  <SelectItem value="medium">中 (16px)</SelectItem>
                  <SelectItem value="large">大 (18px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">显示动画</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">启用界面过渡动画</p>
              </div>
              <Switch
                checked={appearanceSettings.showAnimations}
                onCheckedChange={(checked) => setAppearanceSettings(prev => ({ ...prev, showAnimations: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">显示工具提示</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">鼠标悬停时显示帮助信息</p>
              </div>
              <Switch
                checked={appearanceSettings.showTooltips}
                onCheckedChange={(checked) => setAppearanceSettings(prev => ({ ...prev, showTooltips: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* 预览区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">预览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full bg-${appearanceSettings.primaryColor}-500`}></div>
                  <span className={`text-${appearanceSettings.fontSize === 'small' ? 'sm' : appearanceSettings.fontSize === 'large' ? 'lg' : 'base'}`}>
                    示例文本内容
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  当前主题: {appearanceSettings.theme === 'light' ? '浅色' : appearanceSettings.theme === 'dark' ? '深色' : '跟随系统'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  字体大小: {appearanceSettings.fontSize === 'small' ? '小' : appearanceSettings.fontSize === 'large' ? '大' : '中'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 状态反馈 */}
        {(validationMessage || saveStatus !== "idle") && (
          <Card
            className={`${saveStatus === "success"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
              : saveStatus === "error"
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
              }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-sm ${getStatusColor()}`}>
                  {validationMessage || (saveStatus === "saving" ? "正在保存..." : "")}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }
}