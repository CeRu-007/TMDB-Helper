import { NextRequest, NextResponse } from 'next/server';

// 魔搭社区API配置
// 魔搭社区：使用 ms- 开头的密钥，端点为 api-inference.modelscope.cn
// 这是独立的开源模型推理服务，与阿里云无关
const MODELSCOPE_API_BASE = 'https://api-inference.modelscope.cn/v1';

// 处理流式响应的函数（用于思考模型）
async function handleStreamResponse(response: Response, serviceType: string) {
  try {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    let thinkingContent = '';
    let answerContent = '';
    let done_thinking = false;

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;

            if (delta) {
              const thinking_chunk = delta.reasoning_content || '';
              const answer_chunk = delta.content || '';

              if (thinking_chunk) {
                thinkingContent += thinking_chunk;
              } else if (answer_chunk) {
                if (!done_thinking) {
                  done_thinking = true;
                }
                answerContent += answer_chunk;
              }
            }
          } catch (e) {
            // 忽略解析错误的行
            continue;
          }
        }
      }
    }

    // 返回最终答案内容
    return NextResponse.json({
      success: true,
      data: {
        content: answerContent || thinkingContent, // 如果没有答案内容，使用思考内容
        thinking: thinkingContent,
        answer: answerContent,
        service: serviceType
      }
    });

  } catch (error: any) {
    
    return NextResponse.json(
      {
        error: '处理流式响应失败',
        details: error?.message || '未知错误',
        service: serviceType
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      model,
      messages,
      apiKey
    } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API密钥未提供' },
        { status: 400 }
      );
    }

    // 验证API密钥基本格式（移除过于严格的sk-前缀要求）
    if (!apiKey || apiKey.length < 10) {
      
      return NextResponse.json(
        {
          error: 'API密钥格式错误：密钥不能为空且长度不能过短',
          details: '请确保提供了有效的API密钥'
        },
        { status: 400 }
      );
    }

    // 检查API密钥格式
    const isModelScopeKey = apiKey.startsWith('ms-');

    console.log('API密钥格式信息:', {
      startsWithMs: isModelScopeKey,
      length: apiKey.length,
      prefix: apiKey.substring(0, 10) + '...',
      detectedService: isModelScopeKey ? 'ModelScope' : 'Unknown'
    });

    // 只支持魔搭社区密钥
    if (!isModelScopeKey) {
      return NextResponse.json(
        {
          error: 'API密钥格式不正确',
          details: '请使用魔搭社区(ModelScope)的API密钥，格式应为ms-开头',
          currentFormat: `当前密钥以 "${apiKey.substring(0, 3)}" 开头`,
          suggestion: {
            title: '获取正确的API密钥',
            options: [
              '1. 访问魔搭社区: https://modelscope.cn/',
              '2. 注册并登录账户',
              '3. 获取API推理服务密钥（以ms-开头）'
            ]
          }
        },
        { status: 400 }
      );
    }

    if (!model || !messages) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const serviceType = 'ModelScope';

    // 验证消息格式
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          error: '消息格式错误',
          details: 'messages 必须是非空数组',
          service: serviceType
        },
        { status: 400 }
      );
    }

    // 验证每个消息的格式
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (!message.role || !message.content) {
        return NextResponse.json(
          {
            error: '消息格式错误',
            details: `第${i + 1}个消息缺少 role 或 content 字段`,
            service: serviceType,
            debug: { messageIndex: i, message }
          },
          { status: 400 }
        );
      }
      if (!['system', 'user', 'assistant'].includes(message.role)) {
        return NextResponse.json(
          {
            error: '消息格式错误',
            details: `第${i + 1}个消息的 role 必须是 system, user 或 assistant`,
            service: serviceType,
            debug: { messageIndex: i, invalidRole: message.role }
          },
          { status: 400 }
        );
      }
    }

    // 魔搭社区API调用
    console.log('使用魔搭社区ModelScope API:', {
      model,
      messagesCount: messages.length,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      service: 'ModelScope'
    });

    const apiEndpoint = `${MODELSCOPE_API_BASE}/chat/completions`;

    // 检查是否是需要特殊处理的思考模型（Qwen3-32B 和 DeepSeek-R1 系列）
    const isThinkingModel = model.includes('Qwen3-32B') || model.includes('DeepSeek-R1');

    // 构建请求体
    const requestBody: any = {
      model,
      messages,
      stream: isThinkingModel // 只有思考模型使用流式响应
    };

    // 为思考模型添加 extra_body 参数
    if (isThinkingModel) {
      requestBody.extra_body = {
        enable_thinking: true,
        thinking_budget: 4096
      };
    }

    console.log('发送到魔搭社区的请求体:', JSON.stringify(requestBody, null, 2));
    console.log('请求详情:', {
      url: apiEndpoint,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
        'Content-Type': 'application/json'
      }
    });

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // 处理流式响应（思考模型）
    if (isThinkingModel) {
      return await handleStreamResponse(response, serviceType);
    }

    if (!response.ok) {
      const errorData = await response.text();
      
      console.error('请求详情:', {
        url: apiEndpoint,
        method: 'POST',
        service: serviceType,
        model: model,
        requestBody: JSON.stringify(requestBody, null, 2),
        headers: {
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        }
      });

      // 尝试解析错误响应
      let errorDetails = errorData;
      try {
        const errorJson = JSON.parse(errorData);
        errorDetails = errorJson.error?.message || errorJson.message || errorData;
        
      } catch (e) {
        
      }

      return NextResponse.json(
        {
          error: `${serviceType} API调用失败: ${response.status} ${response.statusText}`,
          details: errorDetails,
          service: serviceType,
          endpoint: apiEndpoint,
          debug: {
            model,
            requestBody,
            responseStatus: response.status,
            responseStatusText: response.statusText
          }
        },
        { status: response.status }
      );
    }

    // 安全地解析JSON响应
    let data;
    try {
      const responseText = await response.text();
      console.log(`${serviceType} API原始响应:`, responseText.substring(0, 500));

      // 检查响应是否是HTML（错误页面）
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        
        return NextResponse.json(
          {
            error: 'API端点返回HTML页面，请检查API密钥和端点配置',
            details: responseText.substring(0, 200) + '...',
            service: serviceType
          },
          { status: 500 }
        );
      }

      data = JSON.parse(responseText);
      
    } catch (parseError: any) {
      
      return NextResponse.json(
        {
          error: 'API响应格式错误，无法解析JSON',
          details: parseError?.message || '未知解析错误',
          service: serviceType
        },
        { status: 500 }
      );
    }

    // 解析魔搭社区API响应 (OpenAI兼容格式)
    console.log('魔搭社区API完整响应数据:', JSON.stringify(data, null, 2));

    // 详细检查响应结构
    console.log('响应结构分析:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      firstChoice: data.choices?.[0],
      message: data.choices?.[0]?.message,
      messageKeys: data.choices?.[0]?.message ? Object.keys(data.choices[0].message) : []
    });

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      
      return NextResponse.json(
        {
          error: '魔搭社区API返回格式异常',
          service: serviceType,
          responseData: data,
          debug: {
            hasChoices: !!data.choices,
            choicesLength: data.choices?.length,
            hasFirstChoice: !!data.choices?.[0],
            hasMessage: !!data.choices?.[0]?.message
          }
        },
        { status: 500 }
      );
    }

    // 处理响应内容
    const message = data.choices[0].message;
    let messageContent = message.content;

    // 如果 content 为空，尝试使用 reasoning_content 作为回退
    if (!messageContent && message.reasoning_content) {
      messageContent = message.reasoning_content;
      
    }

    // 检查最终内容是否为空
    if (!messageContent) {
      
      return NextResponse.json(
        {
          error: '模型返回内容为空',
          details: '模型没有返回有效的内容，请检查提示词或重试',
          service: serviceType,
          debug: {
            hasContent: !!message.content,
            hasReasoningContent: !!message.reasoning_content,
            messageKeys: Object.keys(message)
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        content: messageContent,
        usage: data.usage,
        model: data.model || model,
        service: serviceType
      }
    });

  } catch (error: any) {
    
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// 获取可用模型列表
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API密钥未提供' },
        { status: 400 }
      );
    }

    // 魔搭社区支持的模型列表（手动维护，因为API可能不提供模型列表接口）
    const models = [
      {
        id: 'ZhipuAI/GLM-4.5',
        name: 'GLM-4.5',
        description: '智谱AI旗舰模型，专为智能体设计'
      },
      {
        id: 'Qwen/Qwen3-32B',
        name: 'Qwen3-32B',
        description: '通义千问3代，32B参数，强大推理能力'
      },

      {
        id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
        name: 'DeepSeek-R1-Distill-Qwen-32B',
        description: 'DeepSeek R1蒸馏版本，32B参数，高效推理'
      },
      {
        id: 'Qwen/Qwen2.5-72B-Instruct',
        name: 'Qwen2.5-72B-Instruct',
        description: '开源版本，72B参数'
      },

      {
        id: 'Qwen/Qwen2.5-14B-Instruct',
        name: 'Qwen2.5-14B-Instruct',
        description: '开源版本，14B参数'
      },
      {
        id: 'Qwen/Qwen2.5-7B-Instruct',
        name: 'Qwen2.5-7B-Instruct',
        description: '开源版本，7B参数'
      },
      {
        id: 'moonshotai/Kimi-K2-Instruct',
        name: 'Kimi-K2-Instruct',
        description: '月之暗面Kimi大模型，支持长文本理解'
      },
      {
        id: 'deepseek-ai/DeepSeek-R1-0528',
        name: 'DeepSeek-R1-0528',
        description: 'DeepSeek R1思考模型，具备强大的推理能力'
      }
    ];
    
    return NextResponse.json({
      success: true,
      data: models
    });

  } catch (error: any) {
    
    return NextResponse.json(
      { 
        error: '服务器内部错误',
        details: error.message
      },
      { status: 500 }
    );
  }
}
