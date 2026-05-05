/**
 * 数据库类型定义
 * 所有字段使用 camelCase 命名，与数据库 Schema 保持一致
 */

import type { TMDBItem } from '@/types/tmdb-item';

// 数据库行类型 - camelCase
export interface ItemRow {
  id: string;
  tmdbId: string | null;
  imdbId: string | null;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  year: number | null;
  releaseDate: string | null;
  genres: string | null; // JSON数组
  runtime: number | null;
  voteAverage: number | null;
  mediaType: string;
  posterPath: string | null;
  posterUrl: string | null;
  backdropPath: string | null;
  backdropUrl: string | null;
  logoPath: string | null;
  logoUrl: string | null;
  networkId: number | null;
  networkName: string | null;
  networkLogoUrl: string | null;
  status: string | null;
  completed: number;
  platformUrl: string | null;
  totalEpisodes: number | null;
  manuallySetEpisodes: number;
  weekday: number | null;
  secondWeekday: number | null;
  airTime: string | null;
  category: string | null;
  tmdbUrl: string | null;
  notes: string | null;
  isDailyUpdate: number;
  blurIntensity: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SeasonRow {
  id: number;
  itemId: string;
  seasonNumber: number;
  name: string | null;
  totalEpisodes: number;
  currentEpisode: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EpisodeRow {
  id: number;
  itemId: string;
  seasonId: number | null;
  seasonNumber: number | null;
  number: number;
  completed: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatHistoryRow {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MessageRow {
  id: string;
  chatId: string;
  role: string;
  content: string;
  timestamp: string;
  type: string;
  fileName: string | null;
  fileContent: string | null;
  isStreaming: number;
  suggestions: string | null; // JSON
  rating: string | null;
  isEdited: number;
  canContinue: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserRow {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  sessionExpiryDays: number;
  avatarUrl: string | null;
  loginCount: number;
  totalUsageTime: number;
  deletedAt: string | null;
}

export interface ConfigRow {
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageCacheRow {
  id: number;
  tmdbId: string;
  itemId: string | null;
  imageType: 'poster' | 'backdrop' | 'logo' | 'network_logo';
  imagePath: string | null;
  imageUrl: string | null;
  sizeType: string;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string | null;
  isPermanent: number;
  sourceType: string;
}

// 图片缓存数据类型（用于业务逻辑）
export interface ImageCacheData {
  id?: number;
  tmdbId: string;
  itemId?: string;
  imageType: 'poster' | 'backdrop' | 'logo' | 'network_logo';
  imagePath?: string;
  imageUrl?: string;
  sizeType?: 'w500' | 'w780' | 'w1280' | 'original';
  createdAt?: string;
  updatedAt?: string;
  lastVerifiedAt?: string;
  isPermanent?: boolean;
  sourceType?: 'tmdb' | 'user_upload';
}

// 转换函数类型
export type ItemWithRelations = ItemRow & {
  seasons?: (SeasonRow & { episodes?: EpisodeRow[] })[];
  episodes?: EpisodeRow[];
};

// 数据库操作结果类型
export interface DatabaseResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// 导出数据格式（与现有格式兼容）
export interface ExportData {
  items: TMDBItem[];
  version: string;
  exportDate: string;
}

// 迁移状态
export interface MigrationStatus {
  migrated: boolean;
  itemCount: number;
  error?: string;
}

// 帮助函数：将 TMDBItem 转换为数据库行
export function tmdbItemToRow(item: TMDBItem, timestamps?: { createdAt?: string; updatedAt?: string }): ItemRow {
  const now = new Date().toISOString();
  return {
    id: item.id,
    tmdbId: item.tmdbId ?? null,
    imdbId: item.imdbId ?? null,
    title: item.title,
    originalTitle: item.originalTitle ?? null,
    overview: item.overview ?? null,
    year: item.year ?? null,
    releaseDate: item.releaseDate ?? null,
    genres: item.genres ? JSON.stringify(item.genres) : null,
    runtime: item.runtime ?? null,
    voteAverage: item.voteAverage ?? null,
    mediaType: item.mediaType ?? 'tv',
    posterPath: item.posterPath ?? null,
    posterUrl: item.posterUrl ?? null,
    backdropPath: item.backdropPath ?? null,
    backdropUrl: item.backdropUrl ?? null,
    logoPath: item.logoPath ?? null,
    logoUrl: item.logoUrl ?? null,
    networkId: item.networkId ?? null,
    networkName: item.networkName ?? null,
    networkLogoUrl: item.networkLogoUrl ?? null,
    status: item.status ?? null,
    completed: item.completed ? 1 : 0,
    platformUrl: item.platformUrl ?? null,
    totalEpisodes: item.totalEpisodes ?? null,
    manuallySetEpisodes: item.manuallySetEpisodes ? 1 : 0,
    weekday: item.weekday ?? null,
    secondWeekday: item.secondWeekday ?? null,
    airTime: item.airTime ?? null,
    category: item.category ?? null,
    tmdbUrl: item.tmdbUrl ?? null,
    notes: item.notes ?? null,
    isDailyUpdate: item.isDailyUpdate ? 1 : 0,
    blurIntensity: item.blurIntensity ?? null,
    rating: item.rating ?? null,
    createdAt: timestamps?.createdAt ?? item.createdAt ?? now,
    updatedAt: timestamps?.updatedAt ?? item.updatedAt ?? now,
    deletedAt: null,
  };
}

// 帮助函数：将数据库行转换为 TMDBItem
export function rowToTMDBItem(
  row: ItemRow,
  seasons?: (SeasonRow & { episodes?: EpisodeRow[] })[],
  episodes?: EpisodeRow[],
): TMDBItem {
  const item: TMDBItem = {
    id: row.id,
    tmdbId: row.tmdbId ?? undefined,
    imdbId: row.imdbId ?? undefined,
    title: row.title,
    originalTitle: row.originalTitle ?? undefined,
    overview: row.overview ?? undefined,
    year: row.year ?? undefined,
    releaseDate: row.releaseDate ?? undefined,
    genres: row.genres ? JSON.parse(row.genres) : undefined,
    runtime: row.runtime ?? undefined,
    voteAverage: row.voteAverage ?? undefined,
    mediaType: row.mediaType as 'tv',
    posterPath: row.posterPath ?? undefined,
    posterUrl: row.posterUrl ?? undefined,
    backdropPath: row.backdropPath ?? undefined,
    backdropUrl: row.backdropUrl ?? undefined,
    logoPath: row.logoPath ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
    networkId: row.networkId ?? undefined,
    networkName: row.networkName ?? undefined,
    networkLogoUrl: row.networkLogoUrl ?? undefined,
    status: (row.status && row.status !== 'ongoing' && row.status !== 'completed') ? 'ongoing' : (row.status ?? undefined),
    completed: row.completed === 1,
    platformUrl: row.platformUrl ?? undefined,
    totalEpisodes: row.totalEpisodes ?? undefined,
    manuallySetEpisodes: row.manuallySetEpisodes === 1,
    weekday: row.weekday ?? undefined,
    secondWeekday: row.secondWeekday ?? undefined,
    airTime: row.airTime ?? undefined,
    category: row.category ?? undefined,
    tmdbUrl: row.tmdbUrl ?? undefined,
    notes: row.notes ?? undefined,
    isDailyUpdate: row.isDailyUpdate === 1,
    blurIntensity: row.blurIntensity as 'light' | 'medium' | 'heavy' | undefined,
    rating: row.rating ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  // 添加季和分集信息
  if (seasons && seasons.length > 0) {
    item.seasons = seasons.map((s) => ({
      seasonNumber: s.seasonNumber,
      name: s.name ?? undefined,
      totalEpisodes: s.totalEpisodes,
      currentEpisode: s.currentEpisode ?? undefined,
      episodes: s.episodes?.map((e) => ({
        number: e.number,
        completed: e.completed === 1,
        seasonNumber: e.seasonNumber ?? undefined,
      })),
    }));
  }

  // 添加独立分集信息（兼容旧数据）
  if (episodes && episodes.length > 0) {
    item.episodes = episodes.map((e) => ({
      number: e.number,
      completed: e.completed === 1,
      seasonNumber: e.seasonNumber ?? undefined,
    }));
  }

  return item;
}