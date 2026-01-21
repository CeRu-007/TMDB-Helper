import type { NextRequest, NextResponse } from "next/server"
import { spawn } from 'child_process'
import { BaseAPIRoute } from '@/lib/api/base-api-route'

// 进程信息接口
interface ProcessInfo {
  process: ReturnType<typeof spawn>;
  startTime: Date;
  command: string;
}

// 声明全局activeProcesses类型
declare global {
  var activeProcesses: Map<number, ProcessInfo>;
}

// 初始化全局进程列表
if (!global.activeProcesses) {
  global.activeProcesses = new Map();
}

class TerminateProcessRoute extends BaseAPIRoute {
  protected async handle(request: NextRequest): Promise<NextResponse> {
    const { data: body, error } = await this.parseRequestBody<{ processId: string | number }>(request)

    if (error) {
      return this.validationErrorResponse(error)
    }

    if (!body?.processId) {
      return this.validationErrorResponse('缺少进程ID参数', 'processId')
    }

    const pid = typeof body.processId === 'string' ? parseInt(body.processId, 10) : body.processId

    if (isNaN(pid)) {
      return this.validationErrorResponse('无效的进程ID', 'processId')
    }

    const childProcess = global.activeProcesses.get(pid)

    if (!childProcess) {
      return this.notFoundResponse(`进程 ${pid} 不存在`)
    }

    // 终止进程
    try {
      // 在Windows上使用taskkill强制终止进程树
      if (process.platform === 'win32') {
        const { exec } = require('child_process')
        exec(`taskkill /F /T /PID ${pid}`, (error: Error | null) => {
          if (error) console.error(`终止进程 ${pid} 失败:`, error)
        })
      } else {
        // Unix系统：终止进程组
        childProcess.kill('SIGKILL')
      }

      // 从活动进程列表中移除
      global.activeProcesses.delete(pid)

      return this.successResponse(
        { message: `进程 ${pid} 已终止` },
        { message: '进程终止成功' }
      )
    } catch (error) {
      return this.errorResponse(
        `终止进程失败: ${error instanceof Error ? error.message : "未知错误"}`,
        500
      )
    }
  }
}

export const POST = (request: NextRequest) => {
  const route = new TerminateProcessRoute()
  return route.execute(request)
}