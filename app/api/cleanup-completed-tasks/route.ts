import { NextRequest, NextResponse } from 'next/server';
import { StorageManager, ScheduledTask, TMDBItem } from '@/lib/storage';
import { readItems } from '@/lib/server-storage';
import { readScheduledTasks } from '@/lib/server-scheduled-tasks';

/**
 * 清理已完结项目的定时任务API
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[API] 收到清理已完结项目定时任务请求');
  
  try {
    // 获取所有项目数据
    let items: TMDBItem[] = [];
    try {
      items = readItems();
      console.log(`[API] 从服务器存储读取到 ${items.length} 个项目`);
    } catch (serverError) {
      console.warn(`[API] 服务器存储读取失败，尝试从StorageManager获取:`, serverError);
      items = await StorageManager.getItemsWithRetry();
      console.log(`[API] 从StorageManager获取到 ${items.length} 个项目`);
    }

    // 获取所有定时任务
    let tasks: ScheduledTask[] = [];
    try {
      tasks = readScheduledTasks();
      console.log(`[API] 从服务端文件获取到 ${tasks.length} 个定时任务`);
    } catch (serverError) {
      console.warn(`[API] 服务端文件读取失败，尝试从StorageManager获取:`, serverError);
      tasks = await StorageManager.getScheduledTasks();
      console.log(`[API] 从StorageManager获取到 ${tasks.length} 个定时任务`);
    }

    // 筛选启用了自动删除的任务
    const autoDeleteTasks = tasks.filter(task => 
      task.enabled && task.action.autoDeleteWhenCompleted
    );

    if (autoDeleteTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有启用自动删除的定时任务',
        deletedCount: 0,
        checkedTasks: 0
      });
    }

    console.log(`[API] 找到 ${autoDeleteTasks.length} 个启用自动删除的定时任务`);

    const deletedTasks: ScheduledTask[] = [];
    const completedProjects: TMDBItem[] = [];

    // 检查每个任务对应的项目状态
    for (const task of autoDeleteTasks) {
      try {
        // 查找对应的项目
        const relatedItem = items.find(item => item.id === task.itemId);
        
        if (!relatedItem) {
          console.log(`[API] 任务 ${task.name} 的关联项目不存在，跳过`);
          continue;
        }

        // 检查项目是否已完结
        const isCompleted = relatedItem.status === 'completed' || relatedItem.completed === true;
        
        if (isCompleted) {
          console.log(`[API] 发现已完结项目 ${relatedItem.title} 的定时任务 ${task.name}`);
          
          // 删除任务
          const deleteSuccess = await StorageManager.deleteScheduledTask(task.id);
          
          if (deleteSuccess) {
            deletedTasks.push(task);
            completedProjects.push(relatedItem);
            console.log(`[API] ✓ 成功删除已完结项目的定时任务: ${task.name}`);
          } else {
            console.error(`[API] ✗ 删除定时任务失败: ${task.name}`);
          }
        }
      } catch (error) {
        console.error(`[API] 处理任务 ${task.id} 时出错:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `清理完成，共删除 ${deletedTasks.length} 个已完结项目的定时任务`,
      deletedCount: deletedTasks.length,
      checkedTasks: autoDeleteTasks.length,
      deletedTasks: deletedTasks.map(task => ({
        id: task.id,
        name: task.name,
        itemTitle: task.itemTitle
      })),
      completedProjects: completedProjects.map(item => ({
        id: item.id,
        title: item.title,
        status: item.status,
        completed: item.completed
      }))
    });

  } catch (error: any) {
    console.error('[API] 清理已完结项目定时任务失败:', error);
    return NextResponse.json({ 
      success: false,
      error: '清理已完结项目定时任务失败', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET 处理程序 - 获取可清理的任务信息
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('[API] 收到获取可清理任务信息请求');
  
  try {
    // 获取所有项目数据
    let items: TMDBItem[] = [];
    try {
      items = readItems();
    } catch (serverError) {
      items = await StorageManager.getItemsWithRetry();
    }

    // 获取所有定时任务
    let tasks: ScheduledTask[] = [];
    try {
      tasks = readScheduledTasks();
    } catch (serverError) {
      tasks = await StorageManager.getScheduledTasks();
    }

    // 筛选启用了自动删除的任务
    const autoDeleteTasks = tasks.filter(task => 
      task.enabled && task.action.autoDeleteWhenCompleted
    );

    const cleanupCandidates: any[] = [];

    // 检查每个任务对应的项目状态
    for (const task of autoDeleteTasks) {
      const relatedItem = items.find(item => item.id === task.itemId);
      
      if (relatedItem) {
        const isCompleted = relatedItem.status === 'completed' || relatedItem.completed === true;
        
        cleanupCandidates.push({
          task: {
            id: task.id,
            name: task.name,
            itemTitle: task.itemTitle,
            enabled: task.enabled,
            lastRun: task.lastRun,
            nextRun: task.nextRun
          },
          project: {
            id: relatedItem.id,
            title: relatedItem.title,
            status: relatedItem.status,
            completed: relatedItem.completed,
            isCompleted
          },
          shouldDelete: isCompleted
        });
      } else {
        cleanupCandidates.push({
          task: {
            id: task.id,
            name: task.name,
            itemTitle: task.itemTitle,
            enabled: task.enabled,
            lastRun: task.lastRun,
            nextRun: task.nextRun
          },
          project: null,
          shouldDelete: false,
          reason: '关联项目不存在'
        });
      }
    }

    const deletableTasks = cleanupCandidates.filter(candidate => candidate.shouldDelete);

    return NextResponse.json({
      success: true,
      totalAutoDeleteTasks: autoDeleteTasks.length,
      deletableTasks: deletableTasks.length,
      candidates: cleanupCandidates
    });

  } catch (error: any) {
    console.error('[API] 获取可清理任务信息失败:', error);
    return NextResponse.json({ 
      success: false,
      error: '获取可清理任务信息失败', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
