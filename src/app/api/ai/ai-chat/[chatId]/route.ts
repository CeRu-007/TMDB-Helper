import { NextRequest, NextResponse } from 'next/server'
import { ChatHistory, Message } from '@/types/ai-chat'
import { ApiResponse } from '@/types/common'
import { logger } from '@/lib/utils/logger'
import { chatRepository } from '@/lib/database/repositories/chat.repository'

// 获取特定对话
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params

    const chat = chatRepository.findHistoryById(chatId)

    if (!chat) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: { message: '对话不存在', code: 'NOT_FOUND', timestamp: Date.now() },
          data: null,
          timestamp: Date.now()
        },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<ChatHistory>>({
      success: true,
      data: chat,
      timestamp: Date.now()
    })
  } catch (error: unknown) {
    logger.error('获取对话失败:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: { message: '获取对话失败', code: 'INTERNAL_ERROR', timestamp: Date.now() },
        data: null,
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}

// 删除特定对话
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params

    logger.info(`删除对话 - chatId: ${chatId}`)

    const result = chatRepository.deleteHistory(chatId)

    if (!result.success) {
      logger.error(`删除对话失败: ${chatId}`, result.error)
    } else {
      logger.info(`对话删除成功: ${chatId}`)
    }

    return NextResponse.json({
      success: true,
      message: '对话删除成功'
    })
  } catch (error: unknown) {
    logger.error('删除对话失败:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: { message: '删除对话失败', code: 'INTERNAL_ERROR', timestamp: Date.now() },
        data: null,
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}
