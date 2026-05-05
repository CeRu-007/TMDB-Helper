import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processScheduleTaskResult, type ExecuteResult } from '@/lib/scheduler/schedule-executor'
import type { ScheduleTask } from '@/types/schedule'
import type { TMDBItem } from '@/types/tmdb-item'

vi.mock('@/lib/data/schedule-repository', () => ({
  scheduleRepository: {
    deleteByItemId: vi.fn(),
  },
}))

vi.mock('@/lib/database/repositories/items.repository', () => ({
  itemsRepository: {
    update: vi.fn().mockReturnValue({ success: true }),
    findByIdWithRelations: vi.fn(),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

function makeItem(overrides: Partial<TMDBItem> = {}): TMDBItem {
  return {
    id: 'item-1',
    title: '测试剧集',
    type: 'tv',
    status: 'ongoing',
    completed: false,
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 20,
        currentEpisode: 0,
        episodes: [],
      },
    ],
    episodes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as TMDBItem
}

function makeTask(overrides: Partial<ScheduleTask> = {}): ScheduleTask {
  return {
    id: 'task-1',
    itemId: 'item-1',
    cron: '0 2 * * *',
    enabled: true,
    headless: true,
    incremental: true,
    autoImport: false,
    tmdbSeason: 1,
    tmdbLanguage: 'zh-CN',
    tmdbAutoResponse: 'w',
    fieldCleanup: { name: false, air_date: false, runtime: false, overview: false, backdrop: false },
    checkMetadataCompleteness: false,
    lastRunAt: null,
    nextRunAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

async function getUpdatedItem() {
  const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
  const updateCall = vi.mocked(itemsRepository.update)
  return updateCall.mock.calls[0]?.[0] as TMDBItem
}

describe('processScheduleTaskResult', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('执行失败时', () => {
    it('返回 completed=false，不更新集数', async () => {
      const item = makeItem()
      const task = makeTask()
      const result: ExecuteResult = { success: false, message: '执行失败' }

      const processResult = await processScheduleTaskResult(item, task, result)
      expect(processResult.completed).toBe(false)
      expect(processResult.message).toBe('执行失败')

      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      expect(itemsRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('开关关闭（checkMetadataCompleteness=false）', () => {
    it('集数增加时更新 currentEpisode', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 10, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: false })
      const result: ExecuteResult = { success: true, message: '成功', episodeCount: 15 }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      const season = updatedItem?.seasons?.find(s => s.seasonNumber === 1)
      expect(season?.currentEpisode).toBe(15)
    })

    it('集数达到总集数时标记完结', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 15, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: false })
      const result: ExecuteResult = { success: true, message: '成功', episodeCount: 20 }

      await processScheduleTaskResult(item, task, result, true)

      const updatedItem = await getUpdatedItem()
      expect(updatedItem?.status).toBe('completed')
      expect(updatedItem?.completed).toBe(true)
    })

    it('集数不变时不更新', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 10, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: false })
      const result: ExecuteResult = { success: true, message: '成功', episodeCount: 10 }

      await processScheduleTaskResult(item, task, result)

      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      expect(itemsRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('开关开启（checkMetadataCompleteness=true）', () => {
    it('所有集完整时，正常更新 currentEpisode 并标记完结', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 10, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '成功',
        episodeCount: 20,
        rawEpisodeCount: 20,
        incompleteEpisodes: [],
      }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      const season = updatedItem?.seasons?.find(s => s.seasonNumber === 1)
      expect(season?.currentEpisode).toBe(20)
      expect(updatedItem?.status).toBe('completed')
    })

    it('存在不完整集时，用有效集数更新 currentEpisode', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 10, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '有效更新至第16集',
        episodeCount: 16,
        rawEpisodeCount: 20,
        incompleteEpisodes: [17, 18, 19, 20],
      }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      const season = updatedItem?.seasons?.find(s => s.seasonNumber === 1)
      expect(season?.currentEpisode).toBe(16)
    })

    it('20集完结但有17-20集不完整时，不标记完结，status 保持 ongoing', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 10, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '有效更新至第16集',
        episodeCount: 16,
        rawEpisodeCount: 20,
        incompleteEpisodes: [17, 18, 19, 20],
      }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      expect(updatedItem?.status).toBe('ongoing')
      expect(updatedItem?.completed).toBe(false)
    })

    it('不完整集补充完整后，effectiveEpisodeCount=20，正常完结', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 16, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '成功更新至第20集',
        episodeCount: 20,
        rawEpisodeCount: 20,
        incompleteEpisodes: [],
      }

      await processScheduleTaskResult(item, task, result, true)

      const updatedItem = await getUpdatedItem()
      expect(updatedItem?.status).toBe('completed')
      expect(updatedItem?.completed).toBe(true)
    })

    it('effectiveEpisodeCount 与 currentEpisode 相同时不更新', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 16, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '有效更新至第16集',
        episodeCount: 16,
        rawEpisodeCount: 20,
        incompleteEpisodes: [17, 18, 19, 20],
      }

      await processScheduleTaskResult(item, task, result)

      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      expect(itemsRepository.update).not.toHaveBeenCalled()
    })

    it('第1集就不完整时，effectiveEpisodeCount=0，不更新', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 0, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '有效更新至第0集',
        episodeCount: 0,
        rawEpisodeCount: 20,
        incompleteEpisodes: [1, 2, 3, 4, 5],
      }

      await processScheduleTaskResult(item, task, result)

      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      expect(itemsRepository.update).not.toHaveBeenCalled()
    })

    it('开关开启但 incompleteEpisodes 为 undefined 时，等同开关关闭行为', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 10, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '成功',
        episodeCount: 20,
      }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      const season = updatedItem?.seasons?.find(s => s.seasonNumber === 1)
      expect(season?.currentEpisode).toBe(20)
      expect(updatedItem?.status).toBe('completed')
    })

    it('开关开启但 incompleteEpisodes 为空数组时，正常完结', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 10, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '成功',
        episodeCount: 20,
        rawEpisodeCount: 20,
        incompleteEpisodes: [],
      }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      expect(updatedItem?.status).toBe('completed')
      expect(updatedItem?.completed).toBe(true)
    })
  })

  describe('用户报告的场景：22集完结，currentEpisode=18，第19集完整，20-22不完整', () => {
    it('currentEpisode 更新为19（effectiveEpisodeCount），不标记完结', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 22, currentEpisode: 18, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '有效更新至第19集',
        episodeCount: 19,
        rawEpisodeCount: 22,
        incompleteEpisodes: [20, 21, 22],
      }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      const season = updatedItem?.seasons?.find(s => s.seasonNumber === 1)
      expect(season?.currentEpisode).toBe(19)
      expect(updatedItem?.status).toBe('ongoing')
      expect(updatedItem?.completed).toBe(false)
    })

    it('下次执行时 currentEpisode=19，第20-22集元数据补充完整后，更新到22并完结', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 22, currentEpisode: 19, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '成功更新至第22集',
        episodeCount: 22,
        rawEpisodeCount: 22,
        incompleteEpisodes: [],
      }

      await processScheduleTaskResult(item, task, result, true)

      const updatedItem = await getUpdatedItem()
      const season = updatedItem?.seasons?.find(s => s.seasonNumber === 1)
      expect(season?.currentEpisode).toBe(22)
      expect(updatedItem?.status).toBe('completed')
    })

    it('下次执行时 currentEpisode=19，第20集补充完整但21-22仍不完整，更新到20', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 22, currentEpisode: 19, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '有效更新至第20集',
        episodeCount: 20,
        rawEpisodeCount: 22,
        incompleteEpisodes: [21, 22],
      }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      const season = updatedItem?.seasons?.find(s => s.seasonNumber === 1)
      expect(season?.currentEpisode).toBe(20)
      expect(updatedItem?.status).toBe('ongoing')
    })
  })

  describe('用户反馈场景：currentEpisode=19，22集完结，第20集完整，21-22不完整', () => {
    it('currentEpisode 更新为20（effectiveEpisodeCount），不标记完结', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 22, currentEpisode: 19, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '有效更新至第20集',
        episodeCount: 20,
        rawEpisodeCount: 22,
        incompleteEpisodes: [21, 22],
      }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      const season = updatedItem?.seasons?.find(s => s.seasonNumber === 1)
      expect(season?.currentEpisode).toBe(20)
      expect(updatedItem?.status).toBe('ongoing')
      expect(updatedItem?.completed).toBe(false)
    })
  })

  describe('之前误更新场景：currentEpisode > effectiveEpisodeCount', () => {
    it('currentEpisode=20 > effectiveEpisodeCount=16，回退到16，status 重置为 ongoing', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 20, episodes: [] }],
        status: 'completed',
        completed: true,
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '有效更新至第16集',
        episodeCount: 16,
        rawEpisodeCount: 20,
        incompleteEpisodes: [17, 18, 19, 20],
      }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      const season = updatedItem?.seasons?.find(s => s.seasonNumber === 1)
      expect(season?.currentEpisode).toBe(16)
      expect(updatedItem?.status).toBe('ongoing')
      expect(updatedItem?.completed).toBe(false)
    })

    it('currentEpisode=19 > effectiveEpisodeCount=16，回退到16', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 19, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '有效更新至第16集',
        episodeCount: 16,
        rawEpisodeCount: 20,
        incompleteEpisodes: [17, 18, 19, 20],
      }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      const season = updatedItem?.seasons?.find(s => s.seasonNumber === 1)
      expect(season?.currentEpisode).toBe(16)
      expect(updatedItem?.status).toBe('ongoing')
    })
  })

  describe('定时任务自动删除逻辑', () => {
    it('开关关闭，词条完结时删除定时任务', async () => {
      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')

      const completedItem = makeItem({
        status: 'completed',
        completed: true,
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 20, episodes: [] }],
      })
      vi.mocked(itemsRepository.findByIdWithRelations).mockReturnValue(completedItem)

      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 15, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: false })
      const result: ExecuteResult = { success: true, message: '成功', episodeCount: 20 }

      const processResult = await processScheduleTaskResult(item, task, result, true)
      expect(processResult.completed).toBe(true)
      expect(scheduleRepository.deleteByItemId).toHaveBeenCalledWith('item-1')
    })

    it('开关开启，存在不完整集时，不删除定时任务', async () => {
      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')

      const notCompletedItem = makeItem({
        status: 'ongoing',
        completed: false,
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 16, episodes: [] }],
      })
      vi.mocked(itemsRepository.findByIdWithRelations).mockReturnValue(notCompletedItem)

      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 10, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '有效更新至第16集',
        episodeCount: 16,
        rawEpisodeCount: 20,
        incompleteEpisodes: [17, 18, 19, 20],
      }

      const processResult = await processScheduleTaskResult(item, task, result, true)
      expect(processResult.completed).toBe(false)
      expect(scheduleRepository.deleteByItemId).not.toHaveBeenCalled()
    })

    it('开关开启，所有集完整且达到总集数时，删除定时任务', async () => {
      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')

      const completedItem = makeItem({
        status: 'completed',
        completed: true,
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 20, episodes: [] }],
      })
      vi.mocked(itemsRepository.findByIdWithRelations).mockReturnValue(completedItem)

      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 16, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: true })
      const result: ExecuteResult = {
        success: true,
        message: '成功更新至第20集',
        episodeCount: 20,
        rawEpisodeCount: 20,
        incompleteEpisodes: [],
      }

      const processResult = await processScheduleTaskResult(item, task, result, true)
      expect(processResult.completed).toBe(true)
      expect(scheduleRepository.deleteByItemId).toHaveBeenCalledWith('item-1')
    })
  })

  describe('多季场景', () => {
    it('tmdbSeason=2 时只更新第2季的 currentEpisode', async () => {
      const item = makeItem({
        seasons: [
          { seasonNumber: 1, totalEpisodes: 10, currentEpisode: 10, episodes: [] },
          { seasonNumber: 2, totalEpisodes: 20, currentEpisode: 5, episodes: [] },
        ],
      })
      const task = makeTask({ checkMetadataCompleteness: true, tmdbSeason: 2 })
      const result: ExecuteResult = {
        success: true,
        message: '有效更新至第10集',
        episodeCount: 10,
        rawEpisodeCount: 15,
        incompleteEpisodes: [11, 12, 13, 14, 15],
      }

      await processScheduleTaskResult(item, task, result)

      const updatedItem = await getUpdatedItem()
      const season1 = updatedItem?.seasons?.find(s => s.seasonNumber === 1)
      const season2 = updatedItem?.seasons?.find(s => s.seasonNumber === 2)
      expect(season1?.currentEpisode).toBe(10)
      expect(season2?.currentEpisode).toBe(10)
    })
  })

  describe('episodeCount=0 的边界', () => {
    it('开关关闭，episodeCount=0 且 currentEpisode=0，不更新', async () => {
      const item = makeItem({
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 0, episodes: [] }],
      })
      const task = makeTask({ checkMetadataCompleteness: false })
      const result: ExecuteResult = { success: true, message: '成功', episodeCount: 0 }

      await processScheduleTaskResult(item, task, result)

      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      expect(itemsRepository.update).not.toHaveBeenCalled()
    })
  })
})
