/**
 * Zod Schemas for Media Types
 * 提供运行时类型验证和类型推导
 */

import { z } from 'zod'

// 基础字段 schema
export const EpisodeSchema = z.object({
  number: z.number().int().positive(),
  completed: z.boolean().default(false),
  seasonNumber: z.number().int().positive().optional(),
})

export const SeasonSchema = z.object({
  seasonNumber: z.number().int().positive(),
  name: z.string().optional(),
  totalEpisodes: z.number().int().nonnegative(),
  currentEpisode: z.number().int().nonnegative().optional(),
  episodes: z.array(EpisodeSchema).optional(),
})

// 媒体状态枚举
export const MediaStatusSchema = z.enum(['ongoing', 'completed', 'cancelled', 'unknown'])

// 模糊强度枚举
export const BlurIntensitySchema = z.enum(['light', 'medium', 'heavy'])

// TMDBItem Schema - 核心业务类型
export const TMDBItemSchema = z.object({
  // 标识
  id: z.string().min(1),
  tmdbId: z.string().optional(),
  imdbId: z.string().optional(),
  
  // 基本信息
  title: z.string().min(1),
  originalTitle: z.string().optional(),
  overview: z.string().optional(),
  year: z.number().int().positive().optional(),
  releaseDate: z.string().optional(),
  genres: z.array(z.string()).optional(),
  runtime: z.number().int().positive().optional(),
  voteAverage: z.number().min(0).max(10).optional(),
  
  // 媒体类型（固定为 tv）
  mediaType: z.literal('tv'),
  
  // 图片
  posterUrl: z.string().url().optional(),
  posterPath: z.string().optional(),
  backdropPath: z.string().optional(),
  backdropUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  logoPath: z.string().optional(),
  
  // 网络
  networkId: z.number().int().positive().optional(),
  networkName: z.string().optional(),
  networkLogoUrl: z.string().url().optional(),
  
  // 状态
  status: z.union([MediaStatusSchema, z.string()]).optional(),
  completed: z.boolean().optional(),
  
  // 分集信息
  totalEpisodes: z.number().int().nonnegative().optional(),
  manuallySetEpisodes: z.boolean().optional(),
  episodes: z.array(EpisodeSchema).optional(),
  seasons: z.array(SeasonSchema).optional(),
  
  // 日程相关
  weekday: z.number().int().min(0).max(6).optional(),
  secondWeekday: z.number().int().min(0).max(6).optional(),
  airTime: z.string().optional(),
  category: z.string().optional(),
  tmdbUrl: z.string().url().optional(),
  notes: z.string().optional(),
  isDailyUpdate: z.boolean().optional(),
  
  // 显示设置
  blurIntensity: BlurIntensitySchema.optional(),
  rating: z.number().min(0).max(10).optional(),
  
  // 业务相关
  platformUrl: z.string().url().optional(),
  
  // 时间戳
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// TMDBItem 数组 Schema
export const TMDBItemArraySchema = z.array(TMDBItemSchema)

// 类型推导
export type EpisodeType = z.infer<typeof EpisodeSchema>
export type SeasonType = z.infer<typeof SeasonSchema>
export type TMDBItemType = z.infer<typeof TMDBItemSchema>

// 验证函数
export function validateTMDBItem(data: unknown): { success: boolean; data?: TMDBItemType; errors?: z.ZodError } {
  const result = TMDBItemSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

export function validateTMDBItems(data: unknown): { success: boolean; data?: TMDBItemType[]; errors?: z.ZodError } {
  const result = TMDBItemArraySchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

// 部分更新 Schema（用于 PATCH 操作）
export const TMDBItemUpdateSchema = TMDBItemSchema.partial().required({ id: true })

export type TMDBItemUpdateType = z.infer<typeof TMDBItemUpdateSchema>
