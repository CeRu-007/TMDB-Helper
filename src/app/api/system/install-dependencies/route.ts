import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

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

// 检查Python是否可用
async function checkPython(): Promise<{ available: boolean; version?: string; path?: string }> {
  return new Promise((resolve) => {
    const pythonCommands = ['python', 'python3', 'py']
    let checkedCount = 0
    
    for (const cmd of pythonCommands) {
      const process = spawn(cmd, ['--version'], { shell: true })
      let output = ''
      
      process.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      process.stderr.on('data', (data) => {
        output += data.toString()
      })
      
      process.on('close', (code) => {
        checkedCount++
        if (code === 0 && output.includes('Python')) {
          const version = output.trim()
          resolve({ available: true, version, path: cmd })
          return
        }
        
        if (checkedCount === pythonCommands.length) {
          resolve({ available: false })
        }
      })
      
      process.on('error', () => {
        checkedCount++
        if (checkedCount === pythonCommands.length) {
          resolve({ available: false })
        }
      })
    }
  })
}

// 检查包是否已安装
async function checkPackageInstalled(packageName: string, pythonCmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn(pythonCmd, ['-m', 'pip', 'show', packageName], { shell: true })
    
    process.on('close', (code) => {
      resolve(code === 0)
    })
    
    process.on('error', () => {
      resolve(false)
    })
  })
}

// 安装Python包
async function installPythonPackages(packages: string[], pythonCmd: string): Promise<InstallProgress[]> {
  const results: InstallProgress[] = []
  
  for (const pkg of packages) {
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
    
    const success = await new Promise<boolean>((resolve) => {
      const process = spawn(pythonCmd, ['-m', 'pip', 'install', pkg, '--user'], { 
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      let output = ''
      
      process.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      process.stderr.on('data', (data) => {
        output += data.toString()
      })
      
      process.on('close', (code) => {
        if (code === 0) {
          results[results.length - 1] = {
            step: `安装 ${pkg}`,
            status: 'success',
            output: `${pkg} 安装成功`,
            progress: 100
          }
          resolve(true)
        } else {
          results[results.length - 1] = {
            step: `安装 ${pkg}`,
            status: 'error',
            output: `${pkg} 安装失败: ${output}`,
            progress: 0
          }
          resolve(false)
        }
      })
      
      process.on('error', (error) => {
        results[results.length - 1] = {
          step: `安装 ${pkg}`,
          status: 'error',
          output: `${pkg} 安装失败: ${error.message}`,
          progress: 0
        }
        resolve(false)
      })
    })
  }
  
  return results
}

// 安装Playwright浏览器
async function installPlaywrightBrowsers(pythonCmd: string): Promise<InstallProgress[]> {
  const results: InstallProgress[] = []
  
  results.push({
    step: '安装 Playwright 浏览器',
    status: 'running',
    output: '正在安装 Chromium 浏览器...',
    progress: 0
  })
  
  const success = await new Promise<boolean>((resolve) => {
    const process = spawn(pythonCmd, ['-m', 'playwright', 'install', 'chromium'], { 
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    let output = ''
    
    process.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    process.stderr.on('data', (data) => {
      output += data.toString()
    })
    
    process.on('close', (code) => {
      if (code === 0) {
        results[0] = {
          step: '安装 Playwright 浏览器',
          status: 'success',
          output: 'Chromium 浏览器安装成功',
          progress: 100
        }
        resolve(true)
      } else {
        results[0] = {
          step: '安装 Playwright 浏览器',
          status: 'error',
          output: `Chromium 浏览器安装失败: ${output}`,
          progress: 0
        }
        resolve(false)
      }
    })
    
    process.on('error', (error) => {
      results[0] = {
        step: '安装 Playwright 浏览器',
        status: 'error',
        output: `Chromium 浏览器安装失败: ${error.message}`,
        progress: 0
      }
      resolve(false)
    })
  })
  
  return results
}

export async function GET() {
  try {
    // 检查Python环境
    const pythonCheck = await checkPython()
    
    if (!pythonCheck.available) {
      return NextResponse.json({
        success: false,
        error: '未找到Python环境，请先安装Python'
      })
    }
    
    // 检查各个包的安装状态
    const packages = ['playwright', 'python-dateutil', 'Pillow', 'bordercrop']
    const pythonCmd = pythonCheck.path!
    const packageStatus = {}
    
    for (const pkg of packages) {
      const isInstalled = await checkPackageInstalled(pkg, pythonCmd)
      packageStatus[pkg] = isInstalled
    }
    
    return NextResponse.json({
      success: true,
      data: {
        python: pythonCheck,
        packages: packageStatus
      }
    })
  } catch (error) {
    console.error('检查依赖状态失败:', error)
    return NextResponse.json({
      success: false,
      error: '检查依赖状态失败'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: InstallRequest = await request.json()
    const { packages, type } = body
    
    // 检查Python环境
    const pythonCheck = await checkPython()
    
    if (!pythonCheck.available) {
      return NextResponse.json({
        success: false,
        error: '未找到Python环境，请先安装Python'
      })
    }
    
    const pythonCmd = pythonCheck.path!
    let results: InstallProgress[] = []
    
    if (type === 'python') {
      results = await installPythonPackages(packages, pythonCmd)
    } else if (type === 'playwright') {
      results = await installPlaywrightBrowsers(pythonCmd)
    }
    
    const allSuccess = results.every(r => r.status === 'success')
    
    return NextResponse.json({
      success: allSuccess,
      data: {
        results,
        summary: {
          total: results.length,
          success: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length
        }
      }
    })
  } catch (error) {
    console.error('安装依赖失败:', error)
    return NextResponse.json({
      success: false,
      error: '安装依赖失败'
    })
  }
}