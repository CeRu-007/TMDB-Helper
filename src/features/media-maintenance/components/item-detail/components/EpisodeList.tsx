"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { PlayCircle, AlertCircle, Tv, PlusCircle } from "lucide-react"
import { EpisodeItem } from "./EpisodeItem"
import type { Season, Episode } from "@/lib/data/storage"

interface EpisodeListProps {
  mediaType: "movie" | "tv"
  selectedSeason: number | undefined
  currentSeason: Season | undefined
  editing: boolean
  customSeasonNumber: number
  highlightedEpisode: number | null
  onEpisodeToggle: (episodeNumber: number, completed: boolean, seasonNumber: number) => void
  onEpisodeClick: (episodeNumber: number) => void
  onTotalEpisodesChange: (count: number) => void
  onAddSeason: (seasonNumber: number, episodeCount: number) => void
  onCustomSeasonNumberChange: (value: number) => void
}

export function EpisodeList({
  mediaType,
  selectedSeason,
  currentSeason,
  editing,
  customSeasonNumber,
  highlightedEpisode,
  onEpisodeToggle,
  onEpisodeClick,
  onTotalEpisodesChange,
  onAddSeason,
  onCustomSeasonNumberChange
}: EpisodeListProps) {
  if (mediaType !== "tv") {
    return null
  }

  return (
    <Card variant="frosted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center">
            <PlayCircle className="h-4 w-4 mr-2" />
            剧集列表
            {!selectedSeason && <span className="text-xs text-muted-foreground ml-2">(请先选择或添加季)</span>}
          </div>
          {/* 只在编辑模式下显示自定义集数编辑功能，且必须有选中的季 */}
          {editing && currentSeason && (
            <div className="flex items-center space-x-2">
              <div className="text-xs text-muted-foreground mr-1">集数:</div>
              <Input
                type="number"
                min="1"
                className="h-6 w-16 text-xs px-2"
                value={currentSeason?.totalEpisodes || 0}
                onChange={(e) => onTotalEpisodesChange(parseInt(e.target.value, 10) || 0)}
                title="自定义集数数量"
              />
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedSeason ? (
          <>
            {/* 批量操作说明 */}
            <div className="mb-2 text-xs text-muted-foreground">
              提示: 按住Shift键点击首尾集数可批量选择
            </div>

            {/* 剧集网格 */}
            {currentSeason && currentSeason.episodes && currentSeason.episodes.length > 0 ? (
              <div className="grid grid-cols-10 gap-2">
                {currentSeason.episodes.map((episode) => (
                  <EpisodeItem
                    key={episode.number}
                    episode={episode}
                    selectedSeason={selectedSeason}
                    highlightedEpisode={highlightedEpisode}
                    onToggle={onEpisodeToggle}
                    onClick={onEpisodeClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>该季暂无集数数据</p>
                <p className="text-xs mt-1">请在编辑模式下添加集数</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-6 text-muted-foreground">
            <Tv className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">请选择或添加季</p>
            <p className="text-sm mt-1 max-w-md mx-auto">使用上方"选择季"面板选择一个季，或在编辑模式下添加新的季</p>
            {editing && (
              <div className="flex flex-col items-center space-y-3 mt-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <div className="text-xs text-muted-foreground mr-1">季数:</div>
                    <Input
                      type="number"
                      min="1"
                      className="h-7 w-16 text-xs px-2"
                      value={customSeasonNumber}
                      onChange={(e) => onCustomSeasonNumberChange(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div className="flex items-center">
                    <div className="text-xs text-muted-foreground mr-1">集数:</div>
                    <Input
                      type="number"
                      min="1"
                      className="h-7 w-16 text-xs px-2"
                      defaultValue="20"
                      id="new-season-episodes-alt"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const episodeInput = document.getElementById("new-season-episodes-alt") as HTMLInputElement;
                    const episodeCount = parseInt(episodeInput.value, 10) || 20;
                    onAddSeason(customSeasonNumber, episodeCount);
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  添加季
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}