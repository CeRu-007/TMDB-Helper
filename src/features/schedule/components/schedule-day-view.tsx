'use client'

import React from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Calendar, Clock, Heart, Play, ChevronLeft, ChevronRight } from 'lucide-react'
import { ScheduleDay, ScheduleEpisode } from '../types/schedule'
import { ScheduleImage } from './schedule-image'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface ScheduleDayViewProps {
  dayData: ScheduleDay
  selectedDayIndex: number
  onNavigateDay: (delta: number) => void
  onSelectEpisode: (episode: ScheduleEpisode) => void
  followingIds: Set<string>
  onToggleFollowing: (id: string) => void
}

export function ScheduleDayView({ 
  dayData, 
  selectedDayIndex,
  onNavigateDay,
  onSelectEpisode, 
  followingIds, 
  onToggleFollowing 
}: ScheduleDayViewProps) {
  const sortedEpisodes = [...dayData.episodes].sort((a, b) =>
    a.pubTime.localeCompare(b.pubTime)
  )

  const handlePrevDay = () => onNavigateDay(-1)
  const handleNextDay = () => onNavigateDay(1)

  if (sortedEpisodes.length === 0) {
    return (
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevDay}
                disabled={selectedDayIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <h3 className="text-xl font-semibold">
                {dayData.date || WEEKDAYS[dayData.dayOfWeek - 1]}
              </h3>
              {dayData.isToday && (
                <Badge className="bg-blue-500">今天</Badge>
              )}
              <Badge variant="outline" className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-0">0 部剧集</Badge>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNextDay}
                disabled={selectedDayIndex === 6}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-center py-20 text-gray-400">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>本日暂无更新</p>
              <p className="text-sm mt-1 opacity-70">切换到其他日期看看吧~</p>
            </div>
          </div>
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={handlePrevDay}
              disabled={selectedDayIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {dayData.date || WEEKDAYS[dayData.dayOfWeek - 1]}
            </h3>
            {dayData.isToday && (
              <Badge className="bg-blue-500">今天</Badge>
            )}
            <Badge variant="outline" className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-0">{dayData.episodes.length} 部剧集</Badge>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={handleNextDay}
              disabled={selectedDayIndex === 6}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <div className="absolute left-[52px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-100 via-blue-200 to-blue-100 dark:from-blue-900/20 dark:via-blue-800/20 dark:to-blue-900/20" />

            {sortedEpisodes.map((episode, index) => (
              <ScheduleTimelineItem
                key={episode.id}
                episode={episode}
                isFollowing={followingIds.has(episode.id)}
                onToggleFollowing={() => onToggleFollowing(episode.id)}
                onClick={() => onSelectEpisode(episode)}
              />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

interface ScheduleTimelineItemProps {
  episode: ScheduleEpisode
  isFollowing: boolean
  onToggleFollowing: () => void
  onClick: () => void
}

function ScheduleTimelineItem({ 
  episode, 
  isFollowing, 
  onToggleFollowing, 
  onClick 
}: ScheduleTimelineItemProps): React.ReactElement {
  function handleToggleFollowing(e: React.MouseEvent): void {
    e.stopPropagation()
    onToggleFollowing()
  }

  return (
    <div className="flex items-start gap-4 py-3 group">
      <div className="flex-shrink-0 w-12 text-right pt-1">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {episode.pubTime.substring(0, 5)}
        </span>
      </div>

      <div className="flex-shrink-0 relative z-10 pt-2">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-4 ring-white dark:ring-gray-900" />
      </div>

      <div
        className="flex-1 flex items-start gap-4 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-sm hover:border-blue-100 dark:hover:border-blue-900/50 transition-all cursor-pointer"
        onClick={onClick}
      >
        <div className="flex-shrink-0 w-16 h-22 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700/50">
          <ScheduleImage
            src={episode.cover}
            alt={episode.title}
            className="group-hover:scale-105 transition-transform duration-300"
            fallbackClassName="w-full h-full"
          />
        </div>

        <div className="flex-1 min-w-0 py-0.5">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1.5 line-clamp-1 text-sm">
            {episode.title}
          </h3>

          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "text-xs font-medium",
              episode.published ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
            )}>
              {episode.pubIndex.startsWith('更新') ? episode.pubIndex : `更新至${episode.pubIndex}`}
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {episode.types?.map(type => (
              <Badge key={type} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-0">
                {type}
              </Badge>
            ))}
          </div>

          {episode.platforms && episode.platforms.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {episode.platforms.map((platform, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700"
                >
                  {platform}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
          <button
            onClick={handleToggleFollowing}
            className={cn(
              "p-1.5 rounded-full transition-all duration-200",
              isFollowing
                ? "text-rose-500 bg-rose-50 dark:bg-rose-500/10"
                : "text-gray-300 hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            )}>
            <Heart className={cn("h-4 w-4", isFollowing && "fill-current")} />
          </button>
          <span className={cn(
            "text-[10px]",
            isFollowing ? "text-rose-500" : "text-gray-400"
          )}>
            {isFollowing ? '已追' : '追番'}
          </span>
        </div>
      </div>
    </div>
  )
}