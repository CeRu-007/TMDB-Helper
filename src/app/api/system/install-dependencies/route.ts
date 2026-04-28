import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { logger } from '@/lib/utils/logger'

interface InstallRequest {
  packages: string[]
  type: 'python' | 'playwright'
}

interface InstallProgress {
  step: string
  status: 'running' | 'success' | 'error'
  output: string
  progress?: number
}

interface EnvironmentInfo {
  type: 'web' | 'docker' | 'electron'
  pythonPath?: string
  hasWritePermission: boolean
  platform: string
}

// 获取当前运行环境信息
function getEnvironmentInfo(): EnvironmentInfo {
  const isDocker = process.env.DOCKER_CONTAINER === 'true'
  const isElectron = process.env.ELECTRON_BUILD === 'true'

  if (isDocker) {
    return {
      type: 'docker',
      hasWritePermission: true,
      platform: process.platform
    }
  }

  if (isElectron) {
    return {
      type: 'electron',
      hasWritePermission: true,
      platform: process.platform
    }
  }

  return {
    type: 'web',
    hasWritePermission: true,
    platform: process.platform
  }
}

// 获取Python命令列表（根据环境优先级排序）
function getPythonCommands(env: EnvironmentInfo): string[] {
  const commands: string[] = []

  // Docker环境优先检查系统 Python
  if (env.type === 'docker') {
    commands.push(
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      '/usr/bin/python',
      '/usr/local/bin/python',
      'python3',
      'python'
    )
  }
  // Windows环境
  else if (env.platform === 'win32') {
    commands.push('python', 'python3', 'py')
  }
  // macOS/Linux环境
  else {
    commands.push('python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3')
  }

  return commands
}

// 检查Python是否可用
async function checkPython(env: EnvironmentInfo): Promise<{ available: boolean; version?: string; path?: string }> {
  const pythonCommands = getPythonCommands(env)
  logger.info(`[依赖安装] 检查Python环境，命令列表: ${pythonCommands.join(', ')}`)

  for (const cmd of pythonCommands) {
    try {
      const result = await executeCommand(cmd, ['--version'], { timeout: 5000 })

      if (result.success && result.output.includes('Python')) {
        const version = result.output.trim()
        logger.info(`[依赖安装] 找到Python: ${cmd}, 版本: ${version}`)
        return { available: true, version, path: cmd }
      }
    } catch (error) {
      logger.debug(`[依赖安装] 命令 ${cmd} 不可用:`, error)
    }
  }

  logger.warn('[依赖安装] 未找到可用的Python环境')
  return { available: false }
}

// 错误类型定义
type ErrorType =
  | 'network_timeout'
  | 'network_connection'
  | 'permission_denied'
  | 'disk_space'
  | 'python_not_found'
  | 'pip_not_found'
  | 'package_not_found'
  | 'installation_cancelled'
  | 'unknown'

interface CommandError {
  type: ErrorType
  message: string
  suggestion: string
  isRetryable: boolean
}

// 分析错误类型
function analyzeError(errorOutput: string, exitCode: number | null, command: string): CommandError {
  const lowerError = errorOutput.toLowerCase()

  // 网络超时
  if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
    return {
      type: 'network_timeout',
      message: '网络连接超时，下载依赖包时间过长',
      suggestion: '请检查网络连接，或稍后重试。如果网络较慢，可以尝试更换 pip 镜像源。',
      isRetryable: true
    }
  }

  // 网络连接错误
  if (
    lowerError.includes('connection error') ||
    lowerError.includes('could not connect') ||
    lowerError.includes('network is unreachable') ||
    lowerError.includes('name or service not known') ||
    lowerError.includes('getaddrinfo failed') ||
    lowerError.includes('ssl') && lowerError.includes('error')
  ) {
    return {
      type: 'network_connection',
      message: '网络连接失败，无法访问 pip 镜像源',
      suggestion: '请检查网络连接和 DNS 设置。如果使用代理，请检查代理配置。可以尝试在设置中更换 pip 镜像源。',
      isRetryable: true
    }
  }

  // 权限错误
  if (
    lowerError.includes('permission denied') ||
    lowerError.includes('access is denied') ||
    lowerError.includes('could not install packages due to an oserror')
  ) {
    return {
      type: 'permission_denied',
      message: '权限不足，无法写入安装目录',
      suggestion: 'Docker 环境通常不会出现此问题。如果是本地部署，请尝试使用 --user 参数安装，或以管理员身份运行。',
      isRetryable: false
    }
  }

  // 磁盘空间不足
  if (
    lowerError.includes('no space left on device') ||
    lowerError.includes('disk full')
  ) {
    return {
      type: 'disk_space',
      message: '磁盘空间不足，无法下载和安装依赖',
      suggestion: '请清理磁盘空间，确保至少有 500MB 可用空间。Docker 环境请检查容器存储卷空间。',
      isRetryable: false
    }
  }

  // Python 未找到
  if (
    lowerError.includes('python: command not found') ||
    lowerError.includes('python3: command not found') ||
    lowerError.includes('不是内部或外部命令')
  ) {
    return {
      type: 'python_not_found',
      message: '未找到 Python 环境',
      suggestion: '请确保系统已安装 Python 3.8+ 并添加到 PATH 环境变量。Docker 镜像应已包含 Python，请检查容器是否正确运行。',
      isRetryable: false
    }
  }

  // pip 未找到
  if (lowerError.includes('pip: command not found') || lowerError.includes('no module named pip')) {
    return {
      type: 'pip_not_found',
      message: '未找到 pip 包管理器',
      suggestion: '请确保 Python 安装包含 pip。可以尝试运行 "python -m ensurepip --upgrade" 安装 pip。',
      isRetryable: false
    }
  }

  // 包不存在
  if (lowerError.includes('could not find a version') || lowerError.includes('no matching distribution')) {
    return {
      type: 'package_not_found',
      message: '找不到指定的包或版本',
      suggestion: '可能是包名称错误或当前 Python 版本不支持。请检查包名称是否正确，或尝试更换 pip 镜像源。',
      isRetryable: false
    }
  }

  // 安装被取消
  if (exitCode === 130 || lowerError.includes('interrupted') || lowerError.includes('killed')) {
    return {
      type: 'installation_cancelled',
      message: '安装过程被中断',
      suggestion: '安装过程被用户或系统中断，请重新尝试安装。',
      isRetryable: true
    }
  }

  // 未知错误
  return {
    type: 'unknown',
    message: errorOutput || '安装过程中发生未知错误',
    suggestion: '请查看详细错误信息，或尝试重新安装。如果问题持续存在，请检查系统日志。',
    isRetryable: true
  }
}

interface ExecuteOptions {
  cwd?: string
  timeout?: number
  env?: Record<string, string>
}

interface ExecuteResult {
  success: boolean
  output: string
  error?: string
  errorType?: ErrorType
  errorDetails?: CommandError
  exitCode?: number | null
}

async function executeCommand(
  command: string,
  args: string[],
  options: ExecuteOptions = {}
): Promise<ExecuteResult> {
  return new Promise((resolve) => {
    const { cwd, timeout = 30000, env = {} } = options

    logger.debug(`[依赖安装] 执行命令: ${command} ${args.join(' ')}`)

    const childProcess = spawn(command, args, {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env }
    })

    let output = ''
    let errorOutput = ''
    let timeoutId: NodeJS.Timeout | null = null
    let isTimeout = false

    // 设置超时
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        isTimeout = true
        logger.warn(`[依赖安装] 命令执行超时: ${command}`)
        childProcess.kill('SIGTERM')
        // 5秒后强制终止
        setTimeout(() => {
          if (!childProcess.killed) {
            childProcess.kill('SIGKILL')
          }
        }, 5000)
      }, timeout)
    }

    childProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8')
      output += text
      logger.debug(`[依赖安装] 输出: ${text.substring(0, 200)}`)
    })

    childProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8')
      errorOutput += text
      logger.debug(`[依赖安装] 错误输出: ${text.substring(0, 200)}`)
    })

    childProcess.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId)

      const success = code === 0
      logger.debug(`[依赖安装] 命令结束，退出码: ${code}`)

      // 如果是超时导致的失败
      if (isTimeout && !success) {
        const timeoutError: CommandError = {
          type: 'network_timeout',
          message: '命令执行超时，操作未完成',
          suggestion: '网络较慢或操作耗时较长，请稍后重试。',
          isRetryable: true
        }
        resolve({
          success: false,
          output: output.trim(),
          error: errorOutput.trim() || '命令执行超时',
          errorType: 'network_timeout',
          errorDetails: timeoutError,
          exitCode: code
        })
        return
      }

      // 分析错误类型
      let errorDetails: CommandError | undefined
      let errorType: ErrorType | undefined

      if (!success && (errorOutput || code !== 0)) {
        errorDetails = analyzeError(errorOutput, code, command)
        errorType = errorDetails.type
      }

      resolve({
        success,
        output: output.trim(),
        error: errorOutput.trim() || undefined,
        errorType,
        errorDetails,
        exitCode: code
      })
    })

    childProcess.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId)

      logger.error(`[依赖安装] 命令执行错误:`, error)

      const errorDetails = analyzeError(error.message, null, command)

      resolve({
        success: false,
        output: '',
        error: error.message,
        errorType: errorDetails.type,
        errorDetails,
        exitCode: null
      })
    })
  })
}

// 检查包是否已安装
async function checkPackageInstalled(packageName: string, pythonCmd: string): Promise<boolean> {
  try {
    const result = await executeCommand(pythonCmd, ['-m', 'pip', 'show', packageName], { timeout: 10000 })
    return result.success
  } catch (error) {
    logger.debug(`[依赖安装] 检查包 ${packageName} 失败:`, error)
    return false
  }
}

// 获取pip安装参数（根据环境）
function getPipInstallArgs(env: EnvironmentInfo, packageName: string): string[] {
  const args = ['-m', 'pip', 'install']

  // Docker环境使用系统级安装
  if (env.type === 'docker') {
    args.push('--break-system-packages')  // Python 3.11+ 需要
  }
  // 其他环境使用用户级安装
  else {
    args.push('--user')
  }

  // 添加国内镜像源（针对中国用户优化）
  args.push('-i', 'https://pypi.tuna.tsinghua.edu.cn/simple')
  args.push('--trusted-host', 'pypi.tuna.tsinghua.edu.cn')

  args.push(packageName)
  return args
}

// 检查系统 Chromium（非 Playwright 安装的）
async function checkSystemChromium(): Promise<{ available: boolean; path?: string }> {
  const systemChromiumPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/lib/chromium/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ]

  for (const chromiumPath of systemChromiumPaths) {
    try {
      const result = await executeCommand('ls', ['-la', chromiumPath], { timeout: 5000 })
      if (result.success) {
        logger.info(`[依赖安装] 找到系统 Chromium: ${chromiumPath}`)
        return { available: true, path: chromiumPath }
      }
    } catch (error) {
      logger.debug(`[依赖安装] 路径 ${chromiumPath} 不存在`)
    }
  }

  return { available: false }
}

// 安装Python包
async function installPythonPackages(
  packages: string[],
  pythonCmd: string,
  env: EnvironmentInfo
): Promise<InstallProgress[]> {
  const results: InstallProgress[] = []

  for (const pkg of packages) {
    // 首先检查是否已安装
    const isInstalled = await checkPackageInstalled(pkg, pythonCmd)

    if (isInstalled) {
      results.push({
        step: `检查 ${pkg}`,
        status: 'success',
        output: `${pkg} 已安装`,
        progress: 100
      })
      continue
    }

    results.push({
      step: `安装 ${pkg}`,
      status: 'running',
      output: `正在安装 ${pkg}...`,
      progress: 0
    })

    const args = getPipInstallArgs(env, pkg)
    logger.info(`[依赖安装] 开始安装 ${pkg}，参数: ${args.join(' ')}`)

    const result = await executeCommand(pythonCmd, args, { timeout: 120000 })

    if (result.success) {
      results[results.length - 1] = {
        step: `安装 ${pkg}`,
        status: 'success',
        output: `${pkg} 安装成功`,
        progress: 100
      }
      logger.info(`[依赖安装] ${pkg} 安装成功`)
    } else {
      results[results.length - 1] = {
        step: `安装 ${pkg}`,
        status: 'error',
        output: `${pkg} 安装失败: ${result.error || result.output || '未知错误'}`,
        errorType: result.errorType,
        errorDetails: result.errorDetails?.message,
        isRetryable: result.errorDetails?.isRetryable,
        progress: 0
      }
      logger.error(`[依赖安装] ${pkg} 安装失败:`, result.error || result.output)
    }
  }

  return results
}

// 检查 Playwright Chromium 浏览器是否已安装
async function checkPlaywrightChromium(): Promise<{ available: boolean; path?: string }> {
  // 检查 Playwright 浏览器目录（支持多个可能的路径）
  // 优先使用环境变量设置的路径，确保与安装时使用相同路径
  const possiblePaths = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    '/app/data/.cache/ms-playwright',
    '/root/.cache/ms-playwright',
    '/app/.cache/ms-playwright',
    '/home/nextjs/.cache/ms-playwright'
  ].filter(Boolean) as string[]
  
  for (const browsersPath of possiblePaths) {
    try {
      // 检查 chromium-* 目录是否存在
      const result = await executeCommand('ls', ['-d', `${browsersPath}/chromium-*`], { timeout: 5000 })
      if (result.success && result.output) {
        const chromiumDir = result.output.trim().split('\n')[0]
        const chromeExecutable = `${chromiumDir}/chrome-linux/chrome`
        
        // 检查 chrome 可执行文件是否存在
        const execCheck = await executeCommand('ls', ['-la', chromeExecutable], { timeout: 5000 })
        if (execCheck.success) {
          logger.info(`[依赖安装] 找到 Playwright Chromium: ${chromeExecutable}`)
          return { available: true, path: chromeExecutable }
        }
      }
    } catch (error) {
      logger.debug(`[依赖安装] 路径 ${browsersPath} 未找到 Chromium`)
    }
  }

  // 回退到检查系统 Chromium
  const systemChromiumPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/lib/chromium/chromium'
  ]

  for (const chromiumPath of systemChromiumPaths) {
    try {
      const result = await executeCommand('ls', ['-la', chromiumPath], { timeout: 5000 })
      if (result.success) {
        logger.info(`[依赖安装] 找到系统 Chromium: ${chromiumPath}`)
        return { available: true, path: chromiumPath }
      }
    } catch (error) {
      logger.debug(`[依赖安装] 路径 ${chromiumPath} 不存在`)
    }
  }

  return { available: false }
}

// 安装Playwright浏览器
async function installPlaywrightBrowsers(pythonCmd: string, env: EnvironmentInfo): Promise<InstallProgress[]> {
  const results: InstallProgress[] = []

  results.push({
    step: '安装 Playwright 浏览器',
    status: 'running',
    output: '正在检查 Chromium 浏览器...',
    progress: 0
  })

  logger.info('[依赖安装] 开始安装 Playwright Chromium 浏览器')

  // 首先检查是否已有 Chromium
  const playwrightChromium = await checkPlaywrightChromium()

  if (playwrightChromium.available) {
    const pipPlaywright = await checkPackageInstalled('playwright', pythonCmd)
    const nodePlaywrightCheck = await executeCommand('npx', ['playwright', '--version'], { timeout: 10000 })

    if (pipPlaywright && nodePlaywrightCheck.success) {
      results[0] = {
        step: '配置 Playwright 浏览器',
        status: 'success',
        output: `已配置：Playwright Chromium (${playwrightChromium.path})，Python Playwright 已安装，Node.js Playwright: ${nodePlaywrightCheck.output.trim()}`,
        progress: 100
      }
      logger.info('[依赖安装] Python/Node.js Playwright 和 Chromium 已配置')
      return results
    }
  }

  // 需要安装 Chromium
  results[0] = {
    step: '下载 Playwright Chromium',
    status: 'running',
    output: '正在下载 Chromium 浏览器（这可能需要几分钟）...',
    progress: 10
  }

  // 使用 playwright install chromium 下载浏览器
  const args = ['-m', 'playwright', 'install', 'chromium']

  const result = await executeCommand(pythonCmd, args, {
    timeout: 600000  // 10分钟超时，下载浏览器可能需要较长时间
  })

  if (result.success) {
    // 再次检查是否安装成功
    const checkAgain = await checkPlaywrightChromium()
    if (checkAgain.available) {
      results[0] = {
        step: '安装 Playwright 浏览器',
        status: 'success',
        output: `Chromium 浏览器安装成功: ${checkAgain.path}`,
        progress: 100
      }
      logger.info('[依赖安装] Playwright Chromium 安装成功')
    } else {
      results[0] = {
        step: '安装 Playwright 浏览器',
        status: 'success',
        output: 'Chromium 浏览器安装成功（路径检测可能不准确，但应该可用）',
        progress: 100
      }
      logger.info('[依赖安装] Playwright Chromium 安装成功（路径未确认）')
    }
  } else {
    results[0] = {
      step: '安装 Playwright 浏览器',
      status: 'error',
      output: `Chromium 浏览器安装失败: ${result.error || result.output || '未知错误'}`,
      progress: 0
    }
    logger.error('[依赖安装] Playwright Chromium 安装失败:', result.error || result.output)
  }

  return results
}

// GET 请求处理 - 检查依赖状态
export async function GET() {
  try {
    const env = getEnvironmentInfo()
    logger.info(`[依赖安装] 检查依赖状态，环境: ${env.type}`)

    // 检查Python环境
    const pythonCheck = await checkPython(env)

    if (!pythonCheck.available) {
      return NextResponse.json({
        success: false,
        error: '未找到Python环境，请先安装Python',
        environment: env.type,
        platform: env.platform
      })
    }

    // 检查各个包的安装状态
    const packages = ['playwright', 'python-dateutil', 'Pillow', 'bordercrop']
    const pythonCmd = pythonCheck.path!
    const packageStatus: Record<string, boolean> = {}

    for (const pkg of packages) {
      packageStatus[pkg] = await checkPackageInstalled(pkg, pythonCmd)
    }

    logger.info(`[依赖安装] 依赖状态检查完成:`, packageStatus)

    return NextResponse.json({
      success: true,
      data: {
        python: pythonCheck,
        packages: packageStatus,
        environment: env.type,
        platform: env.platform
      }
    })
  } catch (error) {
    logger.error('[依赖安装] 检查依赖状态失败:', error)
    return NextResponse.json({
      success: false,
      error: `检查依赖状态失败: ${error instanceof Error ? error.message : '未知错误'}`
    })
  }
}

// POST 请求处理 - 安装依赖
export async function POST(request: NextRequest) {
  try {
    const body: InstallRequest = await request.json()
    const { packages, type } = body

    const env = getEnvironmentInfo()
    logger.info(`[依赖安装] 开始安装依赖，类型: ${type}，环境: ${env.type}`)

    // 检查Python环境
    const pythonCheck = await checkPython(env)

    if (!pythonCheck.available) {
      return NextResponse.json({
        success: false,
        error: '未找到Python环境，请先安装Python',
        environment: env.type
      })
    }

    const pythonCmd = pythonCheck.path!
    let results: InstallProgress[] = []

    if (type === 'python') {
      results = await installPythonPackages(packages, pythonCmd, env)
    } else if (type === 'playwright') {
      results = await installPlaywrightBrowsers(pythonCmd, env)
    }

    const allSuccess = results.every(r => r.status === 'success')
    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length
    }

    logger.info(`[依赖安装] 安装完成:`, summary)

    return NextResponse.json({
      success: allSuccess,
      data: {
        results,
        summary,
        environment: env.type
      }
    })
  } catch (error) {
    logger.error('[依赖安装] 安装依赖失败:', error)
    return NextResponse.json({
      success: false,
      error: `安装依赖失败: ${error instanceof Error ? error.message : '未知错误'}`
    })
  }
}
