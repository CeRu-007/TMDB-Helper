import type { NextRequest } from "next/server"

// 声明全局activeProcesses类型
declare global {
  var activeProcesses: Map<number, any> | undefined;
}

export async function GET(request: NextRequest) {
  try {
    // 获取或初始化全局进程列表
    global.activeProcesses = global.activeProcesses || new Map()
    
    // 获取所有活跃进程ID
    const processIds = Array.from(global.activeProcesses.keys())
    console.log(`当前活跃进程: ${processIds.join(', ') || '无'}`)
    
    // 过滤掉那些已经结束的进程
    const validProcesses = processIds.filter(pid => {
      const process = global.activeProcesses!.get(pid)
      return process && !process.killed
    })
    
    if (validProcesses.length !== processIds.length) {
      console.log(`过滤后的有效进程: ${validProcesses.join(', ') || '无'}`)
      
      // 清理已结束的进程
      processIds.forEach(pid => {
        if (!validProcesses.includes(pid)) {
          global.activeProcesses!.delete(pid)
          
        }
      })
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        processes: validProcesses,
        count: validProcesses.length
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `服务器内部错误: ${error instanceof Error ? error.message : '未知错误'}`,
        processes: []
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
} 