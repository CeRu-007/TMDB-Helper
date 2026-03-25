"use client"

import { useRef } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
  Settings,
  RotateCcw,
  Trash2,
  PlusCircle,
  Plus
} from "lucide-react"
import type { Season } from "@/lib/data/storage"
import { useTranslation } from "react-i18next"

interface EpisodeBatchActionsProps {
  currentSeason: Season | undefined
  selectedSeason: number | undefined
  editing: boolean
  customSeasonNumber: number
  onResetSeason: () => void
  onDeleteSeason: () => void
  onAddSeason: (seasonNumber: number, episodeCount: number) => void
  onCustomSeasonNumberChange: (value: number) => void
}

export function EpisodeBatchActions({
  currentSeason,
  selectedSeason,
  editing,
  customSeasonNumber,
  onResetSeason,
  onDeleteSeason,
  onAddSeason,
  onCustomSeasonNumberChange
}: EpisodeBatchActionsProps) {
  const { t } = useTranslation('media')
  const episodeInputRef = useRef<HTMLInputElement>(null)

  if (!editing || selectedSeason === undefined) {
    return null
  }

  return (
    <Card variant="frosted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          {t('episodeBatchActions.seasonOperations')}
          {currentSeason && (
            <Badge variant="outline" className="ml-2">
              {t('episodeBatchActions.progress')}: {currentSeason.currentEpisode || 0}/{currentSeason.totalEpisodes}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onResetSeason}
            title={t('episodeBatchActions.reset')}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('episodeBatchActions.reset')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteSeason()}
            title={t('episodeBatchActions.deleteSeason')}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('episodeBatchActions.deleteSeason')}
          </Button>
        </div>

        <div className="w-full mt-3 border-t pt-3 border-border/30">
          <div className="text-sm mb-2 flex items-center">
            <PlusCircle className="h-4 w-4 mr-1.5" />
            {t('episodeBatchActions.addNewSeason')}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <div className="text-xs text-muted-foreground">{t('episodeBatchActions.seasonNumber')}:</div>
              <Input
                type="number"
                min="1"
                className="h-7 w-16 text-xs px-2"
                value={customSeasonNumber}
                onChange={(e) => onCustomSeasonNumberChange(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-xs text-muted-foreground">{t('episodeBatchActions.episodeCount')}:</div>
              <Input
                type="number"
                min="1"
                className="h-7 w-16 text-xs px-2"
                defaultValue="20"
                ref={episodeInputRef}
              />
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const episodeCount = parseInt(episodeInputRef.current?.value || "20", 10) || 20;
                onAddSeason(customSeasonNumber, episodeCount);
              }}
              className="h-7"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('episodeBatchActions.add')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}