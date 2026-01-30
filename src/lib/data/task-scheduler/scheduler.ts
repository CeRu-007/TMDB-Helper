/**
 * TaskScheduler - 主调度器（Facade 模式）
 * 负责协调各个子模块，提供统一的接口
 *
 * 重构说明：
 * - 使用 Facade 模式，代理所有子模块的方法
 * - 保持所有原有 API 不变，确保向后兼容
 * - 将 3009 行的文件拆分为多个职责明确的模块
 */

import { ScheduledTask, TMDBItem } from '../storage';
import { TaskSchedulerAdvancedConfig } from '../task-scheduler-config';
import { TaskManager } from './task-manager';
import { TaskExecutor } from './task-executor';
import { TimerManager } from './timer-manager';
import { ProjectManager } from './project-manager';
import { TaskLifecycle } from './task-lifecycle';
import { TaskQueue } from './task-queue';
import { SchedulerValidator } from './scheduler-validator';

/**
 * 任务调度器（主类）
 * 使用 Facade 模式协调各个子模块
 */
class TaskScheduler {
  private static instance: TaskScheduler;
  private taskManager: TaskManager;
  private taskExecutor: TaskExecutor;
  private timerManager: TimerManager;
  private projectManager: ProjectManager;
  private taskLifecycle: TaskLifecycle;
  private taskQueue: TaskQueue;
  private validator: SchedulerValidator;

  private constructor() {
    // 初始化各个子模块
    this.taskManager = new TaskManager();
    this.taskExecutor = new TaskExecutor();
    this.timerManager = new TimerManager(this.taskExecutor);
    this.projectManager = new ProjectManager();
    this.taskLifecycle = new TaskLifecycle(
      this.taskManager,
      this.taskExecutor,
      this.timerManager,
    );
    this.taskQueue = new TaskQueue(this.taskExecutor);
    this.validator = new SchedulerValidator(
      this.taskManager,
      this.timerManager,
      this.projectManager,
      this.taskExecutor,
    );
  }

  public static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler();
    }
    return TaskScheduler.instance;
  }

  // ==================== 初始化和验证相关 ====================

  /**
   * 初始化调度器，加载所有定时任务
   */
  public async initialize(): Promise<void> {
    return this.validator.initialize();
  }

  /**
   * 启动定期验证任务关联
   */
  public startPeriodicValidation(): void {
    this.validator.startPeriodicValidation();
  }

  /**
   * 停止定期验证
   */
  public stopPeriodicValidation(): void {
    this.validator.stopPeriodicValidation();
  }

  /**
   * 启动定期检查错过的任务
   */
  public startMissedTasksCheck(): void {
    this.validator.startMissedTasksCheck();
  }

  /**
   * 停止定期检查错过的任务
   */
  public stopMissedTasksCheck(): void {
    this.validator.stopMissedTasksCheck();
  }

  /**
   * 启动定期清理已完结项目的任务
   */
  public startCompletedProjectsCleanup(): void {
    this.validator.startCompletedProjectsCleanup();
  }

  /**
   * 停止定期清理已完结项目的任务
   */
  public stopCompletedProjectsCleanup(): void {
    this.validator.stopCompletedProjectsCleanup();
  }

  /**
   * 启动定期验证所有定时器
   */
  public startPeriodicTimerValidation(): void {
    this.validator.startPeriodicTimerValidation();
  }

  /**
   * 停止定期验证所有定时器
   */
  public stopPeriodicTimerValidation(): void {
    this.validator.stopPeriodicTimerValidation();
  }

  /**
   * 验证和修复所有任务的关联
   */
  public async validateAndFixAllTaskAssociations(): Promise<{
    success: boolean;
    message: string;
    details: {
      totalTasks: number;
      invalidTasks: number;
      fixedTasks: number;
      deletedTasks: number;
      details: string[];
    };
  }> {
    return this.validator.validateAndFixAllTaskAssociations();
  }

  // ==================== 任务生命周期管理 ====================

  /**
   * 添加任务
   */
  public async addTask(task: ScheduledTask): Promise<boolean> {
    return this.taskLifecycle.addTask(task);
  }

  /**
   * 更新任务
   */
  public async updateTask(task: ScheduledTask): Promise<boolean> {
    return this.taskLifecycle.updateTask(task);
  }

  /**
   * 删除任务
   */
  public async deleteTask(taskId: string): Promise<boolean> {
    return this.taskLifecycle.deleteTask(taskId);
  }

  /**
   * 取消任务调度（只清除定时器，不删除任务）
   */
  public async cancelTask(taskId: string): Promise<boolean> {
    return this.taskLifecycle.cancelTask(taskId);
  }

  /**
   * 立即执行任务
   */
  public async runTaskNow(
    taskId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.taskLifecycle.runTaskNow(taskId);
  }

  /**
   * 手动执行任务（公开方法）
   */
  public async executeTaskManually(task: ScheduledTask): Promise<void> {
    return this.taskLifecycle.executeTaskManually(task);
  }

  // ==================== 任务执行相关 ====================

  /**
   * 检查任务是否正在执行
   */
  public isTaskRunning(taskId: string): boolean {
    return this.taskExecutor.isTaskRunning(taskId);
  }

  /**
   * 获取最后一次执行错误
   */
  public getLastError(): Error | null {
    return this.taskExecutor.getLastError();
  }

  // ==================== 定时器管理相关 ====================

  /**
   * 为任务设置定时器
   */
  public scheduleTask(task: ScheduledTask): void {
    this.timerManager.scheduleTask(task);
  }

  /**
   * 清除所有定时器
   */
  public clearAllTimers(): void {
    this.timerManager.clearAllTimers();
  }

  /**
   * 验证所有定时器
   */
  public async validateAllTimers(): Promise<void> {
    return this.timerManager.validateAllTimers();
  }

  // ==================== 项目管理相关 ====================

  /**
   * 获取关联项目，包含多种备用策略
   */
  public async getRelatedItem(task: ScheduledTask): Promise<TMDBItem | null> {
    return this.projectManager.getRelatedItem(task);
  }

  /**
   * 尝试重新关联任务到有效项目
   */
  public async attemptToRelinkTask(
    task: ScheduledTask,
  ): Promise<{ success: boolean; message?: string; newItemId?: string }> {
    return this.projectManager.attemptToRelinkTask(task);
  }

  /**
   * 检查并处理已完结项目的任务自动删除
   */
  public async checkAndHandleCompletedProject(
    task: ScheduledTask,
    relatedItem: TMDBItem,
  ): Promise<boolean> {
    return this.projectManager.checkAndHandleCompletedProject(task, relatedItem);
  }

  /**
   * 删除已完结项目的定时任务
   */
  public async deleteCompletedTask(task: ScheduledTask): Promise<void> {
    return this.projectManager.deleteCompletedTask(task);
  }

  /**
   * 清理已完结项目的定时任务
   */
  public async cleanupCompletedProjectTasks(): Promise<void> {
    return this.projectManager.cleanupCompletedProjectTasks();
  }

  // ==================== 冲突检测和解决相关 ====================

  /**
   * 将任务加入队列（冲突解决策略）
   */
  public async enqueueTask(
    task: ScheduledTask,
    resolution: { queuePosition?: number; strategy?: string },
  ): Promise<void> {
    return this.taskQueue.enqueueTask(task, resolution);
  }

  /**
   * 获取冲突检测统计信息
   */
  public getConflictStats() {
    return this.taskQueue.getConflictStats();
  }

  /**
   * 更新冲突检测和解决配置
   */
  public updateConflictConfig(config: Partial<TaskSchedulerAdvancedConfig>): void {
    this.taskQueue.updateConflictConfig(config);
  }

  /**
   * 清理过期的冲突检测数据
   */
  public cleanupConflictData(): void {
    this.taskQueue.cleanupConflictData();
  }

  // ==================== 内部方法（供子模块使用） ====================

  /**
   * 获取 TaskManager 实例（供内部使用）
   */
  public getTaskManager(): TaskManager {
    return this.taskManager;
  }

  /**
   * 获取 TaskExecutor 实例（供内部使用）
   */
  public getTaskExecutor(): TaskExecutor {
    return this.taskExecutor;
  }

  /**
   * 获取 TimerManager 实例（供内部使用）
   */
  public getTimerManager(): TimerManager {
    return this.timerManager;
  }

  /**
   * 获取 ProjectManager 实例（供内部使用）
   */
  public getProjectManager(): ProjectManager {
    return this.projectManager;
  }

  /**
   * 获取 TaskQueue 实例（供内部使用）
   */
  public getTaskQueue(): TaskQueue {
    return this.taskQueue;
  }

  /**
   * 获取 SchedulerValidator 实例（供内部使用）
   */
  public getValidator(): SchedulerValidator {
    return this.validator;
  }
}

// 创建全局调度器实例
export const taskScheduler = TaskScheduler.getInstance();

// 导出类型，方便其他模块使用
export type { ScheduledTask, TMDBItem };

// 默认导出
export default TaskScheduler;