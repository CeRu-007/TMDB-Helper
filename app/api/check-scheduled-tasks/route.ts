import { NextRequest, NextResponse } from 'next/server';
import { StorageManager, ScheduledTask } from '@/lib/storage';
import { readItems } from '@/lib/server-storage';
import { readScheduledTasks } from '@/lib/server-scheduled-tasks';

/**
 * 服务端定时任务检查API
 * 用于检查是否有错过的任务需要执行
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  
  try {
    // 从服务器端存储读取项目数据
    let items;
    try {
      items = readItems();
      
    } catch (serverError) {
      
      items = [];
    }

    // 获取所有定时任务，优先从服务端文件读取
    let tasks: ScheduledTask[] = [];
    try {
      tasks = readScheduledTasks();
      
    } catch (serverError) {
      
      tasks = await StorageManager.getScheduledTasks();
      
    }

    const now = new Date();
    const enabledTasks = tasks.filter(task => task.enabled);
    const missedTasks: ScheduledTask[] = [];
    const upcomingTasks: ScheduledTask[] = [];

    for (const task of enabledTasks) {
      try {
        // 如果任务没有设置下次执行时间，跳过
        if (!task.nextRun) {
          continue;
        }

        const nextRunTime = new Date(task.nextRun);
        const timeDiff = now.getTime() - nextRunTime.getTime();
        
        // 如果当前时间超过了预定执行时间超过5分钟，认为是错过的任务
        if (timeDiff > 5 * 60 * 1000) {
          // 检查是否在合理的补偿时间窗口内（24小时内）
          if (timeDiff <= 24 * 60 * 60 * 1000) {
            console.log(`[API] 发现错过的任务: ${task.name} (${task.id}), 预定时间: ${nextRunTime.toLocaleString('zh-CN')}`);
            missedTasks.push(task);
          }
        } else if (timeDiff > -60 * 60 * 1000) {
          // 即将在1小时内执行的任务
          upcomingTasks.push(task);
        }
      } catch (error) {
        
      }
    }

    // 返回检查结果
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      totalTasks: tasks.length,
      enabledTasks: enabledTasks.length,
      missedTasks: missedTasks.length,
      upcomingTasks: upcomingTasks.length,
      missedTaskDetails: missedTasks.map(task => ({
        id: task.id,
        name: task.name,
        itemTitle: task.itemTitle,
        nextRun: task.nextRun,
        timeDiff: Math.round((now.getTime() - new Date(task.nextRun!).getTime()) / (60 * 1000)) // 分钟
      })),
      upcomingTaskDetails: upcomingTasks.map(task => ({
        id: task.id,
        name: task.name,
        itemTitle: task.itemTitle,
        nextRun: task.nextRun,
        timeDiff: Math.round((new Date(task.nextRun!).getTime() - now.getTime()) / (60 * 1000)) // 分钟
      }))
    });

  } catch (error: any) {
    
    return NextResponse.json({ 
      success: false,
      error: '检查定时任务失败', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST 处理程序 - 执行错过的任务
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  
  try {
    const { taskId } = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: '缺少任务ID' }, { status: 400 });
    }

    // 获取任务详情，优先从服务端文件读取
    let tasks: ScheduledTask[] = [];
    try {
      tasks = readScheduledTasks();
    } catch (serverError) {
      
      tasks = await StorageManager.getScheduledTasks();
    }

    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    if (!task.enabled) {
      return NextResponse.json({ error: '任务已禁用' }, { status: 400 });
    }

    // 检查任务是否确实错过了
    if (!task.nextRun) {
      return NextResponse.json({ error: '任务没有设置执行时间' }, { status: 400 });
    }

    const now = new Date();
    const nextRunTime = new Date(task.nextRun);
    const timeDiff = now.getTime() - nextRunTime.getTime();
    
    if (timeDiff <= 5 * 60 * 1000) {
      return NextResponse.json({ error: '任务尚未错过执行时间' }, { status: 400 });
    }

    if (timeDiff > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: '任务错过时间过长，无法补偿执行' }, { status: 400 });
    }

    // 从服务器端存储读取项目数据
    let items;
    try {
      items = readItems();
    } catch (serverError) {
      
      items = [];
    }

    // 检查关联的项目是否存在
    const relatedItem = items.find(item => item.id === task.itemId);
    if (!relatedItem) {
      return NextResponse.json({ error: '关联的项目不存在' }, { status: 404 });
    }

    // 调用执行定时任务的API
    const executeResponse = await fetch(`${request.nextUrl.origin}/api/execute-scheduled-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: task.id,
        itemId: task.itemId,
        action: task.action,
        metadata: {
          tmdbId: relatedItem.tmdbId,
          title: relatedItem.title,
          platformUrl: relatedItem.platformUrl
        }
      })
    });

    const executeResult = await executeResponse.json();

    if (executeResult.success) {
      
      return NextResponse.json({
        success: true,
        message: `成功执行错过的任务: ${task.name}`,
        taskId: task.id,
        taskName: task.name,
        executeResult
      });
    } else {
      
      return NextResponse.json({
        success: false,
        error: '执行错过的任务失败',
        details: executeResult
      }, { status: 500 });
    }

  } catch (error: any) {
    
    return NextResponse.json({ 
      success: false,
      error: '执行错过任务失败', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
