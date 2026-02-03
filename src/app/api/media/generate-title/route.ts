import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/types/common";
import { logger } from "@/lib/utils/logger";

// 默认API配置
const DEFAULT_API_BASE = "https://api-inference.modelscope.cn/v1";

// API 类型定义
interface ModelMessage {
  role: "system" | "user" | "assistant";
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
  messages: Array<{ role: string; content: string }>;
  apiKey: string;
  apiBaseUrl?: string;
}

const MODEL_DEEPSEEK_V3 = "deepseek-ai/DeepSeek-V3.1";
const MODEL_QWEN3_NEXT = "Qwen/Qwen3-Next-80B-A3B-Instruct";
const DEFAULT_TITLE = "新对话";
const MAX_TITLE_LENGTH = 20;

function adaptMessagesForModel(messages: ModelMessage[], model: string): ModelMessage[] {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateTitleRequest;
    const { model, messages, apiKey, apiBaseUrl } = body;

    if (!apiKey) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "API密钥未提供",
          data: null
        },
        { status: 400 }
      );
    }

    const apiBase = apiBaseUrl || DEFAULT_API_BASE;

    if (!model || !messages || messages.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "缺少必要参数",
          data: null
        },
        { status: 400 }
      );
    }

    const firstMessage = messages[0]?.content || "";
    if (!firstMessage) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "消息内容为空",
          data: null
        },
        { status: 400 }
      );
    }

    logger.info("调用API生成标题:", {
      model,
      firstMessage: firstMessage.substring(0, 50) + "...",
      apiKeyPrefix: apiKey.substring(0, 10) + "..."
    });

    const titlePrompt: ModelMessage = {
      role: "user",
      content: `请基于以下对话内容生成一个简洁明了的对话标题（不超过20个字符）：

对话内容：
${firstMessage}

要求：
1. 标题应简洁明了，不超过20个字符
2. 准确反映对话的核心主题
3. 使用中文
4. 直接输出标题，不要包含其他说明文字

请提供你的建议：`
    };

    const requestBody: ModelRequestBody = {
      model,
      messages: adaptMessagesForModel([titlePrompt], model),
      stream: false
    };

    logger.debug("发送标题生成请求体:", JSON.stringify(requestBody, null, 2));

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

      return NextResponse.json(
        {
          error: `API调用失败: ${response.status} ${response.statusText}`,
          details: errorDetails
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    let title = content.trim();
    if (title.length > MAX_TITLE_LENGTH) {
      title = title.substring(0, MAX_TITLE_LENGTH) + "...";
    }

    if (!title) {
      title = DEFAULT_TITLE;
    }

    return NextResponse.json<ApiResponse<{ title: string }>>({
      success: true,
      data: { title }
    });

  } catch (error: unknown) {
    logger.error("服务器内部错误:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "服务器内部错误",
        data: null,
        details: errorMessage
      },
      { status: 500 }
    );
  }
}