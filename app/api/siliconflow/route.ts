import { NextRequest, NextResponse } from 'next/server';

// 硅基流动API配置
const SILICONFLOW_API_BASE = 'https://api.siliconflow.cn/v1';

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

    if (!model || !messages) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 调用硅基流动API
    const response = await fetch(`${SILICONFLOW_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      
      // 尝试解析错误详情
      let parsedError = null;
      try {
        parsedError = JSON.parse(errorData);
      } catch (e) {
        // 如果不是JSON格式，保持原始错误信息
      }

      // 检查是否是余额不足错误
      if (response.status === 403 && parsedError) {
        const errorCode = parsedError.code;
        const errorMessage = parsedError.message;

        if (errorCode === 30001 || (errorMessage && errorMessage.includes('account balance is insufficient'))) {
          return NextResponse.json(
            {
              error: `API调用失败: ${response.status}`,
              details: errorData,
              errorType: 'INSUFFICIENT_BALANCE',
              userMessage: '您的硅基流动余额已用完'
            },
            { status: response.status }
          );
        }
      }

      return NextResponse.json(
        {
          error: `API调用失败: ${response.status}`,
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 验证响应格式
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'API返回格式异常' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        content: data.choices[0].message.content,
        usage: data.usage,
        model: data.model
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

    // 调用硅基流动模型列表API
    const response = await fetch(`${SILICONFLOW_API_BASE}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `获取模型列表失败: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data: data.data || []
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