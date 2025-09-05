import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 用户会话存储（在实际生产环境中应该使用数据库）
const userSessions = new Map<string, { userId: string; displayName?: string; avatarUrl?: string }>()

export async function GET(request: NextRequest) {
  try {
    // 从cookie获取会话ID
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('tmdb_helper_session')?.value

    if (!sessionId) {
      // 如果没有会话，自动生成用户ID并创建新会话
      const userId = 'user_' + Math.random().toString(36).substring(2, 16)
      
      // 创建新会话
      const newSessionId = createSession(userId)
      
      // 设置cookie
      cookieStore.set('tmdb_helper_session', newSessionId, {
        maxAge: 365 * 24 * 60 * 60, // 1年
        path: '/',
        sameSite: 'lax'
      })

      return NextResponse.json({
        userId: userId,
        displayName: `用户${userId.substring(5, 11)}`,
        sessionId: newSessionId,
        isNewSession: true
      })
    }

    // 查找会话信息
    const session = userSessions.get(sessionId)
    if (!session) {
      // 会话过期，自动生成新的用户ID并创建会话
      const userId = 'user_' + Math.random().toString(36).substring(2, 16)
      
      // 创建新会话
      const newSessionId = createSession(userId)
      
      // 更新cookie
      cookieStore.set('tmdb_helper_session', newSessionId, {
        maxAge: 365 * 24 * 60 * 60,
        path: '/',
        sameSite: 'lax'
      })

      return NextResponse.json({
        userId: userId,
        displayName: `用户${userId.substring(5, 11)}`,
        sessionId: newSessionId,
        isNewSession: true
      })
    }

    // 返回用户信息
    return NextResponse.json({
      userId: session.userId,
      displayName: session.displayName || `用户${session.userId.substring(5, 11)}`,
      avatarUrl: session.avatarUrl,
      sessionId: sessionId,
      isNewSession: false
    })

  } catch (error) {
    console.error('[API User] GET 错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 从cookie获取会话ID
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('tmdb_helper_session')?.value

    if (!sessionId) {
      return NextResponse.json({ error: '未找到用户会话' }, { status: 401 })
    }

    // 解析请求体
    const body = await request.json()
    const { userId, displayName, avatarUrl } = body

    // 验证用户ID匹配
    const session = userSessions.get(sessionId)
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: '用户ID不匹配' }, { status: 403 })
    }

    // 更新用户信息
    if (displayName) {
      session.displayName = displayName
    }
    if (avatarUrl) {
      session.avatarUrl = avatarUrl
    }

    userSessions.set(sessionId, session)

    return NextResponse.json({ 
      success: true, 
      message: '用户信息更新成功',
      userId: session.userId,
      displayName: session.displayName,
      avatarUrl: session.avatarUrl
    })

  } catch (error) {
    console.error('[API User] POST 错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 从cookie获取会话ID
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('tmdb_helper_session')?.value

    if (sessionId) {
      // 从内存存储中移除会话
      userSessions.delete(sessionId)
      
      // 清除cookie
      cookieStore.delete('tmdb_helper_session')
    }

    return NextResponse.json({ 
      success: true, 
      message: '用户会话已清除'
    })

  } catch (error) {
    console.error('[API User] DELETE 错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// 简单的会话管理工具函数
function createSession(userId: string, displayName?: string, avatarUrl?: string): string {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  userSessions.set(sessionId, { 
    userId, 
    displayName: displayName || undefined, 
    avatarUrl: avatarUrl || undefined 
  })
  
  // 设置会话过期时间（24小时）
  setTimeout(() => {
    userSessions.delete(sessionId)
  }, 24 * 60 * 60 * 1000)

  return sessionId
}