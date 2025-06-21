import { NextRequest, NextResponse } from 'next/server';
import { addItem, updateItem, deleteItem } from '@/lib/server-storage';
import { TMDBItem } from '@/lib/storage';

// POST /api/storage/item - 添加新项目
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const item = data.item as TMDBItem;
    
    if (!item || !item.id) {
      return NextResponse.json({ error: '无效的项目数据' }, { status: 400 });
    }
    
    const success = addItem(item);
    
    if (success) {
      return NextResponse.json({ success: true, item }, { status: 201 });
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
}

// PUT /api/storage/item - 更新项目
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const item = data.item as TMDBItem;
    
    if (!item || !item.id) {
      return NextResponse.json({ error: '无效的项目数据' }, { status: 400 });
    }
    
    const success = updateItem(item);
    
    if (success) {
      return NextResponse.json({ success: true, item }, { status: 200 });
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
}

// DELETE /api/storage/item - 删除项目
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '缺少项目ID' }, { status: 400 });
    }
    
    const success = deleteItem(id);
    
    if (success) {
      return NextResponse.json({ success: true }, { status: 200 });
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
} 