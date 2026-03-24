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

export interface ScheduleTask {
  id: string;
  itemId: string;
  cron: string;
  enabled: boolean;
  headless: boolean;
  incremental: boolean;
  autoImport: boolean;
  fieldCleanup: FieldCleanup;
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
  fieldCleanup: string;
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
    fieldCleanup: JSON.parse(row.fieldCleanup || '{}'),
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
    fieldCleanup: JSON.stringify(task.fieldCleanup),
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
  fieldCleanup?: FieldCleanup;
}

export interface UpdateScheduleTaskInput {
  id: string;
  cron?: string;
  enabled?: boolean;
  headless?: boolean;
  incremental?: boolean;
  autoImport?: boolean;
  fieldCleanup?: FieldCleanup;
}
