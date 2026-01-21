import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * POST /api/execute-platform-extraction - 执行播出平台抓取
 */
export async function POST(request: NextRequest) {
  try {
    const { platformUrl, seasonNumber, itemId } = await request.json();
    
    if (!platformUrl) {
      return NextResponse.json({
        success: false,
        error: '缺少平台URL参数'
      }, { status: 400 });
    }

    // 查找TMDB-Import目录
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    if (!fs.existsSync(tmdbImportDir)) {
      return NextResponse.json({
        success: false,
        error: '找不到TMDB-Import目录',
        details: { expectedPath: tmdbImportDir }
      }, { status: 500 });
    }
    
    // 构建播出平台抓取命令
    const extractCommand = `python -m tmdb-import "${platformUrl}"`;

    try {
      const { stdout, stderr } = await execAsync(extractCommand, {
        cwd: tmdbImportDir,
        timeout: 300000 // 5分钟超时
      });

      if (stderr) {
        
      }
      
      // 解析CSV文件路径
      const csvPath = parseCSVPathFromOutput(stdout);
      
      if (!csvPath) {
        // 尝试查找最新的CSV文件
        const files = await fs.promises.readdir(tmdbImportDir);
        const csvFiles = files.filter(file => file.endsWith('.csv'));
        
        if (csvFiles.length > 0) {
          // 按修改时间排序，获取最新的CSV文件
          const csvFilesWithStats = await Promise.all(
            csvFiles.map(async file => {
              const filePath = path.join(tmdbImportDir, file);
              const stats = await fs.promises.stat(filePath);
              return { file, mtime: stats.mtime };
            })
          );
          
          csvFilesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
          const latestCsvFile = csvFilesWithStats[0].file;
          const fullCsvPath = path.join(tmdbImportDir, latestCsvFile);

          return NextResponse.json({
            success: true,
            csvPath: fullCsvPath,
            message: '播出平台抓取完成',
            output: stdout.substring(0, 1000)
          }, { status: 200 });
        } else {
          return NextResponse.json({
            success: false,
            error: '无法找到生成的CSV文件',
            details: {
              stdout: stdout.substring(0, 1000),
              stderr: stderr.substring(0, 500),
              workingDir: tmdbImportDir
            }
          }, { status: 500 });
        }
      }
      
      // 构建CSV文件的绝对路径
      let csvAbsolutePath: string;
      if (path.isAbsolute(csvPath)) {
        csvAbsolutePath = csvPath;
      } else {
        csvAbsolutePath = path.resolve(tmdbImportDir, csvPath);
      }
      
      // 验证CSV文件是否存在
      if (!fs.existsSync(csvAbsolutePath)) {
        return NextResponse.json({
          success: false,
          error: 'CSV文件不存在',
          details: {
            expectedPath: csvAbsolutePath,
            parsedPath: csvPath,
            workingDir: tmdbImportDir
          }
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        csvPath: csvAbsolutePath,
        message: '播出平台抓取完成',
        output: stdout.substring(0, 1000)
      }, { status: 200 });
      
    } catch (execError: unknown) {

      return NextResponse.json({
        success: false,
        error: '播出平台抓取命令执行失败',
        details: {
          command: extractCommand,
          workingDir: tmdbImportDir,
          errorMessage: execError instanceof Error ? execError.message : String(execError),
          errorCode: execError instanceof Error && 'code' in execError ? (execError as Error & { code?: unknown }).code : undefined,
          stdout: execError instanceof Error && 'stdout' in execError ? (execError as Error & { stdout?: string }).stdout || '' : '',
          stderr: execError instanceof Error && 'stderr' in execError ? (execError as Error & { stderr?: string }).stderr || '' : ''
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: '播出平台抓取失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * 从输出中解析CSV文件路径
 */
function parseCSVPathFromOutput(output: string): string | null {
  
  // 尝试多种可能的输出格式
  const patterns = [
    /Saved to (.+\.csv)/i,
    /(?:导出|输出|保存)(?:到|至)?\s*(.+\.csv)/i,
    /(?:Output|Export|Save)(?:ed)?\s+(?:to\s+)?(.+\.csv)/i,
    /(.+\.csv)\s*(?:已保存|已创建|已生成)/i,
    /(?:文件|File):\s*(.+\.csv)/i,
    /(.+\.csv)/g
  ];
  
  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match && match[1]) {
      const csvPath = match[1].trim();
      console.log(`[API] 找到CSV路径: ${csvPath} (使用模式: ${pattern})`);
      return csvPath;
    }
  }
  
  // 如果所有模式都失败，尝试查找输出中的所有.csv文件
  const csvFiles = output.match(/\S+\.csv/g);
  if (csvFiles && csvFiles.length > 0) {
    const csvPath = csvFiles[csvFiles.length - 1]; // 使用最后一个找到的CSV文件
    
    return csvPath;
  }

  return null;
}
