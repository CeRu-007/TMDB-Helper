import { type NextRequest, NextResponse } from 'next/server'
import { scheduleLogRepository } from '@/lib/data/schedule-log-repository'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!taskId) {
      return NextResponse.json({ error: '缺少 taskId 参数' }, { status: 400 })
    }

    const logs = scheduleLogRepository.findByTaskId(taskId, limit)

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('[Schedule Logs API] GET 错误:', error)
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })
  }
}
