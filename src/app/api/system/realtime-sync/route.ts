import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth/auth-service'
import { INTERVAL_15S } from '@/lib/constants/constants'
import {
  addConnection,
  updatePing,
  removeConnection,
  sendToConnection,
  broadcastToUser,
  closeUserConnections,
} from '@/lib/data/sse-broadcaster'

export async function GET(request: NextRequest) {
  const userId = await AuthService.getUserIdFromRequest(request)
  
  if (!userId) {
    return NextResponse.json({ error: '缺少用户身份信息' }, { status: 401 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const connectionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      addConnection(connectionId, controller, userId)

      const initMessage = `data: ${JSON.stringify({
        type: 'connection_established',
        connectionId,
        timestamp: Date.now()
      })}\n\n`
      
      controller.enqueue(new TextEncoder().encode(initMessage))

      const heartbeat = setInterval(() => {
        try {
          if (updatePing(connectionId)) {
            const pingMessage = `data: ${JSON.stringify({
              type: 'ping',
              timestamp: Date.now()
            })}\n\n`
            sendToConnection(connectionId, pingMessage)
          } else {
            clearInterval(heartbeat)
          }
        } catch (error) {

          clearInterval(heartbeat)
          removeConnection(connectionId)
        }
      }, INTERVAL_15S)

      request.signal.addEventListener('abort', () => {
        
        clearInterval(heartbeat)
        removeConnection(connectionId)
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

export async function POST(request: NextRequest) {
  try {
    const userId = await AuthService.getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json({ error: '缺少用户身份信息' }, { status: 401 })
    }

    const eventData = await request.json()
    
    const broadcastCount = broadcastToUser(userId, eventData)

    if (broadcastCount === 0) {
      
      return NextResponse.json({ success: true, broadcastCount: 0 })
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

export async function DELETE(request: NextRequest) {
  try {
    const userId = await AuthService.getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json({ error: '缺少用户身份信息' }, { status: 401 })
    }

    const closedCount = closeUserConnections(userId)

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
