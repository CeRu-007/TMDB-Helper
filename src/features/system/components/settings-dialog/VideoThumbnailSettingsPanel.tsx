/**
 * 视频缩略图设置面板
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Slider } from "@/shared/components/ui/slider"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Badge } from "@/shared/components/ui/badge"
import { Film, Settings, Info } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { VideoThumbnailSettings, ApiSettings } from "./types"

interface VideoThumbnailSettingsPanelProps {
  videoThumbnailSettings: VideoThumbnailSettings
  setVideoThumbnailSettings: (settings: VideoThumbnailSettings) => void
  apiSettings: ApiSettings
  setApiSettings: (settings: ApiSettings) => void
  saveVideoThumbnailSettings: () => Promise<void>
}

export default function VideoThumbnailSettingsPanel({
  videoThumbnailSettings,
  setVideoThumbnailSettings,
  apiSettings,
  setApiSettings,
  saveVideoThumbnailSettings
}: VideoThumbnailSettingsPanelProps) {
  const { t } = useTranslation("settings")

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t("videoThumbnail.title")}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t("videoThumbnail.extractionDesc", "简单的顺序帧提取，从指定时间开始按帧间隔提取缩略图")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("videoThumbnail.extractionSettings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="startTime">{t("videoThumbnail.startTime")}</Label>
            <Input
              id="startTime"
              type="number"
              min="0"
              step="0.1"
              value={videoThumbnailSettings.startTime}
              onChange={(e) =>
                setVideoThumbnailSettings({ ...videoThumbnailSettings, startTime: Number(e.target.value) })
              }
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("videoThumbnail.startTimeTooltip")}
            </p>
          </div>

          <div>
            <Label htmlFor="thumbnailCount">{t("videoThumbnail.thumbnailCount")}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Slider
                value={[videoThumbnailSettings.thumbnailCount]}
                min={1}
                max={20}
                step={1}
                onValueChange={([value]) =>
                  setVideoThumbnailSettings({ ...videoThumbnailSettings, thumbnailCount: value })
                }
                className="flex-1"
              />
              <span className="font-medium w-8 text-center">{videoThumbnailSettings.thumbnailCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("videoThumbnail.thumbnailCountTooltip")}
            </p>
          </div>

          <div>
            <Label htmlFor="frameInterval">{t("videoThumbnail.frameInterval")}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Slider
                value={[videoThumbnailSettings.frameInterval]}
                min={1}
                max={300}
                step={1}
                onValueChange={([value]) =>
                  setVideoThumbnailSettings({ ...videoThumbnailSettings, frameInterval: value })
                }
                className="flex-1"
              />
              <span className="font-medium w-12 text-center">{videoThumbnailSettings.frameInterval}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("videoThumbnail.frameIntervalTooltip")}
            </p>
          </div>

          <div>
            <Label htmlFor="threadCount">{t("videoThumbnail.threadCount")}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Slider
                value={[videoThumbnailSettings.threadCount]}
                min={1}
                max={8}
                step={1}
                onValueChange={([value]) =>
                  setVideoThumbnailSettings({ ...videoThumbnailSettings, threadCount: value })
                }
                className="flex-1"
              />
              <span className="font-medium w-8 text-center">{videoThumbnailSettings.threadCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("videoThumbnail.threadCountTooltip")}
            </p>
          </div>

          <div>
            <Label htmlFor="outputFormat">{t("videoThumbnail.outputFormat")}</Label>
            <Select
              value={videoThumbnailSettings.outputFormat}
              onValueChange={(value) =>
                setVideoThumbnailSettings({ ...videoThumbnailSettings, outputFormat: value as "jpg" | "png" })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t("videoThumbnail.selectFormat")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {t("videoThumbnail.outputFormatDesc", "缩略图输出格式")}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="keepOriginalResolution"
              checked={videoThumbnailSettings.keepOriginalResolution}
              onCheckedChange={(checked) =>
                setVideoThumbnailSettings({ ...videoThumbnailSettings, keepOriginalResolution: !!checked })
              }
            />
            <Label htmlFor="keepOriginalResolution" className="cursor-pointer">
              {t("videoThumbnail.keepOriginal")}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {t("videoThumbnail.keepOriginalTooltip")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t("videoThumbnail.aiFilter")}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t("videoThumbnail.aiFilterDesc")}
              </p>
            </div>
            <Switch
              checked={videoThumbnailSettings.enableAIFilter}
              onCheckedChange={(checked) =>
                setVideoThumbnailSettings({ ...videoThumbnailSettings, enableAIFilter: !!checked })
              }
            />
          </div>
        </CardHeader>
        {videoThumbnailSettings.enableAIFilter && (
          <CardContent className="space-y-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("videoThumbnail.siliconFlowApi")}</span>
                  <Badge variant={apiSettings.siliconFlow?.apiKey ? "default" : "destructive"}>
                    {apiSettings.siliconFlow?.apiKey ? t("videoThumbnail.configured") : t("videoThumbnail.notConfigured")}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('settings-navigate', { detail: { section: 'model-service' } }))
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t("videoThumbnail.configureApi")}
                </Button>
              </div>
              {!apiSettings.siliconFlow?.apiKey && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  {t("videoThumbnail.configureApiTooltip")}
                </p>
              )}
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">{t("videoThumbnail.aiFilterHowItWorks")}</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>{t("videoThumbnail.step1")}</li>
                    <li>{t("videoThumbnail.step2")}</li>
                    <li>{t("videoThumbnail.step3")}</li>
                    <li>{t("videoThumbnail.step4")}</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveVideoThumbnailSettings}>
          <Film className="h-4 w-4 mr-2" />
          {t("videoThumbnail.saveSettings")}
        </Button>
      </div>
    </div>
  )
}