/**
 * Help & Support Panel
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Info, HelpCircle, ExternalLink, RefreshCw, CheckCircle2, Sparkles, Download, ArrowRight, Clock } from "lucide-react"
import type { AppInfo } from "./types"
import { useUpdateCheck } from "@/lib/hooks/use-update-check"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

interface HelpSettingsPanelProps {
  appInfo: AppInfo
}

export default function HelpSettingsPanel({
  appInfo
}: HelpSettingsPanelProps) {
  const { t } = useTranslation("settings")
  const {
    hasUpdate,
    currentVersion,
    latestVersion,
    releaseInfo,
    lastChecked,
    isLoading,
    error,
    isCached,
    checkForUpdates,
  } = useUpdateCheck()

  const formatLastChecked = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return t("updateCheck.justNow")
    if (minutes < 60) return t("updateCheck.minutesAgo", { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t("updateCheck.hoursAgo", { count: hours })
    return t("updateCheck.daysAgo", { count: Math.floor(hours / 24) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t("helpPanel.title")}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t("menu.helpDesc")}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>
              </div>

              <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

              <div className="relative z-10 p-8 text-center">
                <img
                  src="/images/tmdb-helper-logo-new.png"
                  alt="TMDB Helper Logo"
                  className="h-20 w-20 mx-auto mb-4"
                  onError={(e) => {
                    e.currentTarget.src = "/tmdb-helper-logo.png"
                  }}
                />
                <h2 className="text-2xl font-light tracking-wide text-slate-800 dark:text-slate-100 mb-1">
                  {appInfo.name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  {t("helpPanel.appSlogan")}
                </p>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">v{appInfo.version}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <HelpCircle className="h-4 w-4 mr-2" />
              {t("helpPanel.quickLinks")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              onClick={() => window.open('https://github.com/CeRu-007/TMDB-Helper', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">{t("helpPanel.githubRepo")}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("helpPanel.viewSourceAndIssue")}</div>
              </div>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              onClick={() => window.open('https://github.com/CeRu-007/TMDB-Helper/releases', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">{t("helpPanel.changelog")}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("helpPanel.viewVersionHistory")}</div>
              </div>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              onClick={() => window.open('https://github.com/CeRu-007/TMDB-Helper/issues', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">{t("helpPanel.issueFeedback")}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("helpPanel.reportBugOrSuggest")}</div>
              </div>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              onClick={() => window.open('https://hub.docker.com/r/ceru007/tmdb-helper', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">{t("helpPanel.dockerHub")}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("helpPanel.getDockerImage")}</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Info className="h-4 w-4 mr-2" />
              {t("helpPanel.appInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("helpPanel.version")}</div>
                <div className="text-sm font-medium">{appInfo.version}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("helpPanel.buildTime")}</div>
                <div className="text-sm font-medium">{appInfo.buildDate || t("helpPanel.devVersion")}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("helpPanel.appType")}</div>
                <div className="text-sm font-medium">{t("helpPanel.webElectron")}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("helpPanel.license")}</div>
                <div className="text-sm font-medium">{t("helpPanel.mitLicense")}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t("helpPanel.techStack")}</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">Next.js 15</Badge>
                <Badge variant="secondary" className="text-xs">React 18</Badge>
                <Badge variant="secondary" className="text-xs">TypeScript</Badge>
                <Badge variant="secondary" className="text-xs">Tailwind CSS</Badge>
                <Badge variant="secondary" className="text-xs">Electron</Badge>
                <Badge variant="secondary" className="text-xs">Docker</Badge>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t("helpPanel.coreDeps")}</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">TMDB API</Badge>
                <Badge variant="outline" className="text-xs">TMDB-Import</Badge>
                <Badge variant="outline" className="text-xs">{t("helpPanel.aiModelService")}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <HelpCircle className="h-4 w-4 mr-2" />
              {t("helpPanel.appIntro")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              {t("helpPanel.appDescription")}
            </p>
            <div className="space-y-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t("helpPanel.mainFeatures")}</div>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>• 🎬 {t("helpPanel.feature1")}</li>
                <li>• 📺 {t("helpPanel.feature2")}</li>
                <li>• 🖼️ {t("helpPanel.feature3")}</li>
                <li>• 🤖 {t("helpPanel.feature4")}</li>
                <li>• 🔊 {t("helpPanel.feature5")}</li>
                <li>• 🔧 {t("helpPanel.feature6")}</li>
                <li>• 🚀 {t("helpPanel.feature7")}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("helpPanel.versionCheck")}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkForUpdates({ force: true })}
                disabled={isLoading}
                className="gap-2 shrink-0"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                {t("helpPanel.checkNow")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="p-1.5 rounded-md bg-muted">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-0.5">{t("helpPanel.currentVersion")}</div>
                  <div className="text-lg font-semibold truncate">{currentVersion || appInfo.version}</div>
                </div>
                {!hasUpdate && !isLoading && currentVersion && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                )}
              </div>

              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg border bg-card",
                hasUpdate && "border-primary bg-primary/5"
              )}>
                <div className={cn(
                  "p-1.5 rounded-md",
                  hasUpdate ? "bg-primary" : "bg-muted"
                )}>
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : hasUpdate ? (
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Info className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs text-muted-foreground">{t("helpPanel.latestVersion")}</span>
                    {hasUpdate && (
                      <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                        {t("helpPanel.hasUpdate")}
                      </Badge>
                    )}
                  </div>
                  <div className={cn(
                    "text-lg font-semibold truncate",
                    hasUpdate && "text-primary"
                  )}>
                    {latestVersion || "-"}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-destructive/50 bg-destructive/5 text-sm text-destructive">
                {error}
              </div>
            )}

            {isCached && !error && lastChecked && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {t("helpPanel.cachedData")} · {formatLastChecked(lastChecked)}
              </div>
            )}

            {hasUpdate && releaseInfo && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.open(releaseInfo.html_url, '_blank')}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("helpPanel.downloadNewVersion")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.open('https://github.com/CeRu-007/TMDB-Helper/releases', '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("helpPanel.viewAllVersions")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-900/50">
          <CardContent className="py-6">
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                © 2024 TMDB Helper. {t("helpPanel.copyright")}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t("helpPanel.basedOnTmdb")} · {t("helpPanel.mitLicense")}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t("helpPanel.specialThanks")} <a href="https://github.com/fzlins/TMDB-Import" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">fzlins/TMDB-Import</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
