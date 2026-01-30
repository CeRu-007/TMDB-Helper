"use client"

import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Settings, RefreshCw, Loader2 } from "lucide-react"
import type { TMDBItem } from "@/lib/data/storage"

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
  return (
    <Card variant="frosted">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          TMDB数据
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshingTMDBData || !item.tmdbId}
            title="刷新TMDB数据、背景图、标志、网络logo和简介"
            className="w-full"
          >
            {isRefreshingTMDBData ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            刷新TMDB数据、标志、网络logo和简介
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}