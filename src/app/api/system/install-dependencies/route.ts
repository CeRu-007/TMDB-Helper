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

// 执行命令的通用函数
interface ExecuteOptions {
  cwd?: string
  timeout?: number
  env?: Record<string, string>
}

async function executeCommand(
  command: string,
  args: string[],
  options: ExecuteOptions = {}
): Promise<{ success: boolean; output: string; error?: string }> {
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

    // 设置超时
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
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

      resolve({
        success,
        output: output.trim(),
        error: errorOutput.trim() || undefined
      } as { success: boolean; output: string; error?: string })
    })

    childProcess.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId)

      logger.error(`[依赖安装] 命令执行错误:`, error)
      resolve({
        success: false,
        output: '',
        error: error.message
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

// 安装Python包
async function installPythonPackages(
  packages: string[],
  pythonCmd: string,
  env: EnvironmentInfo
): Promise<InstallProgress[]> {
  const results: InstallProgress[] = []

  for (const pkg of packages) {
    if (env.type === 'docker' && pkg === 'playwright') {
      const systemChromium = await checkSystemChromium()
      const pipPlaywright = await checkPackageInstalled(pkg, pythonCmd)
      if (systemChromium.available && pipPlaywright) {
        results.push({
          step: `检查 ${pkg}`,
          status: 'success',
          output: 'Docker 环境：Python Playwright 已安装，系统 Chromium 可用',
          progress: 100
        })
      } else if (!pipPlaywright) {
        const args = getPipInstallArgs(env, pkg)
        const result = await executeCommand(pythonCmd, args, { timeout: 120000 })
        if (result.success) {
          results.push({
            step: `安装 ${pkg}`,
            status: 'success',
            output: 'Python Playwright 安装成功（使用系统 Chromium）',
            progress: 100
          })
        } else {
          results.push({
            step: `安装 ${pkg}`,
            status: 'error',
            output: `Python Playwright 安装失败: ${result.error || result.output || '未知错误'}`,
            progress: 0
          })
        }
      } else {
        results.push({
          step: `检查 ${pkg}`,
          status: 'error',
          output: 'Docker 环境未找到系统 Chromium',
          progress: 0
        })
      }
      continue
    }

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
        progress: 0
      }
      logger.error(`[依赖安装] ${pkg} 安装失败:`, result.error || result.output)
    }
  }

  return results
}

// 检查系统 Chromium 是否可用（Docker Alpine 环境）
async function checkSystemChromium(): Promise<{ available: boolean; path?: string }> {
  const chromiumPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/lib/chromium/chromium'
  ]

  for (const chromiumPath of chromiumPaths) {
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

  if (env.type === 'docker') {
    const systemChromium = await checkSystemChromium()

    if (systemChromium.available) {
      const pipPlaywright = await checkPackageInstalled('playwright', pythonCmd)
      const nodePlaywrightCheck = await executeCommand('npx', ['playwright', '--version'], { timeout: 10000 })

      if (pipPlaywright && nodePlaywrightCheck.success) {
        results[0] = {
          step: '配置 Playwright 浏览器',
          status: 'success',
          output: `已配置：系统 Chromium (${systemChromium.path})，Python Playwright 已安装，Node.js Playwright: ${nodePlaywrightCheck.output.trim()}`,
          progress: 100
        }
        logger.info('[依赖安装] Docker 环境 Python/Node.js Playwright 和系统 Chromium 已配置')
        return results
      } else if (!pipPlaywright) {
        const args = getPipInstallArgs(env, 'playwright')
        const pipResult = await executeCommand(pythonCmd, args, { timeout: 120000 })
        if (pipResult.success) {
          results[0] = {
            step: '配置 Playwright 浏览器',
            status: 'success',
            output: `已安装 Python Playwright 并配置系统 Chromium: ${systemChromium.path}`,
            progress: 100
          }
          return results
        }
      }

      results[0] = {
        step: '配置 Playwright 浏览器',
        status: 'error',
        output: 'Playwright 配置不完整，请检查 Python playwright 包是否已安装',
        progress: 0
      }
      logger.error('[依赖安装] Docker 环境 Playwright 配置不完整')
      return results
    } else {
      results[0] = {
        step: '检查 Chromium 浏览器',
        status: 'error',
        output: 'Docker 镜像中未找到系统 Chromium，请检查 Dockerfile 配置',
        progress: 0
      }
      logger.error('[依赖安装] Docker 环境未找到系统 Chromium')
      return results
    }
  }

  // 非 Docker 环境：使用 playwright install chromium 下载浏览器
  const args = ['-m', 'playwright', 'install', 'chromium']

  const result = await executeCommand(pythonCmd, args, {
    timeout: 300000  // 5分钟超时，下载浏览器可能需要较长时间
  })

  if (result.success) {
    results[0] = {
      step: '安装 Playwright 浏览器',
      status: 'success',
      output: 'Chromium 浏览器安装成功',
      progress: 100
    }
    logger.info('[依赖安装] Playwright Chromium 安装成功')
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
      if (env.type === 'docker' && pkg === 'playwright') {
        const systemChromium = await checkSystemChromium()
        const pipPlaywright = await checkPackageInstalled(pkg, pythonCmd)
        packageStatus[pkg] = systemChromium.available && pipPlaywright
      } else {
        packageStatus[pkg] = await checkPackageInstalled(pkg, pythonCmd)
      }
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
