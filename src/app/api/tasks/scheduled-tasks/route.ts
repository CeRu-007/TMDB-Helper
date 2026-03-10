import { NextRequest, NextResponse } from 'next/server'
import { ServerStorageManager } from '@/lib/data/server-storage-manager'
import type { ScheduledTask } from '@/lib/data/storage/types'
import { logger } from '@/lib/utils/logger'

// Ensure Node.js runtime
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init()
    
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    
    if (itemId) {
      // 返回指定项目的任务
      const itemTasks = ServerStorageManager.getTasksByItemId(itemId)
      return NextResponse.json({
        success: true,
        tasks: itemTasks
      })
    }
    
    // 返回所有任务
    const tasks = ServerStorageManager.getTasks()
    return NextResponse.json({
      success: true,
      tasks
    })
  } catch (error) {
    logger.error('获取定时任务失败', error)
    return NextResponse.json({
      success: false,
      error: '获取定时任务失败'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init()
    
    const task: ScheduledTask = await request.json()
    
    // 验证必要字段
    if (!task.id || !task.itemId || !task.name) {
      return NextResponse.json({
        success: false,
        error: '缺少必要字段'
      }, { status: 400 })
    }
    
    // 确保时间戳存在
    if (!task.createdAt) {
      task.createdAt = new Date().toISOString()
    }
    if (!task.updatedAt) {
      task.updatedAt = new Date().toISOString()
    }
    
    const success = ServerStorageManager.addTask(task)
    
    if (success) {
      logger.info(`[API] 任务添加成功: ${task.name}`)
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
    logger.error('添加定时任务失败', error)
    return NextResponse.json({
      success: false,
      error: '添加定时任务失败'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init()
    
    const task: ScheduledTask = await request.json()
    
    // 验证必要字段
    if (!task.id) {
      return NextResponse.json({
        success: false,
        error: '缺少任务ID'
      }, { status: 400 })
    }
    
    // 更新时间戳
    task.updatedAt = new Date().toISOString()
    
    const success = ServerStorageManager.updateTask(task)
    
    if (success) {
      logger.info(`[API] 任务更新成功: ${task.name}`)
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
    logger.error('更新定时任务失败', error)
    return NextResponse.json({
      success: false,
      error: '更新定时任务失败'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 确保数据库已初始化
    await ServerStorageManager.init()
    
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('id')
    
    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: '缺少任务ID'
      }, { status: 400 })
    }
    
    const success = ServerStorageManager.deleteTask(taskId)
    
    if (success) {
      logger.info(`[API] 任务删除成功: ${taskId}`)
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
    logger.error('删除定时任务失败', error)
    return NextResponse.json({
      success: false,
      error: '删除定时任务失败'
    }, { status: 500 })
  }
}