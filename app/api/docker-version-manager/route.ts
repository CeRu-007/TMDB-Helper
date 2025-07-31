import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getDockerConfig, saveDockerConfig, validateDockerConfig } from '@/lib/docker-config'
import memoryLogger from '@/lib/memory-logger'

const execAsync = promisify(exec)

// 版本比较函数
function compareVersions(v1: string, v2: string): number {
  const normalize = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const a = normalize(v1)
  const b = normalize(v2)

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

// 重试机制的fetch函数
async function fetchWithRetry(url: string, options: any = {}, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'TMDB-Helper/1.0',
          ...options.headers
        }
      })

      clearTimeout(timeoutId)

      if (response.ok) return response

      if (response.status >= 500 && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        continue
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
      if (i === retries - 1) throw error

      // 对于网络错误，进行重试
      if (error.name === 'AbortError' || error.code === 'ECONNRESET') {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        continue
      }

      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

// 记录操作日志 - 使用内存日志管理器
function logOperation(operation: string, details: any, success: boolean = true, error?: string) {
  memoryLogger.log(operation, details, success, error)
}

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
      case 'history':
        return await getVersionHistory()
      case 'config':
        return await getConfig()
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
      case 'config':
        return await updateConfig(request)
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
    const needsUpdate = !localInfo.exists ||
      (localInfo.version && remoteInfo.version &&
        compareVersions(remoteInfo.version, localInfo.version) > 0)

    const versionInfo: VersionInfo = {
      local: localInfo,
      remote: remoteInfo,
      needsUpdate
    }

    logOperation('检查版本完成', {
      local: localInfo.version,
      remote: remoteInfo.version,
      needsUpdate
    })

    return NextResponse.json({
      success: true,
      data: versionInfo
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logOperation('检查版本失败', { error: errorMessage }, false, errorMessage)

    return NextResponse.json({
      success: false,
      error: '检查版本信息失败',
      details: errorMessage
    }, { status: 500 })
  }
}

/**
 * 验证Docker配置
 */
async function validateDockerConfig() {
  const checks = [
    {
      name: 'Docker守护进程',
      test: async () => {
        const { stdout } = await execAsync('docker version --format "{{.Server.Version}}"')
        return { success: true, version: stdout.trim() }
      }
    },
    {
      name: '容器管理权限',
      test: async () => {
        await execAsync('docker ps')
        return { success: true }
      }
    },
    {
      name: '镜像拉取权限',
      test: async () => {
        // 测试拉取一个很小的镜像
        await execAsync('docker pull hello-world:latest', { timeout: 30000 })
        return { success: true }
      }
    }
  ]

  const results = await Promise.allSettled(
    checks.map(async check => ({
      name: check.name,
      ...(await check.test().catch(error => ({ success: false, error: error.message })))
    }))
  )

  return results.map((result, index) => ({
    name: checks[index].name,
    ...(result.status === 'fulfilled' ? result.value : { success: false, error: 'Test failed' })
  }))
}

/**
 * 获取安装状态
 */
async function getStatus(): Promise<NextResponse> {
  try {
    // 使用增强的Docker环境检测
    const isDocker = await detectDockerEnvironment()

    let containerId: string | undefined
    let containerName: string | undefined
    let containerInfo: any = {}

    if (isDocker) {
      try {
        // 获取容器ID的多种方式
        const cgroupContent = await fs.promises.readFile('/proc/self/cgroup', 'utf-8')
        const dockerLine = cgroupContent.split('\n').find(line => line.includes('docker'))
        containerId = dockerLine?.split('/').pop()?.substring(0, 12)

        // 获取容器名称
        containerName = process.env.HOSTNAME || containerId

        // 获取更详细的容器信息
        if (containerId) {
          try {
            const { stdout } = await execAsync(`docker inspect ${containerId}`)
            const inspectData = JSON.parse(stdout)
            containerInfo = {
              name: inspectData[0]?.Name?.replace('/', ''),
              image: inspectData[0]?.Config?.Image,
              created: inspectData[0]?.Created,
              state: inspectData[0]?.State?.Status
            }
          } catch (inspectError) {
            logOperation('获取容器详细信息失败', { error: inspectError.message }, false)
          }
        }
      } catch (error) {
        logOperation('获取容器信息失败', { error: error.message }, false)
      }
    }

    // 验证Docker配置（仅在Docker环境中）
    let dockerValidation: any[] = []
    if (isDocker) {
      try {
        dockerValidation = await validateDockerConfig()
      } catch (error) {
        logOperation('Docker配置验证失败', { error: error.message }, false)
      }
    }

    const statusData = {
      installed: isDocker,
      isDockerEnvironment: isDocker,
      containerId,
      containerName,
      containerInfo,
      dockerValidation,
      timestamp: new Date().toISOString()
    }

    logOperation('获取状态', statusData)

    return NextResponse.json({
      success: true,
      data: statusData
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logOperation('获取状态失败', { error: errorMessage }, false, errorMessage)

    return NextResponse.json({
      success: false,
      error: '获取安装状态失败',
      details: errorMessage
    }, { status: 500 })
  }
}

/**
 * 测试镜像源速度
 */
async function testRegistrySpeed(registry: string): Promise<number> {
  const start = Date.now()
  try {
    // 对于Docker Hub API，始终使用官方API端点
    const testUrl = registry.includes('hub.docker.com') ?
      `${DOCKER_HUB_API_BASE}/${DOCKER_HUB_REPO}/tags?page_size=1` :
      `${DOCKER_HUB_API_BASE}/${DOCKER_HUB_REPO}/tags?page_size=1`

    await fetchWithRetry(testUrl, { timeout: 5000 }, 1)
    return Date.now() - start
  } catch {
    return Infinity
  }
}

/**
 * 获取Docker Hub最新版本信息
 */
async function getLatestVersion(request?: NextRequest) {
  let dockerHubRegistry = process.env.DOCKER_HUB_REGISTRY || 'https://hub.docker.com'

  // 如果请求中包含registry参数，则使用该参数
  if (request) {
    const { searchParams } = new URL(request.url)
    const registryParam = searchParams.get('registry')
    if (registryParam) {
      dockerHubRegistry = registryParam
    }
  }

  // 构建API URL - 始终使用Docker Hub官方API获取版本信息
  const url = `${DOCKER_HUB_API_BASE}/${DOCKER_HUB_REPO}/tags?page_size=10&page=1`

  logOperation('获取最新版本', { registry: dockerHubRegistry, url })

  try {
    const response = await fetchWithRetry(url, { timeout: 15000 })

    if (!response.ok) {
      const errorText = await response.text()
      logOperation('API请求失败', { status: response.status, error: errorText }, false)
      throw new Error(`Docker Hub API请求失败: ${response.status} ${response.statusText}`)
    }

    const data: DockerHubResponse = await response.json()

    if (!data.results || data.results.length === 0) {
      throw new Error('未找到任何版本标签')
    }

    // 过滤并排序版本标签
    const versionTags = data.results
      .filter(tag => tag.name !== 'latest' && /^v?\d+\.\d+\.\d+/.test(tag.name))
      .sort((a, b) => compareVersions(b.name, a.name))

    const latestVersion = versionTags[0]?.name || data.results[0]?.name || 'latest'
    const lastUpdated = versionTags[0]?.last_updated || data.results[0]?.last_updated || new Date().toISOString()

    logOperation('获取版本成功', { version: latestVersion, lastUpdated })

    return {
      version: latestVersion,
      lastUpdated,
      registry: dockerHubRegistry
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logOperation('获取最新版本失败', { error: errorMessage }, false, errorMessage)

    // 提供更友好的错误信息
    if (error.name === 'AbortError') {
      throw new Error('连接Docker Hub超时，请检查网络连接或稍后重试')
    } else if (errorMessage.includes('ENOTFOUND')) {
      throw new Error('无法解析Docker Hub域名，请检查网络连接')
    } else if (errorMessage.includes('ECONNREFUSED')) {
      throw new Error('连接被拒绝，请检查防火墙设置')
    }

    throw new Error(`获取版本信息失败: ${errorMessage}`)
  }
}

/**
 * 增强的Docker环境检测
 */
async function detectDockerEnvironment(): Promise<boolean> {
  const checks = [
    // 检查 /.dockerenv 文件
    () => fs.existsSync('/.dockerenv'),

    // 检查 /proc/1/cgroup 文件
    () => {
      try {
        return fs.existsSync('/proc/1/cgroup') &&
          fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker')
      } catch {
        return false
      }
    },

    // 检查环境变量
    () => process.env.DOCKER_CONTAINER === 'true',

    // 检查 /proc/self/cgroup
    () => {
      try {
        return fs.existsSync('/proc/self/cgroup') &&
          fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker')
      } catch {
        return false
      }
    }
  ]

  const results = checks.map(check => {
    try {
      return check()
    } catch {
      return false
    }
  })

  const isDocker = results.some(result => result)
  logOperation('Docker环境检测', { results, isDocker })

  return isDocker
}

/**
 * 获取本地版本信息
 */
async function getLocalVersion() {
  try {
    // 多种方式获取当前版本
    let currentVersion = process.env.CURRENT_DOCKER_VERSION ||
      process.env.APP_VERSION ||
      process.env.VERSION

    // 如果环境变量中没有版本信息，尝试从package.json获取
    if (!currentVersion) {
      try {
        const packagePath = path.join(process.cwd(), 'package.json')
        if (fs.existsSync(packagePath)) {
          const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
          currentVersion = packageJson.version ? `v${packageJson.version}` : null
        }
      } catch (error) {
        logOperation('读取package.json失败', { error: error.message }, false)
      }
    }

    // 尝试从Docker标签获取版本信息
    if (!currentVersion) {
      try {
        const { stdout } = await execAsync('docker inspect $(hostname) --format="{{.Config.Image}}"')
        const imageName = stdout.trim()
        const versionMatch = imageName.match(/:(.+)$/)
        if (versionMatch && versionMatch[1] !== 'latest') {
          currentVersion = versionMatch[1]
        }
      } catch (error) {
        logOperation('从Docker标签获取版本失败', { error: error.message }, false)
      }
    }

    // 默认版本
    if (!currentVersion) {
      currentVersion = 'v1.0.0'
    }

    // 获取容器创建时间作为最后更新时间
    let lastUpdated = new Date().toISOString()
    try {
      const { stdout } = await execAsync('docker inspect $(hostname) --format="{{.Created}}"')
      lastUpdated = stdout.trim()
    } catch (error) {
      logOperation('获取容器创建时间失败', { error: error.message }, false)
    }

    const versionInfo = {
      exists: true,
      version: currentVersion,
      lastUpdated
    }

    logOperation('获取本地版本', versionInfo)
    return versionInfo

  } catch (error) {
    logOperation('获取本地版本失败', { error: error.message }, false)
    return {
      exists: false,
      error: error.message
    }
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
 * 创建备份点
 */
async function createBackup() {
  try {
    const containerName = process.env.HOSTNAME
    if (!containerName) {
      throw new Error('无法获取容器名称')
    }

    // 获取当前容器配置
    const { stdout } = await execAsync(`docker inspect ${containerName}`)
    const containerInfo = JSON.parse(stdout)[0]

    const backupInfo = {
      timestamp: new Date().toISOString(),
      containerName,
      image: containerInfo.Config.Image,
      config: {
        env: containerInfo.Config.Env,
        ports: containerInfo.HostConfig.PortBindings,
        volumes: containerInfo.Mounts,
        restartPolicy: containerInfo.HostConfig.RestartPolicy
      }
    }

    logOperation('创建备份点', backupInfo)
    return backupInfo
  } catch (error) {
    logOperation('创建备份点失败', { error: error.message }, false)
    throw new Error(`创建备份点失败: ${error.message}`)
  }
}

/**
 * 预更新检查
 */
async function preUpdateCheck() {
  const checks = [
    {
      name: '磁盘空间检查',
      check: async () => {
        const { stdout } = await execAsync('df -h /')
        const usage = stdout.split('\n')[1].split(/\s+/)[4]
        const usagePercent = parseInt(usage.replace('%', ''))
        if (usagePercent > 90) {
          throw new Error(`磁盘空间不足: ${usage} 已使用`)
        }
        return { usage }
      }
    },
    {
      name: 'Docker守护进程检查',
      check: async () => {
        await execAsync('docker version')
        return { status: 'running' }
      }
    },
    {
      name: '网络连接检查',
      check: async () => {
        await fetchWithRetry(`${DOCKER_HUB_API_BASE}/${DOCKER_HUB_REPO}/tags?page_size=1`, { timeout: 10000 }, 1)
        return { status: 'connected' }
      }
    }
  ]

  const results = []
  for (const check of checks) {
    try {
      const result = await check.check()
      results.push({ name: check.name, success: true, ...result })
    } catch (error) {
      results.push({ name: check.name, success: false, error: error.message })
      throw new Error(`预检查失败 - ${check.name}: ${error.message}`)
    }
  }

  logOperation('预更新检查', { results })
  return results
}

/**
 * 验证更新
 */
async function validateUpdate(expectedVersion: string) {
  try {
    // 等待容器启动
    await new Promise(resolve => setTimeout(resolve, 5000))

    const containerName = process.env.HOSTNAME
    const { stdout } = await execAsync(`docker inspect ${containerName} --format="{{.Config.Image}}"`)
    const currentImage = stdout.trim()

    if (!currentImage.includes(expectedVersion)) {
      throw new Error(`版本验证失败: 期望 ${expectedVersion}, 实际 ${currentImage}`)
    }

    // 检查容器健康状态
    const { stdout: healthStatus } = await execAsync(`docker inspect ${containerName} --format="{{.State.Health.Status}}"`)
    if (healthStatus.trim() === 'unhealthy') {
      throw new Error('容器健康检查失败')
    }

    logOperation('更新验证成功', { expectedVersion, currentImage })
    return true
  } catch (error) {
    logOperation('更新验证失败', { error: error.message }, false)
    throw error
  }
}

/**
 * 回滚操作
 */
async function rollback(backupInfo: any) {
  try {
    logOperation('开始回滚', backupInfo)

    const containerName = backupInfo.containerName

    // 停止当前容器
    await execAsync(`docker stop ${containerName}`)
    await execAsync(`docker rm ${containerName}`)

    // 重新创建原始容器
    const config = backupInfo.config
    const portMapping = Object.keys(config.ports || {})
      .map(port => `-p ${config.ports[port][0].HostPort}:${port}`)
      .join(' ')

    const volumes = (config.volumes || [])
      .map((mount: any) => `-v ${mount.Source}:${mount.Destination}`)
      .join(' ')

    const envVars = (config.env || [])
      .map((env: string) => `-e "${env}"`)
      .join(' ')

    const runCommand = `docker run -d --name ${containerName} ${portMapping} ${volumes} ${envVars} ${backupInfo.image}`

    await execAsync(runCommand)

    logOperation('回滚成功', { containerName, image: backupInfo.image })
  } catch (error) {
    logOperation('回滚失败', { error: error.message }, false)
    throw new Error(`回滚失败: ${error.message}`)
  }
}

/**
 * 安全的更新机制
 */
async function safeUpdate(): Promise<NextResponse> {
  let backupInfo: any = null

  try {
    // 检查Docker环境
    const isDocker = await detectDockerEnvironment()
    if (!isDocker) {
      return NextResponse.json({
        success: false,
        error: '应用未在Docker容器中运行'
      }, { status: 400 })
    }

    // 1. 预检查
    logOperation('开始预更新检查', {})
    await preUpdateCheck()

    // 2. 创建备份点
    logOperation('创建备份点', {})
    backupInfo = await createBackup()

    // 3. 获取最新版本信息
    const latestVersion = await getLatestVersion()
    const localVersion = await getLocalVersion()

    // 检查是否需要更新
    if (localVersion.exists && compareVersions(latestVersion.version, localVersion.version) <= 0) {
      return NextResponse.json({
        success: false,
        error: '当前已是最新版本',
        data: { current: localVersion.version, latest: latestVersion.version }
      })
    }

    // 4. 拉取新镜像
    logOperation('拉取新镜像', { version: latestVersion.version })
    const newImage = `${DOCKER_HUB_REPO}:${latestVersion.version}`
    await execAsync(`docker pull ${newImage}`)

    // 5. 执行更新
    logOperation('执行容器更新', { newImage })
    const containerName = process.env.HOSTNAME

    // 停止当前容器
    await execAsync(`docker stop ${containerName}`)

    // 重命名当前容器作为备份
    const backupContainerName = `${containerName}_backup_${Date.now()}`
    await execAsync(`docker rename ${containerName} ${backupContainerName}`)

    // 创建新容器
    const config = backupInfo.config
    const portMapping = Object.keys(config.ports || {})
      .map(port => `-p ${config.ports[port][0].HostPort}:${port}`)
      .join(' ')

    const volumes = (config.volumes || [])
      .map((mount: any) => `-v ${mount.Source}:${mount.Destination}`)
      .join(' ')

    const envVars = (config.env || [])
      .map((env: string) => `-e "${env}"`)
      .join(' ')

    const runCommand = `docker run -d --name ${containerName} ${portMapping} ${volumes} ${envVars} ${newImage}`
    await execAsync(runCommand)

    // 6. 验证更新
    logOperation('验证更新', { expectedVersion: latestVersion.version })
    await validateUpdate(latestVersion.version)

    // 7. 清理备份容器
    setTimeout(async () => {
      try {
        await execAsync(`docker rm ${backupContainerName}`)
        logOperation('清理备份容器', { backupContainerName })
      } catch (error) {
        logOperation('清理备份容器失败', { error: error.message }, false)
      }
    }, 300000) // 5分钟后清理

    logOperation('更新成功', {
      from: localVersion.version,
      to: latestVersion.version
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Docker镜像更新成功',
        versionInfo: latestVersion,
        previousVersion: localVersion.version
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logOperation('更新失败', { error: errorMessage }, false, errorMessage)

    // 如果有备份信息，尝试回滚
    if (backupInfo) {
      try {
        logOperation('尝试自动回滚', {})
        await rollback(backupInfo)
        return NextResponse.json({
          success: false,
          error: `更新失败，已自动回滚: ${errorMessage}`,
          rolledBack: true
        }, { status: 500 })
      } catch (rollbackError) {
        logOperation('自动回滚失败', { error: rollbackError.message }, false)
        return NextResponse.json({
          success: false,
          error: `更新失败且回滚失败: ${errorMessage}`,
          rollbackError: rollbackError.message,
          rolledBack: false
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: false,
      error: `更新失败: ${errorMessage}`,
      details: errorMessage
    }, { status: 500 })
  }
}

/**
 * 安装更新 - 使用安全更新机制
 */
async function installUpdate(): Promise<NextResponse> {
  return await safeUpdate()
}

/**
 * 获取配置
 */
async function getConfig(): Promise<NextResponse> {
  try {
    const config = getDockerConfig()
    logOperation('获取配置', config)

    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logOperation('获取配置失败', { error: errorMessage }, false, errorMessage)

    return NextResponse.json({
      success: false,
      error: '获取配置失败',
      details: errorMessage
    }, { status: 500 })
  }
}

/**
 * 更新配置
 */
async function updateConfig(request: NextRequest): Promise<NextResponse> {
  try {
    const { config } = await request.json()

    // 验证配置
    const validationErrors = validateDockerConfig(config)
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: '配置验证失败',
        details: validationErrors
      }, { status: 400 })
    }

    // 保存配置
    const updatedConfig = { ...getDockerConfig(), ...config }
    saveDockerConfig(updatedConfig)

    logOperation('更新配置', { config: updatedConfig })

    return NextResponse.json({
      success: true,
      data: updatedConfig
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logOperation('更新配置失败', { error: errorMessage }, false, errorMessage)

    return NextResponse.json({
      success: false,
      error: '更新配置失败',
      details: errorMessage
    }, { status: 500 })
  }
}

/**
 * 获取版本历史记录
 */
async function getVersionHistory(): Promise<NextResponse> {
  try {
    // 获取所有版本标签
    const url = `${DOCKER_HUB_API_BASE}/${DOCKER_HUB_REPO}/tags?page_size=20&page=1`
    const response = await fetchWithRetry(url, { timeout: 15000 })

    if (!response.ok) {
      throw new Error(`获取版本历史失败: ${response.status}`)
    }

    const data: DockerHubResponse = await response.json()

    // 处理版本历史数据
    const versionHistory = data.results
      .filter(tag => tag.name !== 'latest' && /^v?\d+\.\d+\.\d+/.test(tag.name))
      .sort((a, b) => compareVersions(b.name, a.name))
      .slice(0, 10) // 只返回最近10个版本
      .map(tag => ({
        version: tag.name,
        releaseDate: new Date(tag.last_updated).toLocaleDateString('zh-CN'),
        changelog: generateChangelog(tag.name) // 生成变更日志
      }))

    logOperation('获取版本历史', { count: versionHistory.length })

    return NextResponse.json(versionHistory)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logOperation('获取版本历史失败', { error: errorMessage }, false, errorMessage)

    return NextResponse.json({
      success: false,
      error: '获取版本历史失败',
      details: errorMessage
    }, { status: 500 })
  }
}

/**
 * 生成变更日志（示例实现）
 */
function generateChangelog(version: string): string[] {
  // 这里可以根据实际情况从Git标签、发布说明等获取真实的变更日志
  // 目前提供示例数据
  const changelogMap: { [key: string]: string[] } = {
    'v1.2.0': [
      '新增Docker镜像版本管理功能',
      '优化用户界面响应速度',
      '修复已知安全漏洞',
      '改进错误处理机制'
    ],
    'v1.1.5': [
      '修复Docker容器更新问题',
      '优化镜像源切换逻辑',
      '改进日志记录功能'
    ],
    'v1.1.4': [
      '修复版本检测bug',
      '优化网络连接超时处理',
      '改进用户体验'
    ]
  }

  return changelogMap[version] || [
    '性能优化和bug修复',
    '改进系统稳定性',
    '更新依赖包版本'
  ]
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