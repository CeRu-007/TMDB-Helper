#!/usr/bin/env node

/**
 * TMDB-Import 自动更新功能测试脚本
 * 用于测试 API 端点和功能完整性
 */

const https = require('https');
const http = require('http');

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
        'User-Agent': 'TMDB-Helper-Test/1.0'
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

// 测试用例
async function testVersionCheck() {
  log('\n=== 测试版本检查 ===', 'cyan');
  
  try {
    const response = await makeRequest('GET', `${API_ENDPOINT}?action=check`);
    
    if (response.status === 200 && response.data.success) {
      log('✓ 版本检查成功', 'green');
      
      const versionInfo = response.data.data;
      log(`远程版本: ${versionInfo.remote.commitSha.substring(0, 8)}`, 'blue');
      log(`提交日期: ${new Date(versionInfo.remote.commitDate).toLocaleString()}`, 'blue');
      log(`提交信息: ${versionInfo.remote.commitMessage}`, 'blue');
      
      if (versionInfo.local && versionInfo.local.exists) {
        log(`本地版本: ${versionInfo.local.commitSha?.substring(0, 8) || '未知'}`, 'blue');
        log(`需要更新: ${versionInfo.needsUpdate ? '是' : '否'}`, versionInfo.needsUpdate ? 'yellow' : 'green');
      } else {
        log('本地版本: 未安装', 'yellow');
      }
      
      return versionInfo;
    } else {
      log(`✗ 版本检查失败: ${response.data?.error || '未知错误'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ 版本检查异常: ${error.message}`, 'red');
    return null;
  }
}

async function testStatusCheck() {
  log('\n=== 测试状态检查 ===', 'cyan');
  
  try {
    const response = await makeRequest('GET', `${API_ENDPOINT}?action=status`);
    
    if (response.status === 200 && response.data.success) {
      log('✓ 状态检查成功', 'green');
      
      const status = response.data.data;
      log(`已安装: ${status.installed ? '是' : '否'}`, status.installed ? 'green' : 'yellow');
      log(`主模块: ${status.hasMainModule ? '存在' : '缺失'}`, status.hasMainModule ? 'green' : 'red');
      log(`配置文件: ${status.hasConfigFile ? '存在' : '不存在'}`, status.hasConfigFile ? 'green' : 'yellow');
      log(`安装路径: ${status.installPath}`, 'blue');
      log(`文件数量: ${status.fileCount}`, 'blue');
      
      return status;
    } else {
      log(`✗ 状态检查失败: ${response.data?.error || '未知错误'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ 状态检查异常: ${error.message}`, 'red');
    return null;
  }
}

async function testDownload() {
  log('\n=== 测试下载功能 ===', 'cyan');
  log('注意: 这将实际下载文件，请确认要继续...', 'yellow');
  
  // 简单的确认机制
  if (process.argv.includes('--skip-download')) {
    log('跳过下载测试 (使用 --skip-download 参数)', 'yellow');
    return null;
  }
  
  try {
    log('开始下载...', 'blue');
    const response = await makeRequest('POST', API_ENDPOINT, { action: 'download' });
    
    if (response.status === 200 && response.data.success) {
      log('✓ 下载成功', 'green');
      
      const result = response.data.data;
      log(`下载路径: ${result.downloadPath}`, 'blue');
      log(`提交信息: ${result.commitInfo.commitMessage}`, 'blue');
      log(`消息: ${result.message}`, 'blue');
      
      return result;
    } else {
      log(`✗ 下载失败: ${response.data?.error || '未知错误'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ 下载异常: ${error.message}`, 'red');
    return null;
  }
}

async function testInstall() {
  log('\n=== 测试安装功能 ===', 'cyan');
  log('注意: 这将实际安装文件，请确认要继续...', 'yellow');
  
  if (process.argv.includes('--skip-install')) {
    log('跳过安装测试 (使用 --skip-install 参数)', 'yellow');
    return null;
  }
  
  try {
    log('开始安装...', 'blue');
    const response = await makeRequest('POST', API_ENDPOINT, { action: 'install' });
    
    if (response.status === 200 && response.data.success) {
      log('✓ 安装成功', 'green');
      
      const result = response.data.data;
      log(`安装路径: ${result.installPath}`, 'blue');
      log(`提交信息: ${result.commitInfo.commitMessage}`, 'blue');
      log(`消息: ${result.message}`, 'blue');
      
      return result;
    } else {
      log(`✗ 安装失败: ${response.data?.error || '未知错误'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ 安装异常: ${error.message}`, 'red');
    return null;
  }
}

async function testInvalidAction() {
  log('\n=== 测试无效操作 ===', 'cyan');
  
  try {
    const response = await makeRequest('GET', `${API_ENDPOINT}?action=invalid`);
    
    if (response.status === 400 && !response.data.success) {
      log('✓ 无效操作正确返回错误', 'green');
      return true;
    } else {
      log('✗ 无效操作未正确处理', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ 测试无效操作异常: ${error.message}`, 'red');
    return false;
  }
}

// 主测试函数
async function runTests() {
  log('TMDB-Import 自动更新功能测试', 'magenta');
  log(`测试目标: ${BASE_URL}${API_ENDPOINT}`, 'blue');
  log('=' * 50, 'blue');
  
  const results = {
    versionCheck: false,
    statusCheck: false,
    download: false,
    install: false,
    invalidAction: false
  };
  
  // 基础功能测试
  const versionInfo = await testVersionCheck();
  results.versionCheck = versionInfo !== null;
  
  const statusInfo = await testStatusCheck();
  results.statusCheck = statusInfo !== null;
  
  const invalidActionResult = await testInvalidAction();
  results.invalidAction = invalidActionResult;
  
  // 可选的下载和安装测试
  if (!process.argv.includes('--basic-only')) {
    const downloadResult = await testDownload();
    results.download = downloadResult !== null;
    
    if (downloadResult) {
      const installResult = await testInstall();
      results.install = installResult !== null;
    }
  } else {
    log('\n跳过下载和安装测试 (使用 --basic-only 参数)', 'yellow');
  }
  
  // 测试结果汇总
  log('\n=== 测试结果汇总 ===', 'cyan');
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✓' : '✗';
    const color = passed ? 'green' : 'red';
    log(`${status} ${test}: ${passed ? '通过' : '失败'}`, color);
  });
  
  log(`\n总计: ${passedTests}/${totalTests} 测试通过`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    log('🎉 所有测试通过！', 'green');
    process.exit(0);
  } else {
    log('❌ 部分测试失败，请检查日志', 'red');
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  log('TMDB-Import 自动更新功能测试脚本', 'magenta');
  log('\n用法:');
  log('  node test-tmdb-import-updater.js [选项]');
  log('\n选项:');
  log('  --basic-only      只运行基础测试（版本检查、状态检查）');
  log('  --skip-download   跳过下载测试');
  log('  --skip-install    跳过安装测试');
  log('  --help           显示此帮助信息');
  log('\n示例:');
  log('  node test-tmdb-import-updater.js --basic-only');
  log('  node test-tmdb-import-updater.js --skip-download --skip-install');
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
