import { NextRequest, NextResponse } from 'next/server';
import { taskScheduler } from '@/lib/scheduler';
import { StorageManager } from '@/lib/storage';

/**
 * GET /api/scheduler-status - 获取调度器状态
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API] 获取调度器状态');
    
    // 获取调度器状态
    const schedulerStatus = taskScheduler.getSchedulerStatus();
    
    // 获取所有任务
    const allTasks = await StorageManager.getScheduledTasks();
    const enabledTasks = allTasks.filter(task => task.enabled);
    
    // 获取任务详细信息
    const taskDetails = allTasks.map(task => {
      const isRunning = taskScheduler.isTaskRunning(task.id);
      const hasTimer = schedulerStatus.timerDetails.some(t => t.taskId === task.id);
      
      return {
        id: task.id,
        name: task.name,
        enabled: task.enabled,
        type: task.type,
        schedule: task.schedule,
        nextRun: task.nextRun,
        lastRun: task.lastRun,
        lastRunStatus: task.lastRunStatus,
        lastRunError: task.lastRunError,
        isRunning: isRunning,
        hasActiveTimer: hasTimer,
        itemId: task.itemId
      };
    });
    
    // 检查是否有孤立的定时器（没有对应任务的定时器）
    const orphanedTimers = schedulerStatus.timerDetails.filter(timer => 
      !allTasks.some(task => task.id === timer.taskId)
    );
    
    // 检查是否有缺失定时器的启用任务
    const missingTimers = enabledTasks.filter(task => 
      !schedulerStatus.timerDetails.some(timer => timer.taskId === task.id)
    );
    
    const status = {
      scheduler: schedulerStatus,
      tasks: {
        total: allTasks.length,
        enabled: enabledTasks.length,
        disabled: allTasks.length - enabledTasks.length,
        running: schedulerStatus.runningTasks
      },
      issues: {
        orphanedTimers: orphanedTimers.length,
        missingTimers: missingTimers.length,
        orphanedTimerDetails: orphanedTimers,
        missingTimerDetails: missingTimers.map(task => ({
          id: task.id,
          name: task.name,
          enabled: task.enabled
        }))
      },
      taskDetails: taskDetails,
      timestamp: new Date().toISOString()
    };
    
    console.log('[API] 调度器状态:', status);
    
    return NextResponse.json({
      success: true,
      status: status
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 获取调度器状态失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取调度器状态失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST /api/scheduler-status - 重新初始化调度器
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'reinitialize') {
      console.log('[API] 重新初始化调度器');
      
      // 强制重新初始化
      (taskScheduler as any).isInitialized = false;
      await taskScheduler.initialize();
      
      // 获取新的状态
      const newStatus = taskScheduler.getSchedulerStatus();
      
      return NextResponse.json({
        success: true,
        message: '调度器重新初始化成功',
        status: newStatus
      }, { status: 200 });
      
    } else if (action === 'validate') {
      console.log('[API] 验证任务关联');
      
      const result = await taskScheduler.validateAndFixAllTaskAssociations();
      
      return NextResponse.json({
        success: true,
        message: '任务关联验证完成',
        result: result
      }, { status: 200 });
      
    } else {
      return NextResponse.json({
        success: false,
        error: '未知的操作',
        availableActions: ['reinitialize', 'validate']
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[API] 调度器操作失败:', error);
    return NextResponse.json({
      success: false,
      error: '调度器操作失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
