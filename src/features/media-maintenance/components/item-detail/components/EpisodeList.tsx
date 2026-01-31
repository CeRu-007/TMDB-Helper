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

  // 创建时间
  const createdAt = new Date(item.createdAt)
  const daysSinceCreation = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
  const weeksSinceCreation = Math.max(1, Math.floor(daysSinceCreation / 7))

  // 判断数据是否可靠（创建超过14天且有一定更新）
  const isDataReliable = daysSinceCreation >= 14 && currentEpisode >= 3

  // 获取下一个指定星期几的日期
  const getNextWeekdayDate = (fromDate: Date, targetWeekday: number): Date => {
    const date = new Date(fromDate)
    const currentWeekday = date.getDay()
    let daysDiff = targetWeekday - currentWeekday
    if (daysDiff <= 0) daysDiff += 7
    date.setDate(date.getDate() + daysDiff)
    return date
  }

  // 计算预计完成日期和平均速度
  let estimatedCompletionDate: Date | null = null
  let averageSpeed = "0"
  let speedUnit = "集/周"
  let isConservativeEstimate = false

  if (remainingEpisodes > 0) {
    // 每日更新词条
    if (item.isDailyUpdate) {
      speedUnit = "集/天"

      if (isDataReliable) {
        // 数据可靠：计算实际每日平均，排除开播当天的一次性多集标记
        // 如果开播当天标记了超过3集，假设实际每日更新是剩余天数平均
        let effectiveDays = daysSinceCreation
        let effectiveEpisodes = currentEpisode

        // 开播第一天如果标记超过3集，按1集计算（假设是补标记）
        if (currentEpisode > 3 && daysSinceCreation >= 1) {
          effectiveEpisodes = currentEpisode - (currentEpisode - 1)
          effectiveDays = daysSinceCreation
        }

        const dailySpeed = effectiveEpisodes / effectiveDays
        averageSpeed = dailySpeed.toFixed(1)

        const daysToComplete = Math.ceil(remainingEpisodes / Math.max(dailySpeed, 0.5))
        estimatedCompletionDate = new Date()
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + daysToComplete)
      } else {
        // 数据不可靠：保守估计每日1集
        isConservativeEstimate = true
        averageSpeed = "1.0"
        estimatedCompletionDate = new Date()
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + remainingEpisodes)
      }
    }
    // 周双更词条（有第二播出日）
    else if (typeof item.secondWeekday === 'number' && typeof item.weekday === 'number') {
      speedUnit = "每周2集"

      if (isDataReliable) {
        // 数据可靠：对比实际速度和播出节奏，取更保守的
        const actualWeeklySpeed = currentEpisode / weeksSinceCreation
        const scheduledSpeed = 2 // 播出节奏是2集/周

        // 取较慢的速度（更保守的估计）
        const effectiveSpeed = Math.min(actualWeeklySpeed, scheduledSpeed)
        averageSpeed = effectiveSpeed.toFixed(1)

        const weeksToComplete = Math.ceil(remainingEpisodes / effectiveSpeed)

        // 从最近的播出日开始计算
        const today = new Date()
        const nextPrimaryAirDate = getNextWeekdayDate(today, item.weekday)
        const nextSecondaryAirDate = getNextWeekdayDate(today, item.secondWeekday)
        const nextAirDate = nextPrimaryAirDate < nextSecondaryAirDate ? nextPrimaryAirDate : nextSecondaryAirDate

        estimatedCompletionDate = new Date(nextAirDate)
        // 每周推进2集
        for (let i = 0; i < weeksToComplete - 1; i++) {
          estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 7)
        }
      } else {
        // 数据不可靠：按播出设置2集/周
        isConservativeEstimate = true
        averageSpeed = "2.0"

        const weeksToComplete = Math.ceil(remainingEpisodes / 2)
        const today = new Date()
        const nextPrimaryAirDate = getNextWeekdayDate(today, item.weekday)
        const nextSecondaryAirDate = getNextWeekdayDate(today, item.secondWeekday)
        const nextAirDate = nextPrimaryAirDate < nextSecondaryAirDate ? nextPrimaryAirDate : nextSecondaryAirDate

        estimatedCompletionDate = new Date(nextAirDate)
        for (let i = 0; i < weeksToComplete - 1; i++) {
          estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 7)
        }
      }
    }
    // 周单更词条（只有主播出日）
    else if (typeof item.weekday === 'number') {
      speedUnit = "每周1集"

      if (isDataReliable) {
        // 数据可靠：对比实际速度和播出节奏
        const actualWeeklySpeed = currentEpisode / weeksSinceCreation
        const scheduledSpeed = 1 // 播出节奏是1集/周

        // 取较慢的速度
        const effectiveSpeed = Math.min(actualWeeklySpeed, scheduledSpeed)
        averageSpeed = effectiveSpeed.toFixed(1)

        const weeksToComplete = Math.ceil(remainingEpisodes / effectiveSpeed)

        // 从下一个播出日开始，每周推进
        const nextAirDate = getNextWeekdayDate(new Date(), item.weekday)
        estimatedCompletionDate = new Date(nextAirDate)
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + (weeksToComplete - 1) * 7)
      } else {
        // 数据不可靠：按播出设置1集/周
        isConservativeEstimate = true
        averageSpeed = "1.0"

        const nextAirDate = getNextWeekdayDate(new Date(), item.weekday)
        estimatedCompletionDate = new Date(nextAirDate)
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + (remainingEpisodes - 1) * 7)
      }
    }
    // 无播出设置的词条
    else {
      // 数据可靠：使用历史平均
      if (isDataReliable) {
        const weeklySpeed = currentEpisode / weeksSinceCreation
        averageSpeed = weeklySpeed.toFixed(1)

        if (weeklySpeed > 0) {
          const weeksToComplete = Math.ceil(remainingEpisodes / weeklySpeed)
          estimatedCompletionDate = new Date()
          estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + weeksToComplete * 7)
        }
      } else {
        // 数据不可靠：保守估计每周1集
        isConservativeEstimate = true
        averageSpeed = "1.0"
        estimatedCompletionDate = new Date()
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + remainingEpisodes * 7)
      }
    }
  } else {
    // 已完成，显示历史速度
    if (item.isDailyUpdate) {
      speedUnit = "集/天"
      averageSpeed = daysSinceCreation > 0 ? (currentEpisode / daysSinceCreation).toFixed(1) : currentEpisode.toFixed(1)
    } else if (typeof item.weekday === 'number') {
      speedUnit = typeof item.secondWeekday === 'number' ? "每周2集" : "每周1集"
      averageSpeed = weeksSinceCreation > 0 ? (currentEpisode / weeksSinceCreation).toFixed(1) : currentEpisode.toFixed(1)
    } else {
      averageSpeed = weeksSinceCreation > 0 ? (currentEpisode / weeksSinceCreation).toFixed(1) : "0"
    }
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
                  <div className="font-medium">
                    {item.isDailyUpdate || !item.weekday ? `${averageSpeed} ${speedUnit}` : speedUnit}
                  </div>
                </div>
              </div>

              {/* 预计完成 */}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-muted-foreground">
                    {isConservativeEstimate ? '预计完成(保守)' : '预计完成'}
                  </div>
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