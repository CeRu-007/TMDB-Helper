import { NextRequest, NextResponse } from 'next/server';
import { taskScheduler } from '@/lib/scheduler';
import { StorageManager, ScheduledTask } from '@/lib/storage';

/**
 * 定时任务健康检查和自动修复API
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('[API] 收到定时任务健康检查请求');
  
  try {
    const now = new Date();
    
    // 获取调度器状态
    const schedulerStatus = taskScheduler.getSchedulerStatus();
    
    // 获取所有任务
    const allTasks = await StorageManager.getScheduledTasks();
    const enabledTasks = allTasks.filter(task => task.enabled);
    
    // 分析任务状态
    const issues: Array<{
      taskId: string;
      taskName: string;
      issue: string;
      severity: 'warning' | 'error';
      autoFixable: boolean;
    }> = [];
    
    const fixes: Array<{
      taskId: string;
      taskName: string;
      action: string;
      result: 'success' | 'failed';
      details?: string;
    }> = [];
    
    for (const task of enabledTasks) {
      // 检查是否有活跃的定时器
      const hasActiveTimer = schedulerStatus.timerDetails.some(t => t.taskId === task.id);
      
      if (!hasActiveTimer) {
        issues.push({
          taskId: task.id,
          taskName: task.name,
          issue: '任务已启用但没有活跃的定时器',
          severity: 'error',
          autoFixable: true
        });
      }
      
      // 检查是否错过了执行时间
      if (task.nextRun) {
        const nextRunTime = new Date(task.nextRun);
        const timeDiff = now.getTime() - nextRunTime.getTime();
        
        if (timeDiff > 5 * 60 * 1000) { // 错过5分钟以上
          issues.push({
            taskId: task.id,
            taskName: task.name,
            issue: `任务错过执行时间 ${Math.round(timeDiff / 60000)} 分钟`,
            severity: 'error',
            autoFixable: true
          });
        }
      } else {
        issues.push({
          taskId: task.id,
          taskName: task.name,
          issue: '任务没有设置下次执行时间',
          severity: 'warning',
          autoFixable: true
        });
      }
      
      // 检查项目ID格式
      if (!task.itemId || task.itemId.length > 50 || task.itemId.includes(' ')) {
        issues.push({
          taskId: task.id,
          taskName: task.name,
          issue: '任务关联的项目ID格式异常',
          severity: 'error',
          autoFixable: false
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      scheduler: {
        isInitialized: schedulerStatus.isInitialized,
        activeTimers: schedulerStatus.activeTimers,
        runningTasks: schedulerStatus.runningTasks
      },
      tasks: {
        total: allTasks.length,
        enabled: enabledTasks.length,
        withIssues: issues.length
      },
      issues,
      summary: {
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        autoFixable: issues.filter(i => i.autoFixable).length
      }
    });
    
  } catch (error: any) {
    console.error('[API] 定时任务健康检查失败:', error);
    return NextResponse.json({ 
      success: false,
      error: '健康检查失败', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST 处理程序 - 执行自动修复
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[API] 收到定时任务自动修复请求');
  
  try {
    const { autoFix = false, taskIds = [] } = await request.json();
    
    if (!autoFix) {
      return NextResponse.json({ 
        error: '请确认执行自动修复' 
      }, { status: 400 });
    }
    
    const fixes: Array<{
      taskId: string;
      taskName: string;
      action: string;
      result: 'success' | 'failed';
      details?: string;
    }> = [];
    
    // 重新初始化调度器
    console.log('[API] 重新初始化调度器...');
    try {
      await taskScheduler.initialize();
      fixes.push({
        taskId: 'scheduler',
        taskName: '调度器',
        action: '重新初始化调度器',
        result: 'success',
        details: '调度器已重新初始化，所有定时器已重新设置'
      });
    } catch (error) {
      fixes.push({
        taskId: 'scheduler',
        taskName: '调度器',
        action: '重新初始化调度器',
        result: 'failed',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    
    // 如果指定了特定任务，尝试修复这些任务
    if (taskIds.length > 0) {
      const allTasks = await StorageManager.getScheduledTasks();
      
      for (const taskId of taskIds) {
        const task = allTasks.find(t => t.id === taskId);
        if (!task) continue;
        
        try {
          // 验证和修复任务关联
          const validationResult = await StorageManager.validateAndFixTaskAssociations();
          
          if (validationResult.fixedTasks > 0) {
            fixes.push({
              taskId: task.id,
              taskName: task.name,
              action: '修复任务关联',
              result: 'success',
              details: '任务关联已修复'
            });
          }
          
          // 重新设置定时器
          if (task.enabled) {
            taskScheduler.scheduleTask(task);
            fixes.push({
              taskId: task.id,
              taskName: task.name,
              action: '重新设置定时器',
              result: 'success',
              details: '定时器已重新设置'
            });
          }
          
        } catch (error) {
          fixes.push({
            taskId: task.id,
            taskName: task.name,
            action: '修复任务',
            result: 'failed',
            details: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    
    // 再次检查状态
    const finalStatus = taskScheduler.getSchedulerStatus();
    
    return NextResponse.json({
      success: true,
      message: '自动修复完成',
      fixes,
      finalStatus: {
        isInitialized: finalStatus.isInitialized,
        activeTimers: finalStatus.activeTimers,
        runningTasks: finalStatus.runningTasks
      },
      summary: {
        totalFixes: fixes.length,
        successful: fixes.filter(f => f.result === 'success').length,
        failed: fixes.filter(f => f.result === 'failed').length
      }
    });
    
  } catch (error: any) {
    console.error('[API] 定时任务自动修复失败:', error);
    return NextResponse.json({ 
      success: false,
      error: '自动修复失败', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}