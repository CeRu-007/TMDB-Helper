import { NextRequest, NextResponse } from 'next/server';

// 魔搭社区API配置
// 魔搭社区：使用 ms- 开头的密钥，端点为 api-inference.modelscope.cn
// 这是独立的开源模型推理服务，与阿里云无关
const MODELSCOPE_API_BASE = 'https://api-inference.modelscope.cn/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      model,
      messages,
      temperature = 0.7,
      max_tokens = 800,
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
      console.warn('API密钥格式警告: API密钥长度过短或为空');
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

    // 魔搭社区API调用
    console.log('使用魔搭社区ModelScope API:', {
      model,
      messagesCount: messages.length,
      temperature,
      max_tokens,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      service: 'ModelScope'
    });

    const serviceType = 'ModelScope';
    const apiEndpoint = `${MODELSCOPE_API_BASE}/chat/completions`;

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: false, // 确保不使用流式响应
        // 尝试添加参数来控制GLM-4.5的输出格式
        response_format: { type: "json_object" },
        // 降低温度以获得更确定性的输出
        top_p: 0.8
      })
    });



    if (!response.ok) {
      const errorData = await response.text();
      console.error(`${serviceType} API错误:`, response.status, response.statusText, errorData);
      console.error('请求详情:', {
        url: apiEndpoint,
        method: 'POST',
        service: serviceType,
        headers: {
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        }
      });

      return NextResponse.json(
        {
          error: `${serviceType} API调用失败: ${response.status} ${response.statusText}`,
          details: errorData,
          service: serviceType,
          endpoint: apiEndpoint
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
        console.error('收到HTML响应而不是JSON，可能是API端点错误或认证失败');
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
      console.log(`${serviceType} API解析后响应:`, { service: serviceType, data });
    } catch (parseError) {
      console.error('解析API响应失败:', parseError);
      return NextResponse.json(
        {
          error: 'API响应格式错误，无法解析JSON',
          details: parseError.message,
          service: serviceType
        },
        { status: 500 }
      );
    }

    // 解析魔搭社区API响应 (OpenAI兼容格式)
    console.log('魔搭社区API完整响应数据:', JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('响应格式验证失败:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        hasFirstChoice: !!data.choices?.[0],
        hasMessage: !!data.choices?.[0]?.message,
        fullData: data
      });

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

    // GLM-4.5等模型可能将内容放在reasoning_content中
    const message = data.choices[0].message;
    let messageContent = message.content;

    // 如果content为空，尝试使用reasoning_content
    if (!messageContent && message.reasoning_content) {
      messageContent = message.reasoning_content;
      console.log('使用reasoning_content作为响应内容');

      // 尝试多种方式提取JSON
      let extractedJson = null;

      // 方法1: 提取最后一个完整的JSON对象
      const jsonMatches = messageContent.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
      if (jsonMatches && jsonMatches.length > 0) {
        extractedJson = jsonMatches[jsonMatches.length - 1];
        console.log('方法1: 提取到最后一个JSON:', extractedJson);
      }

      // 方法2: 如果方法1失败，尝试提取任何包含title和summary的JSON片段
      if (!extractedJson) {
        const titleMatch = messageContent.match(/"title"\s*:\s*"([^"]+)"/);
        const summaryMatch = messageContent.match(/"summary"\s*:\s*"([^"]+)"/);
        const confidenceMatch = messageContent.match(/"confidence"\s*:\s*([\d.]+)/);

        if (titleMatch && summaryMatch) {
          extractedJson = JSON.stringify({
            title: titleMatch[1],
            summary: summaryMatch[1],
            confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.8
          });
          console.log('方法2: 重构JSON:', extractedJson);
        }
      }

      // 方法3: 专门处理GLM-4.5的推理内容
      if (!extractedJson) {
        // 尝试提取"简介："或"内容："后的文本
        const summaryPatterns = [
          /简介[：:]\s*[""]?([^""]+)[""]?/,
          /内容[：:]\s*[""]?([^""]+)[""]?/,
          /故事[：:]\s*[""]?([^""]+)[""]?/,
          /剧情[：:]\s*[""]?([^""]+)[""]?/,
          /概述[：:]\s*[""]?([^""]+)[""]?/
        ];

        for (const pattern of summaryPatterns) {
          const match = messageContent.match(pattern);
          if (match && match[1].length > 20) {
            extractedJson = JSON.stringify({
              title: "第集",
              summary: match[1].trim(),
              confidence: 0.7
            });
            console.log('方法3: 提取标签后内容:', extractedJson);
            break;
          }
        }
      }

      // 方法4: 如果还是没有，尝试提取引号内的内容作为简介
      if (!extractedJson && messageContent.includes('"')) {
        const quotedContent = messageContent.match(/"([^"]{20,})"/);
        if (quotedContent) {
          extractedJson = JSON.stringify({
            title: "第集",
            summary: quotedContent[1],
            confidence: 0.6
          });
          console.log('方法4: 提取引号内容:', extractedJson);
        }
      }

      // 方法5: 最后尝试提取最后一段有意义的文本
      if (!extractedJson) {
        const sentences = messageContent.split(/[。！？.!?]/).filter(s => s.trim().length > 15);
        if (sentences.length > 0) {
          const lastSentence = sentences[sentences.length - 1].trim();
          if (lastSentence.length > 20) {
            extractedJson = JSON.stringify({
              title: "第集",
              summary: lastSentence + '。',
              confidence: 0.5
            });
            console.log('方法5: 提取最后一句:', extractedJson);
          }
        }
      }

      if (extractedJson) {
        messageContent = extractedJson;
      }
    }

    console.log('提取的消息内容:', {
      content: messageContent,
      contentType: typeof messageContent,
      contentLength: messageContent?.length,
      isEmpty: !messageContent,
      hasReasoningContent: !!message.reasoning_content,
      reasoningContentLength: message.reasoning_content?.length
    });

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
    console.error('API调用错误:', error);

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
        id: 'qwen-turbo',
        name: 'Qwen-Turbo',
        description: '通义千问超快版，适合快速响应场景'
      },
      {
        id: 'qwen-plus',
        name: 'Qwen-Plus',
        description: '通义千问增强版，平衡性能与成本'
      },
      {
        id: 'qwen-max',
        name: 'Qwen-Max',
        description: '通义千问旗舰版，最强性能'
      },
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
        id: 'Qwen/Qwen3-235B-A22B-Thinking-2507',
        name: 'Qwen3-235B-Thinking',
        description: '通义千问3代思考模式，235B参数，顶级推理'
      },
      {
        id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
        name: 'DeepSeek-R1-Distill-Qwen-32B',
        description: 'DeepSeek R1蒸馏版本，32B参数，高效推理'
      },
      {
        id: 'qwen2.5-72b-instruct',
        name: 'Qwen2.5-72B-Instruct',
        description: '通义千问2.5开源版本，72B参数'
      },
      {
        id: 'qwen2.5-32b-instruct',
        name: 'Qwen2.5-32B-Instruct',
        description: '通义千问2.5开源版本，32B参数'
      },
      {
        id: 'qwen2.5-14b-instruct',
        name: 'Qwen2.5-14B-Instruct',
        description: '通义千问2.5开源版本，14B参数'
      },
      {
        id: 'qwen2.5-7b-instruct',
        name: 'Qwen2.5-7B-Instruct',
        description: '通义千问2.5开源版本，7B参数'
      }
    ];
    
    return NextResponse.json({
      success: true,
      data: models
    });

  } catch (error: any) {
    console.error('获取模型列表错误:', error);
    
    return NextResponse.json(
      { 
        error: '服务器内部错误',
        details: error.message
      },
      { status: 500 }
    );
  }
}
