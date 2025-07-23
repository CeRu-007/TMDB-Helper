import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync } from 'fs'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()
    
    if (!content) {
      return NextResponse.json(
        { error: '缺少CSV内容' },
        { status: 400 }
      )
    }

    // TMDB-Import工具的路径
    const tmdbImportPath = 'D:\\.background\\tmdb-helper\\TMDB-Import-master\\import.csv'
    
    // 写入文件
    writeFileSync(tmdbImportPath, content, 'utf-8')
    
    return NextResponse.json({ 
      success: true,
      message: 'import.csv文件已成功覆盖'
    })
    
  } catch (error) {
    console.error('写入TMDB import.csv失败:', error)
    return NextResponse.json(
      { 
        error: '写入文件失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
