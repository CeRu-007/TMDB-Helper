import { NextRequest, NextResponse } from 'next/server';
import { writeItems, readItems } from '@/lib/server-storage';
import { TMDBItem } from '@/lib/storage';

/**
 * POST /api/migrate-storage - 将localStorage数据迁移到文件存储
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] 开始存储迁移');
    
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
    
    // 读取现有的服务器端数据
    const existingItems = readItems();
    console.log(`[API] 现有服务器数据: ${existingItems.length} 个项目`);
    console.log(`[API] 待迁移数据: ${validItems.length} 个项目`);
    
    // 合并数据，避免重复
    const mergedItems = [...existingItems];
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const newItem of validItems) {
      const existingIndex = mergedItems.findIndex(item => item.id === newItem.id);
      
      if (existingIndex >= 0) {
        // 更新现有项目
        mergedItems[existingIndex] = {
          ...mergedItems[existingIndex],
          ...newItem,
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
        console.log(`[API] 更新项目: ${newItem.title} (ID: ${newItem.id})`);
      } else {
        // 添加新项目
        mergedItems.push({
          ...newItem,
          createdAt: newItem.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        addedCount++;
        console.log(`[API] 添加项目: ${newItem.title} (ID: ${newItem.id})`);
      }
    }
    
    // 写入文件
    const success = writeItems(mergedItems);
    
    if (success) {
      console.log(`[API] 迁移成功: 添加 ${addedCount} 个，更新 ${updatedCount} 个项目`);
      return NextResponse.json({
        success: true,
        message: '数据迁移成功',
        stats: {
          totalItems: mergedItems.length,
          addedItems: addedCount,
          updatedItems: updatedCount,
          originalItems: existingItems.length
        }
      }, { status: 200 });
    } else {
      throw new Error('写入文件失败');
    }
  } catch (error) {
    console.error('[API] 存储迁移失败:', error);
    return NextResponse.json({
      success: false,
      error: '存储迁移失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/migrate-storage - 获取迁移状态
 */
export async function GET(request: NextRequest) {
  try {
    const serverItems = readItems();
    
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
    console.error('[API] 获取迁移状态失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取迁移状态失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
