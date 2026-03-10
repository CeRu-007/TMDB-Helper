/**
 * 数据库类型定义
 */

import type { TMDBItem } from '@/types/tmdb-item';
import type { Episode, Season } from '@/types/media/base';
import type { ScheduledTask, ExecutionLog } from '@/lib/data/storage/types';

// 数据库行类型
export interface ItemRow {
  id: string;
  tmdb_id: string | null;
  imdb_id: string | null;
  title: string;
  original_title: string | null;
  overview: string | null;
  year: number | null;
  release_date: string | null;
  genres: string | null; // JSON数组
  runtime: number | null;
  vote_average: number | null;
  media_type: string;
  poster_path: string | null;
  poster_url: string | null;
  backdrop_path: string | null;
  backdrop_url: string | null;
  logo_path: string | null;
  logo_url: string | null;
  network_id: number | null;
  network_name: string | null;
  network_logo_url: string | null;
  status: string | null;
  completed: number;
  platform_url: string | null;
  total_episodes: number | null;
  manually_set_episodes: number;
  weekday: number | null;
  second_weekday: number | null;
  air_time: string | null;
  category: string | null;
  tmdb_url: string | null;
  notes: string | null;
  is_daily_update: number;
  blur_intensity: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface SeasonRow {
  id: number;
  item_id: string;
  season_number: number;
  name: string | null;
  total_episodes: number;
  current_episode: number | null;
}

export interface EpisodeRow {
  id: number;
  item_id: string;
  season_id: number | null;
  season_number: number | null;
  number: number;
  completed: number;
}

export interface ScheduledTaskRow {
  id: string;
  item_id: string;
  item_title: string;
  item_tmdb_id: string | null;
  name: string;
  type: string;
  schedule_type: string;
  day_of_week: number | null;
  second_day_of_week: number | null;
  hour: number;
  minute: number;
  action_config: string; // JSON
  enabled: number;
  last_run: string | null;
  next_run: string | null;
  last_run_status: string | null;
  last_run_error: string | null;
  current_step: string | null;
  execution_progress: number | null;
  is_running: number;
  created_at: string;
  updated_at: string;
}

export interface ExecutionLogRow {
  id: string;
  task_id: string;
  timestamp: string;
  step: string | null;
  message: string | null;
  level: string;
  details: string | null; // JSON
}

export interface ChatHistoryRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  timestamp: string;
  type: string;
  file_name: string | null;
  file_content: string | null;
  is_streaming: number;
  suggestions: string | null; // JSON
  rating: string | null;
  is_edited: number;
  can_continue: number;
}

export interface AdminUserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
  last_login_at: string | null;
  session_expiry_days: number;
}

export interface ConfigRow {
  key: string;
  value: string;
  updated_at: string;
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
  tasks: ScheduledTask[];
  version: string;
  exportDate: string;
}

// 迁移状态
export interface MigrationStatus {
  migrated: boolean;
  itemCount: number;
  taskCount: number;
  error?: string;
}

// 帮助函数：将 TMDBItem 转换为数据库行
export function tmdbItemToRow(item: TMDBItem): ItemRow {
  return {
    id: item.id,
    tmdb_id: item.tmdbId ?? null,
    imdb_id: item.imdbId ?? null,
    title: item.title,
    original_title: item.originalTitle ?? null,
    overview: item.overview ?? null,
    year: item.year ?? null,
    release_date: item.releaseDate ?? null,
    genres: item.genres ? JSON.stringify(item.genres) : null,
    runtime: item.runtime ?? null,
    vote_average: item.voteAverage ?? null,
    media_type: item.mediaType ?? 'tv',
    poster_path: item.posterPath ?? null,
    poster_url: item.posterUrl ?? null,
    backdrop_path: item.backdropPath ?? null,
    backdrop_url: item.backdropUrl ?? null,
    logo_path: item.logoPath ?? null,
    logo_url: item.logoUrl ?? null,
    network_id: item.networkId ?? null,
    network_name: item.networkName ?? null,
    network_logo_url: item.networkLogoUrl ?? null,
    status: item.status ?? null,
    completed: item.completed ? 1 : 0,
    platform_url: item.platformUrl ?? null,
    total_episodes: item.totalEpisodes ?? null,
    manually_set_episodes: item.manuallySetEpisodes ? 1 : 0,
    weekday: item.weekday ?? null,
    second_weekday: item.secondWeekday ?? null,
    air_time: item.airTime ?? null,
    category: item.category ?? null,
    tmdb_url: item.tmdbUrl ?? null,
    notes: item.notes ?? null,
    is_daily_update: item.isDailyUpdate ? 1 : 0,
    blur_intensity: item.blurIntensity ?? null,
    rating: item.rating ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
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
    tmdbId: row.tmdb_id ?? undefined,
    imdbId: row.imdb_id ?? undefined,
    title: row.title,
    originalTitle: row.original_title ?? undefined,
    overview: row.overview ?? undefined,
    year: row.year ?? undefined,
    releaseDate: row.release_date ?? undefined,
    genres: row.genres ? JSON.parse(row.genres) : undefined,
    runtime: row.runtime ?? undefined,
    voteAverage: row.vote_average ?? undefined,
    mediaType: row.media_type as 'tv',
    posterPath: row.poster_path ?? undefined,
    posterUrl: row.poster_url ?? undefined,
    backdropPath: row.backdrop_path ?? undefined,
    backdropUrl: row.backdrop_url ?? undefined,
    logoPath: row.logo_path ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    networkId: row.network_id ?? undefined,
    networkName: row.network_name ?? undefined,
    networkLogoUrl: row.network_logo_url ?? undefined,
    status: row.status ?? undefined,
    completed: row.completed === 1,
    platformUrl: row.platform_url ?? undefined,
    totalEpisodes: row.total_episodes ?? undefined,
    manuallySetEpisodes: row.manually_set_episodes === 1,
    weekday: row.weekday ?? undefined,
    secondWeekday: row.second_weekday ?? undefined,
    airTime: row.air_time ?? undefined,
    category: row.category ?? undefined,
    tmdbUrl: row.tmdb_url ?? undefined,
    notes: row.notes ?? undefined,
    isDailyUpdate: row.is_daily_update === 1,
    blurIntensity: row.blur_intensity as 'light' | 'medium' | 'heavy' | undefined,
    rating: row.rating ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // 添加季和分集信息
  if (seasons && seasons.length > 0) {
    item.seasons = seasons.map((s) => ({
      seasonNumber: s.season_number,
      name: s.name ?? undefined,
      totalEpisodes: s.total_episodes,
      currentEpisode: s.current_episode ?? undefined,
      episodes: s.episodes?.map((e) => ({
        number: e.number,
        completed: e.completed === 1,
        seasonNumber: e.season_number ?? undefined,
      })),
    }));
  }

  // 添加独立分集信息（兼容旧数据）
  if (episodes && episodes.length > 0) {
    item.episodes = episodes.map((e) => ({
      number: e.number,
      completed: e.completed === 1,
      seasonNumber: e.season_number ?? undefined,
    }));
  }

  return item;
}

// 帮助函数：将 ScheduledTask 转换为数据库行
export function scheduledTaskToRow(task: ScheduledTask): ScheduledTaskRow {
  return {
    id: task.id,
    item_id: task.itemId,
    item_title: task.itemTitle,
    item_tmdb_id: task.itemTmdbId ?? null,
    name: task.name,
    type: task.type,
    schedule_type: task.schedule.type,
    day_of_week: task.schedule.dayOfWeek ?? null,
    second_day_of_week: task.schedule.secondDayOfWeek ?? null,
    hour: task.schedule.hour,
    minute: task.schedule.minute,
    action_config: JSON.stringify(task.action),
    enabled: task.enabled ? 1 : 0,
    last_run: task.lastRun ?? null,
    next_run: task.nextRun ?? null,
    last_run_status: task.lastRunStatus ?? null,
    last_run_error: task.lastRunError ?? null,
    current_step: task.currentStep ?? null,
    execution_progress: task.executionProgress ?? null,
    is_running: task.isRunning ? 1 : 0,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

// 帮助函数：将数据库行转换为 ScheduledTask
export function rowToScheduledTask(row: ScheduledTaskRow): ScheduledTask {
  return {
    id: row.id,
    itemId: row.item_id,
    itemTitle: row.item_title,
    itemTmdbId: row.item_tmdb_id ?? undefined,
    name: row.name,
    type: row.type as 'tmdb-import',
    schedule: {
      type: row.schedule_type as 'weekly' | 'daily',
      dayOfWeek: row.day_of_week ?? undefined,
      secondDayOfWeek: row.second_day_of_week ?? undefined,
      hour: row.hour,
      minute: row.minute,
    },
    action: JSON.parse(row.action_config),
    enabled: row.enabled === 1,
    lastRun: row.last_run ?? undefined,
    nextRun: row.next_run ?? undefined,
    lastRunStatus: row.last_run_status as 'success' | 'failed' | 'user_interrupted' | undefined,
    lastRunError: row.last_run_error,
    currentStep: row.current_step ?? undefined,
    executionProgress: row.execution_progress ?? undefined,
    isRunning: row.is_running === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
