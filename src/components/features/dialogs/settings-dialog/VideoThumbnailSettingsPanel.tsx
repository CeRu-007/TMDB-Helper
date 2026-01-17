/**
 * 视频缩略图设置面板
 * 
 * TODO: 从原始 settings-dialog.tsx 迁移视频缩略图相关逻辑
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card"
import { Film } from "lucide-react"

export default function VideoThumbnailSettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <Film className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold">视频缩略图设置</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>缩略图提取配置</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            配置视频缩略图提取的参数和 AI 筛选功能。
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            此面板需要从原始 settings-dialog.tsx 迁移相关逻辑。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}