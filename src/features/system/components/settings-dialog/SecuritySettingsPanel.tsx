/**
 * Security Settings Panel
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Shield, Eye, EyeOff } from "lucide-react"
import type { PasswordForm } from "./types"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation("settings")
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t("menu.security")}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t("securityPanel.securityDesc")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            {t("securityPanel.passwordChange")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 当前密码 */}
          <div>
            <Label htmlFor="currentPassword">{t("securityPanel.currentPassword")}</Label>
            <div className="relative mt-1">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder={t("securityPanel.enterCurrentPassword")}
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
            <Label htmlFor="newPassword">{t("securityPanel.newPassword")}</Label>
            <div className="relative mt-1">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder={t("securityPanel.enterNewPassword")}
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
            <Label htmlFor="confirmPassword">{t("securityPanel.confirmNewPassword")}</Label>
            <div className="relative mt-1">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder={t("securityPanel.enterConfirmPassword")}
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
            <p>{t("securityPanel.passwordRequirements")}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t("securityPanel.passwordReq1")}</li>
              <li>{t("securityPanel.passwordReq2")}</li>
              <li>{t("securityPanel.passwordReq3")}</li>
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
                  {t("securityPanel.changing")}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  {t("securityPanel.changePassword")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}