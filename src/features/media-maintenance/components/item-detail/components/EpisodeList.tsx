"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { PlayCircle, Tv, PlusCircle, Clock, Zap, Calendar } from "lucide-react"
import type { Season, Episode, TMDBItem } from "@/lib/data/storage"

interface EpisodeListProps {
  mediaType: "tv"
  selectedSeason: number | undefined
  currentSeason: Season | undefined
  editing: boolean
  customSeasonNumber: number
  item: TMDBItem
  onEpisodeProgressUpdate: (currentEpisode: number, seasonNumber: number) => void
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
  item,
  onEpisodeProgressUpdate,
  onTotalEpisodesChange,
  onAddSeason,
  onCustomSeasonNumberChange
}: EpisodeListProps) {
  const [inputValue, setInputValue] = useState<string>("")
  const episodeInputRef = useRef<HTMLInputElement>(null)

  // 当前维护到的集数
  const currentEpisode = currentSeason?.currentEpisode || 0
  const totalEpisodes = currentSeason?.totalEpisodes || 0

  // 计算统计信息
  const progressPercentage = totalEpisodes > 0 ? Math.round((currentEpisode / totalEpisodes) * 100) : 0
  const remainingEpisodes = Math.max(0, totalEpisodes - currentEpisode)
  
  // 上次更新时间
  const lastUpdated = new Date(item.updatedAt)
  const daysSinceUpdate = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24))
  
  // 平均维护速度（集/周）
  const createdAt = new Date(item.createdAt)
  const weeksSinceCreation = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 7)))
  const averageSpeed = weeksSinceCreation > 0 ? (currentEpisode / weeksSinceCreation).toFixed(1) : "0"
  
  // 预计完成日期
  let estimatedCompletionDate: Date | null = null
  if (parseFloat(averageSpeed) > 0 && remainingEpisodes > 0) {
    const weeksToComplete = Math.ceil(remainingEpisodes / parseFloat(averageSpeed))
    estimatedCompletionDate = new Date()
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + (weeksToComplete * 7))
  }
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // 更新输入框显示当前进度
  useEffect(() => {
    setInputValue(currentEpisode.toString())
  }, [currentEpisode])

  if (mediaType !== "tv") {
    return null
  }

  // 处理输入框变更
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    // 只允许数字和空值
    if (value === "" || /^\d+$/.test(value)) {
      setInputValue(value)
    }
  }

  // 更新进度
  function updateProgress() {
    if (!selectedSeason || !currentSeason) return

    const targetEpisode = parseInt(inputValue, 10)
    if (isNaN(targetEpisode) || targetEpisode < 0) return

    // 限制在有效范围内
    const clampedEpisode = Math.min(Math.max(targetEpisode, 0), currentSeason.totalEpisodes)

    onEpisodeProgressUpdate(clampedEpisode, selectedSeason)
    setInputValue(clampedEpisode.toString())
  }

  // 处理输入框失焦
  function handleInputBlur() {
    updateProgress()
  }

  // 处理回车键
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      updateProgress()
    }
  }

  return (
    <Card variant="frosted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center">
            <PlayCircle className="h-4 w-4 mr-2" />
            维护进度
            {!selectedSeason && <span className="text-xs text-muted-foreground ml-2">(请先选择或添加季)</span>}
          </div>
          {/* 编辑模式下显示总集数编辑 */}
          {editing && currentSeason && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">总集数:</span>
              <Input
                type="number"
                min="1"
                className="h-6 w-16 text-xs px-2"
                value={currentSeason?.totalEpisodes || 0}
                onChange={(e) => onTotalEpisodesChange(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedSeason && currentSeason ? (
          <div className="space-y-3">
            {/* 简洁的输入框 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">维护至:</span>
                <Input
                  type="number"
                  min="0"
                  max={currentSeason.totalEpisodes}
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleKeyDown}
                  placeholder={`0-${currentSeason.totalEpisodes}`}
                  className="h-8 w-28"
                />
              </div>
              <span className="text-xs text-muted-foreground">/ {currentSeason.totalEpisodes} 集</span>
            </div>

            {/* 简单的进度条 */}
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
                style={{ width: `${(currentEpisode / currentSeason.totalEpisodes) * 100}%` }}
              />
            </div>

            {/* 统计信息 - 紧凑布局 */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* 上次更新 */}
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-muted-foreground">上次更新</div>
                  <div className="font-medium truncate">
                    {daysSinceUpdate === 0 ? '今天' : daysSinceUpdate === 1 ? '昨天' : `${daysSinceUpdate}天前`}
                  </div>
                </div>
              </div>

              {/* 平均速度 */}
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-muted-foreground">平均速度</div>
                  <div className="font-medium">{averageSpeed} 集/周</div>
                </div>
              </div>

              {/* 预计完成 */}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-muted-foreground">预计完成</div>
                  <div className="font-medium truncate">
                    {estimatedCompletionDate ? formatDate(estimatedCompletionDate) : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* 进度详情 */}
            <div className="flex items-center justify-between text-sm text-foreground/80">
              <div className="flex items-center space-x-3">
                <span>已维护: <span className="font-semibold text-green-600">{currentEpisode}</span></span>
                <span className="text-foreground/30">|</span>
                <span>待维护: <span className="font-semibold text-orange-600">{totalEpisodes - currentEpisode}</span></span>
              </div>
              <span className="text-foreground/70">{progressPercentage}%</span>
            </div>

            {/* 完成状态提示 */}
            {currentEpisode === currentSeason.totalEpisodes && currentEpisode > 0 && (
              <div className="flex items-center justify-center p-2 text-sm text-green-600 bg-green-500/10 rounded-lg">
                ✅ 全季已维护完成
              </div>
            )}
          </div>
        ) : (
          /* 未选择季时的提示 */
          <div className="text-center py-8 text-muted-foreground">
            <Tv className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-base font-medium mb-1">请选择或添加季</p>
            <p className="text-sm max-w-md mx-auto">使用上方"选择季"面板选择一个季，或在编辑模式下添加新的季</p>
            {editing && (
              <div className="flex flex-col items-center space-y-3 mt-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground mr-1">季数:</span>
                    <Input
                      type="number"
                      min="1"
                      className="h-7 w-16 text-xs px-2"
                      value={customSeasonNumber}
                      onChange={(e) => onCustomSeasonNumberChange(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground mr-1">集数:</span>
                    <Input
                      type="number"
                      min="1"
                      className="h-7 w-16 text-xs px-2"
                      defaultValue="20"
                      ref={episodeInputRef}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const episodeCount = parseInt(episodeInputRef.current?.value || "20", 10) || 20;
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