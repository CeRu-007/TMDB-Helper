// 重定向到新的Docker版本管理API
export { GET, POST } from '../docker-version-manager/route'

// 检查当前版本与最新版本
async function checkVersion(request?: Request) {
  try {
    // 获取当前运行的版本（从环境变量读取）
    const currentVersion = process.env.CURRENT_DOCKER_VERSION || 'v0.2.0'
    
    // 获取Docker Hub镜像源配置（默认使用官方源或环境变量配置的源）
    let dockerHubRegistry = process.env.DOCKER_HUB_REGISTRY || 'https://hub.docker.com'
    
    // 如果请求中包含镜像源参数，则使用请求中的参数
    if (request) {
      const { searchParams } = new URL(request.url)
      const registryParam = searchParams.get('registry')
      if (registryParam) {
        dockerHubRegistry = registryParam
      }
    }
    
    // 调用Docker Hub API获取最新版本
    const response = await fetch(`${dockerHubRegistry}/v2/repositories/ceru007/tmdb-helper/tags/?page_size=5&page=1`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Docker Hub tags: ${response.status} ${response.statusText}`)
    }
    
    const data: DockerHubResponse = await response.json()
    
    // 过滤掉latest标签，获取最新的版本标签
    const versionTags = data.results.filter(tag => tag.name !== 'latest')
    const latestVersion = versionTags[0]?.name || currentVersion
    
    const isUpdateAvailable = currentVersion !== latestVersion
    
    return NextResponse.json({
      currentVersion,
      latestVersion,
      isUpdateAvailable,
      lastChecked: new Date().toISOString(),
      registry: dockerHubRegistry
    })
  } catch (error) {
    console.error('[Docker Version Check] Error:', error)
    return NextResponse.json({ error: 'Failed to check version' }, { status: 500 })
  }
}

// 获取版本历史记录
async function getVersionHistory() {
  try {
    // 模拟版本历史记录数据
    const versionHistory: VersionHistory[] = [
      {
        version: "v0.2.1",
        releaseDate: "2024-01-15",
        changelog: [
          "修复了Docker容器启动时的权限问题",
          "优化了内存使用效率",
          "改进了日志输出格式"
        ]
      },
      {
        version: "v0.2.0",
        releaseDate: "2023-12-20",
        changelog: [
          "新增Docker镜像版本管理功能",
          "改进了TMDB数据同步性能",
          "修复了部分UI显示问题"
        ]
      },
      {
        version: "v0.1.5",
        releaseDate: "2023-11-10",
        changelog: [
          "增加了自动更新通知功能",
          "优化了数据导入导出性能",
          "修复了API密钥验证问题"
        ]
      }
    ]
    
    return NextResponse.json(versionHistory)
  } catch (error) {
    console.error('[Version History] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch version history' }, { status: 500 })
  }
}

// 检查运行环境
async function checkEnvironment() {
  try {
    // 检查是否在Docker容器中运行
    const isDocker = fs.existsSync('/.dockerenv') || 
                     (await fs.promises.readFile('/proc/1/cgroup', 'utf-8')).includes('docker')
    
    return NextResponse.json({
      isDockerEnvironment: isDocker,
      message: isDocker ? 'Running in Docker container' : 'Not running in Docker container'
    })
  } catch (error) {
    console.error('[Environment Check] Error:', error)
    // 如果出现错误，默认假设不在Docker环境中
    return NextResponse.json({
      isDockerEnvironment: false,
      message: 'Environment check failed'
    })
  }
}

// 执行更新操作
async function performUpdate() {
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
    
    // 拉取最新的Docker镜像
    console.log('[Docker Update] Pulling latest image...')
    const pullResult = await execCommand(`docker pull ceru007/tmdb-helper:latest`)
    
    if (pullResult.error) {
      throw new Error(`Failed to pull image: ${pullResult.error}`)
    }
    
    console.log('[Docker Update] Stopping current container...')
    const stopResult = await execCommand(`docker stop ${containerName}`)
    
    if (stopResult.error) {
      throw new Error(`Failed to stop container: ${stopResult.error}`)
    }
    
    console.log('[Docker Update] Starting new container...')
    // 获取当前容器的配置
    const inspectResult = await execCommand(`docker inspect ${containerName}`)
    
    if (inspectResult.error) {
      throw new Error(`Failed to inspect container: ${inspectResult.error}`)
    }
    
    const containerInfo = JSON.parse(inspectResult.stdout)
    const config = containerInfo[0]
    
    // 构建新的运行命令
    const image = 'ceru007/tmdb-helper:latest'
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
    
    console.log('[Docker Update] Docker image updated successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Docker image updated successfully'
    })
  } catch (error) {
    console.error('[Docker Update] Error:', error)
    return NextResponse.json({ error: `Failed to update Docker image: ${error.message}` }, { status: 500 })
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