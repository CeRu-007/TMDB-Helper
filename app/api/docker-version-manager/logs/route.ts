import { NextRequest, NextResponse } from 'next/server'
import memoryLogger from '@/lib/memory-logger'

/**
 * GET /api/docker-version-manager/logs - 获取操作日志
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lines = parseInt(searchParams.get('lines') || '100')
    const format = searchParams.get('format') || 'json'
    
    // 从内存获取日志
    const recentLogs = memoryLogger.getLogs(lines)
    
    if (format === 'text') {
      // 返回纯文本格式
      const textLogs = recentLogs
        .map(logEntry => 
          `[${logEntry.timestamp}] ${logEntry.operation}: ${logEntry.success ? 'SUCCESS' : 'FAILED'} - ${JSON.stringify(logEntry.details)}`
        )
        .join('\n')
      
      return new NextResponse(textLogs, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="docker-version-manager.log"'
        }
      })
    }
    
    // 返回JSON格式
    return NextResponse.json({
      success: true,
      data: recentLogs,
      total: recentLogs.length,
      message: recentLogs.length === 0 ? '暂无日志记录' : undefined
    })
    
  } catch (error) {
    console.error('获取日志失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取日志失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * DELETE /api/docker-version-manager/logs - 清空日志
 */
export async function DELETE() {
  try {
    memoryLogger.clear()
    
    return NextResponse.json({
      success: true,
      message: '内存日志已清空'
    })
    
  } catch (error) {
    console.error('清空日志失败:', error)
    return NextResponse.json({
      success: false,
      error: '清空日志失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}