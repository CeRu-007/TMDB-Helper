'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import {
  Loader2,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { ScheduleDay, ScheduleEpisode } from '../types/schedule'
import { schedulePlatformManager } from '../lib/platform-manager'
import { initializeScheduleModule } from '../lib/platform-config'
import { ScheduleWeekView } from './schedule-week-view'
import { ScheduleDayView } from './schedule-day-view'
import { ScheduleDetailPanel } from './schedule-detail-panel'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface ScheduleViewProps {
  className?: string
}

type CategoryType = 'all' | 'anime' | 'domestic' | 'following'
type ViewMode = 'week' | 'day'

const WEEKDAYS_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const CATEGORY_KEYS = {
  all: 'all',
  anime: 'anime',
  domestic: 'domestic',
  following: 'following'
} as const

interface TodayInfo {
  today: number
  monthYear: string
  todayDate: string
}

function getTodayInfo(): TodayInfo {
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1

  return {
    today: dayOfWeek,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    todayDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
}

function buildWeekData(scheduleData: ScheduleDay[], todayIndex: number): ScheduleDay[] {
  return Array(7).fill(0).map((_, index) => {
    const dayOfWeek = index + 1
    const matchingDays = scheduleData.filter(day => day.dayOfWeek === dayOfWeek)

    if (matchingDays.length === 0) {
      return {
        date: '',
        dayOfWeek,
        isToday: index === todayIndex,
        episodes: []
      }
    }

    const episodes = schedulePlatformManager.mergeEpisodes(matchingDays.flatMap(day => day.episodes))
    const isToday = matchingDays.some(day => day.isToday) || index === todayIndex
    const date = matchingDays.find(day => day.isToday)?.date || matchingDays[0].date

    return { date, dayOfWeek, isToday, episodes }
  })
}

function filterEpisodesByCategory(
  weekData: ScheduleDay[],
  category: CategoryType,
  followingIds: Set<string>
): ScheduleDay[] {
  // 全部：返回所有数据
  if (category === 'all') {
    return weekData
  }

  // 已追：只显示已追的剧集
  if (category === 'following') {
    return weekData.map(day => ({
      ...day,
      episodes: day.episodes.filter(ep => followingIds.has(ep.id))
    }))
  }

  // 动漫：筛选 contentType 为 'anime' 的剧集
  if (category === 'anime') {
    return weekData.map(day => ({
      ...day,
      episodes: day.episodes.filter(ep => ep.contentType === 'anime')
    }))
  }

  // 影剧：筛选 contentType 为 'domestic' 的剧集
  if (category === 'domestic') {
    return weekData.map(day => ({
      ...day,
      episodes: day.episodes.filter(ep => ep.contentType === 'domestic')
    }))
  }

  return weekData
}

export function ScheduleView({ className }: ScheduleViewProps) {
  const { t } = useTranslation('schedule')
  const [loading, setLoading] = useState(false)
  const [scheduleData, setScheduleData] = useState<ScheduleDay[]>([])
  const [selectedDay, setSelectedDay] = useState<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [selectedEpisode, setSelectedEpisode] = useState<ScheduleEpisode | null>(null)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  const WEEKDAYS = useMemo(() => WEEKDAYS_KEYS.map(key => t(`weekdaysList.${key}`)), [t])

  const CATEGORIES = useMemo(() => [
    { id: 'all' as CategoryType, label: t('categories.all'), color: 'bg-gray-500' },
    { id: 'anime' as CategoryType, label: t('categories.anime'), color: 'bg-blue-500' },
    { id: 'domestic' as CategoryType, label: t('categories.domestic'), color: 'bg-amber-500' },
    { id: 'following' as CategoryType, label: t('categories.following'), color: 'bg-rose-500' },
  ], [t])

  const dateInfo = useMemo(() => getTodayInfo(), [])

  useEffect(() => {
    setSelectedDay(dateInfo.today)
  }, [dateInfo.today])

  useEffect(() => {
    initializeScheduleModule()
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    setLoading(true)
    try {
      const results = await schedulePlatformManager.fetchMultipleSchedules(['bilibili', 'iqiyi'])
      const schedules = Array.from(results.values())
      const merged = schedulePlatformManager.mergeSchedules(...schedules)

      if (merged.result?.list) {
        setScheduleData(merged.result.list)
      }
    } catch (error) {
      logger.error('Failed to fetch schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const weekData = useMemo(
    () => buildWeekData(scheduleData, dateInfo.today),
    [scheduleData, dateInfo.today]
  )

  const filteredWeekData = useMemo(
    () => filterEpisodesByCategory(weekData, selectedCategory, followingIds),
    [weekData, selectedCategory, followingIds]
  )

  const currentDayData = filteredWeekData[selectedDay]

  function toggleFollowing(id: string) {
    setFollowingIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  function handleNavigateDay(delta: number) {
    const newDay = Math.max(0, Math.min(6, selectedDay + delta))
    setSelectedDay(newDay)
  }

  return (
    <div className={cn("flex h-full bg-muted/30", className)}>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between max-sm:flex-wrap max-sm:gap-2 px-6 max-sm:px-3 py-3.5 max-sm:py-2.5 bg-card border-b border-border">
          <div className="flex items-center gap-3 max-sm:gap-1.5">
            <div className="flex items-center gap-2 max-sm:gap-1.5">
              <Calendar className="h-4.5 w-4.5 max-sm:h-4 max-sm:w-4 text-gray-400" />
              <span className="text-base max-sm:text-sm font-medium text-foreground">{t('thisWeekAnime')}</span>
            </div>
            <div className="h-4 w-px bg-gray-200 dark:bg-muted max-sm:hidden" />
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 max-sm:p-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 max-sm:h-6 max-sm:w-6 hover:bg-white dark:hover:bg-accent">
                <ChevronLeft className="h-4 w-4 max-sm:h-3.5 max-sm:w-3.5" />
              </Button>
              <span className="px-2 max-sm:px-1 text-sm max-sm:text-xs text-foreground min-w-[80px] max-sm:min-w-[60px] text-center font-medium">{t('monthYear', { year: dateInfo.year, month: dateInfo.month })}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 max-sm:h-6 max-sm:w-6 hover:bg-white dark:hover:bg-accent">
                <ChevronRight className="h-4 w-4 max-sm:h-3.5 max-sm:w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 max-sm:gap-1.5 max-sm:w-full max-sm:overflow-x-auto max-sm:flex-nowrap max-sm:scrollbar-hide">
            <div className="flex items-center bg-muted rounded-lg p-1 max-sm:p-0.5 max-sm:flex-shrink-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex-shrink-0 whitespace-nowrap max-sm:px-2 max-sm:py-1 max-sm:text-xs px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1.5",
                    selectedCategory === cat.id
                      ? "bg-white dark:bg-muted text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full max-sm:w-1.5 max-sm:h-1.5", cat.color)} />
                  {cat.label}
                </button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6 bg-muted max-sm:hidden" />

            <div className="flex items-center bg-muted rounded-lg p-1 max-sm:p-0.5 max-sm:flex-shrink-0">
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  "max-sm:px-2 max-sm:py-1 max-sm:text-xs px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                  viewMode === 'week'
                    ? "bg-white dark:bg-muted text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {t('weekView')}
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={cn(
                  "max-sm:px-2 max-sm:py-1 max-sm:text-xs px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                  viewMode === 'day'
                    ? "bg-white dark:bg-muted text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {t('dayView')}
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={fetchSchedule} disabled={loading} className="border-border text-sm max-sm:text-xs font-medium max-sm:h-8">
              <RefreshCw className={cn("h-4 w-4 mr-1.5 max-sm:mr-1 max-sm:h-3.5 max-sm:w-3.5", loading && "animate-spin")} />
              {t('refresh')}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-card">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
            <span className="text-sm text-gray-500">{t('loading')}</span>
          </div>
        ) : viewMode === 'week' ? (
          <ScheduleWeekView
            weekData={filteredWeekData}
            selectedDay={selectedDay}
            selectedCategory={selectedCategory}
            onSelectDay={setSelectedDay}
            onSelectEpisode={setSelectedEpisode}
            followingIds={followingIds}
            onToggleFollowing={toggleFollowing}
            hoveredDay={hoveredDay}
            onHoverDay={setHoveredDay}
          />
        ) : (
          <ScheduleDayView
            dayData={currentDayData}
            selectedDayIndex={selectedDay}
            selectedCategory={selectedCategory}
            onNavigateDay={handleNavigateDay}
            onSelectEpisode={setSelectedEpisode}
            followingIds={followingIds}
            onToggleFollowing={toggleFollowing}
          />
        )}
      </div>

      <ScheduleDetailPanel
        episode={selectedEpisode}
        isFollowing={selectedEpisode ? followingIds.has(selectedEpisode.id) : false}
        onToggleFollowing={() => selectedEpisode && toggleFollowing(selectedEpisode.id)}
        onClose={() => setSelectedEpisode(null)}
      />
    </div>
  )
}