import { NextRequest, NextResponse } from 'next/server';
import { taskScheduler } from '@/lib/scheduler';

/**
 * POST /api/validate-task-associations - 验证和修复所有任务的关联
 */
export async function POST(request: NextRequest) {
  try {
    
    const result = await taskScheduler.validateAndFixAllTaskAssociations();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          totalTasks: result.details.totalTasks,
          invalidTasks: result.details.invalidTasks,
          fixedTasks: result.details.fixedTasks,
          deletedTasks: result.details.deletedTasks,
          details: result.details.details
        }
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
        data: result.details
      }, { status: 500 });
    }
  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: '验证任务关联失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/validate-task-associations - 获取任务关联状态
 */
export async function GET(request: NextRequest) {
  try {
    // 这里可以添加获取当前任务关联状态的逻辑
    // 暂时返回基本信息
    return NextResponse.json({
      success: true,
      message: '请使用POST方法执行验证',
      endpoint: '/api/validate-task-associations',
      method: 'POST'
    }, { status: 200 });
  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: '获取任务关联状态失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
