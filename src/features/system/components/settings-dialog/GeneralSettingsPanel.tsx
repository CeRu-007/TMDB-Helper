/**
 * 通用设置面板
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { Database, Globe, Settings } from "lucide-react"
import type { GeneralSettings } from "./types"

interface GeneralSettingsPanelProps {
  generalSettings: GeneralSettings
  setGeneralSettings: (settings: GeneralSettings) => void
  saveGeneralSettings: () => Promise<void>
}

export default function GeneralSettingsPanel({
  generalSettings,
  setGeneralSettings,
  saveGeneralSettings
}: GeneralSettingsPanelProps) {
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
              onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, autoSave: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">数据备份</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">定期备份重要数据</p>
            </div>
            <Switch
              checked={generalSettings.dataBackup}
              onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, dataBackup: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">缓存清理</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">自动清理过期缓存</p>
            </div>
            <Switch
              checked={generalSettings.cacheCleanup}
              onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, cacheCleanup: checked })}
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
              onChange={(e) => setGeneralSettings({ ...generalSettings, requestTimeout: parseInt(e.target.value) || 30 })}
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
              onChange={(e) => setGeneralSettings({ ...generalSettings, concurrentRequests: parseInt(e.target.value) || 5 })}
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
              onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, useProxy: checked })}
            />
          </div>

          {generalSettings.useProxy && (
            <div>
              <Label className="text-sm font-medium">代理地址</Label>
              <Input
                value={generalSettings.proxyUrl}
                onChange={(e) => setGeneralSettings({ ...generalSettings, proxyUrl: e.target.value })}
                placeholder="http://proxy.example.com:8080"
                className="mt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={saveGeneralSettings}>
          <Settings className="h-4 w-4 mr-2" />
          保存通用设置
        </Button>
      </div>
    </div>
  )
}