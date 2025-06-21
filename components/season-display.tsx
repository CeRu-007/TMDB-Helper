"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Info, CheckSquare, Square, RotateCcw } from "lucide-react"
import type { Season } from "@/lib/storage"
import { useMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface SeasonDisplayProps {
  seasons: Season[]
  onSeasonClick?: (seasonNumber: number) => void
  selectedSeason?: number
  onEpisodeToggle?: (episodeNumber: number, completed: boolean, seasonNumber: number) => void
  onBatchToggle?: (seasonNumber: number, completed: boolean) => void
  isShiftPressed?: boolean
  lastClickedEpisode?: number | null
}

export default function SeasonDisplay({
  seasons,
  onSeasonClick,
  selectedSeason,
  onEpisodeToggle,
  onBatchToggle,
  isShiftPressed = false,
  lastClickedEpisode = null,
}: SeasonDisplayProps) {
  const [showAllEpisodes, setShowAllEpisodes] = useState(false)
  const isMobile = useMobile()

  // 添加季数切换的动画效果
  // 在组件顶部添加状态
  const [animating, setAnimating] = useState(false)

  // 修改季数点击处理函数
  const handleSeasonChange = (seasonNumber: number) => {
    if (seasonNumber === selectedSeason) return

    setAnimating(true)
    setTimeout(() => {
      onSeasonClick?.(seasonNumber)
      setAnimating(false)
    }, 300)
  }

  const getSeasonProgress = (season: Season) => {
    if (!season.episodes || season.episodes.length === 0) {
      return 0;
    }
    const completed = season.episodes.filter((ep) => ep.completed).length
    return season.totalEpisodes > 0 ? (completed / season.totalEpisodes) * 100 : 0
  }

  const getCurrentSeason = () => {
    // 如果有指定的季数，返回对应的季节数据
    if (selectedSeason !== undefined) {
      const season = seasons.find((s) => s.seasonNumber === selectedSeason)
      if (season) return season
    }
    
    // 如果没有指定季数或指定的季数不存在，返回第一个季节
    if (seasons.length > 0) return seasons[0]
    
    // 如果没有季节数据，返回一个空的默认季节
    return {
      seasonNumber: 1,
      name: "第1季",
      totalEpisodes: 0,
      episodes: []
    }
  }

  const currentSeason = getCurrentSeason()
  // 添加安全检查确保episodes存在
  const episodesToShow = currentSeason && currentSeason.episodes && currentSeason.episodes.length > 0
    ? (showAllEpisodes || !isMobile ? currentSeason.episodes : currentSeason.episodes.slice(0, 12))
    : []

  // 检查当前季是否全部完成
  const isSeasonCompleted = currentSeason && currentSeason.episodes && currentSeason.episodes.length > 0
    ? currentSeason.episodes.every((ep) => ep.completed)
    : false
  // 检查当前季是否有任何已完成的集数
  const hasCompletedEpisodes = currentSeason && currentSeason.episodes && currentSeason.episodes.length > 0
    ? currentSeason.episodes.some((ep) => ep.completed)
    : false

  // 处理一键全选/取消全选
  const handleBatchToggle = () => {
    if (onBatchToggle && selectedSeason) {
      // 如果全部完成，则取消全选；否则全选
      onBatchToggle(selectedSeason, !isSeasonCompleted)
    }
  }

  // 处理重置当前季
  const handleResetSeason = () => {
    if (onBatchToggle && selectedSeason) {
      onBatchToggle(selectedSeason, false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 季数标签栏 */}
      <div className="flex flex-wrap gap-2">
        {seasons.map((season) => {
          const progress = getSeasonProgress(season)
          const isSelected = selectedSeason === season.seasonNumber
          const completedEpisodes = season.episodes && season.episodes.length > 0 
            ? season.episodes.filter((ep) => ep.completed).length
            : 0;

          return (
            <div
              key={season.seasonNumber}
              className={`cursor-pointer transition-all duration-200 ${onSeasonClick ? "hover:scale-105" : ""}`}
              onClick={() => handleSeasonChange(season.seasonNumber)}
            >
              <Badge
                variant={isSelected ? "default" : "secondary"}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  isSelected
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                } ${progress === 100 ? "ring-2 ring-green-400" : ""}`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span>{season.name}</span>
                  <div className="flex items-center space-x-2 text-xs">
                    <span>
                      {completedEpisodes}/{season.totalEpisodes}
                    </span>
                    <div className="w-8 h-1 bg-white/30 rounded-full overflow-hidden">
                      <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              </Badge>
            </div>
          )
        })}
      </div>

      {/* 当前选中季的集数维护 */}
      {selectedSeason !== undefined && currentSeason && (
        <div className={`space-y-4 transition-opacity duration-300 ${animating ? "opacity-0" : "opacity-100"}`}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base md:text-lg">
                <span>第{selectedSeason}季 集数维护</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-sm">
                    {currentSeason.episodes && currentSeason.episodes.length > 0
                      ? currentSeason.episodes.filter((ep) => ep.completed).length
                      : 0}/{currentSeason.totalEpisodes}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 批量操作按钮 */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">批量操作</span>
                </div>
                <div className="flex items-center space-x-2">
                  {hasCompletedEpisodes && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetSeason}
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      重置
                    </Button>
                  )}
                  <Button
                    variant={isSeasonCompleted ? "outline" : "default"}
                    size="sm"
                    onClick={handleBatchToggle}
                    className={
                      isSeasonCompleted
                        ? "text-gray-600 hover:text-gray-700"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }
                  >
                    {isSeasonCompleted ? (
                      <>
                        <Square className="h-4 w-4 mr-1" />
                        取消全选
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-4 w-4 mr-1" />
                        一键全选
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Shift批量选择提示 */}
              {onEpisodeToggle && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    按住 Shift 键点击可批量选择连续的集数
                    {isShiftPressed && <span className="ml-2 font-bold">（Shift 已按下）</span>}
                  </p>
                </div>
              )}

              {/* 集数网格 */}
              <div
                className={`grid gap-2 ${
                  isMobile ? "grid-cols-6" : "grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-10"
                }`}
              >
                {episodesToShow?.map((episode) => (
                  <div
                    key={`${episode.seasonNumber || selectedSeason}-${episode.number}`}
                    className={`flex items-center justify-center p-2 rounded-lg border-2 transition-all ${
                      onEpisodeToggle ? "cursor-pointer" : ""
                    } ${
                      episode.completed
                        ? "bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 active:bg-blue-50 dark:active:bg-blue-900"
                    } ${
                      isShiftPressed && lastClickedEpisode !== null && onEpisodeToggle
                        ? "ring-2 ring-blue-400 dark:ring-blue-500"
                        : ""
                    }`}
                    onClick={() => onEpisodeToggle?.(episode.number, !episode.completed, selectedSeason)}
                  >
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        checked={episode.completed}
                        className="h-4 w-4 cursor-pointer"
                      />
                      <span className="text-xs md:text-sm font-medium dark:text-gray-200">{episode.number}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 移动端：显示更多按钮 */}
              {isMobile && currentSeason.episodes.length > 12 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllEpisodes(!showAllEpisodes)}
                  className="w-full"
                >
                  {showAllEpisodes ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      收起
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      显示全部 ({currentSeason.episodes.length} 集)
                    </>
                  )}
                </Button>
              )}

              {/* 当前季进度统计 */}
              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">第{selectedSeason}季进度</span>
                  <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
                    {Math.round(getSeasonProgress(currentSeason))}%
                  </span>
                </div>
                <Progress value={getSeasonProgress(currentSeason)} className={cn("h-3")} />
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                  已完成 {currentSeason.episodes && currentSeason.episodes.length > 0
                    ? currentSeason.episodes.filter((ep) => ep.completed).length
                    : 0} 集， 还剩{" "}
                  {currentSeason.totalEpisodes - (currentSeason.episodes && currentSeason.episodes.length > 0
                    ? currentSeason.episodes.filter((ep) => ep.completed).length
                    : 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 总体进度 */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">总体进度</span>
              <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{seasons.length} 季</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {seasons.map((season) => {
                const progress = getSeasonProgress(season)
                const completedEpisodes = season.episodes && season.episodes.length > 0
                  ? season.episodes.filter((ep) => ep.completed).length
                  : 0;

                return (
                  <div key={season.seasonNumber} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 dark:text-blue-300">第{season.seasonNumber}季</span>
                      <span className="font-medium text-blue-800 dark:text-blue-200">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className={cn("h-2")} />
                    <div className="text-center text-blue-600 dark:text-blue-400">
                      {completedEpisodes}/{season.totalEpisodes}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
