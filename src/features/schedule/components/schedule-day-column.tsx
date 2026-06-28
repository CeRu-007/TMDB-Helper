'use client'

import React from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Clock, Calendar } from 'lucide-react'
import { ScheduleDay, ScheduleEpisode } from '../types/schedule'
import { ScheduleEpisodeCard } from './schedule-episode-card'
import type { CategoryType } from './schedule-view'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface ScheduleDayColumnProps {
  day: ScheduleDay
  dayIndex: number
  isSelected: boolean
  isHovered: boolean
  selectedCategory: CategoryType
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
  selectedCategory,
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
        "px-3 max-sm:px-1.5 py-3 max-sm:py-2 border-b transition-colors cursor-pointer",
        day.isToday
          ? "bg-blue-500 text-white border-blue-500"
          : isSelected
            ? "bg-card border-border"
            : "bg-gray-50 bg-muted/50 border-border hover:bg-white dark:hover:bg-accent"
      )}>
        <div className="flex items-center justify-between max-sm:flex-col max-sm:gap-0.5">
          <span className="text-sm max-sm:text-[11px] font-medium">{weekday}</span>
          <span className={cn(
            "text-xs max-sm:text-[10px] font-medium",
            day.isToday ? "text-blue-100" : "text-gray-500"
          )}>{date}日</span>
        </div>
        <div className="flex items-center gap-2 max-sm:gap-1 mt-1 justify-center">
          <Badge variant={day.isToday ? "secondary" : "outline"} className="text-xs max-sm:text-[10px] max-sm:px-1.5 max-sm:py-0 bg-muted text-muted-foreground border-0 font-medium">
            {day.episodes.length} 部
          </Badge>
          {day.isToday && (
            <span className="text-xs max-sm:text-[10px] font-medium text-blue-100">今天</span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 max-sm:p-1 space-y-2 max-sm:space-y-1">
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
              {selectedCategory === 'domestic' ? (
                <>
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">暂无影剧数据</p>
                  <p className="text-[10px] mt-1 opacity-70">功能开发中，敬请期待~</p>
                </>
              ) : (
                <>
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">暂无更新</p>
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}