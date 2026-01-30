import type { NextRequest } from "next/server"
import { spawn } from "child_process"
import fs from "fs"
import { TIMEOUT_60S } from "@/lib/constants/constants"

export async function POST(request: NextRequest) {
  try {
    const { command, workingDirectory } = await request.json()

    if (!command || !workingDirectory) {
      return new Response("缺少必要参数", { status: 400 })
    }

    // 验证工作目录是否存在
    if (!fs.existsSync(workingDirectory)) {
      return new Response(`工作目录不存在: ${workingDirectory}`, { status: 400 })
    }

    // 创建可读流
    const stream = new ReadableStream({
      start(controller) {
        const commandParts = command.split(" ")
        const mainCommand = commandParts[0] || ''
        const args = commandParts.slice(1)

        const childProcess = spawn(mainCommand, args, {
          cwd: workingDirectory,
          shell: true,
          stdio: ["pipe", "pipe", "pipe"],
        })

        // 发送初始信息
        const encoder = new TextEncoder()
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "start",
              message: `开始执行命令: ${command}`,
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        )

        childProcess.stdout?.on("data", (data) => {
          const text = data.toString()
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "stdout",
                message: text,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
        })

        childProcess.stderr?.on("data", (data) => {
          const text = data.toString()
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "stderr",
                message: text,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
        })

        childProcess.on("close", (code) => {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "close",
                message: `命令执行完成，退出码: ${code}`,
                exitCode: code,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
          controller.close()
        })

        childProcess.on("error", (error) => {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: `执行错误: ${error.message}`,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
          controller.close()
        })

        // 设置超时
        setTimeout(() => {
          childProcess.kill()
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "timeout",
                message: "命令执行超时，已终止",
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
          controller.close()
        }, TIMEOUT_60S) // 60秒超时
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    return new Response("服务器内部错误", { status: 500 })
  }
}
