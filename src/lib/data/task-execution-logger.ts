import { v4 as uuidv4 } from 'uuid';
import { StorageManager, ScheduledTask, ExecutionLog } from './storage';

/**
 * 任务执行日志管理器
 * 负责管理任务执行过程中的日志记录和状态更新
 */
// 步骤状态枚举
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

// 步骤信息接口
export interface StepInfo {
  name: string;
  status: StepStatus;
  progress: number;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export class TaskExecutionLogger {
  private static instance: TaskExecutionLogger;
  private taskLogs: Map<string, ExecutionLog[]> = new Map();
  private taskProgress: Map<string, number> = new Map();
  private taskCurrentStep: Map<string, string> = new Map();
  private taskSteps: Map<string, Map<string, StepInfo>> = new Map(); // 新增：步骤状态跟踪
  private listeners: Map<
    string,
    ((logs: ExecutionLog[], progress: number, currentStep: string) => void)[]
  > = new Map();

  private constructor() {}

  public static getInstance(): TaskExecutionLogger {
    if (!TaskExecutionLogger.instance) {
      TaskExecutionLogger.instance = new TaskExecutionLogger();
    }
    return TaskExecutionLogger.instance;
  }

  /**
   * 开始任务执行日志记录
   */
  public async startTaskExecution(taskId: string): Promise<void> {
    // 初始化任务日志
    this.taskLogs.set(taskId, []);
    this.taskProgress.set(taskId, 0);
    this.taskCurrentStep.set(taskId, '准备执行');

    // 初始化步骤状态
    const steps = new Map<string, StepInfo>();
    steps.set('步骤1', {
      name: '播出平台抓取',
      status: 'pending',
      progress: 0,
    });
    steps.set('步骤2', { name: '强化CSV处理', status: 'pending', progress: 0 });
    steps.set('步骤2.5', {
      name: '检查CSV词条标题',
      status: 'pending',
      progress: 0,
    });
    steps.set('步骤3', { name: 'TMDB导入', status: 'pending', progress: 0 });
    steps.set('步骤4', {
      name: '自动集数标记',
      status: 'pending',
      progress: 0,
    });
    this.taskSteps.set(taskId, steps);

    // 更新任务状态
    await this.updateTaskStatus(taskId, {
      isRunning: true,
      currentStep: '准备执行',
      executionProgress: 0,
      executionLogs: [],
    });

    // 添加初始日志
    await this.addLog(taskId, '准备执行', '任务开始执行', 'info');
  }

  /**
   * 结束任务执行日志记录
   */
  public async endTaskExecution(
    taskId: string,
    success: boolean,
    error?: string,
  ): Promise<void> {
    const finalStep = success ? '执行完成' : '执行失败';
    const finalMessage = success
      ? '任务执行成功'
      : `任务执行失败: ${error || '未知错误'}`;
    const finalLevel = success ? 'success' : 'error';

    // 添加最终日志
    await this.addLog(taskId, finalStep, finalMessage, finalLevel);

    // 更新最终状态
    await this.updateTaskStatus(taskId, {
      isRunning: false,
      currentStep: finalStep,
      executionProgress: success ? 100 : this.taskProgress.get(taskId) || 0,
      lastRunStatus: success ? 'success' : 'failed',
      lastRunError: success ? null : error || '未知错误',
    });

    // 清理内存中的数据（保留一段时间以供查看）
    setTimeout(
      () => {
        this.taskLogs.delete(taskId);
        this.taskProgress.delete(taskId);
        this.taskCurrentStep.delete(taskId);
        this.taskSteps.delete(taskId);
        this.listeners.delete(taskId);
      },
      5 * 60 * 1000,
    ); // 5分钟后清理
  }

  /**
   * 开始执行步骤
   */
  public async startStep(taskId: string, stepKey: string): Promise<void> {
    const steps = this.taskSteps.get(taskId);
    if (steps && steps.has(stepKey)) {
      const step = steps.get(stepKey)!;
      step.status = 'running';
      step.startTime = new Date().toISOString();
      this.taskCurrentStep.set(taskId, step.name);
    }
  }

  /**
   * 完成执行步骤
   */
  public async completeStep(
    taskId: string,
    stepKey: string,
    success: boolean = true,
    error?: string,
  ): Promise<void> {
    const steps = this.taskSteps.get(taskId);
    if (steps && steps.has(stepKey)) {
      const step = steps.get(stepKey)!;
      step.status = success ? 'completed' : 'failed';
      step.endTime = new Date().toISOString();
      step.progress = 100;
      if (error) {
        step.error = error;
      }
    }
  }

  /**
   * 获取任务步骤状态
   */
  public getTaskSteps(taskId: string): Map<string, StepInfo> {
    return this.taskSteps.get(taskId) || new Map();
  }

  /**
   * 添加执行日志
   */
  public async addLog(
    taskId: string,
    step: string,
    message: string,
    level: 'info' | 'success' | 'warning' | 'error',
    details?: Record<string, unknown>,
  ): Promise<void> {
    const log: ExecutionLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      step,
      message,
      level,
      details,
    };

    // 添加到内存日志
    const logs = this.taskLogs.get(taskId) || [];
    logs.push(log);
    this.taskLogs.set(taskId, logs);

    // 更新当前步骤
    this.taskCurrentStep.set(taskId, step);

    // 更新任务状态
    await this.updateTaskStatus(taskId, {
      currentStep: step,
      executionLogs: logs,
    });

    // 通知监听器
    this.notifyListeners(taskId);
  }

  /**
   * 更新执行进度
   */
  public async updateProgress(taskId: string, progress: number): Promise<void> {
    this.taskProgress.set(taskId, Math.max(0, Math.min(100, progress)));

    // 更新任务状态
    await this.updateTaskStatus(taskId, {
      executionProgress: progress,
    });

    // 通知监听器
    this.notifyListeners(taskId);
  }

  /**
   * 获取任务执行日志
   */
  public getTaskLogs(taskId: string): ExecutionLog[] {
    return this.taskLogs.get(taskId) || [];
  }

  /**
   * 获取任务执行进度
   */
  public getTaskProgress(taskId: string): number {
    return this.taskProgress.get(taskId) || 0;
  }

  /**
   * 获取任务当前步骤
   */
  public getTaskCurrentStep(taskId: string): string {
    return this.taskCurrentStep.get(taskId) || '';
  }

  /**
   * 添加日志监听器
   */
  public addListener(
    taskId: string,
    listener: (
      logs: ExecutionLog[],
      progress: number,
      currentStep: string,
    ) => void,
  ): void {
    const listeners = this.listeners.get(taskId) || [];
    listeners.push(listener);
    this.listeners.set(taskId, listeners);
  }

  /**
   * 移除日志监听器
   */
  public removeListener(
    taskId: string,
    listener: (
      logs: ExecutionLog[],
      progress: number,
      currentStep: string,
    ) => void,
  ): void {
    const listeners = this.listeners.get(taskId) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.listeners.set(taskId, listeners);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(taskId: string): void {
    const listeners = this.listeners.get(taskId) || [];
    const logs = this.getTaskLogs(taskId);
    const progress = this.getTaskProgress(taskId);
    const currentStep = this.getTaskCurrentStep(taskId);

    listeners.forEach((listener) => {
      try {
        listener(logs, progress, currentStep);
      } catch (error) {}
    });
  }

  /**
   * 更新任务状态到存储
   */
  private async updateTaskStatus(
    taskId: string,
    updates: Partial<ScheduledTask>,
  ): Promise<void> {
    try {
      const tasks = await StorageManager.getScheduledTasks();
      const task = tasks.find((t) => t.id === taskId);

      if (task) {
        const updatedTask = {
          ...task,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        await StorageManager.updateScheduledTask(updatedTask);
      }
    } catch (error) {}
  }

  /**
   * 获取所有正在执行的任务
   */
  public getRunningTasks(): string[] {
    return Array.from(this.taskLogs.keys());
  }

  /**
   * 检查任务是否正在执行
   */
  public isTaskRunning(taskId: string): boolean {
    return this.taskLogs.has(taskId);
  }
}

// 导出单例实例
export const taskExecutionLogger = TaskExecutionLogger.getInstance();
