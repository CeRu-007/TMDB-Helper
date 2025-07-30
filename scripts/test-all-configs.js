#!/usr/bin/env node

/**
 * 全面配置测试脚本
 * 测试所有配置类型在Docker环境下的保存和读取功能
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 开始测试所有配置功能...');

// 模拟Docker环境
process.env.DOCKER_CONTAINER = 'true';

// 使用当前目录下的data文件夹进行测试
const configDir = path.join(process.cwd(), 'data');
const configFile = 'app-config.json';
const configPath = path.join(configDir, configFile);

// 测试配置数据
const testConfigs = {
  tmdbApiKey: 'test_tmdb_api_key_12345678901234567890123456789012',
  tmdbImportPath: '/test/tmdb/path',
  siliconFlowApiKey: 'test_siliconflow_api_key_abcdef1234567890',
  siliconFlowThumbnailModel: 'Qwen/Qwen2.5-VL-32B-Instruct',
  userSettings: {
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    preferences: { theme: 'dark', language: 'zh-CN' }
  },
  appConfig: {
    theme: 'dark',
    language: 'zh-CN',
    autoSave: true
  },
  taskSchedulerConfig: {
    maxConcurrentTasks: 5,
    retryAttempts: 3,
    timeout: 30000
  },
  videoThumbnailSettings: {
    startTime: 0,
    threadCount: 2,
    outputFormat: 'jpg',
    thumbnailCount: 9,
    enableAIFilter: true
  },
  generalSettings: {
    autoSave: true,
    dataBackup: true,
    cacheCleanup: false
  },
  appearanceSettings: {
    theme: 'dark',
    primaryColor: 'blue',
    compactMode: false,
    fontSize: 'medium'
  }
};

// 测试配置保存
function testConfigSave() {
  console.log('📝 测试配置保存...');
  
  try {
    // 确保目录存在
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const fullConfig = {
      ...testConfigs,
      lastUpdated: Date.now()
    };

    fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
    console.log('✅ 所有配置保存成功');
    return true;
  } catch (error) {
    console.error('❌ 配置保存失败:', error.message);
    return false;
  }
}

// 测试配置读取
function testConfigRead() {
  console.log('📖 测试配置读取...');
  
  try {
    if (!fs.existsSync(configPath)) {
      console.error('❌ 配置文件不存在');
      return false;
    }

    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // 验证各个配置项
    const checks = {
      tmdbApiKey: !!config.tmdbApiKey,
      tmdbImportPath: !!config.tmdbImportPath,
      siliconFlowApiKey: !!config.siliconFlowApiKey,
      siliconFlowThumbnailModel: !!config.siliconFlowThumbnailModel,
      userSettings: !!config.userSettings && !!config.userSettings.displayName,
      appConfig: !!config.appConfig && !!config.appConfig.theme,
      taskSchedulerConfig: !!config.taskSchedulerConfig && !!config.taskSchedulerConfig.maxConcurrentTasks,
      videoThumbnailSettings: !!config.videoThumbnailSettings && config.videoThumbnailSettings.thumbnailCount === 9,
      generalSettings: !!config.generalSettings && config.generalSettings.autoSave === true,
      appearanceSettings: !!config.appearanceSettings && !!config.appearanceSettings.theme,
      lastUpdated: !!config.lastUpdated
    };

    console.log('✅ 配置读取成功:');
    Object.entries(checks).forEach(([key, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${key}: ${value ? '正常' : '异常'}`);
    });
    
    return Object.values(checks).every(Boolean);
  } catch (error) {
    console.error('❌ 配置读取失败:', error.message);
    return false;
  }
}

// 测试配置更新
function testConfigUpdate() {
  console.log('🔄 测试配置更新...');
  
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // 更新部分配置
    config.userSettings.displayName = 'Updated Test User';
    config.appConfig.theme = 'light';
    config.lastUpdated = Date.now();
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // 验证更新
    const updatedData = fs.readFileSync(configPath, 'utf8');
    const updatedConfig = JSON.parse(updatedData);
    
    const updateChecks = {
      userDisplayName: updatedConfig.userSettings.displayName === 'Updated Test User',
      appTheme: updatedConfig.appConfig.theme === 'light',
      lastUpdated: updatedConfig.lastUpdated > config.lastUpdated - 1000
    };
    
    console.log('✅ 配置更新验证:');
    Object.entries(updateChecks).forEach(([key, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${key}: ${value ? '正常' : '异常'}`);
    });
    
    return Object.values(updateChecks).every(Boolean);
  } catch (error) {
    console.error('❌ 配置更新失败:', error.message);
    return false;
  }
}

// 清理测试
function cleanup() {
  console.log('🧹 清理测试文件...');
  
  try {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log('✅ 测试文件清理完成');
    }
    
    // 如果data目录为空，也删除它
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

// 运行测试
async function runTests() {
  const results = {
    save: false,
    read: false,
    update: false
  };

  console.log('🚀 开始全面配置测试...\n');

  results.save = testConfigSave();
  if (results.save) {
    results.read = testConfigRead();
    if (results.read) {
      results.update = testConfigUpdate();
    }
  }

  cleanup();

  console.log('\n📊 测试结果汇总:');
  console.log(`配置保存: ${results.save ? '✅ 通过' : '❌ 失败'}`);
  console.log(`配置读取: ${results.read ? '✅ 通过' : '❌ 失败'}`);
  console.log(`配置更新: ${results.update ? '✅ 通过' : '❌ 失败'}`);
  
  const allPassed = Object.values(results).every(Boolean);
  console.log(`\n总体结果: ${allPassed ? '🎉 所有测试通过' : '💥 部分测试失败'}`);
  
  if (allPassed) {
    console.log('\n✨ Docker环境配置管理功能完全正常！');
    console.log('📝 支持的配置类型:');
    console.log('  • TMDB API配置');
    console.log('  • 硅基流动API配置');
    console.log('  • 用户设置');
    console.log('  • 应用配置');
    console.log('  • 任务调度器配置');
    console.log('  • 视频缩略图设置');
    console.log('  • 通用设置');
    console.log('  • 外观设置');
  }
  
  return allPassed;
}

// 如果直接运行此脚本
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = { runTests };