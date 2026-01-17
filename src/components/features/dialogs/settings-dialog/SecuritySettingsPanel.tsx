/**
 * 账户安全设置面板
 * 
 * TODO: 从原始 settings-dialog.tsx 迁移安全设置相关逻辑
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card"
import { Shield } from "lucide-react"

export default function SecuritySettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <Shield className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold">账户安全</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>密码和安全</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            修改密码和管理账户安全设置。
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            此面板需要从原始 settings-dialog.tsx 迁移相关逻辑。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}