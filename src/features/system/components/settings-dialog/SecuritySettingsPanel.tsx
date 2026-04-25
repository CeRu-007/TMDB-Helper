import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Shield, Eye, EyeOff, Check, X } from "lucide-react"
import type { PasswordForm } from "./types"
import { useTranslation } from "react-i18next"
import { useMemo } from "react"
import { validatePassword } from "@/lib/auth/password-validator"

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

  const passwordStrength = useMemo(() => validatePassword(passwordForm.newPassword), [passwordForm.newPassword])

  const strengthColor = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  }

  const strengthWidth = {
    weak: 'w-1/3',
    medium: 'w-2/3',
    strong: 'w-full',
  }

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

            {passwordForm.newPassword && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strengthColor[passwordStrength.strength]} ${strengthWidth[passwordStrength.strength]}`}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  {[
                    { key: 'minLength' as const, label: t("securityPanel.passwordReq1") },
                    { key: 'hasUppercase' as const, label: t("securityPanel.passwordReq2") },
                    { key: 'hasLowercase' as const, label: t("securityPanel.passwordReq3") },
                    { key: 'hasNumber' as const, label: t("securityPanel.passwordReq4") },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1.5">
                      {passwordStrength.checks[key] ? (
                        <Check className="h-3 w-3 text-green-500 shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-gray-300 dark:text-gray-600 shrink-0" />
                      )}
                      <span className={`text-xs ${
                        passwordStrength.checks[key]
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
