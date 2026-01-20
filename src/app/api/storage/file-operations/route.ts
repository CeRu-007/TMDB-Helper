import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TMDBItem } from '@/lib/data/storage';

// 获取用户数据文件路径
function getUserDataFile(userId?: string): string {
  // 如果没有提供用户ID，使用默认的管理员用户
  const actualUserId = userId || 'user_admin_system';
  const DATA_DIR = path.join(process.cwd(), 'data');
  const USERS_DIR = path.join(DATA_DIR, 'users');
  
  // 确保用户数据目录存在
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR, { recursive: true });
  }
  
  const userDir = path.join(USERS_DIR, actualUserId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  
  return path.join(userDir, 'tmdb_items.json');
}

// 数据文件路径（保留作为备用）
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
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id') || 'user_admin_system';
    const userDataFile = getUserDataFile(userId);

    // 确保用户数据目录存在
    const userDataDir = path.dirname(userDataFile);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    if (!fs.existsSync(userDataFile)) {
      // 检查是否存在旧的数据文件需要迁移
      ensureDataDir();
      if (fs.existsSync(DATA_FILE)) {
        
        fs.copyFileSync(DATA_FILE, userDataFile);
        
      } else {
        // 如果文件不存在，返回空数组
        return NextResponse.json({ items: [] });
      }
    }
    
    const data = fs.readFileSync(userDataFile, 'utf-8');
    const items = JSON.parse(data);
    
    return NextResponse.json({ 
      items,
      success: true,
      message: `成功读取 ${items.length} 个项目`,
      dataPath: userDataFile
    });
  } catch (error) {
    
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
    
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id') || 'user_admin_system';
    const userDataFile = getUserDataFile(userId);

    // 确保用户数据目录存在
    const userDataDir = path.dirname(userDataFile);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    // 如果需要备份且原文件存在
    if (backup && fs.existsSync(userDataFile)) {
      const backupFile = path.join(userDataDir, `tmdb_items_backup_${Date.now()}.json`);
      fs.copyFileSync(userDataFile, backupFile);
      
    }
    
    // 写入新数据
    fs.writeFileSync(userDataFile, JSON.stringify(items, null, 2), 'utf-8');
    
    return NextResponse.json({ 
      success: true,
      message: `成功导入 ${items.length} 个项目`,
      itemCount: items.length,
      dataPath: userDataFile
    });
  } catch (error) {
    
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
    
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id') || 'user_admin_system';
    const userDataFile = getUserDataFile(userId);

    // 确保用户数据目录存在
    const userDataDir = path.dirname(userDataFile);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    let existingItems: TMDBItem[] = [];
    
    // 读取现有数据
    if (fs.existsSync(userDataFile)) {
      try {
        const existingData = fs.readFileSync(userDataFile, 'utf-8');
        existingItems = JSON.parse(existingData);
      } catch (error) {
        
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
    fs.writeFileSync(userDataFile, JSON.stringify(finalItems, null, 2), 'utf-8');
    
    return NextResponse.json({ 
      success: true,
      message: `导入完成`,
      stats: {
        total: finalItems.length,
        added: addedCount,
        updated: updatedCount,
        skipped: skippedCount
      },
      dataPath: userDataFile
    });
  } catch (error) {
    
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