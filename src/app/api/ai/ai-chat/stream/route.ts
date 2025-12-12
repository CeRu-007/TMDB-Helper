import { NextRequest } from "next/server";

const MODELSCOPE_API_BASE = "https://api-inference.modelscope.cn/v1";
const SILICONFLOW_API_BASE = "https://api.siliconflow.cn/v1";

// 将上游 SSE 原样透传给客户端，客户端解析 data: 行提取 delta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, messages, apiKey } = body || {};

    if (!apiKey || typeof apiKey !== "string") {
      return new Response(JSON.stringify({ error: "API密钥未提供" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 根据API密钥格式确定提供商
    let apiBase: string;

    if (apiKey.startsWith("sk-")) {
      // SiliconFlow API密钥
      apiBase = SILICONFLOW_API_BASE;
    } else if (apiKey.startsWith("ms-")) {
      // ModelScope API密钥
      apiBase = MODELSCOPE_API_BASE;
    } else {
      // 兼容旧版本，如果密钥格式不明确，尝试ModelScope
      apiBase = MODELSCOPE_API_BASE;
    }
    if (!model || !messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "缺少必要参数或消息格式错误" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isDeepSeekV3 = model === "deepseek-ai/DeepSeek-V3.1";
    const isQwen3Next = model === "Qwen/Qwen3-Next-80B-A3B-Instruct";

    let requestBody: any = {
      model,
      messages,
      stream: true,
    };

    if (isDeepSeekV3) {
      requestBody.messages = messages.filter((m: any) => m.role !== "system");
    }
    if (isQwen3Next) {
      if (!messages.some((m: any) => m.role === "system")) {
        requestBody.messages = [{ role: "system", content: "You are a helpful assistant." }, ...messages];
      }
    }

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
          error: `魔搭社区API调用失败: ${upstream.status} ${upstream.statusText}`,
          details: text,
        }),
        { status: upstream.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Cherry Studio风格的优化流式处理
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const encoder = new TextEncoder();

        try {
          // 立即发送握手信号，减少延迟
          controller.enqueue(encoder.encode(": ping\n\n"));
          
          let chunkBuffer = new Uint8Array(0);
          const processChunk = (chunk: Uint8Array) => {
            // 优化：直接透传，避免不必要的处理
            controller.enqueue(chunk);
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            processChunk(value);
          }

          // 发送完成信号
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e: any) {
          // 优化错误处理
          const err = typeof e?.message === "string" ? e.message : "stream error";
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(err)}\n\n`));
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // for nginx
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: "服务器内部错误", details: error?.message || String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}