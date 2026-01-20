import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { ServerConfigManager } from '@/lib/data/server-config-manager'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()
    
    if (!content) {
      return NextResponse.json(
        { error: '缺少CSV内容' },
        { status: 400 }
      )
    }

    // TMDB-Import 工具的 import.csv 路径（从服务端配置读取）
    const configuredPath = ServerConfigManager.getConfigItem('tmdbImportPath') as string | undefined
    const tmdbDir = configuredPath ?? join(process.cwd(), 'TMDB-Import-master')
    const tmdbImportPath = join(tmdbDir, 'import.csv')

    // 写入文件
    writeFileSync(tmdbImportPath, content, 'utf-8')
    
    return NextResponse.json({ 
      success: true,
      message: 'import.csv文件已成功覆盖'
    })
    
  } catch (error) {
    
    return NextResponse.json(
      { 
        error: '写入文件失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
