import type { NextRequest } from "next/server"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import os from "os"

// 声明全局activeProcesses类型
declare global {
  var activeProcesses: Map<number, any>;
}

// 初始化全局进程列表
if (!global.activeProcesses) {
  global.activeProcesses = new Map();
}

// 检查Python可执行文件
const checkPythonExecutable = () => {
  const isPythonAvailable = (cmd: string): boolean => {
    try {
      console.log(`检查Python命令是否可用: ${cmd}`);
      const result = require("child_process").spawnSync(cmd, ["--version"]);
      const isAvailable = result.status === 0;
      console.log(`命令 ${cmd} ${isAvailable ? '可用' : '不可用'}, 退出码: ${result.status}`);
      return isAvailable;
    } catch (error) {
      console.error(`检查命令 ${cmd} 时出错:`, error);
      return false;
    }
  };

  // 检查不同平台和可能的Python命令
  if (process.platform === "win32") {
    // Windows平台优先检查顺序: python -> py -> python3
    if (isPythonAvailable("python")) return "python";
    if (isPythonAvailable("py")) return "py";
    if (isPythonAvailable("python3")) return "python3";
    
    // 尝试检查常见的Python安装路径
    const commonPaths = [
      "C:\\Python39\\python.exe",
      "C:\\Python310\\python.exe",
      "C:\\Python311\\python.exe",
      "C:\\Program Files\\Python39\\python.exe",
      "C:\\Program Files\\Python310\\python.exe",
      "C:\\Program Files\\Python311\\python.exe",
      "C:\\Program Files (x86)\\Python39\\python.exe",
      "C:\\Program Files (x86)\\Python310\\python.exe",
      "C:\\Program Files (x86)\\Python311\\python.exe"
    ];
    
    for (const path of commonPaths) {
      if (fs.existsSync(path)) {
        console.log(`找到Python安装路径: ${path}`);
        return `"${path}"`;  // 使用引号包裹路径，以防路径中有空格
      }
    }
  } else {
    // 非Windows平台优先检查顺序: python3 -> python
    if (isPythonAvailable("python3")) return "python3";
    if (isPythonAvailable("python")) return "python";
  }

  // 如果找不到可用的Python，返回null以便调用者知道需要处理这种情况
  console.log("未找到可用的Python可执行文件");
  return null;
};

// 获取优化后的Python环境变量
const getPythonEnv = () => {
  const env = { ...process.env };
  
  // 设置Python相关环境变量
  env.PYTHONIOENCODING = 'utf-8';     // 设置Python的IO编码为UTF-8
  env.PYTHONUTF8 = '1';               // 强制Python使用UTF-8
  env.LANG = 'zh_CN.UTF-8';           // 设置语言环境
  env.LC_ALL = 'zh_CN.UTF-8';         // 设置所有本地化参数
  
  // Windows特定环境变量
  if (process.platform === 'win32') {
    env.PYTHONLEGACYWINDOWSSTDIO = '1'; // 解决Windows上的编码问题
  }
  
  return env;
};

// 辅助函数：替换命令中的Python可执行文件路径
const fixPythonCommand = (command: string): string => {
  // 如果命令以python、python3或py开头，替换为实际可用的Python可执行文件
  if (/^(python|python3|py)\s/.test(command)) {
    const pythonExecutable = checkPythonExecutable();
    
    // 如果找不到可用的Python，保留原始命令
    if (!pythonExecutable) {
      console.log("未找到可用的Python可执行文件，保留原始命令");
      return command;
    }
    
    console.log(`将Python命令从 ${command.split(' ')[0]} 替换为 ${pythonExecutable}`);
    return command.replace(/^(python|python3|py)/, pythonExecutable);
  }
  return command;
};

export async function POST(request: NextRequest) {
  try {
    const { command, workingDirectory, timeout } = await request.json()

    if (!command || !workingDirectory) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "缺少必要参数",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }
    
    // 解析超时参数，默认为5分钟，最小为60秒，最大为30分钟
    const commandTimeout = timeout ? Math.min(Math.max(Number(timeout), 60000), 1800000) : 300000
    console.log(`命令超时设置: ${commandTimeout}毫秒 (${commandTimeout/1000}秒)`)

    // 验证工作目录是否存在
    if (!fs.existsSync(workingDirectory)) {
      return new Response(`工作目录不存在: ${workingDirectory}`, { status: 400 })
    }

    console.log(`正在执行命令: ${command}，工作目录: ${workingDirectory}`)
    
    // 优化命令，替换Python可执行文件路径
    const optimizedCommand = fixPythonCommand(command)
    if (optimizedCommand !== command) {
      console.log(`命令已优化: ${optimizedCommand}`)
    }

    // 解析命令
    const commandParts = optimizedCommand.split(" ")
    const mainCommand = commandParts[0]
    const args = commandParts.slice(1)
    
    // 记录详细环境信息
    console.log(`操作系统: ${os.platform()} ${os.release()}`);
    console.log(`节点版本: ${process.version}`);
    console.log(`当前工作目录: ${process.cwd()}`);
    console.log(`目标工作目录: ${workingDirectory}`);
    console.log(`环境变量PATH: ${process.env.PATH?.substring(0, 100)}...`);

    // 创建一个新的 ReadableStream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // --- 安全封装，避免多次 enqueue/close 导致 "Invalid state: Controller is already closed" ---
        const originalEnqueue = controller.enqueue.bind(controller);
        const originalClose = controller.close.bind(controller);
        let streamClosed = false;

        // 重写 enqueue: 若流已关闭则忽略
        // @ts-ignore
        controller.enqueue = (chunk: Uint8Array) => {
          if (streamClosed) return;
          try {
            originalEnqueue(chunk);
          } catch (err) {
            console.warn("enqueue after close ignored", err);
          }
        };

        // 重写 close: 仅允许关闭一次
        // @ts-ignore
        controller.close = () => {
          if (streamClosed) return;
          streamClosed = true;
          try {
            originalClose();
            // 关闭后将 enqueue 设为 no-op，彻底避免后续调用报错
            // @ts-ignore
            controller.enqueue = () => {};
          } catch (err) {
            console.warn("Repeated close ignored", err);
          }
        };
        // ------------------------------------------------------------------------------

        // 获取优化后的环境变量
        const optimizedEnv = getPythonEnv();
        
        // 创建子进程，确保stdin是pipe模式
        const childProcess = spawn(mainCommand, args, {
          cwd: workingDirectory,
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          env: optimizedEnv
        })

        // 配置stdin为utf8编码
        if (childProcess.stdin) {
          childProcess.stdin.setDefaultEncoding('utf8')
        }

        // 将进程添加到全局列表
        if (childProcess.pid) {
          global.activeProcesses.set(childProcess.pid, childProcess)
          console.log(`已添加进程 ${childProcess.pid} 到活动进程列表`)
          console.log(`当前活动进程: ${Array.from(global.activeProcesses.keys()).join(', ')}`)

          // 立即发送进程启动事件，确保前端获取到进程ID
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
                type: "start",
              processId: childProcess.pid,
                message: `进程已启动 (PID: ${childProcess.pid})`,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
          
          // 发送额外的环境信息供调试
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "info",
                message: `环境信息: ${os.platform()} ${os.release()}, Node ${process.version}`,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
          
          // 发送优化后的命令信息
          if (optimizedCommand !== command) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "info",
                  message: `命令已优化: ${optimizedCommand}`,
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            )
          }
        } else {
          console.error("无法获取子进程PID");
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "无法获取进程ID，交互功能可能不可用",
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        )
        }

        // 处理标准输出
        childProcess.stdout?.on("data", (data) => {
          // 使用utf-8解码，确保中文正确显示
          const text = data.toString('utf8')
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

        // 处理错误输出
        childProcess.stderr?.on("data", (data) => {
          // 使用utf-8解码，确保中文正确显示
          const text = data.toString('utf8')
          
          // 特殊处理Python模块导入错误
          if (text.includes("ModuleNotFoundError") || text.includes("ImportError")) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "warning",
                  message: "检测到Python模块导入错误，可能需要安装依赖项",
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            )
          }
          
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

        // 处理进程关闭
        childProcess.on("close", (code) => {
          console.log(`进程 ${childProcess.pid} 已关闭，退出码: ${code}`);
          
          // 从活动进程列表中移除
          if (global.activeProcesses && childProcess.pid) {
            global.activeProcesses.delete(childProcess.pid);
            console.log(`已从活动进程列表中移除进程 ${childProcess.pid}`);
            console.log(`当前活动进程: ${Array.from(global.activeProcesses.keys()).join(', ') || '无'}`);
          }
          
          // 发送关闭消息
          const closeStatus = code === 0 ? "success" : "error";
          const closeMessage = code === 0 
            ? `命令执行成功完成，退出码: ${code}` 
            : `命令执行失败，退出码: ${code}`;
          
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "close",
                message: closeMessage,
                exitCode: code,
                status: closeStatus,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
          
          // 如果是错误退出，提供额外信息
          if (code !== 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "info",
                  message: "如果问题持续，请尝试检查Python环境和TMDB-Import工具安装",
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            )
          }
          
          controller.close()
        })

        // 处理进程错误
        childProcess.on("error", (error) => {
          console.error(`进程 ${childProcess.pid} 发生错误:`, error);
          
          // 从活动进程列表中移除
          if (global.activeProcesses && childProcess.pid) {
            global.activeProcesses.delete(childProcess.pid);
            console.log(`已从活动进程列表中移除进程 ${childProcess.pid}`);
            console.log(`当前活动进程: ${Array.from(global.activeProcesses.keys()).join(', ') || '无'}`);
          }
          
          // 发送错误信息
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: `执行错误: ${error.message}`,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
          
          // 针对常见错误提供更多信息
          if (error.message.includes("ENOENT")) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "info",
                  message: `错误原因: 找不到可执行文件 "${mainCommand}"，请确保它已安装并在PATH中`,
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            )
          } else if (error.message.includes("EACCES")) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "info",
                  message: `错误原因: 权限不足，无法执行 "${mainCommand}"`,
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            )
          }
          
          controller.close()
        })

        // 设置超时
        setTimeout(() => {
          // 检查进程是否仍在运行
          if (!childProcess.killed && childProcess.pid && global.activeProcesses.has(childProcess.pid)) {
            // 从活动进程列表中移除
            global.activeProcesses.delete(childProcess.pid);
            console.log(`已从活动进程列表中移除超时进程 ${childProcess.pid}`);
            console.log(`当前活动进程: ${Array.from(global.activeProcesses.keys()).join(', ') || '无'}`);
          
            // 尝试终止进程
            try {
              childProcess.kill();
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "timeout",
                    message: `命令执行超时（${commandTimeout/1000}秒），已终止`,
                    timestamp: new Date().toISOString(),
                  })}\n\n`,
                ),
              )
            } catch (err) {
              console.error("终止进程时出错:", err);
            }
            
            controller.close();
          }
        }, commandTimeout) // 使用传入的超时时间
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (error) {
    console.error("处理请求时发生错误:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: `服务器内部错误: ${error instanceof Error ? error.message : "未知错误"}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
