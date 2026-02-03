"use client"

import { Button } from "@/shared/components/ui/button"
import { AlertTriangle, Wifi, Key, Server, RefreshCw, Settings } from "lucide-react"

interface ErrorStateProps {
  error: string | null
  onRefresh: () => void
  onOpenSettings?: () => void
}

export function ErrorState({ error, onRefresh, onOpenSettings }: ErrorStateProps) {
  // 根据错误信息提供更具体的提示
  const errorMessage = error || "无法加载数据，请刷新页面重试"
  const isNetworkError = errorMessage.includes('aborted') ||
                        errorMessage.includes('timeout') ||
                        errorMessage.includes('network') ||
                        errorMessage.includes('连接失败')
  const isApiKeyError = errorMessage.includes('API密钥') ||
                        errorMessage.includes('401')
  const isServerError = errorMessage.includes('500') ||
                        errorMessage.includes('服务器')

  let errorIcon = <AlertTriangle className="h-5 w-5 mr-2" />
  let errorTitle = "加载失败"
  let errorTip = ""

  if (isNetworkError) {
    errorIcon = <Wifi className="h-5 w-5 mr-2" />
    errorTitle = "网络连接问题"
    errorTip = "请检查您的网络连接，或者TMDB服务器可能暂时不可用"
  } else if (isApiKeyError) {
    errorIcon = <Key className="h-5 w-5 mr-2" />
    errorTitle = "API密钥问题"
    errorTip = "请检查您的TMDB API密钥是否有效"
  } else if (isServerError) {
    errorIcon = <Server className="h-5 w-5 mr-2" />
    errorTitle = "服务器错误"
    errorTip = "TMDB服务器可能暂时不可用，请稍后再试"
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg border border-red-200 dark:border-red-800 max-w-md">
        <h2 className="text-xl font-semibold mb-2 text-red-700 dark:text-red-300 flex items-center">
          {errorIcon}
          {errorTitle}
        </h2>
        <p className="text-red-600 dark:text-red-300 mb-2">{errorMessage}</p>
        {errorTip && (
          <p className="text-sm text-red-500 dark:text-red-400 mb-4 bg-red-100 dark:bg-red-900/50 p-2 rounded">
            提示: {errorTip}
          </p>
        )}
        <div className="flex space-x-3 mt-4">
          <Button onClick={onRefresh} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            重新加载
          </Button>
          {isApiKeyError && onOpenSettings && (
            <Button onClick={onOpenSettings} variant="outline" className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              配置API密钥
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}