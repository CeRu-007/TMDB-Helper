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

    // 4. 检查权限
    checkPermissions();

    // 5. 生成配置报告
    generateConfigReport();

    // 6. 运行健康检查
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
  generateConfigReport,
  healthCheck,
  main
};