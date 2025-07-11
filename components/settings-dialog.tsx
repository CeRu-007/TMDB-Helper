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

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast()
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

  useEffect(() => {
    if (typeof window === "undefined") return

    const savedApiKey = localStorage.getItem("tmdb_api_key")
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
    const savedTmdbImportPath = localStorage.getItem("tmdb_import_path")
    if (savedTmdbImportPath) {
      setTmdbImportPath(savedTmdbImportPath)
      // 当路径存在时，尝试加载TMDB配置
      loadTmdbConfig(savedTmdbImportPath)
    }
  }, [])

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

    const validation = validateApiKey(apiKey)

    if (!validation.isValid) {
      setSaveStatus("error")
      setValidationMessage(validation.message)
      return
    }

    try {
      // 模拟API验证（实际应用中可以调用TMDB API验证）
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (typeof window !== "undefined") {
        localStorage.setItem("tmdb_api_key", apiKey)
        const oldPath = localStorage.getItem("tmdb_import_path")
        localStorage.setItem("tmdb_import_path", tmdbImportPath)

        // 如果路径发生变化，重新加载TMDB配置
        if (oldPath !== tmdbImportPath && tmdbImportPath) {
          loadTmdbConfig(tmdbImportPath)
        }
      }

      setSaveStatus("success")
      setValidationMessage("设置已成功保存")

      // 3秒后自动关闭对话框
      setTimeout(() => {
        onOpenChange(false)
        setSaveStatus("idle")
        setValidationMessage("")
      }, 3000)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            设置
          </DialogTitle>
          <DialogDescription>
            配置应用程序的全局设置和API密钥
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* TMDB API密钥设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Key className="h-4 w-4 mr-2" />
                TMDB API配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    className={`pr-10 ${
                      saveStatus === "success"
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
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">如何获取TMDB API密钥？</p>
                    <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                      <li>访问TMDB官网并注册账户</li>
                      <li>进入账户设置页面</li>
                      <li>在API部分申请新的API密钥</li>
                      <li>复制生成的API密钥到此处</li>
                    </ol>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("https://www.themoviedb.org/settings/api", "_blank")}
                      className="text-xs h-7 mt-2"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      前往TMDB设置页面
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TMDB-Import工具配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Terminal className="h-4 w-4 mr-2" />
                TMDB-Import工具配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    {tmdbImportPath.length > 30 ? `...${tmdbImportPath.slice(-30)}` : tmdbImportPath}
                  </span>
                )}
              </div>

              {/* config.ini配置 */}
              {tmdbImportPath && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">config.ini 配置</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadTmdbConfig(tmdbImportPath)}
                        disabled={configLoading}
                        className="text-xs"
                      >
                        {configLoading ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        刷新
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveTmdbConfig}
                        disabled={configSaving}
                        className="text-xs"
                      >
                        {configSaving ? (
                          <Save className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        保存配置
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 编码设置 */}
                    <div>
                      <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">编码</Label>
                      <Select
                        value={tmdbConfig.encoding}
                        onValueChange={(value) => setTmdbConfig(prev => ({ ...prev, encoding: value }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
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
                      <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">日志级别</Label>
                      <Select
                        value={tmdbConfig.logging_level}
                        onValueChange={(value) => setTmdbConfig(prev => ({ ...prev, logging_level: value }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
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
                      <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">浏览器</Label>
                      <Select
                        value={tmdbConfig.browser}
                        onValueChange={(value) => setTmdbConfig(prev => ({ ...prev, browser: value }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="edge">Edge</SelectItem>
                          <SelectItem value="chrome">Chrome</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 保存用户配置文件 */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="save_user_profile"
                        checked={tmdbConfig.save_user_profile}
                        onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, save_user_profile: checked }))}
                      />
                      <Label htmlFor="save_user_profile" className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        保存用户配置文件
                      </Label>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    {/* TMDB账户信息 */}
                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">TMDB 账户信息</Label>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-blue-600 dark:text-blue-400">用户名</Label>
                          <Input
                            value={tmdbConfig.tmdb_username}
                            onChange={(e) => setTmdbConfig(prev => ({ ...prev, tmdb_username: e.target.value }))}
                            placeholder="TMDB用户名"
                            className="h-8 text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-blue-600 dark:text-blue-400">密码</Label>
                          <div className="relative">
                            <Input
                              type={showTmdbPassword ? "text" : "password"}
                              value={tmdbConfig.tmdb_password}
                              onChange={(e) => setTmdbConfig(prev => ({ ...prev, tmdb_password: e.target.value }))}
                              placeholder="TMDB密码"
                              className="h-8 text-xs pr-8"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-8 w-8 px-0"
                              onClick={() => setShowTmdbPassword(!showTmdbPassword)}
                            >
                              {showTmdbPassword ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 其他设置 */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="backdrop_forced_upload"
                          checked={tmdbConfig.backdrop_forced_upload}
                          onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, backdrop_forced_upload: checked }))}
                        />
                        <Label htmlFor="backdrop_forced_upload" className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          强制上传背景图
                        </Label>
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">过滤词 (用逗号分隔)</Label>
                        <Textarea
                          value={tmdbConfig.filter_words}
                          onChange={(e) => setTmdbConfig(prev => ({ ...prev, filter_words: e.target.value }))}
                          placeholder="番外,加更"
                          className="h-16 text-xs resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 帮助信息 */}
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm text-green-800 dark:text-green-200 font-medium">TMDB-Import工具说明</p>
                    <ul className="text-xs text-green-700 dark:text-green-300 space-y-1 list-decimal list-inside">
                      <li>请输入本地TMDB-Import工具的完整路径</li>
                      <li>确保路径中包含可执行的Python模块</li>
                      <li>配置后可在词条详情中使用本地集成功能</li>
                      <li>支持播出平台抓取和自动上传至TMDB</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* 状态反馈 */}
          {(validationMessage || saveStatus !== "idle") && (
            <Card
              className={`${
                saveStatus === "success"
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                  : saveStatus === "error"
                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                    : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon()}
                  <span className={`text-sm ${getStatusColor()}`}>
                    {validationMessage || (saveStatus === "saving" ? "正在保存..." : "")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel} disabled={saveStatus === "saving"}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveStatus === "saving" || !apiKey}
              className={saveStatus === "success" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {saveStatus === "saving" && (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              )}
              {saveStatus === "success" ? "已保存" : saveStatus === "saving" ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
