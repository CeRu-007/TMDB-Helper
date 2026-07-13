/**
 * 定时任务类型定义
 */

export interface FieldCleanup {
  name: boolean;
  air_date: boolean;
  runtime: boolean;
  overview: boolean;
  backdrop: boolean;
}

export interface PlatformSourceConfig {
  url: string;
  enabled: boolean;
  keepFields: FieldCleanup;
}

export interface ScheduleTask {
  id: string;
  itemId: string;
  cron: string;
  enabled: boolean;
  headless: boolean;
  incremental: boolean;
  autoImport: boolean;
  tmdbSeason: number;
  tmdbLanguage: string;
  tmdbAutoResponse: string;
  fieldCleanup: FieldCleanup;
  checkMetadataCompleteness: boolean;
  cleanFakeTitles: boolean;
  platformUrl?: string | undefined;
  platformConfigs?: PlatformSourceConfig[] | undefined;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleTaskRow {
  id: string;
  itemId: string;
  cron: string;
  enabled: number;
  headless: number;
  incremental: number;
  autoImport: number;
  tmdbSeason: number;
  tmdbLanguage: string;
  tmdbAutoResponse: string;
  fieldCleanup: string;
  checkMetadataCompleteness: number;
  cleanFakeTitles: number;
  platformUrl: string | null;
  platformConfigs: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleLog {
  id: string;
  taskId: string;
  status: 'running' | 'success' | 'failed';
  startAt: string;
  endAt: string | null;
  message: string;
  details: string | null;
}

export interface ScheduleLogRow {
  id: string;
  taskId: string;
  status: 'running' | 'success' | 'failed';
  startAt: string;
  endAt: string | null;
  message: string;
  details: string | null;
}

export function scheduleTaskRowToScheduleTask(row: ScheduleTaskRow): ScheduleTask {
  return {
    id: row.id,
    itemId: row.itemId,
    cron: row.cron,
    enabled: row.enabled === 1,
    headless: row.headless === 1,
    incremental: row.incremental === 1,
    autoImport: row.autoImport === 1,
    tmdbSeason: row.tmdbSeason || 1,
    tmdbLanguage: row.tmdbLanguage || 'zh-CN',
    tmdbAutoResponse: row.tmdbAutoResponse || 'w',
    fieldCleanup: JSON.parse(row.fieldCleanup || '{}'),
    checkMetadataCompleteness: row.checkMetadataCompleteness === 1,
    cleanFakeTitles: row.cleanFakeTitles === 1,
    platformUrl: row.platformUrl ?? undefined,
    platformConfigs: row.platformConfigs ? JSON.parse(row.platformConfigs) : undefined,
    lastRunAt: row.lastRunAt,
    nextRunAt: row.nextRunAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function scheduleTaskToRow(task: ScheduleTask): ScheduleTaskRow {
  return {
    id: task.id,
    itemId: task.itemId,
    cron: task.cron,
    enabled: task.enabled ? 1 : 0,
    headless: task.headless ? 1 : 0,
    incremental: task.incremental ? 1 : 0,
    autoImport: task.autoImport ? 1 : 0,
    tmdbSeason: task.tmdbSeason || 1,
    tmdbLanguage: task.tmdbLanguage || 'zh-CN',
    tmdbAutoResponse: task.tmdbAutoResponse || 'w',
    fieldCleanup: JSON.stringify(task.fieldCleanup),
    checkMetadataCompleteness: task.checkMetadataCompleteness ? 1 : 0,
    cleanFakeTitles: task.cleanFakeTitles ? 1 : 0,
    platformUrl: task.platformUrl ?? null,
    platformConfigs: task.platformConfigs ? JSON.stringify(task.platformConfigs) : null,
    lastRunAt: task.lastRunAt,
    nextRunAt: task.nextRunAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export function scheduleLogRowToScheduleLog(row: ScheduleLogRow): ScheduleLog {
  return {
    id: row.id,
    taskId: row.taskId,
    status: row.status,
    startAt: row.startAt,
    endAt: row.endAt,
    message: row.message,
    details: row.details,
  };
}

export interface CreateScheduleTaskInput {
  itemId: string;
  cron: string;
  enabled?: boolean;
  headless?: boolean;
  incremental?: boolean;
  autoImport?: boolean;
  tmdbSeason?: number;
  tmdbLanguage?: string;
  tmdbAutoResponse?: string;
  fieldCleanup?: FieldCleanup;
  checkMetadataCompleteness?: boolean;
  cleanFakeTitles?: boolean;
  platformUrl?: string;
  platformConfigs?: PlatformSourceConfig[];
}

export interface UpdateScheduleTaskInput {
  id: string;
  cron?: string;
  enabled?: boolean;
  headless?: boolean;
  incremental?: boolean;
  autoImport?: boolean;
  tmdbSeason?: number;
  tmdbLanguage?: string;
  tmdbAutoResponse?: string;
  fieldCleanup?: FieldCleanup;
  checkMetadataCompleteness?: boolean;
  cleanFakeTitles?: boolean;
  platformUrl?: string;
  platformConfigs?: PlatformSourceConfig[];
}
