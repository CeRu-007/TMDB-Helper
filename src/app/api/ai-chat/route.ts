import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

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
export async function GET(request: NextRequest) {
  try {
    await ensureDirectoryExists()
    
    try {
      const data = await fs.readFile(CHAT_HISTORY_FILE, 'utf-8')
      const histories = JSON.parse(data)
      
      return NextResponse.json({
        success: true,
        data: histories
      })
    } catch (error) {
      // 文件不存在或格式错误，返回空数组
      return NextResponse.json({
        success: true,
        data: []
      })
    }
  } catch (error: any) {
    console.error('获取对话历史失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取对话历史失败',
        details: error.message
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
      return NextResponse.json(
        {
          success: false,
          error: '无效的对话历史数据格式'
        },
        { status: 400 }
      )
    }

    await ensureDirectoryExists()
    
    // 保存到文件
    await fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(histories, null, 2), 'utf-8')
    
    return NextResponse.json({
      success: true,
      message: '对话历史保存成功'
    })
  } catch (error: any) {
    console.error('保存对话历史失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '保存对话历史失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// 删除特定对话
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const chatId = url.searchParams.get('chatId')

    if (!chatId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少对话ID参数'
        },
        { status: 400 }
      )
    }

    await ensureDirectoryExists()
    
    try {
      const data = await fs.readFile(CHAT_HISTORY_FILE, 'utf-8')
      const histories = JSON.parse(data)
      
      // 过滤掉指定的对话
      const updatedHistories = histories.filter((chat: any) => chat.id !== chatId)
      
      // 保存更新后的历史
      await fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(updatedHistories, null, 2), 'utf-8')
      
      return NextResponse.json({
        success: true,
        message: '对话删除成功'
      })
    } catch (error) {
      // 文件不存在，直接返回成功
      return NextResponse.json({
        success: true,
        message: '对话删除成功'
      })
    }
  } catch (error: any) {
    console.error('删除对话失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '删除对话失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}