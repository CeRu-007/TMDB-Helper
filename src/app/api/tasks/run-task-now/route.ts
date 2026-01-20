import { NextRequest, NextResponse } from "next/server"
import { taskScheduler } from "@/lib/data/scheduler"

/**
 * POST /api/tasks/run-task-now - 立即执行指定的定时任务
 */
export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json()

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "缺少任务ID" },
        { status: 400 }
      )
    }

    // 调用任务调度器的runTaskNow方法
    const result = await taskScheduler.runTaskNow(taskId)

    return NextResponse.json(result)

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "执行任务时发生未知错误" 
      },
      { status: 500 }
    )
  }
}