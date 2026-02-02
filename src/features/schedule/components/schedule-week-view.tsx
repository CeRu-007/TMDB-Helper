'use client'

import React from 'react'
import { ScheduleDay, ScheduleEpisode } from '../types/schedule'
import { ScheduleDayColumn } from './schedule-day-column'
import type { CategoryType } from './schedule-view'

interface ScheduleWeekViewProps {
  weekData: ScheduleDay[]
  selectedDay: number
  selectedCategory: CategoryType
  onSelectDay: (day: number) => void
  onSelectEpisode: (episode: ScheduleEpisode) => void
  followingIds: Set<string>
  onToggleFollowing: (id: string) => void
  hoveredDay: number | null
  onHoverDay: (day: number | null) => void
}

export function ScheduleWeekView({
  weekData,
  selectedDay,
  selectedCategory,
  onSelectDay,
  onSelectEpisode,
  followingIds,
  onToggleFollowing,
  hoveredDay,
  onHoverDay
}: ScheduleWeekViewProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full grid grid-cols-7 divide-x divide-gray-100 dark:divide-gray-800">
        {weekData.map((day, index) => (
          <ScheduleDayColumn
            key={index}
            day={day}
            dayIndex={index}
            isSelected={selectedDay === index}
            isHovered={hoveredDay === index}
            selectedCategory={selectedCategory}
            onSelect={() => onSelectDay(index)}
            onHover={() => onHoverDay(index)}
            onLeave={() => onHoverDay(null)}
            onSelectEpisode={onSelectEpisode}
            followingIds={followingIds}
            onToggleFollowing={onToggleFollowing}
          />
        ))}
      </div>
    </div>
  )
}