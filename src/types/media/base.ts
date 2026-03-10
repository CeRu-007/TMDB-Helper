/**
 * 基础媒体类型定义
 * 用于统一 TMDBItem 和 MediaItem 的共享字段
 */

import type { ID, Status } from '../common'

// 媒体状态枚举
export enum MediaStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  UNKNOWN = 'unknown',
}

// 图片相关类型
export interface MediaImages {
  posterPath?: string
  posterUrl?: string
  backdropPath?: string
  backdropUrl?: string
  logoPath?: string
  logoUrl?: string
}

// 网络相关类型
export interface NetworkInfo {
  networkId?: number
  networkName?: string
  networkLogoUrl?: string
}

// 分集相关类型
export interface Episode {
  number: number
  completed: boolean
  seasonNumber?: number
}

export interface Season {
  seasonNumber: number
  name?: string
  totalEpisodes: number
  currentEpisode?: number
  episodes?: Episode[]
}

// 基础媒体信息 - 共享字段
export interface BaseMediaInfo extends MediaImages, NetworkInfo {
  // 标识
  id: ID
  tmdbId?: string
  imdbId?: string
  
  // 基本信息
  title: string
  originalTitle?: string
  overview?: string
  year?: number
  releaseDate?: string
  genres?: string[]
  runtime?: number
  voteAverage?: number
  
  // 状态
  status?: MediaStatus | Status | string
  completed?: boolean
  
  // 时间戳
  createdAt: string
  updatedAt: string
}

// TMDB API 响应的基础字段
export interface TMDBApiResponse {
  id: number
  name?: string
  title?: string
  original_name?: string
  original_title?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  first_air_date?: string
  release_date?: string
  vote_average?: number
  genre_ids?: number[]
  genres?: Array<{ id: number; name: string }>
  networks?: Array<{ id: number; name: string; logo_path?: string }>
  number_of_seasons?: number
  number_of_episodes?: number
  status?: string
  in_production?: boolean
}
