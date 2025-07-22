import { NextRequest, NextResponse } from 'next/server';
import { addItem, updateItem, deleteItem } from '@/lib/server-storage';
import { addUserItem, updateUserItem, deleteUserItem } from '@/lib/user-aware-storage';
import { AuthMiddleware, getUserIdFromAuthRequest } from '@/lib/auth-middleware';
import { TMDBItem } from '@/lib/storage';

// POST /api/storage/item - 添加新项目（用户隔离）
export const POST = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const data = await request.json();
    const item = data.item as TMDBItem;

    if (!item || !item.id) {
      return NextResponse.json({ error: '无效的项目数据' }, { status: 400 });
    }

    // 从认证中间件获取用户ID
    const userId = getUserIdFromAuthRequest(request);

    if (!userId) {
      return NextResponse.json({ error: '缺少用户身份信息' }, { status: 400 });
    }

    console.log(`[API] 用户 ${userId} 添加项目: ${item.title}`);

    const success = addUserItem(userId, item);

    if (success) {
      return NextResponse.json({ success: true, item, userId }, { status: 201 });
    } else {
      return NextResponse.json({ error: '添加项目失败' }, { status: 500 });
    }
  } catch (error) {
    console.error('添加项目失败:', error);
    return NextResponse.json(
      { error: '添加项目失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});

// PUT /api/storage/item - 更新项目（用户隔离）
export const PUT = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const data = await request.json();
    const item = data.item as TMDBItem;

    if (!item || !item.id) {
      return NextResponse.json({ error: '无效的项目数据' }, { status: 400 });
    }

    // 从认证中间件获取用户ID
    const userId = getUserIdFromAuthRequest(request);

    if (!userId) {
      return NextResponse.json({ error: '缺少用户身份信息' }, { status: 400 });
    }

    console.log(`[API] 用户 ${userId} 更新项目: ${item.title}`);

    const success = updateUserItem(userId, item);

    if (success) {
      return NextResponse.json({ success: true, item, userId }, { status: 200 });
    } else {
      return NextResponse.json({ error: '更新项目失败，项目可能不存在' }, { status: 404 });
    }
  } catch (error) {
    console.error('更新项目失败:', error);
    return NextResponse.json(
      { error: '更新项目失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});

// DELETE /api/storage/item - 删除项目（用户隔离）
export const DELETE = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少项目ID' }, { status: 400 });
    }

    // 从认证中间件获取用户ID
    const userId = getUserIdFromAuthRequest(request);

    if (!userId) {
      return NextResponse.json({ error: '缺少用户身份信息' }, { status: 400 });
    }

    console.log(`[API] 用户 ${userId} 删除项目: ${id}`);

    const success = deleteUserItem(userId, id);

    if (success) {
      return NextResponse.json({ success: true, userId }, { status: 200 });
    } else {
      return NextResponse.json({ error: '删除项目失败，项目可能不存在' }, { status: 404 });
    }
  } catch (error) {
    console.error('删除项目失败:', error);
    return NextResponse.json(
      { error: '删除项目失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});