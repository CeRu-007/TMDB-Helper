import { NextRequest, NextResponse } from 'next/server';
import { autoOptimizeAllUsers } from '@/lib/utils/auto-optimize';

/**
 * 自动优化API
 * 用于在应用启动时自动优化格式化的JSON文件
 */

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'startup-check') {
      
      const result = autoOptimizeAllUsers();
      
      return NextResponse.json({
        success: true,
        message: '自动优化检查完成',
        ...result
      });
    }

    return NextResponse.json({
      success: false,
      error: '不支持的操作'
    }, { status: 400 });

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    
    const result = autoOptimizeAllUsers();
    
    return NextResponse.json({
      success: true,
      message: '手动优化完成',
      ...result
    });

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
