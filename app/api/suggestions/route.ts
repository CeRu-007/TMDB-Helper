import { NextRequest, NextResponse } from 'next/server';

// 魔搭社区API配置
const MODELSCOPE_API_BASE = 'https://api-inference.modelscope.cn/v1';

// 解析引导建议的函数
function parseSuggestions(text: string): string[] {
  const suggestions: string[] = [];
  
  // 如果输入为空，直接返回空数组
  if (!text || typeof text !== 'string') {
    return suggestions;
  }
  
  // 清理文本，移除多余的空白字符
  const cleanText = text.trim();
  if (!cleanText) {
    return suggestions;
  }
  
  // 尝试多种格式解析
  
  // 格式1: 数字列表 (1. xxx 2. xxx 3. xxx)
  const numberListMatch = cleanText.match(/\d+\.\s*([^\n]+)/g);
  if (numberListMatch && numberListMatch.length > 0) {
    const result = numberListMatch
      .map(item => item.replace(/^\d+\.\s*/, '').trim())
      .filter(item => item.length > 0)
      .slice(0, 3);
    if (result.length > 0) {
      return result;
    }
  }
  
  // 格式2: 项目符号 (- xxx, * xxx, • xxx)
  const bulletMatch = cleanText.match(/^[*\-•]\s*([^\n]+)/gm);
  if (bulletMatch && bulletMatch.length > 0) {
    const result = bulletMatch
      .map(item => item.replace(/^[*\-•]\s*/, '').trim())
      .filter(item => item.length > 0)
      .slice(0, 3);
    if (result.length > 0) {
      return result;
    }
  }
  
  // 格式3: 分行列表（每行一个建议）
  const lines = cleanText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  if (lines.length > 0) {
    // 如果行数不多且每行内容较短，可能是建议列表
    if (lines.length <= 5 && lines.every(line => line.length <= 100)) {
      return lines.slice(0, 3);
    }
    // 否则尝试提取较短的行作为建议
    const shortLines = lines.filter(line => line.length <= 50 && line.length > 3);
    if (shortLines.length > 0) {
      return shortLines.slice(0, 3);
    }
  }
  
  // 格式4: 包含关键词的句子
  const sentences = cleanText.split(/[。！？]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  const keywordSentences = sentences.filter(s => 
    s.includes('建议') || s.includes('推荐') || s.includes('可以') || 
    s.includes('试试') || s.includes('了解') || s.includes('查看') ||
    s.includes('如何') || s.includes('为什么') || s.includes('什么')
  );
  
  if (keywordSentences.length > 0) {
    return keywordSentences
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 3);
  }
  
  // 最后尝试返回前几行作为建议
  if (lines.length > 0) {
    return lines.slice(0, 3);
  }
  
  return suggestions;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, messages, apiKey, lastMessage } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API密钥未提供' },
        { status: 400 }
      );
    }

    // 验证API密钥格式
    if (!apiKey.startsWith('ms-')) {
      return NextResponse.json(
        { 
          error: 'API密钥格式不正确',
          details: '请使用魔搭社区(ModelScope)的API密钥，格式应为ms-开头'
        },
        { status: 400 }
      );
    }

    if (!model || !messages || !lastMessage) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 验证消息格式
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: '消息格式错误，messages必须是非空数组' },
        { status: 400 }
      );
    }

    console.log('调用魔搭社区API获取建议:', {
      model,
      messagesCount: messages.length,
      lastMessage: lastMessage.substring(0, 50) + '...',
      apiKeyPrefix: apiKey.substring(0, 10) + '...'
    });

    // 构建专门用于获取建议的提示词
    const suggestionPrompt = {
      role: 'user',
      content: `基于以下对话内容，为用户生成3个不同类型的问题或建议，帮助用户从多个角度探索内容：

对话内容：
${lastMessage}

要求：
1. 生成3个不同类型的问题或建议（每个不超过20字）
2. 其中一个建议可以是关于深入探讨当前内容的剧情细节
3. 另外两个建议应该从不同角度探索相关话题，例如：
   - 世界观设定
   - 角色背景
   - 创作背景
   - 相关作品
   - 文化影响
   - 技术细节
   - 艺术特色
   - 历史渊源
   - 后续发展
   - 特殊设定
4. 格式为列表形式，每行一个建议
5. 直接输出建议列表，不要包含其他说明文字
6. 避免生成过于宽泛或模糊的建议

示例格式：
深入探讨剧情细节
了解世界观设定
探索相关作品

请提供你的建议：`
    };

    // 构建请求体
    let requestBody: any = {
      model,
      messages: [...messages, suggestionPrompt],
      stream: false // 非流式响应
    };

    // DeepSeek-V3.1 特殊处理
    const isDeepSeekV3 = model === 'deepseek-ai/DeepSeek-V3.1';
    if (isDeepSeekV3) {
      requestBody.messages = requestBody.messages.filter((m: any) => m.role !== 'system');
    }

    // Qwen3-Next 特殊处理
    const isQwen3Next = model === 'Qwen/Qwen3-Next-80B-A3B-Instruct';
    if (isQwen3Next) {
      if (!requestBody.messages.some((m: any) => m.role === 'system')) {
        requestBody.messages = [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...requestBody.messages
        ];
      }
    }

    console.log('发送建议请求体:', JSON.stringify(requestBody, null, 2));

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

    // 解析建议
    let suggestions = parseSuggestions(content);
    
    // 确保始终返回有效的建议
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      console.warn('解析建议失败或结果为空，使用默认建议');
      suggestions = ['深入探讨这个话题', '提供更多细节', '换个角度分析'];
    } else {
      // 清理建议内容，确保都是非空字符串
      suggestions = suggestions
        .map(s => typeof s === 'string' ? s.trim() : '')
        .filter(s => s.length > 0)
        .slice(0, 3);
      
      // 如果清理后没有有效建议，使用默认建议
      if (suggestions.length === 0) {
        suggestions = ['深入探讨这个话题', '提供更多细节', '换个角度分析'];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        suggestions: suggestions
      }
    });

  } catch (error: any) {
    console.error('服务器内部错误:', error);
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error.message
      },
      { status: 500 }
    );
  }
}
