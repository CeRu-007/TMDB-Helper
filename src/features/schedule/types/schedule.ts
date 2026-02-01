export interface ScheduleEpisode {
  id: string
  title: string
  cover: string
  pubTime: string
  pubIndex: string
  published: boolean
  url?: string
  duration?: number
  types?: string[]
  platform?: string
  platforms?: string[]
  platformUrls?: Record<string, string>
}

export interface ScheduleDay {
  date: string
  dayOfWeek: number
  isToday: boolean
  episodes: ScheduleEpisode[]
}

export interface ScheduleResult {
  list: ScheduleDay[]
}

export interface ScheduleResponse {
  code: number
  message: string
  result: ScheduleResult
}

export interface PlatformScheduleAdapter {
  name: string
  platformId: string
  color: string
  icon: string
  fetchSchedule: () => Promise<ScheduleResponse>
}

export type ViewMode = 'calendar' | 'list'

export interface ScheduleConfig {
  selectedPlatforms: string[]
  selectedDate?: string
  viewMode: ViewMode
  showOnlyUnpublished: boolean
}