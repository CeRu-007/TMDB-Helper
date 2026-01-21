/**
 * 数据验证工具
 * 提供运行时类型检查和数据验证
 */

import { z } from 'zod'
import { log } from './logger'

// TMDB项目验证模式
export const TMDBItemSchema = z.object({
  id: z.string().min(1, '项目ID不能为空'),
  title: z.string().min(1, '标题不能为空'),
  originalTitle: z.string().optional(),
  mediaType: z.enum(['tv'], {
    errorMap: () => ({ message: '媒体类型必须是 tv' })
  }),
  tmdbId: z.string().optional(),
  tmdbUrl: z.string().url().optional().or(z.literal('')),
  posterUrl: z.string().url().optional().or(z.literal('')),
  posterPath: z.string().optional(),
  backdropUrl: z.string().url().optional().or(z.literal('')),
  backdropPath: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  networkId: z.number().optional(),
  networkName: z.string().optional(),
  networkLogoUrl: z.string().url().optional().or(z.literal('')),
  overview: z.string().optional(),
  voteAverage: z.number().min(0).max(10).optional(),
  weekday: z.number().min(0).max(6, '星期几必须在0-6之间'),
  secondWeekday: z.number().min(0).max(6).optional(),
  airTime: z.string().regex(/^\d{2}:\d{2}$/, '播出时间格式应为 HH:MM').optional(),
  isDailyUpdate: z.boolean().optional(),
  totalEpisodes: z.number().min(0).optional(),
  manuallySetEpisodes: z.boolean().optional(),
  completed: z.boolean(),
  status: z.enum(['ongoing', 'completed']),
  platformUrl: z.string().url().optional().or(z.literal('')),
  maintenanceCode: z.string().optional(),
  notes: z.string().optional(),
  category: z.enum(['anime', 'tv', 'kids', 'variety', 'short']).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  seasons: z.array(z.object({
    seasonNumber: z.number().min(1),
    name: z.string(),
    totalEpisodes: z.number().min(0),
    episodes: z.array(z.object({
      number: z.number().min(1),
      completed: z.boolean(),
      seasonNumber: z.number().min(1).optional()
    })),
    posterUrl: z.string().url().optional().or(z.literal(''))
  })).optional(),
  episodes: z.array(z.object({
    number: z.number().min(1),
    completed: z.boolean(),
    seasonNumber: z.number().min(1).optional()
  })).optional()
})

// 定时任务验证模式
export const ScheduledTaskSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  itemTitle: z.string().min(1),
  itemTmdbId: z.string().optional(),
  name: z.string().min(1, '任务名称不能为空'),
  type: z.literal('tmdb-import'),
  schedule: z.object({
    type: z.enum(['weekly', 'daily']),
    dayOfWeek: z.number().min(0).max(6).optional(),
    secondDayOfWeek: z.number().min(0).max(6).optional(),
    hour: z.number().min(0).max(23, '小时必须在0-23之间'),
    minute: z.number().min(0).max(59, '分钟必须在0-59之间')
  }),
  action: z.object({
    seasonNumber: z.number().min(1),
    autoUpload: z.boolean(),
    conflictAction: z.enum(['w', 'y', 'n']),
    autoRemoveMarked: z.boolean(),
    autoConfirm: z.boolean().optional(),
    removeAirDateColumn: z.boolean().optional(),
    removeRuntimeColumn: z.boolean().optional(),
    removeBackdropColumn: z.boolean().optional(),
    autoMarkUploaded: z.boolean().optional(),
    enableYoukuSpecialHandling: z.boolean().optional(),
    enableTitleCleaning: z.boolean().optional(),
    autoDeleteWhenCompleted: z.boolean().optional()
  }),
  enabled: z.boolean(),
  lastRun: z.string().datetime().optional(),
  nextRun: z.string().datetime().optional(),
  lastRunStatus: z.enum(['success', 'failed', 'user_interrupted']).optional(),
  lastRunError: z.string().optional(),
  currentStep: z.string().optional(),
  executionProgress: z.number().min(0).max(100).optional(),
  isRunning: z.boolean().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// 导入数据验证模式
export const ImportDataSchema = z.object({
  items: z.array(TMDBItemSchema),
  scheduledTasks: z.array(ScheduledTaskSchema).optional(),
  version: z.string().optional(),
  exportedAt: z.string().datetime().optional()
})

// 验证工具类
export class DataValidator {
  /**
   * 验证TMDB项目数据
   */
  static validateTMDBItem(data: unknown): { success: boolean; data?: unknown; errors?: string[] } {
    try {
      const validated = TMDBItemSchema.parse(data)
      log.debug('DataValidator', 'TMDB项目验证成功')
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        log.warn('DataValidator', 'TMDB项目验证失败', { errors })
        return { success: false, errors }
      }
      log.error('DataValidator', 'TMDB项目验证异常', error)
      return { success: false, errors: ['验证过程中发生未知错误'] }
    }
  }

  /**
   * 验证定时任务数据
   */
  static validateScheduledTask(data: unknown): { success: boolean; data?: unknown; errors?: string[] } {
    try {
      const validated = ScheduledTaskSchema.parse(data)
      log.debug('DataValidator', '定时任务验证成功')
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        log.warn('DataValidator', '定时任务验证失败', { errors })
        return { success: false, errors }
      }
      log.error('DataValidator', '定时任务验证异常', error)
      return { success: false, errors: ['验证过程中发生未知错误'] }
    }
  }

  /**
   * 验证导入数据
   */
  static validateImportData(data: unknown): { success: boolean; data?: unknown; errors?: string[] } {
    try {
      const validated = ImportDataSchema.parse(data)
      log.info('DataValidator', '导入数据验证成功', { 
        itemCount: validated.items.length,
        taskCount: validated.scheduledTasks?.length || 0
      })
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        log.warn('DataValidator', '导入数据验证失败', { errors })
        return { success: false, errors }
      }
      log.error('DataValidator', '导入数据验证异常', error)
      return { success: false, errors: ['验证过程中发生未知错误'] }
    }
  }

  /**
   * 批量验证TMDB项目
   */
  static validateTMDBItems(items: unknown[]): { 
    validItems: unknown[]
    invalidItems: Array<{ index: number; errors: string[] }>
    summary: { total: number; valid: number; invalid: number }
  } {
    const validItems: unknown[] = []
    const invalidItems: Array<{ index: number; errors: string[] }> = []

    items.forEach((item, index) => {
      const result = this.validateTMDBItem(item)
      if (result.success && result.data) {
        validItems.push(result.data)
      } else {
        invalidItems.push({
          index,
          errors: result.errors || ['未知验证错误']
        })
      }
    })

    const summary = {
      total: items.length,
      valid: validItems.length,
      invalid: invalidItems.length
    }

    log.info('DataValidator', '批量验证完成', summary)
    return { validItems, invalidItems, summary }
  }

  /**
   * 清理和标准化数据
   */
  static sanitizeTMDBItem(data: unknown): unknown {
    // 清理空字符串为undefined
    const cleaned = { ...data }
    
    const urlFields = ['tmdbUrl', 'posterUrl', 'backdropUrl', 'logoUrl', 'networkLogoUrl', 'platformUrl']
    urlFields.forEach(field => {
      if (cleaned[field] === '') {
        cleaned[field] = undefined
      }
    })

    // 确保日期格式正确
    if (cleaned.createdAt && !cleaned.createdAt.includes('T')) {
      cleaned.createdAt = new Date(cleaned.createdAt).toISOString()
    }
    if (cleaned.updatedAt && !cleaned.updatedAt.includes('T')) {
      cleaned.updatedAt = new Date(cleaned.updatedAt).toISOString()
    }

    // 确保数字类型正确
    if (typeof cleaned.weekday === 'string') {
      cleaned.weekday = parseInt(cleaned.weekday, 10)
    }
    if (typeof cleaned.secondWeekday === 'string') {
      cleaned.secondWeekday = parseInt(cleaned.secondWeekday, 10)
    }

    return cleaned
  }
}

// 导出类型
export type TMDBItemType = z.infer<typeof TMDBItemSchema>
export type ScheduledTaskType = z.infer<typeof ScheduledTaskSchema>
export type ImportDataType = z.infer<typeof ImportDataSchema>