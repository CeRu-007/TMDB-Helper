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

    // 尝试多种下载方式
    const tempZipPath = path.join(TOOLS_DIR, 'tmdb-import-master.zip')
    
    // 方式1: 直接下载ZIP文件
    const downloadUrl = `${DOWNLOAD_BASE}/${GITHUB_REPO}/archive/refs/heads/master.zip`
    console.log(`[TMDB-Import Updater] 尝试直接下载: ${downloadUrl}`)
    
    let downloadSuccess = false
    
    try {
      const response = await fetch(downloadUrl)
      if (response.ok) {
        const buffer = await response.arrayBuffer()
        fs.writeFileSync(tempZipPath, Buffer.from(buffer))
        console.log(`[TMDB-Import Updater] 直接下载完成: ${tempZipPath}`)
        downloadSuccess = true
      } else {
        console.log(`[TMDB-Import Updater] 直接下载失败: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.log(`[TMDB-Import Updater] 直接下载异常: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    // 方式2: 如果直接下载失败，使用GitHub API下载
    if (!downloadSuccess) {
      console.log(`[TMDB-Import Updater] 尝试使用GitHub API下载...`)
      
      const apiDownloadUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/zipball/master`
      const apiResponse = await fetch(apiDownloadUrl, {
        headers: {
          'User-Agent': 'TMDB-Helper/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      
      if (!apiResponse.ok) {
        throw new Error(`GitHub API下载失败: ${apiResponse.status} ${apiResponse.statusText}`)
      }
      
      const buffer = await apiResponse.arrayBuffer()
      fs.writeFileSync(tempZipPath, Buffer.from(buffer))
      console.log(`[TMDB-Import Updater] GitHub API下载完成: ${tempZipPath}`)
    }

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

    // 保存现有 TMDB 用户凭据（如果存在）
    let existingCredentials: { tmdb_username?: string; tmdb_password?: string } = {}
    const configPath = path.join(TMDB_IMPORT_DIR, 'config.ini')

    if (fs.existsSync(TMDB_IMPORT_DIR)) {
      console.log(`[TMDB-Import Updater] 准备覆盖安装现有目录: ${TMDB_IMPORT_DIR}`)

      // 提取 TMDB 用户凭据
      if (fs.existsSync(configPath)) {
        try {
          const configContent = fs.readFileSync(configPath, 'utf-8')
          existingCredentials = extractTMDBCredentials(configContent)
          console.log(`[TMDB-Import Updater] 已提取 TMDB 用户凭据`)
        } catch (error) {
          console.warn('[TMDB-Import Updater] 读取配置文件失败:', error)
        }
      }

      // 直接删除现有安装目录
      fs.rmSync(TMDB_IMPORT_DIR, { recursive: true, force: true })
      console.log(`[TMDB-Import Updater] 已删除现有安装目录`)
    }

    // 解压缩到项目根目录
    console.log(`[TMDB-Import Updater] 开始解压: ${tempZipPath}`)

    // 先确保目标目录不存在
    if (fs.existsSync(TMDB_IMPORT_DIR)) {
      fs.rmSync(TMDB_IMPORT_DIR, { recursive: true, force: true })
    }

    const isWindows = process.platform === 'win32'
    
    // 创建临时解压目录
    const tempExtractDir = path.join(TOOLS_DIR, 'temp_tmdb_extract')
    if (fs.existsSync(tempExtractDir)) {
      fs.rmSync(tempExtractDir, { recursive: true, force: true })
    }
    fs.mkdirSync(tempExtractDir, { recursive: true })

    try {
      // 解压到临时目录
      const extractCmd = isWindows
        ? `powershell -Command "Expand-Archive -Path '${tempZipPath}' -DestinationPath '${tempExtractDir}' -Force"`
        : `unzip -o "${tempZipPath}" -d "${tempExtractDir}"`

      await execAsync(extractCmd)

      // 查找解压后的目录
      const files = fs.readdirSync(tempExtractDir)
      if (files.length === 0) {
        throw new Error('解压失败，未找到任何文件')
      }

      // 获取解压后的实际目录名
      const extractedDirName = files[0]
      if (!extractedDirName) {
        throw new Error('无法确定解压后的目录名')
      }
      
      const extractedDirPath = path.join(tempExtractDir, extractedDirName)
      
      // 检查目录是否存在
      if (!fs.existsSync(extractedDirPath)) {
        throw new Error(`解压后的目录不存在: ${extractedDirPath}`)
      }
      
      // 移动到最终目标目录
      console.log(`[TMDB-Import Updater] 移动目录: ${extractedDirPath} -> ${TMDB_IMPORT_DIR}`)
      // 先尝试直接移动
      try {
        fs.renameSync(extractedDirPath, TMDB_IMPORT_DIR)
      } catch (moveError: any) {
        // 如果移动失败，尝试复制后删除
        console.log(`[TMDB-Import Updater] 直接移动失败，尝试复制后删除: ${moveError.message}`)
        const copyCmd = isWindows
          ? `powershell -Command "Copy-Item -Path '${extractedDirPath}' -Destination '${TMDB_IMPORT_DIR}' -Recurse -Force"`
          : `cp -r "${extractedDirPath}" "${TMDB_IMPORT_DIR}"`
        await execAsync(copyCmd)
        // 删除源目录
        fs.rmSync(extractedDirPath, { recursive: true, force: true })
      }
      
      // 清理临时目录
      fs.rmSync(tempExtractDir, { recursive: true, force: true })
      
      // 验证最终目录是否存在
      if (!fs.existsSync(TMDB_IMPORT_DIR)) {
        throw new Error(`移动失败，目标目录不存在: ${TMDB_IMPORT_DIR}`)
      }
      
      console.log(`[TMDB-Import Updater] 解压完成，最终目录: TMDB-Import-master`)
    } catch (extractError) {
      // 清理临时目录
      if (fs.existsSync(tempExtractDir)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true })
      }
      throw extractError
    }

    // 恢复 TMDB 用户凭据到新配置文件（如果之前存在）
    if (existingCredentials.tmdb_username || existingCredentials.tmdb_password) {
      try {
        const newConfigPath = path.join(TMDB_IMPORT_DIR, 'config.ini')
        updateConfigWithCredentials(newConfigPath, existingCredentials)
        console.log(`[TMDB-Import Updater] 已恢复 TMDB 用户凭据`)
      } catch (error) {
        console.warn('[TMDB-Import Updater] 恢复 TMDB 凭据失败:', error)
      }
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

    // 构建完成消息
    let message = '安装完成'
    const hasCredentials = existingCredentials.tmdb_username || existingCredentials.tmdb_password
    if (hasCredentials) {
      message += '，TMDB 用户凭据已保留'
    }

    return NextResponse.json({
      success: true,
      data: {
        installPath: TMDB_IMPORT_DIR,
        commitInfo: latestCommit,
        message: message,
        credentialsPreserved: hasCredentials
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

/**
 * 从配置文件内容中提取 TMDB 用户凭据
 */
function extractTMDBCredentials(configContent: string): { tmdb_username?: string; tmdb_password?: string } {
  const credentials: { tmdb_username?: string; tmdb_password?: string } = {}
  const lines = configContent.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('#') || !trimmedLine.includes('=')) {
      continue
    }

    const [key, ...valueParts] = trimmedLine.split('=')
    const value = valueParts.join('=').trim()

    switch (key.trim()) {
      case 'tmdb_username':
        if (value) {
          credentials.tmdb_username = value
        }
        break
      case 'tmdb_password':
        if (value) {
          credentials.tmdb_password = value
        }
        break
    }
  }

  return credentials
}

/**
 * 将 TMDB 用户凭据写入新的配置文件
 */
function updateConfigWithCredentials(configPath: string, credentials: { tmdb_username?: string; tmdb_password?: string }): void {
  if (!fs.existsSync(configPath)) {
    console.warn('[TMDB-Import Updater] 配置文件不存在，无法更新凭据')
    return
  }

  try {
    let configContent = fs.readFileSync(configPath, 'utf-8')
    const lines = configContent.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('#') || !line.includes('=')) {
        continue
      }

      const [key] = line.split('=')
      const trimmedKey = key.trim()

      if (trimmedKey === 'tmdb_username' && credentials.tmdb_username) {
        lines[i] = `tmdb_username = ${credentials.tmdb_username}`
      } else if (trimmedKey === 'tmdb_password' && credentials.tmdb_password) {
        lines[i] = `tmdb_password = ${credentials.tmdb_password}`
      }
    }

    const updatedContent = lines.join('\n')
    fs.writeFileSync(configPath, updatedContent, 'utf-8')
    console.log('[TMDB-Import Updater] 已更新配置文件中的 TMDB 凭据')
  } catch (error) {
    console.warn('[TMDB-Import Updater] 更新配置文件凭据失败:', error)
  }
}




