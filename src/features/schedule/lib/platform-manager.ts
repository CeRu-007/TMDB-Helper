import { PlatformScheduleAdapter, ScheduleResponse, ScheduleDay } from '../types/schedule'
import { bilibiliAdapter } from './adapters/bilibili-adapter'
import { iqiyiAdapter } from './adapters/iqiyi-adapter'

const CACHE_DURATION_MS = 5 * 60 * 1000

interface CacheEntry {
  data: ScheduleResponse
  timestamp: number
}

class SchedulePlatformManager {
  private adapters: Map<string, PlatformScheduleAdapter> = new Map()
  private cache: Map<string, CacheEntry> = new Map()

  constructor() {
    this.registerAdapter(bilibiliAdapter)
    this.registerAdapter(iqiyiAdapter)
  }

  registerAdapter(adapter: PlatformScheduleAdapter): void {
    this.adapters.set(adapter.platformId, adapter)
  }

  getAvailablePlatforms(): PlatformScheduleAdapter[] {
    return Array.from(this.adapters.values())
  }

  async fetchSchedule(platformId: string, useCache = true): Promise<ScheduleResponse> {
    const adapter = this.adapters.get(platformId)

    if (!adapter) {
      throw new Error(`Platform ${platformId} not found`)
    }

    if (useCache && this.isCacheValid(platformId)) {
      return this.cache.get(platformId)!.data
    }

    const data = await adapter.fetchSchedule()
    this.updateCache(platformId, data)
    return data
  }

  async fetchMultipleSchedules(platformIds: string[]): Promise<Map<string, ScheduleResponse>> {
    const results = new Map<string, ScheduleResponse>()

    await Promise.allSettled(
      platformIds.map(async (platformId) => {
        const data = await this.fetchSchedule(platformId)
        results.set(platformId, data)
      })
    )

    for (const platformId of platformIds) {
      if (!results.has(platformId)) {
        console.error(`Failed to fetch schedule for ${platformId}`)
        results.set(platformId, this.createErrorResponse('Failed to fetch schedule'))
      }
    }

    return results
  }

  clearCache(platformId?: string): void {
    if (platformId) {
      this.cache.delete(platformId)
    } else {
      this.cache.clear()
    }
  }

  mergeSchedules(...schedules: ScheduleResponse[]): ScheduleResponse {
    const mergedDays = new Map<string, ScheduleDay>()

    for (const schedule of schedules) {
      if (!this.isValidSchedule(schedule)) {
        continue
      }

      for (const day of schedule.result.list) {
        this.mergeDay(mergedDays, day)
      }
    }

    return {
      code: 0,
      message: 'success',
      result: { list: Array.from(mergedDays.values()) }
    }
  }

  private isCacheValid(platformId: string): boolean {
    const cacheEntry = this.cache.get(platformId)
    if (!cacheEntry) {
      return false
    }

    return Date.now() - cacheEntry.timestamp < CACHE_DURATION_MS
  }

  private updateCache(platformId: string, data: ScheduleResponse): void {
    this.cache.set(platformId, {
      data,
      timestamp: Date.now()
    })
  }

  private isValidSchedule(schedule: ScheduleResponse): boolean {
    return schedule.code === 0 && schedule.result?.list?.length > 0
  }

  private mergeDay(mergedDays: Map<string, ScheduleDay>, day: ScheduleDay): void {
    const existingDay = mergedDays.get(day.date)

    if (existingDay) {
      const allEpisodes = [...existingDay.episodes, ...day.episodes]
      const mergedEpisodes = this.mergeEpisodes(allEpisodes)
      existingDay.episodes = mergedEpisodes
      existingDay.isToday = existingDay.isToday || day.isToday
    } else {
      mergedDays.set(day.date, { ...day, episodes: this.mergeEpisodes(day.episodes) })
    }
  }

  normalizeTitle(title: string): string {
    const normalized = title
      .trim()
      .toLowerCase()
      .replace(/[\s\u3000-\u303F\uFF00-\uFFEF]+/g, ' ')
      .replace(/['"()（）\[\]【】]/g, '')

    return normalized
  }

  mergeEpisodes(episodes: ScheduleEpisode[]): ScheduleEpisode[] {
    const grouped = new Map<string, ScheduleEpisode[]>()

    episodes.forEach(ep => {
      const key = this.normalizeTitle(ep.title)
      console.log('[Merge] Original:', ep.title, '| Normalized:', key, '| Platform:', ep.platform)

      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(ep)
    })

    console.log('[Merge] Groups:', Array.from(grouped.keys()))

    return Array.from(grouped.values()).map(group => this.mergeEpisodeGroup(group))
  }

  private mergeEpisodeGroup(group: ScheduleEpisode[]): ScheduleEpisode {
    const primary = group[0]
    const platforms: string[] = []
    const platformUrls: Record<string, string> = {}
    const pubTimes = new Set<string>()
    const pubIndexes = new Set<string>()
    const types = new Set<string>()

    group.forEach(ep => {
      if (ep.platform) {
        platforms.push(ep.platform)
      }
      if (ep.url && ep.platform) {
        platformUrls[ep.platform] = ep.url
      }
      if (ep.pubTime && ep.pubTime !== '00:00') {
        pubTimes.add(ep.pubTime)
      }
      if (ep.pubIndex && ep.pubIndex !== '更新中') {
        pubIndexes.add(ep.pubIndex)
      }
      if (ep.types) {
        ep.types.forEach(type => types.add(type))
      }
    })

    const merged: ScheduleEpisode = {
      ...primary,
      platforms: platforms.length > 0 ? [...new Set(platforms)] : undefined,
      platformUrls: Object.keys(platformUrls).length > 0 ? platformUrls : undefined,
      pubTime: pubTimes.size > 0 ? Array.from(pubTimes)[0] : primary.pubTime,
      pubIndex: pubIndexes.size > 0 ? Array.from(pubIndexes)[0] : primary.pubIndex,
      types: types.size > 0 ? Array.from(types) : primary.types,
      published: group.some(ep => ep.published)
    }

    return merged
  }

  private createErrorResponse(message: string): ScheduleResponse {
    return {
      code: -1,
      message,
      result: { list: [] }
    }
  }
}

export const schedulePlatformManager = new SchedulePlatformManager()