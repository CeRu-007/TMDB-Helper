"use client"

import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Button } from "@/shared/components/ui/button"
import { AlertTriangle, X } from "lucide-react"
import { EpisodeStatusCard } from "./EpisodeStatusCard"
import { SeasonSelector } from "./SeasonSelector"
import { EpisodeBatchActions } from "./EpisodeBatchActions"
import { EpisodeList } from "./EpisodeList"
import { TMDBRefreshPanel } from "./TMDBRefreshPanel"
import type { TMDBItem, Season } from "@/lib/data/storage"

interface DetailsTabProps {
  item: TMDBItem
  selectedSeason?: number
  currentSeason: Season | null
  editing: boolean
  isRefreshingTMDBData: boolean
  refreshError: string | null
  customSeasonNumber: number
  onMovieToggle: (completed: boolean) => void
  onSeasonClick: (seasonNumber: number) => void
  onResetSeason: () => void
  onDeleteSeason: () => void
  onRefreshTMDB: () => void
  onAddSeason: (seasonNumber: number, episodeCount: number) => void
  onEpisodeProgressUpdate: (currentEpisode: number, seasonNumber: number) => void
  onTotalEpisodesChange: (count: number) => void
  onCustomSeasonNumberChange: (value: number) => void
  onClearRefreshError: () => void
}

export function DetailsTab({
  item,
  selectedSeason,
  currentSeason,
  editing,
  isRefreshingTMDBData,
  refreshError,
  customSeasonNumber,
  onMovieToggle,
  onSeasonClick,
  onResetSeason,
  onDeleteSeason,
  onRefreshTMDB,
  onAddSeason,
  onEpisodeProgressUpdate,
  onTotalEpisodesChange,
  onCustomSeasonNumberChange,
  onClearRefreshError
}: DetailsTabProps) {
  return (
    <div className="transition-opacity duration-300 ease-in-out flex-1 min-h-0">
      <ScrollArea className="h-full">
        <div className="space-y-6 pr-2">
          {/* 剧集内容 */}
          {item.mediaType === "movie" ? (
            <>
              <EpisodeStatusCard
                item={item}
                onToggle={onMovieToggle}
              />

              {/* TMDB刷新面板 */}
              <TMDBRefreshPanel
                item={item}
                isRefreshingTMDBData={isRefreshingTMDBData}
                onRefresh={onRefreshTMDB}
              />
            </>
          ) : (
            <>
              {/* 季数选择器 */}
              <SeasonSelector
                seasons={item.seasons || []}
                selectedSeason={selectedSeason}
                editing={editing}
                isRefreshingTMDBData={isRefreshingTMDBData}
                onSeasonClick={onSeasonClick}
                onRefreshTMDB={onRefreshTMDB}
              />

              {/* 季数操作 */}
              <EpisodeBatchActions
                currentSeason={currentSeason}
                selectedSeason={selectedSeason}
                editing={editing}
                customSeasonNumber={customSeasonNumber}
                onResetSeason={onResetSeason}
                onDeleteSeason={onDeleteSeason}
                onAddSeason={onAddSeason}
                onCustomSeasonNumberChange={onCustomSeasonNumberChange}
              />

              {/* 显示刷新错误 */}
              {refreshError && (
                <div className="bg-red-500/20 backdrop-blur-md text-red-200 p-3 rounded-md mb-4 flex items-center border-none shadow-sm">
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">{refreshError}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 px-2 text-red-200 hover:text-red-100 hover:bg-red-500/30"
                    onClick={onClearRefreshError}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* 剧集列表 */}
              <EpisodeList
                mediaType={item.mediaType}
                selectedSeason={selectedSeason}
                currentSeason={currentSeason}
                editing={editing}
                customSeasonNumber={customSeasonNumber}
                item={item}
                onEpisodeProgressUpdate={onEpisodeProgressUpdate}
                onTotalEpisodesChange={onTotalEpisodesChange}
                onAddSeason={onAddSeason}
                onCustomSeasonNumberChange={onCustomSeasonNumberChange}
              />
            </>
          )}

        </div>
      </ScrollArea>
    </div>
  )
}