import { NextRequest, NextResponse } from 'next/server'
import { TIMEOUT_10S } from '@/lib/constants/constants'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const { apiKey, apiBaseUrl } = await request.json()
    
    if (!apiKey || !apiBaseUrl) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数'
      }, { status: 400 })
    }
    
    const testUrl = `${apiBaseUrl}/models`
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(TIMEOUT_10S)
    })
    
    if (response.ok) {
      const data = await response.json()
      const modelCount = data.data?.length || 0
      
      return NextResponse.json({
        success: true,
        message: `连接成功! 发现 ${modelCount} 个可用模型`,
        models: data.data || []
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        message: `连接失败: ${response.status} ${response.statusText}`,
        details: errorText
      })
    }
  } catch (error) {
    logger.error('测试连接失败:', error)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          message: '连接超时,请检查API地址是否正确'
        })
      }
      
      return NextResponse.json({
        success: false,
        message: `连接错误: ${error.message}`
      })
    }
    
    return NextResponse.json({
      success: false,
      message: '未知错误'
    }, { status: 500 })
  }
}
