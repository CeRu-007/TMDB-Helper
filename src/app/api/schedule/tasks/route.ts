import { type NextRequest, NextResponse } from 'next/server'
import { scheduleRepository } from '@/lib/data/schedule-repository'
import { scheduler } from '@/lib/scheduler/scheduler'
import type { CreateScheduleTaskInput, UpdateScheduleTaskInput } from '@/types/schedule'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: '缺少 itemId 参数' }, { status: 400 })
    }

    const task = scheduleRepository.findByItemId(itemId)

    return NextResponse.json({ success: true, data: task || null })
  } catch (error) {
    console.error('[Schedule Tasks API] GET 错误:', error)
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateScheduleTaskInput = await request.json()

    if (!body.itemId || !body.cron) {
      return NextResponse.json({ error: '缺少必要参数: itemId, cron' }, { status: 400 })
    }

    const existing = scheduleRepository.findByItemId(body.itemId)
    if (existing) {
      return NextResponse.json({ error: '该词条已存在定时任务配置' }, { status: 409 })
    }

    const result = scheduleRepository.create(body)

    if (!result.success || !result.data) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    scheduler.scheduleTask(result.data)

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('[Schedule Tasks API] POST 错误:', error)
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateScheduleTaskInput = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: '缺少必要参数: id' }, { status: 400 })
    }

    const existing = scheduleRepository.findById(body.id)
    if (!existing) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    const result = scheduleRepository.update(body)

    if (!result.success || !result.data) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    scheduler.updateTask(result.data)

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('[Schedule Tasks API] PUT 错误:', error)
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 })
    }

    const existing = scheduleRepository.findById(id)
    if (!existing) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    scheduler.removeTask(id)
    const result = scheduleRepository.deleteById(id)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Schedule Tasks API] DELETE 错误:', error)
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })
  }
}
