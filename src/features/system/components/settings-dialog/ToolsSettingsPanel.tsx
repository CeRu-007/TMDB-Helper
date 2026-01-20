/**
 * 工具设置面板
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { Separator } from "@/shared/components/ui/separator"
import { Badge } from "@/shared/components/ui/badge"
import { Terminal, FolderOpen, FileText, RefreshCw, Save, Info, Eye, EyeOff, AlertCircle } from "lucide-react"
import TMDBImportUpdater from "@/features/tmdb-import/components/tmdb-import-updater"
import DependencyInstaller from "@/features/system/components/dependency-installer"
import { ClientConfigManager } from '@/shared/lib/utils/client-config-manager'
import type { TMDBConfig, ToolsTabState } from "./types"

interface ToolsSettingsPanelProps {
  toolsTab: ToolsTabState['activeTab']
  setToolsTab: (tab: ToolsTabState['activeTab']) => void
  tmdbImportPath: string
  setTmdbImportPath: (path: string) => void
  tmdbConfig: TMDBConfig
  setTmdbConfig: (config: TMDBConfig) => void
  configLoading: boolean
  configSaving: boolean
  showTmdbPassword: boolean
  setShowTmdbPassword: (show: boolean) => void
  loadTmdbConfig: (path: string) => void
  saveTmdbConfig: () => Promise<void>
  isDockerEnv: boolean
}

export default function ToolsSettingsPanel({
  toolsTab,
  setToolsTab,
  tmdbImportPath,
  setTmdbImportPath,
  tmdbConfig,
  setTmdbConfig,
  configLoading,
  configSaving,
  showTmdbPassword,
  setShowTmdbPassword,
  loadTmdbConfig,
  saveTmdbConfig,
  isDockerEnv
}: ToolsSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">工具配置</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          管理TMDB-Import工具的安装、配置和依赖环境
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setToolsTab("management")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              toolsTab === "management"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            工具管理
          </button>
          <button
            onClick={() => setToolsTab("config")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              toolsTab === "config"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            config.ini 配置
          </button>
          <button
            onClick={() => setToolsTab("dependencies")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              toolsTab === "dependencies"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            依赖安装
          </button>
        </nav>
      </div>

      {toolsTab === 'management' && (
        <div className="space-y-6">
          <TMDBImportUpdater
            onPathUpdate={async (path) => {
              setTmdbImportPath(path)
              await ClientConfigManager.setItem("tmdb_import_path", path)
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <FolderOpen className="h-4 w-4 mr-2" />
                手动路径配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                如果需要使用自定义路径或现有安装，可以手动指定工具路径
              </p>

              <div className="space-y-3">
                                  <div className="flex space-x-2">
                                    <Input
                                      id="tmdbImportPath"
                                      value={tmdbImportPath}
                                      onChange={(e) => setTmdbImportPath(e.target.value)}
                                      placeholder="例如: D:\TMDB-Import-master 或自定义路径"
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
                {tmdbImportPath && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">当前配置:</span>
                      <Badge variant="default" className="text-xs">已配置</Badge>
                    </div>
                    <code className="text-xs text-gray-600 dark:text-gray-400 break-all">
                      {tmdbImportPath}
                    </code>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
      )}

      {toolsTab === 'config' && (
        <div className="space-y-6">
          {tmdbImportPath ? (
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

                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">浏览器设置</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          现在使用 Playwright 框架，仅支持 Chrome/Chromium 浏览器。无需手动配置浏览器类型。
                        </p>
                      </div>
                    </div>
                  </div>

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

                <div className="space-y-4">
                  <Label className="text-sm font-medium">TMDB 账户信息</Label>

                  <div className="grid grid-cols-2 gap-4">
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
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-amber-500" />
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">未配置工具路径</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      请先在"工具管理"标签页中配置TMDB-Import工具路径，然后再进行config.ini配置。
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setToolsTab('management')}
                  >
                    前往工具管理
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {toolsTab === 'dependencies' && (
        <DependencyInstaller />
      )}
    </div>
  )
}