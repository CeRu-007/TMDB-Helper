import { NextRequest, NextResponse } from 'next/server';
import { ServerStorageManager } from '@/lib/data/server-storage-manager';
import type { TMDBItem } from '@/types/tmdb-item';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/storage/file-operations - 从数据库读取项目数据
 */
export async function GET(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();
    
    const items = await ServerStorageManager.getItems();
    
    return NextResponse.json({ 
      items,
      success: true,
      message: `成功读取 ${items.length} 个项目`
    });
  } catch (error) {
    logger.error('读取数据失败', error);
    return NextResponse.json(
      {
        error: ErrorHandler.toUserMessage(error),
        success: false
      },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}

/**
 * POST /api/storage/file-operations - 批量写入项目数据到数据库
 */
export async function POST(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();
    
    const { items, backup = true } = await request.json();
    
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: '数据格式错误：items必须是数组', success: false },
        { status: 400 }
      );
    }
    
    // 验证项目数据格式
    const validItems: TMDBItem[] = items.filter(item => {
      return item && 
             typeof item.id === 'string' && 
             typeof item.title === 'string' &&
             item.id.trim() !== '' &&
             item.title.trim() !== '';
    });
    
    // 清空现有数据并导入新数据
    const existingItems = await ServerStorageManager.getItems();
    
    // 如果需要备份，记录备份数量
    const backupCount = backup ? existingItems.length : 0;
    
    // 清空现有数据
    await ServerStorageManager.clearAllItems();
    
    // 批量添加新数据
    let addedCount = 0;
    for (const item of validItems) {
      const success = await ServerStorageManager.addItem({
        ...item,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      if (success) addedCount++;
    }
    
    return NextResponse.json({ 
      success: true,
      message: `成功导入 ${addedCount} 个项目`,
      itemCount: addedCount,
      backupCount
    });
  } catch (error) {
    logger.error('写入数据失败', error);
    return NextResponse.json(
      {
        error: ErrorHandler.toUserMessage(error),
        success: false
      },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}

/**
 * PUT /api/storage/file-operations - 合并数据（追加/更新模式）
 */
export async function PUT(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init();
    
    const { items, mode = 'replace' } = await request.json();
    
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: '数据格式错误：items必须是数组', success: false },
        { status: 400 }
      );
    }
    
    // 验证项目数据格式
    const validItems: TMDBItem[] = items.filter(item => {
      return item && 
             typeof item.id === 'string' && 
             typeof item.title === 'string' &&
             item.id.trim() !== '' &&
             item.title.trim() !== '';
    });
    
    const existingItems = await ServerStorageManager.getItems();
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    if (mode === 'merge' || mode === 'append') {
      // 合并/追加模式：更新现有项目，添加新项目
      for (const newItem of validItems) {
        const existingItem = existingItems.find(item => item.id === newItem.id);
        
        if (existingItem) {
          if (mode === 'merge') {
            // 更新现有项目
            await ServerStorageManager.updateItem({
              ...existingItem,
              ...newItem,
              updatedAt: new Date().toISOString()
            });
            updatedCount++;
          } else {
            // append 模式下跳过已存在的项目
            skippedCount++;
          }
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
    } else {
      // 替换模式（默认）
      await ServerStorageManager.clearAllItems();
      for (const item of validItems) {
        await ServerStorageManager.addItem({
          ...item,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        addedCount++;
      }
    }
    
    const finalItems = await ServerStorageManager.getItems();
    
    return NextResponse.json({ 
      success: true,
      message: `导入完成`,
      stats: {
        total: finalItems.length,
        added: addedCount,
        updated: updatedCount,
        skipped: skippedCount
      }
    });
  } catch (error) {
    logger.error('合并数据失败', error);
    return NextResponse.json(
      {
        error: ErrorHandler.toUserMessage(error),
        success: false
      },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}
