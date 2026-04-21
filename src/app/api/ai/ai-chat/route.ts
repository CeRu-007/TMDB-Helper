import { NextRequest, NextResponse } from 'next/server'
import { ChatHistory, Message } from '@/types/ai-chat'
import { ApiResponse } from '@/types/common'
import { logger } from '@/lib/utils/logger'
import { chatRepository } from '@/lib/database/repositories/chat.repository'

// 获取对话历史列表
export async function GET(_request: NextRequest) {
  try {
    const histories = chatRepository.findAllHistories()

    // 为每个历史加载消息
    const fullHistories = histories.map(h => {
      const full = chatRepository.findHistoryById(h.id)
      return full || h
    })

    return NextResponse.json<ApiResponse<ChatHistory[]>>({
      success: true,
      data: fullHistories,
      timestamp: Date.now()
    })
  } catch (error: unknown) {
    logger.error('获取对话历史失败:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: { message: '获取对话历史失败', code: 'INTERNAL_ERROR', timestamp: Date.now() },
        data: null,
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}

// 保存对话历史（批量同步）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { histories } = body

    if (!Array.isArray(histories)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: { message: '无效的对话历史数据格式', code: 'INVALID_DATA', timestamp: Date.now() },
          data: null,
          timestamp: Date.now()
        },
        { status: 400 }
      )
    }

    // 转换日期格式
    const parsedHistories: ChatHistory[] = histories.map((h: ChatHistory) => ({
      ...h,
      createdAt: new Date(h.createdAt),
      updatedAt: new Date(h.updatedAt),
      messages: h.messages?.map((m: Message) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      })) || []
    }))

    // 批量保存到数据库
    const result = chatRepository.saveHistories(parsedHistories)

    return NextResponse.json<ApiResponse<{ saved: number }>>({
      success: true,
      data: result.data ?? { saved: 0 },
      timestamp: Date.now()
    })
  } catch (error: unknown) {
    logger.error('保存对话历史失败:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: { message: '保存对话历史失败', code: 'INTERNAL_ERROR', timestamp: Date.now() },
        data: null,
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}