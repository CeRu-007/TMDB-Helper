/**
 * Appearance Settings Panel
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Palette, Sun, Moon, Monitor } from "lucide-react"
import type { AppearanceSettings } from "./types"
import { useTranslation } from "react-i18next"

interface AppearanceSettingsPanelProps {
  appearanceSettings: AppearanceSettings
  setAppearanceSettings: (settings: AppearanceSettings) => void
  saveAppearanceSettings: () => Promise<void>
}

export default function AppearanceSettingsPanel({
  appearanceSettings,
  setAppearanceSettings,
  saveAppearanceSettings
}: AppearanceSettingsPanelProps) {
  const { t } = useTranslation("settings")
  const colorOptions = [
    { value: 'blue', label: t("appearancePanel.blue"), color: 'bg-blue-500' },
    { value: 'green', label: t("appearancePanel.green"), color: 'bg-green-500' },
    { value: 'purple', label: t("appearancePanel.purple"), color: 'bg-purple-500' },
    { value: 'orange', label: t("appearancePanel.orange"), color: 'bg-orange-500' },
    { value: 'red', label: t("appearancePanel.red"), color: 'bg-red-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t("appearanceSettings")}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t("appearanceSettingsDesc")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Palette className="h-4 w-4 mr-2" />
            {t("appearancePanel.themeSettings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium">{t("appearancePanel.themeMode")}</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <button
                onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: 'light' })}
                className={`p-4 rounded-lg border-2 flex flex-col items-center space-y-2 transition-all ${
                  appearanceSettings.theme === 'light'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Sun className="h-6 w-6" />
                <span className="text-sm font-medium">{t("themeLight")}</span>
              </button>

              <button
                onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: 'dark' })}
                className={`p-4 rounded-lg border-2 flex flex-col items-center space-y-2 transition-all ${
                  appearanceSettings.theme === 'dark'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Moon className="h-6 w-6" />
                <span className="text-sm font-medium">{t("themeDark")}</span>
              </button>

              <button
                onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: 'system' })}
                className={`p-4 rounded-lg border-2 flex flex-col items-center space-y-2 transition-all ${
                  appearanceSettings.theme === 'system'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Monitor className="h-6 w-6" />
                <span className="text-sm font-medium">{t("themeSystem")}</span>
              </button>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">{t("appearancePanel.primaryColor")}</Label>
            <div className="grid grid-cols-5 gap-3 mt-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setAppearanceSettings({ ...appearanceSettings, primaryColor: option.value })}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center space-y-2 transition-all ${
                    appearanceSettings.primaryColor === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${option.color}`} />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("appearancePanel.interfaceStyle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{t("appearancePanel.fontSize")}</Label>
            <Select
              value={appearanceSettings.fontSize}
              onValueChange={(value) => setAppearanceSettings({ ...appearanceSettings, fontSize: value as 'small' | 'medium' | 'large' })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t("appearancePanel.fontSizeSmall")}</SelectItem>
                <SelectItem value="medium">{t("appearancePanel.fontSizeMedium")}</SelectItem>
                <SelectItem value="large">{t("appearancePanel.fontSizeLarge")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t("appearancePanel.compactMode")}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("appearancePanel.compactModeDesc")}</p>
            </div>
            <Switch
              checked={appearanceSettings.compactMode}
              onCheckedChange={(checked) => setAppearanceSettings({ ...appearanceSettings, compactMode: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t("appearancePanel.showAnimations")}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("appearancePanel.showAnimationsDesc")}</p>
            </div>
            <Switch
              checked={appearanceSettings.showAnimations}
              onCheckedChange={(checked) => setAppearanceSettings({ ...appearanceSettings, showAnimations: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t("appearancePanel.showTooltips")}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("appearancePanel.showTooltipsDesc")}</p>
            </div>
            <Switch
              checked={appearanceSettings.showTooltips}
              onCheckedChange={(checked) => setAppearanceSettings({ ...appearanceSettings, showTooltips: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("appearancePanel.detailBackdrop")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t("appearancePanel.enableBlur")}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("appearancePanel.enableBlurDesc")}</p>
            </div>
            <Switch
              checked={appearanceSettings.detailBackdropBlurEnabled}
              onCheckedChange={(checked) => setAppearanceSettings({ ...appearanceSettings, detailBackdropBlurEnabled: checked })}
            />
          </div>

          {appearanceSettings.detailBackdropBlurEnabled && (
            <div>
              <Label className="text-sm font-medium">{t("appearancePanel.blurIntensity")}</Label>
              <Select
                value={appearanceSettings.detailBackdropBlurIntensity}
                onValueChange={(value) => setAppearanceSettings({ ...appearanceSettings, detailBackdropBlurIntensity: value as 'light' | 'medium' | 'heavy' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("appearancePanel.blurLight")}</SelectItem>
                  <SelectItem value="medium">{t("appearancePanel.blurMedium")}</SelectItem>
                  <SelectItem value="heavy">{t("appearancePanel.blurHeavy")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveAppearanceSettings}>
          <Palette className="h-4 w-4 mr-2" />
          {t("appearancePanel.saveAppearance")}
        </Button>
      </div>
    </div>
  )
}