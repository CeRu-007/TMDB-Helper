/**
 * Task Scheduler Types
 * 集中管理调度器相关的类型定义
 */

import { ScheduledTask, TMDBItem } from '../storage';

/**
 * 项目关联策略枚举
 */
export enum RelatedItemStrategy {
  /** 直接通过ID匹配 */
  DirectId = 'direct_id',
  /** 通过TMDB ID匹配 */
  TmdbId = 'tmdb_id',
  /** 通过标题精确匹配 */
  TitleExact = 'title_exact',
  /** 通过标题模糊匹配 */
  TitleFuzzy = 'title_fuzzy',
  /** 应急修复策略 */
  EmergencyFix = 'emergency_fix',
  /** 任务名称解析匹配 */
  TaskNameMatch = 'task_name_match',
  /** 完全备用策略 */
  Fallback = 'fallback',
}

/**
 * 项目关联结果
 */
export interface RelatedItemResult {
  /** 关联的项目 */
  item: TMDBItem | null;
  /** 使用的策略 */
  strategy: RelatedItemStrategy;
  /** 是否成功 */
  success: boolean;
  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * 任务重新关联结果
 */
export interface RelinkTaskResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message?: string;
  /** 新的项目ID */
  newItemId?: string;
}

/**
 * 完结项目检查结果
 */
export interface CompletedProjectCheckResult {
  /** 项目是否已完结 */
  isCompleted: boolean;
  /** 是否需要删除任务 */
  shouldDeleteTask: boolean;
  /** 消息 */
  message?: string;
}

/**
 * 定时器验证结果
 */
export interface TimerValidationResult {
  /** 定时器ID */
  taskId: string;
  /** 是否有效 */
  isValid: boolean;
  /** 预定执行时间 */
  scheduledTime?: Date;
  /** 当前时间 */
  currentTime?: Date;
  /** 时间差（毫秒） */
  timeDiff?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 错过任务检查结果
 */
export interface MissedTaskCheckResult {
  /** 任务ID */
  taskId: string;
  /** 任务名称 */
  taskName: string;
  /** 预定执行时间 */
  scheduledTime: Date;
  /** 当前时间 */
  currentTime: Date;
  /** 时间差（毫秒） */
  timeDiff: number;
  /** 是否需要补偿执行 */
  shouldExecute: boolean;
  /** 是否错过时间过长 */
  isTooLate: boolean;
}

/**
 * 定期任务状态
 */
export interface PeriodicTaskStatus {
  /** 任务名称 */
  name: string;
  /** 是否正在运行 */
  isRunning: boolean;
  /** 最后执行时间 */
  lastExecution?: Date;
  /** 下次执行时间 */
  nextExecution?: Date;
  /** 执行次数 */
  executionCount: number;
}

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean;
  /** 性能监控间隔（毫秒） */
  performanceMonitoringInterval: number;
  /** 定时器验证间隔（毫秒） */
  timerValidationInterval: number;
  /** 错过任务检查间隔（毫秒） */
  missedTasksCheckInterval: number;
  /** 完结项目清理间隔（毫秒） */
  completedProjectsCleanupInterval: number;
  /** 任务关联验证间隔（毫秒） */
  taskAssociationValidationInterval: number;
}

/**
 * 调度器状态
 */
export interface SchedulerState {
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 最后一次错误 */
  lastError: Error | null;
  /** 当前执行中的任务 */
  currentExecution: Set<string>;
  /** 定时器数量 */
  timerCount: number;
  /** 验证定时器数量 */
  validationTimerCount: number;
}

/**
 * 导出所有类型，方便其他模块使用
 */
export type {
  ScheduledTask,
  TMDBItem,
} from '../storage';