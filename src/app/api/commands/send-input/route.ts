import type { NextRequest } from "next/server"
import os from "os"

// 声明全局activeProcesses类型
declare global {
  var activeProcesses: Map<number, any>;
}

// 初始化全局进程列表
if (!global.activeProcesses) {
  global.activeProcesses = new Map();
}

// 最大重试次数
const MAX_RETRIES = 5; // 增加到5次重试
// 重试延迟（毫秒）
const RETRY_DELAY = 100;

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 检查进程是否仍然存在于系统中
const isProcessRunning = async (pid: number): Promise<boolean> => {
  try {
    // Windows平台使用tasklist命令
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      const result = execSync(`tasklist /FI "PID eq ${pid}" /NH /FO CSV`).toString();
      return result.includes(`"${pid}"`);
    } 
    // Linux/Mac平台使用ps命令
    else {
      const { execSync } = require('child_process');
      const result = execSync(`ps -p ${pid} -o pid=`).toString();
      return result.trim() !== '';
    }
  } catch (error) {
    
    return false;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { processId, input, sendDirectly = false } = await request.json()

    if (!processId || input === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `缺少必要参数: ${!processId ? 'processId' : ''}${!processId && input === undefined ? ', ' : ''}${input === undefined ? 'input' : ''}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // 获取活动进程
    const childProcess = global.activeProcesses.get(processId)
    
    console.log(`尝试向进程 ${processId} 发送输入: "${input}"${sendDirectly ? ' (直接发送带回车)' : ''}`)
    console.log(`当前活动进程: ${Array.from(global.activeProcesses.keys()).join(', ') || '无'}`)

    if (!childProcess) {
      // 检查进程是否存在于系统中但不在我们的映射中
      const isRunning = await isProcessRunning(processId);
      
      if (isRunning) {
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `进程 ${processId} 存在但不受应用程序控制，无法发送输入`,
            suggestion: "请尝试重新启动命令或刷新页面"
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        )
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `进程不存在或已结束 (ID: ${processId})`,
          suggestion: "请重新启动命令"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // 向进程发送输入（带重试机制）
    let lastError = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
    try {
        // 检查进程是否仍然存在并且运行中
        if (childProcess.exitCode !== null || childProcess.killed) {
          throw new Error(`进程已退出或被终止 (exitCode: ${childProcess.exitCode})`);
        }
        
        // 如果不在Windows上，检查进程是否仍在系统中运行
        if (process.platform !== 'win32') {
          const isRunning = await isProcessRunning(processId);
          if (!isRunning) {
            throw new Error(`系统中找不到进程 ${processId}，可能已经终止`);
          }
        }
        
        // 检查stdin是否可用
        if (!childProcess.stdin) {
          throw new Error("进程的标准输入流不可用");
        }
        
        // 检查stdin是否已关闭
        if (childProcess.stdin.destroyed) {
          throw new Error("进程的标准输入流已关闭");
        }

        // 确保stdin是可写的
        if (!childProcess.stdin.writable) {
          throw new Error("进程的标准输入流不可写");
        }

        // 准备输入内容（根据需要添加换行符）
        // 确保Windows下使用正确的换行符
        const EOL = process.platform === 'win32' ? '\r\n' : '\n';
        const inputToSend = sendDirectly ? `${input}${EOL}` : input;
        
        // 使用promise包装写入操作，确保可以正确处理异步写入
        await new Promise<void>((resolve, reject) => {
          // 设置超时保护
            const timeout = setTimeout(() => {
            childProcess.stdin?.removeListener('error', onError);
              reject(new Error('写入超时'));
            }, 5000);

          // 错误处理
          const onError = (err: Error) => {
              clearTimeout(timeout);
            reject(err);
          };
          
          // 监听错误
          childProcess.stdin?.once('error', onError);
          
          // 执行写入
          const writeResult = childProcess.stdin.write(inputToSend, 'utf8', (err: Error | null) => {
            clearTimeout(timeout);
            childProcess.stdin?.removeListener('error', onError);
            
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
          
          // 如果写入缓冲区已满，等待drain事件
          if (!writeResult) {
            childProcess.stdin.once('drain', () => {
              clearTimeout(timeout);
              childProcess.stdin?.removeListener('error', onError);
              resolve();
          });
        }
        });

        console.log(`成功向进程 ${processId} 发送输入: "${input}"${sendDirectly ? ' (带回车)' : ''}`);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "输入已发送",
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        lastError = error;
        
        // 如果是Windows且使用\n发送失败，尝试使用\r\n
        if (process.platform === 'win32' && sendDirectly && i === 0 && input.indexOf('\r\n') === -1) {
          
          try {
            const winEOL = '\r\n';
            const inputToSend = `${input}${winEOL}`;
            
            const writeResult = childProcess.stdin.write(inputToSend, 'utf8');
            if (writeResult) {
              
              return new Response(
                JSON.stringify({
                  success: true,
                  message: "使用Windows行终止符输入已发送",
                }),
                {
                  headers: { "Content-Type": "application/json" },
                }
              );
            }
          } catch (winError) {
            
          }
        }
        
        if (i < MAX_RETRIES - 1) {
          // 指数退避策略
          const backoffDelay = RETRY_DELAY * Math.pow(2, i);
          
          await delay(backoffDelay);
          continue;
        }
      }
    }

    // 所有重试都失败了
    
      return new Response(
        JSON.stringify({
          success: false,
        error: `发送输入失败: ${lastError instanceof Error ? lastError.message : '未知错误'}`,
        suggestion: "请尝试重新启动命令或使用其他交互方式",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
    );
  } catch (error) {
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `服务器内部错误: ${error instanceof Error ? error.message : '未知错误'}`,
        suggestion: "请检查服务器日志获取更多信息",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
