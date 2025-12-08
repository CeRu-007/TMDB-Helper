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

    // 清空用户数据
    const success = clearUserData(userId)

    if (success) {
      
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
    
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 })
  }
}
