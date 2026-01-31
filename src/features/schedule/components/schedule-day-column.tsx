'use client'

import React from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Clock } from 'lucide-react'
import { ScheduleDay, ScheduleEpisode } from '../types/schedule'
import { ScheduleEpisodeCard } from './schedule-episode-card'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface ScheduleDayColumnProps {
  day: ScheduleDay
  dayIndex: number
  isSelected: boolean
  isHovered: boolean
  onSelect: () => void
  onHover: () => void
  onLeave: () => void
  onSelectEpisode: (episode: ScheduleEpisode) => void
  followingIds: Set<string>
  onToggleFollowing: (id: string) => void
}

export function ScheduleDayColumn({
  day,
  dayIndex,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onLeave,
  onSelectEpisode,
  followingIds,
  onToggleFollowing
}: ScheduleDayColumnProps) {
  const weekday = WEEKDAYS[dayIndex]
  const date = day.date ? new Date(day.date).getDate() : '-'

  return (
    <div
      className={cn(
        "flex flex-col min-h-0 transition-all duration-200",
        isSelected && "bg-blue-50/50 dark:bg-blue-900/10"
      )}
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className={cn(
        "px-3 py-3 border-b transition-colors cursor-pointer",
        day.isToday
          ? "bg-blue-500 text-white border-blue-500"
          : isSelected
            ? "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800"
            : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800"
      )}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{weekday}</span>
          <span className={cn(
            "text-xs font-medium",
            day.isToday ? "text-blue-100" : "text-gray-500"
          )}>{date}日</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={day.isToday ? "secondary" : "outline"} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-0 font-medium">
            {day.episodes.length} 部
          </Badge>
          {day.isToday && (
            <span className="text-xs font-medium text-blue-100">今天</span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {day.episodes.map((episode) => (
            <ScheduleEpisodeCard
              key={episode.id}
              episode={episode}
              isFollowing={followingIds.has(episode.id)}
              onToggleFollowing={() => onToggleFollowing(episode.id)}
              onClick={() => onSelectEpisode(episode)}
              isCompact={true}
            />
          ))}
          {day.episodes.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">暂无更新</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}