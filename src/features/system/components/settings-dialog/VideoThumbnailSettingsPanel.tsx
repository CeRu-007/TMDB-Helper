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
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">视频缩略图提取设置</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          简单的顺序帧提取，从指定时间开始按帧间隔提取缩略图
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">提取设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="startTime">开始提取时间 (秒)</Label>
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
              从视频的哪个时间点开始提取缩略图
            </p>
          </div>

          <div>
            <Label htmlFor="thumbnailCount">缩略图数量</Label>
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
              要提取的缩略图数量
            </p>
          </div>

          <div>
            <Label htmlFor="frameInterval">帧间隔</Label>
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
              每隔多少帧提取一次（1=每帧，30=约每秒一次@30fps）
            </p>
          </div>

          <div>
            <Label htmlFor="threadCount">同时处理视频数量</Label>
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
              同时处理的视频数量
            </p>
          </div>

          <div>
            <Label htmlFor="outputFormat">输出格式</Label>
            <Select
              value={videoThumbnailSettings.outputFormat}
              onValueChange={(value) =>
                setVideoThumbnailSettings({ ...videoThumbnailSettings, outputFormat: value as "jpg" | "png" })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择输出格式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              缩略图输出格式
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
              保持原始分辨率
            </Label>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            保持视频的原始分辨率，否则将缩放到640x360
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">AI智能筛选</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                使用硅基流动AI识别有人物无字幕的帧
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
                  <span className="text-sm text-gray-600 dark:text-gray-400">硅基流动API:</span>
                  <Badge variant={apiSettings.siliconFlow?.apiKey ? "default" : "destructive"}>
                    {apiSettings.siliconFlow?.apiKey ? "已配置" : "未配置"}
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
                  配置API
                </Button>
              </div>
              {!apiSettings.siliconFlow?.apiKey && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  请先在模型服务页面设置硅基流动API密钥
                </p>
              )}
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">AI筛选工作原理：</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>程序按帧间隔提取视频帧</li>
                    <li>每帧都通过AI模型分析是否有人物和字幕</li>
                    <li>只有包含人物且无字幕的帧才会生成缩略图</li>
                    <li>这样可以自动筛选出高质量的缩略图</li>
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
          保存缩略图设置
        </Button>
      </div>
    </div>
  )
}