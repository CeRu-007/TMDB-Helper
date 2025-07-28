import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Docker Hub API配置
const DOCKER_HUB_REPO = 'ceru007/tmdb-helper'
const DOCKER_HUB_API_BASE = 'https://hub.docker.com/v2/repositories'

interface DockerHubTag {
  name: string
  full_size: number
  last_updated: string
  digest: string
}

interface DockerHubResponse {
  count: number
  next?: string
  previous?: string
  results: DockerHubTag[]
}

interface VersionInfo {
  local?: {
    version?: string
    lastUpdated?: string
    exists: boolean
  }
  remote: {
    version: string
    lastUpdated: string
  }
  needsUpdate: boolean
}

interface InstallStatus {
  installed: boolean
  isDockerEnvironment: boolean
  containerId?: string
  containerName?: string
}

/**
 * GET /api/docker-version-manager - 检查版本信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'check'

    switch (action) {
      case 'check':
        return await checkVersion(request)
      case 'status':
        return await getStatus()
      default:
        return NextResponse.json({
          success: false,
          error: '无效的操作类型'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('[Docker Version Manager] GET请求失败:', error)
    return NextResponse.json({
      success: false,
      error: '检查版本信息失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * POST /api/docker-version-manager - 执行更新操作
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
    console.error('[Docker Version Manager] POST请求失败:', error)
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
async function checkVersion(request?: NextRequest): Promise<NextResponse> {
  try {
    // 获取远程最新版本信息，传递请求对象以获取registry参数
    const remoteInfo = await getLatestVersion(request)
    
    // 获取本地版本信息
    const localInfo = await getLocalVersion()
    
    // 判断是否需要更新
    const needsUpdate = !localInfo.exists || localInfo.version !== remoteInfo.version

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
    console.error('[Docker Version Manager] 检查版本失败:', error)
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
    // 检查是否在Docker容器中运行
    const isDocker = fs.existsSync('/.dockerenv') || 
                     (await fs.promises.readFile('/proc/1/cgroup', 'utf-8')).includes('docker')
    
    // 获取当前容器ID
    let containerId: string | undefined
    let containerName: string | undefined
    
    if (isDocker) {
      containerId = (await fs.promises.readFile('/proc/self/cgroup', 'utf-8'))
        .split('\n')
        .find(line => line.includes('docker'))
        ?.split('/')
        .pop()
        
      // 获取当前容器名称
      containerName = process.env.HOSTNAME || containerId?.substring(0, 12)
    }

    return NextResponse.json({
      success: true,
      data: {
        installed: isDocker,
        isDockerEnvironment: isDocker,
        containerId,
        containerName
      }
    })
  } catch (error) {
    console.error('[Docker Version Manager] 获取状态失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取安装状态失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * 获取Docker Hub最新版本信息
 */
async function getLatestVersion(request?: NextRequest) {
  // 获取Docker Hub镜像源配置（默认使用国内镜像源）
  let dockerHubRegistry = process.env.DOCKER_HUB_REGISTRY || 'https://docker.mirrors.ustc.edu.cn'
  
  // 如果请求中包含registry参数，则使用该参数
  if (request) {
    const { searchParams } = new URL(request.url)
    const registryParam = searchParams.get('registry')
    if (registryParam) {
      dockerHubRegistry = registryParam
    }
  }
  
  // 确保URL格式正确
  // 对于官方Docker Hub和其他镜像源，都使用标准Docker Hub API地址来获取版本信息
  // 镜像源仅用于加速镜像拉取，不提供版本API
  let registryUrl = DOCKER_HUB_API_BASE;
  
  const url = `${registryUrl}?page_size=5&page=1`
  
  console.log(`[Docker Version Manager] 请求URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      timeout: 10000, // 10秒超时
    })
    
    console.log(`[Docker Version Manager] 响应状态: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Docker Version Manager] API请求失败: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Docker Hub API请求失败: ${response.status} ${response.statusText}`)
    }
    
    const data: DockerHubResponse = await response.json()
    
    // 过滤掉latest标签，获取最新的版本标签
    const versionTags = data.results.filter(tag => tag.name !== 'latest')
    const latestVersion = versionTags[0]?.name || 'latest'
    const lastUpdated = versionTags[0]?.last_updated || new Date().toISOString()
    
    return {
      version: latestVersion,
      lastUpdated
    }
  } catch (error) {
      console.error('[Docker Version Manager] 获取最新版本失败:', error);
      // 检查是否为连接超时错误
      if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || 
          (error.cause && error.cause.code === 'UND_ERR_CONNECT_TIMEOUT')) {
        throw new Error('连接Docker Hub超时，请检查网络连接或稍后重试');
      }
      throw error;
    }
}

/**
 * 获取本地版本信息
 */
async function getLocalVersion() {
  // 从环境变量获取当前运行的版本
  const currentVersion = process.env.CURRENT_DOCKER_VERSION || 'v0.2.0'
  
  // 在Docker环境中，我们通过环境变量来判断版本
  const exists = !!currentVersion
  
  // 获取最后更新时间（这里简化处理，实际可能需要从其他地方获取）
  const lastUpdated = new Date().toISOString()
  
  if (!exists) {
    return {
      exists: false
    }
  }

  return {
    exists: true,
    version: currentVersion,
    lastUpdated
  }
}

/**
 * 下载最新版本
 */
async function downloadLatest(): Promise<NextResponse> {
  try {
    // 获取最新版本信息
    const latestVersion = await getLatestVersion()
    
    console.log(`[Docker Version Manager] 准备拉取镜像: ${DOCKER_HUB_REPO}:${latestVersion.version}`)
    
    // 拉取最新的Docker镜像
    const pullCmd = `docker pull ${DOCKER_HUB_REPO}:${latestVersion.version}`
    await execAsync(pullCmd)
    
    console.log(`[Docker Version Manager] 镜像拉取完成: ${DOCKER_HUB_REPO}:${latestVersion.version}`)

    return NextResponse.json({
      success: true,
      data: {
        versionInfo: latestVersion,
        message: '镜像拉取完成，准备安装'
      }
    })
  } catch (error) {
    console.error('[Docker Version Manager] 下载失败:', error)
    return NextResponse.json({
      success: false,
      error: '拉取最新镜像失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * 安装更新
 */
async function installUpdate(): Promise<NextResponse> {
  try {
    // 检查是否在Docker容器中运行
    const isDocker = fs.existsSync('/.dockerenv') || 
                     (await fs.promises.readFile('/proc/1/cgroup', 'utf-8')).includes('docker')
    
    if (!isDocker) {
      return NextResponse.json({ 
        success: false, 
        error: 'Application is not running in a Docker container' 
      }, { status: 400 })
    }
    
    // 获取当前容器ID
    const containerId = (await fs.promises.readFile('/proc/self/cgroup', 'utf-8'))
      .split('\n')
      .find(line => line.includes('docker'))
      ?.split('/')
      .pop()
      
    if (!containerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unable to determine container ID' 
      }, { status: 500 })
    }
    
    // 获取当前容器名称
    const containerName = process.env.HOSTNAME || containerId.substring(0, 12)
    
    // 获取最新版本信息
    const latestVersion = await getLatestVersion()
    
    console.log('[Docker Version Manager] 停止当前容器...')
    const stopResult = await execCommand(`docker stop ${containerName}`)
    
    if (stopResult.error) {
      throw new Error(`Failed to stop container: ${stopResult.error}`)
    }
    
    console.log('[Docker Version Manager] 启动新容器...')
    // 获取当前容器的配置
    const inspectResult = await execCommand(`docker inspect ${containerName}`)
    
    if (inspectResult.error) {
      throw new Error(`Failed to inspect container: ${inspectResult.error}`)
    }
    
    const containerInfo = JSON.parse(inspectResult.stdout)
    const config = containerInfo[0]
    
    // 构建新的运行命令
    const image = `${DOCKER_HUB_REPO}:${latestVersion.version}`
    const ports = config.HostConfig.PortBindings
    const portMapping = Object.keys(ports).map(hostPort => `-p ${ports[hostPort][0].HostPort}:${hostPort}`).join(' ')
    
    const volumes = config.Mounts.map((mount: any) => `-v ${mount.Source}:${mount.Destination}`).join(' ')
    const envVars = config.Config.Env.map((env: string) => `-e ${env}`).join(' ')
    
    const runCommand = `docker run -d --name ${containerName} ${portMapping} ${volumes} ${envVars} ${image}`
    
    // 启动新容器
    const runResult = await execCommand(runCommand)
    
    if (runResult.error) {
      throw new Error(`Failed to start new container: ${runResult.error}`)
    }
    
    console.log('[Docker Version Manager] Docker镜像更新成功')
    
    return NextResponse.json({ 
      success: true, 
      data: {
        message: 'Docker镜像更新成功',
        versionInfo: latestVersion
      }
    })
  } catch (error) {
    console.error('[Docker Version Manager] 安装失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: `更新Docker镜像失败: ${error.message}` 
    }, { status: 500 })
  }
}

// 执行系统命令的辅助函数
async function execCommand(command: string): Promise<{ error?: string; stdout?: string; stderr?: string }> {
  try {
    const { stdout, stderr } = await execAsync(command)
    return { stdout, stderr }
  } catch (error) {
    return { error: error.message, stdout: '', stderr: error.stderr || '' }
  }
}