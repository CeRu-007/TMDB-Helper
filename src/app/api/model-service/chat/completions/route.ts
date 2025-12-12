import { NextRequest, NextResponse } from 'next/server'
import { ModelServiceStorage } from '@/lib/data/model-service-storage'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      modelId,
      messages,
      temperature = 0.7,
      max_tokens = 800
    } = body

    if (!modelId || !messages) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 获取模型服务配置
    const modelServiceConfig = await ModelServiceStorage.getConfig()

    // 查找指定的模型
    const model = modelServiceConfig.models.find(m => m.id === modelId)
    if (!model) {
      return NextResponse.json(
        { error: '未找到指定的模型' },
        { status: 404 }
      )
    }

    // 查找模型提供商
    const provider = modelServiceConfig.providers.find(p => p.id === model.providerId)
    if (!provider) {
      return NextResponse.json(
        { error: '未找到模型的提供商' },
        { status: 404 }
      )
    }

    if (!provider.apiKey) {
      return NextResponse.json(
        { error: '提供商API密钥未配置' },
        { status: 400 }
      )
    }

    // 使用提供商配置的API基础URL
    const apiUrl = `${provider.apiBaseUrl.replace(/\/$/, '')}/chat/completions`
    const headers = {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    }

    // 调用提供商API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model.modelId,
        messages,
        temperature,
        max_tokens,
        stream: false
      })
    })

    if (!response.ok) {
      const errorData = await response.text()

      // 尝试解析错误详情
      let parsedError = null
      try {
        parsedError = JSON.parse(errorData)
      } catch (e) {
        // 如果不是JSON格式，保持原始错误信息
      }

      // 检查是否是余额不足错误
      if (response.status === 403 && parsedError) {
        const errorCode = parsedError.code
        const errorMessage = parsedError.message

        if (errorCode === 30001 || (errorMessage && errorMessage.includes('account balance is insufficient'))) {
          return NextResponse.json(
            {
              error: `API调用失败: ${response.status}`,
              details: errorData,
              errorType: 'INSUFFICIENT_BALANCE',
              userMessage: '您的API余额已用完'
            },
            { status: response.status }
          )
        }
      }

      return NextResponse.json(
        {
          error: `API调用失败: ${response.status}`,
          details: errorData
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // 验证响应格式
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'API返回格式异常' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        content: data.choices[0].message.content,
        usage: data.usage,
        model: data.model
      }
    })

  } catch (error: any) {
    console.error('模型服务API调用失败:', error)
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error.message
      },
      { status: 500 }
    )
  }
}