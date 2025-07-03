import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * POST /api/verify-csv-processing - 验证CSV文件处理结果
 */
export async function POST(request: NextRequest) {
  try {
    const { originalCsvPath, processedCsvPath } = await request.json();
    
    if (!originalCsvPath) {
      return NextResponse.json({
        success: false,
        error: '缺少原始CSV文件路径'
      }, { status: 400 });
    }
    
    console.log(`[API] 验证CSV处理结果`);
    console.log(`[API] 原始文件: ${originalCsvPath}`);
    console.log(`[API] 处理后文件: ${processedCsvPath || '未提供'}`);
    
    const result: any = {
      originalFile: {
        path: originalCsvPath,
        exists: false,
        content: '',
        lines: 0,
        episodes: []
      }
    };
    
    // 检查原始文件
    try {
      await fs.access(originalCsvPath);
      result.originalFile.exists = true;
      
      const originalContent = await fs.readFile(originalCsvPath, 'utf-8');
      result.originalFile.content = originalContent.substring(0, 1000) + (originalContent.length > 1000 ? '...' : '');
      
      const originalLines = originalContent.split('\n').filter(line => line.trim() !== '');
      result.originalFile.lines = originalLines.length;
      
      // 解析集数信息
      if (originalLines.length > 1) {
        const headers = originalLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const episodeColumnIndex = headers.findIndex(h => 
          h.toLowerCase().includes('episode') && h.toLowerCase().includes('number')
        );
        
        if (episodeColumnIndex !== -1) {
          result.originalFile.episodeColumnIndex = episodeColumnIndex;
          result.originalFile.episodeColumnName = headers[episodeColumnIndex];
          
          for (let i = 1; i < originalLines.length; i++) {
            const columns = originalLines[i].split(',').map(c => c.trim().replace(/"/g, ''));
            if (columns.length > episodeColumnIndex) {
              const episodeNumber = parseInt(columns[episodeColumnIndex]);
              if (!isNaN(episodeNumber)) {
                result.originalFile.episodes.push({
                  line: i + 1,
                  episodeNumber,
                  rawValue: columns[episodeColumnIndex]
                });
              }
            }
          }
        }
      }
    } catch (error) {
      result.originalFile.error = error instanceof Error ? error.message : String(error);
    }
    
    // 检查处理后文件（如果提供了路径）
    if (processedCsvPath) {
      result.processedFile = {
        path: processedCsvPath,
        exists: false,
        content: '',
        lines: 0,
        episodes: []
      };
      
      try {
        await fs.access(processedCsvPath);
        result.processedFile.exists = true;
        
        const processedContent = await fs.readFile(processedCsvPath, 'utf-8');
        result.processedFile.content = processedContent.substring(0, 1000) + (processedContent.length > 1000 ? '...' : '');
        
        const processedLines = processedContent.split('\n').filter(line => line.trim() !== '');
        result.processedFile.lines = processedLines.length;
        
        // 解析集数信息
        if (processedLines.length > 1) {
          const headers = processedLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const episodeColumnIndex = headers.findIndex(h => 
            h.toLowerCase().includes('episode') && h.toLowerCase().includes('number')
          );
          
          if (episodeColumnIndex !== -1) {
            result.processedFile.episodeColumnIndex = episodeColumnIndex;
            result.processedFile.episodeColumnName = headers[episodeColumnIndex];
            
            for (let i = 1; i < processedLines.length; i++) {
              const columns = processedLines[i].split(',').map(c => c.trim().replace(/"/g, ''));
              if (columns.length > episodeColumnIndex) {
                const episodeNumber = parseInt(columns[episodeColumnIndex]);
                if (!isNaN(episodeNumber)) {
                  result.processedFile.episodes.push({
                    line: i + 1,
                    episodeNumber,
                    rawValue: columns[episodeColumnIndex]
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        result.processedFile.error = error instanceof Error ? error.message : String(error);
      }
      
      // 比较分析
      if (result.originalFile.exists && result.processedFile.exists) {
        const originalEpisodes = result.originalFile.episodes.map((e: any) => e.episodeNumber).sort((a: number, b: number) => a - b);
        const processedEpisodes = result.processedFile.episodes.map((e: any) => e.episodeNumber).sort((a: number, b: number) => a - b);
        
        result.comparison = {
          originalEpisodeCount: originalEpisodes.length,
          processedEpisodeCount: processedEpisodes.length,
          removedEpisodes: originalEpisodes.filter((ep: number) => !processedEpisodes.includes(ep)),
          addedEpisodes: processedEpisodes.filter((ep: number) => !originalEpisodes.includes(ep)),
          originalEpisodes,
          processedEpisodes,
          isIdentical: JSON.stringify(originalEpisodes) === JSON.stringify(processedEpisodes)
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      result
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 验证CSV处理失败:', error);
    return NextResponse.json({
      success: false,
      error: '验证失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/verify-csv-processing - 列出TMDB-Import目录中的CSV文件
 */
export async function GET(request: NextRequest) {
  try {
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    
    console.log(`[API] 列出CSV文件: ${tmdbImportDir}`);
    
    try {
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
            preview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
          };
        })
      );
      
      return NextResponse.json({
        success: true,
        directory: tmdbImportDir,
        csvFiles: csvFileDetails
      }, { status: 200 });
      
    } catch (dirError) {
      return NextResponse.json({
        success: false,
        error: '无法访问TMDB-Import目录',
        details: {
          directory: tmdbImportDir,
          error: dirError instanceof Error ? dirError.message : String(dirError)
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[API] 列出CSV文件失败:', error);
    return NextResponse.json({
      success: false,
      error: '操作失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
