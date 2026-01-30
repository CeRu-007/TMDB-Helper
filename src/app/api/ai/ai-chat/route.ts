import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { ChatHistory } from '@/types/ai-chat'
import { ApiResponse } from '@/types/common'
import { logger } from '@/lib/utils/logger'

// 对话历史存储路径
const CHAT_HISTORY_DIR = path.join(process.cwd(), 'data', 'ai-chat')
const CHAT_HISTORY_FILE = path.join(CHAT_HISTORY_DIR, 'chat-histories.json')

// 确保目录存在
async function ensureDirectoryExists() {
  try {
    await fs.access(CHAT_HISTORY_DIR)
  } catch {
    await fs.mkdir(CHAT_HISTORY_DIR, { recursive: true })
  }
}

// 获取对话历史
export async function GET(_request: NextRequest) {
  try {
    await ensureDirectoryExists()

    try {
      const data = await fs.readFile(CHAT_HISTORY_FILE, 'utf-8')
      const histories = JSON.parse(data)

      // 按更新时间倒序排序
      histories.sort((a: ChatHistory, b: ChatHistory) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )

      return NextResponse.json<ApiResponse<ChatHistory[]>>({
        success: true,
        data: histories,
        timestamp: Date.now()
      })
    } catch {
      // 文件不存在或格式错误，返回空数组
      return NextResponse.json<ApiResponse<ChatHistory[]>>({
        success: true,
        data: [],
        timestamp: Date.now()
      })
    }
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

// 保存对话历史
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

    await ensureDirectoryExists()

    // 保存到文件
    await fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(histories, null, 2), 'utf-8')

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
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
