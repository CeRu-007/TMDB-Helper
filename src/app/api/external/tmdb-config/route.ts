import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { ServerConfigManager } from '@/lib/data/server-config-manager'

interface TMDBConfig {
  encoding?: string
  save_user_profile?: boolean
  tmdb_username?: string
  tmdb_password?: string
  backdrop_forced_upload?: boolean
  backdrop_vote_after_upload?: boolean
  filter_words?: string
  rename_csv_on_import?: boolean
  delete_csv_after_import?: boolean
}

/**
 * 解析TMDB配置路径
 */
function resolveTmdbPath(pathParam: string | null): string {
  const tmdbDir = pathParam
    ?? ServerConfigManager.getConfigItem('tmdbImportPath') as string | undefined
    ?? path.join(process.cwd(), 'TMDB-Import-master')
  return path.resolve(tmdbDir)
}

/**
 * GET /api/external/tmdb-config - 读取TMDB-Import配置文件
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const absolutePath = resolveTmdbPath(searchParams.get('path'))
    const configPath = path.join(absolutePath, 'config.ini')

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({
        success: false,
        error: `TMDB-Import 目录不存在: ${absolutePath}`
      }, { status: 404 })
    }

    if (!fs.existsSync(configPath)) {
      return NextResponse.json({
        success: false,
        error: `配置文件不存在: ${configPath}`
      }, { status: 404 })
    }

    try {
      fs.accessSync(configPath, fs.constants.R_OK)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: `无权限读取配置文件: ${configPath}`
      }, { status: 403 })
    }

    const configContent = fs.readFileSync(configPath, 'utf-8')
    const config = parseConfigFile(configContent)

    return NextResponse.json({
      success: true,
      config,
      path: absolutePath
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `读取配置文件失败: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 })
  }
}

/**
 * POST /api/external/tmdb-config - 写入TMDB-Import配置文件
 */
export async function POST(request: NextRequest) {
  try {
    const { config, tmdbImportPath: requestPath } = await request.json()

    if (!config) {
      return NextResponse.json({
        success: false,
        error: '缺少配置数据'
      }, { status: 400 })
    }

    const absolutePath = resolveTmdbPath(requestPath)
    const configPath = path.join(absolutePath, 'config.ini')

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({
        success: false,
        error: `TMDB-Import 目录不存在: ${absolutePath}`
      }, { status: 404 })
    }

    try {
      fs.accessSync(absolutePath, fs.constants.W_OK)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: `无权限写入配置文件: ${absolutePath}`
      }, { status: 403 })
    }

    const configContent = generateConfigFile(config)
    fs.writeFileSync(configPath, configContent, 'utf-8')

    return NextResponse.json({
      success: true,
      message: '配置保存成功',
      path: absolutePath
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `保存配置文件失败: ${error instanceof Error ? error.message : String(error)}`
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
    const trimmedKey = key.trim()

    switch (trimmedKey) {
      case 'encoding':
        config.encoding = value
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
      case 'backdrop_vote_after_upload':
        config.backdrop_vote_after_upload = value.toLowerCase() === 'true'
        break
      case 'filter_words':
        config.filter_words = value
        break
      case 'rename_csv_on_import':
        config.rename_csv_on_import = value.toLowerCase() === 'true'
        break
      case 'delete_csv_after_import':
        config.delete_csv_after_import = value.toLowerCase() === 'true'
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
    `backdrop_vote_after_upload = ${config.backdrop_vote_after_upload === true ? 'true' : 'false'}`,
    '',
    '# 设置过滤词，多个过滤词用逗号分隔',
    `filter_words = ${config.filter_words || ''}`,
    '',
    '# 重命名 CSV 文件以支持多任务',
    `rename_csv_on_import = ${config.rename_csv_on_import === true ? 'true' : 'false'}`,
    '',
    '# 导入完成后删除 CSV 文件',
    `delete_csv_after_import = ${config.delete_csv_after_import === true ? 'true' : 'false'}`,
    ''
  ]

  return lines.join('\n')
}