/**
 * 桌面应用适配器
 * 处理 Electron 环境下的路径、权限和配置问题
 */

import path from 'path';
import fs from 'fs';
import os from 'os';

// 检测是否在 Electron 环境中运行
export function isElectronApp(): boolean {
  if (typeof window !== 'undefined') {
    return !!(window as any).electronAPI?.isElectron;
  }
  return process.env.ELECTRON_BUILD === 'true' || !!process.versions?.electron;
}

// 获取应用数据目录
export function getAppDataDir(): string {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    // 客户端：通过 Electron API 获取
    return (window as any).electronAPI.getAppDataPath();
  }
  
  // 服务端：从环境变量或默认路径获取
  if (process.env.TMDB_DATA_DIR) {
    return process.env.TMDB_DATA_DIR;
  }
  
  if (isElectronApp()) {
    // Electron 环境下使用用户数据目录
    const userDataPath = os.homedir();
    return path.join(userDataPath, '.tmdb-helper');
  }
  
  // 默认使用项目目录下的 data 文件夹
  return path.join(process.cwd(), 'data');
}

// 确保数据目录存在
export function ensureDataDir(): string {
  const dataDir = getAppDataDir();
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // 确保子目录存在
  const subDirs = ['auth', 'users', 'logs', 'temp'];
  subDirs.forEach(subDir => {
    const fullPath = path.join(dataDir, subDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
  
  return dataDir;
}

// 获取配置文件路径
export function getConfigPath(filename: string): string {
  const dataDir = ensureDataDir();
  return path.join(dataDir, filename);
}

// 获取用户数据路径
export function getUserDataPath(userId: string, filename?: string): string {
  const dataDir = ensureDataDir();
  const userDir = path.join(dataDir, 'users', userId);
  
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  
  return filename ? path.join(userDir, filename) : userDir;
}

// 获取日志文件路径
export function getLogPath(filename: string): string {
  const dataDir = ensureDataDir();
  const logDir = path.join(dataDir, 'logs');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  return path.join(logDir, filename);
}

// 获取临时文件路径
export function getTempPath(filename: string): string {
  const dataDir = ensureDataDir();
  const tempDir = path.join(dataDir, 'temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return path.join(tempDir, filename);
}

// 获取 TMDB Import 工具路径
export function getTmdbImportPath(): string {
  if (isElectronApp()) {
    // 桌面应用中，TMDB Import 工具打包在资源目录中
    if (typeof window !== 'undefined') {
      // 客户端无法直接访问文件系统，需要通过 API
      return '/api/tmdb-import-path';
    } else {
      // 服务端可以直接访问
      const resourcePath = process.resourcesPath || process.cwd();
      return path.join(resourcePath, 'TMDB-Import-master');
    }
  }
  
  // 开发环境或 Docker 环境
  return path.join(process.cwd(), 'TMDB-Import-master');
}

// 检查文件权限
export function checkFilePermissions(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch (error) {
    console.warn(`文件权限检查失败: ${filePath}`, error);
    return false;
  }
}

// 安全地读取文件
export function safeReadFile(filePath: string, encoding: BufferEncoding = 'utf8'): string | null {
  try {
    if (!checkFilePermissions(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, encoding);
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error);
    return null;
  }
}

// 安全地写入文件
export function safeWriteFile(filePath: string, data: string, encoding: BufferEncoding = 'utf8'): boolean {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, data, encoding);
    return true;
  } catch (error) {
    console.error(`写入文件失败: ${filePath}`, error);
    return false;
  }
}

// 获取平台信息
export function getPlatformInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    isElectron: isElectronApp(),
    nodeVersion: process.version,
    electronVersion: process.versions?.electron || null
  };
}
