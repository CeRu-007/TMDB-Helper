import { NextRequest, NextResponse } from 'next/server';
import { readScheduledTasks, writeScheduledTasks } from '@/lib/data/server-scheduled-tasks';
// import { readItems } from '@/lib/server-storage'; // 替换为StorageManager
import { StorageManager } from '@/lib/data/storage';
import { ScheduledTask, TMDBItem } from '@/lib/data/storage';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

interface ServerSchedulerStatus {
  isRunning: boolean;
  lastCheck: string;
  nextCheck: string;
  processedTasks: number;
  failedTasks: number;
  uptime: number;
  version: string;
}

interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  startTime: string;
  endTime: string;
  duration: number;
  error?: string;
  output?: string;
}

/**
 * 服务端调度器状态管理
 */
class ServerScheduler {
  private static instance: ServerScheduler;
  private isRunning = false;
  private lastCheck = new Date().toISOString();
  private processedTasks = 0;
  private failedTasks = 0;
  private startTime = Date.now();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟检查间隔

  private constructor() {}

  public static getInstance(): ServerScheduler {
    if (!ServerScheduler.instance) {
      ServerScheduler.instance = new ServerScheduler();
    }
    return ServerScheduler.instance;
  }

  /**
   * 启动服务端调度器
   */
  public start(): void {
    if (this.isRunning) {
      
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();

    // 立即执行一次检查
    this.checkAndExecuteTasks();

    // 设置定期检查
    this.checkInterval = setInterval(() => {
      this.checkAndExecuteTasks();
    }, this.CHECK_INTERVAL);
  }

  /**
   * 停止服务端调度器
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 检查并执行到期的任务
   */
  private async checkAndExecuteTasks(): Promise<void> {
    try {
      this.lastCheck = new Date().toISOString();
      
      // 读取所有定时任务
      const tasks = readScheduledTasks();
      const items = await StorageManager.getItemsWithRetry();

      if (tasks.length === 0) {
        
        return;
      }

      const now = new Date();
      const enabledTasks = tasks.filter(task => task.enabled);
      const dueTasks: ScheduledTask[] = [];

      // 检查哪些任务需要执行
      for (const task of enabledTasks) {
        if (!task.nextRun) {
          continue;
        }

        const nextRunTime = new Date(task.nextRun);
        const timeDiff = now.getTime() - nextRunTime.getTime();

        // 如果当前时间超过了预定执行时间超过5分钟，认为是需要执行的任务
        if (timeDiff > 5 * 60 * 1000 && timeDiff <= 24 * 60 * 60 * 1000) {
          dueTasks.push(task);
        }
      }

      // 执行到期的任务
      for (const task of dueTasks) {
        await this.executeTask(task, items);
      }

    } catch (error) {
      
    }
  }

  /**
   * 执行单个任务
   */
  private async executeTask(task: ScheduledTask, items: TMDBItem[]): Promise<TaskExecutionResult> {
    const startTime = new Date().toISOString();
    const result: TaskExecutionResult = {
      taskId: task.id,
      success: false,
      startTime,
      endTime: '',
      duration: 0
    };

    try {
      console.log(`[ServerScheduler] 开始执行任务: ${task.name} (${task.id})`);

      // 查找关联的项目
      const relatedItem = items.find(item => item.id === task.itemId);
      if (!relatedItem) {
        throw new Error(`找不到任务关联的项目: ${task.itemId}`);
      }

      // 验证项目信息
      if (!relatedItem.tmdbId) {
        throw new Error(`项目 ${relatedItem.title} 缺少TMDB ID`);
      }

      if (!relatedItem.platformUrl) {
        throw new Error(`项目 ${relatedItem.title} 缺少平台URL`);
      }

      // 执行TMDB-Import任务
      const output = await this.executeTMDBImport(task, relatedItem);
      result.output = output;

      // 更新任务状态
      await this.updateTaskAfterExecution(task, true);

      result.success = true;
      this.processedTasks++;

    } catch (error) {
      
      result.error = error instanceof Error ? error.message : String(error);
      this.failedTasks++;

      // 更新任务状态
      await this.updateTaskAfterExecution(task, false, result.error);
    }

    const endTime = new Date().toISOString();
    result.endTime = endTime;
    result.duration = new Date(endTime).getTime() - new Date(startTime).getTime();

    return result;
  }

  /**
   * 执行TMDB-Import命令
   */
  private async executeTMDBImport(task: ScheduledTask, item: TMDBItem): Promise<string> {
    const configuredPath = ServerConfigManager.getConfigItem('tmdbImportPath') as string | undefined
    const tmdbImportDir = configuredPath ? configuredPath : path.resolve(process.cwd(), 'TMDB-Import-master');

    if (!fs.existsSync(tmdbImportDir)) {
      throw new Error('找不到TMDB-Import目录');
    }

    // 构建导出命令
    const extractCommand = `python -m tmdb-import.extractor -u "${item.platformUrl}" -s ${task.action.seasonNumber}`;

    const { stdout, stderr } = await execAsync(extractCommand, {
      cwd: tmdbImportDir,
      timeout: 3 * 60 * 1000 // 3分钟超时
    });

    if (stderr && !stdout) {
      throw new Error(`命令执行失败: ${stderr}`);
    }

    return stdout;
  }

  /**
   * 更新任务执行后的状态
   */
  private async updateTaskAfterExecution(
    task: ScheduledTask,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      const tasks = readScheduledTasks();
      const taskIndex = tasks.findIndex(t => t.id === task.id);

      if (taskIndex === -1) {
        
        return;
      }

      const updatedTask = {
        ...tasks[taskIndex],
        lastRun: new Date().toISOString(),
        lastRunStatus: success ? 'success' as const : 'failed' as const,
        lastRunError: error || null,
        nextRun: this.calculateNextRunTime(task).toISOString(),
        updatedAt: new Date().toISOString()
      };

      tasks[taskIndex] = updatedTask;
      writeScheduledTasks(tasks);

    } catch (error) {
      
    }
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextRunTime(task: ScheduledTask): Date {
    const now = new Date();

    if (task.schedule.type === 'weekly' && task.schedule.dayOfWeek !== undefined) {
      return this.calculateNextWeeklyRunTime(task, now);
    } else {
      // 每天执行
      const nextRun = new Date();
      nextRun.setHours(task.schedule.hour);
      nextRun.setMinutes(task.schedule.minute);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);

      // 如果今天的时间已过，则设为明天
      if (now > nextRun) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      return nextRun;
    }
  }

  /**
   * 计算每周任务的下一次执行时间
   */
  private calculateNextWeeklyRunTime(task: ScheduledTask, now: Date): Date {
    const targetDays: number[] = [task.schedule.dayOfWeek!];

    // 如果有第二播出日，添加到目标日期列表
    if (task.schedule.secondDayOfWeek !== undefined) {
      targetDays.push(task.schedule.secondDayOfWeek);
    }

    // 获取当前是周几 (0-6, 0是周日)
    const currentDay = now.getDay();
    // 调整为我们的约定 (0-6, 0是周一)
    const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;

    let nearestNextRun: Date | null = null;
    let minDaysUntilTarget = Infinity;

    // 为每个目标日期计算下次执行时间
    for (const targetDay of targetDays) {
      const nextRun = new Date();
      nextRun.setHours(task.schedule.hour);
      nextRun.setMinutes(task.schedule.minute);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);

      // 计算到目标日期的天数差
      let daysUntilTarget = targetDay - adjustedCurrentDay;
      if (daysUntilTarget < 0) {
        daysUntilTarget += 7; // 如果是过去的日期，加上一周
      } else if (daysUntilTarget === 0 && now > nextRun) {
        daysUntilTarget = 7; // 如果是今天但已经过了时间，设为下周
      }

      // 设置到正确的日期
      nextRun.setDate(now.getDate() + daysUntilTarget);

      // 选择最近的执行时间
      if (daysUntilTarget < minDaysUntilTarget) {
        minDaysUntilTarget = daysUntilTarget;
        nearestNextRun = nextRun;
      }
    }

    return nearestNextRun || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * 获取调度器状态
   */
  public getStatus(): ServerSchedulerStatus {
    const now = Date.now();
    const nextCheck = new Date(now + this.CHECK_INTERVAL);

    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      nextCheck: nextCheck.toISOString(),
      processedTasks: this.processedTasks,
      failedTasks: this.failedTasks,
      uptime: now - this.startTime,
      version: '1.0.0'
    };
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.processedTasks = 0;
    this.failedTasks = 0;
    this.startTime = Date.now();
    
  }

  /**
   * 手动触发任务检查
   */
  public async triggerCheck(): Promise<void> {
    
    await this.checkAndExecuteTasks();
  }
}

// 全局调度器实例
const serverScheduler = ServerScheduler.getInstance();

/**
 * GET /api/system/server-scheduler - 获取服务端调度器状态
 */
export async function GET(request: NextRequest) {
  try {
    const status = serverScheduler.getStatus();

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: '获取调度器状态失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST /api/system/server-scheduler - 控制服务端调度器
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'start':
        serverScheduler.start();
        return NextResponse.json({
          success: true,
          message: '服务端调度器已启动',
          status: serverScheduler.getStatus()
        });

      case 'stop':
        serverScheduler.stop();
        return NextResponse.json({
          success: true,
          message: '服务端调度器已停止',
          status: serverScheduler.getStatus()
        });

      case 'restart':
        serverScheduler.stop();
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
        serverScheduler.start();
        return NextResponse.json({
          success: true,
          message: '服务端调度器已重启',
          status: serverScheduler.getStatus()
        });

      case 'reset_stats':
        serverScheduler.resetStats();
        return NextResponse.json({
          success: true,
          message: '统计信息已重置',
          status: serverScheduler.getStatus()
        });

      case 'trigger_check':
        await serverScheduler.triggerCheck();
        return NextResponse.json({
          success: true,
          message: '任务检查已触发',
          status: serverScheduler.getStatus()
        });

      default:
        return NextResponse.json({
          success: false,
          error: '未知的操作',
          availableActions: ['start', 'stop', 'restart', 'reset_stats', 'trigger_check']
        }, { status: 400 });
    }

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: '调度器操作失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 自动启动服务端调度器
if (process.env.NODE_ENV === 'production') {
  serverScheduler.start();
}