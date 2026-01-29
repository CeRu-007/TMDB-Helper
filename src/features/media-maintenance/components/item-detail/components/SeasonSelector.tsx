"use client"

import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Tv } from "lucide-react"
import type { Season } from "@/lib/data/storage"

export function SeasonSelector({
  seasons,
  selectedSeason,
  onSeasonClick
}: SeasonSelectorProps) {
  if (!seasons || seasons.length === 0) {
    return null
  }

  return (
    <Card variant="frosted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          <Tv className="h-4 w-4 mr-2" />
          选择季
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {seasons.map((season) => (
            <Button
              key={season.seasonNumber}
              variant={selectedSeason === season.seasonNumber ? "default" : "outline"}
              size="sm"
              onClick={() => onSeasonClick(season.seasonNumber)}
            >
              第{season.seasonNumber}季
              {season.currentEpisode !== undefined && (
                <span className="ml-1 text-xs">
                  ({season.currentEpisode}/{season.totalEpisodes})
                </span>
              )}            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}