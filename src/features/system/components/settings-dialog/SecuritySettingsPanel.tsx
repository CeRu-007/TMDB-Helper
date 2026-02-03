/**
 * 账户安全设置面板
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Shield, Eye, EyeOff } from "lucide-react"
import type { PasswordForm } from "./types"

interface SecuritySettingsPanelProps {
  passwordForm: PasswordForm
  setPasswordForm: (form: PasswordForm) => void
  showCurrentPassword: boolean
  setShowCurrentPassword: (show: boolean) => void
  showNewPassword: boolean
  setShowNewPassword: (show: boolean) => void
  showConfirmPassword: boolean
  setShowConfirmPassword: (show: boolean) => void
  passwordChangeLoading: boolean
  handlePasswordChange: () => Promise<void>
}

export default function SecuritySettingsPanel({
  passwordForm,
  setPasswordForm,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  passwordChangeLoading,
  handlePasswordChange
}: SecuritySettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">账户安全</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          修改管理员账户密码，确保账户安全
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            密码修改
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 当前密码 */}
          <div>
            <Label htmlFor="currentPassword">当前密码</Label>
            <div className="relative mt-1">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="请输入当前密码"
                className="pr-10"
                disabled={passwordChangeLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={passwordChangeLoading}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* 新密码 */}
          <div>
            <Label htmlFor="newPassword">新密码</Label>
            <div className="relative mt-1">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="请输入新密码（至少6位）"
                className="pr-10"
                disabled={passwordChangeLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={passwordChangeLoading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* 确认新密码 */}
          <div>
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <div className="relative mt-1">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="请再次输入新密码"
                className="pr-10"
                disabled={passwordChangeLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={passwordChangeLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* 密码要求提示 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>密码要求：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>至少6个字符</li>
              <li>建议包含字母和数字</li>
              <li>避免使用过于简单的密码</li>
            </ul>
          </div>

          {/* 修改按钮 */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handlePasswordChange}
              disabled={passwordChangeLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="min-w-[100px]"
            >
              {passwordChangeLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  修改中...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  修改密码
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}