"use client"

import { Button } from "@/shared/components/ui/button"
import { AlertTriangle, Wifi, Key, Server, RefreshCw, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"

interface ErrorStateProps {
  error: string | null
  onRefresh: () => void
  onOpenSettings?: () => void
}

export function ErrorState({ error, onRefresh, onOpenSettings }: ErrorStateProps) {
  const { t } = useTranslation("media")

  const errorMessage = error || t("error.defaultLoadFailed")
  const isNetworkError = errorMessage.includes('aborted') ||
                        errorMessage.includes('timeout') ||
                        errorMessage.includes('network') ||
                        errorMessage.includes('连接失败')
  const isApiKeyError = errorMessage.includes('API密钥') ||
                        errorMessage.includes('401')
  const isServerError = errorMessage.includes('500') ||
                        errorMessage.includes('服务器')

  let errorIcon = <AlertTriangle className="h-5 w-5 mr-2" />
  let errorTitle = t("error.loadFailed")
  let errorTip = ""

  if (isNetworkError) {
    errorIcon = <Wifi className="h-5 w-5 mr-2" />
    errorTitle = t("error.networkProblem")
    errorTip = t("error.networkTip")
  } else if (isApiKeyError) {
    errorIcon = <Key className="h-5 w-5 mr-2" />
    errorTitle = t("error.apiKeyProblem")
    errorTip = t("error.apiKeyTip")
  } else if (isServerError) {
    errorIcon = <Server className="h-5 w-5 mr-2" />
    errorTitle = t("error.serverError")
    errorTip = t("error.serverTip")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="bg-red-50 p-6 rounded-lg border border-red-200 max-w-md">
        <h2 className="text-xl font-semibold mb-2 text-red-700 flex items-center">
          {errorIcon}
          {errorTitle}
        </h2>
        <p className="text-red-600 mb-2">{errorMessage}</p>
        {errorTip && (
          <p className="text-sm text-red-500 mb-4 bg-red-100 p-2 rounded">
            {t("error.hint")}: {errorTip}
          </p>
        )}
        <div className="flex space-x-3 mt-4">
          <Button onClick={onRefresh} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("tmdbIntegration.refreshData")}
          </Button>
          {isApiKeyError && onOpenSettings && (
            <Button onClick={onOpenSettings} variant="outline" className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              {t("error.configureApiKey")}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
