/**
 * 工具设置面板
 */

"use client"

import React, { useState, useEffect, useCallback } from "react"
import { logger } from '@/lib/utils/logger'
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
import { ClientConfigManager } from '@/lib/utils/client-config-manager'
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
  // 提取保存TMDB导入路径的逻辑
  const saveTmdbImportPath = useCallback(async (path: string) => {
    try {
      const success = await ClientConfigManager.setItem("tmdb_import_path", path)
      if (!success) {
        logger.error('保存TMDB-Import路径失败')
      }
    } catch (error) {
      logger.error('保存TMDB-Import路径时出错:', error)
    }
  }, [])

  // 处理路径输入框失焦事件
  const handlePathBlur = useCallback(async () => {
    if (tmdbImportPath) {
      await saveTmdbImportPath(tmdbImportPath)
    }
  }, [tmdbImportPath, saveTmdbImportPath])

  // 处理路径选择按钮点击
  const handlePathSelect = useCallback(async () => {
    const path = prompt("请输入TMDB-Import工具路径:", tmdbImportPath)
    if (path) {
      setTmdbImportPath(path)
      await saveTmdbImportPath(path)
    }
  }, [tmdbImportPath, setTmdbImportPath, saveTmdbImportPath])
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
              await saveTmdbImportPath(path)
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
                                      onBlur={handlePathBlur}
                                      placeholder="例如: D:\TMDB-Import-master 或自定义路径"
                                      className="flex-1"
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handlePathSelect}
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
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-base">config.ini 配置</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
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

                  <div className="md:col-span-2 flex items-center space-x-2">
                    <Switch
                      id="save_user_profile"
                      checked={tmdbConfig.save_user_profile}
                      onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, save_user_profile: checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="save_user_profile" className="text-sm font-medium">
                        保存用户配置文件
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        开启则保存浏览器登录状态等用户数据，只能启动一个Chrome进程。关闭则不保存用户数据，以支持多任务进程并发
                      </p>
                    </div>
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
                  <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">图片上传设置</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="backdrop_forced_upload"
                      checked={tmdbConfig.backdrop_forced_upload}
                      onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, backdrop_forced_upload: checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="backdrop_forced_upload" className="text-sm font-medium">
                        强制上传背景图
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        即使 TMDB 已有背景图也强制上传
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="backdrop_vote_after_upload"
                      checked={tmdbConfig.backdrop_vote_after_upload}
                      onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, backdrop_vote_after_upload: checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="backdrop_vote_after_upload" className="text-sm font-medium">
                        上传后自动点赞
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        上传完背景图后自动点赞，增加图片权重
                      </p>
                    </div>
                  </div>

                  <div className="pb-2 pt-4 border-b border-gray-200 dark:border-gray-700">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">CSV 导入设置</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="rename_csv_on_import"
                      checked={tmdbConfig.rename_csv_on_import}
                      onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, rename_csv_on_import: checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="rename_csv_on_import" className="text-sm font-medium">
                        导入时重命名 CSV
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        重命名 CSV 文件以支持同时处理多个导入任务
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="delete_csv_after_import"
                      checked={tmdbConfig.delete_csv_after_import}
                      onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, delete_csv_after_import: checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="delete_csv_after_import" className="text-sm font-medium">
                        导入后删除 CSV
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        导入完成后自动删除 CSV 文件，避免重复导入
                      </p>
                    </div>
                  </div>

                  <div className="pb-2 pt-4 border-b border-gray-200 dark:border-gray-700">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">其他设置</Label>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">过滤词 (用逗号分隔)</Label>
                    <Textarea
                      value={tmdbConfig.filter_words}
                      onChange={(e) => setTmdbConfig(prev => ({ ...prev, filter_words: e.target.value }))}
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