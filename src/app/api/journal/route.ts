import { type NextRequest, NextResponse } from 'next/server'
import { taskJournalRepository } from '@/lib/data/task-journal-repository'
import { initializeDatabase } from '@/lib/database'
import { notifyDataChangeFromServer } from '@/lib/data/sse-broadcaster'

async function ensureDatabaseInitialized(): Promise<void> {
  try {
    await initializeDatabase()
  } catch (error) {
    console.error('[Journal API] 数据库初始化失败:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized()

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const status = searchParams.get('status') as 'success' | 'failed' | null
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const unreadCount = searchParams.get('unreadCount')

    if (unreadCount === 'true') {
      const count = taskJournalRepository.getUnreadCount()
      return NextResponse.json({ success: true, data: { unreadCount: count } })
    }

    let entries
    if (itemId) {
      entries = taskJournalRepository.findByItemId(itemId, limit)
    } else if (status) {
      entries = taskJournalRepository.findByStatus(status, limit)
    } else {
      entries = taskJournalRepository.findAllOrdered(limit, offset)
    }

    const totalCount = taskJournalRepository.getTotalCount()
    const unread = taskJournalRepository.getUnreadCount()

    return NextResponse.json({
      success: true,
      data: entries,
      meta: { totalCount, unreadCount: unread },
    })
  } catch (error) {
    console.error('[Journal API] GET 错误:', error)
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureDatabaseInitialized()

    const body = await request.json()
    const { action, id } = body

    if (action === 'markRead' && id) {
      const result = taskJournalRepository.markAsRead(id)
      if (result.success) {
        notifyDataChangeFromServer({ type: 'journal_read', data: { id } })
      }
      return NextResponse.json({ success: result.success })
    }

    if (action === 'markAllRead') {
      const result = taskJournalRepository.markAllAsRead()
      if (result.success) {
        notifyDataChangeFromServer({ type: 'journal_read', data: { action: 'markAllRead' } })
      }
      return NextResponse.json({ success: result.success })
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 })
  } catch (error) {
    console.error('[Journal API] PUT 错误:', error)
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureDatabaseInitialized()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const itemId = searchParams.get('itemId')
    const clearAll = searchParams.get('all')

    if (clearAll === 'true') {
      const result = taskJournalRepository.deleteAll()
      return NextResponse.json({ success: result.success })
    }

    if (itemId) {
      const result = taskJournalRepository.deleteByItemId(itemId)
      return NextResponse.json({ success: result.success })
    }

    if (id) {
      const result = taskJournalRepository.deleteById(id)
      return NextResponse.json({ success: result.success })
    }

    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  } catch (error) {
    console.error('[Journal API] DELETE 错误:', error)
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })
  }
}
