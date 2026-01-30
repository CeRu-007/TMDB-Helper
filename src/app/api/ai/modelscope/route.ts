import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// 类型定义
interface ModelScopeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ModelScopeRequestBody {
  model: string;
  messages: ModelScopeMessage[];
  stream: boolean;
}

// 魔搭社区API配置
const MODELSCOPE_API_BASE = 'https://api-inference.modelscope.cn/v1';

// 处理DeepSeek-V3.1流式响应（按照用户提供的示例）
async function handleDeepSeekStreamResponse(response: Response) {
  try {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    let reasoningContent = '';
    let answerContent = '';
    let done_reasoning = false;
    let fullContent = '';

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
              const reasoning_chunk = delta.reasoning_content || '';
              const answer_chunk = delta.content || '';

              // 按照DeepSeek-V3.1示例的逻辑处理
              if (reasoning_chunk !== '') {
                reasoningContent += reasoning_chunk;
              } else if (answer_chunk !== '') {
                if (!done_reasoning) {
                  done_reasoning = true;
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

    // 组合完整内容用于解析引导建议
    fullContent = answerContent || reasoningContent;
    
    // 解析引导建议（查找[引导建议]标记后的内容）
    let mainContent = fullContent;
    let suggestions: string[] = [];
    
    // 查找引导建议标记
    const suggestionMatch = fullContent.match(/\[请在回复后提供3个相关的引导问题或建议，帮助用户继续对话\]([\s\S]*)$/);
    if (suggestionMatch) {
      mainContent = fullContent.substring(0, suggestionMatch.index).trim();
      const suggestionText = suggestionMatch[1]?.trim() || '';

      // 解析引导建议（支持多种格式）
      suggestions = parseSuggestions(suggestionText);
    }

    // 返回最终答案内容（优先使用answer，如果没有则使用reasoning）
    return {
      success: true,
      data: {
        content: mainContent,
        reasoning: reasoningContent,
        answer: answerContent,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      }
    };

  } catch (error: unknown) {
    logger.error('处理DeepSeek流式响应失败:', error);
    throw new Error('处理流式响应失败: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// 解析引导建议的函数
function parseSuggestions(text: string): string[] {
  const suggestions: string[] = [];
  
  // 尝试多种格式解析
  
  // 格式1: 数字列表 (1. xxx 2. xxx 3. xxx)
  const numberListMatch = text.match(/\d+\.\s*([^\n]+)/g);
  if (numberListMatch) {
    return numberListMatch.map(item => item.replace(/^\d+\.\s*/, '').trim());
  }
  
  // 格式2: 项目符号 (- xxx, * xxx, • xxx)
  const bulletMatch = text.match(/^[*\-•]\s*([^\n]+)/gm);
  if (bulletMatch) {
    return bulletMatch.map(item => item.replace(/^[*\-•]\s*/, '').trim());
  }
  
  // 格式3: 分行列表（每行一个建议）
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length <= 5) { // 限制数量
    return lines.map(line => line.trim());
  }
  
  // 格式4: 包含关键词的句子
  const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 0);
  const keywordSentences = sentences.filter(s => 
    s.includes('建议') || s.includes('推荐') || s.includes('可以') || 
    s.includes('试试') || s.includes('了解') || s.includes('查看')
  );
  
  if (keywordSentences.length > 0) {
    return keywordSentences.slice(0, 3).map(s => s.trim());
  }
  
  return suggestions;
}

// 处理Qwen3-Next流式响应
async function handleQwenStreamResponse(response: Response) {
  try {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    let content = '';
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

            if (delta && delta.content) {
              content += delta.content;
            }
          } catch (e) {
            // 忽略解析错误的行
            continue;
          }
        }
      }
    }

    // 解析引导建议（查找[引导建议]标记后的内容）
    let mainContent = content;
    let suggestions: string[] = [];
    
    // 查找引导建议标记
    const suggestionMatch = content.match(/\[请在回复后提供3个相关的引导问题或建议，帮助用户继续对话\]([\s\S]*)$/);
    if (suggestionMatch) {
      mainContent = content.substring(0, suggestionMatch.index).trim();
      const suggestionText = suggestionMatch[1]?.trim() || '';

      // 解析引导建议
      suggestions = parseSuggestions(suggestionText);
    }

    return {
      success: true,
      data: {
        content: mainContent,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      }
    };

  } catch (error: unknown) {
    logger.error('处理Qwen流式响应失败:', error);
    throw new Error('处理流式响应失败: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, messages, apiKey } = body;

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

    if (!model || !messages) {
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

    logger.info('调用魔搭社区API:', {
      model,
      messagesCount: messages.length,
      apiKeyPrefix: apiKey.substring(0, 10) + '...'
    });

    // 根据模型类型构建请求
    const isDeepSeekV3 = model === 'deepseek-ai/DeepSeek-V3.1';
    const isQwen3Next = model === 'Qwen/Qwen3-Next-80B-A3B-Instruct';

    let requestBody: ModelScopeRequestBody = {
      model,
      messages: messages,
      stream: true // 都使用流式响应
    };

    // DeepSeek-V3.1 特殊处理（按照用户示例）
    if (isDeepSeekV3) {
      // DeepSeek-V3.1 不需要system消息，直接使用用户消息
      requestBody.messages = messages.filter(m => m.role !== 'system');
    }

    // Qwen3-Next 特殊处理（按照用户示例）
    if (isQwen3Next) {
      // 确保有system消息
      if (!messages.some(m => m.role === 'system')) {
        requestBody.messages = [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...messages
        ];
      }
    }

    logger.debug('发送请求体:', JSON.stringify(requestBody, null, 2));

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
      logger.error('API调用失败:', {
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

    // 根据模型类型处理流式响应
    let result;
    if (isDeepSeekV3) {
      result = await handleDeepSeekStreamResponse(response);
    } else if (isQwen3Next) {
      result = await handleQwenStreamResponse(response);
    } else {
      // 默认处理方式
      result = await handleQwenStreamResponse(response);
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    logger.error('服务器内部错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: '服务器内部错误', code: 'INTERNAL_ERROR', timestamp: Date.now() },
        data: null,
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

// 获取可用模型列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API密钥未提供' },
        { status: 400 }
      );
    }

    // 魔搭社区支持的模型列表（根据用户提供的示例）
    const models = [
      {
        id: 'deepseek-ai/DeepSeek-V3.1',
        name: 'DeepSeek-V3.1',
        description: '强大的推理和创作能力',
        isThinking: true
      },
      {
        id: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
        name: 'Qwen3-Next-80B',
        description: '优秀的中文理解能力',
        isThinking: false
      }
    ];
    
    return NextResponse.json({
      success: true,
      data: models
    });

  } catch (error: unknown) {
    logger.error('获取模型列表失败:', error);
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}