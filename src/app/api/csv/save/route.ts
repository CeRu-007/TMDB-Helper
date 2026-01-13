import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * CSV文件保存API
 * 用于保存CSV数据到指定文件路径
 */
export async function POST(request: NextRequest) {
  try {
    const { filePath, data } = await request.json();

    console.log('[API] CSV保存请求:', { filePath, dataType: typeof data, dataKeys: data ? Object.keys(data) : null });

    if (!filePath) {
      return NextResponse.json({
        success: false,
        error: '缺少文件路径参数'
      }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: '缺少数据参数'
      }, { status: 400 });
    }

    // 确保目录存在
    const dir = path.dirname(filePath);
    console.log('[API] 目录:', dir, '存在:', fs.existsSync(dir));
    
    if (!fs.existsSync(dir)) {
      console.log('[API] 创建目录:', dir);
      fs.mkdirSync(dir, { recursive: true });
    }

    // 序列化CSV数据
    const csvContent = serializeCsvData(data);

    // 写入文件
    fs.writeFileSync(filePath, csvContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'CSV文件保存成功',
      filePath,
      fileExists,
      fileSize: fileStats?.size
    });

  } catch (error) {
    console.error('[API] CSV保存错误:', error);
    
    return NextResponse.json({
      success: false,
      error: '保存CSV文件失败',
      details: { 
        error: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}

/**
 * 序列化CSV数据
 */
function serializeCsvData(data: any): string {
  // 处理不同的数据格式
  let headers: string[] = [];
  let rows: string[][] = [];

  if (Array.isArray(data)) {
    // 如果是数组格式，假设第一行是表头
    if (data.length > 0) {
      headers = data[0];
      rows = data.slice(1).map(row => Array.isArray(row) ? row : [row]);
    }
  } else if (data.headers && data.rows) {
    // 如果是对象格式 { headers: [], rows: [] }
    headers = data.headers;
    rows = data.rows;
  } else {
    throw new Error('不支持的数据格式');
  }

  // 生成CSV内容
  const lines: string[] = [];
  
  // 添加表头
  if (headers.length > 0) {
    lines.push(headers.map(formatCsvField).join(','));
  }
  
  // 添加数据行
  rows.forEach(row => {
    const formattedRow = row.map(field => formatCsvField(field));
    lines.push(formattedRow.join(','));
  });

  return lines.join('\n');
}

/**
 * 格式化CSV字段（处理特殊字符）
 */
function formatCsvField(field: any): string {
  if (field === null || field === undefined) {
    return '';
  }
  
  const str = String(field);
  
  // 如果字段包含逗号、引号或换行符，需要用引号包围
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // 转义引号
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return str;
}