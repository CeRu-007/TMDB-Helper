import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TMDBItem } from '@/lib/storage';

// 数据文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'tmdb_items.json');

/**
 * 确保数据目录存在
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// GET /api/storage/file-operations - 直接读取数据文件
export async function GET() {
  try {
    ensureDataDir();
    
    if (!fs.existsSync(DATA_FILE)) {
      // 如果文件不存在，返回空数组
      return NextResponse.json({ items: [] });
    }
    
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const items = JSON.parse(data);
    
    return NextResponse.json({ 
      items,
      success: true,
      message: `成功读取 ${items.length} 个项目`
    });
  } catch (error) {
    console.error('读取数据文件失败:', error);
    return NextResponse.json(
      { 
        error: '读取数据文件失败', 
        details: error instanceof Error ? error.message : String(error),
        success: false
      },
      { status: 500 }
    );
  }
}

// POST /api/storage/file-operations - 直接写入数据文件
export async function POST(request: NextRequest) {
  try {
    const { items, backup = true } = await request.json();
    
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: '数据格式错误：items必须是数组', success: false },
        { status: 400 }
      );
    }
    
    ensureDataDir();
    
    // 如果需要备份且原文件存在
    if (backup && fs.existsSync(DATA_FILE)) {
      const backupFile = path.join(DATA_DIR, `tmdb_items_backup_${Date.now()}.json`);
      fs.copyFileSync(DATA_FILE, backupFile);
      console.log(`已创建备份文件: ${backupFile}`);
    }
    
    // 写入新数据
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
    
    return NextResponse.json({ 
      success: true,
      message: `成功导入 ${items.length} 个项目`,
      itemCount: items.length
    });
  } catch (error) {
    console.error('写入数据文件失败:', error);
    return NextResponse.json(
      { 
        error: '写入数据文件失败', 
        details: error instanceof Error ? error.message : String(error),
        success: false
      },
      { status: 500 }
    );
  }
}

// PUT /api/storage/file-operations - 合并数据（追加模式）
export async function PUT(request: NextRequest) {
  try {
    const { items, mode = 'replace' } = await request.json();
    
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: '数据格式错误：items必须是数组', success: false },
        { status: 400 }
      );
    }
    
    ensureDataDir();
    
    let existingItems: TMDBItem[] = [];
    
    // 读取现有数据
    if (fs.existsSync(DATA_FILE)) {
      try {
        const existingData = fs.readFileSync(DATA_FILE, 'utf-8');
        existingItems = JSON.parse(existingData);
      } catch (error) {
        console.warn('读取现有数据失败，将创建新文件:', error);
      }
    }
    
    let finalItems: TMDBItem[] = [];
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    if (mode === 'merge') {
      // 合并模式：更新现有项目，添加新项目
      const existingMap = new Map(existingItems.map(item => [item.id, item]));
      
      for (const newItem of items) {
        if (existingMap.has(newItem.id)) {
          // 更新现有项目
          existingMap.set(newItem.id, { ...existingMap.get(newItem.id), ...newItem, updatedAt: new Date().toISOString() });
          updatedCount++;
        } else {
          // 添加新项目
          existingMap.set(newItem.id, newItem);
          addedCount++;
        }
      }
      
      finalItems = Array.from(existingMap.values());
    } else if (mode === 'append') {
      // 追加模式：只添加不存在的项目
      const existingIds = new Set(existingItems.map(item => item.id));
      
      finalItems = [...existingItems];
      for (const newItem of items) {
        if (!existingIds.has(newItem.id)) {
          finalItems.push(newItem);
          addedCount++;
        } else {
          skippedCount++;
        }
      }
    } else {
      // 替换模式（默认）
      finalItems = items;
      addedCount = items.length;
    }
    
    // 写入数据
    fs.writeFileSync(DATA_FILE, JSON.stringify(finalItems, null, 2), 'utf-8');
    
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
    console.error('合并数据失败:', error);
    return NextResponse.json(
      { 
        error: '合并数据失败', 
        details: error instanceof Error ? error.message : String(error),
        success: false
      },
      { status: 500 }
    );
  }
}
