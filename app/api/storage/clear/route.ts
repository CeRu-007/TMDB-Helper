import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/user-utils'
import { clearUserData } from '@/lib/user-aware-storage'

/**
 * 清空用户存储数据
 */
export async function POST(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '用户身份验证失败'
      }, { status: 401 })
    }

    console.log(`[API] 清空用户 ${userId} 的存储数据`)

    // 清空用户数据
    const success = clearUserData(userId)

    if (success) {
      console.log(`[API] 用户 ${userId} 的存储数据已清空`)
      return NextResponse.json({
        success: true,
        message: '存储数据已清空'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '清空存储数据失败'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[API] 清空存储数据失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 })
  }
}
