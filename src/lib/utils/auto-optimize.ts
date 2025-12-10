import fs from 'fs';
import path from 'path';
import { stringifyAuto } from '../readable-compact-json';

/**
 * 自动优化工具
 * 在应用启动时自动检查并优化格式化的JSON文件为紧凑格式
 */

/**
 * 检查文件是否需要优化为可读紧凑格式
 */
function needsOptimization(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const stats = fs.statSync(filePath);
    const data = fs.readFileSync(filePath, 'utf-8');

    // 如果文件很小，不需要优化
    if (stats.size < 1024 * 100) { // 小于100KB
      return false;
    }

    const lines = data.split('\n').length;

    // 如果是完全紧凑格式（1行）或格式化JSON（很多行），都需要优化为可读紧凑格式
    // 可读紧凑格式通常有适中的行数（2-50行之间）
    return lines === 1 || lines > 50;

  } catch (error) {
    return false;
  }
}

/**
 * 优化单个JSON文件
 */
function optimizeJSONFile(filePath: string): {
  success: boolean;
  originalSize: number;
  optimizedSize: number;
  spaceSaved: number;
  error?: string;
} {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        originalSize: 0,
        optimizedSize: 0,
        spaceSaved: 0,
        error: '文件不存在'
      };
    }

    // 读取原始文件
    const originalData = fs.readFileSync(filePath, 'utf-8');
    const originalSize = originalData.length;

    // 解析并重新序列化为可读紧凑格式
    let jsonData;
    try {
      jsonData = JSON.parse(originalData);
    } catch (error) {
      
      return null;
    }
    const optimizedData = stringifyAuto(jsonData);
    
    // 写入优化后的文件
    fs.writeFileSync(filePath, optimizedData, 'utf-8');

    const optimizedSize = optimizedData.length;
    const spaceSaved = originalSize - optimizedSize;

    console.log(`  - 原始大小: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - 优化后大小: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - 节省空间: ${(spaceSaved / 1024 / 1024).toFixed(2)} MB`);

    return {
      success: true,
      originalSize,
      optimizedSize,
      spaceSaved
    };

  } catch (error) {
    
    return {
      success: false,
      originalSize: 0,
      optimizedSize: 0,
      spaceSaved: 0,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 扫描并优化用户目录中的JSON文件
 */
function optimizeUserDirectory(userDir: string): {
  filesOptimized: number;
  totalSpaceSaved: number;
  errors: string[];
} {
  const result = {
    filesOptimized: 0,
    totalSpaceSaved: 0,
    errors: [] as string[]
  };

  try {
    if (!fs.existsSync(userDir)) {
      return result;
    }

    const files = fs.readdirSync(userDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(userDir, file);
        
        if (needsOptimization(filePath)) {
          const optimizeResult = optimizeJSONFile(filePath);
          
          if (optimizeResult.success) {
            result.filesOptimized++;
            result.totalSpaceSaved += optimizeResult.spaceSaved;
          } else {
            result.errors.push(`${file}: ${optimizeResult.error}`);
          }
        }
      }
    }

  } catch (error) {
    result.errors.push(`扫描目录失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  return result;
}

/**
 * 自动优化所有用户的JSON文件
 */
export function autoOptimizeAllUsers(): {
  usersProcessed: number;
  totalFilesOptimized: number;
  totalSpaceSaved: number;
  errors: string[];
} {
  const result = {
    usersProcessed: 0,
    totalFilesOptimized: 0,
    totalSpaceSaved: 0,
    errors: [] as string[]
  };

  try {
    const dataDir = path.join(process.cwd(), 'data');
    const usersDir = path.join(dataDir, 'users');

    // 检查用户目录是否存在
    if (!fs.existsSync(usersDir)) {
      
      return result;
    }

    const userDirs = fs.readdirSync(usersDir);

    for (const userDir of userDirs) {
      const userPath = path.join(usersDir, userDir);
      
      if (fs.statSync(userPath).isDirectory()) {
        const userResult = optimizeUserDirectory(userPath);
        
        result.usersProcessed++;
        result.totalFilesOptimized += userResult.filesOptimized;
        result.totalSpaceSaved += userResult.totalSpaceSaved;
        result.errors.push(...userResult.errors);

        if (userResult.filesOptimized > 0) {
          console.log(`[AutoOptimize] 用户 ${userDir}: 优化了 ${userResult.filesOptimized} 个文件，节省 ${(userResult.totalSpaceSaved / 1024 / 1024).toFixed(2)} MB`);
        }
      }
    }

    // 也检查根目录的JSON文件
    const rootDataFiles = ['tmdb_items.json', 'scheduled_tasks.json'];
    for (const file of rootDataFiles) {
      const filePath = path.join(dataDir, file);
      if (needsOptimization(filePath)) {
        const optimizeResult = optimizeJSONFile(filePath);
        if (optimizeResult.success) {
          result.totalFilesOptimized++;
          result.totalSpaceSaved += optimizeResult.spaceSaved;
        } else {
          result.errors.push(`根目录 ${file}: ${optimizeResult.error}`);
        }
      }
    }

    if (result.totalFilesOptimized > 0) {
      console.log(`[AutoOptimize] 优化完成: 处理了 ${result.usersProcessed} 个用户，优化了 ${result.totalFilesOptimized} 个文件，总共节省 ${(result.totalSpaceSaved / 1024 / 1024).toFixed(2)} MB`);
    } else {
      
    }

  } catch (error) {
    
    result.errors.push(`自动优化失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  return result;
}

/**
 * 在应用启动时运行自动优化
 */
export function runAutoOptimizeOnStartup(): void {
  // 延迟执行，避免影响应用启动速度
  setTimeout(() => {
    
    autoOptimizeAllUsers();
  }, 5000); // 5秒后执行
}
