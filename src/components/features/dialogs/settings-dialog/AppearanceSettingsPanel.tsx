/**
 * 外观设置面板
 * 
 * TODO: 从原始 settings-dialog.tsx 迁移外观设置相关逻辑
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card"
import { Palette } from "lucide-react"

export default function AppearanceSettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <Palette className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold">外观设置</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>主题和界面</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            配置应用程序的主题、颜色和界面样式。
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            此面板需要从原始 settings-dialog.tsx 迁移相关逻辑。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}