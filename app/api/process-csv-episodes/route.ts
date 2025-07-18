import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { parseCSVRobust, generateCSVRobust, deleteEpisodesByNumbers, validateCSVData } from '@/lib/robust-csv-processor';

/**
 * POST /api/process-csv-episodes - 处理CSV文件，删除已标记集数的行
 */
export async function POST(request: NextRequest) {
  try {
    const {
      csvPath,
      markedEpisodes,
      platformUrl,
      itemId,
      testMode = false,
      itemTitle,
      enableYoukuSpecialHandling = true,
      enableTitleCleaning = true
    } = await request.json();
    
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
    console.log(`[API] 项目标题: ${itemTitle}`);
    console.log(`[API] 测试模式: ${testMode}`);
    console.log(`[API] 用户设置 - 优酷特殊处理: ${enableYoukuSpecialHandling}`);
    console.log(`[API] 用户设置 - 词条标题清理: ${enableTitleCleaning}`);

    // 检测平台类型和用户设置
    const isYoukuPlatform = platformUrl && platformUrl.includes('youku.com');
    const shouldUseYoukuHandling = isYoukuPlatform && enableYoukuSpecialHandling;
    console.log(`[API] 优酷平台检测: ${isYoukuPlatform}, 启用优酷特殊处理: ${shouldUseYoukuHandling}`);

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

    // 检查是否启用强化CSV处理
    // 强化CSV处理现在是默认启用的，除非明确禁用
    let useRobustProcessing = enableYoukuSpecialHandling !== false;
    console.log(`[API] 强化CSV处理: ${useRobustProcessing ? '启用' : '禁用'}`);

    let csvData;
    let removedEpisodes = [];
    let processedData;

    if (useRobustProcessing) {
      console.log(`[API] 使用强化CSV处理器...`);
      
      try {
        // 使用强化CSV解析器
        csvData = parseCSVRobust(csvContent);
        console.log(`[API] 强化解析成功: ${csvData.headers.length}列, ${csvData.rows.length}行`);
        console.log(`[API] CSV头部列名: [${csvData.headers.join(', ')}]`);
        
        // 验证CSV数据完整性
        const validation = validateCSVData(csvData);
        if (!validation.isValid) {
          console.warn(`[API] CSV数据验证警告:`, validation.errors);
        }

        // 计算要删除的剧集编号
        let episodesToDelete = [...markedEpisodes];
        
        if (shouldUseYoukuHandling && markedEpisodes.length > 0) {
          // 优酷平台特殊处理：删除已标记集数-1的行
          episodesToDelete = markedEpisodes.map(ep => ep - 1).filter(ep => ep > 0);
          console.log(`[API] 优酷平台特殊处理：原始标记集数 [${markedEpisodes.join(', ')}] -> 实际删除集数 [${episodesToDelete.join(', ')}]`);
        }

        if (episodesToDelete.length > 0) {
          // 使用强化删除功能
          processedData = deleteEpisodesByNumbers(csvData, episodesToDelete);
          removedEpisodes = episodesToDelete;
          console.log(`[API] 强化删除完成: 删除了 ${csvData.rows.length - processedData.rows.length} 行`);
        } else {
          processedData = csvData;
          console.log(`[API] 没有需要删除的集数`);
        }

      } catch (robustError) {
        console.error(`[API] 强化CSV处理失败，回退到传统处理:`, robustError);
        useRobustProcessing = false;
      }
    }

    if (!useRobustProcessing) {
      console.log(`[API] 使用传统CSV处理器...`);
      
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
      
      // 查找name列索引（用于词条标题检测）
      let nameColumnIndex = -1;
      const possibleNameColumns = ['name', 'title', '标题', '名称', '剧集名'];

      for (const possibleName of possibleNameColumns) {
        nameColumnIndex = headers.findIndex(h =>
          h.toLowerCase().includes(possibleName.toLowerCase())
        );
        if (nameColumnIndex !== -1) {
          console.log(`[API] 找到name列 "${headers[nameColumnIndex]}" 在索引: ${nameColumnIndex}`);
          break;
        }
      }

      // 过滤数据行，删除已标记的集数
      const headerLine = lines[0];
      const dataLines = lines.slice(1).filter(line => line.trim() !== '');
      const filteredLines = [];
      const titleMatchedLines = [];

      console.log(`[API] 开始处理 ${dataLines.length} 行数据`);
      console.log(`[API] 需要删除的集数: [${markedEpisodes.join(', ')}]`);
      console.log(`[API] 优酷平台特殊处理: ${isYoukuPlatform ? '是' : '否'}`);
      console.log(`[API] 词条标题检测: ${itemTitle ? `"${itemTitle}"` : '未提供'}`);

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const columns = parseCSVLine(line);

        if (columns.length > episodeNumberIndex) {
          const episodeNumberStr = columns[episodeNumberIndex].trim();
          const episodeNumber = parseInt(episodeNumberStr);

          console.log(`[API] 第 ${i + 1} 行: 集数列值="${episodeNumberStr}", 解析为数字=${episodeNumber}`);

          // 检查name列是否包含词条标题，并清理单元格内容（如果用户启用）
          let containsItemTitle = false;
          let cleanedLine = line;

          if (enableTitleCleaning && nameColumnIndex !== -1 && itemTitle && columns.length > nameColumnIndex) {
            const nameValue = columns[nameColumnIndex].trim();
            containsItemTitle = nameValue.includes(itemTitle);

            if (containsItemTitle) {
              console.log(`[API] 检测到name列包含词条标题: "${nameValue}" 包含 "${itemTitle}"`);

              // 清理单元格内容：移除词条标题及其后面的内容
              const cleanedNameValue = cleanNameCell(nameValue, itemTitle);
              console.log(`[API] 清理name单元格: "${nameValue}" -> "${cleanedNameValue}"`);

              // 重建CSV行，替换name列的内容
              const newColumns = [...columns];
              newColumns[nameColumnIndex] = cleanedNameValue;
              cleanedLine = rebuildCSVLine(newColumns);

              titleMatchedLines.push({
                line: i + 1,
                episodeNumber,
                originalValue: nameValue,
                cleanedValue: cleanedNameValue
              });
            }
          }

          if (!isNaN(episodeNumber)) {
            // 根据用户设置决定删除策略
            let shouldRemove = false;

            if (shouldUseYoukuHandling && markedEpisodes.length > 0) {
              // 优酷平台特殊处理：删除已标记集数-1的行
              const adjustedMarkedEpisodes = markedEpisodes.map(ep => ep - 1).filter(ep => ep > 0);
              shouldRemove = adjustedMarkedEpisodes.includes(episodeNumber);
              if (shouldRemove) {
                console.log(`[API] ✓ 优酷平台特殊处理：删除第 ${episodeNumber} 集 (对应已标记第 ${episodeNumber + 1} 集)`);
              }
            } else {
              // 普通处理：删除已标记的集数
              shouldRemove = markedEpisodes.includes(episodeNumber);
              if (shouldRemove) {
                console.log(`[API] ✓ 删除已标记的第 ${episodeNumber} 集`);
              }
            }

            if (shouldRemove) {
              removedEpisodes.push(episodeNumber);
            } else {
              // 使用清理后的行（如果有词条标题被清理）
              filteredLines.push(cleanedLine);
              if (containsItemTitle) {
                console.log(`[API] ✓ 保留第 ${episodeNumber} 集的数据行（已清理name列词条标题）`);
              } else {
                console.log(`[API] ✓ 保留第 ${episodeNumber} 集的数据行`);
              }
            }
          } else {
            // 无法解析集数的行保留
            filteredLines.push(line);
            console.log(`[API] ✓ 保留无法解析集数的行`);
          }
        } else {
          // 保留格式不正确的行
          filteredLines.push(line);
          console.log(`[API] ✓ 保留格式不正确的行 (列数: ${columns.length})`);
        }
      }

      // 构建传统处理的结果
      processedData = {
        headers: headers,
        rows: filteredLines.map(line => parseCSVLine(line))
      };

      console.log(`[API] 传统处理完成: 删除了 ${removedEpisodes.length} 行，保留了 ${filteredLines.length} 行`);
      console.log(`[API] 删除的集数: [${removedEpisodes.sort((a, b) => a - b).join(', ')}]`);
      console.log(`[API] 清理词条标题的单元格: ${titleMatchedLines.length} 个`);
    }

    // 如果是测试模式，只返回分析结果，不实际处理文件
    if (testMode) {
      console.log(`[API] 测试模式：只分析，不实际处理文件`);
      return NextResponse.json({
        success: true,
        testMode: true,
        analysis: {
          originalCsvPath: csvPath,
          markedEpisodesInput: markedEpisodes,
          totalDataLines: processedData.rows.length,
          episodesToRemove: removedEpisodes.sort((a, b) => a - b),
          episodesToKeep: processedData.rows.length,
          wouldNeedProcessing: removedEpisodes.length > 0 ||
                              (platformUrl && platformUrl.includes('iqiyi.com')),
          processingMethod: useRobustProcessing ? 'robust' : 'traditional'
        },
        message: `测试模式：分析完成，将删除 ${removedEpisodes.length} 个集数的数据行`
      }, { status: 200 });
    }

    // 生成最终的CSV内容
    let finalContent;
    let originalRowCount;
    let processedRowCount;

    if (useRobustProcessing) {
      // 使用强化CSV生成器
      console.log(`[API] 使用强化CSV生成器生成最终内容...`);
      
      // 应用特殊变量处理到强化处理的数据
      let finalData = processedData;
      
      // 检查是否需要删除爱奇艺air_date列
      if (platformUrl && platformUrl.includes('iqiyi.com')) {
        console.log(`[API] 检测到爱奇艺平台，清空air_date列`);
        const airDateIndex = finalData.headers.findIndex(h => 
          h.toLowerCase().includes('air_date') || h.toLowerCase().includes('airdate')
        );
        
        if (airDateIndex !== -1) {
          finalData.rows = finalData.rows.map(row => {
            const newRow = [...row];
            if (newRow.length > airDateIndex) {
              newRow[airDateIndex] = '';
            }
            return newRow;
          });
          console.log(`[API] 已清空air_date列 (索引: ${airDateIndex})`);
        }
      }
      
      finalContent = generateCSVRobust(finalData);
      originalRowCount = csvData.rows.length;
      processedRowCount = finalData.rows.length;
      
    } else {
      // 使用传统方式
      console.log(`[API] 使用传统方式生成最终内容...`);
      
      // 如果没有删除任何行，检查是否需要应用特殊变量处理
      if (removedEpisodes.length === 0) {
        console.log(`[API] 没有删除任何行，检查是否需要应用特殊变量处理`);

        // 检查是否需要特殊变量处理
        const needsSpecialProcessing = (platformUrl && platformUrl.includes('iqiyi.com'));

        if (!needsSpecialProcessing) {
          console.log(`[API] 不需要特殊处理，直接使用原始文件`);
          return NextResponse.json({
            success: true,
            processedCsvPath: csvPath, // 使用原始文件
            originalCsvPath: csvPath,
            backupCsvPath: null, // 没有创建备份
            removedEpisodes: [],
            originalRowCount: processedData.rows.length,
            processedRowCount: processedData.rows.length,
            markedEpisodesInput: markedEpisodes,
            strategy: 'no_processing_needed',
            processingMethod: useRobustProcessing ? 'robust' : 'traditional',
            message: `没有需要删除的集数，使用原始CSV文件`
          }, { status: 200 });
        }
      }

      // 应用特殊变量处理
      const processedLines = await applySpecialVariables(
        [processedData.headers.join(','), ...processedData.rows.map(row => row.join(','))],
        processedData.headers,
        platformUrl
      );
      
      finalContent = processedLines.join('\n');
      originalRowCount = csvData ? csvData.rows.length : processedData.rows.length;
      processedRowCount = processedData.rows.length;
    }
    
    // 策略：直接覆盖原始文件，不创建备份
    const processedCsvPath = csvPath; // 直接使用原始文件路径

    console.log(`[API] 文件处理策略: 直接覆盖原始文件（不创建备份）`);
    console.log(`[API] 原始文件: ${csvPath}`);
    
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

    // 覆盖原始文件
    console.log(`[API] 开始覆盖原始CSV文件: ${processedCsvPath}`);
    console.log(`[API] 文件内容长度: ${finalContent.length} 字符`);
    console.log(`[API] 文件内容预览: ${finalContent.substring(0, 200)}...`);

    await fs.writeFile(processedCsvPath, finalContent, 'utf-8');
    console.log(`[API] ✓ 原始文件覆盖成功`);

    // 验证文件是否成功写入
    try {
      const writtenContent = await fs.readFile(processedCsvPath, 'utf-8');
      const writtenLines = writtenContent.split('\n').filter(line => line.trim() !== '');
      console.log(`[API] 文件写入验证成功: ${writtenLines.length} 行数据`);
    } catch (verifyError) {
      console.error(`[API] 文件写入验证失败: ${verifyError}`);
      throw new Error(`文件写入验证失败: ${verifyError}`);
    }

    console.log(`[API] CSV处理完成: ${processedCsvPath}`);
    console.log(`[API] 删除了 ${removedEpisodes.length} 个集数的数据`);
    
    return NextResponse.json({
      success: true,
      processedCsvPath: processedCsvPath,
      originalCsvPath: csvPath,
      backupCsvPath: null, // 不再创建备份文件
      removedEpisodes: removedEpisodes.sort((a, b) => a - b),
      originalRowCount: originalRowCount,
      processedRowCount: processedRowCount,
      markedEpisodesInput: markedEpisodes,
      processingMethod: useRobustProcessing ? 'robust' : 'traditional',
      fileInfo: {
        processedSize: finalContent.length
      },
      strategy: 'direct_overwrite',
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
 * 清理name单元格内容，移除词条标题及其后面的内容
 */
function cleanNameCell(nameValue: string, itemTitle: string): string {
  if (!nameValue.includes(itemTitle)) {
    return nameValue;
  }

  // 找到词条标题的位置
  const titleIndex = nameValue.indexOf(itemTitle);

  if (titleIndex === 0) {
    // 词条标题在开头，移除标题及其后面的所有内容
    return '';
  } else {
    // 词条标题在中间或末尾，保留标题前面的内容
    return nameValue.substring(0, titleIndex).trim();
  }
}

/**
 * 重建CSV行
 */
function rebuildCSVLine(columns: string[]): string {
  return columns.map(col => {
    // 如果列内容包含逗号或引号，需要用引号包围
    if (col.includes(',') || col.includes('"') || col.includes('\n')) {
      // 转义内部的引号
      const escapedCol = col.replace(/"/g, '""');
      return `"${escapedCol}"`;
    }
    return col;
  }).join(',');
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
