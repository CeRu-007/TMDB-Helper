#!/usr/bin/env node

/**
 * 依赖分析脚本
 * 检测未使用的依赖和可优化的包
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { logger } = require('./logger');

// 项目根目录
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const packageJsonPath = path.join(rootDir, 'package.json');

// 读取 package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const dependencies = Object.keys(packageJson.dependencies || {});

// 递归扫描目录获取所有文件
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.match(/\.(ts|tsx|js|jsx|json)$/)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// 从文件内容中提取 import 语句
function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];

  // 匹配各种 import 格式
  const importPatterns = [
    /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  importPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
  });

  return imports;
}

// 解析依赖名称（处理 @scope/package 格式）
function parsePackageName(importPath) {
  // 处理相对路径
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return null;
  }

  // 处理 @scope/package 格式
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  }

  // 处理普通包名
  const parts = importPath.split('/');
  return parts[0];
}

// 主分析函数
function analyzeDependencies() {
  logger.info('🔍 开始分析依赖...\n');

  const allFiles = getAllFiles(srcDir);
  const usedDependencies = new Set();

  // 扫描所有文件提取使用的依赖
  allFiles.forEach((file) => {
    const imports = extractImports(file);
    imports.forEach((importPath) => {
      const packageName = parsePackageName(importPath);
      if (packageName) {
        usedDependencies.add(packageName);
      }
    });
  });

  // 分析结果
  const unusedDependencies = [];
  const usedDependenciesList = [];

  dependencies.forEach((dep) => {
    if (usedDependencies.has(dep)) {
      usedDependenciesList.push(dep);
    } else {
      unusedDependencies.push(dep);
    }
  });

  // 输出结果
  logger.info('📊 依赖分析结果:\n');
  logger.info(`总计依赖: ${dependencies.length}`);
  logger.info(`已使用: ${usedDependenciesList.length}`);
  logger.info(`未使用: ${unusedDependencies.length}\n`);

  if (unusedDependencies.length > 0) {
    logger.warn('⚠️  可能未使用的依赖:');
    unusedDependencies.forEach((dep) => {
      const version = packageJson.dependencies[dep];
      logger.warn(`  - ${dep}@${version}`);
    });
    logger.info('\n注意: 请仔细检查这些包是否在配置文件或其他地方被使用，确认后再删除。\n');
  }

  if (unusedDependencies.length === 0) {
    logger.info('✅ 所有依赖都在使用中！\n');
  }

  // 输出依赖大小建议
  logger.info('💡 优化建议:\n');
  logger.info('1. 考虑使用 lighter 替代品:');
  logger.info('   - axios → fetch (原生) 或 ky');
  logger.info('   - moment.js → date-fns 或 dayjs');
  logger.info('   - lodash → 原生方法或 lodash-es (tree-shaking)\n');

  logger.info('2. 检查是否有重复功能的依赖\n');

  logger.info('3. 考虑按需导入大型库\n');

  return {
    total: dependencies.length,
    used: usedDependenciesList.length,
    unused: unusedDependencies.length,
    unusedDependencies,
    usedDependencies: usedDependenciesList,
  };
}

// 运行分析
try {
  const result = analyzeDependencies();
  process.exit(0);
} catch (error) {
  logger.error('❌ 分析失败:', error.message);
  process.exit(1);
}
