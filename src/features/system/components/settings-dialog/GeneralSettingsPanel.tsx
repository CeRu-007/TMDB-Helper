/**
 * 通用设置面板
 */

import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation("settings")

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t("generalSettings")}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t("generalSettingsDesc")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Database className="h-4 w-4 mr-2" />
            {t("dataManagement")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t("autoSave")}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("autoSaveDesc")}</p>
            </div>
            <Switch
              checked={generalSettings.autoSave ?? true}
              onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, autoSave: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t("dataBackup")}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("dataBackupDesc")}</p>
            </div>
            <Switch
              checked={generalSettings.dataBackup ?? true}
              onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, dataBackup: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t("cacheCleanup")}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("cacheCleanupDesc")}</p>
            </div>
            <Switch
              checked={generalSettings.cacheCleanup ?? true}
              onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, cacheCleanup: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Globe className="h-4 w-4 mr-2" />
            {t("network")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{t("requestTimeout")}</Label>
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
            <Label className="text-sm font-medium">{t("concurrentRequests")}</Label>
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
              <Label className="text-sm font-medium">{t("useProxy")}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("useProxyDesc")}</p>
            </div>
            <Switch
              checked={generalSettings.useProxy}
              onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, useProxy: checked })}
            />
          </div>

          {generalSettings.useProxy && (
            <div>
              <Label className="text-sm font-medium">{t("proxyAddress")}</Label>
              <Input
                value={generalSettings.proxyUrl}
                onChange={(e) => setGeneralSettings({ ...generalSettings, proxyUrl: e.target.value })}
                placeholder={t("generalSettings.proxyAddressPlaceholder")}
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
          {t("saveGeneralSettings")}
        </Button>
      </div>
    </div>
  )
}