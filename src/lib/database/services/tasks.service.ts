/**
 * 定时任务 Service
 * 提供业务逻辑和缓存功能
 */

import { tasksRepository } from '../repositories/tasks.repository';
import { cacheManager, CacheKeys } from './cache.service';
import type { ScheduledTask, ExecutionLog } from '@/lib/data/storage/types';
import type { DatabaseResult } from '../types';
import { logger } from '@/lib/utils/logger';

export class TasksService {
  private static instance: TasksService;

  private constructor() {}

  static getInstance(): TasksService {
    if (!TasksService.instance) {
      TasksService.instance = new TasksService();
    }
    return TasksService.instance;
  }

  /**
   * 获取所有任务（带缓存）
   */
  getAll(): ScheduledTask[] {
    const cacheKey = CacheKeys.tasks.all;
    const cached = cacheManager.get<ScheduledTask[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const tasks = tasksRepository.findAllTasks();
    cacheManager.set(cacheKey, tasks, 60 * 1000); // 1分钟缓存
    return tasks;
  }

  /**
   * 根据ID获取任务（带缓存）
   */
  getById(id: string): ScheduledTask | undefined {
    const cacheKey = CacheKeys.tasks.byId(id);
    const cached = cacheManager.get<ScheduledTask>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const task = tasksRepository.findTaskById(id);
    if (task) {
      cacheManager.set(cacheKey, task, 60 * 1000);
    }
    return task;
  }

  /**
   * 根据项目ID获取任务（带缓存）
   */
  getByItemId(itemId: string): ScheduledTask[] {
    const cacheKey = CacheKeys.tasks.byItemId(itemId);
    const cached = cacheManager.get<ScheduledTask[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const tasks = tasksRepository.findByItemId(itemId);
    cacheManager.set(cacheKey, tasks, 60 * 1000);
    return tasks;
  }

  /**
   * 获取启用的任务（带缓存）
   */
  getEnabled(): ScheduledTask[] {
    const cacheKey = CacheKeys.tasks.enabled;
    const cached = cacheManager.get<ScheduledTask[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const tasks = tasksRepository.findEnabledTasks();
    cacheManager.set(cacheKey, tasks, 60 * 1000);
    return tasks;
  }

  /**
   * 创建任务
   */
  create(task: ScheduledTask): DatabaseResult<ScheduledTask> {
    const result = tasksRepository.createTask(task);
    
    if (result.success) {
      this.invalidateCache(task.id, task.itemId);
      logger.info(`[TasksService] 创建任务: ${task.name}`);
    }
    
    return result;
  }

  /**
   * 更新任务
   */
  update(task: ScheduledTask): DatabaseResult<ScheduledTask> {
    const result = tasksRepository.updateTask(task);
    
    if (result.success) {
      this.invalidateCache(task.id, task.itemId);
      logger.info(`[TasksService] 更新任务: ${task.name}`);
    }
    
    return result;
  }

  /**
   * 保存任务（创建或更新）
   */
  save(task: ScheduledTask): DatabaseResult<ScheduledTask> {
    const existing = tasksRepository.findTaskById(task.id);
    
    if (existing) {
      return this.update(task);
    }
    
    return this.create(task);
  }

  /**
   * 删除任务（软删除）
   */
  delete(id: string): DatabaseResult {
    const task = this.getById(id);
    const result = tasksRepository.softDelete(id);
    
    if (result.success) {
      this.invalidateCache(id, task?.itemId);
      logger.info(`[TasksService] 删除任务: ${id}`);
    }
    
    return result;
  }

  /**
   * 恢复已删除的任务
   */
  restore(id: string): DatabaseResult {
    const result = tasksRepository.restore(id);
    
    if (result.success) {
      this.invalidateCache(id);
      logger.info(`[TasksService] 恢复任务: ${id}`);
    }
    
    return result;
  }

  /**
   * 永久删除任务
   */
  hardDelete(id: string): DatabaseResult {
    const task = this.getById(id);
    const result = tasksRepository.deleteById(id);
    
    if (result.success) {
      this.invalidateCache(id, task?.itemId);
      logger.info(`[TasksService] 永久删除任务: ${id}`);
    }
    
    return result;
  }

  /**
   * 删除项目关联的所有任务
   */
  deleteByItemId(itemId: string): DatabaseResult<number> {
    const result = tasksRepository.deleteByItemId(itemId);
    
    if (result.success) {
      cacheManager.delete(CacheKeys.tasks.byItemId(itemId));
      cacheManager.delete(CacheKeys.tasks.all);
      logger.info(`[TasksService] 删除项目关联任务: ${itemId}, 数量: ${result.data}`);
    }
    
    return result;
  }

  /**
   * 更新任务执行状态
   */
  updateExecutionStatus(
    id: string,
    status: Partial<{
      lastRun: string;
      nextRun: string;
      lastRunStatus: 'success' | 'failed' | 'user_interrupted';
      lastRunError: string | null;
      currentStep: string;
      executionProgress: number;
      isRunning: boolean;
    }>,
  ): DatabaseResult {
    const result = tasksRepository.updateExecutionStatus(id, status);
    
    if (result.success) {
      cacheManager.delete(CacheKeys.tasks.byId(id));
    }
    
    return result;
  }

  /**
   * 添加执行日志
   */
  addLog(taskId: string, log: ExecutionLog): DatabaseResult {
    return tasksRepository.addExecutionLog(taskId, log);
  }

  /**
   * 获取执行日志
   */
  getLogs(taskId: string, limit?: number): ExecutionLog[] {
    return tasksRepository.getExecutionLogs(taskId, limit);
  }

  /**
   * 清除执行日志
   */
  clearLogs(taskId: string): DatabaseResult<number> {
    return tasksRepository.clearExecutionLogs(taskId);
  }

  /**
   * 批量导入任务
   */
  import(tasks: ScheduledTask[]): DatabaseResult<{ imported: number; skipped: number }> {
    const result = tasksRepository.importTasks(tasks);
    
    if (result.success) {
      this.invalidateCache();
      logger.info(`[TasksService] 导入任务: ${result.data?.imported} 个`);
    }
    
    return result;
  }

  /**
   * 使缓存失效
   */
  private invalidateCache(taskId?: string, itemId?: string): void {
    cacheManager.delete(CacheKeys.tasks.all);
    cacheManager.delete(CacheKeys.tasks.enabled);
    
    if (taskId) {
      cacheManager.delete(CacheKeys.tasks.byId(taskId));
    }
    
    if (itemId) {
      cacheManager.delete(CacheKeys.tasks.byItemId(itemId));
    }
  }
}

// 导出单例
export const tasksService = TasksService.getInstance();
