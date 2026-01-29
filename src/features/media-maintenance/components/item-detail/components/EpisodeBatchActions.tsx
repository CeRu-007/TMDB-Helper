"use client"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
  Settings,
  CheckSquare,
  ArrowRightCircle,
  RotateCcw,
  Trash2,
  RefreshCw,
  Loader2,
  PlusCircle,
  Plus
} from "lucide-react"
import type { Season } from "@/lib/data/storage"

interface EpisodeBatchActionsProps {
  currentSeason: Season | undefined
  selectedSeason: number | undefined
  editing: boolean
  isRefreshingTMDBData: boolean
  customSeasonNumber: number
  onBatchToggle: () => void
  onMarkNextEpisode: () => void
  onResetSeason: () => void
  onDeleteSeason: () => void
  onRefreshTMDB: () => void
  onAddSeason: (seasonNumber: number, episodeCount: number) => void
  onCustomSeasonNumberChange: (value: number) => void
}

export function EpisodeBatchActions({
  currentSeason,
  selectedSeason,
  editing,
  isRefreshingTMDBData,
  customSeasonNumber,
  onBatchToggle,
  onMarkNextEpisode,
  onResetSeason,
  onDeleteSeason,
  onRefreshTMDB,
  onAddSeason,
  onCustomSeasonNumberChange
}: EpisodeBatchActionsProps) {
  if (selectedSeason === undefined) {
    return null
  }

  return (
    <Card variant="frosted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          季操作
          {currentSeason && (
            <Badge variant="outline" className="ml-2">
              进度: {currentSeason.episodes && currentSeason.episodes.length > 0
  ? currentSeason.episodes.filter(ep => ep.completed).length
  : 0}/{currentSeason.episodes && currentSeason.episodes.length || 0}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBatchToggle}
            title="全选/全不选"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            全选/全不选
          </Button>
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkNextEpisode}
              title="标记下一集为已完成"
            >
              <ArrowRightCircle className="h-4 w-4 mr-2" />
              标记下一集
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onResetSeason}
                title="重置季"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重置
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteSeason}
                title="删除季"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除季
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshTMDB}
            disabled={isRefreshingTMDBData}
            title="刷新TMDB数据、背景图、标志、网络logo和简介"
          >
            {isRefreshingTMDBData ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            刷新TMDB数据
          </Button>

          {/* 只在编辑模式下显示添加新季区域 */}
          {editing && (
            <div className="w-full mt-3 border-t pt-3 border-border/30">
              <div className="text-sm mb-2 flex items-center">
                <PlusCircle className="h-4 w-4 mr-1.5" />
                添加新季
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-muted-foreground">季数:</div>
                  <Input
                    type="number"
                    min="1"
                    className="h-7 w-16 text-xs px-2"
                    value={customSeasonNumber}
                    onChange={(e) => onCustomSeasonNumberChange(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-muted-foreground">集数:</div>
                  <Input
                    type="number"
                    min="1"
                    className="h-7 w-16 text-xs px-2"
                    defaultValue="20"
                    id="new-season-episodes"
                  />
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const episodeInput = document.getElementById("new-season-episodes") as HTMLInputElement;
                    const episodeCount = parseInt(episodeInput.value, 10) || 20;
                    onAddSeason(customSeasonNumber, episodeCount);
                  }}
                  className="h-7"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}