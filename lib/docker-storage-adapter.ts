/**
 * Docker环境存储适配器
 * 确保存储优化功能在Docker容器中正常工作
 */

interface DockerEnvironment {
  isDocker: boolean;
  hasWritePermission: boolean;
  dataPath: string;
  tempPath: string;
  logPath: string;
}

export class DockerStorageAdapter {
  private static instance: DockerStorageAdapter;
  private environment: DockerEnvironment;

  private constructor() {
    this.environment = this.detectEnvironment();
  }

  static getInstance(): DockerStorageAdapter {
    if (!DockerStorageAdapter.instance) {
      DockerStorageAdapter.instance = new DockerStorageAdapter();
    }
    return DockerStorageAdapter.instance;
  }

  /**
   * 检测Docker环境
   */
  private detectEnvironment(): DockerEnvironment {
    const isDocker = this.isRunningInDocker();

    return {
      isDocker,
      hasWritePermission: this.checkWritePermission(isDocker),
      dataPath: isDocker ? '/app/data' : './data',
      tempPath: isDocker ? '/tmp' : './tmp',
      logPath: isDocker ? '/app/logs' : './logs'
    };
  }

  /**
   * 检测是否在Docker容器中运行
   */
  private isRunningInDocker(): boolean {
    try {
      // 检查环境变量
      if (process.env.DOCKER_CONTAINER === 'true') {
        return true;
      }

      // 检查是否存在Docker特有的文件
      if (typeof window === 'undefined') {
        const fs = require('fs');
        
        // 检查/.dockerenv文件
        if (fs.existsSync('/.dockerenv')) {
          return true;
        }

        // 检查/proc/1/cgroup文件中是否包含docker
        try {
          const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
          if (cgroup.includes('docker') || cgroup.includes('containerd')) {
            return true;
          }
        } catch (error) {
          // 忽略错误，可能不在Linux环境中
        }
      }

      // 检查主机名是否为容器ID格式
      if (typeof window === 'undefined' && process.env.HOSTNAME) {
        const hostname = process.env.HOSTNAME;
        // Docker容器的主机名通常是12位十六进制字符
        if (/^[a-f0-9]{12}$/.test(hostname)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * 检查写入权限
   */
  private checkWritePermission(isDocker: boolean): boolean {
    if (typeof window !== 'undefined') {
      // 浏览器环境，检查localStorage
      try {
        const testKey = '__docker_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
      } catch (error) {
        return false;
      }
    } else {
      // Node.js环境，检查文件系统权限
      try {
        const fs = require('fs');
        const path = require('path');

        const dataPath = isDocker ? '/app/data' : './data';

        // 确保目录存在
        if (!fs.existsSync(dataPath)) {
          fs.mkdirSync(dataPath, { recursive: true });
        }

        const testPath = path.join(dataPath, '.write_test');
        fs.writeFileSync(testPath, 'test');
        fs.unlinkSync(testPath);
        return true;
      } catch (error) {
        
        return false;
      }
    }
  }

  /**
   * 获取环境信息
   */
  getEnvironment(): DockerEnvironment {
    return { ...this.environment };
  }

  /**
   * 获取适合的存储配置
   */
  getStorageConfig(): {
    useIndexedDB: boolean;
    useFileSystem: boolean;
    useMemoryCache: boolean;
    maxCacheSize: number;
    cacheTTL: number;
  } {
    const env = this.environment;

    if (typeof window !== 'undefined') {
      // 浏览器环境
      return {
        useIndexedDB: true,
        useFileSystem: false,
        useMemoryCache: true,
        maxCacheSize: env.isDocker ? 50 * 1024 * 1024 : 100 * 1024 * 1024, // Docker环境减少内存使用
        cacheTTL: 30 * 60 * 1000 // 30分钟
      };
    } else {
      // Node.js环境
      return {
        useIndexedDB: false,
        useFileSystem: env.hasWritePermission,
        useMemoryCache: true,
        maxCacheSize: env.isDocker ? 25 * 1024 * 1024 : 50 * 1024 * 1024, // Docker环境减少内存使用
        cacheTTL: 60 * 60 * 1000 // 1小时
      };
    }
  }

  /**
   * 获取网络配置
   */
  getNetworkConfig(): {
    maxConcurrentRequests: number;
    requestTimeout: number;
    retryAttempts: number;
    cacheSize: number;
    enableBatching: boolean;
  } {
    const env = this.environment;

    return {
      maxConcurrentRequests: env.isDocker ? 5 : 10, // Docker环境减少并发请求
      requestTimeout: env.isDocker ? 45000 : 30000, // Docker环境增加超时时间
      retryAttempts: 3,
      cacheSize: env.isDocker ? 100 : 200, // Docker环境减少缓存条目
      enableBatching: true
    };
  }

  /**
   * 创建必要的目录
   */
  async ensureDirectories(): Promise<void> {
    if (typeof window !== 'undefined') {
      // 浏览器环境不需要创建目录
      return;
    }

    try {
      const fs = require('fs').promises;
      const directories = [
        this.environment.dataPath,
        this.environment.tempPath,
        this.environment.logPath
      ];

      for (const dir of directories) {
        try {
          await fs.access(dir);
        } catch (error) {
          // 目录不存在，尝试创建
          try {
            await fs.mkdir(dir, { recursive: true });
            
          } catch (createError) {
            
          }
        }
      }
    } catch (error) {
      
    }
  }

  /**
   * 获取持久化存储路径
   */
  getPersistentStoragePath(filename: string): string {
    return `${this.environment.dataPath}/${filename}`;
  }

  /**
   * 获取临时存储路径
   */
  getTempStoragePath(filename: string): string {
    return `${this.environment.tempPath}/${filename}`;
  }

  /**
   * 获取日志路径
   */
  getLogPath(filename: string): string {
    return `${this.environment.logPath}/${filename}`;
  }

  /**
   * 检查存储健康状态
   */
  async checkStorageHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    details: {
      indexedDB?: boolean;
      localStorage?: boolean;
      fileSystem?: boolean;
      permissions?: boolean;
      diskSpace?: string;
    };
    recommendations: string[];
  }> {
    const details: any = {};
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'error' = 'healthy';

    try {
      // 检查浏览器存储
      if (typeof window !== 'undefined') {
        // 检查IndexedDB
        try {
          if ('indexedDB' in window) {
            details.indexedDB = true;
          } else {
            details.indexedDB = false;
            status = 'warning';
            recommendations.push('IndexedDB不可用，将使用localStorage作为后备');
          }
        } catch (error) {
          details.indexedDB = false;
          status = 'warning';
        }

        // 检查localStorage
        try {
          const testKey = '__health_check__';
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);
          details.localStorage = true;
        } catch (error) {
          details.localStorage = false;
          status = 'error';
          recommendations.push('localStorage不可用，存储功能将受限');
        }
      }

      // 检查文件系统（Node.js环境）
      if (typeof window === 'undefined') {
        details.fileSystem = this.environment.hasWritePermission;
        details.permissions = this.environment.hasWritePermission;

        if (!this.environment.hasWritePermission) {
          status = 'error';
          recommendations.push('文件系统写入权限不足，请检查Docker卷挂载');
        }

        // 检查磁盘空间（如果可能）
        try {
          const fs = require('fs');
          const stats = fs.statSync(this.environment.dataPath);
          details.diskSpace = '可用';
        } catch (error) {
          details.diskSpace = '无法检测';
          status = 'warning';
          recommendations.push('无法检测磁盘空间，请确保有足够的存储空间');
        }
      }

      // Docker特定检查
      if (this.environment.isDocker) {
        if (typeof window === 'undefined' && !this.environment.hasWritePermission) {
          status = 'error';
          recommendations.push('Docker环境中文件系统不可写，请检查卷挂载配置');
        }

        if (status === 'healthy') {
          recommendations.push('Docker环境配置正常');
        }
      }

    } catch (error) {
      status = 'error';
      recommendations.push(`健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return {
      status,
      details,
      recommendations
    };
  }

  /**
   * 获取环境特定的配置建议
   */
  getConfigurationRecommendations(): {
    storage: string[];
    network: string[];
    performance: string[];
    docker: string[];
  } {
    const env = this.environment;
    const recommendations = {
      storage: [] as string[],
      network: [] as string[],
      performance: [] as string[],
      docker: [] as string[]
    };

    if (env.isDocker) {
      recommendations.docker.push(
        '确保Docker容器有足够的内存分配（建议至少512MB）',
        '使用Docker卷持久化数据目录 /app/data',
        '考虑使用Docker健康检查监控应用状态',
        '在生产环境中设置适当的资源限制'
      );

      recommendations.storage.push(
        '在Docker环境中，IndexedDB数据存储在容器内存中',
        '重要数据应通过API导出并存储在持久化卷中',
        '定期备份数据以防容器重启导致数据丢失'
      );

      recommendations.network.push(
        'Docker环境中网络请求可能有额外延迟',
        '考虑增加请求超时时间',
        '使用Docker网络优化容器间通信'
      );

      recommendations.performance.push(
        '减少内存缓存大小以适应容器资源限制',
        '启用请求批处理以减少网络开销',
        '使用生产模式构建以获得最佳性能'
      );
    } else {
      recommendations.storage.push(
        '本地环境可以充分利用IndexedDB和localStorage',
        '考虑定期清理过期缓存数据'
      );

      recommendations.network.push(
        '本地环境网络条件较好，可以使用更激进的缓存策略',
        '可以增加并发请求数量'
      );

      recommendations.performance.push(
        '本地环境可以使用更大的内存缓存',
        '启用所有性能优化功能'
      );
    }

    return recommendations;
  }
}

// 导出单例实例
export const dockerStorageAdapter = DockerStorageAdapter.getInstance();

// 初始化函数，在应用启动时调用
export async function initializeDockerAdapter(): Promise<void> {
  const adapter = dockerStorageAdapter;
  const env = adapter.getEnvironment();

  // 创建必要的目录
  await adapter.ensureDirectories();

  // 检查存储健康状态
  const health = await adapter.checkStorageHealth();
  
  if (health.recommendations.length > 0) {
    
  }

  // 输出配置建议
  const recommendations = adapter.getConfigurationRecommendations();
  if (env.isDocker && recommendations.docker.length > 0) {
    
  }
}