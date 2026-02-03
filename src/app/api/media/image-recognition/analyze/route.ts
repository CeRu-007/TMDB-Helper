import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types/common'
import { ModelProvider, ModelConfig } from '@/shared/types/model-service'

// 请求接口
interface ImageAnalysisRequest {
  image: string
  model?: string
}

// API 响应类型
interface ModelServiceResponse {
  success: boolean
  scenario: {
    primaryModelId: string
  }
  models: ModelConfig[]
  providers: ModelProvider[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ImageAnalysisRequest
    const { image } = body

    if (!image) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '图片数据未提供',
          data: null
        },
        { status: 400 }
      )
    }

    // 从模型服务系统获取图像分析场景配置
    const modelServiceResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/model-service/scenario?scenario=image_analysis`)
    if (!modelServiceResponse.ok) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '获取模型服务配置失败',
          data: null
        },
        { status: 500 }
      )
    }

    const modelServiceData = await modelServiceResponse.json() as ModelServiceResponse
    if (!modelServiceData.success || !modelServiceData.scenario || !modelServiceData.scenario.primaryModelId) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '图像分析场景未配置，请在模型服务-使用场景中配置模型',
          data: null
        },
        { status: 400 }
      )
    }

    // 获取主模型和对应的提供商
    const primaryModelId = modelServiceData.scenario.primaryModelId
    const primaryModel = modelServiceData.models.find((m: ModelConfig) => m.id === primaryModelId)
    if (!primaryModel) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '配置的模型不存在，请重新配置',
          data: null
        },
        { status: 400 }
      )
    }

    const provider = modelServiceData.providers.find((p: ModelProvider) => p.id === primaryModel.providerId)
    if (!provider || !provider.apiKey) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '模型提供商未配置API密钥，请在设置中配置',
          data: null
        },
        { status: 400 }
      )
    }

    const apiKey = provider.apiKey
    const apiBaseUrl = provider.apiBaseUrl
    const modelId = primaryModel.modelId || primaryModel.id  // 优先使用modelId，它是真实的模型名称

    // 获取场景参数
    const temperature = modelServiceData.scenario.parameters?.temperature || 0.7
    const maxTokens = modelServiceData.scenario.parameters?.max_tokens || 2000

    // 处理图像格式 - 魔搭社区API可能需要base64格式
    let imageContent: string | { type: string; image_url: string }
    if (image.startsWith('data:')) {
      // 已经是data URL格式
      imageContent = {
        type: 'image_url',
        image_url: {
          url: image
        }
      }
    } else {
      // 如果是URL，保持原样
      imageContent = {
        type: 'image_url',
        image_url: {
          url: image
        }
      }
    }

    // 构建请求消息
    const messages = [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `请详细分析这张图片，识别其中的影视作品相关信息。请按以下格式回答：

1. 图片类型：（海报/剧照/背景图等）
2. 主要内容：（详细描述图片中的人物、场景、文字等）
3. 风格特征：（艺术风格、色调、构图等）
4. 可能的影视类型：（电影/电视剧/动漫等）
5. 关键词：（用逗号分隔的关键词，用于搜索）

请尽可能详细和准确地描述，这将用于在影视数据库中搜索匹配的作品。`
        },
        imageContent
      ]
    }]

    // 调用模型API
    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature
      })
    })

    if (!response.ok) {
      let errorDetails = `HTTP ${response.status}`
      try {
        const errorData = await response.text()
        const errorJson = JSON.parse(errorData)
        errorDetails = errorJson.error?.message || errorJson.message || errorData
      } catch (e) {
        // 保持原始错误信息
      }

      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `魔搭社区API调用失败: ${response.status} ${response.statusText}`,
          data: null,
          details: errorDetails
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || ''

    if (!content) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '模型未返回有效内容',
          data: null
        },
        { status: 500 }
      )
    }

    // 解析模型返回的内容
    const analysisResult = parseAnalysisResult(content)

    return NextResponse.json<ApiResponse<{
      description: string;
      confidence: number;
      keywords: string[];
      rawContent: string;
    }>>({
      success: true,
      data: {
        description: analysisResult.description,
        confidence: analysisResult.confidence,
        keywords: analysisResult.keywords,
        rawContent: content
      }
    })

  } catch (error: unknown) {
    console.error('Image analysis error:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: '图像分析失败',
        data: null,
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

// 解析模型分析结果
function parseAnalysisResult(content: string) {
  const lines = content.split('\n').filter(line => line.trim())
  
  let description = ''
  let keywords: string[] = []
  let confidence = 0.8 // 默认置信度

  // 提取主要内容作为描述
  const mainContentMatch = content.match(/主要内容[：:]\s*(.+?)(?=\n|$)/i)
  if (mainContentMatch) {
    description = mainContentMatch[1].trim()
  }

  // 提取关键词
  const keywordsMatch = content.match(/关键词[：:]\s*(.+?)(?=\n|$)/i)
  if (keywordsMatch) {
    keywords = keywordsMatch[1]
      .split(/[，,、]/)
      .map(k => k.trim())
      .filter(k => k.length > 0)
  }

  // 如果没有找到结构化内容，使用整个内容作为描述
  if (!description) {
    description = content.substring(0, 200) + (content.length > 200 ? '...' : '')
  }

  // 确保description不为空
  if (!description || description.trim().length === 0) {
    description = '无法识别图片内容'
  }

  // 如果没有找到关键词，尝试从描述中提取
  if (keywords.length === 0) {
    // 简单的关键词提取逻辑
    const commonWords = ['电影', '电视剧', '动漫', '海报', '剧照', '人物', '场景', '背景']
    keywords = commonWords.filter(word => content.includes(word))
    
    // 如果仍然没有关键词，提供默认关键词以避免搜索失败
    if (keywords.length === 0) {
      keywords = ['影视', '图像']
    }
  }

  // 根据内容质量调整置信度
  if (description.length > 50 && keywords.length > 2) {
    confidence = 0.9
  } else if (description.length > 20 && keywords.length > 0) {
    confidence = 0.7
  } else {
    confidence = 0.5
  }

  return {
    description,
    keywords,
    confidence
  }
}