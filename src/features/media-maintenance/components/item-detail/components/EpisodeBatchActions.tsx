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
  const episodeInputRef = useRef<HTMLInputElement>(null)

  // 只在编辑模式且有选中季时显示
  if (!editing || selectedSeason === undefined) {
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
              进度: {currentSeason.currentEpisode || 0}/{currentSeason.totalEpisodes}
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
            title="重置当前季的所有剧集进度"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            重置
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteSeason()}
            title="删除当前季"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除季
          </Button>
        </div>

        {/* 添加新季区域 */}
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
              添加
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}