"use client"

import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Tv } from "lucide-react"
import type { Season } from "@/lib/data/storage"
import { useTranslation } from "react-i18next"

interface SeasonSelectorProps {
  seasons: Season[]
  selectedSeason: number | null
  onSeasonClick: (seasonNumber: number) => void
}

export function SeasonSelector({
  seasons,
  selectedSeason,
  onSeasonClick
}: SeasonSelectorProps) {
  const { t } = useTranslation('media')

  if (!seasons || seasons.length === 0) {
    return null
  }

  return (
    <Card variant="frosted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          <Tv className="h-4 w-4 mr-2" />
          {t('seasonSelector.selectSeason')}
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
              {t('seasonSelector.seasonNumber', { number: season.seasonNumber })}
              {season.currentEpisode !== undefined && (
                <span className="ml-1 text-xs">
                  ({season.currentEpisode}/{season.totalEpisodes})
                </span>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
