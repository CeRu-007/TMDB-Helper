import { PlatformScheduleAdapter, ScheduleResponse, ScheduleEpisode, ScheduleDay } from '../types/schedule'

class BilibiliScheduleAdapter implements PlatformScheduleAdapter {
  name = '哔哩哔哩'
  platformId = 'bilibili'
  color = 'from-pink-500 to-pink-600'
  icon = '📺'

  private readonly PROXY_API_URL = '/api/schedule/bilibili/real'

  async fetchSchedule(): Promise<ScheduleResponse> {
    try {
      const response = await fetch(this.PROXY_API_URL, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return this.transformResponse(data)
    } catch (error) {
      console.error('Bilibili API Error:', error)
      return this.createErrorResponse(error)
    }
  }

  private transformResponse(data: any): ScheduleResponse {
    if (data.code !== 0) {
      return {
        code: data.code,
        message: data.message || 'API Error',
        result: { list: [] }
      }
    }

    const days = data.result?.data || []
    const transformedList = days.map((day: any) => this.transformDay(day))

    return {
      code: 0,
      message: 'success',
      result: { list: transformedList }
    }
  }

  private transformDay(day: any): ScheduleDay {
    return {
      date: day.date,
      dayOfWeek: day.day_of_week,
      isToday: day.is_today === 1,
      episodes: (day.episodes || []).map((episode: any) => this.transformEpisode(episode))
    }
  }

  private transformEpisode(episode: any): ScheduleEpisode {
    const types = episode.tags?.map((tag: any) => tag.text) || []
    return {
      id: `${episode.season_id}_${episode.episode_id}`,
      title: episode.title,
      cover: episode.cover,
      pubTime: episode.pub_time,
      pubIndex: episode.pub_index_show || episode.pub_index,
      published: episode.published === 1,
      url: episode.url,
      duration: episode.duration,
      types,
      platform: '哔哩哔哩',
      contentType: 'anime'
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

export const bilibiliAdapter = new BilibiliScheduleAdapter()