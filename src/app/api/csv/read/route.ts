import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * CSV文件读取API
 * 用于读取指定工作目录中的CSV文件数据
 */
export async function POST(request: NextRequest) {
  try {
    const { workingDirectory } = await request.json();

    if (!workingDirectory) {
      return NextResponse.json({
        success: false,
        error: '缺少工作目录参数'
      }, { status: 400 });
    }

    // 构建CSV文件路径
    const csvPath = path.join(workingDirectory, 'import.csv');

    // 检查CSV文件是否存在
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({
        success: false,
        error: 'CSV文件不存在',
        details: { csvPath }
      }, { status: 404 });
    }

    const fileStats = fs.statSync(csvPath);
    if (fileStats.size === 0) {
      return NextResponse.json({
        success: false,
        error: 'CSV文件为空',
        details: { csvPath }
      }, { status: 400 });
    }

    // 读取CSV文件内容
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // 解析CSV内容
    const csvData = parseCSV(csvContent);

    return NextResponse.json({
      success: true,
      data: csvData
    });

  } catch (error) {
    console.error('[API] CSV读取错误:', error);
    
    return NextResponse.json({
      success: false,
      error: '读取CSV文件失败',
      details: { 
        error: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}

/**
 * 解析CSV内容
 */
function parseCSV(csvContent: string): { headers: string[], rows: string[][] } {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]);
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length > 0) {
      rows.push(row);
    }
  }

  return { headers, rows };
}

/**
 * 解析CSV行（处理引号和逗号）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义的引号
        current += '"';
        i++; // 跳过下一个引号
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 分隔符
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // 添加最后一个字段
  result.push(current.trim());

  return result;
}