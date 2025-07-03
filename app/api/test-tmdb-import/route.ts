import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * POST /api/test-tmdb-import - 测试TMDB-Import命令输出
 */
export async function POST(request: NextRequest) {
  try {
    const { url, season = 1 } = await request.json();
    
    if (!url) {
      return NextResponse.json({
        success: false,
        error: '缺少URL参数'
      }, { status: 400 });
    }
    
    console.log(`[API] 测试TMDB-Import命令，URL: ${url}, Season: ${season}`);
    
    // 查找TMDB-Import目录
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    if (!fs.existsSync(tmdbImportDir)) {
      return NextResponse.json({
        success: false,
        error: '找不到TMDB-Import目录',
        details: { expectedPath: tmdbImportDir }
      }, { status: 500 });
    }
    
    // 构建测试命令
    const testCommand = `python -m tmdb-import.extractor -u "${url}" -s ${season}`;
    
    console.log(`[API] 执行测试命令: ${testCommand}`);
    console.log(`[API] 工作目录: ${tmdbImportDir}`);
    
    try {
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: tmdbImportDir,
        timeout: 180000 // 3分钟超时
      });
      
      console.log(`[API] 命令执行完成`);
      console.log(`[API] 标准输出:`, stdout);
      if (stderr) {
        console.log(`[API] 标准错误:`, stderr);
      }
      
      // 尝试解析CSV路径
      const csvPatterns = [
        /Saved to (.+\.csv)/i,
        /(?:导出|输出|保存)(?:到|至)?\s*(.+\.csv)/i,
        /(?:Output|Export|Save)(?:ed)?\s+(?:to\s+)?(.+\.csv)/i,
        /(.+\.csv)\s*(?:已保存|已创建|已生成)/i,
        /(?:文件|File):\s*(.+\.csv)/i,
        /(.+\.csv)/g
      ];
      
      const foundPaths: string[] = [];
      for (const pattern of csvPatterns) {
        const match = stdout.match(pattern);
        if (match && match[1]) {
          foundPaths.push(`${pattern}: ${match[1]}`);
        }
      }
      
      // 查找工作目录中的CSV文件
      const files = await fs.promises.readdir(tmdbImportDir);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      return NextResponse.json({
        success: true,
        data: {
          command: testCommand,
          workingDir: tmdbImportDir,
          stdout: stdout,
          stderr: stderr,
          outputLength: stdout.length,
          foundPaths: foundPaths,
          csvFilesInDir: csvFiles,
          analysis: {
            hasOutput: stdout.length > 0,
            hasError: stderr.length > 0,
            containsCSV: stdout.includes('.csv'),
            containsSaved: stdout.toLowerCase().includes('saved'),
            containsOutput: stdout.toLowerCase().includes('output'),
            containsExport: stdout.toLowerCase().includes('export')
          }
        }
      }, { status: 200 });
      
    } catch (execError: any) {
      console.error(`[API] 命令执行失败:`, execError);
      
      return NextResponse.json({
        success: false,
        error: '命令执行失败',
        details: {
          command: testCommand,
          workingDir: tmdbImportDir,
          errorMessage: execError.message,
          errorCode: execError.code,
          stdout: execError.stdout || '',
          stderr: execError.stderr || ''
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[API] 测试TMDB-Import失败:', error);
    return NextResponse.json({
      success: false,
      error: '测试失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/test-tmdb-import - 获取TMDB-Import环境信息
 */
export async function GET(request: NextRequest) {
  try {
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    
    // 检查目录和文件
    const dirExists = fs.existsSync(tmdbImportDir);
    let dirContents: string[] = [];
    let pythonVersion = '';
    
    if (dirExists) {
      try {
        dirContents = await fs.promises.readdir(tmdbImportDir);
      } catch (error) {
        console.error('读取目录失败:', error);
      }
    }
    
    // 检查Python版本
    try {
      const { stdout } = await execAsync('python --version');
      pythonVersion = stdout.trim();
    } catch (error) {
      pythonVersion = 'Python不可用';
    }
    
    return NextResponse.json({
      success: true,
      environment: {
        tmdbImportDir: tmdbImportDir,
        dirExists: dirExists,
        dirContents: dirContents,
        pythonVersion: pythonVersion,
        hasExtractor: dirContents.includes('tmdb-import') || dirContents.some(f => f.includes('extractor')),
        csvFiles: dirContents.filter(f => f.endsWith('.csv'))
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 获取环境信息失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取环境信息失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
