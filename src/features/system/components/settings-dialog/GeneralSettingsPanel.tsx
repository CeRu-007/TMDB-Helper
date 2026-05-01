import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Globe, Settings, Image, ExternalLink } from "lucide-react"
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
            <Globe className="h-4 w-4 mr-2" />
            {t("network")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                placeholder={t("proxyAddressPlaceholder")}
                className="mt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Image className="h-4 w-4 mr-2" />
            {t("detailBackdrop")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t("enableBlur")}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("enableBlurDesc")}</p>
            </div>
            <Switch
              checked={generalSettings.detailBackdropBlurEnabled}
              onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, detailBackdropBlurEnabled: checked })}
            />
          </div>

          {generalSettings.detailBackdropBlurEnabled && (
            <div>
              <Label className="text-sm font-medium">{t("blurIntensity")}</Label>
              <Select
                value={generalSettings.detailBackdropBlurIntensity}
                onValueChange={(value) => setGeneralSettings({ ...generalSettings, detailBackdropBlurIntensity: value as 'light' | 'medium' | 'heavy' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("blurLight")}</SelectItem>
                  <SelectItem value="medium">{t("blurMedium")}</SelectItem>
                  <SelectItem value="heavy">{t("blurHeavy")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <ExternalLink className="h-4 w-4 mr-2" />
            {t("tmdbHoverButton")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{t("tmdbHoverButtonAction")}</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t("tmdbHoverButtonActionDesc")}</p>
            <Select
              value={generalSettings.tmdbButtonBehavior}
              onValueChange={(value) => setGeneralSettings({ ...generalSettings, tmdbButtonBehavior: value as 'detail' | 'search' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detail">{t("tmdbHoverButtonActionDetail")}</SelectItem>
                <SelectItem value="search">{t("tmdbHoverButtonActionSearch")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveGeneralSettings}>
          <Settings className="h-4 w-4 mr-2" />
          {t("saveGeneralSettings")}
        </Button>
      </div>
    </div>
  )
}
