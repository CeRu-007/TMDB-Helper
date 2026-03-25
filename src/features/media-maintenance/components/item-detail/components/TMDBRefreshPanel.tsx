"use client"

import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Settings, RefreshCw, Loader2 } from "lucide-react"
import type { TMDBItem } from "@/lib/data/storage"
import { useTranslation } from "react-i18next"

interface TMDBRefreshPanelProps {
  item: TMDBItem
  isRefreshingTMDBData: boolean
  onRefresh: () => void
}

export function TMDBRefreshPanel({
  item,
  isRefreshingTMDBData,
  onRefresh
}: TMDBRefreshPanelProps) {
  const { t } = useTranslation('media')

  return (
    <Card variant="frosted">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          {t('tmdbPanel.data')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshingTMDBData || !item.tmdbId}
            title={t('tmdbPanel.refreshData')}
            className="w-full"
          >
            {isRefreshingTMDBData ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {t('tmdbPanel.refreshDataDesc')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
