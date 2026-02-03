import { NextRequest, NextResponse } from 'next/server'
import { readScheduledTasks, writeScheduledTasks, addScheduledTask, updateScheduledTask, deleteScheduledTask } from '@/lib/data/server-scheduled-tasks'
import type { ScheduledTask } from '@/lib/data/storage'

// Ensure Node.js runtime for fs/path usage
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    
    const tasks = readScheduledTasks()
    
    if (itemId) {
      // 返回指定项目的任务
      const itemTasks = tasks.filter(task => task.itemId === itemId)
      return NextResponse.json({
        success: true,
        tasks: itemTasks
      })
    }
    
    // 返回所有任务
    return NextResponse.json({
      success: true,
      tasks
    })
  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: '获取定时任务失败'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const task: ScheduledTask = await request.json()
    
    // 验证必要字段
    if (!task.id || !task.itemId || !task.name) {
      return NextResponse.json({
        success: false,
        error: '缺少必要字段'
      }, { status: 400 })
    }
    
    const success = addScheduledTask(task)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '任务添加成功'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '任务添加失败'
      }, { status: 500 })
    }
  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: '添加定时任务失败'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const task: ScheduledTask = await request.json()
    
    // 验证必要字段
    if (!task.id) {
      return NextResponse.json({
        success: false,
        error: '缺少任务ID'
      }, { status: 400 })
    }
    
    const success = updateScheduledTask(task)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '任务更新成功'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '任务更新失败'
      }, { status: 500 })
    }
  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: '更新定时任务失败'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('id')
    
    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: '缺少任务ID'
      }, { status: 400 })
    }
    
    const success = deleteScheduledTask(taskId)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '任务删除成功'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '任务删除失败'
      }, { status: 500 })
    }
  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: '删除定时任务失败'
    }, { status: 500 })
  }
}
