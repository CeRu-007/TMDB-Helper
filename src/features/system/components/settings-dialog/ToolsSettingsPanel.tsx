/**
 * Tools Settings Panel
 */

"use client"

import React, { useCallback } from "react"
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
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation("settings")

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
    const path = prompt(t("tools.enterToolPath"), tmdbImportPath)
    if (path) {
      setTmdbImportPath(path)
      await saveTmdbImportPath(path)
    }
  }, [tmdbImportPath, setTmdbImportPath, saveTmdbImportPath, t])
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t("tools.title")}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t("tools.description")}
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
            {t("tools.toolManagement")}
          </button>
          <button
            onClick={() => setToolsTab("config")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              toolsTab === "config"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t("tools.configIni")}
          </button>
          <button
            onClick={() => setToolsTab("dependencies")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              toolsTab === "dependencies"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t("tools.dependencyInstall")}
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
                {t("tools.manualPath")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("tools.manualPathDesc")}
              </p>

              <div className="space-y-3">
                                  <div className="flex space-x-2">
                                    <Input
                                      id="tmdbImportPath"
                                      value={tmdbImportPath}
                                      onChange={(e) => setTmdbImportPath(e.target.value)}
                                      onBlur={handlePathBlur}
                                      placeholder={t("tools.placeholder")}
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
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("tools.currentConfig")}</span>
                      <Badge variant="default" className="text-xs">{t("tools.configured")}</Badge>
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
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">{t("tools.toolDescription")}</p>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1 list-decimal list-inside">
                    <li>{t("tools.toolDesc1")}</li>
                    <li>{t("tools.toolDesc2")}</li>
                    <li>{t("tools.toolDesc3")}</li>
                    <li>{t("tools.toolDesc4")}</li>
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
                  <CardTitle className="text-base">{t("tools.configIniTitle")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium">{t("tools.encoding")}</Label>
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
                        {t("tools.saveUserProfile")}
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t("tools.saveUserProfileDesc")}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-sm font-medium">{t("tools.tmdbAccount")}</Label>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600 dark:text-gray-400">{t("tools.username")}</Label>
                      <Input
                        value={tmdbConfig.tmdb_username}
                        onChange={(e) => setTmdbConfig(prev => ({ ...prev, tmdb_username: e.target.value }))}
                        placeholder={t("tools.tmdbUsername")}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-gray-600 dark:text-gray-400">{t("tools.password")}</Label>
                      <div className="relative mt-1">
                        <Input
                          type={showTmdbPassword ? "text" : "password"}
                          value={tmdbConfig.tmdb_password}
                          onChange={(e) => setTmdbConfig(prev => ({ ...prev, tmdb_password: e.target.value }))}
                          placeholder={t("tools.tmdbPasswordPlaceholder")}
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
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("tools.imageUploadSettings")}</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="backdrop_forced_upload"
                      checked={tmdbConfig.backdrop_forced_upload}
                      onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, backdrop_forced_upload: checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="backdrop_forced_upload" className="text-sm font-medium">
                        {t("tools.forceUploadBackdrop")}
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t("tools.forceUploadBackdropDesc")}
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
                        {t("tools.autoVoteAfterUpload")}
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t("tools.autoVoteAfterUploadDesc")}
                      </p>
                    </div>
                  </div>

                  <div className="pb-2 pt-4 border-b border-gray-200 dark:border-gray-700">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("tools.csvImportSettings")}</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="rename_csv_on_import"
                      checked={tmdbConfig.rename_csv_on_import}
                      onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, rename_csv_on_import: checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="rename_csv_on_import" className="text-sm font-medium">
                        {t("tools.renameCsv")}
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t("tools.renameCsvDesc")}
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
                        {t("tools.deleteCsv")}
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t("tools.deleteCsvDesc")}
                      </p>
                    </div>
                  </div>

                  <div className="pb-2 pt-4 border-b border-gray-200 dark:border-gray-700">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("tools.otherSettings")}</Label>
                  </div>
                  <div className="pt-4">
                    <Label className="text-sm font-medium">{t("tools.filterWords")}</Label>
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
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t("tools.toolPathNotConfigured")}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {t("tools.configIniHint")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setToolsTab('management')}
                  >
                    {t("tools.goToToolManagement")}
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