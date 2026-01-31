import { PlatformScheduleAdapter, ScheduleResponse, ScheduleDay } from '../types/schedule'
import { bilibiliAdapter } from './adapters/bilibili-adapter'

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

    const cacheEntry = this.cache.get(platformId)

    if (useCache && cacheEntry && Date.now() - cacheEntry.timestamp < CACHE_DURATION_MS) {
      return cacheEntry.data
    }

    const data = await adapter.fetchSchedule()
    this.cache.set(platformId, { data, timestamp: Date.now() })
    return data
  }

  async fetchMultipleSchedules(platformIds: string[]): Promise<Map<string, ScheduleResponse>> {
    const results = new Map<string, ScheduleResponse>()
    const promises = platformIds.map(async (platformId) => {
      try {
        const data = await this.fetchSchedule(platformId)
        results.set(platformId, data)
      } catch (error) {
        console.error(`Failed to fetch schedule for ${platformId}:`, error)
        results.set(platformId, this.createErrorResponse(error))
      }
    })

    await Promise.allSettled(promises)
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
      if (!schedule.result?.list || schedule.code !== 0) continue

      for (const day of schedule.result.list) {
        const existingDay = mergedDays.get(day.date)

        if (existingDay) {
          existingDay.episodes.push(...day.episodes)
          existingDay.isToday = existingDay.isToday || day.isToday
        } else {
          mergedDays.set(day.date, { ...day })
        }
      }
    }

    return {
      code: 0,
      message: 'success',
      result: { list: Array.from(mergedDays.values()) }
    }
  }

  private createErrorResponse(error: unknown): ScheduleResponse {
    return {
      code: -1,
      message: error instanceof Error ? error.message : 'Unknown error',
      result: { list: [] }
    }
  }
}

export const schedulePlatformManager = new SchedulePlatformManager()