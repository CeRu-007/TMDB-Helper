import type { PlatformScheduleAdapter, ScheduleResponse, ScheduleDay, ScheduleEpisode } from '../../types/schedule'
import type { IqiyiTabResponse, IqiyiContentResponse } from '../../api/iqiyi-types'

interface IqiyiDateTab {
  date: string
  dayOfWeek: string
  isToday: boolean
}

const IMAGE_SIZE_MAP = {
  _120_160: '_480_640',
  _120x160: '_480x640'
} as const

const DAY_MAP: Record<string, string> = {
  '今': '今天',
  '一': '周一',
  '二': '周二',
  '三': '周三',
  '四': '周四',
  '五': '周五',
  '六': '周六',
  '日': '周日'
}

const META_FIELD_NAMES = {
  TITLE: 'title',
  SUBTITLE: 'subtitle',
  EPISODE: 'episode',
  UPDATE: 'update',
  PUB_INDEX: 'pub_index',
  TIME: 'time',
  PUB_TIME: 'pub_time',
  PUBLISH_TIME: 'publish_time'
} as const

class IqiyiScheduleAdapter implements PlatformScheduleAdapter {
  name = '爱奇艺'
  platformId = 'iqiyi'
  color = 'from-green-500 to-green-600'
  icon = '🎬'

  private readonly TAB_API_URL = '/api/schedule/iqiyi/tab'
  private readonly CONTENT_API_URL = '/api/schedule/iqiyi/content'

  async fetchSchedule(): Promise<ScheduleResponse> {
    try {
      const tabResponse = await this.fetchTabData()

      if (tabResponse.code !== 0) {
        return this.createErrorResponse(tabResponse.code, 'Failed to fetch date tabs')
      }

      const dateTabs = this.extractDateTabs(tabResponse)

      if (dateTabs.length === 0) {
        return this.createErrorResponse(-1, 'No date tabs found')
      }

      const scheduleYear = this.determineScheduleYear(dateTabs)
      const contentResults = await this.fetchAllContent(dateTabs, scheduleYear)

      const days: ScheduleDay[] = []
    for (let i = 0; i < dateTabs.length; i++) {
      const day = this.transformDay(dateTabs[i], contentResults[i] ?? null, scheduleYear)
      if (day) {
        days.push(day)
      }
    }

      return {
        code: 0,
        message: 'success',
        result: { list: days }
      }
    } catch (error) {
      console.error('[Iqiyi] FetchSchedule error:', error)
      return this.createErrorResponse(-1, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async fetchTabData(): Promise<IqiyiTabResponse> {
    const response = await fetch(this.TAB_API_URL, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Tab API error! status: ${response.status}`)
    }

    return await response.json()
  }

  private extractDateTabs(tabData: IqiyiTabResponse): IqiyiDateTab[] {
    const nav = tabData.cards?.[0]?.blocks?.[0]?.native_ext?.daily_hot_tab?.nav || []

    return nav
      .filter(item => item.date)
      .map(item => ({
        date: item.date,
        dayOfWeek: DAY_MAP[item.day_of_week] || item.day_of_week,
        isToday: item.today === '1'
      }))
  }

  private determineScheduleYear(dateTabs: IqiyiDateTab[]): number {
    const today = this.getToday()
    const baseYear = today.getFullYear()

    let closestTab: IqiyiDateTab | null = null
    let minDistance = Infinity

    for (const tab of dateTabs) {
      const tabDate = this.parseDate(tab.date, baseYear)
      const distance = Math.abs(tabDate.getTime() - today.getTime())

      if (distance < minDistance) {
        minDistance = distance
        closestTab = tab
      }
    }

    if (!closestTab) {
      return baseYear
    }

    const closestDate = this.parseDate(closestTab.date, baseYear)
    return closestDate > today ? baseYear - 1 : baseYear
  }

  private async fetchAllContent(dateTabs: IqiyiDateTab[], year: number): Promise<(IqiyiContentResponse | null)[]> {
    const contentPromises = dateTabs.map(tab =>
      this.fetchContentByDate(tab.date, year).catch(error => {
        console.error(`[Iqiyi] Failed to fetch content for ${tab.date}:`, error)
        return null
      })
    )

    return await Promise.all(contentPromises)
  }

  private async fetchContentByDate(dateStr: string, year: number): Promise<IqiyiContentResponse | null> {
    const formattedDate = this.formatDate(dateStr, year)
    const response = await fetch(`${this.CONTENT_API_URL}?date=${formattedDate}`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  }

  private transformDay(tab: IqiyiDateTab, contentData: IqiyiContentResponse | null, year: number): ScheduleDay | null {
    if (!tab?.date) {
      return null
    }

    const formattedDate = this.formatDate(tab.date, year)
    const dayOfWeek = this.getDayOfWeek(formattedDate)
    const isToday = this.isDateToday(formattedDate)

    const blocks = contentData?.cards?.[0]?.blocks || []
    const episodes = blocks
      .map(block => this.transformEpisode(block))
      .filter((ep): ep is ScheduleEpisode => ep !== null)

    return {
      date: formattedDate,
      dayOfWeek,
      isToday,
      episodes
    }
  }

  private transformEpisode(block: IqiyiContentResponse['cards'][0]['blocks'][0]): ScheduleEpisode | null {
    const images = block.images || []
    const metas = block.metas || []

    const cover = this.extractCoverImage(images)
    const title = this.extractMetaValue(metas, META_FIELD_NAMES.TITLE) || '未知标题'
    const albumId = block.actions?.click_event?.data?.album_id ||
                    block.statistics?.r_taid ||
                    block.other?.offical_id ||
                    block.block_id

    const url = `https://so.iqiyi.com/so/q_${encodeURIComponent(title)}`

    const pubIndexMetaNames = [META_FIELD_NAMES.SUBTITLE, META_FIELD_NAMES.EPISODE, META_FIELD_NAMES.UPDATE, META_FIELD_NAMES.PUB_INDEX]
    const pubIndex = this.findMetaValue(metas, pubIndexMetaNames) || '更新中'

    const pubTimeMetaNames = [META_FIELD_NAMES.TIME, META_FIELD_NAMES.PUB_TIME, META_FIELD_NAMES.PUBLISH_TIME]
    const pubTime = this.findMetaValue(metas, pubTimeMetaNames) || '00:00'

    const tagGray = this.extractMetaValue(metas, 'tag.gray') || ''
    const types = tagGray ? tagGray.split('-').filter(Boolean) : []

    return {
      id: albumId,
      title,
      cover,
      pubTime,
      pubIndex,
      published: true,
      url,
      types,
      platform: '爱奇艺',
      contentType: 'anime'
    }
  }

  private extractCoverImage(images: Array<{ url: string; name: string }>): string {
    let cover = images.find(img => img.name === 'poster')?.url ||
                 images.find(img => img.name === 'cover')?.url ||
                 images.find(img => img.name === 'vertical')?.url ||
                 images[0]?.url || ''

    for (const [oldSize, newSize] of Object.entries(IMAGE_SIZE_MAP)) {
      if (cover.includes(oldSize)) {
        cover = cover.replace(oldSize, newSize)
        break
      }
    }

    return cover
  }

  private extractMetaValue(metas: Array<{ text: string; name: string }>, name: string): string | undefined {
    return metas.find(meta => meta.name === name)?.text
  }

  private findMetaValue(metas: Array<{ text: string; name: string }>, names: string[]): string | undefined {
    return names.reduce<string | undefined>((result, name) => result || this.extractMetaValue(metas, name), undefined)
  }

  private parseDate(dateStr: string, year: number): Date {
    const parts = dateStr.split('-')
    const month = Number(parts[0])
    const day = Number(parts[1])
    const date = new Date(year, month - 1, day)
    date.setHours(0, 0, 0, 0)
    return date
  }

  private formatDate(dateStr: string, year: number): string {
    const parts = dateStr.split('-')
    const month = Number(parts[0])
    const day = Number(parts[1])
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  private getToday(): Date {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  private getDayOfWeek(dateStr: string): number {
    const date = new Date(dateStr)
    const day = date.getDay()
    return day === 0 ? 7 : day
  }

  private isDateToday(dateStr: string): boolean {
    const today = this.getToday()
    return dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }

  private createErrorResponse(code: number, message: string): ScheduleResponse {
    return {
      code,
      message,
      result: { list: [] }
    }
  }
}

export const iqiyiAdapter = new IqiyiScheduleAdapter()