import { NextRequest, NextResponse } from 'next/server';
import { ServerStorageManager } from '@/lib/data/server-storage-manager';
import { TMDBItem } from '@/types/tmdb-item';
import { getUserIdFromRequest } from '@/lib/auth/user-utils';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

const ADMIN_USER_ID = 'user_admin_system'; // 固定的管理员用户ID

// POST /api/storage/item - 添加新项目
export async function POST(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();
    
    const data = await request.json();
    const item = data.item as TMDBItem;

    if (!item || !item.id) {
      return NextResponse.json({
        error: '无效的项目数据',
        success: false
      }, { status: 400 });
    }

    // 确保时间戳存在
    if (!item.createdAt) {
      item.createdAt = new Date().toISOString();
    }
    if (!item.updatedAt) {
      item.updatedAt = new Date().toISOString();
    }

    // 获取用户ID
    const userId = await getUserIdFromRequest(request);

    const success = ServerStorageManager.addItem(item);

    if (success) {
      logger.info(`[API] 项目添加成功: ${item.title} (${item.id})`);
      return NextResponse.json({ success: true, item, userId }, { status: 201 });
    } else {
      return NextResponse.json({
        error: '添加项目失败',
        success: false
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('[API] 添加项目错误:', error);

    return NextResponse.json({
      error: ErrorHandler.toUserMessage(error),
      success: false,
    }, { status: ErrorHandler.getStatusCode(error) });
  }
}

// PUT /api/storage/item - 更新项目
export async function PUT(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();

    const data = await request.json();
    const item = data.item as TMDBItem;

    if (!item || !item.id) {
      return NextResponse.json({
        error: '无效的项目数据',
        success: false
      }, { status: 400 });
    }

    // 更新时间戳
    item.updatedAt = new Date().toISOString();

    // 获取用户ID
    const userId = await getUserIdFromRequest(request);

    const success = ServerStorageManager.updateItem(item);

    if (success) {
      return NextResponse.json({ success: true, item, userId }, { status: 200 });
    } else {
      return NextResponse.json({
        error: '更新项目失败，项目可能不存在',
        success: false
      }, { status: 404 });
    }
  } catch (error) {
    logger.error('更新项目失败', error)
    return NextResponse.json({
      error: ErrorHandler.toUserMessage(error),
      success: false,
    }, { status: ErrorHandler.getStatusCode(error) });
  }
}

// DELETE /api/storage/item - 删除项目
export async function DELETE(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        error: '缺少项目ID',
        success: false
      }, { status: 400 });
    }

    // 获取用户ID
    const userId = await getUserIdFromRequest(request);
    logger.info(`[API] 删除项目 - 用户ID: ${userId}, 项目ID: ${id}`);

    // 同时删除关联的定时任务
    const deletedTasksCount = ServerStorageManager.deleteTasksByItemId(id);
    
    const success = ServerStorageManager.deleteItem(id);

    if (success) {
      logger.info(`[API] 项目删除成功: ${id}，同时删除 ${deletedTasksCount} 个关联任务`);
      return NextResponse.json({ 
        success: true, 
        userId,
        deletedTasksCount 
      }, { status: 200 });
    } else {
      return NextResponse.json({
        error: '删除项目失败，项目可能不存在',
        success: false
      }, { status: 404 });
    }
  } catch (error) {
    logger.error('删除项目失败', error)
    return NextResponse.json({
      error: ErrorHandler.toUserMessage(error),
      success: false,
    }, { status: ErrorHandler.getStatusCode(error) });
  }
}
