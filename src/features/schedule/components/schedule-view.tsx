'use client'

import React, { useState, useEffect, useMemo } from 'react'
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

interface ScheduleViewProps {
  className?: string
}

type CategoryType = 'all' | 'anime' | 'domestic' | 'following'
type ViewMode = 'week' | 'day'

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const

const CATEGORIES = [
  { id: 'all' as CategoryType, label: '全部', color: 'bg-gray-500' },
  { id: 'anime' as CategoryType, label: '动漫', color: 'bg-blue-500' },
  { id: 'domestic' as CategoryType, label: '影剧', color: 'bg-amber-500' },
  { id: 'following' as CategoryType, label: '已追', color: 'bg-rose-500' },
] as const

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
    monthYear: `${now.getFullYear()}年${now.getMonth() + 1}月`,
    todayDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
}

function buildWeekData(scheduleData: ScheduleDay[], todayIndex: number): ScheduleDay[] {
  return WEEKDAYS.map((_, index) => {
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
  const [loading, setLoading] = useState(false)
  const [scheduleData, setScheduleData] = useState<ScheduleDay[]>([])
  const [selectedDay, setSelectedDay] = useState<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [selectedEpisode, setSelectedEpisode] = useState<ScheduleEpisode | null>(null)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

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
      console.error('Failed to fetch schedule:', error)
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
    <div className={cn("flex h-full bg-gray-50/30 dark:bg-gray-900/30", className)}>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-3.5 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-gray-400" />
              <span className="text-base font-medium text-gray-900 dark:text-gray-100">本周番剧</span>
            </div>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white dark:hover:bg-gray-600">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm text-gray-900 dark:text-gray-100 min-w-[80px] text-center font-medium">{dateInfo.monthYear}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white dark:hover:bg-gray-600">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1.5",
                    selectedCategory === cat.id
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", cat.color)} />
                  {cat.label}
                </button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6 bg-gray-100 dark:bg-gray-700" />

            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                  viewMode === 'week'
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                周视图
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                  viewMode === 'day'
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                日视图
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={fetchSchedule} disabled={loading} className="border-gray-200 dark:border-gray-700 text-sm font-medium">
              <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
              刷新
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-800">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
            <span className="text-sm text-gray-500">加载中...</span>
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