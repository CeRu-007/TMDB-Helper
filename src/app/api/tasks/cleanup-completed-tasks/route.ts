import { NextRequest, NextResponse } from 'next/server';
import { ServerStorageManager } from '@/lib/data/server-storage-manager';
import type { ScheduledTask } from '@/lib/data/storage/types';
import type { TMDBItem } from '@/lib/database/schema';

// 类型定义
interface TaskInfo {
  id: string;
  name: string;
  itemTitle: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

interface ProjectInfo {
  id: string;
  title: string;
  status: string;
  completed: boolean;
  isCompleted?: boolean;
}

interface CleanupCandidate {
  task: TaskInfo;
  project: ProjectInfo | null;
  shouldDelete: boolean;
  reason?: string;
}

/**
 * 清理已完结项目的定时任务API
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();
    
    // 从数据库获取所有项目数据
    const items: TMDBItem[] = ServerStorageManager.getItems();

    // 从数据库获取所有定时任务
    const tasks: ScheduledTask[] = ServerStorageManager.getTasks();

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

    const deletedTasks: ScheduledTask[] = [];
    const completedProjects: TMDBItem[] = [];

    // 检查每个任务对应的项目状态
    for (const task of autoDeleteTasks) {
      try {
        // 查找对应的项目
        const relatedItem = items.find(item => item.id === task.itemId);
        
        if (!relatedItem) {
          
          continue;
        }

        // 检查项目是否已完结
        const isCompleted = relatedItem.status === 'completed' || relatedItem.completed === true;
        
        if (isCompleted) {
          
          // 删除任务
          const deleteSuccess = ServerStorageManager.deleteTask(task.id);
          
          if (deleteSuccess) {
            deletedTasks.push(task);
            completedProjects.push(relatedItem);
            
          } else {
            
          }
        }
      } catch (error) {
        
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

  } catch (error: unknown) {

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
  
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();
    
    // 从数据库获取所有项目数据
    const items: TMDBItem[] = ServerStorageManager.getItems();

    // 从数据库获取所有定时任务
    const tasks: ScheduledTask[] = ServerStorageManager.getTasks();

    // 筛选启用了自动删除的任务
    const autoDeleteTasks = tasks.filter(task => 
      task.enabled && task.action.autoDeleteWhenCompleted
    );

    const cleanupCandidates: CleanupCandidate[] = [];

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

  } catch (error: unknown) {

    return NextResponse.json({
      success: false,
      error: '获取可清理任务信息失败',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
