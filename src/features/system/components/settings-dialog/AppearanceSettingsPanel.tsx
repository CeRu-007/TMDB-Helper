/**
 * 外观设置面板
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card"
import { Button } from "@/components/common/button"
import { Label } from "@/components/common/label"
import { Switch } from "@/components/common/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select"
import { Palette, Sun, Moon, Monitor } from "lucide-react"
import type { AppearanceSettings } from "./types"

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
  const colorOptions = [
    { value: 'blue', label: '蓝色', color: 'bg-blue-500' },
    { value: 'green', label: '绿色', color: 'bg-green-500' },
    { value: 'purple', label: '紫色', color: 'bg-purple-500' },
    { value: 'orange', label: '橙色', color: 'bg-orange-500' },
    { value: 'red', label: '红色', color: 'bg-red-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">外观设置</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          自定义应用程序的主题和界面样式
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Palette className="h-4 w-4 mr-2" />
            主题设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium">主题模式</Label>
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
                <span className="text-sm font-medium">浅色</span>
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
                <span className="text-sm font-medium">深色</span>
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
                <span className="text-sm font-medium">跟随系统</span>
              </button>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">主色调</Label>
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
          <CardTitle className="text-base">界面样式</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">字体大小</Label>
            <Select
              value={appearanceSettings.fontSize}
              onValueChange={(value) => setAppearanceSettings({ ...appearanceSettings, fontSize: value as 'small' | 'medium' | 'large' })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">小</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="large">大</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">紧凑模式</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">减少间距，显示更多内容</p>
            </div>
            <Switch
              checked={appearanceSettings.compactMode}
              onCheckedChange={(checked) => setAppearanceSettings({ ...appearanceSettings, compactMode: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">显示动画</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">启用界面过渡动画</p>
            </div>
            <Switch
              checked={appearanceSettings.showAnimations}
              onCheckedChange={(checked) => setAppearanceSettings({ ...appearanceSettings, showAnimations: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">显示提示</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">显示工具提示和帮助信息</p>
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
          <CardTitle className="text-base">词条详情背景</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">启用毛玻璃效果</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">在词条详情页面使用毛玻璃背景</p>
            </div>
            <Switch
              checked={appearanceSettings.detailBackdropBlurEnabled}
              onCheckedChange={(checked) => setAppearanceSettings({ ...appearanceSettings, detailBackdropBlurEnabled: checked })}
            />
          </div>

          {appearanceSettings.detailBackdropBlurEnabled && (
            <div>
              <Label className="text-sm font-medium">模糊强度</Label>
              <Select
                value={appearanceSettings.detailBackdropBlurIntensity}
                onValueChange={(value) => setAppearanceSettings({ ...appearanceSettings, detailBackdropBlurIntensity: value as 'light' | 'medium' | 'heavy' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">轻微</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="heavy">强烈</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveAppearanceSettings}>
          <Palette className="h-4 w-4 mr-2" />
          保存外观设置
        </Button>
      </div>
    </div>
  )
}