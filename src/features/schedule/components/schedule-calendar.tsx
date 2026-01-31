'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Calendar, Clock, RefreshCw, Filter, Grid, List, Loader2 } from 'lucide-react'
import { ScheduleDay, ScheduleEpisode, ViewMode } from '../types/schedule'
import { schedulePlatformManager } from '../lib/platform-manager'
import { initializeScheduleModule } from '../lib/platform-config'
import { cn } from '@/lib/utils'

interface ScheduleCalendarProps {
  className?: string
}

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function ScheduleCalendar({ className }: ScheduleCalendarProps) {
  const [loading, setLoading] = useState(false)
  const [scheduleData, setScheduleData] = useState<ScheduleDay[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['bilibili'])
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [showOnlyUnpublished, setShowOnlyUnpublished] = useState(false)

  useEffect(() => {
    initializeScheduleModule()
  }, [])

  const availablePlatforms = schedulePlatformManager.getAvailablePlatforms()

  useEffect(() => {
    fetchSchedule()
  }, [selectedPlatforms])

  async function fetchSchedule() {
    if (selectedPlatforms.length === 0) return

    setLoading(true)
    try {
      const results = await schedulePlatformManager.fetchMultipleSchedules(selectedPlatforms)
      const schedules = Array.from(results.values())
      const merged = schedulePlatformManager.mergeSchedules(...schedules)

      setScheduleData(merged.result?.list || [])
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  function refreshSchedule() {
    schedulePlatformManager.clearCache()
    fetchSchedule()
  }

  function togglePlatform(platformId: string) {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  function toggleFilter() {
    setShowOnlyUnpublished(prev => !prev)
  }

  function changeViewMode(value: ViewMode) {
    setViewMode(value)
  }

  const filteredScheduleData = useMemo(() => {
    return scheduleData.map(day => ({
      ...day,
      episodes: showOnlyUnpublished
        ? day.episodes.filter(ep => !ep.published)
        : day.episodes
    }))
  }, [scheduleData, showOnlyUnpublished])

  const statistics = useMemo(() => {
    let publishedCount = 0
    let totalCount = 0

    for (const day of filteredScheduleData) {
      totalCount += day.episodes.length
      publishedCount += day.episodes.filter(ep => ep.published).length
    }

    return {
      days: filteredScheduleData.length,
      published: publishedCount,
      unpublished: totalCount - publishedCount,
      total: totalCount
    }
  }, [filteredScheduleData])

  function getDayOfWeekText(dayOfWeek: number): string {
    return WEEKDAYS[dayOfWeek - 1] || ''
  }

  function getStatusBadge(published: boolean) {
    return (
      <Badge
        className={cn(
          "text-xs",
          published
            ? "bg-green-100 text-green-800 border-green-200"
            : "bg-yellow-100 text-yellow-800 border-yellow-200"
        )}
      >
        {published ? '已更新' : '待更新'}
      </Badge>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {availablePlatforms.map((platform) => (
            <Button
              key={platform.platformId}
              variant={selectedPlatforms.includes(platform.platformId) ? "default" : "outline"}
              size="sm"
              onClick={() => togglePlatform(platform.platformId)}
            >
              <span className="mr-1">{platform.icon}</span>
              {platform.name}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFilter}
          >
            <Filter className="h-4 w-4 mr-1" />
            {showOnlyUnpublished ? '全部' : '待更新'}
          </Button>

          <Tabs value={viewMode} onValueChange={changeViewMode}>
            <TabsList>
              <TabsTrigger value="calendar">
                <Grid className="h-4 w-4 mr-1" />
                日历
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-1" />
                列表
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" size="sm" onClick={refreshSchedule} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            刷新
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{statistics.days}</div>
            <p className="text-xs text-muted-foreground">天数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{statistics.published}</div>
            <p className="text-xs text-muted-foreground">已更新</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{statistics.unpublished}</div>
            <p className="text-xs text-muted-foreground">待更新</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
            <p className="text-xs text-muted-foreground">总剧集</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
          <span className="text-muted-foreground">加载中...</span>
        </div>
      ) : (
        <Tabs value={viewMode} className="w-full">
          <TabsContent value="calendar" className="mt-0">
            <ScheduleCalendarView 
              data={filteredScheduleData} 
              getStatusBadge={getStatusBadge}
              getDayOfWeekText={getDayOfWeekText}
            />
          </TabsContent>
          <TabsContent value="list" className="mt-0">
            <ScheduleListView 
              data={filteredScheduleData} 
              getStatusBadge={getStatusBadge}
              getDayOfWeekText={getDayOfWeekText}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

interface ScheduleViewProps {
  data: ScheduleDay[]
  getStatusBadge: (published: boolean) => React.ReactNode
  getDayOfWeekText: (dayOfWeek: number) => string
}

function ScheduleCalendarView({ data, getStatusBadge, getDayOfWeekText }: ScheduleViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {data.map((day) => (
        <Card
          key={day.date}
          className={cn(
            "transition-all duration-200 hover:shadow-md",
            day.isToday && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20"
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{day.date}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {getDayOfWeekText(day.dayOfWeek)}
                  {day.isToday && <Badge className="ml-2" variant="default">今天</Badge>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{day.episodes.length}</p>
                <p className="text-xs text-muted-foreground">剧集</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {day.episodes.map((episode) => (
                  <div
                    key={episode.id}
                    className="flex items-start space-x-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-200">
                      {episode.cover && (
                        <img
                          src={episode.cover}
                          alt={episode.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{episode.title}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{episode.pubTime}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{episode.pubIndex}</span>
                      </div>
                      {getStatusBadge(episode.published)}
                    </div>
                  </div>
                ))}
                {day.episodes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无更新</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ScheduleListView({ data, getStatusBadge, getDayOfWeekText }: ScheduleViewProps) {
  return (
    <div className="space-y-4">
      {data.map((day) => (
        <Card key={day.date}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>{day.date}</span>
                  <span className="text-lg font-normal text-muted-foreground">
                    {getDayOfWeekText(day.dayOfWeek)}
                  </span>
                  {day.isToday && <Badge variant="default">今天</Badge>}
                </CardTitle>
              </div>
              <Badge variant="outline">{day.episodes.length} 部剧集</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {day.episodes.map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="w-16 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-200">
                    {episode.cover && (
                      <img
                        src={episode.cover}
                        alt={episode.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{episode.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{episode.pubTime}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{episode.pubIndex}</span>
                    </div>
                    {getStatusBadge(episode.published)}
                  </div>
                </div>
              ))}
            </div>
            {day.episodes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>暂无更新</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}