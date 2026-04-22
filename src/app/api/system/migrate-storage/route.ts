import { NextRequest, NextResponse } from 'next/server';
import { ServerStorageManager } from '@/lib/data/server-storage-manager';
import type { TMDBItem } from '@/types/tmdb-item';

/**
 * POST /api/system/migrate-storage - 将localStorage数据迁移到数据库存储
 */
export async function POST(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();
    
    const { items } = await request.json();
    
    if (!Array.isArray(items)) {
      return NextResponse.json({
        success: false,
        error: '无效的数据格式，期望项目数组'
      }, { status: 400 });
    }
    
    // 验证项目数据格式
    const validItems: TMDBItem[] = items.filter(item => {
      return item && 
             typeof item.id === 'string' && 
             typeof item.title === 'string' &&
             item.id.trim() !== '' &&
             item.title.trim() !== '';
    });
    
    if (validItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: '没有有效的项目数据'
      }, { status: 400 });
    }
    
    // 读取现有的数据库数据
    const existingItems = await ServerStorageManager.getItems();

    // 合并数据，避免重复
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const newItem of validItems) {
      const existingItem = existingItems.find(item => item.id === newItem.id);
      
      if (existingItem) {
        // 更新现有项目
        await ServerStorageManager.updateItem({
          ...existingItem,
          ...newItem,
          updatedAt: new Date().toISOString()
        });
        updatedCount++;
      } else {
        // 添加新项目
        await ServerStorageManager.addItem({
          ...newItem,
          createdAt: newItem.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        addedCount++;
      }
    }
    
    const totalItems = await ServerStorageManager.getItems();
    
    return NextResponse.json({
      success: true,
      message: '数据迁移成功',
      stats: {
        totalItems: totalItems.length,
        addedItems: addedCount,
        updatedItems: updatedCount,
        originalItems: existingItems.length
      }
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '存储迁移失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/system/migrate-storage - 获取迁移状态
 */
export async function GET(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();
    
    const serverItems = await ServerStorageManager.getItems();
    
    return NextResponse.json({
      success: true,
      serverStorage: {
        itemCount: serverItems.length,
        items: serverItems.map(item => ({
          id: item.id,
          title: item.title,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }))
      }
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '获取迁移状态失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
