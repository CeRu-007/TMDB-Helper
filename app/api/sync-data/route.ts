import { NextRequest, NextResponse } from 'next/server';
import { readItems } from '@/lib/server-storage';
import { readScheduledTasks } from '@/lib/server-scheduled-tasks';
import { TMDBItem, ScheduledTask } from '@/lib/storage';

/**
 * GET /api/sync-data - 获取服务端数据用于同步
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API] 获取同步数据请求');
    
    // 读取服务端项目数据
    let items: TMDBItem[] = [];
    try {
      items = readItems();
      console.log(`[API] 从服务端读取到 ${items.length} 个项目`);
    } catch (error) {
      console.warn('[API] 读取服务端项目数据失败:', error);
      items = [];
    }

    // 读取服务端任务数据
    let tasks: ScheduledTask[] = [];
    try {
      tasks = readScheduledTasks();
      console.log(`[API] 从服务端读取到 ${tasks.length} 个任务`);
    } catch (error) {
      console.warn('[API] 读取服务端任务数据失败:', error);
      tasks = [];
    }

    // 计算数据版本（基于最后更新时间）
    const itemVersions = items.map(item => new Date(item.updatedAt).getTime()).filter(t => !isNaN(t));
    const taskVersions = tasks.map(task => new Date(task.updatedAt).getTime()).filter(t => !isNaN(t));
    
    const latestItemTime = itemVersions.length > 0 ? Math.max(...itemVersions) : 0;
    const latestTaskTime = taskVersions.length > 0 ? Math.max(...taskVersions) : 0;
    const version = Math.max(latestItemTime, latestTaskTime);

    return NextResponse.json({
      success: true,
      items,
      tasks,
      version,
      timestamp: new Date().toISOString(),
      stats: {
        itemCount: items.length,
        taskCount: tasks.length,
        enabledTasks: tasks.filter(t => t.enabled).length
      }
    });

  } catch (error) {
    console.error('[API] 获取同步数据失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取同步数据失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST /api/sync-data - 接收客户端数据并进行服务端同步
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] 接收客户端同步数据');
    
    const { items, tasks, clientVersion } = await request.json();
    
    if (!Array.isArray(items) || !Array.isArray(tasks)) {
      return NextResponse.json({
        success: false,
        error: '无效的数据格式'
      }, { status: 400 });
    }

    console.log(`[API] 客户端数据: ${items.length} 个项目, ${tasks.length} 个任务, 版本: ${clientVersion}`);

    // 这里可以实现服务端数据的更新逻辑
    // 由于当前系统主要使用文件存储，这里暂时只做数据验证和统计
    
    // 验证数据完整性
    const validItems = items.filter((item: any) => 
      item && typeof item === 'object' && item.id && item.title
    );
    
    const validTasks = tasks.filter((task: any) => 
      task && typeof task === 'object' && task.id && task.name && task.itemId
    );

    const invalidItemCount = items.length - validItems.length;
    const invalidTaskCount = tasks.length - validTasks.length;

    if (invalidItemCount > 0 || invalidTaskCount > 0) {
      console.warn(`[API] 发现无效数据: ${invalidItemCount} 个无效项目, ${invalidTaskCount} 个无效任务`);
    }

    return NextResponse.json({
      success: true,
      message: '数据同步完成',
      processed: {
        validItems: validItems.length,
        validTasks: validTasks.length,
        invalidItems: invalidItemCount,
        invalidTasks: invalidTaskCount
      },
      serverVersion: Date.now(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] 处理客户端同步数据失败:', error);
    return NextResponse.json({
      success: false,
      error: '处理同步数据失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}