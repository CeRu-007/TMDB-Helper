import { NextRequest, NextResponse } from 'next/server';
import { TMDBItem, ScheduledTask } from '@/lib/types';
import { ServerStorageManager } from '@/lib/data/server-storage-manager';
import { getUserIdFromRequest } from '@/lib/auth/user-utils';

// POST /api/storage/data - 导入数据
export async function POST(request: NextRequest) {
  try {
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
    console.log(
      `[API] 导入数据 - 用户ID: ${userId}, 项目数: ${items.length}, 任务数: ${tasks.length}`,
    );

    // 类型检查
    const validItems = items.filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        item.id &&
        item.title &&
        item.mediaType &&
        item.tmdbId,
    ) as TMDBItem[];

    const validTasks = tasks.filter(
      (task) =>
        task && typeof task === 'object' && task.id && task.name && task.itemId,
    ) as ScheduledTask[];

    // 使用ServerStorageManager处理导入（服务器端直接写入文件系统）
    await ServerStorageManager.importData(validItems, validTasks);

    // 任务数据暂时保存到客户端localStorage
    if (validTasks.length > 0) {
      // 这里可以添加任务数据的处理逻辑
      console.log(`[API] 导入 ${validTasks.length} 个任务（暂时仅记录）`);
    }

    return NextResponse.json(
      {
        success: true,
        stats: {
          itemsImported: validItems.length,
          tasksImported: validTasks.length,
          itemsSkipped: items.length - validItems.length,
          tasksSkipped: tasks.length - validTasks.length,
        },
        userId,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: '服务器内部错误',
        success: false,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// GET /api/storage/data - 导出数据
export async function GET(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getUserIdFromRequest(request);
    console.log(`[API] 导出数据 - 用户ID: ${userId}`);

    const { items, tasks } = await ServerStorageManager.exportData();

    return NextResponse.json(
      {
        items,
        tasks,
        version: '1.0.0',
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
    return NextResponse.json(
      {
        error: '导出数据失败',
        details: error instanceof Error ? error.message : String(error),
        items: [],
        tasks: [],
      },
      { status: 500 },
    );
  }
}
