#!/usr/bin/env node

/**
 * Docker环境启动脚本
 * 确保在Docker容器中正确初始化所有优化功能
 */

const fs = require('fs');
const path = require('path');

console.log('🐳 Docker启动脚本开始执行...');

// 检测Docker环境
function detectDockerEnvironment() {
  const indicators = {
    dockerEnv: fs.existsSync('/.dockerenv'),
    containerEnv: process.env.DOCKER_CONTAINER === 'true',
    hostname: process.env.HOSTNAME && /^[a-f0-9]{12}$/.test(process.env.HOSTNAME),
    cgroup: false
  };

  try {
    if (fs.existsSync('/proc/1/cgroup')) {
      const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
      indicators.cgroup = cgroup.includes('docker') || cgroup.includes('containerd');
    }
  } catch (error) {
    // 忽略错误
  }

  const isDocker = Object.values(indicators).some(Boolean);
  
  console.log('🔍 Docker环境检测结果:', {
    isDocker,
    indicators
  });

  return isDocker;
}

// 创建必要的目录
function ensureDirectories() {
  const directories = [
    '/app/data',
    '/app/logs',
    '/tmp'
  ];

  directories.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ 创建目录: ${dir}`);
      } else {
        console.log(`📁 目录已存在: ${dir}`);
      }
    } catch (error) {
      console.error(`❌ 创建目录失败 ${dir}:`, error.message);
    }
  });
}

// 检查文件权限
function checkPermissions() {
  const testPaths = [
    '/app/data',
    '/app/logs'
  ];

  const results = {};

  testPaths.forEach(testPath => {
    try {
      const testFile = path.join(testPath, '.write_test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      results[testPath] = true;
      console.log(`✅ 写入权限正常: ${testPath}`);
    } catch (error) {
      results[testPath] = false;
      console.error(`❌ 写入权限异常 ${testPath}:`, error.message);
    }
  });

  return results;
}

// 设置环境变量
function setupEnvironment() {
  const dockerEnvVars = {
    DOCKER_CONTAINER: 'true',
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=1024',
    NEXT_TELEMETRY_DISABLED: '1'
  };

  Object.entries(dockerEnvVars).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
      console.log(`🔧 设置环境变量: ${key}=${value}`);
    } else {
      console.log(`📝 环境变量已存在: ${key}=${process.env[key]}`);
    }
  });
}

// 生成Docker配置报告
function generateConfigReport() {
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    },
    docker: {
      isDocker: detectDockerEnvironment(),
      hostname: process.env.HOSTNAME,
      user: process.env.USER || 'unknown',
      workdir: process.cwd()
    },
    directories: {
      exists: {
        data: fs.existsSync('/app/data'),
        logs: fs.existsSync('/app/logs'),
        tmp: fs.existsSync('/tmp')
      },
      permissions: checkPermissions()
    },
    environmentVariables: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HOSTNAME: process.env.HOSTNAME,
      DOCKER_CONTAINER: process.env.DOCKER_CONTAINER,
      NODE_OPTIONS: process.env.NODE_OPTIONS
    }
  };

  try {
    const reportPath = '/app/logs/docker-startup-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 配置报告已生成: ${reportPath}`);
  } catch (error) {
    console.error('❌ 生成配置报告失败:', error.message);
  }

  return report;
}

// 健康检查
function healthCheck() {
  const checks = {
    directories: true,
    permissions: true,
    memory: true,
    environment: true
  };

  // 检查目录
  const requiredDirs = ['/app/data', '/app/logs'];
  checks.directories = requiredDirs.every(dir => fs.existsSync(dir));

  // 检查权限
  const permissions = checkPermissions();
  checks.permissions = Object.values(permissions).every(Boolean);

  // 检查内存
  const memUsage = process.memoryUsage();
  const memLimitMB = 1024; // 1GB
  checks.memory = memUsage.heapUsed < (memLimitMB * 1024 * 1024);

  // 检查环境变量
  const requiredEnvVars = ['NODE_ENV', 'PORT'];
  checks.environment = requiredEnvVars.every(envVar => process.env[envVar]);

  const allPassed = Object.values(checks).every(Boolean);

  console.log('🏥 健康检查结果:', {
    overall: allPassed ? '✅ 通过' : '❌ 失败',
    details: checks
  });

  if (!allPassed) {
    console.error('❌ 健康检查失败，请检查Docker配置');
    process.exit(1);
  }

  return checks;
}

// 初始化配置管理
function initializeConfigManager() {
  try {
    console.log('🔧 [Docker Startup] 初始化配置管理...');

    // 调用专门的配置初始化脚本
    const { execSync } = require('child_process');
    try {
      execSync('node /app/scripts/docker-init-config.js', { stdio: 'inherit' });
      console.log('✅ [Docker Startup] 配置初始化脚本执行完成');
    } catch (error) {
      console.error('❌ [Docker Startup] 配置初始化脚本执行失败:', error.message);
    }

    // 检查是否存在旧的配置需要迁移
    const oldConfigPath = '/app/data/app-config.json';
    const newConfigPath = '/app/data/server-config.json';

    // 如果存在旧配置但没有新配置，进行迁移
    if (fs.existsSync(oldConfigPath) && !fs.existsSync(newConfigPath)) {
      console.log('🔄 [Docker Startup] 检测到旧配置，开始迁移...');

      try {
        const oldConfig = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));
        const newConfig = {
          version: '1.0.0',
          lastUpdated: Date.now(),
          siliconFlowThumbnailModel: 'Qwen/Qwen2.5-VL-32B-Instruct',
          modelScopeEpisodeModel: 'qwen-plus',
          ...oldConfig
        };

        fs.writeFileSync(newConfigPath, JSON.stringify(newConfig, null, 2));
        console.log('✅ [Docker Startup] 配置迁移完成');

        // 备份旧配置
        fs.copyFileSync(oldConfigPath, `${oldConfigPath}.backup`);
        console.log('📦 [Docker Startup] 旧配置已备份');
      } catch (error) {
        console.error('❌ [Docker Startup] 配置迁移失败:', error.message);
      }
    }

    // 检查环境变量中的API密钥
    const serverConfigPath = '/app/data/server-config.json';
    if (process.env.TMDB_API_KEY && fs.existsSync(serverConfigPath)) {
      console.log('🔑 [Docker Startup] 检测到环境变量中的TMDB_API_KEY');

      try {
        const config = JSON.parse(fs.readFileSync(serverConfigPath, 'utf8'));
        if (!config.tmdbApiKey) {
          config.tmdbApiKey = process.env.TMDB_API_KEY;
          config.lastUpdated = Date.now();
          fs.writeFileSync(serverConfigPath, JSON.stringify(config, null, 2));
          console.log('✅ [Docker Startup] 已将环境变量中的API密钥保存到配置文件');
        }
      } catch (error) {
        console.error('❌ [Docker Startup] 保存环境变量API密钥失败:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ [Docker Startup] 初始化配置管理失败:', error.message);
  }
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始Docker环境初始化...');

    // 1. 检测Docker环境
    const isDocker = detectDockerEnvironment();
    
    if (!isDocker) {
      console.log('ℹ️ 非Docker环境，跳过Docker特定配置');
      return;
    }

    // 2. 设置环境变量
    setupEnvironment();

    // 3. 创建必要目录
    ensureDirectories();

    // 4. 初始化配置管理
    initializeConfigManager();

    // 5. 检查权限
    checkPermissions();

    // 6. 生成配置报告
    generateConfigReport();

    // 7. 运行健康检查
    healthCheck();

    console.log('🎉 Docker环境初始化完成!');
    console.log('📝 启动日志已记录到 /app/logs/docker-startup-report.json');

  } catch (error) {
    console.error('💥 Docker环境初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('💥 启动脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  detectDockerEnvironment,
  ensureDirectories,
  checkPermissions,
  setupEnvironment,
  initializeConfigManager,
  generateConfigReport,
  healthCheck,
  main
};