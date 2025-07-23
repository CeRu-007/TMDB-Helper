import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface TMDBConfig {
  encoding?: string
  logging_level?: string
  save_user_profile?: boolean
  tmdb_username?: string
  tmdb_password?: string
  backdrop_forced_upload?: boolean
  filter_words?: string
}

/**
 * GET /api/tmdb-config - 读取TMDB-Import配置文件
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tmdbImportPath = searchParams.get('path')
    
    if (!tmdbImportPath) {
      return NextResponse.json({
        success: false,
        error: '缺少TMDB-Import路径参数'
      }, { status: 400 })
    }

    const configPath = path.join(tmdbImportPath, 'config.ini')
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({
        success: false,
        error: '配置文件不存在'
      }, { status: 404 })
    }

    const configContent = fs.readFileSync(configPath, 'utf-8')
    const config = parseConfigFile(configContent)
    
    return NextResponse.json({
      success: true,
      config: config
    })
  } catch (error) {
    console.error('读取TMDB配置失败:', error)
    return NextResponse.json({
      success: false,
      error: '读取配置文件失败'
    }, { status: 500 })
  }
}

/**
 * POST /api/tmdb-config - 写入TMDB-Import配置文件
 */
export async function POST(request: NextRequest) {
  try {
    const { tmdbImportPath, config } = await request.json()
    
    if (!tmdbImportPath) {
      return NextResponse.json({
        success: false,
        error: '缺少TMDB-Import路径参数'
      }, { status: 400 })
    }

    if (!config) {
      return NextResponse.json({
        success: false,
        error: '缺少配置数据'
      }, { status: 400 })
    }

    const configPath = path.join(tmdbImportPath, 'config.ini')
    
    // 备份原配置文件
    if (fs.existsSync(configPath)) {
      const backupPath = `${configPath}.bak`
      fs.copyFileSync(configPath, backupPath)
    }

    const configContent = generateConfigFile(config)
    fs.writeFileSync(configPath, configContent, 'utf-8')
    
    return NextResponse.json({
      success: true,
      message: '配置保存成功'
    })
  } catch (error) {
    console.error('保存TMDB配置失败:', error)
    return NextResponse.json({
      success: false,
      error: '保存配置文件失败'
    }, { status: 500 })
  }
}

/**
 * 解析配置文件内容
 */
function parseConfigFile(content: string): TMDBConfig {
  const config: TMDBConfig = {}
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('#') || trimmedLine.startsWith('[') || !trimmedLine.includes('=')) {
      continue
    }
    
    const [key, ...valueParts] = trimmedLine.split('=')
    const value = valueParts.join('=').trim()
    
    switch (key.trim()) {
      case 'encoding':
        config.encoding = value
        break
      case 'logging_level':
        config.logging_level = value
        break

      case 'save_user_profile':
        config.save_user_profile = value.toLowerCase() === 'true'
        break
      case 'tmdb_username':
        config.tmdb_username = value
        break
      case 'tmdb_password':
        config.tmdb_password = value
        break
      case 'backdrop_forced_upload':
        config.backdrop_forced_upload = value.toLowerCase() === 'true'
        break
      case 'filter_words':
        config.filter_words = value
        break
    }
  }
  
  return config
}

/**
 * 生成配置文件内容
 */
function generateConfigFile(config: TMDBConfig): string {
  const lines = [
    '[DEFAULT]',
    '#ex: utf-8',
    `encoding = ${config.encoding || 'utf-8-sig'}`,
    '#ex: DEBUG',
    `logging_level = ${config.logging_level || 'INFO'}`,
    '',
    '# Playwright Browser Settings',
    '# Only Chrome/Chromium is supported',
    '# set to false may cause some errors',
    `save_user_profile = ${config.save_user_profile !== false ? 'true' : 'false'}`,
    '',
    '# TMDB',
    `tmdb_username = ${config.tmdb_username || ''}`,
    `tmdb_password = ${config.tmdb_password || ''}`,
    `backdrop_forced_upload = ${config.backdrop_forced_upload === true ? 'true' : 'false'}`,
    '',
    '# 设置过滤词，多个过滤词用逗号分隔',
    `filter_words = ${config.filter_words || ''}`,
    ''
  ]
  
  return lines.join('\n')
}
