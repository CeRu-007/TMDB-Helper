import { NextRequest, NextResponse } from 'next/server';
import { BaseAPIRoute } from '@/lib/api/base-api-route';
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

interface ModelScopeChoice {
  message: {
    content: string;
  };
}

interface ModelScopeResponse {
  choices?: ModelScopeChoice[];
}

// 默认API配置（当未提供apiBaseUrl时使用）
const DEFAULT_API_BASE = "https://api-inference.modelscope.cn/v1";

const MODEL_DEEPSEEK_V3 = "deepseek-ai/DeepSeek-V3.1";
const MODEL_QWEN3_NEXT = "Qwen/Qwen3-Next-80B-A3B-Instruct";
const DEFAULT_SUGGESTIONS = ["深入探讨这个话题", "提供更多细节", "换个角度分析"];

function adaptMessagesForModel(messages: ModelScopeMessage[], model: string): ModelScopeMessage[] {
  if (model === MODEL_DEEPSEEK_V3) {
    return messages.filter((m) => m.role !== "system");
  }

  if (model === MODEL_QWEN3_NEXT && !messages.some((m) => m.role === "system")) {
    return [{ role: "system", content: "You are a helpful assistant." }, ...messages];
  }

  return messages;
}

function extractErrorDetails(errorData: string): string {
  try {
    const errorJson = JSON.parse(errorData);
    return errorJson.error?.message || errorJson.message || errorData;
  } catch {
    return errorData;
  }
}

// 解析引导建议的函数
function parseSuggestions(text: string): string[] {
  const suggestions: string[] = [];

  if (!text || typeof text !== "string") {
    return suggestions;
  }

  const cleanText = text.trim();
  if (!cleanText) {
    return suggestions;
  }

  // 格式1: 数字列表 (1. xxx 2. xxx 3. xxx)
  const numberListMatch = cleanText.match(/\d+\.\s*([^\n]+)/g);
  if (numberListMatch && numberListMatch.length > 0) {
    const result = numberListMatch
      .map((item) => item.replace(/^\d+\.\s*/, "").trim())
      .filter((item) => item.length > 0)
      .slice(0, 3);
    if (result.length > 0) {
      return result;
    }
  }

  // 格式2: 项目符号 (- xxx, * xxx, • xxx)
  const bulletMatch = cleanText.match(/^[*\-•]\s*([^\n]+)/gm);
  if (bulletMatch && bulletMatch.length > 0) {
    const result = bulletMatch
      .map((item) => item.replace(/^[*\-•]\s*/, "").trim())
      .filter((item) => item.length > 0)
      .slice(0, 3);
    if (result.length > 0) {
      return result;
    }
  }

  // 格式3: 分行列表
  const lines = cleanText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length > 0 && lines.length <= 5 && lines.every((line) => line.length <= 100)) {
    return lines.slice(0, 3);
  }

  const shortLines = lines.filter((line) => line.length <= 50 && line.length > 3);
  if (shortLines.length > 0) {
    return shortLines.slice(0, 3);
  }

  // 格式4: 包含关键词的句子
  const keywords = ["建议", "推荐", "可以", "试试", "了解", "查看", "如何", "为什么", "什么"];
  const sentences = cleanText
    .split(/[。！？]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && keywords.some((kw) => s.includes(kw)));

  if (sentences.length > 0) {
    return sentences.slice(0, 3);
  }

  // 最后尝试返回前几行
  if (lines.length > 0) {
    return lines.slice(0, 3);
  }

  return suggestions;
}

class AISuggestionsRoute extends BaseAPIRoute {
  protected async handle(request: NextRequest): Promise<NextResponse> {
    const { data: body, error } = await this.parseRequestBody<{
      model: string;
      messages: ModelScopeMessage[];
      apiKey: string;
      lastMessage: string;
    }>(request);

    if (error) {
      return this.validationErrorResponse(error);
    }

    const { model, messages, apiKey, lastMessage, apiBaseUrl } = body!;

    if (!apiKey) {
      return this.validationErrorResponse('API密钥未提供', 'apiKey');
    }

    // 根据apiBaseUrl确定API基础URL，如果没有提供则使用默认API
    const apiBase = apiBaseUrl || DEFAULT_API_BASE;

    if (!model || !messages || !lastMessage) {
      return this.validationErrorResponse('缺少必要参数');
    }

    // 验证消息格式
    if (!Array.isArray(messages) || messages.length === 0) {
      return this.validationErrorResponse('消息格式错误，messages必须是非空数组', 'messages');
    }

    logger.info('调用AI API获取建议:', {
      model,
      messagesCount: messages.length,
      lastMessage: lastMessage.substring(0, 50) + '...',
      apiKeyPrefix: apiKey.substring(0, 10) + '...'
    });

    // 构建专门用于获取建议的提示词
    const suggestionPrompt: ModelScopeMessage = {
      role: "user",
      content: `基于对话内容，预测用户接下来可能想问的3个问题或想了解的内容。

对话内容：
${lastMessage}

要求：
1. 站在用户角度思考，用户接下来会问什么
2. 生成用户可能想问的问题或想了解的内容
3. 每个短语应该是用户会说的内容
4. 直接输出，每行一个
5. 不要包含标点符号`
    };

    const requestBody: ModelScopeRequestBody = {
      model,
      messages: adaptMessagesForModel([...messages, suggestionPrompt], model),
      stream: false
    };

    logger.debug("发送建议请求体:", JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch(`${apiBase}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        const errorDetails = extractErrorDetails(errorData);

        logger.error("API调用失败:", {
          status: response.status,
          statusText: response.statusText,
          error: errorDetails
        });

        return this.errorResponse(
          `API调用失败: ${response.status} ${response.statusText}`,
          response.status,
          { details: errorDetails }
        );
      }

      const result: ModelScopeResponse = await response.json();
      const content = result.choices?.[0]?.message?.content || "";

      let suggestions = parseSuggestions(content);

      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        logger.warn("解析建议失败或结果为空，使用默认建议");
        suggestions = DEFAULT_SUGGESTIONS;
      } else {
        suggestions = suggestions
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0)
          .slice(0, 3);

        if (suggestions.length === 0) {
          suggestions = DEFAULT_SUGGESTIONS;
        }
      }

      return this.successResponse(
        { suggestions },
        { message: "获取建议成功" }
      );
    } catch (error) {
      return this.errorResponse(
        "API调用失败",
        500,
        { details: error instanceof Error ? error.message : "未知错误" }
      );
    }
  }
}

export const POST = (request: NextRequest) => {
  const route = new AISuggestionsRoute();
  return route.execute(request);
}