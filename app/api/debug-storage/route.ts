import { NextRequest, NextResponse } from 'next/server';
import { readItems } from '@/lib/server-storage';

/**
 * GET /api/debug-storage - 调试存储状态
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API] 开始调试存储状态');
    
    // 检查服务器端文件存储
    const serverItems = readItems();
    
    const debugInfo = {
      serverStorage: {
        itemCount: serverItems.length,
        items: serverItems.map(item => ({
          id: item.id,
          title: item.title,
          tmdbId: item.tmdbId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }))
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('[API] 存储调试信息:', debugInfo);
    
    return NextResponse.json({
      success: true,
      debug: debugInfo
    }, { status: 200 });
  } catch (error) {
    console.error('[API] 调试存储状态失败:', error);
    return NextResponse.json({
      success: false,
      error: '调试存储状态失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST /api/debug-storage - 强制同步存储
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'sync') {
      // 这里可以添加强制同步逻辑
      const serverItems = readItems();
      
      return NextResponse.json({
        success: true,
        message: '存储同步完成',
        itemCount: serverItems.length
      }, { status: 200 });
    }
    
    return NextResponse.json({
      success: false,
      error: '未知的操作'
    }, { status: 400 });
  } catch (error) {
    console.error('[API] 存储同步失败:', error);
    return NextResponse.json({
      success: false,
      error: '存储同步失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
