import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { ChatHistory } from '@/types/ai-chat'
import { ApiResponse } from '@/types/common'

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

// 获取特定对话
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = params

    await ensureDirectoryExists()
    
    try {
      const data = await fs.readFile(CHAT_HISTORY_FILE, 'utf-8')
      const histories = JSON.parse(data)
      
      const chat = histories.find((h: ChatHistory) => h.id === chatId)
      
      if (!chat) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: '对话不存在',
            data: null
          },
          { status: 404 }
        )
      }
      
      return NextResponse.json<ApiResponse<ChatHistory>>({
        success: true,
        data: chat
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: '对话不存在'
        },
        { status: 404 }
      )
    }
  } catch (error: unknown) {
    console.error('获取对话失败:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: '获取对话失败',
        data: null,
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

// 删除特定对话
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = params

    console.log(`[API] 删除对话 - chatId: ${chatId}`)
    
    await ensureDirectoryExists()
    
    try {
      const data = await fs.readFile(CHAT_HISTORY_FILE, 'utf-8')
      const histories = JSON.parse(data)
      
      // 检查对话是否存在
      const chatExists = histories.some((chat: ChatHistory) => chat.id === chatId)
      if (!chatExists) {
        console.log(`[API] 对话不存在: ${chatId}`)
        return NextResponse.json({
          success: true,
          message: '对话删除成功（对话已不存在）'
        })
      }
      
      // 过滤掉指定的对话
      const updatedHistories = histories.filter((chat: ChatHistory) => chat.id !== chatId)
      
      // 保存更新后的历史
      await fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(updatedHistories, null, 2), 'utf-8')
      
      console.log(`[API] 对话删除成功: ${chatId}`)
      
      return NextResponse.json({
        success: true,
        message: '对话删除成功'
      })
    } catch (error: unknown) {
      // 如果文件不存在或读取失败，视为删除成功
      if (error instanceof Error && (error as any).code === 'ENOENT') {
        console.log(`[API] 对话文件不存在，视为删除成功: ${chatId}`)
        return NextResponse.json({
          success: true,
          message: '对话删除成功'
        })
      }
      
      throw error
    }
  } catch (error: unknown) {
    console.error('删除对话失败:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: '删除对话失败',
        data: null,
        details: errorMessage
      },
      { status: 500 }
    )
  }
}