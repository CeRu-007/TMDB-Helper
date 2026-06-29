#!/usr/bin/env node

const { execSync } = require('child_process');
const os = require('os');
const { logger } = require('./logger');

logger.info('🚀 智能多平台构建脚本');
logger.info(`📱 当前平台: ${os.platform()}`);

// 根据当前平台确定可构建的目标
function getAvailableTargets() {
  const platform = os.platform();

  switch (platform) {
    case 'darwin': // macOS
      return ['--win', '--mac', '--linux'];
    case 'win32': // Windows
      return ['--win', '--linux'];
    case 'linux': // Linux
      return ['--win', '--linux'];
    default:
      logger.warn(`⚠️ 未知平台: ${platform}，尝试构建所有目标`);
      return ['--win', '--mac', '--linux'];
  }
}

// 获取命令行参数
const args = process.argv.slice(2);
const forceAll = args.includes('--force-all');
const targets = getAvailableTargets();

if (forceAll) {
  logger.info('🔧 强制构建所有平台 (可能会失败)');
  targets.push('--mac'); // 强制添加 macOS
}

logger.info(`🎯 将构建以下平台: ${targets.join(', ')}`);

// 构建命令
const buildCommand = [
  'node scripts/optimize-build.js',
  '&&',
  'cross-env ELECTRON_BUILD=true ELECTRON_MIRROR=https://github.com/electron/electron/releases/download/',
  'pnpm run build',
  '&&',
  'electron-builder',
  ...targets,
].join(' ');

logger.info(`📦 执行构建命令: ${buildCommand}`);

try {
  // 执行构建
  execSync(buildCommand, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  logger.info('✅ 构建完成！');
  logger.info('📁 查看构建结果: dist/ 目录');
} catch (error) {
  logger.error('❌ 构建失败:', error.message);

  // 如果是 macOS 构建失败，提供建议
  if (error.message.includes('macOS is supported only on macOS')) {
    logger.info('\n💡 解决方案:');
    logger.info('1. 使用 pnpm run electron:build:all (不包含macOS)');
    logger.info('2. 在 macOS 系统上运行构建');
    logger.info('3. 使用 GitHub Actions 等 CI/CD 服务');
  }

  process.exit(1);
}
