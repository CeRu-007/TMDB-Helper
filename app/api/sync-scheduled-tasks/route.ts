import { NextRequest, NextResponse } from 'next/server';
import { ScheduledTask } from '@/lib/storage';
import { syncTasksFromClient, readScheduledTasks } from '@/lib/server-scheduled-tasks';

/**
 * 同步客户端定时任务到服务端API
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[API] 收到同步定时任务请求');
  
  try {
    const { tasks } = await request.json();
    
    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: '任务数据格式错误' }, { status: 400 });
    }

    console.log(`[API] 开始同步 ${tasks.length} 个客户端任务到服务端`);

    // 同步任务到服务端文件
    const success = syncTasksFromClient(tasks as ScheduledTask[]);

    if (success) {
      // 返回同步后的任务列表
      const syncedTasks = readScheduledTasks();
      
      return NextResponse.json({
        success: true,
        message: `成功同步 ${tasks.length} 个任务到服务端`,
        syncedCount: syncedTasks.length,
        syncedTasks
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '同步任务到服务端失败'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API] 同步定时任务失败:', error);
    return NextResponse.json({ 
      success: false,
      error: '同步定时任务失败', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * 获取服务端定时任务
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('[API] 收到获取服务端定时任务请求');
  
  try {
    const tasks = readScheduledTasks();
    
    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[API] 获取服务端定时任务失败:', error);
    return NextResponse.json({ 
      success: false,
      error: '获取服务端定时任务失败', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
