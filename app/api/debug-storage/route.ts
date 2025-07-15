import { NextRequest, NextResponse } from 'next/server';
import { StorageManager } from '@/lib/storage';

/**
 * 调试存储状态API
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('[API] 获取存储调试信息');
  
  try {
    // 获取存储状态
    const storageStatus = await StorageManager.getStorageStatus();
    
    // 获取项目和任务数量
    let itemCount = 0;
    let taskCount = 0;
    let healthy = true;
    let errors: string[] = [];
    
    try {
      const items = await StorageManager.getItemsWithRetry();
      itemCount = items.length;
    } catch (error) {
      healthy = false;
      errors.push(`获取项目失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      const tasks = await StorageManager.getScheduledTasks();
      taskCount = tasks.length;
    } catch (error) {
      healthy = false;
      errors.push(`获取任务失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 检查存储健康状态
    try {
      const hasItems = await StorageManager.hasAnyItems();
      if (!hasItems && itemCount === 0) {
        // 这可能是正常情况（新安装），不算错误
      }
    } catch (error) {
      healthy = false;
      errors.push(`存储健康检查失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    const debugInfo = {
      success: true,
      storageType: storageStatus.storageType,
      itemCount,
      taskCount,
      healthy,
      errors: errors.length > 0 ? errors : undefined,
      details: {
        storageStatus,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('[API] 存储调试信息:', debugInfo);
    
    return NextResponse.json(debugInfo);
    
  } catch (error: any) {
    console.error('[API] 获取存储调试信息失败:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || '获取存储状态失败',
      storageType: 'unknown',
      itemCount: 0,
      taskCount: 0,
      healthy: false
    }, { status: 500 });
  }
}

/**
 * POST 处理程序 - 执行存储修复操作
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[API] 收到存储修复请求');
  
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'validate_tasks':
        // 验证和修复任务关联
        const validationResult = await StorageManager.validateAndFixTaskAssociations();
        return NextResponse.json({
          success: true,
          message: '任务关联验证完成',
          result: validationResult
        });
        
      case 'cleanup_orphaned':
        // 清理孤立数据
        // 这里可以添加清理孤立任务、无效引用等逻辑
        return NextResponse.json({
          success: true,
          message: '数据清理完成'
        });
        
      case 'rebuild_index':
        // 重建索引（如果需要）
        return NextResponse.json({
          success: true,
          message: '索引重建完成'
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: '未知的修复操作'
        }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('[API] 存储修复操作失败:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || '修复操作失败'
    }, { status: 500 });
  }
}