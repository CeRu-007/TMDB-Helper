import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

/**
 * POST /api/process-csv-episodes - 处理CSV文件，删除已标记集数的行
 */
export async function POST(request: NextRequest) {
  try {
    const { csvPath, markedEpisodes, platformUrl, itemId } = await request.json();
    
    if (!csvPath || !Array.isArray(markedEpisodes)) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 });
    }
    
    console.log(`[API] 处理CSV文件: ${csvPath}`);
    console.log(`[API] 需要删除的集数: ${markedEpisodes.join(', ')}`);
    
    // 检查CSV文件是否存在
    try {
      await fs.access(csvPath);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'CSV文件不存在',
        details: { csvPath }
      }, { status: 404 });
    }
    
    // 读取CSV文件
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    if (lines.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'CSV文件为空'
      }, { status: 400 });
    }
    
    // 解析CSV头部
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const episodeNumberIndex = headers.findIndex(h => 
      h.toLowerCase().includes('episode') && h.toLowerCase().includes('number')
    );
    
    if (episodeNumberIndex === -1) {
      return NextResponse.json({
        success: false,
        error: '无法找到episode_number列',
        details: { headers }
      }, { status: 400 });
    }
    
    console.log(`[API] 找到episode_number列在索引: ${episodeNumberIndex}`);
    
    // 过滤数据行，删除已标记的集数
    const headerLine = lines[0];
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    const filteredLines = [];
    const removedEpisodes = [];
    
    for (const line of dataLines) {
      const columns = parseCSVLine(line);
      
      if (columns.length > episodeNumberIndex) {
        const episodeNumber = parseInt(columns[episodeNumberIndex]);
        
        if (!isNaN(episodeNumber) && markedEpisodes.includes(episodeNumber)) {
          removedEpisodes.push(episodeNumber);
          console.log(`[API] 删除第 ${episodeNumber} 集的数据行`);
        } else {
          filteredLines.push(line);
        }
      } else {
        // 保留格式不正确的行
        filteredLines.push(line);
      }
    }
    
    // 应用特殊变量处理
    const processedLines = await applySpecialVariables(
      [headerLine, ...filteredLines], 
      headers, 
      platformUrl
    );
    
    // 生成处理后的CSV内容
    const processedContent = processedLines.join('\n');
    
    // 生成新的文件名
    const originalDir = path.dirname(csvPath);
    const originalName = path.basename(csvPath, '.csv');
    const processedFileName = `${originalName}_processed.csv`;
    const processedCsvPath = path.join(originalDir, processedFileName);
    
    // 写入处理后的CSV文件
    await fs.writeFile(processedCsvPath, processedContent, 'utf-8');
    
    console.log(`[API] CSV处理完成: ${processedCsvPath}`);
    console.log(`[API] 删除了 ${removedEpisodes.length} 个集数的数据`);
    
    return NextResponse.json({
      success: true,
      processedCsvPath: processedCsvPath,
      removedEpisodes: removedEpisodes,
      originalRowCount: dataLines.length,
      processedRowCount: filteredLines.length,
      message: `成功处理CSV文件，删除了 ${removedEpisodes.length} 个已标记集数的数据行`
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] CSV处理失败:', error);
    return NextResponse.json({
      success: false,
      error: 'CSV处理失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * 解析CSV行，处理引号和逗号
 */
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * 应用特殊变量处理
 */
async function applySpecialVariables(
  lines: string[], 
  headers: string[], 
  platformUrl?: string
): Promise<string[]> {
  if (lines.length === 0) return lines;
  
  const headerLine = lines[0];
  const dataLines = lines.slice(1);
  
  // 变量1: 检测到播出平台地址带有iqiyi.com的话，则自动删除csv文件中air_date的列日期
  let shouldRemoveAirDate = false;
  if (platformUrl && platformUrl.includes('iqiyi.com')) {
    shouldRemoveAirDate = true;
    console.log(`[API] 检测到爱奇艺平台，将删除air_date列的日期`);
  }
  
  // 查找相关列的索引
  const airDateIndex = headers.findIndex(h => 
    h.toLowerCase().includes('air_date') || h.toLowerCase().includes('airdate')
  );
  const overviewIndex = headers.findIndex(h => 
    h.toLowerCase().includes('overview') || h.toLowerCase().includes('description')
  );
  
  console.log(`[API] air_date列索引: ${airDateIndex}, overview列索引: ${overviewIndex}`);
  
  const processedDataLines = dataLines.map(line => {
    const columns = parseCSVLine(line);
    
    // 变量1: 删除air_date列的日期
    if (shouldRemoveAirDate && airDateIndex !== -1 && columns.length > airDateIndex) {
      columns[airDateIndex] = ''; // 清空air_date
    }
    
    // 变量2: 删除overview列中的换行符
    if (overviewIndex !== -1 && columns.length > overviewIndex) {
      columns[overviewIndex] = columns[overviewIndex]
        .replace(/\r\n/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // 重新组装CSV行
    return columns.map(col => {
      // 如果列包含逗号或引号，需要用引号包围
      if (col.includes(',') || col.includes('"') || col.includes('\n')) {
        return `"${col.replace(/"/g, '""')}"`;
      }
      return col;
    }).join(',');
  });
  
  return [headerLine, ...processedDataLines];
}
