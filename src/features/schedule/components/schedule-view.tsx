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
import { ScheduleWeekView } from './schedule-week-view'
import { ScheduleDayView } from './schedule-day-view'
import { ScheduleDetailPanel } from './schedule-detail-panel'
import { cn } from '@/lib/utils'

interface ScheduleViewProps {
  className?: string
}

type CategoryType = 'all' | 'anime' | 'domestic' | 'following'
type ViewMode = 'week' | 'day'

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const CATEGORIES = [
  { id: 'all' as CategoryType, label: '全部', color: 'bg-gray-500' },
  { id: 'anime' as CategoryType, label: '番剧', color: 'bg-blue-500' },
  { id: 'domestic' as CategoryType, label: '国创', color: 'bg-amber-500' },
  { id: 'following' as CategoryType, label: '已追', color: 'bg-rose-500' },
] as const

export function ScheduleView({ className }: ScheduleViewProps) {
  const [loading, setLoading] = useState(false)
  const [scheduleData, setScheduleData] = useState<ScheduleDay[]>([])
  const [selectedDay, setSelectedDay] = useState<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [selectedEpisode, setSelectedEpisode] = useState<ScheduleEpisode | null>(null)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  const dateInfo = useMemo(() => {
    const d = new Date()
    const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1
    return {
      today: dayOfWeek,
      monthYear: `${d.getFullYear()}年${d.getMonth() + 1}月`,
      todayDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  }, [])

  useEffect(() => {
    setSelectedDay(dateInfo.today)
  }, [dateInfo.today])

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    setLoading(true)
    try {
      const results = await schedulePlatformManager.fetchMultipleSchedules(['bilibili'])
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

  const weekData = useMemo(() => {
    return WEEKDAYS.map((_, index) => {
      const dayData = scheduleData.find(day => day.dayOfWeek === index + 1)
      const isToday = dayData?.date === dateInfo.todayDate || index === dateInfo.today
      return dayData || { date: '', dayOfWeek: index + 1, isToday, episodes: [] }
    })
  }, [scheduleData, dateInfo])

  const filteredWeekData = useMemo(() => {
    return weekData.map(day => ({
      ...day,
      episodes: day.episodes.filter(episode => {
        if (selectedCategory === 'following') {
          return followingIds.has(episode.id)
        }
        return true
      })
    }))
  }, [weekData, selectedCategory, followingIds])

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

  function navigateWeek(direction: 'prev' | 'next') {
    console.log('Navigate', direction)
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
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white dark:hover:bg-gray-600" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm text-gray-900 dark:text-gray-100 min-w-[80px] text-center font-medium">{dateInfo.monthYear}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white dark:hover:bg-gray-600" onClick={() => navigateWeek('next')}>
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