import { NextRequest } from "next/server";

// 类型定义
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StreamRequestBody {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
}

const MODELSCOPE_API_BASE = "https://api-inference.modelscope.cn/v1";
const SILICONFLOW_API_BASE = "https://api.siliconflow.cn/v1";
const ZHIPU_API_BASE = "https://open.bigmodel.cn/api/paas/v4";

const MODEL_DEEPSEEK_V3 = "deepseek-ai/DeepSeek-V3.1";
const MODEL_QWEN3_NEXT = "Qwen/Qwen3-Next-80B-A3B-Instruct";

function determineApiBase(apiKey: string, customApiBaseUrl?: string): string {
  if (customApiBaseUrl) {
    return customApiBaseUrl.replace(/\/$/, "");
  }

  if (apiKey.startsWith("sk-")) {
    return SILICONFLOW_API_BASE;
  }

  if (apiKey.startsWith("ms-")) {
    return MODELSCOPE_API_BASE;
  }

  const parts = apiKey.split(".");
  if (parts.length === 2) {
    return ZHIPU_API_BASE;
  }

  return MODELSCOPE_API_BASE;
}

function adaptMessagesForModel(messages: ChatMessage[], model: string): ChatMessage[] {
  if (model === MODEL_DEEPSEEK_V3) {
    return messages.filter((m) => m.role !== "system");
  }

  if (model === MODEL_QWEN3_NEXT && !messages.some((m) => m.role === "system")) {
    return [{ role: "system", content: "You are a helpful assistant." }, ...messages];
  }

  return messages;
}

// 将上游 SSE 原样透传给客户端，客户端解析 data: 行提取 delta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, messages, apiKey, apiBaseUrl } = body || {};

    if (!apiKey || typeof apiKey !== "string") {
      return new Response(JSON.stringify({ error: "API密钥未提供" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiBase = determineApiBase(apiKey, apiBaseUrl);

    if (!model || !messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "缺少必要参数或消息格式错误" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const requestBody: StreamRequestBody = {
      model,
      messages: adaptMessagesForModel(messages, model),
      stream: true,
    };

    const upstream = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(
        JSON.stringify({
          error: `API调用失败: ${upstream.status} ${upstream.statusText}`,
          details: text,
        }),
        { status: upstream.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const encoder = new TextEncoder();

        try {
          controller.enqueue(encoder.encode(": ping\n\n"));

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            controller.enqueue(value);
          }

          controller.enqueue(encoder.encode("\ndata: [DONE]\n\n"));
        } catch (e: unknown) {
          const err = e instanceof Error && typeof e.message === "string" ? e.message : "stream error";
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: err })}\n\n`));
        } finally {
          controller.close();
          try {
            reader.releaseLock();
          } catch {}
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Content-Encoding": "none",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: "服务器内部错误", details: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}