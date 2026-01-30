import type { NextRequest } from "next/server"
import { spawn } from "child_process"
import { logger } from "@/lib/utils/logger"

// 声明全局activeProcesses类型（与execute-command-interactive保持一致）
declare global {
  var activeProcesses: Map<number, any>;
}

export async function POST(request: NextRequest) {
  try {
    const { input, processId } = await request.json()

    if (input === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "缺少必要参数: input",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // 获取或初始化全局进程列表
    global.activeProcesses = global.activeProcesses || new Map()
    
    // 查看是否有可用的进程
    let targetProcess = null
    let targetProcessId = null
    
    // 1. 尝试使用提供的processId
    if (processId && global.activeProcesses.has(processId)) {
      targetProcess = global.activeProcesses.get(processId)
      targetProcessId = processId
      
    } 
    // 2. 尝试获取第一个可用进程
    else if (global.activeProcesses.size > 0) {
      const keys = [...global.activeProcesses.keys()]
      targetProcessId = keys[0]
      if (targetProcessId !== undefined) {
        targetProcess = global.activeProcesses.get(targetProcessId)
      }
      
    }
    // 3. 没有可用进程，尝试创建一个简单的交互式进程
    else {
      // 这只是一个后备方案，创建一个简单的命令行进程
      try {
        const isWindows = process.platform === 'win32'
        const shellCommand = isWindows ? 'cmd.exe' : 'bash'
        const shellArgs = isWindows ? ['/C', 'echo 输入已发送，但无活动进程接收'] : ['-c', 'echo 输入已发送，但无活动进程接收']

        // 尝试创建一个简单的shell进程
        const childProcess = spawn(shellCommand, shellArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        })

        if (childProcess.pid) {
          targetProcessId = childProcess.pid
          targetProcess = childProcess
          global.activeProcesses.set(targetProcessId, childProcess)

          logger.warn(`创建临时shell进程 ${childProcess.pid} 作为后备方案`);
        }
      } catch (err) {
        logger.error(`创建临时shell进程失败: ${err}`);
      }
    }
    
    // 检查是否有可用进程
    if (!targetProcess) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "找不到可用的活跃进程",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // 向进程发送输入
    try {
      if (!targetProcess.stdin || targetProcess.stdin.destroyed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "进程的标准输入流不可用或已关闭",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      const inputToSend = `${input}\n`
      targetProcess.stdin.write(inputToSend)
      logger.info(`成功向进程 ${targetProcessId} 发送输入: "${input}" (带回车)`)

      return new Response(
        JSON.stringify({
          success: true,
          message: "输入已发送",
          processId: targetProcessId,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      )
    } catch (error) {
      logger.error(`发送直接输入失败: ${error instanceof Error ? error.message : '未知错误'}`);

      return new Response(
        JSON.stringify({
          success: false,
          error: `发送输入失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }
  } catch (error) {
    logger.error(`发送直接输入处理异常: ${error instanceof Error ? error.message : '未知错误'}`);

    return new Response(
      JSON.stringify({
        success: false,
        error: `服务器内部错误: ${error instanceof Error ? error.message : '未知错误'}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
} 