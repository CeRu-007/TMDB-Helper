#!/usr/bin/env node

/**
 * Docker修复验证脚本
 * 验证所有相关文件是否存在且配置正确
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'lib/docker-config-manager.ts',
  'lib/config-adapter.ts',
  'app/api/docker-config/route.ts',
  'scripts/docker-startup.js',
  'scripts/test-all-configs.js',
  'scripts/test-settings-navigation.js',
  'docs/docker-config-fix.md'
];

const modifiedFiles = [
  'lib/secure-config-manager.ts',
  'components/settings-dialog.tsx'
];

function checkFileExists(filePath) {
  const exists = fs.existsSync(filePath);
  
  return exists;
}

function checkFileContains(filePath, searchText) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contains = content.includes(searchText);
    
    return contains;
  } catch (error) {
    
    return false;
  }
}

const newFilesOk = requiredFiles.every(checkFileExists);

const modifiedFilesOk = modifiedFiles.every(checkFileExists);

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

console.log(`功能检查: ${functionalChecks.every(Boolean) ? '✅ 通过' : '❌ 失败'}`);

if (allChecksPass) {

}

process.exit(allChecksPass ? 0 : 1);