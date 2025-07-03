import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

/**
 * POST /api/process-csv-episodes - 处理CSV文件，删除已标记集数的行
 */
export async function POST(request: NextRequest) {
  try {
    const { csvPath, markedEpisodes, platformUrl, itemId, testMode = false } = await request.json();
    
    if (!csvPath || !Array.isArray(markedEpisodes)) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 });
    }
    
    console.log(`[API] ========== CSV处理开始 ==========`);
    console.log(`[API] 处理CSV文件: ${csvPath}`);
    console.log(`[API] 需要删除的集数: [${markedEpisodes.join(', ')}]`);
    console.log(`[API] 平台URL: ${platformUrl}`);
    console.log(`[API] 项目ID: ${itemId}`);
    console.log(`[API] 测试模式: ${testMode}`);

    // 检查CSV文件是否存在
    try {
      await fs.access(csvPath);
      console.log(`[API] ✓ CSV文件存在且可访问`);
    } catch (error) {
      console.error(`[API] ✗ CSV文件不存在或不可访问: ${error}`);
      return NextResponse.json({
        success: false,
        error: 'CSV文件不存在',
        details: { csvPath, error: error instanceof Error ? error.message : String(error) }
      }, { status: 404 });
    }
    
    // 读取CSV文件
    console.log(`[API] 开始读取CSV文件...`);
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    console.log(`[API] CSV文件大小: ${csvContent.length} 字符`);

    const lines = csvContent.split('\n');
    console.log(`[API] CSV总行数: ${lines.length}`);
    console.log(`[API] CSV前3行预览:`);
    lines.slice(0, 3).forEach((line, index) => {
      console.log(`[API]   第${index + 1}行: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
    });

    if (lines.length === 0) {
      console.error(`[API] ✗ CSV文件为空`);
      return NextResponse.json({
        success: false,
        error: 'CSV文件为空'
      }, { status: 400 });
    }
    
    // 解析CSV头部
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log(`[API] CSV头部列名: [${headers.join(', ')}]`);

    // 尝试多种可能的集数列名
    const possibleEpisodeColumns = [
      'episode_number',
      'episode',
      'ep',
      'number',
      'episode_num',
      'ep_num',
      '集数',
      '第几集'
    ];

    let episodeNumberIndex = -1;
    let matchedColumnName = '';

    for (const possibleName of possibleEpisodeColumns) {
      episodeNumberIndex = headers.findIndex(h =>
        h.toLowerCase().includes(possibleName.toLowerCase())
      );
      if (episodeNumberIndex !== -1) {
        matchedColumnName = headers[episodeNumberIndex];
        break;
      }
    }

    if (episodeNumberIndex === -1) {
      console.error(`[API] 无法找到集数列，可用列名: [${headers.join(', ')}]`);
      return NextResponse.json({
        success: false,
        error: '无法找到集数列',
        details: {
          headers,
          searchedColumns: possibleEpisodeColumns
        }
      }, { status: 400 });
    }

    console.log(`[API] 找到集数列 "${matchedColumnName}" 在索引: ${episodeNumberIndex}`);
    
    // 过滤数据行，删除已标记的集数
    const headerLine = lines[0];
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    const filteredLines = [];
    const removedEpisodes = [];

    console.log(`[API] 开始处理 ${dataLines.length} 行数据，需要删除的集数: [${markedEpisodes.join(', ')}]`);

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const columns = parseCSVLine(line);

      if (columns.length > episodeNumberIndex) {
        const episodeNumberStr = columns[episodeNumberIndex].trim();
        const episodeNumber = parseInt(episodeNumberStr);

        console.log(`[API] 第 ${i + 1} 行: 集数列值="${episodeNumberStr}", 解析为数字=${episodeNumber}`);

        if (!isNaN(episodeNumber) && markedEpisodes.includes(episodeNumber)) {
          removedEpisodes.push(episodeNumber);
          console.log(`[API] ✓ 删除第 ${episodeNumber} 集的数据行`);
        } else {
          filteredLines.push(line);
          console.log(`[API] ✓ 保留第 ${episodeNumber} 集的数据行`);
        }
      } else {
        // 保留格式不正确的行
        filteredLines.push(line);
        console.log(`[API] ✓ 保留格式不正确的行 (列数: ${columns.length})`);
      }
    }

    console.log(`[API] 处理完成: 删除了 ${removedEpisodes.length} 行，保留了 ${filteredLines.length} 行`);
    console.log(`[API] 删除的集数: [${removedEpisodes.sort((a, b) => a - b).join(', ')}]`);

    // 如果是测试模式，只返回分析结果，不实际处理文件
    if (testMode) {
      console.log(`[API] 测试模式：只分析，不实际处理文件`);
      return NextResponse.json({
        success: true,
        testMode: true,
        analysis: {
          originalCsvPath: csvPath,
          markedEpisodesInput: markedEpisodes,
          foundEpisodeColumn: matchedColumnName,
          episodeColumnIndex: episodeNumberIndex,
          totalDataLines: dataLines.length,
          episodesToRemove: removedEpisodes.sort((a, b) => a - b),
          episodesToKeep: filteredLines.length,
          wouldNeedProcessing: removedEpisodes.length > 0 ||
                              (platformUrl && platformUrl.includes('iqiyi.com')) ||
                              dataLines.some(line => line.includes('\n') || line.includes('\r'))
        },
        message: `测试模式：分析完成，将删除 ${removedEpisodes.length} 个集数的数据行`
      }, { status: 200 });
    }

    // 如果没有删除任何行，检查是否需要应用特殊变量处理
    if (removedEpisodes.length === 0) {
      console.log(`[API] 没有删除任何行，检查是否需要应用特殊变量处理`);

      // 检查是否需要特殊变量处理
      const needsSpecialProcessing = (platformUrl && platformUrl.includes('iqiyi.com')) ||
                                   dataLines.some(line => line.includes('\n') || line.includes('\r'));

      if (!needsSpecialProcessing) {
        console.log(`[API] 不需要特殊处理，直接使用原始文件`);
        return NextResponse.json({
          success: true,
          processedCsvPath: csvPath, // 使用原始文件
          originalCsvPath: csvPath,
          backupCsvPath: null, // 没有创建备份
          removedEpisodes: [],
          originalRowCount: dataLines.length,
          processedRowCount: dataLines.length,
          episodeColumnIndex: episodeNumberIndex,
          episodeColumnName: matchedColumnName,
          markedEpisodesInput: markedEpisodes,
          strategy: 'no_processing_needed',
          message: `没有需要删除的集数，使用原始CSV文件`
        }, { status: 200 });
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
    
    // 策略：直接覆盖原始文件，但先创建备份
    const originalDir = path.dirname(csvPath);
    const originalName = path.basename(csvPath, '.csv');
    const backupFileName = `${originalName}_backup_${Date.now()}.csv`;
    const backupCsvPath = path.join(originalDir, backupFileName);
    const processedCsvPath = csvPath; // 直接使用原始文件路径

    console.log(`[API] 文件处理策略: 覆盖原始文件`);
    console.log(`[API] 原始文件: ${csvPath}`);
    console.log(`[API] 备份文件: ${backupCsvPath}`);
    
    // 验证目标目录是否存在
    const targetDir = path.dirname(processedCsvPath);
    console.log(`[API] 目标目录: ${targetDir}`);

    try {
      await fs.access(targetDir);
      console.log(`[API] 目标目录存在且可访问`);
    } catch (dirError) {
      console.error(`[API] 目标目录不存在或不可访问: ${dirError}`);
      throw new Error(`目标目录不可访问: ${targetDir}`);
    }

    // 先创建原始文件的备份
    console.log(`[API] 创建原始文件备份: ${backupCsvPath}`);
    const originalContent = await fs.readFile(csvPath, 'utf-8');
    await fs.writeFile(backupCsvPath, originalContent, 'utf-8');
    console.log(`[API] ✓ 备份文件创建成功`);

    // 覆盖原始文件
    console.log(`[API] 开始覆盖原始CSV文件: ${processedCsvPath}`);
    console.log(`[API] 文件内容长度: ${processedContent.length} 字符`);
    console.log(`[API] 文件内容预览: ${processedContent.substring(0, 200)}...`);

    await fs.writeFile(processedCsvPath, processedContent, 'utf-8');
    console.log(`[API] ✓ 原始文件覆盖成功`);

    // 验证文件是否成功写入
    try {
      const writtenContent = await fs.readFile(processedCsvPath, 'utf-8');
      const writtenLines = writtenContent.split('\n').filter(line => line.trim() !== '');
      console.log(`[API] 文件写入验证成功: ${writtenLines.length} 行数据`);

      if (writtenLines.length !== processedLines.length) {
        console.warn(`[API] 警告: 写入的行数(${writtenLines.length})与预期(${processedLines.length})不匹配`);
      }
    } catch (verifyError) {
      console.error(`[API] 文件写入验证失败: ${verifyError}`);
      throw new Error(`文件写入验证失败: ${verifyError}`);
    }

    console.log(`[API] CSV处理完成: ${processedCsvPath}`);
    console.log(`[API] 删除了 ${removedEpisodes.length} 个集数的数据`);
    
    return NextResponse.json({
      success: true,
      processedCsvPath: processedCsvPath, // 现在指向原始文件路径
      originalCsvPath: csvPath,
      backupCsvPath: backupCsvPath,
      removedEpisodes: removedEpisodes.sort((a, b) => a - b),
      originalRowCount: dataLines.length,
      processedRowCount: filteredLines.length,
      episodeColumnIndex: episodeNumberIndex,
      episodeColumnName: matchedColumnName,
      markedEpisodesInput: markedEpisodes,
      fileInfo: {
        originalSize: originalContent.length,
        processedSize: processedContent.length,
        originalLines: lines.length,
        processedLines: processedLines.length
      },
      strategy: 'overwrite_with_backup',
      message: `成功处理CSV文件，删除了 ${removedEpisodes.length} 个已标记集数的数据行，原始文件已备份`
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
