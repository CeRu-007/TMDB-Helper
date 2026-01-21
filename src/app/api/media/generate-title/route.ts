import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/common';

// 魔搭社区API配置
const MODELSCOPE_API_BASE = 'https://api-inference.modelscope.cn/v1';

// API 类型定义
interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ModelRequestBody {
  model: string;
  messages: ModelMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface GenerateTitleRequest {
  model: string;
  firstMessage: string;
  apiKey: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateTitleRequest;
    const { model, firstMessage, apiKey } = body;

    if (!apiKey) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'API密钥未提供',
          data: null
        },
        { status: 400 }
      );
    }

    // 验证API密钥格式
    if (!apiKey.startsWith('ms-')) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'API密钥格式不正确',
          details: '请使用魔搭社区(ModelScope)的API密钥，格式应为ms-开头',
          data: null
        },
        { status: 400 }
      );
    }

    if (!model || !firstMessage) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '缺少必要参数',
          data: null
        },
        { status: 400 }
      );
    }

    console.log('调用魔搭社区API生成标题:', {
      model,
      firstMessage: firstMessage.substring(0, 50) + '...',
      apiKeyPrefix: apiKey.substring(0, 10) + '...'
    });

    // 构建专门用于生成标题的提示词
    const titlePrompt = {
      role: 'user',
      content: `请基于以下用户消息生成一个简洁明了的对话标题（不超过20个字符）：

用户消息：${firstMessage}

要求：
1. 标题应简洁明了，不超过20个字符
2. 准确反映对话的核心主题
3. 使用中文
4. 直接输出标题，不要包含其他说明文字

请提供你的建议：`
    };

    // 构建请求体
    let requestBody: ModelRequestBody = {
      model,
      messages: [titlePrompt],
      stream: false // 非流式响应
    };

    // DeepSeek-V3.1 特殊处理
    const isDeepSeekV3 = model === 'deepseek-ai/DeepSeek-V3.1';
    if (isDeepSeekV3) {
      requestBody.messages = requestBody.messages.filter((m: ModelMessage) => m.role !== 'system');
    }

    // Qwen3-Next 特殊处理
    const isQwen3Next = model === 'Qwen/Qwen3-Next-80B-A3B-Instruct';
    if (isQwen3Next) {
      if (!requestBody.messages.some((m: ModelMessage) => m.role === 'system')) {
        requestBody.messages = [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...requestBody.messages
        ];
      }
    }

    console.log('发送标题生成请求体:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${MODELSCOPE_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('API调用失败:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });

      let errorDetails = errorData;
      try {
        const errorJson = JSON.parse(errorData);
        errorDetails = errorJson.error?.message || errorJson.message || errorData;
      } catch (e) {
        // 保持原始错误信息
      }

      return NextResponse.json(
        {
          error: `魔搭社区API调用失败: ${response.status} ${response.statusText}`,
          details: errorDetails
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    // 清理生成的标题，确保不超过20个字符
    let title = content.trim();
    if (title.length > 20) {
      title = title.substring(0, 20) + '...';
    }

    // 如果标题为空，使用默认标题
    if (!title) {
      title = '新对话';
    }

    return NextResponse.json<ApiResponse<{ title: string }>>({
      success: true,
      data: {
        title: title
      }
    });

  } catch (error: unknown) {
    console.error('服务器内部错误:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: '服务器内部错误',
        data: null,
        details: errorMessage
      },
      { status: 500 }
    );
  }
}