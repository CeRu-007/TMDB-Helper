import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

/**
 * POST /api/check-tmdb-csv - 检查TMDB-Import工具实际使用的CSV文件
 */
export async function POST(request: NextRequest) {
  try {
    const { tmdbUrl, dryRun = true } = await request.json();
    
    if (!tmdbUrl) {
      return NextResponse.json({
        success: false,
        error: '缺少TMDB URL参数'
      }, { status: 400 });
    }
    
    console.log(`[API] 检查TMDB-Import使用的CSV文件`);
    console.log(`[API] TMDB URL: ${tmdbUrl}`);
    console.log(`[API] 干运行模式: ${dryRun}`);
    
    // 查找TMDB-Import目录
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    if (!(await fs.access(tmdbImportDir).then(() => true).catch(() => false))) {
      return NextResponse.json({
        success: false,
        error: '找不到TMDB-Import目录',
        details: { expectedPath: tmdbImportDir }
      }, { status: 500 });
    }
    
    // 列出当前目录中的CSV文件
    const beforeFiles = await fs.readdir(tmdbImportDir);
    const beforeCsvFiles = beforeFiles.filter(file => file.endsWith('.csv'));
    
    console.log(`[API] 执行前的CSV文件: [${beforeCsvFiles.join(', ')}]`);
    
    // 构建TMDB导入命令（如果是干运行，添加相应参数）
    let importCommand = `python -m tmdb-import "${tmdbUrl}"`;
    if (dryRun) {
      // 尝试添加干运行参数（如果工具支持）
      importCommand += ' --dry-run';
    }
    
    console.log(`[API] 执行命令: ${importCommand}`);
    
    let commandOutput = '';
    let commandError = '';
    let csvFilesUsed: string[] = [];
    
    try {
      const { stdout, stderr } = await execAsync(importCommand, {
        cwd: tmdbImportDir,
        timeout: 60000 // 1分钟超时
      });
      
      commandOutput = stdout;
      commandError = stderr;
      
      console.log(`[API] 命令执行完成`);
      console.log(`[API] 输出: ${stdout.substring(0, 500)}...`);
      if (stderr) {
        console.log(`[API] 错误: ${stderr.substring(0, 500)}...`);
      }
      
      // 分析输出中提到的CSV文件
      const csvMentions = stdout.match(/\S+\.csv/g) || [];
      csvFilesUsed = [...new Set(csvMentions)];
      
    } catch (execError: any) {
      commandError = execError.message;
      console.log(`[API] 命令执行失败: ${execError.message}`);
      
      // 即使命令失败，也尝试分析输出
      if (execError.stdout) {
        commandOutput = execError.stdout;
        const csvMentions = execError.stdout.match(/\S+\.csv/g) || [];
        csvFilesUsed = [...new Set(csvMentions)];
      }
    }
    
    // 列出执行后的CSV文件
    const afterFiles = await fs.readdir(tmdbImportDir);
    const afterCsvFiles = afterFiles.filter(file => file.endsWith('.csv'));
    
    console.log(`[API] 执行后的CSV文件: [${afterCsvFiles.join(', ')}]`);
    
    // 分析CSV文件变化
    const newCsvFiles = afterCsvFiles.filter(file => !beforeCsvFiles.includes(file));
    const deletedCsvFiles = beforeCsvFiles.filter(file => !afterCsvFiles.includes(file));
    
    // 检查每个CSV文件的内容
    const csvFileAnalysis = await Promise.all(
      afterCsvFiles.map(async (file) => {
        const filePath = path.join(tmdbImportDir, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        // 分析集数信息
        let episodes: number[] = [];
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const episodeColumnIndex = headers.findIndex(h => 
            h.toLowerCase().includes('episode') && h.toLowerCase().includes('number')
          );
          
          if (episodeColumnIndex !== -1) {
            for (let i = 1; i < lines.length; i++) {
              const columns = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
              if (columns.length > episodeColumnIndex) {
                const episodeNumber = parseInt(columns[episodeColumnIndex]);
                if (!isNaN(episodeNumber)) {
                  episodes.push(episodeNumber);
                }
              }
            }
          }
        }
        
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          lines: lines.length,
          episodes: episodes.sort((a, b) => a - b),
          isNew: newCsvFiles.includes(file),
          mentionedInOutput: csvFilesUsed.some(mentioned => mentioned.includes(file) || file.includes(mentioned))
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: {
        tmdbUrl,
        dryRun,
        command: importCommand,
        workingDirectory: tmdbImportDir,
        execution: {
          success: !commandError,
          output: commandOutput.substring(0, 1000) + (commandOutput.length > 1000 ? '...' : ''),
          error: commandError.substring(0, 500) + (commandError.length > 500 ? '...' : ''),
          csvFilesUsed
        },
        csvFiles: {
          before: beforeCsvFiles,
          after: afterCsvFiles,
          new: newCsvFiles,
          deleted: deletedCsvFiles,
          analysis: csvFileAnalysis
        },
        recommendations: {
          likelyUsedFile: csvFileAnalysis.find(f => f.mentionedInOutput)?.filename || 
                         csvFileAnalysis.find(f => f.isNew)?.filename ||
                         csvFileAnalysis[csvFileAnalysis.length - 1]?.filename,
          shouldOverwriteOriginal: csvFileAnalysis.length > 1,
          hasMultipleFiles: csvFileAnalysis.length > 1
        }
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 检查TMDB CSV失败:', error);
    return NextResponse.json({
      success: false,
      error: '检查失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/check-tmdb-csv - 列出TMDB-Import目录中的所有CSV文件
 */
export async function GET(request: NextRequest) {
  try {
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    
    console.log(`[API] 列出TMDB-Import目录中的CSV文件: ${tmdbImportDir}`);
    
    const files = await fs.readdir(tmdbImportDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    
    const csvFileDetails = await Promise.all(
      csvFiles.map(async file => {
        const filePath = path.join(tmdbImportDir, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        return {
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          lines: lines.length,
          preview: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
          isBackup: file.includes('_backup_'),
          isProcessed: file.includes('_processed')
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      directory: tmdbImportDir,
      csvFiles: csvFileDetails,
      summary: {
        total: csvFiles.length,
        backups: csvFileDetails.filter(f => f.isBackup).length,
        processed: csvFileDetails.filter(f => f.isProcessed).length,
        original: csvFileDetails.filter(f => !f.isBackup && !f.isProcessed).length
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 列出CSV文件失败:', error);
    return NextResponse.json({
      success: false,
      error: '操作失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
