import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/user-utils'
import { TIMEOUT_30S, INTERVAL_10S, INTERVAL_15S } from '@/lib/constants/constants'

// 存储活跃的SSE连接
const connections = new Map<string, {
  controller: ReadableStreamDefaultController
  userId: string
  lastPing: number
}>()

// 定期清理超时连接
setInterval(() => {
  const now = Date.now()
  const timeout = TIMEOUT_30S // 30秒超时

  for (const [connectionId, connection] of connections.entries()) {
    if (now - connection.lastPing > timeout) {
      try {
        connection.controller.close()
      } catch (error) {

      }
      connections.delete(connectionId)

    }
  }
}, INTERVAL_10S) // 每10秒检查一次

/**
 * GET /api/system/realtime-sync - 建立Server-Sent Events连接
 */
export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  
  if (!userId) {
    return NextResponse.json({ error: '缺少用户身份信息' }, { status: 401 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const connectionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 存储连接信息
      connections.set(connectionId, {
        controller,
        userId,
        lastPing: Date.now()
      })

      // 发送初始连接确认
      const initMessage = `data: ${JSON.stringify({
        type: 'connection_established',
        connectionId,
        timestamp: Date.now()
      })}\n\n`
      
      controller.enqueue(new TextEncoder().encode(initMessage))

      // 设置心跳检测
      const heartbeat = setInterval(() => {
        try {
          const connection = connections.get(connectionId)
          if (connection) {
            connection.lastPing = Date.now()
            const pingMessage = `data: ${JSON.stringify({
              type: 'ping',
              timestamp: Date.now()
            })}\n\n`
            controller.enqueue(new TextEncoder().encode(pingMessage))
          } else {
            clearInterval(heartbeat)
          }
        } catch (error) {

          clearInterval(heartbeat)
          connections.delete(connectionId)
        }
      }, INTERVAL_15S) // 每15秒发送心跳

      // 连接关闭时清理
      request.signal.addEventListener('abort', () => {
        
        clearInterval(heartbeat)
        connections.delete(connectionId)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

/**
 * POST /api/system/realtime-sync - 接收数据变更通知并广播给相关用户
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json({ error: '缺少用户身份信息' }, { status: 401 })
    }

    const eventData = await request.json()
    
    // 广播给该用户的所有连接
    const userConnections = Array.from(connections.entries())
      .filter(([_, connection]) => connection.userId === userId)

    if (userConnections.length === 0) {
      
      return NextResponse.json({ success: true, broadcastCount: 0 })
    }

    let broadcastCount = 0
    const message = `data: ${JSON.stringify({
      ...eventData,
      userId,
      timestamp: Date.now()
    })}\n\n`

    for (const [connectionId, connection] of userConnections) {
      try {
        connection.controller.enqueue(new TextEncoder().encode(message))
        broadcastCount++
        
      } catch (error) {
        
        // 移除失效连接
        connections.delete(connectionId)
      }
    }

    return NextResponse.json({ 
      success: true, 
      broadcastCount,
      message: `已广播给 ${broadcastCount} 个连接`
    })

  } catch (error) {
    
    return NextResponse.json(
      { 
        error: '处理数据变更通知失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/system/realtime-sync - 关闭指定用户的所有连接
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json({ error: '缺少用户身份信息' }, { status: 401 })
    }

    // 关闭该用户的所有连接
    const userConnections = Array.from(connections.entries())
      .filter(([_, connection]) => connection.userId === userId)

    let closedCount = 0
    for (const [connectionId, connection] of userConnections) {
      try {
        connection.controller.close()
        connections.delete(connectionId)
        closedCount++
        
      } catch (error) {
        
      }
    }

    return NextResponse.json({ 
      success: true, 
      closedCount,
      message: `已关闭 ${closedCount} 个连接`
    })

  } catch (error) {
    
    return NextResponse.json(
      { 
        error: '关闭连接失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}