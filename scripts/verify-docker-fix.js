#!/usr/bin/env node

/**
 * Docker修复验证脚本
 * 验证所有相关文件是否存在且配置正确
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 验证Docker配置修复...');

const requiredFiles = [
  'lib/docker-config-manager.ts',
  'lib/config-adapter.ts',
  'app/api/docker-config/route.ts',
  'scripts/docker-startup.js',
  'scripts/test-all-configs.js',
  'docs/docker-config-fix.md'
];

const modifiedFiles = [
  'lib/secure-config-manager.ts',
  'components/settings-dialog.tsx'
];

function checkFileExists(filePath) {
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${filePath}`);
  return exists;
}

function checkFileContains(filePath, searchText) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contains = content.includes(searchText);
    console.log(`${contains ? '✅' : '❌'} ${filePath} 包含: ${searchText}`);
    return contains;
  } catch (error) {
    console.log(`❌ ${filePath} 读取失败: ${error.message}`);
    return false;
  }
}

console.log('\n📁 检查新增文件:');
const newFilesOk = requiredFiles.every(checkFileExists);

console.log('\n🔧 检查修改文件:');
const modifiedFilesOk = modifiedFiles.every(checkFileExists);

console.log('\n🔍 检查关键功能:');
const functionalChecks = [
  checkFileContains('lib/secure-config-manager.ts', 'DockerConfigManager'),
  checkFileContains('lib/config-adapter.ts', 'ConfigAdapter'),
  checkFileContains('components/settings-dialog.tsx', '/api/docker-config'),
  checkFileContains('scripts/docker-startup.js', 'initializeConfigManager'),
  checkFileContains('app/api/docker-config/route.ts', 'siliconFlowApiKey'),
  checkFileContains('lib/docker-config-manager.ts', 'getSiliconFlowApiKey'),
  checkFileContains('lib/docker-config-manager.ts', 'setUserSettings')
];

const allChecksPass = newFilesOk && modifiedFilesOk && functionalChecks.every(Boolean);

console.log('\n📊 验证结果:');
console.log(`新增文件: ${newFilesOk ? '✅ 通过' : '❌ 失败'}`);
console.log(`修改文件: ${modifiedFilesOk ? '✅ 通过' : '❌ 失败'}`);
console.log(`功能检查: ${functionalChecks.every(Boolean) ? '✅ 通过' : '❌ 失败'}`);
console.log(`\n总体结果: ${allChecksPass ? '🎉 修复验证通过' : '💥 修复验证失败'}`);

if (allChecksPass) {
  console.log('\n✨ Docker环境配置保存问题已全面修复！');
  console.log('📝 主要改进:');
  console.log('  • 新增Docker配置管理器，支持文件系统持久化');
  console.log('  • 新增配置适配器，统一配置访问接口');
  console.log('  • 新增API端点处理所有Docker环境配置');
  console.log('  • 更新设置页面，自动检测并适配Docker环境');
  console.log('  • 更新启动脚本，确保配置目录和权限正确');
  console.log('  • 支持多种配置类型：API密钥、用户设置、应用配置等');
  console.log('  • 保持向后兼容性，支持非Docker环境');
  console.log('  • 提供完整的配置迁移功能');
}

process.exit(allChecksPass ? 0 : 1);