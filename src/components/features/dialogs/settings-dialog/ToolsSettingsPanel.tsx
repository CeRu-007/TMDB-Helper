/**
 * 工具配置面板
 * 
 * TODO: 从原始 settings-dialog.tsx 迁移工具配置相关逻辑
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card"
import { Terminal } from "lucide-react"

export default function ToolsSettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <Terminal className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold">工具配置</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>TMDB-Import 工具</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            配置 TMDB-Import 工具的路径和设置。
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            此面板需要从原始 settings-dialog.tsx 迁移相关逻辑。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}