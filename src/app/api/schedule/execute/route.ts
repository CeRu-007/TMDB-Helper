import { type NextRequest, NextResponse } from 'next/server'
import { scheduleRepository } from '@/lib/data/schedule-repository'
import { scheduleLogRepository } from '@/lib/data/schedule-log-repository'
import { itemsRepository } from '@/lib/database/repositories/items.repository'
import { executeScheduleTask, processScheduleTaskResult, type LogEntry } from '@/lib/scheduler/schedule-executor'
import { notifier } from '@/lib/scheduler/notifier'
import { logger } from '@/lib/utils/logger'
import { initializeDatabase } from '@/lib/database'
import { notifyDataChangeFromServer } from '@/lib/data/sse-broadcaster'

async function ensureDatabaseInitialized(): Promise<void> {
  try {
    await initializeDatabase()
  } catch (error) {
    console.error('[Schedule Execute API] 数据库初始化失败:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  const logs: LogEntry[] = []

  try {
    await ensureDatabaseInitialized()

    logger.info('[Schedule Execute] === POST 开始 ===')
    const body = await request.json()
    const { itemId } = body
    logger.info(`[Schedule Execute] 收到请求: itemId=${itemId}`)

    if (!itemId) {
      return NextResponse.json({ error: '缺少 itemId 参数' }, { status: 400 })
    }

    const task = scheduleRepository.findByItemId(itemId)
    if (!task) {
      return NextResponse.json({ error: '该词条没有配置定时任务' }, { status: 404 })
    }

    const item = itemsRepository.findByIdWithRelations(itemId)
    if (!item) {
      return NextResponse.json({ error: '词条不存在' }, { status: 404 })
    }

    const startAt = new Date().toISOString()
    const logResult = scheduleLogRepository.create({
      taskId: task.id,
      status: 'running',
      startAt,
      endAt: null,
      message: '任务开始执行',
      details: null,
    })

    if (!logResult.success || !logResult.data) {
      return NextResponse.json({ error: '创建执行日志失败' }, { status: 500 })
    }

    const logId = logResult.data.id

    try {
      let result
      try {
        result = await executeScheduleTask(item, task, logs)
      } catch (execError) {
        logger.error(`[Schedule Execute] executeScheduleTask抛出异常:`, execError)
        throw execError
      }

      const endAt = new Date().toISOString()

      if (result.success) {
        await processScheduleTaskResult(item, task, result, false)

        const updatedItem = itemsRepository.findByIdWithRelations(itemId)
        if (updatedItem) {
          notifyDataChangeFromServer({
            type: 'item_updated',
            data: updatedItem,
          })
        }

        scheduleLogRepository.updateStatus(logId, 'success', result.message, result.details || null)
        scheduleRepository.updateLastRunAt(task.id, endAt, '')

        notifier.sendSuccessNotification(item.title, result.episodeCount || 0)

        return NextResponse.json({
          success: true,
          message: result.message,
          data: { logId, episodeCount: result.episodeCount },
          logs,
        })
      } else {
        scheduleLogRepository.updateStatus(logId, 'failed', result.message)
        notifier.sendErrorNotification(item.title, result.message)
        return NextResponse.json({ success: false, error: result.message, logs }, { status: 500 })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      scheduleLogRepository.updateStatus(logId, 'failed', errorMessage)
      notifier.sendErrorNotification(item.title, errorMessage)
      logger.error(`[Schedule Execute API] 执行失败: ${task.id}`, error)
      return NextResponse.json({ success: false, error: errorMessage, logs }, { status: 500 })
    }
  } catch (error) {
    console.error('[Schedule Execute API] POST 错误:', error)
    return NextResponse.json({ success: false, error: '服务器内部错误', logs }, { status: 500 })
  }
}