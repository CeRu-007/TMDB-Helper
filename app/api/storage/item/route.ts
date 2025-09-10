import { NextRequest, NextResponse } from 'next/server';
import { addItem, updateItem, deleteItem } from '@/lib/server-storage';
import { addUserItem, updateUserItem, deleteUserItem } from '@/lib/user-aware-storage';
import { TMDBItem } from '@/lib/storage';

const ADMIN_USER_ID = 'user_admin_system'; // 固定的管理员用户ID

// POST /api/storage/item - 添加新项目（管理员用户）
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const item = data.item as TMDBItem;

    if (!item || !item.id) {
      return NextResponse.json({
        error: '无效的项目数据',
        success: false
      }, { status: 400 });
    }

    const success = addUserItem(ADMIN_USER_ID, item);

    if (success) {
      return NextResponse.json({ success: true, item, userId: ADMIN_USER_ID }, { status: 201 });
    } else {
      return NextResponse.json({
        error: '添加项目失败',
        success: false
      }, { status: 500 });
    }
  } catch (error) {
    
    return NextResponse.json({
      error: '服务器内部错误',
      success: false,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PUT /api/storage/item - 更新项目（管理员用户）
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const item = data.item as TMDBItem;

    if (!item || !item.id) {
      return NextResponse.json({
        error: '无效的项目数据',
        success: false
      }, { status: 400 });
    }

    const success = updateUserItem(ADMIN_USER_ID, item);

    if (success) {
      return NextResponse.json({ success: true, item, userId: ADMIN_USER_ID }, { status: 200 });
    } else {
      return NextResponse.json({
        error: '更新项目失败，项目可能不存在',
        success: false
      }, { status: 404 });
    }
  } catch (error) {
    
    return NextResponse.json({
      error: '服务器内部错误',
      success: false,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE /api/storage/item - 删除项目（管理员用户）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        error: '缺少项目ID',
        success: false
      }, { status: 400 });
    }

    const success = deleteUserItem(ADMIN_USER_ID, id);

    if (success) {
      return NextResponse.json({ success: true, userId: ADMIN_USER_ID }, { status: 200 });
    } else {
      return NextResponse.json({
        error: '删除项目失败，项目可能不存在',
        success: false
      }, { status: 404 });
    }
  } catch (error) {
    
    return NextResponse.json({
      error: '服务器内部错误',
      success: false,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}