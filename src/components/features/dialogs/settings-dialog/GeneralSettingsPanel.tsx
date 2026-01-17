/**
 * 通用设置面板
 * 
 * TODO: 从原始 settings-dialog.tsx 迁移通用设置相关逻辑
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card"
import { Settings } from "lucide-react"

export default function GeneralSettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold">通用设置</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>应用程序配置</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            配置应用程序的通用设置，如自动保存、数据备份等。
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            此面板需要从原始 settings-dialog.tsx 迁移相关逻辑。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}