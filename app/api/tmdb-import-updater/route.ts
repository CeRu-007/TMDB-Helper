import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// GitHub API配置
const GITHUB_REPO = 'fzlins/TMDB-Import'
const GITHUB_API_BASE = 'https://api.github.com'
const DOWNLOAD_BASE = 'https://github.com'

// 工具安装目录 - 保持解压后的原始目录名
const TOOLS_DIR = process.cwd()
const TMDB_IMPORT_DIR = path.join(TOOLS_DIR, 'TMDB-Import-master')

interface GitHubCommit {
  sha: string
  commit: {
    author: {
      name: string
      email: string
      date: string
    }
    message: string
  }
  html_url: string
}

interface VersionInfo {
  local?: {
    commitSha?: string
    commitDate?: string
    commitMessage?: string
    exists: boolean
  }
  remote: {
    commitSha: string
    commitDate: string
    commitMessage: string
  }
  needsUpdate: boolean
}

/**
 * GET /api/tmdb-import-updater - 检查版本信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'check'

    switch (action) {
      case 'check':
        return await checkVersion()
      case 'status':
        return await getStatus()
      default:
        return NextResponse.json({
          success: false,
          error: '无效的操作类型'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('[TMDB-Import Updater] GET请求失败:', error)
    return NextResponse.json({
      success: false,
      error: '检查版本信息失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * POST /api/tmdb-import-updater - 执行更新操作
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'download':
        return await downloadLatest()
      case 'install':
        return await installUpdate()
      default:
        return NextResponse.json({
          success: false,
          error: '无效的操作类型'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('[TMDB-Import Updater] POST请求失败:', error)
    return NextResponse.json({
      success: false,
      error: '更新操作失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * 检查版本信息
 */
async function checkVersion(): Promise<NextResponse> {
  try {
    // 获取远程最新提交信息
    const remoteInfo = await getLatestCommit()
    
    // 获取本地版本信息
    const localInfo = await getLocalVersion()
    
    // 判断是否需要更新
    const needsUpdate = !localInfo.exists || 
                       localInfo.commitSha !== remoteInfo.commitSha

    const versionInfo: VersionInfo = {
      local: localInfo,
      remote: remoteInfo,
      needsUpdate
    }

    return NextResponse.json({
      success: true,
      data: versionInfo
    })
  } catch (error) {
    console.error('[TMDB-Import Updater] 检查版本失败:', error)
    return NextResponse.json({
      success: false,
      error: '检查版本信息失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * 获取安装状态
 */
async function getStatus(): Promise<NextResponse> {
  try {
    const exists = fs.existsSync(TMDB_IMPORT_DIR)
    const hasMainModule = exists && fs.existsSync(path.join(TMDB_IMPORT_DIR, 'tmdb-import'))
    const hasConfigFile = exists && fs.existsSync(path.join(TMDB_IMPORT_DIR, 'config.ini'))
    
    let fileCount = 0
    if (exists) {
      try {
        const files = fs.readdirSync(TMDB_IMPORT_DIR, { recursive: true })
        fileCount = files.length
      } catch (error) {
        console.warn('[TMDB-Import Updater] 统计文件数量失败:', error)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        installed: exists,
        hasMainModule,
        hasConfigFile,
        installPath: TMDB_IMPORT_DIR,
        fileCount
      }
    })
  } catch (error) {
    console.error('[TMDB-Import Updater] 获取状态失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取安装状态失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * 获取GitHub最新提交信息
 */
async function getLatestCommit() {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/commits/master`
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'TMDB-Helper/1.0',
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  if (!response.ok) {
    throw new Error(`GitHub API请求失败: ${response.status} ${response.statusText}`)
  }

  const commit: GitHubCommit = await response.json()
  
  return {
    commitSha: commit.sha,
    commitDate: commit.commit.author.date,
    commitMessage: commit.commit.message.split('\n')[0], // 只取第一行
    htmlUrl: commit.html_url
  }
}

/**
 * 获取本地版本信息
 */
async function getLocalVersion() {
  const versionFile = path.join(TMDB_IMPORT_DIR, '.version')
  
  if (!fs.existsSync(TMDB_IMPORT_DIR) || !fs.existsSync(versionFile)) {
    return {
      exists: false
    }
  }

  try {
    const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf-8'))
    return {
      exists: true,
      commitSha: versionData.commitSha,
      commitDate: versionData.commitDate,
      commitMessage: versionData.commitMessage
    }
  } catch (error) {
    console.warn('[TMDB-Import Updater] 读取本地版本信息失败:', error)
    return {
      exists: true // 目录存在但版本文件损坏
    }
  }
}

/**
 * 下载最新版本
 */
async function downloadLatest(): Promise<NextResponse> {
  try {
    // 获取最新提交信息
    const latestCommit = await getLatestCommit()
    
    // 创建工具目录
    if (!fs.existsSync(TOOLS_DIR)) {
      fs.mkdirSync(TOOLS_DIR, { recursive: true })
    }

    // 下载源码压缩包
    const downloadUrl = `${DOWNLOAD_BASE}/${GITHUB_REPO}/archive/refs/heads/master.zip`
    const tempZipPath = path.join(TOOLS_DIR, 'tmdb-import-master.zip')
    
    console.log(`[TMDB-Import Updater] 开始下载: ${downloadUrl}`)
    
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`)
    }

    // 保存压缩包
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(tempZipPath, Buffer.from(buffer))
    
    console.log(`[TMDB-Import Updater] 下载完成: ${tempZipPath}`)

    return NextResponse.json({
      success: true,
      data: {
        downloadPath: tempZipPath,
        commitInfo: latestCommit,
        message: '下载完成，准备安装'
      }
    })
  } catch (error) {
    console.error('[TMDB-Import Updater] 下载失败:', error)
    return NextResponse.json({
      success: false,
      error: '下载最新版本失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * 安装更新
 */
async function installUpdate(): Promise<NextResponse> {
  try {
    const tempZipPath = path.join(TOOLS_DIR, 'tmdb-import-master.zip')
    
    if (!fs.existsSync(tempZipPath)) {
      throw new Error('未找到下载的压缩包，请先下载')
    }

    // 备份现有安装（如果存在）
    if (fs.existsSync(TMDB_IMPORT_DIR)) {
      const backupDir = path.join(TOOLS_DIR, `tmdb-import-backup-${Date.now()}`)
      console.log(`[TMDB-Import Updater] 备份现有安装到: ${backupDir}`)
      
      // 使用系统命令进行备份
      const isWindows = process.platform === 'win32'
      const backupCmd = isWindows 
        ? `xcopy "${TMDB_IMPORT_DIR}" "${backupDir}" /E /I /H /Y`
        : `cp -r "${TMDB_IMPORT_DIR}" "${backupDir}"`
      
      try {
        await execAsync(backupCmd)
      } catch (backupError) {
        console.warn('[TMDB-Import Updater] 备份失败，继续安装:', backupError)
      }
      
      // 删除现有安装
      fs.rmSync(TMDB_IMPORT_DIR, { recursive: true, force: true })
    }

    // 解压缩到项目根目录
    console.log(`[TMDB-Import Updater] 开始解压: ${tempZipPath}`)

    const isWindows = process.platform === 'win32'
    const extractCmd = isWindows
      ? `powershell -Command "Expand-Archive -Path '${tempZipPath}' -DestinationPath '${TOOLS_DIR}' -Force"`
      : `unzip -o "${tempZipPath}" -d "${TOOLS_DIR}"`

    await execAsync(extractCmd)

    // 验证解压后的目录是否存在
    if (!fs.existsSync(TMDB_IMPORT_DIR)) {
      throw new Error('解压失败，未找到 TMDB-Import-master 目录')
    }

    // 获取并保存版本信息
    const latestCommit = await getLatestCommit()
    const versionFile = path.join(TMDB_IMPORT_DIR, '.version')
    fs.writeFileSync(versionFile, JSON.stringify({
      commitSha: latestCommit.commitSha,
      commitDate: latestCommit.commitDate,
      commitMessage: latestCommit.commitMessage,
      installDate: new Date().toISOString()
    }, null, 2))

    // 清理临时文件
    fs.unlinkSync(tempZipPath)
    
    console.log(`[TMDB-Import Updater] 安装完成: ${TMDB_IMPORT_DIR}`)

    return NextResponse.json({
      success: true,
      data: {
        installPath: TMDB_IMPORT_DIR,
        commitInfo: latestCommit,
        message: '安装完成'
      }
    })
  } catch (error) {
    console.error('[TMDB-Import Updater] 安装失败:', error)
    return NextResponse.json({
      success: false,
      error: '安装更新失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
