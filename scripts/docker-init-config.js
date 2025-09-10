#!/usr/bin/env node

/**
 * Docker环境配置初始化脚本
 * 确保配置目录存在并设置正确的权限
 */

const fs = require('fs');
const path = require('path');

// 配置目录列表
const CONFIG_DIRS = [
  '/app/data',
  '/app/logs',
  '/app/data/auth',
  '/app/data/users'
];

// 默认配置文件
const DEFAULT_CONFIG = {
  version: '1.0.0',
  lastUpdated: Date.now(),
  siliconFlowThumbnailModel: 'Qwen/Qwen2.5-VL-32B-Instruct',
  modelScopeEpisodeModel: 'Qwen/Qwen3-32B'
};

/**
 * 初始化配置目录
 */
function initConfigDirectories() {
  
  CONFIG_DIRS.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        
      } else {
        
      }
    } catch (error) {
      
    }
  });
}

/**
 * 初始化默认配置文件
 */
function initDefaultConfig() {
  const configPath = '/app/data/server-config.json';
  
  try {
    if (!fs.existsSync(configPath)) {
      
      // 从环境变量读取预设配置
      const envConfig = {
        ...DEFAULT_CONFIG,
        tmdbApiKey: process.env.TMDB_API_KEY || undefined,
        tmdbImportPath: process.env.TMDB_IMPORT_PATH || undefined,
        siliconFlowApiKey: process.env.SILICONFLOW_API_KEY || undefined,
        modelScopeApiKey: process.env.MODELSCOPE_API_KEY || undefined
      };
      
      // 移除undefined值
      Object.keys(envConfig).forEach(key => {
        if (envConfig[key] === undefined) {
          delete envConfig[key];
        }
      });
      
      fs.writeFileSync(configPath, JSON.stringify(envConfig, null, 2));
      
      // 显示配置摘要
      const configKeys = Object.keys(envConfig).filter(key => !['version', 'lastUpdated'].includes(key));
      if (configKeys.length > 0) {
        console.log('📋 [Docker Init] 预设配置项:', configKeys.join(', '));
      }
    } else {
      
      // 验证配置文件格式
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`✅ [Docker Init] 配置文件格式正确，包含 ${Object.keys(config).length} 个配置项`);
      } catch (parseError) {
        
        fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
        
      }
    }
  } catch (error) {
    
  }
}

/**
 * 检查和修复文件权限
 */
function checkFilePermissions() {
  
  try {
    // 检查关键文件的权限
    const configPath = '/app/data/server-config.json';
    if (fs.existsSync(configPath)) {
      const stats = fs.statSync(configPath);
      console.log(`📊 [Docker Init] 配置文件权限: ${stats.mode.toString(8)}`);
    }
    
    // 检查目录权限
    CONFIG_DIRS.forEach(dir => {
      if (fs.existsSync(dir)) {
        const stats = fs.statSync(dir);
        console.log(`📊 [Docker Init] 目录权限 ${dir}: ${stats.mode.toString(8)}`);
      }
    });

  } catch (error) {
    
  }
}

/**
 * 显示环境信息
 */
function showEnvironmentInfo() {

  console.log(`   - 工作目录: ${process.cwd()}`);
  console.log(`   - 用户ID: ${process.getuid ? process.getuid() : 'N/A'}`);
  console.log(`   - 组ID: ${process.getgid ? process.getgid() : 'N/A'}`);

}

/**
 * 主函数
 */
function main() {
  
  try {
    showEnvironmentInfo();
    initConfigDirectories();
    initDefaultConfig();
    checkFilePermissions();

  } catch (error) {
    
    process.exit(1);
  }
}

// 只在Docker环境中运行
if (process.env.DOCKER_CONTAINER === 'true') {
  main();
} else {
  
}
