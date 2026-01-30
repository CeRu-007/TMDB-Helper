import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import fs from "fs"
import { TIMEOUT_30S } from "@/lib/constants/constants"

export async function POST(request: NextRequest) {
  try {
    const { command, workingDirectory } = await request.json()

    if (!command || !workingDirectory) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 验证工作目录是否存在
    if (!fs.existsSync(workingDirectory)) {
      return NextResponse.json({ error: `工作目录不存在: ${workingDirectory}` }, { status: 400 })
    }

    // 解析命令
    const commandParts = command.split(" ")
    const mainCommand = commandParts[0]
    const args = commandParts.slice(1)

    return new Promise((resolve) => {
      const childProcess = spawn(mainCommand, args, {
        cwd: workingDirectory,
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
      })

      let output = ""
      let errorOutput = ""

      childProcess.stdout?.on("data", (data) => {
        const text = data.toString()
        output += text
      })

      childProcess.stderr?.on("data", (data) => {
        const text = data.toString()
        errorOutput += text
      })

      childProcess.on("close", (code) => {
        resolve(
          NextResponse.json({
            success: code === 0,
            output: output,
            error: errorOutput,
            exitCode: code,
            command: command,
            workingDirectory: workingDirectory,
          }),
        )
      })

      childProcess.on("error", (error) => {
        resolve(
          NextResponse.json({
            success: false,
            output: "",
            error: error.message,
            exitCode: -1,
            command: command,
            workingDirectory: workingDirectory,
          }),
        )
      })

      // 设置超时（30秒）
      setTimeout(() => {
        childProcess.kill()
        resolve(
          NextResponse.json({
            success: false,
            output: output,
            error: errorOutput + "\n命令执行超时",
            exitCode: -1,
            command: command,
            workingDirectory: workingDirectory,
          }),
        )
      }, TIMEOUT_30S)
    })
  } catch (error) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
