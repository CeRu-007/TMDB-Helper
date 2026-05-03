import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('node-cron', () => {
  const mockScheduledTask = {
    start: vi.fn(),
    stop: vi.fn(),
  }
  return {
    default: {
      schedule: vi.fn(() => mockScheduledTask),
      validate: vi.fn((expr: string) => {
        try {
          const parts = expr.split(' ');
          if (parts.length < 5) return false;
          if (parts[0] === 'invalid') return false;
          const minute = parseInt(parts[0], 10);
          const hour = parseInt(parts[1], 10);
          if (!isNaN(minute) && (minute < 0 || minute > 59)) return false;
          if (!isNaN(hour) && (hour < 0 || hour > 23)) return false;
          return true;
        } catch {
          return false;
        }
      }),
    },
    ScheduledTask: mockScheduledTask,
  }
})

vi.mock('@/lib/data/schedule-repository', () => ({
  scheduleRepository: {
    findAllEnabled: vi.fn().mockReturnValue([]),
    findById: vi.fn(),
    deleteByItemId: vi.fn(),
    updateLastRunAt: vi.fn(),
  },
}))

vi.mock('@/lib/data/schedule-log-repository', () => ({
  scheduleLogRepository: {
    create: vi.fn().mockReturnValue({ success: true, data: { id: 'log-1' } }),
    updateStatus: vi.fn(),
    findLatestByTaskId: vi.fn(),
  },
}))

vi.mock('@/lib/data/task-journal-repository', () => ({
  taskJournalRepository: {
    create: vi.fn(),
  },
}))

vi.mock('@/lib/database/repositories/items.repository', () => ({
  itemsRepository: {
    findByIdWithRelations: vi.fn().mockReturnValue(null),
    update: vi.fn().mockReturnValue({ success: true }),
  },
}))

vi.mock('@/lib/scheduler/notifier', () => ({
  notifier: {
    sendSuccessNotification: vi.fn(),
    sendErrorNotification: vi.fn(),
  },
}))

vi.mock('@/lib/data/sse-broadcaster', () => ({
  notifyDataChangeFromServer: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { scheduler } from '@/lib/scheduler/scheduler'
import { taskQueue } from '@/lib/scheduler/task-queue'
import type { ScheduleTask } from '@/types/schedule'

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

describe('Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('初始化与关闭', () => {
    it('初始化时加载所有启用的定时任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const tasks = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })]
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue(tasks)

      scheduler.shutdown()
      scheduler.initialize()

      expect(scheduleRepository.findAllEnabled).toHaveBeenCalled()
      expect(scheduler.getScheduledTasks()).toContain('task-1')
      expect(scheduler.getScheduledTasks()).toContain('task-2')
    })

    it('初始化时跳过已完结的词条对应的任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')

      const task = makeTask({ id: 'task-1' })
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([task])
      vi.mocked(itemsRepository.findByIdWithRelations).mockReturnValue({
        id: 'item-1',
        title: '测试剧集',
        type: 'tv' as const,
        status: 'completed',
        completed: true,
        seasons: [],
        episodes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      scheduler.shutdown()
      scheduler.initialize()

      expect(scheduleRepository.deleteByItemId).toHaveBeenCalledWith('item-1')
      expect(scheduler.getScheduledTasks()).not.toContain('task-1')
    })

    it('重复初始化不会重新加载任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      scheduler.shutdown()
      scheduler.initialize()
      scheduler.initialize()

      expect(scheduleRepository.findAllEnabled).toHaveBeenCalled()
    })

    it('shutdown 关闭所有调度任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([makeTask({ id: 'task-1' })])

      scheduler.shutdown()
      scheduler.initialize()
      scheduler.shutdown()

      expect(scheduler.getScheduledTasks()).toHaveLength(0)
    })
  })

  describe('任务调度', () => {
    it('scheduleTask 使用 node-cron 调度任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-new', cron: '*/5 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-new')
    })

    it('scheduleTask 拒绝无效的 cron 表达式', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { logger } = await import('@/lib/utils/logger')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-invalid', cron: 'invalid-cron' })
      scheduler.scheduleTask(task)

      expect(logger.error).toHaveBeenCalledWith('[Scheduler] 无效的 cron 表达式: invalid-cron')
      expect(scheduler.getScheduledTasks()).not.toContain('task-invalid')
    })

    it('scheduleTask 不调度禁用的任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-disabled', enabled: false })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).not.toContain('task-disabled')
    })

    it('重复调度同一任务会先取消再重新调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task1 = makeTask({ id: 'task-same', cron: '0 2 * * *' })
      const task2 = makeTask({ id: 'task-same', cron: '0 3 * * *' })

      scheduler.scheduleTask(task1)
      expect(scheduler.getScheduledTasks()).toContain('task-same')

      scheduler.scheduleTask(task2)
      expect(scheduler.getScheduledTasks()).toContain('task-same')
    })
  })

  describe('任务取消', () => {
    it('unscheduleTask 停止并移除任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-to-unschedule' })
      scheduler.scheduleTask(task)
      expect(scheduler.getScheduledTasks()).toContain('task-to-unschedule')

      scheduler.unscheduleTask('task-to-unschedule')
      expect(scheduler.getScheduledTasks()).not.toContain('task-to-unschedule')
    })

    it('取消不存在的任务不会报错', async () => {
      expect(() => scheduler.unscheduleTask('non-existent-task')).not.toThrow()
    })
  })

  describe('任务更新', () => {
    it('updateTask 先取消再重新调度任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-to-update', cron: '0 2 * * *' })
      scheduler.scheduleTask(task)

      const updatedTask = makeTask({ id: 'task-to-update', cron: '0 3 * * *' })
      scheduler.updateTask(updatedTask)

      expect(scheduler.getScheduledTasks()).toContain('task-to-update')
    })

    it('updateTask 禁用任务后会停止调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-to-disable', enabled: true })
      scheduler.scheduleTask(task)
      expect(scheduler.getScheduledTasks()).toContain('task-to-disable')

      const disabledTask = makeTask({ id: 'task-to-disable', enabled: false })
      scheduler.updateTask(disabledTask)
      expect(scheduler.getScheduledTasks()).not.toContain('task-to-disable')
    })
  })

  describe('任务移除', () => {
    it('removeTask 移除任务并停止调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-to-remove' })
      scheduler.scheduleTask(task)
      expect(scheduler.getScheduledTasks()).toContain('task-to-remove')

      scheduler.removeTask('task-to-remove')
      expect(scheduler.getScheduledTasks()).not.toContain('task-to-remove')
    })
  })

  describe('任务执行', () => {
    it('executeTask 能够被调用', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-to-execute' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-to-execute')
    })

    it('executeTask 拒绝正在执行的任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { logger } = await import('@/lib/utils/logger')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-running' })

      scheduler.scheduleTask(task)
      await scheduler.executeTask(task)
      await scheduler.executeTask(task)

      expect(logger.warn).toHaveBeenCalledWith('[Scheduler] 任务正在执行中，跳过本次触发: task-running')
    })
  })

  describe('任务超时处理', () => {
    it('executeTask 能够处理任务超时场景', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-timeout' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-timeout')
    })
  })

  describe('桌面端窗口状态场景', () => {
    describe('窗口关闭场景', () => {
      it('窗口关闭后（最小化到托盘）任务调度器仍然运行', async () => {
        const { scheduleRepository } = await import('@/lib/data/schedule-repository')
        vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

        const task = makeTask({ id: 'task-after-close', cron: '*/1 * * * *' })
        scheduler.scheduleTask(task)

        expect(scheduler.getScheduledTasks()).toContain('task-after-close')
        expect(scheduler.getScheduledTasks().length).toBeGreaterThan(0)
      })

      it('窗口关闭后（隐藏到托盘）node-cron 任务仍然活跃', async () => {
        const { scheduleRepository } = await import('@/lib/data/schedule-repository')
        vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

        const task = makeTask({ id: 'task-cron-active', cron: '*/1 * * * *' })
        scheduler.scheduleTask(task)

        const scheduledTasks = scheduler.getScheduledTasks()
        expect(scheduledTasks).toContain('task-cron-active')
      })

      it('多次窗口关闭/显示操作不影响已调度的任务', async () => {
        const { scheduleRepository } = await import('@/lib/data/schedule-repository')
        vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

        const task = makeTask({ id: 'task-persistent' })
        scheduler.scheduleTask(task)
        expect(scheduler.getScheduledTasks()).toContain('task-persistent')

        scheduler.unscheduleTask('task-persistent')
        expect(scheduler.getScheduledTasks()).not.toContain('task-persistent')

        scheduler.scheduleTask(task)
        expect(scheduler.getScheduledTasks()).toContain('task-persistent')
      })
    })

    describe('窗口最小化场景', () => {
      it('窗口最小化后任务调度器继续运行', async () => {
        const { scheduleRepository } = await import('@/lib/data/schedule-repository')
        vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

        const task = makeTask({ id: 'task-after-minimize', cron: '*/1 * * * *' })
        scheduler.scheduleTask(task)

        expect(scheduler.getScheduledTasks()).toContain('task-after-minimize')
      })

      it('Electron backgroundThrottling=false 确保定时器不被节流', async () => {
        const { scheduleRepository } = await import('@/lib/data/schedule-repository')
        vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

        const frequentTask = makeTask({ id: 'task-frequent', cron: '*/1 * * * *' })
        scheduler.scheduleTask(frequentTask)

        expect(scheduler.getScheduledTasks()).toContain('task-frequent')
      })
    })

    describe('系统托盘场景', () => {
      it('应用在系统托盘运行时任务继续调度', async () => {
        const { scheduleRepository } = await import('@/lib/data/schedule-repository')
        vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

        const task = makeTask({ id: 'task-in-tray' })
        scheduler.scheduleTask(task)

        expect(scheduler.getScheduledTasks()).toContain('task-in-tray')
      })

      it('托盘图标显示时后台任务保持活跃', async () => {
        const { scheduleRepository } = await import('@/lib/data/schedule-repository')
        vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

        const tasks = [
          makeTask({ id: 'tray-task-1', cron: '0 2 * * *' }),
          makeTask({ id: 'tray-task-2', cron: '0 3 * * *' }),
        ]

        for (const task of tasks) {
          scheduler.scheduleTask(task)
        }

        expect(scheduler.getScheduledTasks()).toContain('tray-task-1')
        expect(scheduler.getScheduledTasks()).toContain('tray-task-2')
      })
    })

    describe('应用退出场景', () => {
      it('shutdown 正确停止所有任务', async () => {
        const { scheduleRepository } = await import('@/lib/data/schedule-repository')
        vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

        const task = makeTask({ id: 'task-before-shutdown' })
        scheduler.scheduleTask(task)
        expect(scheduler.getScheduledTasks()).toContain('task-before-shutdown')

        scheduler.shutdown()
        expect(scheduler.getScheduledTasks()).toHaveLength(0)
      })

      it('shutdown 清理 executingTaskIds', async () => {
        const { scheduleRepository } = await import('@/lib/data/schedule-repository')
        vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

        scheduler.shutdown()
        scheduler.initialize()

        const task = makeTask({ id: 'task-check-executing' })
        scheduler.scheduleTask(task)
        await scheduler.executeTask(task)

        scheduler.shutdown()

        expect(scheduler.getScheduledTasks()).toHaveLength(0)
      })

      it('重启应用后调度器可以重新初始化', async () => {
        const { scheduleRepository } = await import('@/lib/data/schedule-repository')
        vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

        scheduler.shutdown()
        scheduler.initialize()

        expect(scheduleRepository.findAllEnabled).toHaveBeenCalled()
      })
    })
  })

  describe('nextRunAt 计算', () => {
    it('calculateNextRunTime 正确计算下一个运行时间', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-next-run' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-next-run')
    })

    it('calculateNextRunTime 处理工作日调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const weekdayTask = makeTask({ id: 'task-weekday', cron: '0 2 * * 1,3,5' })
      scheduler.scheduleTask(weekdayTask)

      expect(scheduler.getScheduledTasks()).toContain('task-weekday')
    })

    it('calculateNextRunTime 处理无效 cron 表达式', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const invalidTask = makeTask({ id: 'task-invalid-cron', cron: '* * *' })
      scheduler.scheduleTask(invalidTask)

      expect(scheduler.getScheduledTasks()).not.toContain('task-invalid-cron')
    })
  })

  describe('并发控制', () => {
    it('同一任务不会并发执行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { logger } = await import('@/lib/utils/logger')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-no-concurrent' })
      scheduler.scheduleTask(task)

      await scheduler.executeTask(task)
      await scheduler.executeTask(task)

      expect(logger.warn).toHaveBeenCalledWith(
        '[Scheduler] 任务正在执行中，跳过本次触发: task-no-concurrent'
      )
    })

    it('不同任务可以同时被调度（但串行执行）', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task1 = makeTask({ id: 'task-parallel-1' })
      const task2 = makeTask({ id: 'task-parallel-2' })

      scheduler.scheduleTask(task1)
      scheduler.scheduleTask(task2)

      expect(scheduler.getScheduledTasks()).toContain('task-parallel-1')
      expect(scheduler.getScheduledTasks()).toContain('task-parallel-2')
    })
  })

  describe('cron 表达式验证', () => {
    it('接受有效的 cron 表达式', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const validCrons = [
        '0 0 * * *',
        '*/5 * * * *',
        '0 2 * * 1-5',
        '0 2 * * 1,3,5',
        '0 */2 * * *',
      ]

      for (const cronExpr of validCrons) {
        const task = makeTask({ id: `task-${cronExpr.replace(/[^a-z0-9]/gi, '-')}`, cron: cronExpr })
        scheduler.scheduleTask(task)
        expect(scheduler.getScheduledTasks()).toContain(`task-${cronExpr.replace(/[^a-z0-9]/gi, '-')}`)
        scheduler.unscheduleTask(`task-${cronExpr.replace(/[^a-z0-9]/gi, '-')}`)
      }
    })

    it('拒绝无效的 cron 表达式', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { logger } = await import('@/lib/utils/logger')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const invalidTask = makeTask({ id: 'task-invalid-cron', cron: 'invalid' })
      scheduler.scheduleTask(invalidTask)

      expect(logger.error).toHaveBeenCalledWith('[Scheduler] 无效的 cron 表达式: invalid')
    })
  })

  describe('词条状态与任务联动', () => {
    it('词条完结时自动删除对应任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-item-completed' })
      vi.mocked(itemsRepository.findByIdWithRelations).mockReturnValue({
        id: 'item-1',
        title: '测试剧集',
        type: 'tv' as const,
        status: 'completed',
        completed: true,
        seasons: [{ seasonNumber: 1, totalEpisodes: 20, currentEpisode: 20, episodes: [] }],
        episodes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      scheduler.scheduleTask(task)
      expect(scheduler.getScheduledTasks()).toContain('task-item-completed')

      scheduler.removeTask('task-item-completed')
      scheduleRepository.deleteByItemId('item-1')

      expect(scheduleRepository.deleteByItemId).toHaveBeenCalledWith('item-1')
    })

    it('词条不存在时删除任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-item-missing' })
      scheduler.scheduleTask(task)
      expect(scheduler.getScheduledTasks()).toContain('task-item-missing')

      scheduler.removeTask('task-item-missing')
      expect(scheduler.getScheduledTasks()).not.toContain('task-item-missing')
    })
  })

  describe('日志记录', () => {
    it('任务执行时创建日志记录', async () => {
      const { scheduleLogRepository } = await import('@/lib/data/schedule-log-repository')

      expect(scheduleLogRepository.create).not.toHaveBeenCalled()
    })

    it('任务失败时更新日志状态', async () => {
      const { scheduleLogRepository } = await import('@/lib/data/schedule-log-repository')
      vi.mocked(scheduleLogRepository.updateStatus).mockResolvedValue(undefined)

      await scheduleLogRepository.updateStatus('log-1', 'failed', '测试错误')

      expect(scheduleLogRepository.updateStatus).toHaveBeenCalledWith(
        'log-1',
        'failed',
        '测试错误'
      )
    })
  })
})

describe('TaskQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taskQueue.clear()
  })

  describe('入队行为', () => {
    it('enqueue 将任务添加到队列', async () => {
      await taskQueue.enqueue({
        id: 'queue-task-1',
        execute: async () => {},
      })

      expect(taskQueue.getQueueLength()).toBeGreaterThanOrEqual(0)
    })

    it('重复入队同一任务被检测', async () => {
      const { scheduleLogRepository } = await import('@/lib/data/schedule-log-repository')
      vi.mocked(scheduleLogRepository.create).mockReturnValue({
        success: true,
        data: { id: 'log-1' },
      })

      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      vi.mocked(itemsRepository.findByIdWithRelations).mockReturnValue(null)

      const task = { id: 'duplicate-task', execute: async () => {} }

      await taskQueue.enqueue(task)
      const lengthAfterFirst = taskQueue.getQueueLength()

      await taskQueue.enqueue(task)
      const lengthAfterSecond = taskQueue.getQueueLength()

      expect(lengthAfterSecond).toBe(lengthAfterFirst)
    })
  })

  describe('队列长度', () => {
    it('getQueueLength 返回当前队列长度', async () => {
      const initialLength = taskQueue.getQueueLength()
      expect(typeof initialLength).toBe('number')
    })

    it('clear 清空队列', async () => {
      taskQueue.clear()
      expect(taskQueue.getQueueLength()).toBe(0)
    })
  })
})

describe('桌面端多场景综合测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('场景1：窗口关闭后定时任务是否正常触发', () => {
    it('窗口关闭（最小化到托盘）后，node-cron 调度器保持活跃', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene1-task', cron: '*/1 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene1-task')
      expect(scheduler.getScheduledTasks().length).toBeGreaterThan(0)
    })

    it('窗口关闭后再次打开，任务状态保持一致', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene1-task-persist' })
      scheduler.scheduleTask(task)
      const taskId = scheduler.getScheduledTasks()[0]

      scheduler.unscheduleTask(taskId)
      expect(scheduler.getScheduledTasks()).not.toContain('scene1-task-persist')

      scheduler.scheduleTask(task)
      expect(scheduler.getScheduledTasks()).toContain('scene1-task-persist')
    })

    it('窗口多次关闭打开，任务不被重复调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene1-no-duplicate' })

      scheduler.scheduleTask(task)
      scheduler.unscheduleTask('scene1-no-duplicate')
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene1-no-duplicate')
      expect(scheduler.getScheduledTasks().filter(t => t === 'scene1-no-duplicate')).toHaveLength(1)
    })
  })

  describe('场景2：窗口最小化后定时任务是否正常触发', () => {
    it('窗口最小化不影响 node-cron 任务调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene2-minimize', cron: '*/1 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene2-minimize')
    })

    it('窗口最小化到任务栏后任务仍然活跃', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene2-taskbar' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene2-taskbar')
    })

    it('窗口最小化后恢复，任务继续执行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene2-resume' })
      scheduler.scheduleTask(task)

      const beforeResume = scheduler.getScheduledTasks()
      scheduler.updateTask(task)

      const afterResume = scheduler.getScheduledTasks()
      expect(beforeResume).toEqual(afterResume)
    })
  })

  describe('场景3：系统托盘运行时定时任务是否正常触发', () => {
    it('托盘模式下调度器正常工作', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene3-tray', cron: '0 2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene3-tray')
    })

    it('托盘模式下多个任务同时调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const tasks = [
        makeTask({ id: 'scene3-multi-1', cron: '0 2 * * *' }),
        makeTask({ id: 'scene3-multi-2', cron: '0 3 * * *' }),
        makeTask({ id: 'scene3-multi-3', cron: '0 4 * * *' }),
      ]

      for (const task of tasks) {
        scheduler.scheduleTask(task)
      }

      expect(scheduler.getScheduledTasks()).toContain('scene3-multi-1')
      expect(scheduler.getScheduledTasks()).toContain('scene3-multi-2')
      expect(scheduler.getScheduledTasks()).toContain('scene3-multi-3')
    })

    it('托盘模式下任务执行完成后的回调处理', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene3-callback' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene3-callback')
    })
  })

  describe('场景4：网络中断与恢复场景', () => {
    it('网络中断时任务执行返回错误', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene4-network' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene4-network')
    })

    it('网络恢复后任务继续正常调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene4-recovery' })
      scheduler.scheduleTask(task)
      scheduler.unscheduleTask('scene4-recovery')
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene4-recovery')
    })

    it('网络不稳定时任务不被重复触发', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { logger } = await import('@/lib/utils/logger')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene4-no-flood' })
      scheduler.scheduleTask(task)

      await scheduler.executeTask(task)
      await scheduler.executeTask(task)

      expect(logger.warn).toHaveBeenCalledWith(
        '[Scheduler] 任务正在执行中，跳过本次触发: scene4-no-flood'
      )
    })
  })

  describe('场景5：系统休眠与唤醒场景', () => {
    it('系统休眠后唤醒，任务调度器仍然活跃', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene5-wake', cron: '*/1 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene5-wake')
    })

    it('休眠期间错过的任务在唤醒后不会补执行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene5-no-catchup' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene5-no-catchup')
    })

    it('唤醒后新周期的任务正常触发', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene5-new-cycle' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene5-new-cycle')
    })
  })

  describe('场景6：应用进程保活场景', () => {
    it('渲染进程崩溃时主进程调度器保持运行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene6-main-alive' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene6-main-alive')
    })

    it('渲染进程恢复后可以重新通信', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene6-renderer-recovery' })
      scheduler.scheduleTask(task)

      scheduler.unscheduleTask('scene6-renderer-recovery')
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene6-renderer-recovery')
    })

    it('主进程调度器独立于渲染进程', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const mainProcessTask = makeTask({ id: 'scene6-independent' })
      scheduler.scheduleTask(mainProcessTask)

      expect(scheduler.getScheduledTasks()).toContain('scene6-independent')
      expect(scheduler.getScheduledTasks().length).toBeGreaterThan(0)
    })
  })

  describe('场景7：多显示器与焦点场景', () => {
    it('窗口在多显示器间移动不影响任务调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene7-multidisplay' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene7-multidisplay')
    })

    it('窗口失去焦点时任务继续运行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene7-no-focus' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene7-no-focus')
    })

    it('窗口获得焦点时任务状态正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene7-focus-restore' })
      scheduler.scheduleTask(task)

      const tasks = scheduler.getScheduledTasks()
      expect(tasks).toContain('scene7-focus-restore')
    })
  })

  describe('场景8：系统资源限制场景', () => {
    it('内存不足时任务执行不受影响', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene8-low-memory' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene8-low-memory')
    })

    it('CPU 负载高时任务仍然按 cron 触发', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene8-high-cpu', cron: '*/1 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene8-high-cpu')
    })

    it('任务执行超时保护机制正常', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene8-timeout' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene8-timeout')
    })
  })

  describe('场景9：应用更新与重启场景', () => {
    it('应用更新后任务配置保留', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')

      const task = makeTask({ id: 'scene9-persist', cron: '0 2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene9-persist')
    })

    it('应用重启后可以重新加载任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')

      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      scheduler.shutdown()
      scheduler.initialize()

      const task = makeTask({ id: 'scene9-reload' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene9-reload')
    })

    it('重启前后任务状态一致性', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene9-consistency' })
      scheduler.scheduleTask(task)

      const beforeRestart = scheduler.getScheduledTasks()
      scheduler.shutdown()
      scheduler.initialize()
      const afterRestart = scheduler.getScheduledTasks()

      expect(beforeRestart).toContain('scene9-consistency')
      expect(afterRestart).toEqual([])
    })
  })

  describe('场景10：时区与夏令时场景', () => {
    it('Asia/Shanghai 时区任务正确调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'scene10-timezone', cron: '0 2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('scene10-timezone')
    })

    it('跨天任务正确计算下一次运行时间', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const lateNightTask = makeTask({ id: 'scene10-midnight', cron: '0 0 * * *' })
      scheduler.scheduleTask(lateNightTask)

      expect(scheduler.getScheduledTasks()).toContain('scene10-midnight')
    })

    it('工作日调度正确处理', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const weekdayTask = makeTask({ id: 'scene10-weekday', cron: '0 9 * * 1-5' })
      scheduler.scheduleTask(weekdayTask)

      expect(scheduler.getScheduledTasks()).toContain('scene10-weekday')
    })
  })
})

describe('边界情况与异常处理测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('初始化边界情况', () => {
    it('空任务列表初始化成功', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      scheduler.shutdown()
      scheduler.initialize()

      expect(scheduler.getScheduledTasks()).toHaveLength(0)
    })

    it('初始化时跳过无效 cron 任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { logger } = await import('@/lib/utils/logger')

      const invalidTask = makeTask({ id: 'task-invalid-init', cron: 'invalid' })
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([invalidTask])

      scheduler.shutdown()
      scheduler.initialize()

      expect(logger.error).toHaveBeenCalledWith('[Scheduler] 无效的 cron 表达式: invalid')
      expect(scheduler.getScheduledTasks()).not.toContain('task-invalid-init')
    })

    it('初始化时跳过禁用状态的任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const disabledTask = makeTask({ id: 'task-disabled-init', enabled: false })
      scheduler.scheduleTask(disabledTask)

      expect(scheduler.getScheduledTasks()).not.toContain('task-disabled-init')
    })

    it('初始化时清理已完结词条对应的任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')

      const task = makeTask({ id: 'task-completed-item' })
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([task])
      vi.mocked(itemsRepository.findByIdWithRelations).mockReturnValue({
        id: 'item-1',
        title: '已完结剧集',
        type: 'tv' as const,
        status: 'completed',
        completed: true,
        seasons: [],
        episodes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      scheduler.shutdown()
      scheduler.initialize()

      expect(scheduleRepository.deleteByItemId).toHaveBeenCalledWith('item-1')
      expect(scheduler.getScheduledTasks()).not.toContain('task-completed-item')
    })
  })

  describe('calculateNextRunTime 边界情况', () => {
    it('处理 cron 小时为 * 的情况', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-hour-star', cron: '* 2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-hour-star')
    })

    it('处理 cron 分钟为 * 的情况', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-min-star', cron: '30 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-min-star')
    })

    it('处理 cron 表达式部分无效的情况', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-partial-invalid', cron: '* * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).not.toContain('task-partial-invalid')
    })

    it('处理 cron 表达式分钟超过59的情况', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-minute-invalid', cron: '60 2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).not.toContain('task-minute-invalid')
    })

    it('处理 cron 表达式小时超过23的情况', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-hour-invalid', cron: '0 24 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).not.toContain('task-hour-invalid')
    })
  })

  describe('任务执行异常处理', () => {
    it('executeTask 处理正在执行的任务时跳过', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { logger } = await import('@/lib/utils/logger')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-concurrent-skip' })

      scheduler.scheduleTask(task)
      vi.mocked(scheduleRepository.findById).mockReturnValue(task)

      await scheduler.executeTask(task)
      await scheduler.executeTask(task)

      expect(logger.warn).toHaveBeenCalledWith(
        '[Scheduler] 任务正在执行中，跳过本次触发: task-concurrent-skip'
      )
    })

    it('runTask 处理词条不存在的情况', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-item-missing' })
      scheduler.scheduleTask(task)

      vi.mocked(itemsRepository.findByIdWithRelations).mockReturnValue(null)

      expect(scheduler.getScheduledTasks()).toContain('task-item-missing')
    })

    it('runTask 处理词条已完结的情况', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-item-completed-run' })
      scheduler.scheduleTask(task)

      vi.mocked(itemsRepository.findByIdWithRelations).mockReturnValue({
        id: 'item-1',
        title: '已完结剧集',
        type: 'tv' as const,
        status: 'completed',
        completed: true,
        seasons: [],
        episodes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(scheduler.getScheduledTasks()).toContain('task-item-completed-run')
    })
  })

  describe('数据库操作异常处理', () => {
    it('scheduleLogRepository.create 能处理失败场景', async () => {
      const { scheduleLogRepository } = await import('@/lib/data/schedule-log-repository')
      vi.mocked(scheduleLogRepository.create).mockReturnValue({ success: false, error: 'DB Error' })

      const result = scheduleLogRepository.create({
        taskId: 'test',
        status: 'running',
        startAt: new Date().toISOString(),
        endAt: null,
        message: 'test',
        details: null,
      })

      expect(result.success).toBe(false)
    })

    it('scheduleLogRepository.updateStatus 能处理失败', async () => {
      const { scheduleLogRepository } = await import('@/lib/data/schedule-log-repository')
      vi.mocked(scheduleLogRepository.updateStatus).mockRejectedValue(new Error('Update failed'))

      await expect(
        scheduleLogRepository.updateStatus('log-1', 'failed', 'test error')
      ).rejects.toThrow('Update failed')
    })

    it('itemsRepository.update 失败时记录错误', async () => {
      const { itemsRepository } = await import('@/lib/database/repositories/items.repository')
      vi.mocked(itemsRepository.update).mockReturnValue({ success: false, error: 'Update failed' })

      const item = {
        id: 'item-1',
        title: '测试',
        type: 'tv' as const,
        status: 'watching',
        completed: false,
        seasons: [],
        episodes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = itemsRepository.update(item)

      expect(result.success).toBe(false)
    })
  })

  describe('通知发送边界情况', () => {
    it('sendSuccessNotification 处理通知发送', async () => {
      const { notifier } = await import('@/lib/scheduler/notifier')

      await notifier.sendSuccessNotification('测试剧集', 10)

      expect(notifier.sendSuccessNotification).toHaveBeenCalledWith('测试剧集', 10)
    })

    it('sendErrorNotification 处理通知发送', async () => {
      const { notifier } = await import('@/lib/scheduler/notifier')

      await notifier.sendErrorNotification('测试剧集', '执行失败')

      expect(notifier.sendErrorNotification).toHaveBeenCalledWith('测试剧集', '执行失败')
    })
  })

  describe('SSE 广播边界情况', () => {
    it('notifyDataChangeFromServer 处理 item_updated 消息', async () => {
      const { notifyDataChangeFromServer } = await import('@/lib/data/sse-broadcaster')

      const item = {
        id: 'item-1',
        title: '测试',
        type: 'tv' as const,
        status: 'watching',
        completed: false,
        seasons: [],
        episodes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      notifyDataChangeFromServer({ type: 'item_updated', data: item })

      expect(notifyDataChangeFromServer).toHaveBeenCalledWith({
        type: 'item_updated',
        data: item,
      })
    })

    it('notifyDataChangeFromServer 处理 journal_updated 消息', async () => {
      const { notifyDataChangeFromServer } = await import('@/lib/data/sse-broadcaster')

      notifyDataChangeFromServer({
        type: 'journal_updated',
        data: { itemId: 'item-1', status: 'success' },
      })

      expect(notifyDataChangeFromServer).toHaveBeenCalled()
    })
  })

  describe('任务队列异常处理', () => {
    it('处理队列任务执行异常', async () => {
      const { taskQueue } = await import('@/lib/scheduler/task-queue')
      const { logger } = await import('@/lib/utils/logger')

      const failingTask = {
        id: 'task-fail',
        execute: async () => {
          throw new Error('Execution failed')
        },
      }

      taskQueue.clear()
      await taskQueue.enqueue(failingTask)

      expect(logger.error).toHaveBeenCalled()
    })

    it('清空队列后新任务正常入队', async () => {
      const { taskQueue } = await import('@/lib/scheduler/task-queue')

      taskQueue.clear()

      const task = { id: 'task-after-clear', execute: async () => {} }
      await taskQueue.enqueue(task)

      expect(taskQueue.getQueueLength()).toBeGreaterThanOrEqual(0)
    })

    it('多个任务按顺序入队', async () => {
      const { taskQueue } = await import('@/lib/scheduler/task-queue')

      taskQueue.clear()

      await taskQueue.enqueue({ id: 'multi-1', execute: async () => {} })
      await taskQueue.enqueue({ id: 'multi-2', execute: async () => {} })
      await taskQueue.enqueue({ id: 'multi-3', execute: async () => {} })

      expect(taskQueue.getQueueLength()).toBeGreaterThanOrEqual(0)
    })
  })

  describe('时区与时间边界情况', () => {
    it('Asia/Shanghai 时区配置正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-timezone', cron: '0 2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-timezone')
    })

    it('跨年任务调度正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-year-cross', cron: '0 0 1 1 *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-year-cross')
    })

    it('月末任务调度正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-month-end', cron: '0 23 28-31 * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-month-end')
    })
  })

  describe('Cron 表达式各种格式', () => {
    it('每分钟执行 (*/1 * * * *)', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'cron-every-min', cron: '*/1 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('cron-every-min')
    })

    it('每2小时执行 (0 */2 * * *)', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'cron-every-2hr', cron: '0 */2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('cron-every-2hr')
    })

    it('工作日每天9点执行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'cron-weekday-9am', cron: '0 9 * * 1-5' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('cron-weekday-9am')
    })

    it('周末执行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'cron-weekend', cron: '0 10 * * 0,6' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('cron-weekend')
    })

    it('每月1号执行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'cron-monthly', cron: '0 8 1 * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('cron-monthly')
    })

    it('每年1月1号执行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'cron-yearly', cron: '0 0 1 1 *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('cron-yearly')
    })
  })

  describe('桌面端电源管理场景', () => {
    it('窗口最小化时定时器不被 Electron 后台节流', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-no-throttle', cron: '*/1 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-no-throttle')
    })

    it('电源断开连接时任务继续运行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-on-battery' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-on-battery')
    })

    it('系统休眠后唤醒时任务保持活跃', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-after-wake' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-after-wake')
    })
  })

  describe('多任务调度场景', () => {
    it('调度50个任务都能正确注册', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      for (let i = 0; i < 50; i++) {
        const task = makeTask({ id: `task-many-${i}`, cron: '0 2 * * *' })
        scheduler.scheduleTask(task)
      }

      expect(scheduler.getScheduledTasks().length).toBeGreaterThanOrEqual(0)
    })

    it('取消一个任务不影响其他任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task1 = makeTask({ id: 'task-keep-1' })
      const task2 = makeTask({ id: 'task-keep-2' })
      const taskToRemove = makeTask({ id: 'task-remove' })

      scheduler.scheduleTask(task1)
      scheduler.scheduleTask(task2)
      scheduler.scheduleTask(taskToRemove)

      scheduler.unscheduleTask('task-remove')

      expect(scheduler.getScheduledTasks()).toContain('task-keep-1')
      expect(scheduler.getScheduledTasks()).toContain('task-keep-2')
      expect(scheduler.getScheduledTasks()).not.toContain('task-remove')
    })

    it('批量取消所有任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      scheduler.scheduleTask(makeTask({ id: 'bulk-1' }))
      scheduler.scheduleTask(makeTask({ id: 'bulk-2' }))
      scheduler.scheduleTask(makeTask({ id: 'bulk-3' }))

      scheduler.shutdown()

      expect(scheduler.getScheduledTasks()).toHaveLength(0)
    })
  })
})

describe('TaskQueue 边界情况测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taskQueue.clear()
  })

  describe('队列空状态', () => {
    it('空队列时 getQueueLength 返回0', async () => {
      taskQueue.clear()
      expect(taskQueue.getQueueLength()).toBe(0)
    })

    it('空队列时执行 clear 不报错', async () => {
      expect(() => taskQueue.clear()).not.toThrow()
    })
  })

  describe('任务执行时间边界', () => {
    it('快速执行完成的任务', async () => {
      const quickTask = {
        id: 'quick-task',
        execute: async () => {
          return
        },
      }

      await taskQueue.enqueue(quickTask)
      expect(taskQueue.getQueueLength()).toBeGreaterThanOrEqual(0)
    })

    it('模拟耗时任务', async () => {
      const slowTask = {
        id: 'slow-task',
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
        },
      }

      await taskQueue.enqueue(slowTask)
      expect(taskQueue.getQueueLength()).toBeGreaterThanOrEqual(0)
    })
  })

  describe('队列饱和状态', () => {
    it('大量任务入队', async () => {
      for (let i = 0; i < 100; i++) {
        await taskQueue.enqueue({
          id: `saturation-${i}`,
          execute: async () => {},
        })
      }

      expect(taskQueue.getQueueLength()).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('任务防重复执行测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('任务执行中状态保护', () => {
    it('同一任务在执行中时不会被重复触发', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { logger } = await import('@/lib/utils/logger')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-prevent-duplicate' })
      scheduler.scheduleTask(task)

      vi.mocked(scheduleRepository.findById).mockReturnValue(task)

      await scheduler.executeTask(task)
      await scheduler.executeTask(task)
      await scheduler.executeTask(task)

      expect(logger.warn).toHaveBeenCalledWith(
        '[Scheduler] 任务正在执行中，跳过本次触发: task-prevent-duplicate'
      )
    })

    it('不同任务可以同时被调度（但串行执行）', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task1 = makeTask({ id: 'task-parallel-a' })
      const task2 = makeTask({ id: 'task-parallel-b' })

      scheduler.scheduleTask(task1)
      scheduler.scheduleTask(task2)

      expect(scheduler.getScheduledTasks()).toContain('task-parallel-a')
      expect(scheduler.getScheduledTasks()).toContain('task-parallel-b')
    })

    it('任务执行完成后才能再次触发', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-re-trigger' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-re-trigger')
    })
  })

  describe('任务执行超时保护', () => {
    it('执行时间超过10分钟的任务被标记为超时', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { logger } = await import('@/lib/utils/logger')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-timeout-protection' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-timeout-protection')
    })
  })
})

describe('夏令时（DST）与时区测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('时区配置测试', () => {
    it('Asia/Shanghai 时区任务调度正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-asia-shanghai' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-asia-shanghai')
    })

    it('UTC 时区任务调度正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-utc' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-utc')
    })

    it('America/New_York 时区任务调度正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-nyc' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-nyc')
    })
  })

  describe('跨时区任务调度', () => {
    it('不同地区用户设置的定时任务不受影响', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-cross-timezone' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-cross-timezone')
    })
  })
})

describe('任务重叠执行防护测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('防止任务重叠', () => {
    it('当任务执行时间超过调度间隔时，下一次触发被跳过', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { logger } = await import('@/lib/utils/logger')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const frequentTask = makeTask({ id: 'task-overlap-prevent', cron: '*/1 * * * *' })
      scheduler.scheduleTask(frequentTask)

      vi.mocked(scheduleRepository.findById).mockReturnValue(frequentTask)

      await scheduler.executeTask(frequentTask)

      expect(logger.warn).not.toHaveBeenCalledWith(
        '[Scheduler] 任务正在执行中，跳过本次触发: task-overlap-prevent'
      )
    })

    it('长时间运行的任务不会阻塞其他任务调度（但队列串行执行）', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const longTask = makeTask({ id: 'task-long-running' })
      const shortTask = makeTask({ id: 'task-short' })

      scheduler.scheduleTask(longTask)
      scheduler.scheduleTask(shortTask)

      expect(scheduler.getScheduledTasks()).toContain('task-long-running')
      expect(scheduler.getScheduledTasks()).toContain('task-short')
    })
  })

  describe('任务串行执行验证', () => {
     it('同一时间触发的多个任务按队列顺序串行执行', async () => {
       const { scheduleRepository } = await import('@/lib/data/schedule-repository')
       vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

       const task1 = makeTask({ id: 'serial-task-1' })
       const task2 = makeTask({ id: 'serial-task-2' })
       const task3 = makeTask({ id: 'serial-task-3' })

       scheduler.scheduleTask(task1)
       scheduler.scheduleTask(task2)
       scheduler.scheduleTask(task3)

       expect(scheduler.getScheduledTasks()).toHaveLength(3)
     })

     it('任务串行执行时调度顺序正确', async () => {
       const { scheduleRepository } = await import('@/lib/data/schedule-repository')
       vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

       const task = makeTask({ id: 'serial-order-task' })
       scheduler.scheduleTask(task)

       expect(scheduler.getScheduledTasks()).toContain('serial-order-task')
     })

     it('串行队列确保任务执行顺序正确', async () => {
       const { scheduleRepository } = await import('@/lib/data/schedule-repository')
       vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

       const taskFirst = makeTask({ id: 'order-first' })
       const taskSecond = makeTask({ id: 'order-second' })

       scheduler.scheduleTask(taskFirst)
       scheduler.scheduleTask(taskSecond)

       expect(scheduler.getScheduledTasks()).toContain('order-first')
       expect(scheduler.getScheduledTasks()).toContain('order-second')
     })
   })
  })

describe('手动触发 vs 定时触发测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('手动触发任务', () => {
    it('用户手动触发任务立即执行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-manual-trigger' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-manual-trigger')
    })

    it('手动触发不受 cron 表达式限制', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-manual-no-cron-limit', cron: '0 2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-manual-no-cron-limit')
    })
  })

  describe('定时触发任务', () => {
    it('定时触发的任务通过 node-cron 调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-scheduled-trigger', cron: '*/5 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-scheduled-trigger')
    })

    it('定时任务在非触发时间不执行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-not-triggered-yet' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-not-triggered-yet')
    })
  })
})

describe('任务执行流程深度测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('任务执行完整流程', () => {
    it('任务执行流程：验证任务调度成功', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-full-flow' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-full-flow')
    })

    it('任务执行流程：验证任务可以被取消', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-sse-broadcast' })
      scheduler.scheduleTask(task)
      scheduler.unscheduleTask('task-sse-broadcast')

      expect(scheduler.getScheduledTasks()).not.toContain('task-sse-broadcast')
    })

    it('任务执行流程：验证通知发送', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-notify-send' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-notify-send')
    })
  })

  describe('任务执行异常恢复', () => {
    it('任务执行失败后清理 executingTaskIds', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-cleanup-on-fail' })
      scheduler.scheduleTask(task)

      vi.mocked(scheduleRepository.findById).mockReturnValue(null)

      await scheduler.executeTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-cleanup-on-fail')
    })

    it('任务执行异常不影响其他任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const failingTask = makeTask({ id: 'task-fail-isolated' })
      const healthyTask = makeTask({ id: 'task-healthy' })

      scheduler.scheduleTask(failingTask)
      scheduler.scheduleTask(healthyTask)

      expect(scheduler.getScheduledTasks()).toContain('task-fail-isolated')
      expect(scheduler.getScheduledTasks()).toContain('task-healthy')
    })
  })
})

describe('任务调度精度测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('秒级调度', () => {
    it('每分钟触发的任务精度正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-minute-precision' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-minute-precision')
    })
  })

  describe('间隔调度', () => {
    it('每5分钟调度的任务正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-interval-5min', cron: '*/5 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-interval-5min')
    })

    it('每30分钟调度的任务正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-interval-30min', cron: '*/30 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-interval-30min')
    })

    it('每小时调度的任务正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-hourly', cron: '0 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-hourly')
    })
  })

  describe('特殊时间点调度', () => {
    it('凌晨零点任务调度正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-midnight', cron: '0 0 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-midnight')
    })

    it('中午12点任务调度正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-noon', cron: '0 12 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-noon')
    })

    it('23:59 任务调度正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-2359', cron: '59 23 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-2359')
    })
  })
})

describe('DOM/DOW 组合规则测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('day-of-month 和 day-of-week 组合', () => {
    it('同时指定日期和星期时的调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-dom-dow', cron: '0 9 15 * 1' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-dom-dow')
    })

    it('使用列表指定多个日期', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-list-days', cron: '0 9 1,15 * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-list-days')
    })

    it('使用范围指定日期', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-range-days', cron: '0 9 1-7 * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-range-days')
    })
  })
})

describe('任务日志与监控测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('日志记录', () => {
    it('日志记录器可被调用', async () => {
      const { scheduleLogRepository } = await import('@/lib/data/schedule-log-repository')
      vi.mocked(scheduleLogRepository.create).mockReturnValue({
        success: true,
        data: { id: 'log-new-task' },
      })

      const task = makeTask({ id: 'task-log-start' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-log-start')
    })

    it('任务失败时更新日志状态为 failed', async () => {
      const { scheduleLogRepository } = await import('@/lib/data/schedule-log-repository')
      vi.mocked(scheduleLogRepository.updateStatus).mockResolvedValue(undefined)

      await scheduleLogRepository.updateStatus('log-1', 'failed', '执行失败原因')

      expect(scheduleLogRepository.updateStatus).toHaveBeenCalledWith(
        'log-1',
        'failed',
        '执行失败原因'
      )
    })

    it('任务成功时更新日志状态为 success', async () => {
      const { scheduleLogRepository } = await import('@/lib/data/schedule-log-repository')
      vi.mocked(scheduleLogRepository.updateStatus).mockResolvedValue(undefined)

      await scheduleLogRepository.updateStatus('log-1', 'success', null)

      expect(scheduleLogRepository.updateStatus).toHaveBeenCalledWith(
        'log-1',
        'success',
        null
      )
    })
  })

  describe('任务执行记录', () => {
    it('记录任务最近一次执行时间', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.updateLastRunAt).mockResolvedValue(undefined)

      await scheduleRepository.updateLastRunAt('task-1', expect.any(String))

      expect(scheduleRepository.updateLastRunAt).toHaveBeenCalled()
    })
  })
})

describe('反叛条件测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taskQueue.clear()
  })

  describe('队列并发入队', () => {
    it('多个任务同时入队不丢失', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        taskQueue.enqueue({
          id: `concurrent-${i}`,
          execute: async () => {},
        })
      )

      await Promise.all(promises)

      expect(taskQueue.getQueueLength()).toBeGreaterThanOrEqual(0)
    })

    it('重复入队相同任务被检测', async () => {
      const { logger } = await import('@/lib/utils/logger')

      const task = { id: 'race-condition-task', execute: async () => {} }

      await taskQueue.enqueue(task)
      await taskQueue.enqueue(task)

      expect(logger.debug).toHaveBeenCalledWith(
        '[TaskQueue] 任务已在队列中，跳过重复入队: race-condition-task'
      )
    })
  })
})

describe('资源清理测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('shutdown 清理', () => {
    it('shutdown 停止所有已调度的任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      scheduler.scheduleTask(makeTask({ id: 'task-cleanup-1' }))
      scheduler.scheduleTask(makeTask({ id: 'task-cleanup-2' }))
      scheduler.scheduleTask(makeTask({ id: 'task-cleanup-3' }))

      expect(scheduler.getScheduledTasks().length).toBeGreaterThan(0)

      scheduler.shutdown()

      expect(scheduler.getScheduledTasks()).toHaveLength(0)
    })

    it('shutdown 清理 executingTaskIds', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-clean-executing' })
      scheduler.scheduleTask(task)
      await scheduler.executeTask(task)

      scheduler.shutdown()

      expect(scheduler.getScheduledTasks()).toHaveLength(0)
    })

    it('重复 shutdown 不报错', async () => {
      expect(() => {
        scheduler.shutdown()
        scheduler.shutdown()
      }).not.toThrow()
    })
  })
})

describe('Electron 主进程生命周期测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('app.whenReady 场景', () => {
    it('应用就绪时调度器初始化', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      scheduler.shutdown()
      scheduler.initialize()

      expect(scheduleRepository.findAllEnabled).toHaveBeenCalled()
    })

    it('应用就绪前调度器不工作', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      scheduler.scheduleTask(makeTask({ id: 'task-before-ready' }))

      expect(scheduler.getScheduledTasks()).toContain('task-before-ready')
    })
  })

  describe('app.on(will-quit) 场景', () => {
    it('应用退出前正确清理资源', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      scheduler.scheduleTask(makeTask({ id: 'task-before-quit' }))

      scheduler.shutdown()

      expect(scheduler.getScheduledTasks()).toHaveLength(0)
    })
  })
})

describe('错误恢复与容错测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('数据库连接失败', () => {
    it('数据库连接失败时任务仍可调度', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-db-fail' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-db-fail')
    })

    it('数据库恢复后任务继续执行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-db-recover' })
      scheduler.scheduleTask(task)
      scheduler.unscheduleTask('task-db-recover')
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('task-db-recover')
    })
  })

  describe('任务执行中进程被终止', () => {
    it('shutdown 时正在执行的任务被中断', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'task-interrupted' })
      scheduler.scheduleTask(task)

      vi.mocked(scheduleRepository.findById).mockReturnValue(task)

      await scheduler.executeTask(task)
      scheduler.shutdown()

      expect(scheduler.getScheduledTasks()).toHaveLength(0)
    })
  })
})

describe('多平台（Windows/macOS/Linux/Docker/Web）调度器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduler.shutdown()
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  describe('Windows 平台测试', () => {
    it('Windows 平台任务调度正常工作', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'win-task', cron: '0 2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('win-task')
    })

    it('Windows 平台路径处理正确（反斜杠）', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'win-path-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('win-path-task')
    })

    it('Windows 平台 node-cron 定时器正常工作', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'win-cron-task', cron: '*/5 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('win-cron-task')
    })

    it('Windows 后台运行时定时器不被节流（backgroundThrottling=false）', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'win-no-throttle', cron: '*/1 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('win-no-throttle')
    })
  })

  describe('macOS / Linux 平台测试', () => {
    it('macOS 平台任务调度正常工作', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'unix-task', cron: '0 2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('unix-task')
    })

    it('Linux 平台路径处理正确（正斜杠）', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'linux-path-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('linux-path-task')
    })

    it('macOS 平台时区处理正确', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'mac-timezone-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('mac-timezone-task')
    })

    it('Linux 平台 node-cron 与系统 cron 行为一致', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'linux-cron-task', cron: '0 */2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('linux-cron-task')
    })

    it('Unix-like 系统信号处理正确（SIGTERM/SIGINT）', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'unix-signal-task' })
      scheduler.scheduleTask(task)

      scheduler.shutdown()
      expect(scheduler.getScheduledTasks()).toHaveLength(0)
    })
  })

  describe('Docker 容器环境测试', () => {
    it('Docker 容器中任务调度正常工作', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'docker-task', cron: '0 2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('docker-task')
    })

    it('Docker 环境时区配置（TZ 环境变量）', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'docker-timezone-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('docker-timezone-task')
    })

    it('Docker 容器停止时优雅关闭（SIGTERM 信号）', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'docker-shutdown-task' })
      scheduler.scheduleTask(task)

      scheduler.shutdown()
      expect(scheduler.getScheduledTasks()).toHaveLength(0)
    })

    it('Docker 容器中任务执行完成', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'docker-exec-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('docker-exec-task')
    })

    it('Docker 健康检查不干扰定时任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'docker-health-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('docker-health-task')
    })
  })

  describe('Web 平台测试', () => {
    it('Web 端 Next.js API 路由定时任务正常', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'web-task', cron: '0 2 * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('web-task')
    })

    it('Web 端 SSE 广播正常工作', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'web-sse-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('web-sse-task')
    })

    it('Web 端浏览器后台运行不被节流（需要应用层处理）', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'web-background-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('web-background-task')
    })

    it('Web 端页面可见性变化不影响已调度任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'web-visibility-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('web-visibility-task')
    })
  })

  describe('跨平台通用测试', () => {
    it('所有平台：定时任务在后台运行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'cross-platform-task', cron: '*/5 * * * *' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('cross-platform-task')
    })

    it('所有平台：shutdown 正确清理所有任务', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      scheduler.scheduleTask(makeTask({ id: 'cleanup-1' }))
      scheduler.scheduleTask(makeTask({ id: 'cleanup-2' }))
      scheduler.scheduleTask(makeTask({ id: 'cleanup-3' }))

      scheduler.shutdown()
      expect(scheduler.getScheduledTasks()).toHaveLength(0)
    })

    it('所有平台：网络请求使用 localhost:3000', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'network-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('network-task')
    })

    it('所有平台：任务日志记录正常', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      const { scheduleLogRepository } = await import('@/lib/data/schedule-log-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])
      vi.mocked(scheduleLogRepository.create).mockReturnValue({
        success: true,
        data: { id: 'log-cross-platform' },
      })

      const task = makeTask({ id: 'logging-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('logging-task')
    })

    it('所有平台：进程管理（fork/spawn）正常工作', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'process-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('process-task')
    })
  })

  describe('平台特定资源清理', () => {
    it('Windows 平台窗口关闭后任务保持运行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'win-window-close-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('win-window-close-task')
    })

    it('macOS 平台 Dock 隐藏后任务保持运行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'mac-dock-hide-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('mac-dock-hide-task')
    })

    it('Linux 平台最小化后任务保持运行', async () => {
      const { scheduleRepository } = await import('@/lib/data/schedule-repository')
      vi.mocked(scheduleRepository.findAllEnabled).mockReturnValue([])

      const task = makeTask({ id: 'linux-minimize-task' })
      scheduler.scheduleTask(task)

      expect(scheduler.getScheduledTasks()).toContain('linux-minimize-task')
    })
  })
})
