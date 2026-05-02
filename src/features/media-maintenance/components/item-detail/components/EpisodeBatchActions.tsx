"use client"

import { useRef, useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
  Settings,
  RotateCcw,
  Trash2,
  PlusCircle,
  Plus,
  Pencil
} from "lucide-react"
import type { Season } from "@/lib/data/storage"
import { useTranslation } from "react-i18next"

interface EpisodeBatchActionsProps {
  currentSeason: Season | undefined
  selectedSeason: number | undefined
  editing: boolean
  customSeasonNumber: number
  seasons: Season[]
  onResetSeason: () => void
  onDeleteSeason: () => void
  onAddSeason: (seasonNumber: number, episodeCount: number) => void
  onCustomSeasonNumberChange: (value: number) => void
  onTotalEpisodesChange: (count: number) => void
}

export function EpisodeBatchActions({
  currentSeason,
  selectedSeason,
  editing,
  customSeasonNumber,
  seasons,
  onResetSeason,
  onDeleteSeason,
  onAddSeason,
  onCustomSeasonNumberChange,
  onTotalEpisodesChange
}: EpisodeBatchActionsProps) {
  const { t } = useTranslation('media')
  const episodeInputRef = useRef<HTMLInputElement>(null)
  const newSeasonEpisodeInputRef = useRef<HTMLInputElement>(null)

  const nextSeasonNumber = useMemo(() => {
    if (!seasons || seasons.length === 0) return 1
    const existingNumbers = seasons.map(s => s.seasonNumber)
    for (let i = 1; i <= existingNumbers.length + 1; i++) {
      if (!existingNumbers.includes(i)) return i
    }
    return Math.max(...existingNumbers) + 1
  }, [seasons])

  if (!editing) {
    return null
  }

  return (
    <Card variant="frosted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          {t('episodeBatchActions.seasonOperations')}
          {currentSeason && selectedSeason !== undefined && (
            <Badge variant="outline" className="ml-2">
              {t('episodeBatchActions.progress')}: {currentSeason.currentEpisode || 0}/{currentSeason.totalEpisodes}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedSeason !== undefined && currentSeason ? (
          <div className="space-y-3">
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

            <div className="border-t pt-3 border-border/30">
              <div className="text-sm mb-2 flex items-center">
                <Pencil className="h-4 w-4 mr-1.5" />
                {t('episodeBatchActions.modifyEpisodes', { season: selectedSeason })}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">{t('episodeList.totalEpisodes')}:</div>
                <Input
                  type="number"
                  min="1"
                  className="h-7 w-20 text-xs px-2"
                  defaultValue={currentSeason.totalEpisodes}
                  key={`season-${selectedSeason}-${currentSeason.totalEpisodes}`}
                  ref={episodeInputRef}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const newCount = parseInt(episodeInputRef.current?.value || String(currentSeason.totalEpisodes), 10)
                    if (newCount > 0 && newCount !== currentSeason.totalEpisodes) {
                      onTotalEpisodesChange(newCount)
                    }
                  }}
                  className="h-7"
                >
                  {t('episodeBatchActions.apply')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-2">
            {t('episodeBatchActions.selectSeasonFirst')}
          </div>
        )}

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
                ref={newSeasonEpisodeInputRef}
              />
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const episodeCount = parseInt(newSeasonEpisodeInputRef.current?.value || "20", 10) || 20;
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
