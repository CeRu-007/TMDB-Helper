"use client"

import { useState, useEffect, useCallback } from 'react'
import { ScheduledTask } from '@/lib/data/storage'
import { StorageManager } from '@/lib/data/storage'
import { taskScheduler } from '@/lib/data/task-scheduler'
import { logger } from '@/lib/utils/logger'
import { handleError } from '@/lib/utils/error-handler'
import { perf } from '@/lib/utils/performance-manager'

interface UseScheduledTasksReturn {
  runningTasks: ScheduledTask[]
  allTasks: ScheduledTask[]
  loading: boolean
  error: string | null
  refreshTasks: () => Promise<void>
  getRunningTasksCount: () => number
}

export function useScheduledTasks(): UseScheduledTasksReturn {
  const [runningTasks, setRunningTasks] = useState<ScheduledTask[]>([])
  const [allTasks, setAllTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 更新正在运行的任务
  const updateRunningTasks = useCallback(async () => {
    try {
      const tasks = await StorageManager.getScheduledTasks()
      const running = tasks.filter(task =>
        task.isRunning || taskScheduler.isTaskRunning(task.id)
      )
      setRunningTasks(running)
      setAllTasks(tasks)
    } catch (error) {
      const appError = handleError(error, { context: 'updateRunningTasks' })
      logger.error('[useScheduledTasks] 获取正在运行的任务失败', appError)
      setError(appError.userMessage)
    }
  }, [])

  // 刷新任务列表
  const refreshTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      await updateRunningTasks()
      logger.debug('[useScheduledTasks] 任务列表刷新完成')
    } catch (error) {
      const appError = handleError(error, { context: 'refreshTasks' })
      logger.error('[useScheduledTasks] 刷新任务列表失败', appError)
      setError(appError.userMessage)
    } finally {
      setLoading(false)
    }
  }, [updateRunningTasks])

  // 获取正在运行的任务数量
  const getRunningTasksCount = useCallback(() => {
    return runningTasks.length
  }, [runningTasks])

  // 初始化和定期更新
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 初始加载
    refreshTasks()

    // 减少轮询频率：每2分钟检查一次正在运行的任务（而不是30秒）
    const intervalId = perf.setInterval(() => {
      updateRunningTasks()
    }, 120000, 'scheduledTasksUpdate')

    // 自动修复定时任务 - 延迟到10秒后执行，避免启动时的频繁调用
    const fixTimeoutId = perf.setTimeout(async () => {
      try {
        logger.info('[useScheduledTasks] 开始自动修复定时任务')
        await StorageManager.fixScheduledTaskAssociations()
        await updateRunningTasks()
        logger.info('[useScheduledTasks] 定时任务自动修复完成')
      } catch (error) {
        logger.error('[useScheduledTasks] 自动修复定时任务失败', error)
      }
    }, 10000)

    return () => {
      perf.cleanup(intervalId)
      perf.cleanup(fixTimeoutId)
    }
  }, [refreshTasks, updateRunningTasks])

  return {
    runningTasks,
    allTasks,
    loading,
    error,
    refreshTasks,
    getRunningTasksCount
  }
}