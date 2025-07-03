import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * POST /api/execute-tmdb-import - 执行TMDB导入
 */
export async function POST(request: NextRequest) {
  try {
    const { csvPath, seasonNumber, itemId, tmdbId } = await request.json();
    
    if (!csvPath) {
      return NextResponse.json({
        success: false,
        error: '缺少CSV文件路径参数'
      }, { status: 400 });
    }
    
    console.log(`[API] 执行TMDB导入: CSV=${csvPath}, Season=${seasonNumber}`);
    
    // 检查CSV文件是否存在
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({
        success: false,
        error: 'CSV文件不存在',
        details: { csvPath }
      }, { status: 404 });
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
    
    // 构建TMDB导入命令
    const tmdbUrl = `https://www.themoviedb.org/tv/${tmdbId}/season/${seasonNumber}?language=zh-CN`;
    const importCommand = `python -m tmdb-import "${tmdbUrl}"`;
    
    console.log(`[API] 执行TMDB导入命令: ${importCommand}`);
    console.log(`[API] 工作目录: ${tmdbImportDir}`);
    
    try {
      const { stdout, stderr } = await execAsync(importCommand, {
        cwd: tmdbImportDir,
        timeout: 600000 // 10分钟超时
      });
      
      console.log(`[API] TMDB导入命令执行完成`);
      console.log(`[API] 标准输出:`, stdout);
      if (stderr) {
        console.log(`[API] 标准错误:`, stderr);
      }
      
      // 解析导入的集数
      const importedEpisodes = parseImportedEpisodes(stdout);
      
      console.log(`[API] TMDB导入成功，导入的集数: ${importedEpisodes.join(', ')}`);
      
      return NextResponse.json({
        success: true,
        importedEpisodes: importedEpisodes,
        message: `TMDB导入完成，成功导入 ${importedEpisodes.length} 集`,
        output: stdout.substring(0, 1000)
      }, { status: 200 });
      
    } catch (execError: any) {
      console.error(`[API] TMDB导入命令执行失败:`, execError);
      
      return NextResponse.json({
        success: false,
        error: 'TMDB导入命令执行失败',
        details: {
          command: importCommand,
          workingDir: tmdbImportDir,
          errorMessage: execError.message,
          errorCode: execError.code,
          stdout: execError.stdout || '',
          stderr: execError.stderr || ''
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[API] TMDB导入失败:', error);
    return NextResponse.json({
      success: false,
      error: 'TMDB导入失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * 从TMDB导入输出中解析导入的集数
 */
function parseImportedEpisodes(output: string): number[] {
  const importedEpisodes: number[] = [];
  
  console.log(`[API] 解析导入的集数，输出内容:`, output);
  
  // 尝试多种模式来匹配导入的集数
  const patterns = [
    // 匹配 "Episode 1", "Episode 2" 等
    /Episode\s+(\d+)/gi,
    // 匹配 "第1集", "第2集" 等
    /第(\d+)集/g,
    // 匹配 "S01E01", "S01E02" 等
    /S\d+E(\d+)/gi,
    // 匹配 "E01", "E02" 等
    /E(\d+)/gi,
    // 匹配 "导入第1集", "导入第2集" 等
    /导入第?(\d+)集?/g,
    // 匹配 "Imported episode 1", "Imported episode 2" 等
    /Imported\s+episode\s+(\d+)/gi,
    // 匹配 "成功导入 1", "成功导入 2" 等
    /成功导入\s*(\d+)/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(output)) !== null) {
      const episodeNumber = parseInt(match[1]);
      if (!isNaN(episodeNumber) && !importedEpisodes.includes(episodeNumber)) {
        importedEpisodes.push(episodeNumber);
      }
    }
  }
  
  // 如果没有找到具体的集数，尝试从CSV文件中推断
  if (importedEpisodes.length === 0) {
    console.log(`[API] 无法从输出解析集数，尝试其他方法`);
    
    // 查找输出中的数字，可能是集数
    const numbers = output.match(/\b\d+\b/g);
    if (numbers) {
      for (const num of numbers) {
        const episodeNumber = parseInt(num);
        // 假设集数在1-999之间
        if (episodeNumber >= 1 && episodeNumber <= 999) {
          if (!importedEpisodes.includes(episodeNumber)) {
            importedEpisodes.push(episodeNumber);
          }
        }
      }
    }
  }
  
  // 排序并去重
  const uniqueEpisodes = [...new Set(importedEpisodes)].sort((a, b) => a - b);
  
  console.log(`[API] 解析到的导入集数: ${uniqueEpisodes.join(', ')}`);
  
  return uniqueEpisodes;
}
