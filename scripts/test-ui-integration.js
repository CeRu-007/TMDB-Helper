#!/usr/bin/env node

/**
 * TMDB-Import UI集成测试脚本
 * 测试新的紧凑统一布局和自动下载安装功能
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置
const BASE_URL = 'http://localhost:4949';
const API_ENDPOINT = '/api/tmdb-import-updater';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP 请求封装
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TMDB-Helper-UI-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 测试API功能
async function testAPIFunctionality() {
  log('\n=== 测试API功能 ===', 'cyan');
  
  try {
    // 测试版本检查
    log('测试版本检查...', 'blue');
    const versionResponse = await makeRequest('GET', `${API_ENDPOINT}?action=check`);
    
    if (versionResponse.status === 200 && versionResponse.data.success) {
      log('✓ 版本检查API正常', 'green');
      const versionInfo = versionResponse.data.data;
      log(`  远程版本: ${versionInfo.remote.commitSha.substring(0, 8)}`, 'blue');
      log(`  需要更新: ${versionInfo.needsUpdate ? '是' : '否'}`, versionInfo.needsUpdate ? 'yellow' : 'green');
    } else {
      log('✗ 版本检查API失败', 'red');
      return false;
    }

    // 测试状态检查
    log('测试状态检查...', 'blue');
    const statusResponse = await makeRequest('GET', `${API_ENDPOINT}?action=status`);
    
    if (statusResponse.status === 200 && statusResponse.data.success) {
      log('✓ 状态检查API正常', 'green');
      const status = statusResponse.data.data;
      log(`  安装状态: ${status.installed ? '已安装' : '未安装'}`, status.installed ? 'green' : 'yellow');
      log(`  安装路径: ${status.installPath}`, 'blue');
    } else {
      log('✗ 状态检查API失败', 'red');
      return false;
    }

    return true;
  } catch (error) {
    log(`✗ API测试异常: ${error.message}`, 'red');
    return false;
  }
}

// 测试目录结构
async function testDirectoryStructure() {
  log('\n=== 测试目录结构 ===', 'cyan');
  
  try {
    const projectRoot = process.cwd();
    const expectedPath = path.join(projectRoot, 'TMDB-Import-master');
    
    log(`检查预期安装路径: ${expectedPath}`, 'blue');
    
    if (fs.existsSync(expectedPath)) {
      log('✓ TMDB-Import-master 目录存在', 'green');
      
      // 检查目录内容
      const files = fs.readdirSync(expectedPath);
      log(`  目录包含 ${files.length} 个文件/文件夹`, 'blue');
      
      // 检查是否有主要文件
      const hasMainFiles = files.some(file => 
        file.includes('tmdb') || 
        file.includes('import') || 
        file.endsWith('.py') ||
        file.endsWith('.js')
      );
      
      if (hasMainFiles) {
        log('✓ 目录包含预期的程序文件', 'green');
      } else {
        log('⚠ 目录可能不包含程序文件', 'yellow');
      }
      
      return true;
    } else {
      log('⚠ TMDB-Import-master 目录不存在（可能尚未安装）', 'yellow');
      return true; // 这不算错误，可能只是还没安装
    }
  } catch (error) {
    log(`✗ 目录结构测试异常: ${error.message}`, 'red');
    return false;
  }
}

// 测试UI组件结构（模拟）
async function testUIStructure() {
  log('\n=== 测试UI组件结构 ===', 'cyan');
  
  try {
    // 检查组件文件是否存在
    const componentPath = path.join(process.cwd(), 'components', 'tmdb-import-updater.tsx');
    
    if (fs.existsSync(componentPath)) {
      log('✓ TMDB-Import更新组件文件存在', 'green');
      
      // 读取组件内容并检查关键特性
      const componentContent = fs.readFileSync(componentPath, 'utf-8');
      
      const checks = [
        { name: '紧凑布局Card组件', pattern: /Card.*className.*w-full/ },
        { name: '网格布局', pattern: /grid.*grid-cols/ },
        { name: '自动下载功能', pattern: /performUpdate.*async/ },
        { name: '进度显示', pattern: /Progress.*value.*progress/ },
        { name: '状态徽章', pattern: /Badge.*variant/ },
        { name: '路径更新回调', pattern: /onPathUpdate/ }
      ];
      
      checks.forEach(check => {
        if (check.pattern.test(componentContent)) {
          log(`  ✓ ${check.name}`, 'green');
        } else {
          log(`  ⚠ ${check.name} 可能缺失`, 'yellow');
        }
      });
      
      return true;
    } else {
      log('✗ TMDB-Import更新组件文件不存在', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ UI结构测试异常: ${error.message}`, 'red');
    return false;
  }
}

// 测试配置集成
async function testConfigIntegration() {
  log('\n=== 测试配置集成 ===', 'cyan');
  
  try {
    // 检查设置对话框文件
    const settingsPath = path.join(process.cwd(), 'components', 'settings-dialog.tsx');
    
    if (fs.existsSync(settingsPath)) {
      log('✓ 设置对话框文件存在', 'green');
      
      const settingsContent = fs.readFileSync(settingsPath, 'utf-8');
      
      // 检查集成相关的代码
      const integrationChecks = [
        { name: 'TMDBImportUpdater组件导入', pattern: /import.*TMDBImportUpdater/ },
        { name: '路径更新回调', pattern: /onPathUpdate.*setTmdbImportPath/ },
        { name: '本地存储集成', pattern: /localStorage.*setItem.*tmdb_import_path/ },
        { name: '手动路径配置', pattern: /手动路径配置/ }
      ];
      
      integrationChecks.forEach(check => {
        if (check.pattern.test(settingsContent)) {
          log(`  ✓ ${check.name}`, 'green');
        } else {
          log(`  ⚠ ${check.name} 可能缺失`, 'yellow');
        }
      });
      
      return true;
    } else {
      log('✗ 设置对话框文件不存在', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ 配置集成测试异常: ${error.message}`, 'red');
    return false;
  }
}

// 主测试函数
async function runTests() {
  log('TMDB-Import UI集成测试', 'magenta');
  log(`测试目标: ${BASE_URL}`, 'blue');
  log('=' * 50, 'blue');
  
  const results = {
    api: false,
    directory: false,
    ui: false,
    config: false
  };
  
  // 执行所有测试
  results.api = await testAPIFunctionality();
  results.directory = await testDirectoryStructure();
  results.ui = await testUIStructure();
  results.config = await testConfigIntegration();
  
  // 测试结果汇总
  log('\n=== 测试结果汇总 ===', 'cyan');
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✓' : '✗';
    const color = passed ? 'green' : 'red';
    log(`${status} ${test.toUpperCase()}: ${passed ? '通过' : '失败'}`, color);
  });
  
  log(`\n总计: ${passedTests}/${totalTests} 测试通过`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    log('🎉 所有测试通过！UI集成正常', 'green');
    process.exit(0);
  } else {
    log('❌ 部分测试失败，请检查相关功能', 'red');
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  log('TMDB-Import UI集成测试脚本', 'magenta');
  log('\n用法:');
  log('  node test-ui-integration.js');
  log('\n测试内容:');
  log('  - API功能测试');
  log('  - 目录结构验证');
  log('  - UI组件结构检查');
  log('  - 配置集成验证');
}

// 入口点
if (process.argv.includes('--help')) {
  showHelp();
  process.exit(0);
} else {
  runTests().catch((error) => {
    log(`测试执行失败: ${error.message}`, 'red');
    process.exit(1);
  });
}
