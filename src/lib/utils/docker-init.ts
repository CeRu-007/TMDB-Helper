/**
 * Docker环境初始化脚本
 * 确保所有优化功能在Docker容器中正确初始化
 */

import { initializeDockerAdapter } from './docker-storage-adapter';
import { enhancedStorageManager } from './enhanced-storage-manager';
import { networkOptimizer } from './network-optimizer';
import { logger } from './logger';

interface DockerInitResult {
  success: boolean;
  environment: 'docker' | 'local';
  features: {
    indexedDB: boolean;
    localStorage: boolean;
    fileSystem: boolean;
    networkOptimization: boolean;
  };
  warnings: string[];
  errors: string[];
}

/**
 * 初始化Docker环境中的所有优化功能
 */
export async function initializeDockerOptimizations(): Promise<DockerInitResult> {
  const result: DockerInitResult = {
    success: false,
    environment: 'local',
    features: {
      indexedDB: false,
      localStorage: false,
      fileSystem: false,
      networkOptimization: false,
    },
    warnings: [],
    errors: [],
  };

  try {
    logger.info('🐳 开始初始化Docker优化功能...');

    // 1. 初始化Docker适配器
    try {
      await initializeDockerAdapter();
      const env = (await import('./docker-storage-adapter')).dockerStorageAdapter.getEnvironment();
      result.environment = env.isDocker ? 'docker' : 'local';
      result.features.fileSystem = env.hasWritePermission;

      logger.info(`✅ Docker适配器初始化完成 - 环境: ${result.environment}`);
    } catch (error) {
      result.errors.push(`Docker适配器初始化失败: ${error}`);
      logger.error('❌ Docker适配器初始化失败:', error);
    }

    // 2. 检查浏览器存储功能
    if (typeof window !== 'undefined') {
      // IndexedDB检查
      try {
        if ('indexedDB' in window) {
          // 尝试打开一个测试数据库
          const testDB = indexedDB.open('__docker_test__', 1);
          await new Promise((resolve, reject) => {
            testDB.onsuccess = () => {
              testDB.result.close();
              indexedDB.deleteDatabase('__docker_test__');
              resolve(true);
            };
            testDB.onerror = () => reject(testDB.error);
            testDB.onblocked = () => reject(new Error('IndexedDB被阻塞'));
          });
          result.features.indexedDB = true;
          logger.info('✅ IndexedDB可用');
        } else {
          result.warnings.push('IndexedDB不可用');
          logger.warn('⚠️ IndexedDB不可用');
        }
      } catch (error) {
        result.warnings.push(`IndexedDB测试失败: ${error}`);
        logger.warn('⚠️ IndexedDB测试失败:', error);
      }

      // localStorage检查
      try {
        const testKey = '__docker_storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        result.features.localStorage = true;
        logger.info('✅ localStorage可用');
      } catch (error) {
        result.errors.push(`localStorage不可用: ${error}`);
        logger.error('❌ localStorage不可用:', error);
      }
    }

    // 3. 初始化增强存储管理器
    try {
      const storageManager = enhancedStorageManager;
      const health = await storageManager.getHealthStatus();

      if (health.status === 'error') {
        result.errors.push(`存储管理器健康检查失败: ${health.details.lastError}`);
        logger.error('❌ 存储管理器健康检查失败:', health.details);
      } else {
        logger.info('✅ 增强存储管理器初始化完成');
        if (health.status === 'warning') {
          result.warnings.push('存储管理器有警告，但可以正常工作');
        }
      }
    } catch (error) {
      result.errors.push(`增强存储管理器初始化失败: ${error}`);
      logger.error('❌ 增强存储管理器初始化失败:', error);
    }

    // 4. 初始化网络优化器
    try {
      const stats = networkOptimizer.getPerformanceStats();
      result.features.networkOptimization = true;
      logger.info('✅ 网络优化器初始化完成');
    } catch (error) {
      result.errors.push(`网络优化器初始化失败: ${error}`);
      logger.error('❌ 网络优化器初始化失败:', error);
    }

    // 5. Docker特定的优化配置
    if (result.environment === 'docker') {
      try {
        await applyDockerOptimizations();
        logger.info('✅ Docker特定优化配置已应用');
      } catch (error) {
        result.warnings.push(`Docker优化配置失败: ${error}`);
        logger.warn('⚠️ Docker优化配置失败:', error);
      }
    }

    // 6. 运行健康检查
    try {
      const healthResults = await runHealthChecks();
      if (healthResults.critical.length > 0) {
        result.errors.push(...healthResults.critical);
      }
      if (healthResults.warnings.length > 0) {
        result.warnings.push(...healthResults.warnings);
      }
      logger.info('✅ 健康检查完成');
    } catch (error) {
      result.warnings.push(`健康检查失败: ${error}`);
      logger.warn('⚠️ 健康检查失败:', error);
    }

    // 判断初始化是否成功
    result.success =
      result.errors.length === 0 &&
      (result.features.localStorage || result.features.indexedDB || result.features.fileSystem);

    if (result.success) {
      logger.info('🎉 Docker优化功能初始化成功!');
      logger.info(
        '📊 可用功能:',
        Object.entries(result.features)
          .filter(([_, enabled]) => enabled)
          .map(([feature, _]) => feature)
          .join(', ')
      );
    } else {
      logger.error('💥 Docker优化功能初始化失败');
      logger.error('❌ 错误:', result.errors);
    }

    if (result.warnings.length > 0) {
      logger.warn('⚠️ 警告:', result.warnings);
    }

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`初始化过程中发生未知错误: ${error}`);
    logger.error('💥 Docker优化功能初始化过程中发生未知错误:', error);
    return result;
  }
}

/**
 * 应用Docker特定的优化配置
 */
async function applyDockerOptimizations(): Promise<void> {
  const { dockerStorageAdapter } = await import('./docker-storage-adapter');
  const networkConfig = dockerStorageAdapter.getNetworkConfig();
  const storageConfig = dockerStorageAdapter.getStorageConfig();

  // 应用内存限制
  if (typeof window !== 'undefined') {
    // 限制内存缓存大小
    const maxMemoryUsage = storageConfig.maxCacheSize;
    logger.debug(`🐳 Docker环境: 设置最大内存缓存为 ${Math.round(maxMemoryUsage / 1024 / 1024)}MB`);
  }

  // 应用网络配置
  logger.debug(
    `🐳 Docker环境: 网络配置 - 最大并发: ${networkConfig.maxConcurrentRequests}, 超时: ${networkConfig.requestTimeout}ms`
  );

  // 设置环境变量（如果在Node.js环境中）
  if (typeof process !== 'undefined' && process.env) {
    process.env.DOCKER_OPTIMIZED = 'true';
    process.env.MAX_CONCURRENT_REQUESTS = networkConfig.maxConcurrentRequests.toString();
    process.env.REQUEST_TIMEOUT = networkConfig.requestTimeout.toString();
  }
}

/**
 * 运行健康检查
 */
async function runHealthChecks(): Promise<{
  critical: string[];
  warnings: string[];
  info: string[];
}> {
  const results = {
    critical: [] as string[],
    warnings: [] as string[],
    info: [] as string[],
  };

  // 检查存储可用性
  if (typeof window !== 'undefined') {
    if (!('localStorage' in window)) {
      results.critical.push('localStorage不可用，应用可能无法正常工作');
    }

    if (!('indexedDB' in window)) {
      results.warnings.push('IndexedDB不可用，将使用localStorage作为后备');
    }
  }

  // 检查网络连接
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && 'onLine' in navigator) {
      if (!navigator.onLine) {
        results.warnings.push('网络连接不可用，某些功能可能受限');
      }
    }
  } catch (error) {
    results.info.push('无法检测网络状态');
  }

  // 检查Docker环境特定问题
  const { dockerStorageAdapter } = await import('./docker-storage-adapter');
  const env = dockerStorageAdapter.getEnvironment();

  if (env.isDocker) {
    if (!env.hasWritePermission) {
      results.critical.push('Docker容器没有文件写入权限，请检查卷挂载配置');
    }

    results.info.push(`Docker环境检测: 数据路径=${env.dataPath}, 日志路径=${env.logPath}`);
  }

  return results;
}

/**
 * 获取Docker环境的配置建议
 */
export function getDockerConfigurationAdvice(): {
  dockerfile: string[];
  dockerCompose: string[];
  environment: string[];
  volumes: string[];
} {
  return {
    dockerfile: [
      '# 确保容器有足够的内存',
      'ENV NODE_OPTIONS="--max-old-space-size=1024"',
      '',
      '# 创建数据目录并设置权限',
      'RUN mkdir -p /app/data /app/logs && \\',
      '    chown -R nextjs:nodejs /app/data /app/logs',
      '',
      '# 设置Docker环境标识',
      'ENV DOCKER_CONTAINER=true',
    ],
    dockerCompose: [
      'services:',
      '  tmdb-helper:',
      '    deploy:',
      '      resources:',
      '        limits:',
      '          memory: 1G  # 确保足够内存',
      '          cpus: "0.5"',
      '        reservations:',
      '          memory: 512M',
      '          cpus: "0.25"',
    ],
    environment: [
      'DOCKER_CONTAINER=true',
      'NODE_OPTIONS=--max-old-space-size=1024',
      'NEXT_TELEMETRY_DISABLED=1',
    ],
    volumes: ['tmdb_data:/app/data  # 持久化数据存储', 'tmdb_logs:/app/logs  # 持久化日志存储'],
  };
}

/**
 * 导出Docker环境诊断信息
 */
export async function exportDockerDiagnostics(): Promise<string> {
  const initResult = await initializeDockerOptimizations();
  const { dockerStorageAdapter } = await import('./docker-storage-adapter');
  const env = dockerStorageAdapter.getEnvironment();
  const health = await dockerStorageAdapter.checkStorageHealth();
  const recommendations = dockerStorageAdapter.getConfigurationRecommendations();

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: env,
    initializationResult: initResult,
    storageHealth: health,
    recommendations,
    systemInfo: {
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
      platform: typeof window !== 'undefined' ? window.navigator.platform : process.platform,
      language: typeof window !== 'undefined' ? window.navigator.language : 'N/A',
      cookieEnabled: typeof window !== 'undefined' ? window.navigator.cookieEnabled : 'N/A',
    },
  };

  return JSON.stringify(diagnostics, null, 2);
}

// 自动初始化（仅在浏览器环境中）
if (typeof window !== 'undefined') {
  // 等待DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeDockerOptimizations().catch((error) => {
        logger.error('自动初始化Docker优化功能失败:', error);
      });
    });
  } else {
    // DOM已经加载完成，立即初始化
    setTimeout(() => {
      initializeDockerOptimizations().catch((error) => {
        logger.error('自动初始化Docker优化功能失败:', error);
      });
    }, 100);
  }
}
