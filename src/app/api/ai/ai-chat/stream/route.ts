import { NextRequest } from "next/server";

const MODELSCOPE_API_BASE = "https://api-inference.modelscope.cn/v1";

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
    if (!apiKey.startsWith("ms-")) {
      return new Response(
        JSON.stringify({
          error: "API密钥格式不正确",
          details: "请使用魔搭社区(ModelScope)的API密钥，格式应为ms-开头",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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

    const upstream = await fetch(`${MODELSCOPE_API_BASE}/chat/completions`, {
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

    // 直接将上游 SSE 文本透传为 text/event-stream，便于前端逐行解析
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const encoder = new TextEncoder();

        try {
          // 发送握手注释，确保浏览器尽快进入流模式
          controller.enqueue(encoder.encode(": stream start\n\n"));

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // 直接透传
            controller.enqueue(value);
          }

          // 结束标记
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e: any) {
          // 以 SSE 事件形式传递错误
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