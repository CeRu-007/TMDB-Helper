#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 开始测试Docker配置功能...');

// 模拟Docker环境
process.env.DOCKER_CONTAINER = 'true';

// 使用当前目录下的data文件夹进行测试
const configDir = path.join(process.cwd(), 'data');
const configFile = 'app-config.json';
const configPath = path.join(configDir, configFile);

function testConfigSave() {
  console.log('📝 测试配置保存...');
  
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const testConfig = {
      tmdbApiKey: 'test_api_key_12345678901234567890123456789012',
      tmdbImportPath: '/test/path',
      lastUpdated: Date.now()
    };

    fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
    console.log('✅ 配置保存成功');
    return true;
  } catch (error) {
    console.error('❌ 配置保存失败:', error.message);
    return false;
  }
}

function testConfigRead() {
  console.log('📖 测试配置读取...');
  
  try {
    if (!fs.existsSync(configPath)) {
      console.error('❌ 配置文件不存在');
      return false;
    }

    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    console.log('✅ 配置读取成功:', {
      hasApiKey: !!config.tmdbApiKey,
      hasImportPath: !!config.tmdbImportPath,
      lastUpdated: new Date(config.lastUpdated).toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('❌ 配置读取失败:', error.message);
    return false;
  }
}function
 cleanup() {
  console.log('🧹 清理测试文件...');
  
  try {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log('✅ 测试文件清理完成');
    }
    
    if (fs.existsSync(configDir)) {
      const files = fs.readdirSync(configDir);
      if (files.length === 0) {
        fs.rmdirSync(configDir);
        console.log('✅ 测试目录清理完成');
      }
    }
  } catch (error) {
    console.error('❌ 清理失败:', error.message);
  }
}

async function runTests() {
  const results = {
    save: false,
    read: false
  };

  results.save = testConfigSave();
  if (results.save) {
    results.read = testConfigRead();
  }

  cleanup();

  console.log('\n📊 测试结果:');
  console.log(`保存测试: ${results.save ? '✅ 通过' : '❌ 失败'}`);
  console.log(`读取测试: ${results.read ? '✅ 通过' : '❌ 失败'}`);
  
  const allPassed = Object.values(results).every(Boolean);
  console.log(`\n总体结果: ${allPassed ? '🎉 所有测试通过' : '💥 部分测试失败'}`);
  
  return allPassed;
}

if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = { runTests };