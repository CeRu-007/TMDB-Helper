import type { NextRequest } from "next/server"

// 声明全局activeProcesses类型
declare global {
  var activeProcesses: Map<number, any>;
}

// 初始化全局进程列表
if (!global.activeProcesses) {
  global.activeProcesses = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const { processId } = await request.json()

    if (!processId) {
      return new Response(
        JSON.stringify({ success: false, error: "缺少进程ID参数" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const pid = typeof processId === 'string' ? parseInt(processId, 10) : processId

    if (isNaN(pid)) {
      return new Response(
        JSON.stringify({ success: false, error: "无效的进程ID" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const childProcess = global.activeProcesses.get(pid)

    if (!childProcess) {
      return new Response(
        JSON.stringify({ success: false, error: `进程 ${pid} 不存在` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    // 终止进程
    try {
      // 在Windows上使用taskkill强制终止进程树
      if (process.platform === 'win32') {
        const { exec } = require('child_process')
        exec(`taskkill /F /T /PID ${pid}`, (error: any) => {
          if (error) console.error(`终止进程 ${pid} 失败:`, error)
        })
      } else {
        // Unix系统：终止进程组
        childProcess.kill('SIGKILL')
      }

      // 从活动进程列表中移除
      global.activeProcesses.delete(pid)

      return new Response(
        JSON.stringify({ success: true, message: `进程 ${pid} 已终止` }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `终止进程失败: ${error instanceof Error ? error.message : "未知错误"}`
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `服务器内部错误: ${error instanceof Error ? error.message : "未知错误"}`
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}