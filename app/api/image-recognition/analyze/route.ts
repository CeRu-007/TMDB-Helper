import { NextRequest, NextResponse } from 'next/server'
import { ServerConfigManager } from '@/lib/server-config-manager'

// 魔搭社区API配置
const MODELSCOPE_API_BASE = 'https://api-inference.modelscope.cn/v1'
const QWEN_VL_MODEL = 'Qwen/Qwen3-VL-235B-A22B-Instruct'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image } = body

    if (!image) {
      return NextResponse.json(
        { error: '图片数据未提供' },
        { status: 400 }
      )
    }

    // 获取魔搭社区API密钥
    const config = ServerConfigManager.getConfig()
    const apiKey = config.modelScopeApiKey

    if (!apiKey) {
      return NextResponse.json(
        { error: '魔搭社区API密钥未配置，请在设置中配置' },
        { status: 400 }
      )
    }

    // 验证API密钥格式
    if (!apiKey.startsWith('ms-')) {
      return NextResponse.json(
        { 
          error: 'API密钥格式不正确',
          details: '请使用魔搭社区(ModelScope)的API密钥，格式应为ms-开头'
        },
        { status: 400 }
      )
    }

    // 构建请求消息
    const messages = [{
      role: 'user',
      content: [{
        type: 'text',
        text: `请详细分析这张图片，识别其中的影视作品相关信息。请按以下格式回答：

1. 图片类型：（海报/剧照/背景图等）
2. 主要内容：（详细描述图片中的人物、场景、文字等）
3. 风格特征：（艺术风格、色调、构图等）
4. 可能的影视类型：（电影/电视剧/动漫等）
5. 关键词：（用逗号分隔的关键词，用于搜索）

请尽可能详细和准确地描述，这将用于在影视数据库中搜索匹配的作品。`
      }, {
        type: 'image_url',
        image_url: {
          url: image
        }
      }]
    }]

    // 调用魔搭社区API
    const response = await fetch(`${MODELSCOPE_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: QWEN_VL_MODEL,
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
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

      return NextResponse.json(
        {
          error: `魔搭社区API调用失败: ${response.status} ${response.statusText}`,
          details: errorDetails
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || ''

    if (!content) {
      return NextResponse.json(
        { error: '模型未返回有效内容' },
        { status: 500 }
      )
    }

    // 解析模型返回的内容
    const analysisResult = parseAnalysisResult(content)

    return NextResponse.json({
      success: true,
      description: analysisResult.description,
      confidence: analysisResult.confidence,
      keywords: analysisResult.keywords,
      rawContent: content
    })

  } catch (error) {
    console.error('Image analysis error:', error)
    return NextResponse.json(
      { 
        error: '图像分析失败',
        details: error instanceof Error ? error.message : '未知错误'
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

  // 如果没有找到关键词，尝试从描述中提取
  if (keywords.length === 0) {
    // 简单的关键词提取逻辑
    const commonWords = ['电影', '电视剧', '动漫', '海报', '剧照', '人物', '场景', '背景']
    keywords = commonWords.filter(word => content.includes(word))
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