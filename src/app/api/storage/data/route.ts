import { NextRequest, NextResponse } from 'next/server';
import { ServerStorageManager } from '@/lib/data/server-storage-manager';
import { getUserIdFromRequest } from '@/lib/auth/user-utils';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import type { TMDBItem } from '@/types/tmdb-item';
import type { ScheduledTask } from '@/lib/data/storage/types';

// POST /api/storage/data - 导入数据
export async function POST(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();
    
    const data = await request.json();
    const { items, tasks = [] } = data;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        {
          error: '无效的导入数据',
          success: false,
        },
        { status: 400 },
      );
    }

    // 获取用户ID
    const userId = await getUserIdFromRequest(request);
    logger.info(
      `[API] 导入数据 - 用户ID: ${userId}, 项目数: ${items.length}, 任务数: ${tasks.length}`,
    );

    // 类型检查并补充缺失字段
    const validItems: TMDBItem[] = [];
    for (const item of items) {
      if (item && typeof item === 'object' && item.id && item.title && item.mediaType) {
        // 补充缺失字段
        if (!item.createdAt) {
          item.createdAt = new Date().toISOString();
        }
        if (!item.updatedAt) {
          item.updatedAt = new Date().toISOString();
        }
        validItems.push(item as TMDBItem);
      }
    }

    const validTasks: ScheduledTask[] = [];
    for (const task of tasks) {
      if (task && typeof task === 'object' && task.id && task.name && task.itemId) {
        // 补充缺失字段
        if (!task.createdAt) {
          task.createdAt = new Date().toISOString();
        }
        if (!task.updatedAt) {
          task.updatedAt = new Date().toISOString();
        }
        if (!task.type) {
          task.type = 'tmdb-import';
        }
        validTasks.push(task as ScheduledTask);
      }
    }

    // 使用 ServerStorageManager 处理导入
    const success = ServerStorageManager.importData(validItems);
    
    // 导入任务
    let tasksImported = 0;
    for (const task of validTasks) {
      if (ServerStorageManager.addTask(task)) {
        tasksImported++;
      }
    }

    if (success) {
      logger.info(`[API] 导入成功: ${validItems.length} 个项目, ${tasksImported} 个任务`);
    }

    return NextResponse.json(
      {
        success,
        stats: {
          itemsImported: validItems.length,
          tasksImported,
          itemsSkipped: items.length - validItems.length,
          tasksSkipped: tasks.length - validTasks.length,
        },
        userId,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('导入数据失败', error)
    return NextResponse.json(
      {
        error: ErrorHandler.toUserMessage(error),
        success: false,
      },
      { status: ErrorHandler.getStatusCode(error) },
    );
  }
}

// GET /api/storage/data - 导出数据
export async function GET(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();
    
    // 获取用户ID
    const userId = await getUserIdFromRequest(request);
    logger.info(`[API] 导出数据 - 用户ID: ${userId}`);

    const { items, tasks } = ServerStorageManager.exportData();

    return NextResponse.json(
      {
        items,
        tasks,
        version: '2.0.0', // 数据库版本
        exportDate: new Date().toISOString(),
        userId,
        stats: {
          itemCount: items.length,
          taskCount: tasks.length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('导出数据失败', error)
    return NextResponse.json(
      {
        error: ErrorHandler.toUserMessage(error),
        items: [],
        tasks: [],
      },
      { status: ErrorHandler.getStatusCode(error) },
    );
  }
}