"use client"

import { useState, useEffect } from "react"
import { Download, ExternalLink, X, Sparkles, ArrowRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Markdown } from "@/shared/components/ui/markdown"
import { saveDismissedVersion, isVersionDismissed } from "@/lib/hooks/use-update-check"
import type { GitHubRelease } from "@/types/updates"
import { useTranslation } from "react-i18next"

interface UpdateNotification {
  currentVersion: string
  latestVersion: string
  releaseInfo: GitHubRelease | null
}

export function UpdateNotificationDialog() {
  const { t } = useTranslation("settings")
  const [open, setOpen] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateNotification | null>(null)
  const [skipThisVersion, setSkipThisVersion] = useState(false)

  useEffect(() => {
    const handleUpdateAvailable = (event: CustomEvent<UpdateNotification>) => {
      const { latestVersion } = event.detail
      if (isVersionDismissed(latestVersion)) return

      setUpdateInfo(event.detail)
      setSkipThisVersion(false)
      setOpen(true)
    }

    window.addEventListener('version-update-available', handleUpdateAvailable as EventListener)
    return () => {
      window.removeEventListener('version-update-available', handleUpdateAvailable as EventListener)
    }
  }, [])

  const handleClose = () => {
    if (skipThisVersion && updateInfo?.latestVersion) {
      saveDismissedVersion(updateInfo.latestVersion)
    }
    setOpen(false)
  }

  const handleDownload = () => {
    if (updateInfo?.releaseInfo?.html_url) {
      window.open(updateInfo.releaseInfo.html_url, '_blank')
    } else {
      window.open('https://github.com/CeRu-007/TMDB-Helper/releases/latest', '_blank')
    }
    setOpen(false)
  }

  const handleViewAllReleases = () => {
    window.open('https://github.com/CeRu-007/TMDB-Helper/releases', '_blank')
    setOpen(false)
  }

  if (!updateInfo) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("updateDialog.title", { version: updateInfo.latestVersion })}
          </DialogTitle>
          <DialogDescription>
            {t("updateDialog.description", {
              current: updateInfo.currentVersion,
              latest: updateInfo.latestVersion,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5">
            <div className="p-1.5 rounded-md bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("updateDialog.newVersion")}</span>
                <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                  {updateInfo.latestVersion}
                </Badge>
              </div>
            </div>
          </div>

          {updateInfo.releaseInfo && (
            <div className="rounded-lg border">
              <div className="px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {updateInfo.releaseInfo.name}
                  </Badge>
                </div>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="p-4">
                  <Markdown className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
                    {updateInfo.releaseInfo.body || t("updateDialog.noReleaseNotes")}
                  </Markdown>
                </div>
              </ScrollArea>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skipThisVersion}
              onChange={(e) => setSkipThisVersion(e.target.checked)}
              className="rounded border-gray-300"
            />
            {t("updateDialog.skipVersion", { version: updateInfo.latestVersion })}
          </label>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleClose} className="sm:mr-auto">
            {t("updateDialog.later")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewAllReleases} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            {t("updateDialog.viewAllReleases")}
          </Button>
          <Button size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {t("updateDialog.download")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
