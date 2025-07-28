import { NextRequest, NextResponse } from "next/server"
import { taskScheduler } from "@/lib/scheduler"

/**
 * POST /api/run-task-now - 立即执行指定的定时任务
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

    console.log(`[API] 收到立即执行任务请求: ${taskId}`)

    // 调用任务调度器的runTaskNow方法
    const result = await taskScheduler.runTaskNow(taskId)

    console.log(`[API] 任务执行结果:`, result)

    return NextResponse.json(result)

  } catch (error) {
    console.error("[API] 立即执行任务失败:", error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "执行任务时发生未知错误" 
      },
      { status: 500 }
    )
  }
}