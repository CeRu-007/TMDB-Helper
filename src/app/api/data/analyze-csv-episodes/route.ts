import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';

/**
 * POST /api/analyze-csv-episodes - 分析CSV文件中剩余的集数
 */
export async function POST(request: NextRequest) {
  try {
    const { csvPath } = await request.json();

    if (!csvPath) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少CSV文件路径参数',
        },
        { status: 400 },
      );
    }

    // 检查CSV文件是否存在
    try {
      await fs.access(csvPath);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'CSV文件不存在',
          details: {
            csvPath,
            error: error instanceof Error ? error.message : String(error),
          },
        },
        { status: 404 },
      );
    }

    // 读取CSV文件内容

    const csvContent = await fs.readFile(csvPath, 'utf-8');

    const lines = csvContent.split('\n').filter((line) => line.trim() !== '');

    if (lines.length <= 1) {
      return NextResponse.json(
        {
          success: true,
          remainingEpisodes: [],
          analysis: {
            totalLines: lines.length,
            hasHeader: lines.length >= 1,
            hasData: false,
            message: 'CSV文件为空或只有标题行',
          },
        },
        { status: 200 },
      );
    }

    // 解析CSV头部，查找集数列
    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    console.log(`[API] CSV头部: [${headers.join(', ')}]`);

    // 尝试多种可能的集数列名
    const possibleEpisodeColumns = [
      'episode_number',
      'episode',
      'ep',
      'number',
      'episode_num',
      'ep_num',
      '集数',
      '第几集',
    ];

    let episodeColumnIndex = -1;
    let matchedColumnName = '';

    for (const possibleName of possibleEpisodeColumns) {
      episodeColumnIndex = headers.findIndex((h) =>
        h.toLowerCase().includes(possibleName.toLowerCase()),
      );
      if (episodeColumnIndex !== -1) {
        matchedColumnName = headers[episodeColumnIndex];
        break;
      }
    }

    if (episodeColumnIndex === -1) {
      console.error(`[API] 无法找到集数列，可用列: [${headers.join(', ')}]`);
      return NextResponse.json(
        {
          success: false,
          error: '无法找到集数列',
          details: {
            headers,
            searchedColumns: possibleEpisodeColumns,
          },
        },
        { status: 400 },
      );
    }

    // 解析数据行，提取集数
    const remainingEpisodes: number[] = [];
    const dataLines = lines.slice(1);
    const parseErrors: Array<{ line: number; value: string; error: string }> =
      [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const columns = parseCSVLine(line);

      if (columns.length > episodeColumnIndex) {
        const episodeNumberStr = columns[episodeColumnIndex].trim();
        const episodeNumber = parseInt(episodeNumberStr);

        if (!isNaN(episodeNumber)) {
          remainingEpisodes.push(episodeNumber);
        } else {
          const error = `无法解析集数: "${episodeNumberStr}"`;
          parseErrors.push({
            line: i + 2, // +2 because we start from line 1 and skip header
            value: episodeNumberStr,
            error,
          });
          console.warn(`[API] ${error} (第${i + 2}行)`);
        }
      } else {
        const error = `列数不足: ${columns.length} < ${episodeColumnIndex + 1}`;
        parseErrors.push({
          line: i + 2,
          value: '',
          error,
        });
      }
    }

    const sortedEpisodes = remainingEpisodes.sort((a, b) => a - b);
    console.log(`[API] CSV中剩余的集数: [${sortedEpisodes.join(', ')}]`);

    return NextResponse.json(
      {
        success: true,
        remainingEpisodes: sortedEpisodes,
        analysis: {
          csvPath,
          totalLines: lines.length,
          dataLines: dataLines.length,
          episodeColumnIndex,
          episodeColumnName: matchedColumnName,
          validEpisodes: remainingEpisodes.length,
          parseErrors: parseErrors.length,
          parseErrorDetails: parseErrors.slice(0, 10), // 只返回前10个错误
          episodeRange:
            sortedEpisodes.length > 0
              ? {
                  min: Math.min(...sortedEpisodes),
                  max: Math.max(...sortedEpisodes),
                  count: sortedEpisodes.length,
                }
              : null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: '分析失败',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
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
